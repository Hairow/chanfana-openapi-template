// src/routes/tasks/validation.ts
import { z } from 'zod';
import { formatDateTime } from '../../utils/date';

// ✅ 使用完全标准的手写 Zod Schema
export const selectTaskSchema = z.object({
    id: z.number().int().describe('ID'),
    name: z.string().describe('名称'),
    slug: z.string().describe('唯一标识'),
    status: z.number().describe('状态'),
    description: z.string().describe('描述'),
    completed: z.boolean().describe('是否完成'),
    due_date: z.string().transform(formatDateTime).describe('截止日期'),
});

export const insertTaskSchema = z.object({
    name: z.string().describe('名称'),
    slug: z.string().describe('唯一标识'),
    status: z.number().optional().default(0).describe('状态'),
    description: z.string().optional().default('').describe('描述'),
    completed: z.boolean().optional().default(false).describe('是否完成'),
    due_date: z.string().pipe(z.coerce.date()).transform((date) => date.toISOString()).describe('截止日期'),
});

export const updateTaskSchema = z.object({
    name: z.string().optional().describe('名称'),
    slug: z.string().optional().describe('唯一标识'),
    status: z.number().optional().describe('状态'),
    description: z.string().optional().describe('描述'),
    completed: z.boolean().optional().describe('是否完成'),
    due_date: z.string().pipe(z.coerce.date()).transform((date) => date.toISOString()).optional().describe('截止日期'),
});