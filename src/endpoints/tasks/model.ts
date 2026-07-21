import { createSelectSchema } from 'drizzle-zod';
import { tasks } from '../../db/schema';
import { formatDateTime } from '../../utils/date';

export const STATUS_MAP: Record<number, string> = {
    0: "待处理",
    1: "进行中",
    2: "已完成",
    3: "已取消",
    4: "已归档",
};

export const getStatusText = (status: number) => STATUS_MAP[status] ?? "未知";

// 基础（从 Drizzle 表定义自动生成，保持与数据库同步）
const _base = createSelectSchema(tasks);

export const TaskBaseSchema = _base.extend({
    due_date: _base.shape.due_date.transform(formatDateTime),
});

// 列表输出（从 TaskBaseSchema 提取并注入 status_text）
export const TaskListSchema = TaskBaseSchema
    .pick({ id: true, status: true })
    .transform((data) => ({ ...data, status_text: getStatusText(data.status) }));

// 详情输出（从 TaskBaseSchema 提取并注入 status_text）
export const TaskDetailSchema = TaskBaseSchema
    .pick({ id: true, status: true, name: true })
    .transform((data) => ({ ...data, status_text: getStatusText(data.status) }));

