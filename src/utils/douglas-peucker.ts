/**
 * Douglas-Peucker 抽稀算法。
 * 适用于经纬度坐标，epsilon 以米为单位，内部通过 Haversine / 方位角
 * 计算球面上的垂直偏移距离（cross-track distance）。
 */

interface LngLat {
	lng: number; // 经度
	lat: number; // 纬度
}

const EARTH_RADIUS = 6371000; // 地球平均半径（米）

function toRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Haversine 公式计算两点间的大圆距离（米）
 */
function haversineDistance(a: LngLat, b: LngLat): number {
	const φ1 = toRad(a.lat);
	const φ2 = toRad(b.lat);
	const Δφ = toRad(b.lat - a.lat);
	const Δλ = toRad(b.lng - a.lng);

	const h =
		Math.sin(Δφ / 2) ** 2 +
		Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

	return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}

/**
 * 起始方位角（initial bearing），从 a 指向 b（弧度，范围 [-π, π]）
 */
function initialBearing(a: LngLat, b: LngLat): number {
	const φ1 = toRad(a.lat);
	const φ2 = toRad(b.lat);
	const Δλ = toRad(b.lng - a.lng);

	const y = Math.sin(Δλ) * Math.cos(φ2);
	const x =
		Math.cos(φ1) * Math.sin(φ2) -
		Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

	return Math.atan2(y, x);
}

/**
 * 点到大圆弧的垂直偏移距离（cross-track distance），单位米。
 * 若投影点落在弧段 AB 外侧，则返回点与最近端点的 Haversine 距离。
 */
function perpendicularDistance(point: LngLat, start: LngLat, end: LngLat): number {
	const d_ab = haversineDistance(start, end);

	// 线段退化为点
	if (d_ab < 1e-6) {
		return haversineDistance(point, start);
	}

	const d_ap = haversineDistance(start, point);
	const θ_ab = initialBearing(start, end);
	const θ_ap = initialBearing(start, point);

	// cross-track distance
	const d_xt =
		Math.abs(
			Math.asin(
				Math.sin(d_ap / EARTH_RADIUS) * Math.sin(θ_ap - θ_ab),
			),
		) * EARTH_RADIUS;

	// along-track distance：垂足沿 AB 方向的距离
	const cosArg = clamp(
		Math.cos(d_ap / EARTH_RADIUS) / Math.cos(d_xt / EARTH_RADIUS),
		-1,
		1,
	);
	const d_at = Math.acos(cosArg) * EARTH_RADIUS;

	// 投影在弧段外侧，返回到最近端点的距离
	if (d_at < 0) return haversineDistance(point, start);
	if (d_at > d_ab) return haversineDistance(point, end);

	return d_xt;
}

/**
 * Douglas-Peucker 递归核心
 * @param points   - 原始点数组（会被修改）
 * @param epsilon  - 抽稀阈值（米）
 * @param keepMask - 输出的保留标记
 */
function douglasPeuckerRecursive(
	points: LngLat[],
	start: number,
	end: number,
	epsilon: number,
	keepMask: boolean[],
): void {
	if (end - start <= 1) return;

	let maxDist = -1;
	let maxIndex = start;

	for (let i = start + 1; i < end; i++) {
		const dist = perpendicularDistance(points[i], points[start], points[end]);
		if (dist > maxDist) {
			maxDist = dist;
			maxIndex = i;
		}
	}

	if (maxDist > epsilon) {
		keepMask[maxIndex] = true;
		douglasPeuckerRecursive(points, start, maxIndex, epsilon, keepMask);
		douglasPeuckerRecursive(points, maxIndex, end, epsilon, keepMask);
	}
}

/**
 * Douglas-Peucker 抽稀算法。
 *
 * 适用于经纬度坐标，{lng: 经度, lat: 纬度}。
 * 内部使用 Haversine + 方位角计算点到大圆弧的垂直偏移距离（cross-track distance），
 * epsilon 为米，通过与实际地理偏移比较决定点是否保留，而非近似地将经纬度差值当作距离。
 *
 * 原理：用递归分治找到偏离首尾连线（大圆弧）最远的点，若偏移 > `epsilon`（米）
 * 则保留该点并将其作为分割点继续递归左右两段，否则整段中间点全部丢弃。
 * 首尾两点始终保留，输出保持原始顺序。
 *
 * @param points  - 原始点序列 [{lng, lat}, ...]，不修改原数组
 * @param epsilon - 抽稀阈值（米），偏离小于此值的点将被丢弃
 *                  常用参考值：
 *                    5m   — 高精度（步行轨迹）
 *                    20m  — 中等精度（骑行/驾车）
 *                    50m  — 低精度（长距离概览）
 * @returns 抽稀后的新数组，元素为原数组子序列，保持原始顺序，首尾点始终保留
 *
 * @example
 * // 点数 <= 2 直接返回
 * douglasPeucker([{lng: 116.4, lat: 39.9}], 10)
 * // => [{lng: 116.4, lat: 39.9}]
 *
 * @example
 * // epsilon = 50m，偏离不足 50m 的中间点将被移除
 * const track = [
 *   {lng: 116.397, lat: 39.908},
 *   {lng: 116.398, lat: 39.909},
 *   {lng: 116.400, lat: 39.910},
 * ];
 * douglasPeucker(track, 50);
 */
export function douglasPeucker(points: readonly LngLat[], epsilon: number): LngLat[] {
	if (points.length <= 2) return [...points];

	const keepMask = new Array<boolean>(points.length).fill(false);
	keepMask[0] = true;
	keepMask[points.length - 1] = true;

	douglasPeuckerRecursive([...points], 0, points.length - 1, epsilon, keepMask);

	return points.filter((_, i) => keepMask[i]);
}
