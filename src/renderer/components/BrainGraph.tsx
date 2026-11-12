import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Folder, Note } from "../types/models";
import { buildGraphCore, type GraphCore, type GroupBy, type GraphNode, type LinkMap } from "../brain/graph-core";
import { BrainRenderer, type RenderOptions, type ViewPreset } from "../brain/renderer";
import { LAYOUT_VERSION, type LayoutAnchors } from "../brain/layout";
import {
  PALETTE_NAMES,
  matchRegionColors,
  regionKey,
  regionsOf,
  type PaletteId,
  type Region,
  type RegionColor,
} from "../brain/colors";
import { resolveTheme } from "../brain/theme";
import { getCachedContent, setCachedContent } from "../utils/contentCache";
import "./BrainGraph.css";

interface BrainGraphProps {
  notes: Note[];
  folders: Folder[];
  activeNoteId?: number | null;
  onOpenNote: (noteId: number) => void;
  /** Tag highlighted in the graph (null = no tag filter). */
  activeTag: string | null;
  onActiveTagChange: (tag: string | null) => void;
}

interface BrainSettings extends RenderOptions {
  groupBy: GroupBy;
  folderDepth: number;
  showOrphans: boolean;
  palette: PaletteId;
  regionColors: RegionColor[];
}

const SETTINGS_KEY = "nts_brain_settings_v1";
const LAYOUT_KEY = "nts_brain_layout_v1";
const LEGEND_MAX = 40;

const DEFAULT_SETTINGS: BrainSettings = {
  mode: "3d",
  showCortex: true,
  nodeSize: 1,
  hubLabels: true,
  glow: true,
  hoverPulses: true,
  ambientPulses: true,
  ambientCount: 45,
  idleAnimation: true,
  surface: false,
  dof: true,
  idleOrbit: true,
  groupBy: "links",
  folderDepth: 1,
  showOrphans: true,
  palette: "nebula",
  regionColors: [],
};

function loadSettings(): BrainSettings {
  const settings = { ...DEFAULT_SETTINGS, regionColors: [] as RegionColor[] };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) Object.assign(settings, JSON.parse(raw));
  } catch {
    /* use defaults */
  }
  return settings;
}

function renderOptionsOf(settings: BrainSettings): RenderOptions {
  return {
    mode: settings.mode,
    showCortex: settings.showCortex,
    nodeSize: settings.nodeSize,
    hubLabels: settings.hubLabels,
    glow: settings.glow,
    hoverPulses: settings.hoverPulses,
    ambientPulses: settings.ambientPulses,
    ambientCount: settings.ambientCount,
    idleAnimation: settings.idleAnimation,
    surface: settings.surface,
    dof: settings.dof,
    idleOrbit: settings.idleOrbit,
  };
}

/** Folder path of each folder ("Notebooks/Ideas"), used to group regions by folder. */
function buildFolderPaths(folders: Folder[]): Map<number, string> {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const memo = new Map<number, string>();
  const resolve = (id: number, seen: Set<number>): string => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    const folder = byId.get(id);
    if (!folder || seen.has(id)) return "";
    seen.add(id);
    const parent = folder.parentId != null ? resolve(folder.parentId, seen) : "";
    const path = parent ? `${parent}/${folder.name}` : folder.name;
    memo.set(id, path);
    return path;
  };
  folders.forEach((folder) => resolve(folder.id, new Set()));
  return memo;
}

/**
 * Links between notes: `@"Note name"`, `@note-name` (the editor convention) and `[[Note name]]`.
 */
const LINK_PATTERN = /\[\[([^\]|#\n]+)(?:[|#][^\]\n]*)?\]\]|@"([^"\n]+)"|@([^\s@]+)/g;

function extractLinkTargets(content: string): string[] {
  const targets: string[] = [];
  LINK_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LINK_PATTERN.exec(content)) !== null) {
    const raw = (match[1] || match[2] || match[3] || "").trim().replace(/[.,;:!?)\]}"']+$/, "");
    if (raw) targets.push(raw);
  }
  return targets;
}

type Point = [number, number, number];

const pointOf = (position: ArrayLike<number> | undefined): Point | undefined =>
  position ? [position[0], position[1], position[2]] : undefined;

const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Incremental depth change: unchanged folder groups stay fixed. A group that splits keeps its
 * old hub as the parent center, while each new child gets a home near its most connected node.
 * Groups that merge get homes around the surviving parent center.
 */
