import { SignJWT, jwtVerify, JWTPayload } from "jose";
import { Next } from "hono";
import { ApiException } from "chanfana";
import type { AppContext } from "../types";

/** 鉴权异常：401，全局错误处理器统一处理 */
export class AuthException extends ApiException {
	status = 401;
	constructor(code: number, message: string) {
		super(message);
		this.code = code;
	}
}

/**
 * JWT payload 结构
 */
export interface JwtPayload extends JWTPayload {
	sub: string;
	type: "access" | "refresh";
}

/** 从 API_TOKEN 生成 HMAC 密钥 */
function getSecret(env: Env) {
	return new TextEncoder().encode(env.API_TOKEN);
}

/** 签发 access token（2h，用于 API 鉴权） */
export async function signAccessToken(env: Env, sub: string) {
	return new SignJWT({ sub, type: "access" })
		.setProtectedHeader({ alg: "HS256" })    // 签名算法
		.setExpirationTime("2h")                  // exp：2 小时过期
		.sign(getSecret(env));                    // 用 API_TOKEN 签名
}

/** 签发 refresh token（7d，用于续期 access token） */
export async function signRefreshToken(env: Env, sub: string) {
	return new SignJWT({ sub, type: "refresh" })
		.setProtectedHeader({ alg: "HS256" })    // 签名算法
		.setExpirationTime("7d")                  // exp：7 天过期
		.sign(getSecret(env));                    // 用 API_TOKEN 签名
}

/** 签发 access + refresh token 对 */
export async function signTokenPair(env: Env, sub: string) {
	const [accessToken, refreshToken] = await Promise.all([
		signAccessToken(env, sub),
		signRefreshToken(env, sub),
	]);
	return { accessToken, refreshToken };
}

async function _verify(env: Env, token: string): Promise<JwtPayload> {
	const { payload } = await jwtVerify(token, getSecret(env));
	return payload as unknown as JwtPayload;
}

/** 验证 access token，refresh token 会被拒绝 */
export async function verifyAccessToken(env: Env, token: string): Promise<JwtPayload> {
	const payload = await _verify(env, token);
	if (payload.type !== "access") {
		throw new AuthException(7003, "Invalid token type");
	}
	return payload;
}

/** 验证 refresh token，access token 会被拒绝 */
export async function verifyRefreshToken(env: Env, token: string): Promise<JwtPayload> {
	const payload = await _verify(env, token);
	if (payload.type !== "refresh") {
		throw new AuthException(7003, "Invalid token type");
	}
	return payload;
}

/** 从请求头解析 Bearer token */
function parseToken(header: string | undefined): string | null {
	if (!header || !header.startsWith("Bearer ")) return null;
	return header.slice(7);
}

/** 鉴权中间件（只接受 access token） */
export async function authMiddleware(c: AppContext, next: Next) {
	const token = parseToken(c.req.header("Authorization"));

	if (!token) {
		throw new AuthException(7002, "Unauthorized");
	}

	try {
		await verifyAccessToken(c.env, token);
	} catch (err) {
		if (err instanceof AuthException) throw err;
		throw new AuthException(7003, "Invalid or expired token");
	}

	await next();
}
