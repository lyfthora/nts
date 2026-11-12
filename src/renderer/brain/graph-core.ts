import { mulberry32 } from "./brain-shape";

export type GroupBy = "links" | "folder";

/** A note fed to the graph: stable id, display name and folder path (used for folder grouping). */
export interface GraphNode {
	id: string;
	name: string;
	path: string;
	/** Full folder path ("" = notes root). */
	folder: string;
	/** Folder nodes take part in the hierarchy (folder -> subfolder / note). */
	kind: "note" | "folder";
	/** Unfiled note or the virtual Inbox node: placed in the cerebellum. */
	inbox?: boolean;
}

export interface GraphCore {
	/** Stable id of each node across rebuilds. */
	ids: string[];
	names: string[];
	/** Note path including its name (ordering and labels). */
	paths: string[];
	/** Full folder path ("" = notes root), used for folder grouping. */
	folders: string[];
	/** 0 = note, 1 = folder. */
	kinds: Uint8Array;
	/** Flattened [a, b] pairs, without duplicates, undirected. */
	edges: Uint32Array;
	degree: Uint32Array;
	neighbors: number[][];
	nodeEdges: number[][];
	/** Region of each node; -1 = orphan (goes to the cerebellum). */
	group: Int32Array;
	groupCount: number;
	/** Original index in `nodes` of each kept node. */
	source: number[];
}

export type LinkMap = Record<string, Record<string, number>>;

export function buildGraphCore(
	nodes: GraphNode[],
	links: LinkMap,
	opts: { groupBy: GroupBy; includeOrphans: boolean; folderDepth?: number },
): GraphCore {
	const all = nodes.length;
	const index = new Map<string, number>();
	nodes.forEach((node, i) => index.set(node.id, i));

	const seen = new Set<number>();
	const rawEdges: number[] = [];
	const rawDegree = new Uint32Array(all);
	for (const src in links) {
		const i = index.get(src);
		if (i === undefined) continue;
		for (const dst in links[src]) {
			const j = index.get(dst);
			if (j === undefined || j === i) continue;
			const a = Math.min(i, j);
			const b = Math.max(i, j);
			const key = a * all + b;
			if (seen.has(key)) continue;
			seen.add(key);
			rawEdges.push(a, b);
			rawDegree[a]++;
			rawDegree[b]++;
		}
	}

	const remap = new Int32Array(all).fill(-1);
	const source: number[] = [];
	for (let i = 0; i < all; i++) {
		if (opts.includeOrphans || rawDegree[i] > 0) {
			remap[i] = source.length;
			source.push(i);
		}
	}
	const n = source.length;
	const edges = new Uint32Array(rawEdges.length);
	for (let k = 0; k < rawEdges.length; k++) edges[k] = remap[rawEdges[k]];

	const degree = new Uint32Array(n);
	const neighbors: number[][] = Array.from({ length: n }, () => []);
	const nodeEdges: number[][] = Array.from({ length: n }, () => []);
	for (let e = 0; e < edges.length / 2; e++) {
		const a = edges[e * 2];
		const b = edges[e * 2 + 1];
		degree[a]++;
		degree[b]++;
		neighbors[a].push(b);
		neighbors[b].push(a);
		nodeEdges[a].push(e);
		nodeEdges[b].push(e);
	}

	const ids = source.map((i) => nodes[i].id);
	const names = source.map((i) => nodes[i].name);
	const paths = source.map((i) => nodes[i].path);
	const folders = source.map((i) => nodes[i].folder);
	const kinds = Uint8Array.from(source, (i) => (nodes[i].kind === "folder" ? 1 : 0));
	const inbox = Uint8Array.from(source, (i) => (nodes[i].inbox ? 1 : 0));

	const raw =
		opts.groupBy === "folder"
			? folderLabels(folders, opts.folderDepth ?? 1)
			: mergeCommunities(labelPropagation(n, neighbors, canonicalOrder(paths)), edges, degree);

	// Compacts labels by size (largest region = 0); orphans stay at -1.
	// Folder grouping gives every note a folder even when it has no links, so
	// unlinked notes must not fall into a single "Orphans" region there.
	const folderMode = opts.groupBy === "folder";
	const sizes = new Map<number, number>();
	for (let i = 0; i < n; i++) {
		if (inbox[i] || (degree[i] === 0 && !folderMode)) continue;
		sizes.set(raw[i], (sizes.get(raw[i]) ?? 0) + 1);
	}
	const order = [...sizes.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
	const compact = new Map<number, number>();
	order.forEach(([label], k) => compact.set(label, k));
	const group = new Int32Array(n);
	for (let i = 0; i < n; i++) group[i] = inbox[i] || (degree[i] === 0 && !folderMode) ? -1 : compact.get(raw[i])!;

	return { ids, names, paths, folders, kinds, edges, degree, neighbors, nodeEdges, group, groupCount: order.length, source };
}

/**
 * Node indices in alphabetical folder/name order. File order is not guaranteed,
 * so grouping uses this order to always produce the same result.
 */
function canonicalOrder(paths: string[]): number[] {
	return Array.from(paths.keys()).sort((a, b) => (paths[a] < paths[b] ? -1 : paths[a] > paths[b] ? 1 : 0));
}

/** Folder prefix at the selected depth ("" = notes root); shorter paths stay whole. */
export function folderAtDepth(folder: string, depth: number): string {
	const parts = folder.split("/").filter(Boolean);
	return parts.slice(0, Math.max(1, depth)).join("/");
}

function folderLabels(folders: string[], depth: number): Int32Array {
	const keys = folders.map((folder) => folderAtDepth(folder, depth));
	// Label = folder position in alphabetical order: size ties do not depend on file order.
	const unique = [...new Set(keys)].sort();
	const byFolder = new Map(unique.map((f, k) => [f, k]));
	return Int32Array.from(keys, (f) => byFolder.get(f)!);
}

/**
 * Community detection by label propagation (cheap and deterministic).
 * Initial labels and visit order come from `canonical`: the result does not depend on file order.
 */
function labelPropagation(n: number, neighbors: number[][], canonical: number[]): Int32Array {
	const label = new Int32Array(n);
	canonical.forEach((node, rank) => (label[node] = rank));
	const order = [...canonical];
	const rng = mulberry32(1337);
	const counts = new Map<number, number>();
	for (let it = 0; it < 30; it++) {
		for (let i = n - 1; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1));
			[order[i], order[j]] = [order[j], order[i]];
		}
		let changed = 0;
		for (const i of order) {
			const nb = neighbors[i];
			if (nb.length === 0) continue;
			counts.clear();
			let best = label[i];
			let bestCount = 0;
			for (const j of nb) {
				const l = label[j];
				const c = (counts.get(l) ?? 0) + 1;
				counts.set(l, c);
				if (c > bestCount || (c === bestCount && l < best)) {
					bestCount = c;
					best = l;
				}
			}
			if (best !== label[i]) {
				label[i] = best;
				changed++;
			}
		}
		if (changed === 0) break;
	}
	return label;
}

