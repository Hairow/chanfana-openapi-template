import { Context, Next } from "hono";


function parseToken(header: string | undefined): string | null {
	if (!header || !header.startsWith("Bearer ")) return null;
	return header.slice(7);
}

/** 常量时间比较，防止时序攻击 */
function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

export function verifyToken(token: string, c: Context<{ Bindings: Env }>): boolean {
	// 未配置 API_TOKEN 时拒绝所有请求（安全默认）
	const expected = c.env.API_TOKEN
	if (!expected) return false;
	return timingSafeEqual(token, expected);
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
	const token = parseToken(c.req.header("Authorization"));

	if (!token || !verifyToken(token, c)) {
		return c.json(
			{ success: false, errors: [{ code: 7002, message: "Unauthorized" }] },
			401,
		);
	}

	await next();
}
