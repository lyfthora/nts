import { Color } from "three";
import type { GraphCore, GroupBy } from "./graph-core";

export type PaletteId = "nebula" | "aurora" | "ember" | "pastel" | "accent" | "okabe-ito";

export const PALETTE_NAMES: Record<PaletteId, string> = {
	nebula: "Nebula",
	aurora: "Aurora",
	ember: "Ember",
	pastel: "Pastel",
	accent: "Accent (theme color)",
	"okabe-ito": "Colorblind safe",
};

export interface PaletteDef {
	dark: string[];
	/** Hex shown as is in dark mode too (without the original look's linear conversion). */
	display?: boolean;
	/** Regions beyond the palette repeat colors instead of getting new hues from the golden angle. */
	cycle?: boolean;
}

/** Built-in palettes, ordered by region size (largest = 0). The "accent" palette is generated from the theme. */
export const PALETTES: Record<Exclude<PaletteId, "accent">, PaletteDef> = {
	nebula: {
		dark: [
			"#5eead4", "#a78bfa", "#f472b6", "#60a5fa", "#fbbf24", "#34d399",
			"#fb7185", "#38bdf8", "#c084fc", "#f59e0b", "#4ade80", "#e879f9",
		],
	},
	// Cool tones alternating green, blue and violet: the largest regions (adjacent in the list) do not look alike.
	aurora: {
		dark: [
			"#5eead4", "#818cf8", "#4ade80", "#38bdf8", "#c4b5fd", "#34d399",
			"#60a5fa", "#a78bfa", "#22d3ee", "#86efac", "#93c5fd", "#2dd4bf",
		],
	},
	ember: {
		dark: [
			"#fbbf24", "#fb7185", "#f472b6", "#fb923c", "#f87171", "#e879f9",
			"#facc15", "#fda4af", "#f97316", "#ec4899", "#fcd34d", "#d946ef",
		],
	},
	pastel: {
		dark: [
			"#99f6e4", "#c4b5fd", "#fbcfe8", "#bfdbfe", "#fde68a", "#bbf7d0",
			"#fecdd3", "#bae6fd", "#e9d5ff", "#fed7aa", "#d9f99d", "#f5d0fe",
		],
	},
	// Okabe-Ito: 8 colors distinguishable with common types of color blindness. Shown as is
	// (converting to linear would change the tones and break the distinction).
	"okabe-ito": {
		dark: ["#e69f00", "#56b4e9", "#009e73", "#f0e442", "#0072b2", "#d55e00", "#cc79a7", "#999999"],
		display: true,
		cycle: true,
	},
};

/** Tones from the theme accent color: similar hue, varying lightness. */
export function accentPalette(accent: Color): PaletteDef {
	const hsl = { h: 0, s: 0, l: 0 };
	accent.getHSL(hsl);
	const s = Math.max(0.5, hsl.s);
	const hues = [0, -14, 14, -28, 28, -7, 7, -21, 21, -35, 35, 0];
	const dark = [0.66, 0.74, 0.58, 0.7, 0.62, 0.78, 0.54, 0.68, 0.6, 0.72, 0.64, 0.82];
	const tones = hues.map((dh, k) =>
		"#" + new Color().setHSL((hsl.h + dh / 360 + 1) % 1, s, dark[k]).getHexString(),
	);
	return { dark: tones, display: true, cycle: true };
}

// ---------- User-chosen colors ----------

