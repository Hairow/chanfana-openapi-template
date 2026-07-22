import { defineConfig } from "drizzle-kit";
import "dotenv/config";

const d1 = defineConfig({
	// 只编辑这一个文件，migration 自动生成
	schema: "./src/db/schema.ts",
	out: "./migrations",
	dialect: "sqlite",
	dbCredentials: {
		// D1 本地数据库的路径，通常在 .wrangler 目录下
		url: "file:./.wrangler/state/v3/d1/miniflare-D1DatabaseObject/71f7a3160b0a8f132221a14114630e6bed6b2511f3ae1799e2b2001f7c04bd5b.sqlite",
	},
	verbose: true,
	strict: true,
});

const mysql = defineConfig({
	out: './migrations-mysql',
	schema: './src/db-mysql/schema.ts',
	dialect: 'mysql', // 关键：指定为 MySQL
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
})


//export default d1

export default mysql