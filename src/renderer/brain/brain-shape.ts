// Procedural brain anatomy, defined by an SDF (signed distance field).
// Axes: x = left(-)/right(+), y = up, z = front(+)/back(-).
// Scale: 1 unit ≈ 83 mm. Proportions of an average adult brain:
// length ~167 mm (2.0 u), width ~140 mm (1.68 u), brain height ~93 mm.

export type Vec3 = [number, number, number];

interface Ellipsoid {
	c: Vec3;
	r: Vec3;
	/** Tilt around the x axis (rad); positive raises the back. */
	pitch?: number;
}

export type Lobe = "frontal" | "parietal" | "occipital" | "temporal";
export const LOBES: Lobe[] = ["frontal", "parietal", "occipital", "temporal"];

// Right-hemisphere lobes (the left one is mirrored in x).
const LOBE_SHAPES: Record<Lobe, Ellipsoid> = {
	frontal: { c: [0.4, 0.16, 0.42], r: [0.4, 0.44, 0.58] },
	parietal: { c: [0.44, 0.22, -0.22], r: [0.42, 0.42, 0.5] },
	occipital: { c: [0.36, 0.02, -0.62], r: [0.33, 0.34, 0.4] },
	// Tilted: the lateral fissure (Sylvian) rises toward the back.
	temporal: { c: [0.5, -0.22, 0.0], r: [0.34, 0.25, 0.55], pitch: 0.22 },
};

/** Half-width of the longitudinal fissure. */
const MEDIAL_X = 0.02;

// Stylized lower part (artistic freedom): no brainstem, and the cerebellum becomes a
// wide, flattened "shell" fitted under the occipital lobe, with both sides well merged.
const CEREB_LEFT: Ellipsoid = { c: [-0.26, -0.43, -0.66], r: [0.34, 0.15, 0.27] };
const CEREB_RIGHT: Ellipsoid = { c: [0.26, -0.43, -0.66], r: [0.34, 0.15, 0.27] };
const VERMIS: Ellipsoid = { c: [0, -0.44, -0.7], r: [0.14, 0.15, 0.24] };

export const HEMI_CENTER: Vec3 = [0.42, 0.06, -0.08];
/** Approximate cerebellum bounding volume (for sampling initial orphan positions). */
export const CEREBELLUM = { x: 0, y: -0.43, z: -0.66, rx: 0.58, ry: 0.15, rz: 0.27 };

// ---------- SDF ----------

function sdEllipsoid(x: number, y: number, z: number, e: Ellipsoid): number {
	let px = x - e.c[0];
	let py = y - e.c[1];
	let pz = z - e.c[2];
	if (e.pitch) {
		const c = Math.cos(e.pitch);
		const s = Math.sin(e.pitch);
		const ry = py * c + pz * s;
		pz = -py * s + pz * c;
		py = ry;
	}
	const [a, b, d] = e.r;
	const k0 = Math.sqrt((px / a) ** 2 + (py / b) ** 2 + (pz / d) ** 2);
	const k1 = Math.sqrt((px / (a * a)) ** 2 + (py / (b * b)) ** 2 + (pz / (d * d)) ** 2);
	return k1 === 0 ? -Math.min(a, b, d) : (k0 * (k0 - 1)) / k1;
}

function smin(a: number, b: number, k: number): number {
	const h = Math.max(k - Math.abs(a - b), 0) / k;
	return Math.min(a, b) - h * h * k * 0.25;
}

function smax(a: number, b: number, k: number): number {
	return -smin(-a, -b, k);
}

