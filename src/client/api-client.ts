/**
 * API 客户端
 *
 * 功能：
 * - 统一请求入口，auth 参数控制是否携带 access token
 * - access token 过期自动续期（auth: true 时生效）
 * - 并发请求共享同一个续期 Promise，不会重复刷新
 * - refresh token 也过期时自动退出
 * - 超时控制、请求/响应拦截器、类型安全
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

// ── 请求类型 ──────────────────────────────────────────────

/** 请求配置 */
export interface FetchConfig extends RequestInit {
    /** Base URL，所有路径相对此地址 */
    baseUrl?: string;
    /** 是否自动携带 access token，默认 true。
     *  auth: false 用于调第三方接口或不需鉴权的场景 */
    auth?: boolean;
    /** Bearer token（手动指定，auth: true 时会覆盖为模块级 token） */
    token?: string | null;
    /** 查询参数 */
    params?: Record<string, string | number | boolean | undefined>;
    /** JSON 请求体（自动设 Content-Type: application/json，优先于 body） */
    json?: unknown;
    /** 表单请求体（自动设 Content-Type: application/x-www-form-urlencoded，优先于 body） */
    form?: Record<string, string>;
    /** 超时（毫秒），默认 30_000 */
    timeout?: number;
}

/** 请求拦截器 */
export type RequestInterceptor = (url: string, config: RequestInit) => RequestInit | Promise<RequestInit>;

/** 响应拦截器 */
export type ResponseInterceptor = (res: Response) => Response | Promise<Response>;

/** Fetch 错误（带响应状态码与响应体） */
export class FetchError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, message: string, body?: unknown) {
        super(message);
        this.name = "FetchError";
        this.status = status;
        this.body = body;
    }
}

/** 超时错误 */
export class TimeoutError extends Error {
    constructor(url: string, timeout: number) {
        super(`Request timeout after ${timeout}ms: ${url}`);
        this.name = "TimeoutError";
    }
}

// ── 内部状态 ──────────────────────────────────────────────

const BASE = ""; // 替换为 Worker 地址
const CLOCK_SKEW = 30; // 时钟偏移缓冲（秒），提前 30s 视为过期

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

let accessToken: string | null = getStored(ACCESS_TOKEN_KEY);
let refreshToken: string | null = getStored(REFRESH_TOKEN_KEY);
let refreshPromise: Promise<void> | null = null;

function getStored(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
}

function setStored(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* 无痕模式 / quota 满，静默失败 */ }
}

function clearStored(key: string): void {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
}

// ── 拦截器管理 ────────────────────────────────────────────

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

/** 注册请求拦截器，返回取消注册的函数 */
export function onRequest(fn: RequestInterceptor): () => void {
    requestInterceptors.push(fn);
    return () => {
        const idx = requestInterceptors.indexOf(fn);
        if (idx !== -1) requestInterceptors.splice(idx, 1);
    };
}

/** 注册响应拦截器，返回取消注册的函数 */
export function onResponse(fn: ResponseInterceptor): () => void {
    responseInterceptors.push(fn);
    return () => {
        const idx = responseInterceptors.indexOf(fn);
        if (idx !== -1) responseInterceptors.splice(idx, 1);
    };
}

// ── 工具函数 ──────────────────────────────────────────────

function parseJwt(token: string): Record<string, unknown> {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT format");
    const base64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
}

function isExpired(token: string): boolean {
    const { exp } = parseJwt(token);
    if (typeof exp !== "number") return true;
    return Date.now() >= (exp - CLOCK_SKEW) * 1000;
}

function buildUrl(raw: string, baseUrl: string, params?: FetchConfig["params"]): string {
    const url = raw.startsWith("http") ? raw : `${baseUrl}${raw}`;
    if (!params) return url;
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) search.set(k, String(v));
    }
    const qs = search.toString();
    return qs ? `${url}?${qs}` : url;
}

