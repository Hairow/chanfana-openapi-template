import { drizzle } from "drizzle-orm/mysql2";
import { createConnection, type ConnectionOptions } from "mysql2/promise";
import * as schema from "./schema";

/**
 * 获取 MySQL Drizzle 客户端
 * - 生产：wrangler deploy → 远程 Hyperdrive
 * - 本地：wrangler dev --local → localConnectionString 模拟
 */
export async function getMysqlDb(env: Env) {
	const opts: ConnectionOptions = {
		host: env.HYPERDRIVE.host,
		user: env.HYPERDRIVE.user,
		password: env.HYPERDRIVE.password,
		database: env.HYPERDRIVE.database,
		port: env.HYPERDRIVE.port,
	};

	const connection = await createConnection({ ...opts, disableEval: true });
	return drizzle(connection, { schema, mode: "default" });
}
