import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

// ===================== Drizzle 表定义 =====================
// zod schema 在 validation.ts 中，与此文件同步维护

export const tasks = sqliteTable("tasks", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	description: text("description").notNull().default(''),
	// integer({ mode: "boolean" }) 自动处理 SQLite 0/1 ↔ JS true/false
	completed: integer("completed", { mode: "boolean" }).notNull().default(false),
	due_date: text("due_date").notNull().default(''),
});
