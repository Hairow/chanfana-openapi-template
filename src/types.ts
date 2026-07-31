import type { Context } from "hono";

export type AppBindings = { Bindings: Env };
export type AppContext = Context<AppBindings>;
export type HandleArgs = [AppContext];