/** SDF of a hemisphere (uses |x|, so it applies to both sides). */
export function sdHemisphere(x: number, y: number, z: number): number {
	const ax = Math.abs(x);
	const f = sdEllipsoid(ax, y, z, LOBE_SHAPES.frontal);
	const p = sdEllipsoid(ax, y, z, LOBE_SHAPES.parietal);
	const o = sdEllipsoid(ax, y, z, LOBE_SHAPES.occipital);
	const t = sdEllipsoid(ax, y, z, LOBE_SHAPES.temporal);
	// Frontal/parietal/occipital blend smoothly; the temporal with small k -> crease (Sylvian).
	let d = smin(smin(f, p, 0.18), o, 0.14);
	d = smin(d, t, 0.05);
	// Main sulci carved into the lateral face.
	if (ax > 0.25) {
		const lateral = Math.min(1, (ax - 0.25) / 0.2);
		const sylv = sylvianDist(y, z);
		const cent = centralDist(y, z);
		d += lateral * 0.035 * Math.exp(-(sylv * sylv) / 0.0012);
		if (sylv < 0) d += lateral * 0.018 * Math.exp(-(cent * cent) / 0.0008);
	}
	// Flat medial face.
	return smax(d, MEDIAL_X - ax, 0.03);
}

// ---------- Anatomical landmarks (in the y/z sagittal plane) ----------

/** Signed distance to line A->B in the (z, y) plane. */
function lineDist(z: number, y: number, az: number, ay: number, bz: number, by: number): number {
	const dz = bz - az;
	const dy = by - ay;
	return (dz * (y - ay) - dy * (z - az)) / Math.hypot(dz, dy);
}

/** Central sulcus (of Rolando): from the vertex it descends tilted forward to the lateral fissure. Positive = frontal. */
function centralDist(y: number, z: number): number {
	return lineDist(z, y, -0.02, 0.66, 0.22, -0.02) + 0.02 * Math.sin(y * 18);
}

/** Lateral fissure (Sylvian): rises from the temporal pole toward the back. Positive = below (temporal). */
function sylvianDist(y: number, z: number): number {
	return lineDist(z, y, 0.55, -0.14, -0.4, 0.14) + 0.012 * Math.sin(z * 16);
}

/** Parieto-occipital line / pre-occipital notch. Negative = occipital. */
function parietoOccipitalDist(y: number, z: number): number {
	return lineDist(z, y, -0.58, 0.55, -0.5, -0.35) + 0.015 * Math.sin(y * 14);
}

export function sdCerebellum(x: number, y: number, z: number): number {
	const l = sdEllipsoid(x, y, z, CEREB_LEFT);
	const r = sdEllipsoid(x, y, z, CEREB_RIGHT);
	return smin(smin(l, r, 0.14), sdEllipsoid(x, y, z, VERMIS), 0.1);
}

/** Lobe of a point, from the anatomical landmarks (central sulcus, Sylvian, parieto-occipital). */
export function lobeAt(_x: number, y: number, z: number): Lobe {
	if (parietoOccipitalDist(y, z) < 0) return "occipital";
	if (sylvianDist(y, z) > 0) return "temporal";
	return centralDist(y, z) > 0 ? "frontal" : "parietal";
}

/** Distance to the nearest main sulcus/fissure (≈0 on it). */
function lobeBoundary(_x: number, y: number, z: number): number {
	const po = parietoOccipitalDist(y, z);
	let d = Math.abs(po);
	if (po > 0) {
		const sylv = sylvianDist(y, z);
		if (z > -0.42) d = Math.min(d, Math.abs(sylv));
		if (sylv < 0) d = Math.min(d, Math.abs(centralDist(y, z)));
	}
	return d;
}

// ---------- Precomputed radial surface ----------

/**
 * Radius(direction) table from a center: for each direction, the outermost
 * surface point. Queries are O(1) (bilinear interpolation).
 */
class RadialSurface {
	private readonly radii: Float32Array;

