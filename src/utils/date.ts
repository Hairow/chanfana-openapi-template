const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 将日期字符串格式化为 `YYYY-MM-DD HH:mm:ss`。
 * 解析失败则返回空字符串。
 */
export function formatDateTime(raw: string): string {
	const date = new Date(raw);
	if (isNaN(date.getTime())) return "";

	const y = date.getFullYear();
	const m = pad(date.getMonth() + 1);
	const d = pad(date.getDate());
	const h = pad(date.getHours());
	const min = pad(date.getMinutes());
	const s = pad(date.getSeconds());
	return `${y}-${m}-${d} ${h}:${min}:${s}`;
}
