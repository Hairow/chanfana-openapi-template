import { drizzle } from "drizzle-orm/mysql2";
import { createConnection } from "mysql2/promise";
import * as schema from "./schema";

export interface Env {
	HYPERDRIVE: Hyperdrive;
}

/**
 * 获取 MySQL Drizzle 客户端 —— 通过 mysql2 驱动连接 Hyperdrive 代理的 MySQL
 * Hyperdrive 作为连接池代理，提供 host/user/password 等凭证；
 * mysql2 在 Workers 中需设置 disableEval: true 才能正常运作。
 * Hyperdrive 内部已池化 MySQL 连接，无需手动缓存。
 *
 * 使用方式：const db = await getMysqlDb(c.env.HYPERDRIVE)
 */
export async function getMysqlDb(hyperdrive: Hyperdrive) {
	const connection = await createConnection({
		host: hyperdrive.host,
		user: hyperdrive.user,
		password: hyperdrive.password,
		database: hyperdrive.database,
		port: hyperdrive.port,
		disableEval: true, // Workers 兼容所必需
	});
	return drizzle(connection, { schema, mode: "default" });
}