	constructor(
		readonly center: Vec3,
		sdf: (x: number, y: number, z: number) => number,
		private readonly nTheta = 72,
		private readonly nPhi = 144,
		rMax = 1.6,
	) {
		this.radii = new Float32Array(nTheta * nPhi);
		const step = 0.02;
		for (let i = 0; i < nTheta; i++) {
			const theta = (i / (nTheta - 1)) * Math.PI;
			const st = Math.sin(theta);
			const dy = Math.cos(theta);
			for (let j = 0; j < nPhi; j++) {
				const phi = (j / nPhi) * Math.PI * 2;
				const dx = st * Math.cos(phi);
				const dz = st * Math.sin(phi);
				const at = (r: number) => sdf(center[0] + dx * r, center[1] + dy * r, center[2] + dz * r);
				// March from outside in: take the outermost surface.
				let r = rMax;
				while (r > step && at(r) > 0) r -= step;
				let lo = r;
				let hi = Math.min(rMax, r + step);
				for (let k = 0; k < 8; k++) {
					const mid = (lo + hi) / 2;
					if (at(mid) > 0) hi = mid;
					else lo = mid;
				}
				this.radii[i * nPhi + j] = (lo + hi) / 2;
			}
		}
	}

	/**
	 * Surface mesh: the table's own (theta, phi) grid becomes the vertices.
	 * `mirror` mirrors in x (left hemisphere from the right one).
	 */
	mesh(part: AnatomyPart, lobed = false, mirror = false): SurfaceMesh {
		const { nTheta, nPhi, radii, center } = this;
		const positions = new Float32Array(nTheta * nPhi * 3);
		const lobe = lobed ? new Uint8Array(nTheta * nPhi) : undefined;
		for (let i = 0; i < nTheta; i++) {
			const theta = (i / (nTheta - 1)) * Math.PI;
			const st = Math.sin(theta);
			const dy = Math.cos(theta);
			for (let j = 0; j < nPhi; j++) {
				const phi = (j / nPhi) * Math.PI * 2;
				const r = radii[i * nPhi + j];
				const o = (i * nPhi + j) * 3;
				const x = center[0] + st * Math.cos(phi) * r;
				positions[o] = mirror ? -x : x;
				positions[o + 1] = center[1] + dy * r;
				positions[o + 2] = center[2] + st * Math.sin(phi) * r;
				if (lobe) lobe[i * nPhi + j] = LOBES.indexOf(lobeAt(positions[o], positions[o + 1], positions[o + 2]));
			}
		}
		const indices = new Uint32Array((nTheta - 1) * nPhi * 6);
		let w = 0;
		for (let i = 0; i < nTheta - 1; i++) {
			for (let j = 0; j < nPhi; j++) {
				const a = i * nPhi + j;
				const b = i * nPhi + ((j + 1) % nPhi);
				const c = a + nPhi;
				const d = b + nPhi;
				indices[w++] = a;
				indices[w++] = c;
				indices[w++] = b;
				indices[w++] = b;
				indices[w++] = c;
				indices[w++] = d;
			}
		}
		return { part, positions, indices, lobe };
	}

	/** Surface radius in the unit direction (dx,dy,dz). */
	radius(dx: number, dy: number, dz: number): number {
		const { nTheta, nPhi, radii } = this;
		const ti = (Math.acos(Math.max(-1, Math.min(1, dy))) / Math.PI) * (nTheta - 1);
		let pj = (Math.atan2(dz, dx) / (Math.PI * 2)) * nPhi;
		if (pj < 0) pj += nPhi;
		const i0 = Math.min(nTheta - 2, Math.floor(ti));
		const j0 = Math.floor(pj) % nPhi;
		const j1 = (j0 + 1) % nPhi;
		const ft = ti - i0;
		const fp = pj - Math.floor(pj);
		const a = radii[i0 * nPhi + j0] * (1 - fp) + radii[i0 * nPhi + j1] * fp;
		const b = radii[(i0 + 1) * nPhi + j0] * (1 - fp) + radii[(i0 + 1) * nPhi + j1] * fp;
		return a * (1 - ft) + b * ft;
	}
}

export type AnatomyPart = "cortex" | "cerebellum" | "spine";

