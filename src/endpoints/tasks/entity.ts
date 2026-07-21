import { createSelectSchema } from 'drizzle-zod';
import { tasks } from '../../db/schema';
import { formatDateTime } from '../../utils/date';
import z from 'zod';

export const STATUS_MAP: Record<number, string> = {
    0: "待处理",
    1: "进行中",
    2: "已完成",
    3: "已取消",
    4: "已归档",
};

export const getStatusText = (status: number) => STATUS_MAP[status] ?? "未知";

export const TaskBaseSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    slug: z.string(),
    status: z.number(),
    description: z.string(),
    completed: z.boolean(),
    due_date: z.string().transform(formatDateTime),
});

// 列表输出（从 TaskBaseSchema 提取并注入 status_text）
export const TaskListSchema = TaskBaseSchema
    .pick({ id: true, status: true })
    .transform((data) => ({ ...data, status_text: getStatusText(data.status) }));

// 详情输出（从 TaskBaseSchema 提取并注入 status_text）
export const TaskDetailSchema = TaskBaseSchema
    .pick({ id: true, status: true, name: true })
    .transform((data) => ({ ...data, status_text: getStatusText(data.status) }));

