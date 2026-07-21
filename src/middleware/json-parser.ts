// src/middleware/json-parser.ts
import { MiddlewareHandler } from 'hono';
import { cloneRawRequest } from 'hono/request';

export const JsonParser: MiddlewareHandler = async (c, next) => {
    if (c.req.header('Content-Type')?.includes('application/json')) {
        try {
            // 手动解析 JSON，如果失败则立即返回错误
            const clonedRequest = await cloneRawRequest(c.req)
            const body = await clonedRequest.json();
            //如果json对象为空也提示错误
            if (!body || Object.keys(body).length === 0) {
                return c.json({
                    success: false,
                    errors: [{ code: 7000, message: 'Request body is missing or empty' }],
                }, 400);
            }
        } catch (error) {
            return c.json({
                success: false,
                errors: [{ code: 7000, message: 'Invalid JSON format in request body' }],
            }, 400);
        }
    }
    await next();
};