/// <reference types="node" />

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_DIR = resolve(import.meta.dirname, "..");
const SCHEMA_FILE = resolve(PROJECT_DIR, "schema.json");
const TYPES_FILE = resolve(PROJECT_DIR, "src/api-types.ts");

function run(cmd: string) {
	console.log(`> ${cmd}`);
	execSync(cmd, { cwd: PROJECT_DIR, stdio: "inherit" });
}

// 1. 生成 schema.json
console.log("Step 1: Generating OpenAPI schema...");
run("npm run schema --silent");

if (!existsSync(SCHEMA_FILE)) {
	console.error(`ERROR: ${SCHEMA_FILE} was not generated.`);
	process.exit(1);
}

// 2. 从 schema.json 生成 TS 类型
console.log("Step 2: Generating TypeScript types...");
run(`npx openapi-typescript "${SCHEMA_FILE}" -o "${TYPES_FILE}"`);

console.log(`Done! Generated: ${TYPES_FILE}`);
