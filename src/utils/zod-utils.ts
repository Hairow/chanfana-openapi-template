// src/utils/zod-utils.ts
import { z } from 'zod';

/**
 * 通用的数字 ID 参数校验
 * 用于路径参数如 /tasks/:id
 */
export const IdParam = z.object({
    id: z.coerce
        .number({
            'required_error': 'ID必须',
            'invalid_type_error': 'ID格式错误'
        })
        .int('ID必须是整数')
        .positive('ID必须是正数据')
});

/**
 * 如果需要支持其他类型的 ID（如 UUID）
 */
export const UuidParam = z.object({
    id: z.string().uuid('Invalid UUID format')
});

/**
 * 通用的分页参数
 */
export const PaginationParams = z.object({
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * 列表返回的分页信息
 */
export const PaginationResultInfo = z.object({
    count: z.number(),
    page: z.number(),
    per_page: z.number(),
    total_count: z.number(),
})