/** "#abc", "abc", "#aabbcc" or "aabbcc" -> "#aabbcc"; anything else -> null. */
export function normalizeHex(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
	if (!m) return null;
	const h = m[1].toLowerCase();
	return "#" + (h.length === 3 ? h.replace(/./g, (c) => c + c) : h);
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/**
 * Clamps the perceptual lightness (OKLab L) of an sRGB color, keeping hue and chroma.
 * `rgb` are screen values (sRGB, 0–1) and are modified in place.
 */
export function clampLightness(rgb: [number, number, number], min: number, max: number): void {
	const [r, g, b] = rgb.map(toLinear);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	if (L >= min && L <= max) return;
	const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	const L2 = Math.min(max, Math.max(min, L));
	const l2 = (L2 + 0.3963377774 * A + 0.2158037573 * B) ** 3;
	const m2 = (L2 - 0.1055613458 * A - 0.0638541728 * B) ** 3;
	const s2 = (L2 - 0.0894841775 * A - 1.291485548 * B) ** 3;
	const out = [
		4.0767416621 * l2 - 3.3077115913 * m2 + 0.2309699292 * s2,
		-1.2684380046 * l2 + 2.6097574011 * m2 - 0.3413193965 * s2,
		-0.0041960863 * l2 - 0.7034186147 * m2 + 1.707614701 * s2,
	];
	for (let k = 0; k < 3; k++) rgb[k] = Math.min(1, Math.max(0, toGamma(Math.max(0, out[k]))));
}

// ---------- Regions ----------

export interface Region {
	/** Region index in the graph; -1 = orphans. */
	group: number;
	/** Folder (grouped by folder) or most connected note (grouped by links). */
	name: string;
	/** Members, from most connected to least connected. */
	members: number[];
	/** Notes that identify the region across rebuilds (grouped by links). */
	anchors: string[];
	/** Top-level folder (grouped by folder; "" = notes root). */
	folder?: string;
}

const ANCHORS = 5;

/** Top-level folder of a path ("" = root), the same one used for folder grouping. */
export function topFolder(path: string): string {
	const slash = path.indexOf("/");
	return slash === -1 ? "" : path.slice(0, slash);
}

/** Regions ordered by size, with orphans last. */
export function regionsOf(graph: GraphCore, groupBy: GroupBy): Region[] {
	const members: number[][] = Array.from({ length: graph.groupCount }, () => []);
	const orphans: number[] = [];
	graph.group.forEach((g, i) => (g < 0 ? orphans : members[g]).push(i));
	// Most connected first; ties broken by path, so anchors do not depend on file order.
	const byDegree = (a: number, b: number) =>
		graph.degree[b] - graph.degree[a] || (graph.ids[a] < graph.ids[b] ? -1 : 1);
	const regions: Region[] = members.map((list, group) => {
		list.sort(byDegree);
		const hub = list[0];
		if (groupBy === "folder") {
			const folder = topFolder(graph.paths[hub]);
			return { group, name: folder || "(root)", members: list, anchors: [], folder };
		}
		return { group, name: graph.names[hub], members: list, anchors: list.slice(0, ANCHORS).map((i) => graph.ids[i]) };
	});
	if (orphans.length) regions.push({ group: -1, name: "Orphans", members: orphans.sort(byDegree), anchors: [] });
	return regions;
}

/** Color chosen in the legend for a region. */
export interface RegionColor {
	color: string;
	/** Grouped by folder: the top-level folder. */
	folder?: string;
	/** Grouped by links: the region's most connected notes when it was painted. */
	anchors?: string[];
	/** The orphan notes (any grouping). */
	orphans?: boolean;
}

/**
 * Which region each saved color falls into now: by folder, by orphans, or by the region containing most
 * of the still-existing anchors. Colors competing for the same region: the last one in the list wins.
 * @returns the color of each region and, for each saved color, the region found (null = not found).
 */
export function matchRegionColors(
	graph: GraphCore,
	regions: Region[],
	saved: RegionColor[],
	groupBy: GroupBy,
): { byGroup: Map<number, string>; found: (number | null)[] } {
	const index = new Map(graph.ids.map((id, i) => [id, i]));
	const byFolder = new Map(regions.filter((r) => r.folder !== undefined).map((r) => [r.folder!, r.group]));
	const hasOrphans = regions.some((r) => r.group < 0);
	const byGroup = new Map<number, string>();
	const found = saved.map((rc): number | null => {
		const color = normalizeHex(rc.color);
		if (!color) return null;
		let group: number | null = null;
		if (rc.orphans) group = hasOrphans ? -1 : null;
		else if (groupBy === "folder" && rc.folder !== undefined) group = byFolder.get(rc.folder) ?? null;
		else if (groupBy === "links" && rc.anchors?.length) {
			const votes = new Map<number, number>();
			for (const id of rc.anchors) {
				const i = index.get(id);
				const g = i === undefined ? -1 : graph.group[i];
				if (g >= 0) votes.set(g, (votes.get(g) ?? 0) + 1);
			}
			let best = 0;
			for (const [g, v] of votes) if (v > best || (v === best && group !== null && g < group)) [best, group] = [v, g];
		}
		if (group !== null) byGroup.set(group, color);
		return group;
	});
	return { byGroup, found };
}

/** The saved color that identifies the region now (written when painting it in the legend). */
export function regionKey(region: Region, color: string): RegionColor {
	if (region.group < 0) return { color, orphans: true };
	if (region.folder !== undefined) return { color, folder: region.folder };
	return { color, anchors: region.anchors };
}
