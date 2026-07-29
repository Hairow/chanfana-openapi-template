# OpenAPI 模板

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/chanfana-openapi-template)

![OpenAPI Template Preview](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/91076b39-1f5b-46f6-7f14-536a6f183000/public)

<!-- dash-content-start -->

这是一个 Cloudflare Worker 项目，使用 [chanfana](https://github.com/cloudflare/chanfana) 和 [Hono](https://github.com/honojs/hono) 实现 OpenAPI 3.1 自动生成与校验。

本示例项目旨在帮助你快速上手构建符合 OpenAPI 规范的 Worker，它可以自动从代码生成 `openapi.json` 并校验请求参数和请求体。

本模板包含多个端点示例、一个 D1 数据库以及基于 [Vitest](https://vitest.dev/) 的集成测试。端点中既有 [chanfana D1 自动端点](https://chanfana.com/endpoints/auto/d1)，也有[普通端点](https://chanfana.com/endpoints/defining-endpoints)，可作为实际项目的参考。

除了在浏览器中查看 OpenAPI schema（openapi.json），你也可以通过运行 `npm run schema` 命令直接在本地导出 schema。

<!-- dash-content-end -->

> [!IMPORTANT]
> 使用 C3 创建此项目时，请在询问是否部署时选择"no"。部署前需要先完成下方的[准备步骤](#准备步骤)。

## 快速开始

除了克隆本仓库，你也可以使用 [C3](https://developers.cloudflare.com/pages/get-started/c3/)（`create-cloudflare` CLI）基于此模板创建新项目：

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/openapi-template
```

本模板的公开部署示例：[https://openapi-template.templates.workers.dev](https://openapi-template.templates.workers.dev)

## 准备步骤

1. 安装项目依赖：
   ```bash
   npm install
   ```
2. 创建一个 [D1 数据库](https://developers.cloudflare.com/d1/get-started/)，命名为 "openapi-template-db"：
   ```bash
   npx wrangler d1 create openapi-template-db
   ```
   ...然后将 `wrangler.jsonc` 中的 `database_id` 替换为新数据库的 ID。
3. 部署项目（`predeploy` 会自动执行 D1 远程迁移，无需手动迁移）：
   ```bash
   npm run deploy
   ```
4. 监控 Worker 运行日志：
   ```bash
   npx wrangler tail
   ```

> 本地开发时，`npm run dev` 也会通过 `predev` 自动应用 D1 本地迁移，同样无需手动操作。

---

## 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 运行时 | Cloudflare Workers | Serverless 边缘计算 |
| Web 框架 | [Hono](https://hono.dev/docs) 4.x | 轻量高性能路由框架 |
| OpenAPI | [chanfana](https://chanfana.com/) 2.x | 自动生成 OpenAPI 3.1 文档 + 请求校验 |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) + drizzle-zod | 支持 D1 (SQLite) + MySQL |
| 数据校验 | [Zod](https://zod.dev/) 3.x | TypeScript 优先的 schema 校验 |
| JWT 认证 | [jose](https://github.com/panva/jose) 6.x | HS256 签名与验证 |
| 测试 | [Vitest](https://vitest.dev/) + @cloudflare/vitest-pool-workers | 集成测试，模拟 Worker 环境 |
| 部署 | Wrangler 4.x | Cloudflare 命令行工具 |
| 语言 | TypeScript 5.9 | 严格类型检查 |

### 数据库

项目同时支持两种数据库：

| 数据库 | 绑定名 | 驱动 | 迁移目录 |
|--------|--------|------|----------|
| D1 (SQLite) | `DB` | `drizzle-orm/d1` | `migrations/` |
| MySQL (Hyperdrive) | `HYPERDRIVE` | `drizzle-orm/mysql2` | `migrations-mysql/` |

MySQL 通过 Cloudflare Hyperdrive 连接，支持本地直连和 SSH 隧道两种迁移方式。

---

## API 端点

### Tasks CRUD（OpenAPI 文档化，D1 数据库）

| 方法 | 路径 | 功能 |
|------|------|------|
| `GET` | `/tasks` | 分页查询任务列表，支持 `search`、`completed`、`order_by`、`order_dir` |
| `POST` | `/tasks` | 创建新任务，slug 冲突返回 409 |
| `GET` | `/tasks/:id` | 按 ID 获取任务，不存在返回 404 |
| `PUT` | `/tasks/:id` | 更新任务，先检查存在再更新 |
| `DELETE` | `/tasks/:id` | 删除任务，返回被删除的记录 |

### Dummy 示例端点

| 方法 | 路径 | 功能 |
|------|------|------|
| `POST` | `/dummy/:slug` | 示例端点，接收路径参数和 JSON body |

### 原生 Hono 端点（不注册到 OpenAPI）

| 方法 | 路径 | 功能 |
|------|------|------|
| `GET` | `/test` | 测试 MySQL 连接，插入测试记录并返回 insertId |
| `GET` | `/test/list` | 查询所有 users（MySQL） |
| `POST` | `/login` | 用户登录，签发 accessToken（2h）+ refreshToken（7d） |
| `POST` | `/refresh` | 用 refreshToken 换取新的 accessToken |
| `GET` | `/location` | 定位 HTML 页面 |
| `GET` | `/sign` | 浏览器签名 HTML 页面 |

---

## 数据库结构

### D1 -- `tasks` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER (PK, AUTOINCREMENT) | 主键 |
| `name` | TEXT (NOT NULL) | 任务名称 |
| `status` | INTEGER (DEFAULT 0) | 0=待处理, 1=进行中, 2=已完成, 3=已取消, 4=已归档 |
| `slug` | TEXT (NOT NULL, UNIQUE) | 唯一标识 |
| `description` | TEXT (DEFAULT '') | 任务描述 |
| `completed` | INTEGER (DEFAULT false) | 是否完成 |
| `due_date` | TEXT (DEFAULT '') | 截止日期 |

### MySQL -- `users` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INT (PK, AUTO_INCREMENT) | 主键 |
| `name` | VARCHAR(255) (NOT NULL, UNIQUE) | 用户名 |
| `email` | VARCHAR(255) (NOT NULL) | 邮箱 |
| `created_at` | TIMESTAMP (DEFAULT CURRENT_TIMESTAMP) | 创建时间 |
| `update_at` | TIMESTAMP (ON UPDATE CURRENT_TIMESTAMP) | 更新时间 |
| `deleted_at` | INT (NULLABLE) | 软删除标记 |

---

## 认证机制

- **算法**：HS256 (HMAC-SHA256)
- **密钥**：环境变量 `TOKEN_SECRET`
- **Token 类型**：
  - `accessToken`：有效期 **2 小时**，用于 API 鉴权
  - `refreshToken`：有效期 **7 天**，用于续期 accessToken
- **认证方式**：`Authorization: Bearer <accessToken>`
- **中间件路径**：`src/middleware/auth.ts`

> 注意：auth 中间件已实现但默认未挂载到路由上，可按需启用。

---

## 中间件

| 中间件 | 文件 | 功能 |
|--------|------|------|
| `JsonParser` | `src/middleware/json-parser.ts` | 全局 JSON body 解析，校验 `Content-Type` |
| `authMiddleware` | `src/middleware/auth.ts` | JWT Bearer Token 认证 |
| `operationLogMiddleware` | `src/middleware/operation-log.ts` | 声明式操作日志（匹配 OpenAPIRoute） |

全局异常处理器在 `src/index.ts` 中统一捕获 `ApiException` 并返回对应错误码。

---

## 工具函数

| 文件 | 功能 |
|------|------|
| `src/utils/zod-utils.ts` | 通用 Zod schema：IdParam、PaginationParams、PaginationResultInfo |
| `src/utils/date.ts` | 日期格式化 `formatDateTime` |
| `src/utils/coord-convert.ts` | WGS84/CGCS2000 ↔ GCJ02 ↔ BD09 坐标系转换 |
| `src/utils/douglas-peucker.ts` | Douglas-Peucker 轨迹抽稀（球面距离，epsilon 米制） |
| `src/client/api-client.ts` | 浏览器端 API SDK，支持自动 token 续期、并发续期锁 |

---

## NPM Scripts

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地开发启动（自动应用 D1 本地迁移） |
| `npm run deploy` | 部署到 Cloudflare（自动应用 D1 远程迁移） |
| `npm run schema` | 导出 OpenAPI JSON Schema |
| `npm run test` | 先 dry-run 检查，再运行 Vitest 集成测试 |
| `npm run db:generate` | 同时生成 D1 和 MySQL 的 migration 文件 |
| `npm run db:mysql:migrate` | 本地执行 MySQL 迁移（读取 `.env`） |
| `npm run db:mysql:migrate_remote` | 远程执行 MySQL 迁移（读取 `.env.prod`，支持 SSH 隧道） |
| `npm run prepare` | 安装 git pre-commit hook（schema 变更自动生成 migration） |

---

## 测试

本模板包含基于 [Vitest](https://vitest.dev/) 的集成测试，通过 `SELF.fetch` 模拟 Worker 环境：

```bash
npm run test
```

测试覆盖：

- **Tasks CRUD**：创建、读取、更新、删除、无效输入校验、404 处理、冲突检测
- **Dummy 端点**：路径参数和 JSON body 校验

测试文件位于 `tests/` 目录，配置在 `tests/vitest.config.mts`。

---

## 项目结构

```
├── src/
│   ├── index.ts              # 主入口，路由注册 + 全局异常处理
│   ├── endpoints/
│   │   ├── tasks/            # Tasks CRUD（端点 + Drizzle schema）
│   │   │   ├── index.ts      # 端点定义（TaskList/Create/Read/Update/Delete）
│   │   │   └── schema.ts     # Drizzle schema → Zod validator
│   │   ├── dummy.ts          # 示例端点
│   │   ├── test.ts           # 测试 MySQL 连接
│   │   ├── login.ts          # 登录 + Token 续期
│   │   ├── location.ts       # 定位 HTML 页面
│   │   └── sign.ts           # 签名 HTML 页面
│   ├── middleware/
│   │   ├── auth.ts           # JWT 认证中间件
│   │   ├── json-parser.ts    # JSON body 解析
│   │   └── operation-log.ts  # 操作日志中间件
│   ├── utils/
│   │   ├── zod-utils.ts      # 通用 Zod schema
│   │   ├── date.ts           # 日期工具
│   │   ├── coord-convert.ts  # 坐标系转换
│   │   └── douglas-peucker.ts # 轨迹抽稀
│   ├── db/
│   │   └── schema.ts         # D1 数据库 schema
│   └── db-mysql/
│       └── schema.ts         # MySQL 数据库 schema
├── tests/
│   ├── integration/
│   │   ├── tasks.test.ts     # Tasks 集成测试
│   │   └── dummyEndpoint.test.ts  # Dummy 端点测试
│   └── vitest.config.mts    # Vitest 配置
├── migrations/               # D1 迁移文件
├── migrations-mysql/          # MySQL 迁移文件
├── scripts/
│   ├── migrate-mysql.ts      # MySQL 迁移脚本（支持 SSH 隧道）
│   └── prepare.cjs           # 安装 git pre-commit hook
├── wrangler.jsonc            # Wrangler 配置（D1 + Hyperdrive）
├── drizzle.config.d1.ts      # Drizzle D1 配置
├── drizzle.config.mysql.ts   # Drizzle MySQL 配置
└── package.json
```

更多信息请参阅 [chanfana 文档](https://chanfana.com/)、[Hono 文档](https://hono.dev/docs) 和 [Vitest 文档](https://vitest.dev/guide/)。
