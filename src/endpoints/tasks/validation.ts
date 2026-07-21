import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { tasks } from '../../db/schema';

export const selectTaskSchema: any = createSelectSchema(tasks);
export const insertTaskSchema: any = createInsertSchema(tasks, {
    due_date: (schema) => schema.datetime(),
});
export const updateTaskSchema: any = createInsertSchema(tasks, {
    due_date: (schema) => schema.datetime().optional(),
}).partial();
