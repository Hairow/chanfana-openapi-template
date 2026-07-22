import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export interface Env {
	HYPERDRIVE?: Hyperdrive;
	DB: D1Database;
}

/**
 * 获取 Drizzle 客户端 —— 给 D1Database 挂上 schema 类型
 * 开销极低（一个 JS 对象），不会创建新的数据库连接
 */
export function getDb(db: D1Database) {
	return drizzle(db, { schema });
}