function buildLayoutAnchors(
  oldGraph: GraphCore,
  oldRegions: Region[],
  oldPositions: Map<string, number[]>,
  newGraph: GraphCore,
  newRegions: Region[],
): LayoutAnchors | null {
  const oldFolderOfGroup = new Map<number, string>();
  for (const region of oldRegions) if (region.folder !== undefined) oldFolderOfGroup.set(region.group, region.folder);
  if (oldFolderOfGroup.size === 0 || !newRegions.some((region) => region.folder !== undefined)) return null;

  const oldByKey = new Map<string, Region>();
  const oldCenter = new Map<string, Point>();
  for (const region of oldRegions) {
    if (region.folder === undefined) continue;
    oldByKey.set(region.folder, region);
    const hub = region.members.map((i) => oldPositions.get(oldGraph.ids[i])).find(Boolean);
    const point = pointOf(hub);
    if (point) oldCenter.set(region.folder, point);
  }

  const oldKeyById = new Map<string, string>();
  oldGraph.ids.forEach((id, i) => {
    const key = oldFolderOfGroup.get(oldGraph.group[i]);
    if (key !== undefined) oldKeyById.set(id, key);
  });

  const childCenter = (region: Region, parent: Point): Point | undefined => {
    const candidates = region.members
      .map((i) => ({ point: pointOf(oldPositions.get(newGraph.ids[i])), degree: newGraph.degree[i] }))
      .filter((item): item is { point: Point; degree: number } => item.point !== undefined)
      .sort(
        (a, b) =>
          b.degree - a.degree ||
          a.point[0] - b.point[0] ||
          a.point[1] - b.point[1] ||
          a.point[2] - b.point[2],
      );
    if (candidates.length === 0) return undefined;
    if (distance(candidates[0].point, parent) >= 0.045) return candidates[0].point;
    const farthest = [...candidates].sort((a, b) => distance(b.point, parent) - distance(a.point, parent))[0];
    if (distance(farthest.point, parent) >= 0.045) return farthest.point;
    // A tiny split (or a single node) at the parent center: push it outward deterministically.
    const key = region.folder ?? "";
    let hash = 2166136261;
    for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
    const angle = ((hash >>> 0) % 360) * (Math.PI / 180);
    return [parent[0] + Math.cos(angle) * 0.09, parent[1] + Math.sin(angle) * 0.09, parent[2]];
  };

  const fixed = new Set<string>();
  const homes = new Map<string, Point>();

  for (const region of newRegions) {
    const key = region.folder;
    if (key === undefined) continue;

    for (const i of region.members) {
      const id = newGraph.ids[i];
      if (oldKeyById.get(id) === key) fixed.add(id);
    }

    let center = oldCenter.get(key);
    if (!center) {
      const slash = key.lastIndexOf("/");
      const parent = slash >= 0 ? oldCenter.get(key.slice(0, slash)) : undefined;
      if (parent) center = childCenter(region, parent);
    }
    if (!center) {
      // Going back up a level: use the largest old descendant as the merge center.
      const descendant = [...oldCenter.keys()]
        .filter((folder) => folder.startsWith(`${key}/`))
        .sort((a, b) => (oldByKey.get(b)?.members.length ?? 0) - (oldByKey.get(a)?.members.length ?? 0))[0];
      if (descendant) center = oldCenter.get(descendant);
    }
    if (!center) {
      const points = region.members
        .map((i) => pointOf(oldPositions.get(newGraph.ids[i])))
        .filter((point): point is Point => point !== undefined);
      if (points.length) {
        center = [
          points.reduce((sum, point) => sum + point[0], 0) / points.length,
          points.reduce((sum, point) => sum + point[1], 0) / points.length,
          points.reduce((sum, point) => sum + point[2], 0) / points.length,
        ];
      }
    }
    if (!center) continue;

    for (const i of region.members) {
      const id = newGraph.ids[i];
      if (fixed.has(id)) continue;
      const old = pointOf(oldPositions.get(id));
      homes.set(
        id,
        old
          ? [
              center[0] + (old[0] - center[0]) * 0.55,
              center[1] + (old[1] - center[1]) * 0.55,
              center[2] + (old[2] - center[2]) * 0.55,
            ]
          : center,
      );
    }
  }

  return { positions: oldPositions, fixed, homes };
}

