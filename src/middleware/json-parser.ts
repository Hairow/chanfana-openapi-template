// src/middleware/json-parser.ts
import { InputValidationException } from 'chanfana';
import { MiddlewareHandler } from 'hono';
import { AppContext } from '../types';

export const JsonParserMiddleware: MiddlewareHandler<{ Bindings: Env }>
    = async (c, next) => {
        if (c.req.header('Content-Type')?.includes('application/json')) {
            // 只有body中有内容时候才检测json格式
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