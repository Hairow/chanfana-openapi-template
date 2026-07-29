// src/middleware/json-parser.ts
import { InputValidationException } from 'chanfana';
import { MiddlewareHandler } from 'hono';
import { cloneRawRequest } from 'hono/request';

export const JsonParser: MiddlewareHandler = async (c, next) => {
    if (c.req.header('Content-Type')?.includes('application/json')) {
        try {
            // 手动解析 JSON，如果失败则立即返回错误
            const clonedRequest = await cloneRawRequest(c.req)

            if (clonedRequest.body) {
                const body = await clonedRequest.json();
                //如果json对象为空也提示错误
                if (!body || Object.keys(body).length === 0) {
                    //转化成空对象{} 不应该抛出异常
                }
            } else {
                //请求体为空不应该抛出异常
            }

        } catch (error) {
            throw new InputValidationException('Invalid JSON format in request body');
        }
    }
    await next();
};