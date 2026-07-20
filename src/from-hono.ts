import { fromHono as _fromHono, OpenAPIRoute } from "chanfana";

export interface OperationLog {
	type: "create" | "update" | "delete" | string;
	label: string;
}

/** OpenAPIRoute 子类构造函数类型 */
type RouteClass = new (...args: any[]) => OpenAPIRoute;

/** 全局 className → OpenAPIRoute 子类注册表 */
const globalClassRegistry = new Map<string, RouteClass>();

/** 路由 → OpenAPIRoute 子类，供中间件读取 */
export const routeMap = new Map<string, RouteClass>();

/** 需要拦截的 HTTP 方法 */
const HTTP_METHODS = new Set([
	"get", "post", "put", "delete", "patch", "head", "options", "all",
]);

/**
 * 包装 chanfana 的 fromHono，自动拦截路由注册以捕获所有 OpenAPIRoute 子类。
 * 用法与 chanfana 的 fromHono 完全一致，直接替换 import 来源即可。
 */
const wrapFromHono: typeof _fromHono = ((...args: any[]) => {
	const openapi = _fromHono(...args as Parameters<typeof _fromHono>);

	return new Proxy(openapi, {
		get(target: any, prop, receiver) {
			if (typeof prop === "string" && HTTP_METHODS.has(prop)) {
				return (path: string, ...handlers: any[]) => {
					for (const h of handlers) {
						if (h.isRoute) {
							globalClassRegistry.set(h.name, h);
						}
					}
					return target[prop](path, ...handlers);
				};
			}

			const value = Reflect.get(target, prop, receiver);
			if (typeof value === "function") {
				return value.bind(target);
			}
			return value;
		},
	});
}) as typeof _fromHono;

export { wrapFromHono as fromHono };

/**
 * 基于 openapi.registry.definitions 自动收集路由对应的 OpenAPIRoute 子类到 routeMap。
 * 在 openapi.route() / openapi.get() 等全部注册完毕后调用一次。
 */
export function collectRouteMapFromOpenapi(
	openapi: { registry: { definitions: unknown } },
) {
	const definitions = (openapi.registry.definitions as Array<{
		type: string;
		route?: {
			method: string;
			path: string;
			operationId?: string;
		};
	}>);

	for (const def of definitions) {
		if (def.type !== "route" || !def.route?.operationId) continue;

		const { method, path, operationId } = def.route;

		// "post_TaskCreate" → "TaskCreate"
		const className = operationId.replace(
			/^(get|post|put|delete|patch|head|options|all|trace)_/i,
			"",
		);

		const cls = globalClassRegistry.get(className);
		if (cls) {
			const honoPath = path.replace(/\{(\w+)\}/g, ":$1");
			routeMap.set(`${method.toUpperCase()}:${honoPath}`, cls);
		}
	}
}
