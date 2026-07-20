import { contentJson, OpenAPIRoute, ApiException } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { AppContext } from "../../types";
import { getDb } from "../../db";
import { tasks, selectTaskSchema } from "../../db/schema";

export class TaskDelete extends OpenAPIRoute {
	schema = {
		tags: ["Tasks"],
		summary: "Delete a task by ID",
		request: {
			params: z.object({ id: z.coerce.number().int() }),
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
