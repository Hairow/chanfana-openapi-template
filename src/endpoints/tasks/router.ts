import { Hono } from "hono";
import { fromHono } from "chanfana";
import { TaskList } from "./taskList";
import { TaskCreate } from "./taskCreate";
import { TaskRead } from "./taskRead";
import { TaskUpdate } from "./taskUpdate";
import { TaskDelete } from "./taskDelete";

export const tasksRouter = fromHono(new Hono());

// 路由级别中间件，对所有 /tasks/* 生效
// tasksRouter.use("*", authMiddleware);

tasksRouter.get("/", TaskList);
tasksRouter.post("/", TaskCreate);
tasksRouter.get("/:id", TaskRead);
tasksRouter.put("/:id", TaskUpdate);
tasksRouter.delete("/:id", TaskDelete);
