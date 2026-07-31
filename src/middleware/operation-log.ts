import { Context, MiddlewareHandler } from "hono";
import { matchedRoutes } from "hono/route";
import { routeMap } from "../from-hono";
import type { OperationLog } from "../from-hono";

/**
 * 全局操作日志中间件。
 * 通过 matchedRoutes 获取匹配的路由，从 routeMap 取出对应的 OpenAPIRoute 子类，
 * 读取其 static operationLog 输出日志。
 */
export const operationLogMiddleware: MiddlewareHandler<{ Bindings: Env }>
	= async (c, next) => {
		const start = Date.now();
		await next();
		const duration = Date.now() - start;

		const routes = matchedRoutes(c);
		if (!routes.length) return;

		// 拼接所有匹配层级（外层路由 + 子路由）的路径，与 routeMap 中的完整路径匹配
		const fullPath = routes
			.map((r) => r.path)
			.join("")
			.replace(/\/{2,}/g, "/") || "/";
		const method = c.req.method;
		//根据 method和path 获取对应的类构造器
		const cls = routeMap.get(`${method}:${fullPath}`);
		const opLog = cls
			? (cls as typeof cls & { operationLog?: OperationLog }).operationLog
			: undefined;
		if (opLog) {
			console.log(
				`[OP_LOG] ${opLog.label} (${opLog.type}): ${c.req.method} ${c.req.path} → ${c.res.status} (${duration}ms)`,
			);
		}
	}
