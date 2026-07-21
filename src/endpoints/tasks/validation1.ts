// src/routes/tasks/validation.ts
import { z } from 'zod';

export const insertTaskSchema = z.object({
    name: z.string(),
    slug: z.string(),
    status: z.number().optional().default(0),
    description: z.string().optional().default(''),
    completed: z.boolean().optional().default(false),
    due_date: z.string().pipe(z.coerce.date()).transform((date) => date.toISOString()),
});

export const updateTaskSchema = z.object({
    name: z.string().optional(),
    slug: z.string().optional(),
    status: z.number().optional(),
    description: z.string().optional(),
    completed: z.boolean().optional(),
    due_date: z.string().pipe(z.coerce.date()).transform((date) => date.toISOString()).optional(),
});