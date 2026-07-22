import { defineConfig } from "drizzle-kit";
import "dotenv/config";

const d1 = defineConfig({
	// 只编辑这一个文件，migration 自动生成
	schema: "./src/db/schema.ts",
	out: "./migrations",
	dialect: "sqlite",
	dbCredentials: {
		// drizzle-kit generate 不连库，仅满足类型校验； 实际连接给 drizzle-kit studio 使用
		url: "",
	},
	verbose: true,
	strict: true,
});

const mysql = defineConfig({
	out: './migrations-mysql',
	schema: './src/db-mysql/schema.ts',
	dialect: 'mysql', // 关键：指定为 MySQL
	dbCredentials: {
		// drizzle-kit generate 不连库，仅满足类型校验；实际连接在 scripts/migrate-mysql.ts 中
		url: "",
	},
})


//export default d1

export default mysql