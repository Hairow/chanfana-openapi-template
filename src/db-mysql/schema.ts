import { mysqlTable, int, varchar, timestamp } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
    updateAt: timestamp("update_at").notNull().$defaultFn(() => new Date()).onUpdateNow(),
    deletedAt: int("deleted_at"),
});