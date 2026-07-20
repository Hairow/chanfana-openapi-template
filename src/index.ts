import { ApiException } from "chanfana";
import { Hono } from "hono";
import { tasksRouter } from "./endpoints/tasks";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { DummyEndpoint } from "./endpoints/dummyEndpoint";
import { operationLogMiddleware } from "./middleware/operation-log";
import { fromHono, collectRouteMapFromOpenapi } from "./from-hono";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// 全局操作日志中间件
app.use("*", operationLogMiddleware);

app.onError((err, c) => {
	if (err instanceof ApiException) {
		return c.json(
			{ success: false, errors: err.buildResponse() },
			err.status as ContentfulStatusCode,
		);
	}

	console.error("Global error handler caught:", err);

	return c.json(
		{
			success: false,
			errors: [{ code: 7000, message: "Internal Server Error" }],
		},
		500,
	);
});

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/",
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

// 路由注册完毕，基于 openapi.registry.definitions 自动收集 routeMap
collectRouteMapFromOpenapi(openapi);

// Export the Hono app
export default app;
