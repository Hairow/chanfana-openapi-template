import { z } from 'zod';
import { formatDateTime } from '../../utils/date';

export const STATUS_MAP: Record<number, string> = {
    0: "待处理",
    1: "进行中",
    2: "已完成",
    3: "已取消",
    4: "已归档",
};

export const taskBaseSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    slug: z.string(),
    status: z.number(),
    description: z.string(),
    completed: z.boolean(),
    due_date: z.string().transform(formatDateTime),
});


export const taskListSchema = taskBaseSchema
    .pick({ id: true, status: true })
    .transform((data) => ({ ...data, status_text: STATUS_MAP[data.status] ?? "未知" }));


export const taskDetailSchema = taskBaseSchema
    .pick({ id: true, status: true, name: true })
    .transform((data) => ({ ...data, status_text: STATUS_MAP[data.status] ?? "未知" }));

