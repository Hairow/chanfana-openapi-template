import { z } from 'zod';
import { formatDateTime } from '../../utils/date';

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


export const TaskListSchema = TaskBaseSchema
    .pick({ id: true, status: true })
    .transform((data) => ({ ...data, status_text: getStatusText(data.status) }));


export const TaskDetailSchema = TaskBaseSchema
    .pick({ id: true, status: true, name: true })
    .transform((data) => ({ ...data, status_text: getStatusText(data.status) }));

