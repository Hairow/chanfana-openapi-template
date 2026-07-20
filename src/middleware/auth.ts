import { Context, Next } from "hono";

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
	const authHeader = c.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json({ success: false, errors: [{ code: 7002, message: "Missing or invalid authorization header" }] }, 401);
	}

	const token = authHeader.slice(7);
	const expected = c.env.API_TOKEN;

	if (!expected || token !== expected) {
		return c.json({ success: false, errors: [{ code: 7002, message: "Unauthorized" }] }, 401);
	}

	await next();
}