/** Uncolored mesh: the theme paints from each vertex's part, lobe and fade. */
export interface SurfaceMesh {
	part: AnatomyPart;
	positions: Float32Array;
	indices: Uint32Array;
	/** Cortex: each vertex's index in LOBES. */
	lobe?: Uint8Array;
	/** Spinal cord: darkens toward the tip (1 = full color). */
	fade?: Float64Array;
}

let cache: { hemi: RadialSurface; cereb: RadialSurface } | undefined;
function surfaces() {
	cache ??= {
		hemi: new RadialSurface(HEMI_CENTER, sdHemisphere),
		cereb: new RadialSurface([CEREBELLUM.x, CEREBELLUM.y, CEREBELLUM.z], sdCerebellum, 40, 80, 0.8),
	};
	return cache;
}

let areaTable: { tris: Float32Array; cum: Float64Array; total: number } | undefined;

/** Triangles of the visible cortex face (without the medial face and base) with cumulative area. */
function cortexAreaTable() {
	if (areaTable) return areaTable;
	const { positions: pos, indices: idx } = surfaces().hemi.mesh("cortex");
	const tris: number[] = [];
	const cum: number[] = [];
	let total = 0;
	for (let t = 0; t < idx.length; t += 3) {
		const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
		const cx = (pos[a] + pos[b] + pos[c]) / 3 - HEMI_CENTER[0];
		const cy = (pos[a + 1] + pos[b + 1] + pos[c + 1]) / 3 - HEMI_CENTER[1];
		const cz = (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3 - HEMI_CENTER[2];
		const l = Math.hypot(cx, cy, cz) || 1;
		// Same rule as the hidden areas: the medial face and base get no notes.
		if (cx / l < -0.3 || cy / l < -0.75) continue;
		const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
		const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
		const area = 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
		if (area <= 0) continue;
		total += area;
		cum.push(total);
		tris.push(pos[a], pos[a + 1], pos[a + 2], pos[b], pos[b + 1], pos[b + 2], pos[c], pos[c + 1], pos[c + 2]);
	}
	areaTable = { tris: new Float32Array(tris), cum: new Float64Array(cum), total };
	return areaTable;
}

/** Area of the visible cortex face (both hemispheres), in u². */
export function cortexVisibleArea(): number {
	return cortexAreaTable().total * 2;
}

/**
 * Uniform points by AREA on the visible cortex face (both hemispheres), stratified to
 * avoid clumping. `depthMin/Max` move the point away from the hemisphere center (1 = surface).
 */
export function sampleCortexByArea(count: number, rng: Rng, depthMin = 1, depthMax = 1): Float32Array {
	const { tris, cum, total } = cortexAreaTable();
	const out = new Float32Array(count * 3);
	const perHemi = [Math.ceil(count / 2), Math.floor(count / 2)];
	let w = 0;
	for (const [hi, h] of [[0, 1], [1, -1]] as const) {
		const N = perHemi[hi];
		for (let i = 0; i < N; i++) {
			const target = ((i + rng()) / N) * total;
			let lo = 0, hi2 = cum.length - 1;
			while (lo < hi2) {
				const mid = (lo + hi2) >> 1;
				if (cum[mid] < target) lo = mid + 1;
				else hi2 = mid;
			}
			const t = lo * 9;
			let r1 = rng(), r2 = rng();
			if (r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2; }
			const px = tris[t] + (tris[t + 3] - tris[t]) * r1 + (tris[t + 6] - tris[t]) * r2;
			const py = tris[t + 1] + (tris[t + 4] - tris[t + 1]) * r1 + (tris[t + 7] - tris[t + 1]) * r2;
			const pz = tris[t + 2] + (tris[t + 5] - tris[t + 2]) * r1 + (tris[t + 8] - tris[t + 2]) * r2;
			const depth = depthMin + rng() * (depthMax - depthMin);
			const x = HEMI_CENTER[0] + (px - HEMI_CENTER[0]) * depth;
			out[w++] = h * x;
			out[w++] = HEMI_CENTER[1] + (py - HEMI_CENTER[1]) * depth;
			out[w++] = HEMI_CENTER[2] + (pz - HEMI_CENTER[2]) * depth;
		}
	}
	return out;
}

export function cerebellumCenter(): Vec3 {
	return surfaces().cereb.center;
}

// ---------- Spinal cord (stylized) ----------
// Tapered tube along a curve that descends and tilts back, without a "head" (pons)
// or rounded tip: it tapers uniformly and the end simply fades.
const SPINE_P0: Vec3 = [0, -0.24, -0.24];
const SPINE_P1: Vec3 = [0, -0.62, -0.3];
const SPINE_P2: Vec3 = [0, -0.98, -0.5];
const SPINE_TOP_RADIUS = 0.09;
const SPINE_TIP_RADIUS = 0.04;

/** Spinal cord center at parameter t (0 = top, 1 = tip): quadratic Bézier. */
function spineCenter(t: number, out: number[]): void {
	const u = 1 - t;
	for (let c = 0; c < 3; c++) out[c] = u * u * SPINE_P0[c] + 2 * u * t * SPINE_P1[c] + t * t * SPINE_P2[c];
}

/** Spinal cord radius: tapers uniformly from top to tip. */
function spineRadius(t: number): number {
	return SPINE_TIP_RADIUS + (SPINE_TOP_RADIUS - SPINE_TIP_RADIUS) * (1 - t);
}

/** Orthonormal frame perpendicular to the curve at t (to sweep the tube's circle). */
function spineFrame(t: number, c: number[], n: number[], b: number[]): void {
	const a = [0, 0, 0];
	const z = [0, 0, 0];
	spineCenter(Math.max(0, t - 0.01), a);
	spineCenter(Math.min(1, t + 0.01), z);
	spineCenter(t, c);
	let tx = z[0] - a[0], ty = z[1] - a[1], tz = z[2] - a[2];
	const tl = Math.hypot(tx, ty, tz) || 1;
	tx /= tl; ty /= tl; tz /= tl;
	// n = x (the curve lives in the sagittal plane), b = tangent × n
	n[0] = 1; n[1] = 0; n[2] = 0;
	b[0] = ty * n[2] - tz * n[1];
	b[1] = tz * n[0] - tx * n[2];
	b[2] = tx * n[1] - ty * n[0];
	const bl = Math.hypot(b[0], b[1], b[2]) || 1;
	b[0] /= bl; b[1] /= bl; b[2] /= bl;
}

function spineMesh(): SurfaceMesh {
	const RINGS = 28;
	const SIDES = 14;
	const positions = new Float32Array(RINGS * SIDES * 3);
	const fade = new Float64Array(RINGS * SIDES);
	const c = [0, 0, 0], n = [0, 0, 0], b = [0, 0, 0];
	for (let i = 0; i < RINGS; i++) {
		const t = i / (RINGS - 1);
		spineFrame(t, c, n, b);
		const r = spineRadius(t);
		for (let j = 0; j < SIDES; j++) {
			const a = (j / SIDES) * Math.PI * 2;
			const o = (i * SIDES + j) * 3;
			for (let k = 0; k < 3; k++) positions[o + k] = c[k] + (n[k] * Math.cos(a) + b[k] * Math.sin(a)) * r;
			// darken toward the tip: the spinal cord "fades" into the background
			fade[i * SIDES + j] = 1 - t * 0.45;
		}
	}
	const indices = new Uint32Array((RINGS - 1) * SIDES * 6);
	let w = 0;
	for (let i = 0; i < RINGS - 1; i++)
		for (let j = 0; j < SIDES; j++) {
			const p = i * SIDES + j;
			const q = i * SIDES + ((j + 1) % SIDES);
			indices[w++] = p;
			indices[w++] = p + SIDES;
			indices[w++] = q;
			indices[w++] = q;
			indices[w++] = p + SIDES;
			indices[w++] = q + SIDES;
		}
	return { part: "spine", positions, indices, fade };
}

/** Solid anatomy meshes: 2 hemispheres, cerebellum and spinal cord. */
export function anatomyMeshes(): SurfaceMesh[] {
	const { hemi, cereb } = surfaces();
	return [hemi.mesh("cortex", true, false), hemi.mesh("cortex", true, true), cereb.mesh("cerebellum"), spineMesh()];
}

/** Cortex radius in unit direction d from the center of hemisphere h (±1). */
export function cortexRadius(h: number, dx: number, dy: number, dz: number): number {
	return surfaces().hemi.radius(dx * h, dy, dz);
}

/** Cortex point in hemisphere h, direction d, with depth factor (1 = surface). */
export function cortexPoint(h: number, dx: number, dy: number, dz: number, depth: number, out: number[]): void {
	const R = cortexRadius(h, dx, dy, dz) * depth;
	out[0] = h * HEMI_CENTER[0] + dx * R;
	out[1] = HEMI_CENTER[1] + dy * R;
	out[2] = HEMI_CENTER[2] + dz * R;
}

/** Constrains a point to the cortical layer (between the surface radius's inner and outer bounds). */
export function projectToCortex(p: Float32Array, o: number, inner: number, outer: number): void {
	const h = p[o] >= 0 ? 1 : -1;
	const cx = h * HEMI_CENTER[0];
	const vx = p[o] - cx;
	const vy = p[o + 1] - HEMI_CENTER[1];
	const vz = p[o + 2] - HEMI_CENTER[2];
	const len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1e-6;
	const R = cortexRadius(h, vx / len, vy / len, vz / len);
	const target = Math.min(R * outer, Math.max(R * inner, len));
	if (target === len) return;
	const s = target / len;
	p[o] = cx + vx * s;
	p[o + 1] = HEMI_CENTER[1] + vy * s;
	p[o + 2] = HEMI_CENTER[2] + vz * s;
}

/** Constrains a point to the cerebellum shell. */
export function projectToCerebellum(p: Float32Array, o: number, inner: number, outer: number): void {
	const s = surfaces().cereb;
	const c = s.center;
	const vx = p[o] - c[0];
	const vy = p[o + 1] - c[1];
	const vz = p[o + 2] - c[2];
	const len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1e-6;
	const R = s.radius(vx / len, vy / len, vz / len);
	const target = Math.min(R * outer, Math.max(R * inner, len));
	if (target === len) return;
	const k = target / len;
	p[o] = c[0] + vx * k;
	p[o + 1] = c[1] + vy * k;
	p[o + 2] = c[2] + vz * k;
}

// ---------- Deterministic randomness ----------

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function randomDir(rng: Rng, out: number[]): void {
	const u = rng() * 2 - 1;
	const phi = rng() * Math.PI * 2;
	const s = Math.sqrt(1 - u * u);
	out[0] = s * Math.cos(phi);
	out[1] = u;
	out[2] = s * Math.sin(phi);
}

// ---------- Anatomical outline (point cloud) ----------

/** Smooth field whose level curves resemble secondary sulci. */
function gyri(x: number, y: number, z: number): number {
	const wx = x + 0.35 * Math.sin(y * 6.1 + z * 3.7);
	const wy = y + 0.35 * Math.sin(z * 5.3 + x * 4.9);
	const wz = z + 0.35 * Math.sin(x * 6.7 + y * 4.3);
	return (
		Math.sin(wx * 13.0 + Math.sin(wz * 7.0)) * Math.cos(wy * 12.0 + Math.sin(wx * 6.0)) +
		0.6 * Math.sin(wz * 14.0 + wy * 5.0)
	);
}

export enum ShellKind {
	/** Main fissures and sulci (boundaries between lobes). */
	Boundary,
	/** Secondary sulci, tinted by the lobe. */
	Sulcus,
	Cerebellum,
	Spine,
}

/** Uncolored anatomy points: the theme paints from the kind, lobe and fade. */
export interface Shell {
	positions: Float32Array;
	kind: Uint8Array;
	/** Sulci: index in LOBES. */
	lobe: Uint8Array;
	/** Spinal cord: darkens toward the tip (1 = full color). */
	fade: Float64Array;
}

/**
 * Anatomy points: main fissures and sulci (boundaries between lobes) highlighted,
 * discrete secondary sulci lightly tinted by lobe, foliated cerebellum and spinal cord.
 */
export function sampleShell(rng: Rng): Shell {
	const { cereb } = surfaces();
	const pts: number[] = [];
	const kinds: number[] = [];
	const lobes: number[] = [];
	const fades: number[] = [];
	const d = [0, 0, 0];
	const p = [0, 0, 0];

	const target = 7000;
	let got = 0;
	for (let tries = 0; got < target && tries < target * 50; tries++) {
		const h = rng() < 0.5 ? -1 : 1;
		randomDir(rng, d);
		cortexPoint(h, d[0], d[1], d[2], 1.006, p);
		if (Math.abs(p[0]) < MEDIAL_X + 0.06) continue; // the medial face stays hidden
		const boundary = lobeBoundary(p[0], p[1], p[2]) < 0.01 && Math.abs(p[0]) > 0.12;
		const sulcus = Math.abs(gyri(p[0], p[1], p[2])) < 0.07;
		if (!boundary && !sulcus) continue;
		pts.push(p[0], p[1], p[2]);
		kinds.push(boundary ? ShellKind.Boundary : ShellKind.Sulcus);
		lobes.push(boundary ? 0 : LOBES.indexOf(lobeAt(p[0], p[1], p[2])));
		fades.push(1);
		got++;
	}

	// Cerebellum: thin, parallel horizontal folia.
	const cc = cereb.center;
	for (let tries = 0, n = 0; n < 1800 && tries < 60000; tries++) {
		randomDir(rng, d);
		const R = cereb.radius(d[0], d[1], d[2]) * 1.012;
		const x = cc[0] + d[0] * R;
		const y = cc[1] + d[1] * R;
		const z = cc[2] + d[2] * R;
		if (Math.abs(Math.sin(y * 95 + 2.5 * Math.sin(x * 3.5))) > 0.3) continue;
		pts.push(x, y, z);
		kinds.push(ShellKind.Cerebellum);
		lobes.push(0);
		fades.push(1);
		n++;
	}

	// Spinal cord: points on the tube surface, thinning only near the tip.
	const sc = [0, 0, 0], sn = [0, 0, 0], sb = [0, 0, 0];
	for (let k = 0; k < 900; k++) {
		const t = rng();
		if (rng() > 1 - t * t * 0.7) continue; // fades only at the end
		spineFrame(t, sc, sn, sb);
		const a = rng() * Math.PI * 2;
		const r = spineRadius(t) * 1.02;
		const x = sc[0] + (sn[0] * Math.cos(a) + sb[0] * Math.sin(a)) * r;
		const y = sc[1] + (sn[1] * Math.cos(a) + sb[1] * Math.sin(a)) * r;
		const z = sc[2] + (sn[2] * Math.cos(a) + sb[2] * Math.sin(a)) * r;
		if (sdHemisphere(x, y, z) < 0 || sdCerebellum(x, y, z) < 0) continue; // part hidden inside the brain
		pts.push(x, y, z);
		kinds.push(ShellKind.Spine);
		lobes.push(0);
		fades.push(1 - t * 0.5);
	}

	return {
		positions: new Float32Array(pts),
		kind: new Uint8Array(kinds),
		lobe: new Uint8Array(lobes),
		fade: new Float64Array(fades),
	};
}
