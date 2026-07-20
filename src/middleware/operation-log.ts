import { Context, Next } from "hono";
import { matchedRoutes } from "hono/route";

export interface OperationLog {
	type: "create" | "update" | "delete" | string;
	label: string;
}

/** 路由 → 操作日志 映射表 */
const routeMap = new Map<string, OperationLog>();


/**
 * 全局操作日志中间件。
 * 通过 matchedRoutes + routeMap 反查，读取已登记的 operationLog。
 */
export async function operationLogMiddleware(c: Context, next: Next) {
	const start = Date.now();
	await next();
	const duration = Date.now() - start;

	const routes = matchedRoutes(c);
	const route = routes[c.req.routeIndex];
	if (!route) return;

	const opLogEntry = routeMap.get(`${route.method}:${route.path}`);
	if (opLogEntry) {
		console.log(
			`[OP_LOG] ${opLogEntry.label} (${opLogEntry.type}): ${c.req.method} ${c.req.path} → ${c.res.status} (${duration}ms)`,
		);
	}
}