function buildHeaders(config: FetchConfig): Headers {
    const headers = new Headers(config.headers);

    if (config.token) {
        headers.set("Authorization", `Bearer ${config.token}`);
    }
    if (config.json !== undefined && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    if (config.form !== undefined && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/x-www-form-urlencoded");
    }

    return headers;
}

function buildBody(config: FetchConfig): BodyInit | undefined {
    if (config.json !== undefined) return JSON.stringify(config.json);
    if (config.form !== undefined) return new URLSearchParams(config.form).toString();
    return config.body as BodyInit | undefined;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeout: number): Promise<Response> {
    const controller = new AbortController();
    init.signal = controller.signal;

    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        return await fetch(url, init);
    } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
            throw new TimeoutError(url, timeout);
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

async function doFetch(finalUrl: string, init: RequestInit, timeout: number): Promise<Response> {
    if (timeout <= 0) return fetch(finalUrl, init);
    return fetchWithTimeout(finalUrl, init, timeout);
}

// ── 续期锁 ────────────────────────────────────────────────

async function doRefresh(): Promise<void> {
    if (!refreshToken) {
        logout();
        throw new Error("No refresh token available");
    }

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
                clearStored(REFRESH_TOKEN_KEY);
                logout();
                const body = (await res.json().catch(() => ({ success: false }))) as ApiResponse;
                throw new Error(body.errors?.[0]?.message || "Token refresh failed");
            }
            const data = await res.json() as RefreshResponse;
            if (!data.accessToken) throw new Error("Invalid refresh response: missing accessToken");
            accessToken = data.accessToken;
            setStored(ACCESS_TOKEN_KEY, data.accessToken);
        })
        .finally(() => {
            refreshPromise = null;
        });

    await refreshPromise;
}

async function ensureAccessToken(): Promise<void> {
    if (!accessToken || isExpired(accessToken)) {
        await doRefresh();
    }
}

// ── 核心请求 ──────────────────────────────────────────────

async function send<T>(
    url: string,
    config: FetchConfig,
    baseUrl: string,
): Promise<T> {
    const {
        token,
        params,
        json,
        form,
        timeout = 30_000,
        ...rest
    } = config;

    const headers = buildHeaders(config);
    const body = buildBody(config);
    const finalUrl = buildUrl(url, baseUrl, params);

    let init: RequestInit = { ...rest, headers, body };

    for (const interceptor of requestInterceptors) {
        init = await interceptor(finalUrl, init);
    }

    let response: Response;
    try {
        response = await doFetch(finalUrl, init, timeout);
    } catch (err) {
        if (err instanceof TimeoutError) throw err;
        if (err instanceof TypeError && err.message === "Failed to fetch") {
            throw new FetchError(0, `Network error: unable to reach ${finalUrl}`);
        }
        throw err;
    }

    for (const interceptor of responseInterceptors) {
        response = await interceptor(response);
    }

    if (!response.ok) {
        let errorBody: unknown;
        try {
            errorBody = await response.clone().json();
        } catch {
            errorBody = await response.clone().text();
        }
        throw new FetchError(response.status, response.statusText, errorBody);
    }

    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
        return response.json() as Promise<T>;
    }
    return response.text() as Promise<T>;
}

// ── 公开 API ──────────────────────────────────────────────

/** 统一请求入口 */
export const api = {
    /**
     * 发送请求。
     * - auth: true（默认）→ 自动带 access token、过期续期、401 重试
     * - auth: false → 不参与鉴权，适合调第三方接口
     */
    request: async <T>(path: string, config: FetchConfig = {}): Promise<T> => {
        const auth = config.auth ?? true;
        const baseUrl = config.baseUrl || BASE;

        if (auth) {
            await ensureAccessToken();
            const authConfig = { ...config, token: accessToken };
            try {
                return await send<T>(path, authConfig, baseUrl);
            } catch (err) {
                if (err instanceof FetchError && err.status === 401) {
                    await doRefresh();
                    return send<T>(path, { ...config, token: accessToken }, baseUrl);
                }
                throw err;
            }
        }

        return send<T>(path, config, baseUrl);
    },

    get: <T>(path: string, config: FetchConfig = {}) =>
        api.request<T>(path, { ...config, method: "GET" }),

    post: <T>(path: string, config: FetchConfig = {}) =>
        api.request<T>(path, { ...config, method: "POST" }),

    put: <T>(path: string, config: FetchConfig = {}) =>
        api.request<T>(path, { ...config, method: "PUT" }),

    patch: <T>(path: string, config: FetchConfig = {}) =>
        api.request<T>(path, { ...config, method: "PATCH" }),

    delete: <T>(path: string, config: FetchConfig = {}) =>
        api.request<T>(path, { ...config, method: "DELETE" }),
};

// ── 鉴权 ──────────────────────────────────────────────────

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
    setStored(ACCESS_TOKEN_KEY, data.accessToken);
    setStored(REFRESH_TOKEN_KEY, data.refreshToken);
}

/** 退出登录 */
export function logout() {
    accessToken = null;
    refreshToken = null;
    clearStored(ACCESS_TOKEN_KEY);
    clearStored(REFRESH_TOKEN_KEY);
    window.location.href = "/login";
}
