import { ApiException, InputValidationException } from "chanfana";
import { Hono } from "hono";
import { tasksRouter } from "./endpoints/tasks";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { DummyEndpoint } from "./endpoints/dummyEndpoint";
import { fromHono, collectRouteMapFromOpenapi } from "./from-hono";
import { JsonParser } from "./middleware/json-parser";
import { getMysqlDb } from "./db-mysql";
import { users } from "./db-mysql/schema";


// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

//验证json格式
app.use('*', JsonParser)

//统一异常处理
app.onError((err, c) => {

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

	if (err instanceof InputValidationException) {
		return c.json(
			{
				success: false,
				errors: [{ code: 7000, message: err.message }],
			},
			400,
		);
	}

	return c.json(
		{
			success: false,
			errors: [{ code: 7000, message: "Internal Server Error:" + err.message }],
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


app.get('/test', async (c) => {
	const db = await getMysqlDb(c.env)
	// 增加 users 一条数据
	const [result] = await db.insert(users).values({
		name: 'test',
		email: 'test@example.com',
	})
	return c.text('Hello from /test! id=' + result.insertId)
});

app.get('/test/list', async (c) => {
	const db = await getMysqlDb(c.env)
	// 输出 user list
	const userList = await db.select().from(users)
	return c.json(userList)
});

// 路由注册完毕，基于 openapi.registry.definitions 自动收集 routeMap
collectRouteMapFromOpenapi(openapi);

// Export the Hono app
export default app;