export default function BrainGraph({ notes, folders, activeNoteId, onOpenNote, activeTag, onActiveTagChange }: BrainGraphProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<BrainRenderer>();
  const graphRef = useRef<GraphCore>();
  const regionsRef = useRef<Region[]>([]);
  const savedPositionsRef = useRef<Map<string, number[]> | undefined>(undefined);

  const [settings, setSettings] = useState<BrainSettings>(loadSettings);
  const [contents, setContents] = useState<Map<number, string> | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [regions, setRegions] = useState<Region[]>([]);
  const [stats, setStats] = useState({ notes: 0, folders: 0, links: 0, regions: 0 });
  const [fps, setFps] = useState(0);
  const [resting, setResting] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [query, setQuery] = useState("");

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onOpenNoteRef = useRef(onOpenNote);
  onOpenNoteRef.current = onOpenNote;
  const activeNoteIdRef = useRef(activeNoteId);
  activeNoteIdRef.current = activeNoteId;

  const textNotes = useMemo(
    () =>
      notes
        .filter((note) => !note.deleted && (note.noteType || "text") === "text")
        .sort((a, b) => (a.name || "").localeCompare(b.name || "") || a.id - b.id),
    [notes],
  );
  const noteSignature = useMemo(() => textNotes.map((note) => `${note.id}:${note.name}`).join("|"), [textNotes]);

  const tagOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of textNotes) {
      for (const tag of note.tags || []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [textNotes]);
  const activeTagRef = useRef(activeTag);
  activeTagRef.current = activeTag;

  // Nodes highlighted by the active tag: matching notes plus their folder ancestors
  // (or the Inbox node for unfiled notes), so the tag keeps its folder context.
  const tagIndices = useCallback(
    (graph: GraphCore) => {
      const tag = activeTagRef.current;
      if (!tag) return null;
      const folderById = new Map(folders.map((folder) => [folder.id, folder]));
      const selected = new Set<string>();
      for (const note of textNotes) {
        if (!(note.tags || []).includes(tag)) continue;
        selected.add(`note-${note.id}`);
        let folderId = note.folderId;
        if (folderId == null || !folderById.has(folderId)) {
          selected.add("folder-inbox");
          continue;
        }
        const seen = new Set<number>();
        while (folderId != null && !seen.has(folderId)) {
          seen.add(folderId);
          selected.add(`folder-${folderId}`);
          folderId = folderById.get(folderId)?.parentId ?? null;
        }
      }
      const indices: number[] = [];
      graph.ids.forEach((id, index) => {
        if (selected.has(id)) indices.push(index);
      });
      return indices;
    },
    [folders, textNotes],
  );

  useEffect(() => {
    if (activeTag && !tagOptions.some(([tag]) => tag === activeTag)) onActiveTagChange(null);
  }, [activeTag, tagOptions, onActiveTagChange]);

  // Restore saved positions only when they match the current layout version and grouping.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAYOUT_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as { version?: number; groupBy?: string; folderDepth?: number; positions?: Record<string, number[]> };
      if (
        data.version !== LAYOUT_VERSION ||
        data.groupBy !== settingsRef.current.groupBy ||
        (data.folderDepth ?? 1) !== settingsRef.current.folderDepth ||
        !data.positions
      )
        return;
      savedPositionsRef.current = new Map(Object.entries(data.positions));
    } catch {
      /* ignore a corrupt cache */
    }
  }, []);

  const savePositions = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const positions = renderer.positionsById();
    if (positions.size === 0) return;
    const round = (value: number) => Math.round(value * 1e4) / 1e4;
    try {
      localStorage.setItem(
        LAYOUT_KEY,
        JSON.stringify({
          version: LAYOUT_VERSION,
          groupBy: settingsRef.current.groupBy,
          folderDepth: settingsRef.current.folderDepth,
          positions: Object.fromEntries(
            [...positions].map(([id, p]) => [id, [round(p[0]), round(p[1]), round(p[2]), p[3]]]),
          ),
        }),
      );
    } catch {
      /* storage full: layout will be recalculated next time */
    }
  }, []);

  // Create the Three.js renderer once; React re-renders only touch its public API.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const initial = settingsRef.current;
    const renderer = new BrainRenderer(
      stage,
      renderOptionsOf(initial),
      {
        onNodeClick: (index) => {
          const id = graphRef.current?.ids[index];
          if (!id || !id.startsWith("note-")) return;
          const noteId = Number(id.slice("note-".length));
          if (Number.isFinite(noteId)) onOpenNoteRef.current(noteId);
        },
        onLayoutSettled: () => savePositions(),
        onStats: (value) => setFps(Math.round(value)),
        onRestChange: (value) => setResting(value),
      },
      resolveTheme(initial.palette),
    );
    rendererRef.current = renderer;
    const observer = new ResizeObserver(() => renderer.resize());
    observer.observe(stage);
    return () => {
      observer.disconnect();
      savePositions();
      renderer.dispose();
      rendererRef.current = undefined;
    };
  }, [savePositions]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* non-critical */
    }
    rendererRef.current?.setOptions(renderOptionsOf(settings));
  }, [settings]);

  useEffect(() => {
    rendererRef.current?.setTheme(resolveTheme(settings.palette));
  }, [settings.palette]);

  // Load note contents (cached first, then the API) with a small concurrency limit.
  useEffect(() => {
    let cancelled = false;
    setContents(null);
    setProgress({ done: 0, total: textNotes.length });
    const loaded = new Map<number, string>();
    let cursor = 0;
    let done = 0;

    const worker = async () => {
      while (!cancelled) {
        const index = cursor++;
        if (index >= textNotes.length) return;
        const note = textNotes[index];
        let content = getCachedContent(note.id, "text");
        if (content === null) {
          try {
            content = (await window.api.getNoteContent(note.id)) || "";
            setCachedContent(note.id, content, "text");
          } catch {
            content = "";
          }
        }
        loaded.set(note.id, content);
        done++;
        if (!cancelled) setProgress({ done, total: textNotes.length });
      }
    };

    Promise.all(Array.from({ length: Math.min(6, textNotes.length) }, worker)).then(() => {
      if (!cancelled) setContents(loaded);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteSignature]);

  const rebuildGraph = useCallback(
    (fresh: boolean) => {
      const renderer = rendererRef.current;
      if (!renderer || !contents) return;

      // Capture the previous layout before replacing the graph, so a depth change can
      // keep unchanged groups in place and only move the groups that split or merge.
      const oldGraph = graphRef.current;
      const oldRegions = regionsRef.current;
      const oldPositions = fresh && oldGraph ? renderer.positionsById() : undefined;

      const folderPaths = buildFolderPaths(folders);
      const folderIds = new Set(folders.map((folder) => folder.id));
      const folderById = new Map(folders.map((folder) => [folder.id, folder]));
      const folderLevel = (path: string) => path.split("/").filter(Boolean).length;
      // Only folders up to the selected depth get a node. Hidden deeper folders collapse
      // into the nearest visible ancestor, so changing depth adds/removes real nodes.
      const visibleFolder = (id: number | null | undefined): number | null => {
        let current = id;
        const seen = new Set<number>();
        while (current != null && !seen.has(current)) {
          const folder = folderById.get(current);
          if (!folder || seen.has(current)) return null;
          if (folderLevel(folderPaths.get(current) ?? "") <= settingsRef.current.folderDepth) return current;
          seen.add(current);
          current = folder.parentId;
        }
        return null;
      };
      const visibleFolderIds = new Set(
        folders.filter((folder) => folderLevel(folderPaths.get(folder.id) ?? "") <= settingsRef.current.folderDepth).map((folder) => folder.id),
      );
      const noteNodes: GraphNode[] = textNotes.map((note) => {
        const name = (note.name || "Untitled").trim() || "Untitled";
        const folderPath = folderPaths.get(note.folderId ?? -1) || "";
        return {
          id: `note-${note.id}`,
          name,
          folder: folderPath,
          path: folderPath ? `${folderPath}/${name}` : name,
          kind: "note",
          inbox: !folderPath,
        };
      });
      const folderNodes: GraphNode[] = folders
        .filter((folder) => visibleFolderIds.has(folder.id))
        .map((folder) => {
          const path = folderPaths.get(folder.id) || folder.name;
          return {
            id: `folder-${folder.id}`,
            // The full path keeps the parent visible when the label is drawn.
            name: path ? path.split("/").join(" / ") : folder.name || "Folder",
            folder: path,
            path,
            kind: "folder",
          };
        });
      const unfiled = textNotes.filter((note) => note.folderId == null || !folderIds.has(note.folderId));
      const inboxNode: GraphNode | null = unfiled.length
        ? { id: "folder-inbox", name: "Inbox", folder: "", path: "Inbox", kind: "folder", inbox: true }
        : null;
      const nodes = [...noteNodes, ...folderNodes, ...(inboxNode ? [inboxNode] : [])];
      const nodeIds = new Set(nodes.map((node) => node.id));

      const byName = new Map<string, string>();
      for (const node of noteNodes) {
        const key = node.name.toLowerCase();
        if (!byName.has(key)) byName.set(key, node.id);
      }

      const links: LinkMap = {};
      const connect = (a: string, b: string) => {
        if (a === b || !nodeIds.has(a) || !nodeIds.has(b)) return;
        const row = links[a] || (links[a] = {});
        row[b] = 1;
      };
      for (const node of noteNodes) {
        const noteId = Number(node.id.slice("note-".length));
        const content = contents.get(noteId);
        if (!content) continue;
        for (const targetName of extractLinkTargets(content)) {
          const targetId = byName.get(targetName.toLowerCase());
          if (!targetId) continue;
          connect(node.id, targetId);
        }
      }
      // Hierarchy: visible parent -> visible subfolder, and each note -> its nearest visible folder.
      for (const folder of folders) {
        if (!visibleFolderIds.has(folder.id) || folder.parentId == null) continue;
        const parent = visibleFolder(folder.parentId);
        if (parent != null) connect(`folder-${folder.id}`, `folder-${parent}`);
      }
      for (const note of textNotes) {
        const folder = visibleFolder(note.folderId);
        if (folder != null) connect(`note-${note.id}`, `folder-${folder}`);
      }
      if (inboxNode) {
        for (const note of unfiled) connect(inboxNode.id, `note-${note.id}`);
      }

      if (nodes.length === 0) {
        graphRef.current = undefined;
        regionsRef.current = [];
        setRegions([]);
        setStats({ notes: 0, folders: 0, links: 0, regions: 0 });
        return;
      }

      const graph = buildGraphCore(nodes, links, {
        groupBy: settingsRef.current.groupBy,
        folderDepth: settingsRef.current.folderDepth,
        includeOrphans: settingsRef.current.showOrphans,
      });
      graphRef.current = graph;

      const nextRegions = regionsOf(graph, settingsRef.current.groupBy, settingsRef.current.folderDepth);
      regionsRef.current = nextRegions;
      setRegions(nextRegions);

      const anchors =
        fresh && oldGraph && oldPositions
          ? buildLayoutAnchors(oldGraph, oldRegions, oldPositions, graph, nextRegions)
          : undefined;
      const saved = fresh ? undefined : savedPositionsRef.current;
      savedPositionsRef.current = undefined;
      const prev = fresh ? (anchors ? oldPositions : undefined) : saved ?? renderer.positionsById();

      const match = matchRegionColors(graph, nextRegions, settingsRef.current.regionColors, settingsRef.current.groupBy);
      renderer.setGraph(graph, prev, match.byGroup, anchors ?? undefined);
      renderer.setFolderLabelDepth(settingsRef.current.folderDepth);
      renderer.setTagFilter(tagIndices(graph));

      const activeId = activeNoteIdRef.current;
      renderer.setActive(activeId == null ? -1 : graph.ids.indexOf(`note-${activeId}`));
      setStats({
        notes: textNotes.length,
        folders: folderNodes.length,
        links: graph.edges.length / 2,
        regions: graph.groupCount,
      });
    },
    [contents, textNotes, folders, tagIndices],
  );

  const lastGroupKeyRef = useRef(`${settings.groupBy}:${settings.folderDepth}`);

  useEffect(() => {
    if (!contents) return;
    // Switching the grouping changes the region structure, so lay it out from scratch.
    const groupKey = `${settings.groupBy}:${settings.folderDepth}`;
    const groupingChanged = lastGroupKeyRef.current !== groupKey;
    lastGroupKeyRef.current = groupKey;
    rebuildGraph(groupingChanged);
  }, [contents, settings.groupBy, settings.folderDepth, settings.showOrphans, rebuildGraph]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    rendererRef.current?.setActive(activeNoteId == null ? -1 : graph.ids.indexOf(`note-${activeNoteId}`));
  }, [activeNoteId, contents, settings.groupBy, settings.folderDepth, settings.showOrphans]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    rendererRef.current?.setTagFilter(tagIndices(graph));
  }, [activeTag, tagIndices]);

  const update = useCallback((patch: Partial<BrainSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    const graph = graphRef.current;
    const renderer = rendererRef.current;
    if (!graph || !renderer) return;
    const term = value.trim().toLowerCase();
    if (!term) {
      renderer.setSearch([]);
      return;
    }
    const hits: number[] = [];
    graph.names.forEach((name, index) => {
      if (name.toLowerCase().includes(term)) hits.push(index);
    });
    renderer.setSearch(hits);
  }, []);

  const paintRegion = useCallback((region: Region, color: string) => {
    const graph = graphRef.current;
    const currentRegions = regionsRef.current;
    if (!graph) return;
    const found = matchRegionColors(graph, currentRegions, settingsRef.current.regionColors, settingsRef.current.groupBy).found;
    const nextColors = settingsRef.current.regionColors.filter((_, index) => found[index] !== region.group);
    nextColors.push(regionKey(region, color));
    update({ regionColors: nextColors });
    const match = matchRegionColors(graph, currentRegions, nextColors, settingsRef.current.groupBy);
    rendererRef.current?.setColorOverrides(match.byGroup);
  }, [update]);

  const resetRegion = useCallback((region: Region) => {
    const graph = graphRef.current;
    const currentRegions = regionsRef.current;
    if (!graph) return;
    const found = matchRegionColors(graph, currentRegions, settingsRef.current.regionColors, settingsRef.current.groupBy).found;
    const nextColors = settingsRef.current.regionColors.filter((_, index) => found[index] !== region.group);
    update({ regionColors: nextColors });
    const match = matchRegionColors(graph, currentRegions, nextColors, settingsRef.current.groupBy);
    rendererRef.current?.setColorOverrides(match.byGroup);
  }, [update]);

  const legendRegions = useMemo(() => {
    const linked = regions.filter((region) => region.group >= 0).slice(0, LEGEND_MAX);
    const orphans = regions.find((region) => region.group < 0);
    return orphans ? [...linked, orphans] : linked;
  }, [regions]);

  const customGroups = useMemo(() => {
    const graph = graphRef.current;
    if (!legendOpen || !graph) return new Set<number>();
    const found = matchRegionColors(graph, regions, settings.regionColors, settings.groupBy).found;
    return new Set(found.filter((group): group is number => group !== null));
  }, [legendOpen, regions, settings.regionColors, settings.groupBy, stats]);

  const isLoading = contents === null;
  const isEmpty = contents !== null && textNotes.length === 0 && folders.length === 0;
  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const presets: { key: ViewPreset; label: string }[] = [
    { key: "lateral", label: "Side" },
    { key: "superior", label: "Top" },
    { key: "frontal", label: "Front" },
  ];
  const toggleButton = (active: boolean) => `brain-graph-btn${active ? " is-active" : ""}`;

  return (
    <div className={`brain-graph-container${resting ? " is-resting" : ""}`}>
      <div className="brain-graph-stage" ref={stageRef} />

      <div className="brain-graph-toolbar">
        <button
          className="brain-graph-btn brain-graph-mode"
          onClick={() => update({ mode: settings.mode === "3d" ? "2d" : "3d" })}
          title="Toggle 2D/3D"
        >
          {settings.mode === "3d" ? "3D" : "2D"}
        </button>
        <div className="brain-graph-group">
          {presets.map((preset) => (
            <button
              key={preset.key}
              className="brain-graph-btn"
              onClick={() => rendererRef.current?.applyPreset(preset.key)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <button className={toggleButton(settings.showCortex)} onClick={() => update({ showCortex: !settings.showCortex })} title="Show cortex">
          Cortex
        </button>
        <button className={toggleButton(settings.surface)} onClick={() => update({ surface: !settings.surface })} title="Brain surface">
          Surface
        </button>
        <button className={toggleButton(settings.dof)} onClick={() => update({ dof: !settings.dof })} title="Depth of field">
          Depth
        </button>
        <button className={toggleButton(settings.glow)} onClick={() => update({ glow: !settings.glow })} title="Node glow">
          Glow
        </button>
        <button className={toggleButton(settings.ambientPulses)} onClick={() => update({ ambientPulses: !settings.ambientPulses })} title="Ambient pulses">
          Pulses
        </button>
        <button
          className={toggleButton(settings.groupBy === "folder")}
          onClick={() => update({ groupBy: settings.groupBy === "links" ? "folder" : "links" })}
          title="Group regions by links or folders"
        >
          {settings.groupBy === "links" ? "Links" : "Folders"}
        </button>
        {settings.groupBy === "folder" && (
          <select
            className="brain-graph-depth"
            aria-label="Folder depth"
            title="Folder level to group by: 1 = top-level folders, 2 = subfolders, 3–4 = deeper levels"
            value={settings.folderDepth}
            onChange={(event) => update({ folderDepth: Number(event.target.value) })}
          >
            {[
              [1, "1 · Roots"],
              [2, "2 · Subfolders"],
              [3, "3 · Deeper"],
              [4, "4 · Deepest"],
            ].map(([depth, label]) => (
              <option key={depth} value={depth}>
                {label}
              </option>
            ))}
          </select>
        )}
        {tagOptions.length > 0 && (
          <select
            className="brain-graph-tag"
            aria-label="Filter by tag"
            title="Highlight notes with this tag"
            value={activeTag && tagOptions.some(([tag]) => tag === activeTag) ? activeTag : ""}
            onChange={(event) => onActiveTagChange(event.target.value || null)}
          >
            <option value="">All tags</option>
            {tagOptions.map(([tag, count]) => (
              <option key={tag} value={tag}>
                #{tag} ({count})
              </option>
            ))}
          </select>
        )}
        <button
          className={toggleButton(settings.showOrphans)}
          onClick={() => update({ showOrphans: !settings.showOrphans })}
          title="Show notes without links"
        >
          Orphans
        </button>
        <button className={toggleButton(legendOpen)} onClick={() => setLegendOpen((open) => !open)} title="Region colors">
          Palette
        </button>
        <button className="brain-graph-btn" onClick={() => rebuildGraph(true)} title="Recalculate layout">
          Relayout
        </button>
        <input
          className="brain-graph-search"
          type="search"
          placeholder="Search notes…"
          spellCheck={false}
          value={query}
          onChange={(event) => handleSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") handleSearch("");
          }}
        />
        <div className="brain-graph-stats">
          {stats.notes} notes · {stats.folders} folders · {stats.links} links · {stats.regions} regions
        </div>
      </div>

      {legendOpen && (
        <div className="brain-graph-legend">
          <div className="brain-graph-legend-head">
            <span className="brain-graph-legend-title">Regions</span>
            <select
              className="brain-graph-legend-palette"
              aria-label="Color palette"
              value={settings.palette}
              onChange={(event) => update({ palette: event.target.value as PaletteId })}
            >
              {Object.entries(PALETTE_NAMES).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="brain-graph-legend-list" onMouseLeave={() => rendererRef.current?.setHighlight([])}>
            {legendRegions.map((region) => (
              <div
                key={region.group}
                className="brain-graph-legend-row"
                onMouseEnter={() => rendererRef.current?.setHighlight(region.members)}
              >
                <input
                  type="color"
                  className="brain-graph-legend-swatch"
                  aria-label={`Color of ${region.name}`}
                  value={rendererRef.current?.regionSwatch(region.group) || "#000000"}
                  onChange={(event) => paintRegion(region, event.target.value)}
                />
                <span className="brain-graph-legend-name" title={region.folder ?? region.name}>
                  {region.name}
                </span>
                <span className="brain-graph-legend-count">{region.members.length}</span>
                {customGroups.has(region.group) ? (
                  <button
                    className="brain-graph-legend-reset"
                    title="Back to the palette color"
                    onClick={() => resetRegion(region)}
                  >
                    ↺
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
            {regions.filter((region) => region.group >= 0).length > LEGEND_MAX && (
              <div className="brain-graph-legend-more">
                +{regions.filter((region) => region.group >= 0).length - LEGEND_MAX} smaller regions
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="brain-graph-loading">
          <div>Mapping your brain…</div>
          <div className="brain-graph-loading-bar">
            <div style={{ width: `${percent}%` }} />
          </div>
          <div className="brain-graph-loading-detail">
            {progress.done} / {progress.total} notes
          </div>
        </div>
      )}

      {isEmpty && (
        <div className="brain-graph-empty">
          <strong>No text notes to map yet</strong>
          <span>Create a few notes and link them with @note-name to grow your brain.</span>
        </div>
      )}

      {fps > 0 && !resting && <div className="brain-graph-perf">{fps} fps</div>}
    </div>
  );
}
