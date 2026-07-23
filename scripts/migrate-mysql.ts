/// <reference types="node" />

import { migrate } from "drizzle-orm/mysql2/migrator";
import { drizzle } from "drizzle-orm/mysql2";
import { createConnection } from "mysql2/promise";
import { Client } from "ssh2";
import { createServer, AddressInfo } from "net";
import { config } from "dotenv";
import { homedir } from "os";
import { readFileSync } from "fs";

// 支持通过 ENV_FILE 指定 env 文件，默认 .env
config({ path: process.env.ENV_FILE || ".env" });

/**
 * 通过 SSH 建立隧道，转发远程 MySQL 到本地随机端口。
 * 返回 [localPort, sshClient]，调用方用完需 cleanup。
 */
function createSshTunnel(
	sshHost: string,
	sshPort: number,
	sshUser: string,
	sshKey: Buffer,
	remoteHost: string,
	remotePort: number,
): Promise<[number, Client]> {
	return new Promise((resolve, reject) => {
		const ssh = new Client();
		const localServer = createServer();

		localServer.listen(0, "127.0.0.1", () => {
			const localPort = (localServer.address() as AddressInfo).port;

			localServer.on("connection", (localSocket) => {
				ssh.forwardOut(
					"127.0.0.1",
					localPort,
					remoteHost,
					remotePort,
					(err, stream) => {
						if (err) {
							localSocket.destroy();
							return;
						}
						localSocket.pipe(stream).pipe(localSocket);
					},
				);
			});

			ssh.on("ready", () => resolve([localPort, ssh]))
				.on("error", (err) => {
					localServer.close();
					reject(err);
				})
				.connect({ host: sshHost, port: sshPort, username: sshUser, privateKey: sshKey });
		});

		localServer.on("error", reject);
	});
}

/** 解析 mysql://user:pass@host:port/db → { host, port, user, password, database } */
function parseMysqlUrl(url: string) {
	const u = new URL(url);
	return {
		host: u.hostname,
		port: parseInt(u.port || "3306"),
		user: decodeURIComponent(u.username),
		password: decodeURIComponent(u.password),
		database: u.pathname.replace("/", ""),
	};
}

async function main() {
	const sshHost = process.env.SSH_HOST;
	let connectionOptions: { uri: string } | Record<string, unknown>;

	if (sshHost) {
		// ── SSH 隧道模式 ────────────────────────────────────
		const sshUser = process.env.SSH_USER || "root";
		const sshPort = parseInt(process.env.SSH_PORT || "22");
		// 展开 ~ 为真实 home 路径（Node.js fs 不认 ~）
		const rawKeyPath = process.env.SSH_KEY || `${homedir()}/.ssh/id_rsa`;
		const sshKeyPath = rawKeyPath.startsWith("~") ? rawKeyPath.replace("~", homedir()) : rawKeyPath;
		const sshKey = readFileSync(sshKeyPath);

		// 从 DATABASE_URL 提取 MySQL 地址（远程视角）
		const mysql = parseMysqlUrl(process.env.DATABASE_URL!);

		const [localPort, ssh] = await createSshTunnel(
			sshHost, sshPort, sshUser, sshKey,
			mysql.host, mysql.port,
		);
		console.log(`SSH tunnel established: localhost:${localPort} → ${mysql.host}:${mysql.port}`);

		// 进程退出时清理隧道
		const cleanup = () => { ssh.end(); };
		process.on("exit", cleanup);
		process.on("SIGINT", cleanup);
		process.on("SIGTERM", cleanup);

		connectionOptions = {
			host: "127.0.0.1",
			port: localPort,
			user: mysql.user,
			password: mysql.password,
			database: mysql.database,
		};
	} else {
		// ── 直连模式 ────────────────────────────────────────
		connectionOptions = { uri: process.env.DATABASE_URL! };
	}

	const connection = await createConnection(connectionOptions as any);
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
