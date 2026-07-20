import { Context, Next } from "hono";

const OP_LOG_KEY = "__op_log";

export interface OperationLog {
	type: "create" | "update" | "delete" | string;
	label: string;
}

/**
 * 端点在 handler 中调用，标记当前请求为需要记录的操作。
 *
 * @example
 *   markOperation(c, "create", "创建任务");
 */
export function markOperation(c: Context, type: OperationLog["type"], label: string): void {
	c.set(OP_LOG_KEY, { type, label });
}

/**
 * 全局操作日志中间件，挂在 app 级别。
 * 仅当 handler 调用了 markOperation() 才会输出日志。
 */
export async function operationLogMiddleware(c: Context, next: Next) {
	const start = Date.now();
	await next();
	const duration = Date.now() - start;

	const opLog = c.get(OP_LOG_KEY) as OperationLog | undefined;
	if (opLog) {
		console.log(
			`[OP_LOG] ${opLog.label} (${opLog.type}): ${c.req.method} ${c.req.path} → ${c.res.status} (${duration}ms)`,
		);
	}
}
