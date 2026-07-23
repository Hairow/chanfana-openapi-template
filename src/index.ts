import { ApiException, InputValidationException } from "chanfana";
import { Hono } from "hono";
import { tasksRouter } from "./endpoints/tasks";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { DummyEndpoint } from "./endpoints/dummyEndpoint";
import { fromHono, collectRouteMapFromOpenapi } from "./from-hono";
import { JsonParser } from "./middleware/json-parser";
import { getMysqlDb } from "./db-mysql";
import { users } from "./db-mysql/schema";
import { AppContext } from "./types";
import { signToken, authMiddleware } from "./middleware/auth";


// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

//验证json格式
app.use('*', JsonParser)

//统一异常处理
app.onError((err, c: AppContext) => {

	console.error("Global error handler caught:", err);


	if (err instanceof ApiException) {
		return c.json(
			{
				success: false,
				errors: err.buildResponse()
			},
			err.status as ContentfulStatusCode,
		);
	}

	const cause = err instanceof Error ? err.cause : undefined
	const message = cause instanceof Error
		? `Internal Server Error: ${err.message} | cause: ${cause.message}`
		: `Internal Server Error: ${err.message}`
	return c.json(
		{
			success: false,
			errors: [{ code: 7000, message }],
		},
		500,
	);
});

//Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: '/',
	schema: {
		info: {
			title: "My Awesome API",
			version: "2.0.0",
			description: "This is the documentation for my awesome API.",
		},
	},
});


// Register Tasks Sub router
openapi.route("/tasks", tasksRouter);

// Register other endpoints
openapi.post("/dummy/:slug", DummyEndpoint);


app.get('/test', async (c: AppContext) => {
	const db = await getMysqlDb(c.env)
	// 增加 users 一条数据
	const name = 'test_' + Date.now()
	const [result] = await db.insert(users).values({
		name,
		email: name + '@example.com',
	})
	return c.text('Hello from /test! id=' + result.insertId)
});

// 签发 JWT
app.post('/login', async (c: AppContext) => {
	const body = await c.req.json<{ sub: string }>();

	if (!body.sub) {
		throw new InputValidationException("Missing required field: sub")
	}

	const token = await signToken(c.env, body.sub);
	return c.json({ success: true, token });
});

// 需要鉴权才能访问
app.get('/test/list', authMiddleware, async (c: AppContext) => {
	const db = await getMysqlDb(c.env)
	// 输出 user list
	const userList = await db.select().from(users)
	return c.json(userList)
});

// 路由注册完毕，基于 openapi.registry.definitions 自动收集 routeMap
collectRouteMapFromOpenapi(openapi);

// Export the Hono app
export default app;
