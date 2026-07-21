// src/routes/tasks/validation.ts
import { z } from 'zod';
import { formatDateTime } from '../../utils/date';

// ✅ 使用完全标准的手写 Zod Schema
export const selectTaskSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    slug: z.string(),
    description: z.string(),
    completed: z.boolean(),
    due_date: z.string().transform(formatDateTime),
});

export const insertTaskSchema = z.object({
    name: z.string(),
    slug: z.string(),
    description: z.string().optional().default(''),
    completed: z.boolean().optional().default(false),
    due_date: z.string().pipe(z.coerce.date()).transform((date) => date.toISOString()),
});

export const updateTaskSchema = z.object({
    name: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    completed: z.boolean().optional(),
    due_date: z.string().pipe(z.coerce.date()).transform((date) => date.toISOString()).optional(),
});