/**
 * Label propagation tends to split large communities into strongly connected pieces.
 * Merges pairs of communities while modularity increases (the same idea as Louvain's second step):
 * pieces of the same community come together, genuinely separate communities stay separate.
 * Deterministic: gain ties go to the pair with the lowest labels.
 */
function mergeCommunities(label: Int32Array, edges: Uint32Array, degree: Uint32Array): Int32Array {
	const m = edges.length / 2;
	if (m === 0) return label;
	// Total degree of each community and links between community pairs (key "a,b" with a < b).
	const deg = new Map<number, number>();
	for (let i = 0; i < label.length; i++) {
		if (degree[i] > 0) deg.set(label[i], (deg.get(label[i]) ?? 0) + degree[i]);
	}
	const between = new Map<number, Map<number, number>>();
	const link = (a: number, b: number, w: number) => {
		let row = between.get(a);
		if (!row) between.set(a, (row = new Map<number, number>()));
		row.set(b, (row.get(b) ?? 0) + w);
	};
	for (let e = 0; e < m; e++) {
		const a = label[edges[e * 2]];
		const b = label[edges[e * 2 + 1]];
		if (a === b) continue;
		link(a, b, 1);
		link(b, a, 1);
	}
	const parent = new Map<number, number>();
	const twoM = 2 * m;
	for (;;) {
		// ΔQ of merging A and B = e_AB/m − 2·(d_A/2m)·(d_B/2m).
		let bestGain = 0;
		let bestA = -1;
		let bestB = -1;
		for (const [a, row] of between) {
			const da = deg.get(a)!;
			for (const [b, w] of row) {
				if (b <= a) continue;
				const gain = w / m - (2 * da * deg.get(b)!) / (twoM * twoM);
				if (gain > bestGain + 1e-12 || (Math.abs(gain - bestGain) <= 1e-12 && bestA >= 0 && (a < bestA || (a === bestA && b < bestB)))) {
					bestGain = gain;
					bestA = a;
					bestB = b;
				}
			}
		}
		if (bestA < 0) break;
		// B joins A: add degrees and links, redirect B's neighbors.
		deg.set(bestA, deg.get(bestA)! + deg.get(bestB)!);
		deg.delete(bestB);
		const rowB = between.get(bestB)!;
		between.delete(bestB);
		const rowA = between.get(bestA)!;
		rowA.delete(bestB);
		for (const [c, w] of rowB) {
			if (c === bestA) continue;
			rowA.set(c, (rowA.get(c) ?? 0) + w);
			const rowC = between.get(c)!;
			rowC.delete(bestB);
			rowC.set(bestA, (rowC.get(bestA) ?? 0) + w);
		}
		parent.set(bestB, bestA);
	}
	if (parent.size === 0) return label;
	const root = (l: number): number => {
		let r = l;
		while (parent.has(r)) r = parent.get(r)!;
		return r;
	};
	return Int32Array.from(label, root);
}
