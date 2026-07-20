import { z } from "zod";

// ===================== Zod Schema =====================
// 与 schema.ts 中的 Drizzle 表定义同步维护

// 查询/返回结果的 schema —— 包含 id
export const selectTaskSchema = z.object({
	id: z.number().int(),
	name: z.string(),
	slug: z.string(),
	description: z.string(),
	completed: z.boolean(),
	due_date: z.string().datetime(),
});

// 创建时的 schema —— 无 id
export const insertTaskSchema = z.object({
	name: z.string(),
	slug: z.string(),
	description: z.string(),
	completed: z.boolean().optional().default(false),
	due_date: z.string().datetime(),
});

// 更新时的 schema —— 所有字段可选
export const updateTaskSchema = z.object({
	name: z.string().optional(),
	slug: z.string().optional(),
	description: z.string().optional(),
	completed: z.boolean().optional(),
	due_date: z.string().datetime().optional(),
});
