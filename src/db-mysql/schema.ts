import { mysqlTable, int, varchar, timestamp } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const users = mysqlTable("users", {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
    updateAt: timestamp("update_at").default(sql`CURRENT_TIMESTAMP`),
});