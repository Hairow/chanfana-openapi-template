import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./migrations-mysql",
	schema: "./src/db-mysql/schema.ts",
	dialect: "mysql",
	dbCredentials: {
		url: "",
	},
});