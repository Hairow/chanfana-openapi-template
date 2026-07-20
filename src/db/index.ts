import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * 获取 Drizzle 客户端 —— 只是给已有的 D1Database 挂上 schema 类型
 * 开销极低（一个 JS 对象），不会创建新的数据库连接
 */
export function getDb(d1: D1Database) {
	return drizzle(d1, { schema });
}
