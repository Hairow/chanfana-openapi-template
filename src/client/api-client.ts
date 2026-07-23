/**
 * API 客户端
 *
 * 功能：
 * - 登录后自动携带 access token
 * - access token 过期自动续期
 * - 并发请求共享同一个续期 Promise，不会重复刷新
 * - refresh token 也过期时自动退出
 *
 * 要求：tsconfig 需包含 "DOM" lib（或使用 bundler 自动注入）
 */

/// <reference lib="dom" />

// ── 服务端响应类型 ────────────────────────────────────────

interface ApiError {
    code: number;
    message: string;
}
interface ApiResponse {
    success: boolean;
    errors?: ApiError[];
}
interface LoginResponse extends ApiResponse {
    accessToken?: string;
    refreshToken?: string;
}
interface RefreshResponse extends ApiResponse {
    accessToken?: string;
}

// ── 状态 ──────────────────────────────────────────────────

const BASE = ""; // 替换为 Worker 地址
const CLOCK_SKEW = 30; // 时钟偏移缓冲（秒），提前 30s 视为过期

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<void> | null = null;

// ── 工具函数 ──────────────────────────────────────────────

/** 解析 JWT payload（不验签，只读 exp）。
 *  JWT 使用 base64url 编码（-_ 代替 +/，无填充），需转换为标准 base64 再解码。 */
function parseJwt(token: string): Record<string, unknown> {
    const parts = token.split(".");
    if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
    }
    const base64url = parts[1]!;
    // base64url → base64：替换字符 + 补齐填充
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
}

/** access token 是否已过期（含时钟偏移缓冲） */
function isExpired(token: string): boolean {
    const { exp } = parseJwt(token);
    if (typeof exp !== "number") return true;
    return Date.now() >= (exp - CLOCK_SKEW) * 1000;
}

// ── 续期锁：并发请求共享同一个 Promise ────────────────────

/**
 * 尝试用 refresh token 换取新的 access token。
 * - 失败时抛出异常，调用方应停止后续操作。
 * - 并发调用共享同一个 Promise，只发一次网络请求。
 */
async function doRefresh(): Promise<void> {
    if (!refreshToken) {
        logout();
        throw new Error("No refresh token available");
    }

    // 已有正在进行的刷新，等待结果即可
    if (refreshPromise) {
        await refreshPromise;
        return;
    }

    refreshPromise = fetch(`${BASE}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
    })
        .then(async (res) => {
            if (!res.ok) {
                refreshToken = null;
                logout();
                // 重新抛出，让所有等待方都能捕获
                const body = (await res.json().catch(() => ({ success: false }))) as ApiResponse;
                throw new Error(body.errors?.[0]?.message || "Token refresh failed");
            }
            const data = await res.json() as RefreshResponse;
            if (!data.accessToken) {
                throw new Error("Invalid refresh response: missing accessToken");
            }
            accessToken = data.accessToken;
        })
        .finally(() => {
            refreshPromise = null;
        });

    await refreshPromise;
}

// ── 公开 API ──────────────────────────────────────────────

/** 登录，获取 access + refresh token */
export async function login(sub: string) {
    const res = await fetch(`${BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sub }),
    });
    const data = await res.json() as LoginResponse;
    if (!data.success) throw new Error(data.errors?.[0]?.message);
    if (!data.accessToken || !data.refreshToken) {
        throw new Error("Invalid login response: missing tokens");
    }
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
}

/** 退出登录 */
export function logout() {
    accessToken = null;
    refreshToken = null;
    window.location.href = "/login";
}

/** 确保 access token 有效，过期则自动续期 */
async function ensureAccessToken(): Promise<void> {
    if (!accessToken || isExpired(accessToken)) {
        await doRefresh();
    }
}

/** 封装请求：自动带 token、过期续期、401 重试 */
export async function api<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    await ensureAccessToken();

    let res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${accessToken}`,
        },
    });

    // 401 → token 可能在请求期间刚好过期，续期后重试一次
    if (res.status === 401) {
        await doRefresh();
        res = await fetch(`${BASE}${path}`, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${accessToken}`,
            },
        });
    }

    if (!res.ok) {
        const body = (await res.json().catch(() => ({ success: false }))) as ApiResponse;
        throw new Error(body.errors?.[0]?.message || "Request failed");
    }
    return res.json();
}
