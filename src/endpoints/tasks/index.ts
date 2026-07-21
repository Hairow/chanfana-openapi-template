import { contentJson, OpenAPIRoute, ApiException } from "chanfana";
import { Hono } from "hono";
import { z } from "zod";
import { and, eq, like, or, sql } from "drizzle-orm";
import { AppContext } from "../../types";
import { getDb } from "../../db";
import { tasks } from "../../db/schema";
import { selectTaskSchema, insertTaskSchema, updateTaskSchema } from "./validation1";
import { authMiddleware } from "../../middleware/auth";
import { OperationLog, fromHono } from "../../from-hono";
import { IdParam, PaginationParams } from "../../utils/zod-utils";

// ===================== Task List =====================
class TaskList extends OpenAPIRoute {
	schema = {
		tags: ["Tasks"],
		summary: "List tasks with search, filter, and pagination",
		request: {
			query: PaginationParams.extend({
				search: z.string().optional(),
				completed: z.coerce.boolean().optional(),
				order_by: z.enum(["id", "name", "slug", "due_date"]).default("id").optional(),
				order_dir: z.enum(["asc", "desc"]).default("desc").optional(),
			}),
		},
		responses: {
			"200": {
				description: "Paginated task list",
				...contentJson(
					z.object({
						success: z.boolean(),
						result: z.array(selectTaskSchema),
						result_info: z.object({
							count: z.number(),
							page: z.number(),
							per_page: z.number(),
							total_count: z.number(),
						}),
					})
				),
			},
		},
	};

	async handle(c: AppContext) {
		const db = getDb(c.env.DB);
		const data = await this.getValidatedData<typeof this.schema>();
		const { page, per_page, search, completed, order_by, order_dir } = data.query;

		const conditions = [];

		if (search) {
			conditions.push(
				or(like(tasks.name, `%${search}%`),
					like(tasks.slug, `%${search}%`),
					like(tasks.description, `%${search}%`))
			);
		}
		if (completed !== undefined) {
			conditions.push(eq(tasks.completed, completed));
		}

		const where = conditions.length ? and(...conditions) : undefined;
		const orderBy = (order_dir === "desc" ?
			sql`${tasks[order_by as keyof typeof tasks]} DESC`
			: sql`${tasks[order_by as keyof typeof tasks]} ASC`)

		const [rows, [{ total }]] = await Promise.all([
			db.select()
				.from(tasks)
				.where(where)
				.orderBy(orderBy)
				.limit(per_page)
				.offset((page - 1) * per_page),
			db.select({ total: sql<number>`count(*)` })
				.from(tasks)
				.where(where),
		]);

		return c.json({
			success: true,
			result: rows,
			result_info: { count: rows.length, page, per_page, total_count: total },
		});
	}
}

// ===================== Task Create =====================
class TaskCreate extends OpenAPIRoute {
	static operationLog: OperationLog = { type: "create", label: "创建任务" };

	schema = {
		tags: ["Tasks"],
		summary: "Create a new task",
		request: {
			body: contentJson(insertTaskSchema),
		},
		responses: {
			"201": {
				description: "Returns the created task",
				...contentJson(z.object({ success: z.boolean(), result: selectTaskSchema })),
			},
		},
	};

	async handle(c: AppContext) {
		const db = getDb(c.env.DB);
		const data = await this.getValidatedData<typeof this.schema>();
		console.debug('data', data)
		try {
			const [inserted] = await db.insert(tasks).values(data.body).returning();
			return c.json({ success: true, result: inserted }, 201);
		} catch (e: any) {
			if (e.message?.includes("UNIQUE constraint failed")) {
				return c.json(
					{ success: false, errors: [{ code: 7001, message: "A record with this unique value already exists" }] },
					409
				);
			}
			throw e;
		}
	}
}

// ===================== Task Read =====================
class TaskRead extends OpenAPIRoute {
	schema = {
		tags: ["Tasks"],
		summary: "Get a single task by ID",
		request: {
			params: IdParam,
		},
		responses: {
			"200": {
				description: "Task found",
				...contentJson(z.object({ success: z.boolean(), result: selectTaskSchema })),
			},
		},
	};

	async handle(c: AppContext) {
		const db = getDb(c.env.DB);
		const data = await this.getValidatedData<typeof this.schema>();

		const [task] = await db.select().from(tasks).where(eq(tasks.id, data.params.id)).limit(1);

		if (!task) {
			throw new ApiException("Task not found");
		}

		return c.json({ success: true, result: task });
	}
}

// ===================== Task Update =====================
class TaskUpdate extends OpenAPIRoute {
	static operationLog: OperationLog = { type: "update", label: "修改任务" };

	schema = {
		tags: ["Tasks"],
		summary: "Update a task by ID",
		request: {
			params: IdParam,
			body: contentJson(updateTaskSchema),
		},
		responses: {
			"200": {
				description: "Returns the updated task",
				...contentJson(z.object({ success: z.boolean(), result: selectTaskSchema })),
			},
		},
	};

	async handle(c: AppContext) {
		const db = getDb(c.env.DB);
		const data = await this.getValidatedData<typeof this.schema>();
		console.debug('data', data)

		const [existing] = await db.select().from(tasks).where(eq(tasks.id, data.params.id)).limit(1);
		if (!existing) {
			throw new ApiException("Task not found");
		}

		try {
			const [updated] = await db
				.update(tasks)
				.set(data.body)
				.where(eq(tasks.id, data.params.id))
				.returning();

			return c.json({ success: true, result: updated });
		} catch (e: any) {
			if (e.message?.includes("UNIQUE constraint failed")) {
				throw new ApiException('A record with this unique value already exists')
			}
			throw e;
		}
	}
}

// ===================== Task Delete =====================
class TaskDelete extends OpenAPIRoute {
	static operationLog: OperationLog = { type: "delete", label: "删除任务" };

	schema = {
		tags: ["Tasks"],
		summary: "Delete a task by ID",
		request: {
			params: IdParam,
		},
		responses: {
			"200": {
				description: "Returns the deleted task",
				...contentJson(z.object({ success: z.boolean(), result: selectTaskSchema })),
			},
		},
	};

	async handle(c: AppContext) {
		const db = getDb(c.env.DB);
		const data = await this.getValidatedData<typeof this.schema>();

		const [deleted] = await db
			.delete(tasks)
			.where(eq(tasks.id, data.params.id))
			.returning();

		if (!deleted) {
			throw new ApiException("Task not found");
		}

		return c.json({ success: true, result: deleted });
	}
}

// ===================== Router =====================
export const tasksRouter = fromHono(new Hono());

// 路由级别中间件，对所有 /tasks/* 生效
//tasksRouter.use("*", authMiddleware);

tasksRouter.get("/", TaskList);
tasksRouter.post("/", TaskCreate);
tasksRouter.get("/:id", TaskRead);
tasksRouter.put("/:id", TaskUpdate);
tasksRouter.delete("/:id", TaskDelete);
