import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Folder, Note } from "../types/models";
import { buildGraphCore, type GraphCore, type GroupBy, type GraphNode, type LinkMap } from "../brain/graph-core";
import { BrainRenderer, type RenderOptions, type ViewPreset } from "../brain/renderer";
import { LAYOUT_VERSION } from "../brain/layout";
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
}

interface BrainSettings extends RenderOptions {
  groupBy: GroupBy;
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

export default function BrainGraph({ notes, folders, activeNoteId, onOpenNote }: BrainGraphProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<BrainRenderer>();
  const graphRef = useRef<GraphCore>();
  const regionsRef = useRef<Region[]>([]);
  const savedPositionsRef = useRef<Map<string, number[]> | undefined>(undefined);

  const [settings, setSettings] = useState<BrainSettings>(loadSettings);
  const [contents, setContents] = useState<Map<number, string> | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [regions, setRegions] = useState<Region[]>([]);
  const [stats, setStats] = useState({ notes: 0, links: 0, regions: 0 });
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

  // Restore saved positions only when they match the current layout version and grouping.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAYOUT_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as { version?: number; groupBy?: string; positions?: Record<string, number[]> };
      if (data.version !== LAYOUT_VERSION || data.groupBy !== settingsRef.current.groupBy || !data.positions) return;
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
          if (!id) return;
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

      const folderPaths = buildFolderPaths(folders);
      const nodes: GraphNode[] = textNotes.map((note) => {
        const name = (note.name || "Untitled").trim() || "Untitled";
        const folderPath = folderPaths.get(note.folderId ?? -1) || "";
        return { id: `note-${note.id}`, name, path: folderPath ? `${folderPath}/${name}` : name };
      });

      const byName = new Map<string, string>();
      for (const node of nodes) {
        const key = node.name.toLowerCase();
        if (!byName.has(key)) byName.set(key, node.id);
      }

      const links: LinkMap = {};
      for (const node of nodes) {
        const noteId = Number(node.id.slice("note-".length));
        const content = contents.get(noteId);
        if (!content) continue;
        for (const targetName of extractLinkTargets(content)) {
          const targetId = byName.get(targetName.toLowerCase());
          if (!targetId || targetId === node.id) continue;
          const row = links[node.id] || (links[node.id] = {});
          row[targetId] = 1;
        }
      }

      if (nodes.length === 0) {
        graphRef.current = undefined;
        regionsRef.current = [];
        setRegions([]);
        setStats({ notes: 0, links: 0, regions: 0 });
        return;
      }

      const graph = buildGraphCore(nodes, links, {
        groupBy: settingsRef.current.groupBy,
        includeOrphans: settingsRef.current.showOrphans,
      });
      graphRef.current = graph;

      const saved = fresh ? undefined : savedPositionsRef.current;
      savedPositionsRef.current = undefined;
      const prev = fresh ? undefined : saved ?? renderer.positionsById();

      const nextRegions = regionsOf(graph, settingsRef.current.groupBy);
      regionsRef.current = nextRegions;
      setRegions(nextRegions);

      const match = matchRegionColors(graph, nextRegions, settingsRef.current.regionColors, settingsRef.current.groupBy);
      renderer.setGraph(graph, prev, match.byGroup);

      const activeId = activeNoteIdRef.current;
      renderer.setActive(activeId == null ? -1 : graph.ids.indexOf(`note-${activeId}`));
      setStats({ notes: graph.ids.length, links: graph.edges.length / 2, regions: graph.groupCount });
    },
    [contents, textNotes, folders],
  );

  const lastGroupByRef = useRef(settings.groupBy);

  useEffect(() => {
    if (!contents) return;
    // Switching the grouping changes the region structure, so lay it out from scratch.
    const groupingChanged = lastGroupByRef.current !== settings.groupBy;
    lastGroupByRef.current = settings.groupBy;
    rebuildGraph(groupingChanged);
  }, [contents, settings.groupBy, settings.showOrphans, rebuildGraph]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    rendererRef.current?.setActive(activeNoteId == null ? -1 : graph.ids.indexOf(`note-${activeNoteId}`));
  }, [activeNoteId, contents, settings.groupBy, settings.showOrphans]);

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
  const isEmpty = contents !== null && textNotes.length === 0;
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
          {stats.notes} notes · {stats.links} links · {stats.regions} regions
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
                <span className="brain-graph-legend-name" title={region.name}>
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
