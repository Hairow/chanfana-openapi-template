import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";
import { getDb } from "../../db";
import { tasks, insertTaskSchema, selectTaskSchema } from "../../db/schema";

export class TaskCreate extends OpenAPIRoute {
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
