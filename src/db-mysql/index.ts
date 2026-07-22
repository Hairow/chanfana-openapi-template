import { drizzle } from "drizzle-orm/mysql2";
import { createConnection, type ConnectionOptions } from "mysql2/promise";
import * as schema from "./schema";

export interface Env {
	HYPERDRIVE?: Hyperdrive; // 本地 dev 不可用
	DATABASE_URL?: string;    // 本地 dev 直连
}

/**
 * 获取 MySQL Drizzle 客户端，自动适配运行环境
 * - 生产：检测到 HYPERDRIVE → 走 Hyperdrive 代理
 * - 本地：HYPERDRIVE 不存在 → 降级 DATABASE_URL 直连
 *
 * 使用方式：const db = await getMysqlDb(c.env)
 */
export async function getMysqlDb(env: Env) {
	let opts: ConnectionOptions;

	if (env.HYPERDRIVE) {
		// 生产环境：Hyperdrive 代理
		opts = {
			host: env.HYPERDRIVE.host,
			user: env.HYPERDRIVE.user,
			password: env.HYPERDRIVE.password,
			database: env.HYPERDRIVE.database,
			port: env.HYPERDRIVE.port,
		};
	} else if (env.DATABASE_URL) {
		// 本地开发：直连 MySQL
		opts = { uri: env.DATABASE_URL };
	} else {
		throw new Error("getMysqlDb: 缺少 HYPERDRIVE 或 DATABASE_URL 配置");
	}

	const connection = await createConnection({ ...opts, disableEval: true });
	return drizzle(connection, { schema, mode: "default" });
}
