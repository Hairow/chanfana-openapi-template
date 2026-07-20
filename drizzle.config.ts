import { defineConfig } from "drizzle-kit";

export default defineConfig({
	// 只编辑这一个文件，migration 自动生成
	schema: "./src/db/schema.ts",
	out: "./migrations",
	dialect: "sqlite",
});
