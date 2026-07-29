// src/middleware/json-parser.ts
import { InputValidationException } from 'chanfana';
import { MiddlewareHandler } from 'hono';

export const JsonParser: MiddlewareHandler = async (c, next) => {
    if (c.req.header('Content-Type')?.includes('application/json')) {
        // 先检查 body 是否有内容，避免空 body 触发 clone/parse 异常
        // chanfana 生成 schema 时会发空 body 的探测请求，应放过
        const contentLength = c.req.header('Content-Length');
        if (!contentLength || parseInt(contentLength) === 0) {
            return await next();
        }

        try {
            // clone 一份 body 用于预校验，不消费原始 body
            const cloned = c.req.raw.clone();
            await cloned.json();
        } catch {
            throw new InputValidationException('Invalid JSON format in request body');
        }
    }
    await next();
};