import { SignJWT, jwtVerify } from "jose";
import { Next } from "hono";
import type { AppContext } from "../types";

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
		return c.json(
			{ success: false, errors: [{ code: 7002, message: "Unauthorized" }] },
			401,
		);
	}

	try {
		await verifyToken(c.env, token);
	} catch {
		return c.json(
			{ success: false, errors: [{ code: 7003, message: "Invalid or expired token" }] },
			401,
		);
	}

	await next();
}
