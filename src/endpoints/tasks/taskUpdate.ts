import { contentJson, OpenAPIRoute, ApiException } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { AppContext } from "../../types";
import { getDb } from "../../db";
import { tasks } from "../../db/schema";
import { selectTaskSchema, updateTaskSchema } from "./validation";

export class TaskUpdate extends OpenAPIRoute {
	schema = {
		tags: ["Tasks"],
		summary: "Update a task by ID",
		request: {
			params: z.object({ id: z.coerce.number().int() }),
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
				return c.json(
					{ success: false, errors: [{ code: 7001, message: "A record with this unique value already exists" }] },
					409
				);
			}
			throw e;
		}
	}
}
