import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { like, or, sql } from "drizzle-orm";
import { AppContext } from "../../types";
import { getDb } from "../../db";
import { tasks, selectTaskSchema } from "../../db/schema";

export class TaskList extends OpenAPIRoute {
	schema = {
		tags: ["Tasks"],
		summary: "List tasks with search, filter, and pagination",
		request: {
			query: z.object({
				page: z.coerce.number().int().min(1).optional().default(1),
				per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
				search: z.string().optional(),
				completed: z.coerce.boolean().optional(),
				order_by: z.enum(["id", "name", "slug", "due_date"]).optional().default("id"),
				order_dir: z.enum(["asc", "desc"]).optional().default("desc"),
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
				or(like(tasks.name, `%${search}%`), like(tasks.slug, `%${search}%`), like(tasks.description, `%${search}%`))
			);
		}
		if (completed !== undefined) {
			conditions.push(sql`${tasks.completed} = ${completed}`);
		}

		const where = conditions.length ? sql`${conditions.reduce((a, b) => sql`${a} AND ${b}`)}` : undefined;

		const [rows, [{ total }]] = await Promise.all([
			db
				.select()
				.from(tasks)
				.where(where)
				.orderBy(order_dir === "desc" ? sql`${tasks[order_by]} DESC` : tasks[order_by])
				.limit(per_page)
				.offset((page - 1) * per_page),
			db.select({ total: sql<number>`count(*)` }).from(tasks).where(where),
		]);

		return c.json({
			success: true,
			result: rows,
			result_info: { count: rows.length, page, per_page, total_count: total },
		});
	}
}
