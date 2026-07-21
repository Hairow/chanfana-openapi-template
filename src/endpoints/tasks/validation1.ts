// src/routes/tasks/validation.ts
import { z } from 'zod';
import { PaginationParams } from '../../utils/zod-utils';

export const TaskSelectValidator = PaginationParams.extend({
    search: z.string().optional(),
    completed: z.coerce.boolean().optional(),
    order_by: z.enum(["id", "name", "slug", "due_date"]).default("id").optional(),
    order_dir: z.enum(["asc", "desc"]).default("desc").optional(),
})

export const TaskInsertValidator = z.object({
    name: z.string(),
    slug: z.string(),
    status: z.number().optional().default(0),
    description: z.string().optional().default(''),
    completed: z.boolean().optional().default(false),
    due_date: z.string().pipe(z.coerce.date()).transform((date) => date.toISOString()),
});

export const TaskUpdateValidator = z.object({
    id: z.number().int(),
    name: z.string(),
    slug: z.string(),
    status: z.number().optional().default(0),
    description: z.string().optional().default(''),
    completed: z.boolean().optional().default(false),
    due_date: z.string().pipe(z.coerce.date()).transform((date) => date.toISOString()).optional(),
});