/**
 * 坐标系互转工具
 * - WGS84    : GPS / 国际标准
 * - CGCS2000 : 天地图（2000 国家大地坐标系，与 WGS84 偏差仅厘米级，本工具视为等同）
 * - GCJ02    : 国测局（高德、腾讯、Google 中国）
 * - BD09     : 百度
 *
 * 转换链路：WGS84/CGCS2000 ←→ GCJ02 ←→ BD09
 */

interface LngLat {
	lng: number;
	lat: number;
}

const PI = Math.PI;
const X_PI = (PI * 3000.0) / 180.0;
const A = 6378245.0;            // 长半轴
const EE = 0.006693421622965943; // 偏心率平方

function isOutOfChina(lng: number, lat: number): boolean {
	return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x: number, y: number): number {
	let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
	ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
	ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0;
	ret += ((160.0 * Math.sin((y / 12.0) * PI) + 320 * Math.sin((y * PI) / 30.0)) * 2.0) / 3.0;
	return ret;
}

function transformLng(x: number, y: number): number {
	let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
	ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
	ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0;
	ret += ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0;
	return ret;
}

/** WGS84 → GCJ02 偏移量 */
function delta(wgsLng: number, wgsLat: number): LngLat {
	if (isOutOfChina(wgsLng, wgsLat)) return { lng: 0, lat: 0 };
	const dLat = transformLat(wgsLng - 105.0, wgsLat - 35.0);
	const dLng = transformLng(wgsLng - 105.0, wgsLat - 35.0);
	const radLat = (wgsLat / 180.0) * PI;
	let magic = Math.sin(radLat);
	magic = 1 - EE * magic * magic;
	const sqrtMagic = Math.sqrt(magic);
	return {
		lng: (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI),
		lat: (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI),
	};
}

// ───────────────────── 公开 API ─────────────────────

/**
 * WGS84 → GCJ02
 */
export function wgs84ToGcj02(wgs: LngLat): LngLat {
	if (isOutOfChina(wgs.lng, wgs.lat)) return { ...wgs };
	const d = delta(wgs.lng, wgs.lat);
	return { lng: wgs.lng + d.lng, lat: wgs.lat + d.lat };
}

/**
 * GCJ02 → WGS84
 */
export function gcj02ToWgs84(gcj: LngLat): LngLat {
	if (isOutOfChina(gcj.lng, gcj.lat)) return { ...gcj };
	// 迭代逼近精确解
	let wgs = { ...gcj };
	let prev: LngLat;
	for (let i = 0; i < 5; i++) {
		prev = wgs;
		const d = delta(wgs.lng, wgs.lat);
		wgs = { lng: gcj.lng - d.lng, lat: gcj.lat - d.lat };
		if (Math.abs(wgs.lng - prev.lng) < 1e-12 && Math.abs(wgs.lat - prev.lat) < 1e-12) break;
	}
	return wgs;
}

/**
 * GCJ02 → BD09
 */
export function gcj02ToBd09(gcj: LngLat): LngLat {
	const z = Math.sqrt(gcj.lng * gcj.lng + gcj.lat * gcj.lat) + 0.00002 * Math.sin(gcj.lat * X_PI);
	const theta = Math.atan2(gcj.lat, gcj.lng) + 0.000003 * Math.cos(gcj.lng * X_PI);
	return {
		lng: z * Math.cos(theta) + 0.0065,
		lat: z * Math.sin(theta) + 0.006,
	};
}

/**
 * BD09 → GCJ02
 */
export function bd09ToGcj02(bd: LngLat): LngLat {
	const x = bd.lng - 0.0065;
	const y = bd.lat - 0.006;
	const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI);
	const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI);
	return {
		lng: z * Math.cos(theta),
		lat: z * Math.sin(theta),
	};
}

/**
 * WGS84 → BD09
 */
export function wgs84ToBd09(wgs: LngLat): LngLat {
	return gcj02ToBd09(wgs84ToGcj02(wgs));
}

/**
 * BD09 → WGS84
 */
export function bd09ToWgs84(bd: LngLat): LngLat {
	return gcj02ToWgs84(bd09ToGcj02(bd));
}

// ────── CGCS2000（天地图）别名：与 WGS84 算法一致 ──────

/**
 * CGCS2000 → GCJ02
 */
export const cgcs2000ToGcj02 = wgs84ToGcj02;

/**
 * GCJ02 → CGCS2000
 */
export const gcj02ToCgcs2000 = gcj02ToWgs84;

/**
 * CGCS2000 → BD09
 */
export const cgcs2000ToBd09 = wgs84ToBd09;

/**
 * BD09 → CGCS2000
 */
export const bd09ToCgcs2000 = bd09ToWgs84;
