import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

// ===================== Drizzle 表定义 =====================


export const tasks = sqliteTable("tasks", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	status: integer("status").notNull().default(0),
	slug: text("slug").notNull().unique(),
	description: text("description").notNull().default(''),
	// integer({ mode: "boolean" }) 自动处理 SQLite 0/1 ↔ JS true/false
	completed: integer("completed", { mode: "boolean" }).notNull().default(false),
	due_date: text("due_date").notNull().default(''),
});
