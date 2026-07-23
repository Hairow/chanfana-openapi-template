import { SignJWT, jwtVerify } from "jose";
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
export interface JwtPayload {
	sub: string;
	exp: number;
}

/** 从 API_TOKEN 生成 HMAC 密钥 */
function getSecret(env: Env) {
	return new TextEncoder().encode(env.API_TOKEN);
}

/** 签发 JWT */
export async function signToken(env: Env, sub: string, expiresIn = "2h") {
	return new SignJWT({ sub })
		.setProtectedHeader({ alg: "HS256" })   // 签名算法
		.setExpirationTime(expiresIn)            // exp：过期时间
		.sign(getSecret(env));                   // 用 API_TOKEN 签名
}

/** 验证 JWT，成功返回 payload，失败抛出异常 */
export async function verifyToken(env: Env, token: string): Promise<JwtPayload> {
	const { payload } = await jwtVerify(token, getSecret(env));
	return payload as JwtPayload;
}

/** 从请求头解析 Bearer token */
function parseToken(header: string | undefined): string | null {
	if (!header || !header.startsWith("Bearer ")) return null;
	return header.slice(7);
}

/** 鉴权中间件 */
export async function authMiddleware(c: AppContext, next: Next) {
	const token = parseToken(c.req.header("Authorization"));

	if (!token) {
		throw new AuthException(7002, "Unauthorized");
	}

	try {
		await verifyToken(c.env, token);
	} catch {
		throw new AuthException(7003, "Invalid or expired token");
	}

	await next();
}
