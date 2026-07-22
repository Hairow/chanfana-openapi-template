/// <reference types="node" />

import { migrate } from "drizzle-orm/mysql2/migrator";
import { drizzle } from "drizzle-orm/mysql2";
import { createConnection } from "mysql2/promise";
import "dotenv/config";

async function main() {
	const connection = await createConnection({
		uri: process.env.DATABASE_URL!,
	});

	const db = drizzle(connection);

	console.log("Applying MySQL migrations...");
	await migrate(db, { migrationsFolder: "./migrations-mysql" });
	console.log("Migrations applied successfully.");

	await connection.end();
	process.exit(0);
}

main().catch((err) => {
	console.error("Migration failed:", err);
	process.exit(1);
});
