import { AdditiveBlending, Color, LinearSRGBColorSpace, type Blending } from "three";
import { ShellKind, type Shell, type SurfaceMesh, type Vec3 } from "./brain-shape";
import { PALETTES, accentPalette, clampLightness, type PaletteDef, type PaletteId } from "./colors";

/** All scene colors in one place: switching themes rebuilds neither layout nor geometry. */
export interface BrainTheme {
	/** Background: clear color and fog; dimmed/blurred nodes and weak links fade toward it. */
	bg: Color;
	/** Resting wave and the flicker of chain reactions. */
	flash: Color;
	/** Color that pulses are tinted toward (lighter in dark mode). */
	pulseTint: Color;
	/** Halos and pulses: they add light in dark mode; in light mode they are a translucent aura. */
	glowBlending: Blending;
	/** Edge brightness of each node (a darker ring that outlines it). */
	nodeRing: number;
	/** Multiplies the opacity of halos and pulses. */
	glowGain: number;
	/** Color that weak links fade toward (the background itself in dark mode). */
	edgeFade: Color;
	/** Multiplies the intensity of out-of-focus links (capped at full color). */
	edgeGain: number;
	edgeOpacity: number;
	/** Outline of the brain surface (added at the edges). */
	rim: Color;
	/** Region colors, ordered by size (largest region = 0). */
	palette: string[];
	/**
	 * Point shaders write color without converting linear -> sRGB. With `displayPalette`, the hex
	 * is used as is and the node shows exactly that color; without it (dark mode, original look), the hex
	 * is converted to linear and the node appears darker and more saturated than the hex.
	 */
	displayPalette: boolean;
	/** Regions beyond the palette repeat colors (single-hue or fixed-count palettes). */
	paletteCycle: boolean;
	/** Lightness of regions beyond the palette (hue from the golden angle). */
	extraLightness: number;
	orphan: Color;
	/*
	 * The vectors below go straight to shaders that do not convert color: they are screen values (sRGB).
	 * `edgeFade`, however, goes to the links (LineBasicMaterial), which do convert: it is linear.
	 */
	/** Tint of each lobe, in LOBES order (sulci and cortex surface). */
	lobeTint: Vec3[];
	/** Anatomy points (cortex outline, cerebellum, spinal cord). */
	shell: { boundary: Vec3; sulcusGain: number; cerebellum: Vec3; spine: Vec3 };
	/** Surface meshes: cortex = base + lobe tint × gain. */
	anatomy: { cortexBase: Vec3; cortexGain: number; cerebellum: Vec3; spine: Vec3 };
}

/** Default dark background when the theme does not provide one (or dark is forced on a light theme). */
export const DARK_BG = "#070a12";

/** Background plus a tone: the anatomy follows the theme background instead of imposing its own color. */
function lift(bg: Color, add: Vec3): Vec3 {
	return [bg.r + add[0], bg.g + add[1], bg.b + add[2]];
}

/**
 * Light over the theme background: surface slightly above the background, light outlines,
 * regions in luminous tones and added (additive) glows.
 */
export function darkTheme(bg: Color = new Color(DARK_BG), palette: PaletteDef = PALETTES.nebula): BrainTheme {
	return {
		bg,
		edgeFade: bg.clone(),
		edgeGain: 1,
		edgeOpacity: 0.55,
		flash: new Color(0.75, 0.92, 1.0),
		pulseTint: new Color(1, 1, 1),
		glowBlending: AdditiveBlending,
		nodeRing: 0.6,
		glowGain: 1,
		rim: new Color(0.22, 0.23, 0.26),
		displayPalette: palette.display ?? false,
		paletteCycle: palette.cycle ?? false,
		palette: palette.dark,
		extraLightness: 0.62,
		orphan: new Color("#8391b0"),
		// frontal, parietal, occipital, temporal
		lobeTint: [
			[0.34, 0.44, 0.78],
			[0.3, 0.6, 0.66],
			[0.42, 0.58, 0.46],
			[0.56, 0.44, 0.72],
		],
		shell: {
			boundary: [0.72, 0.76, 0.84],
			sulcusGain: 0.62,
			cerebellum: [0.42, 0.45, 0.58],
			spine: [0.36, 0.39, 0.5],
		},
		anatomy: {
			cortexBase: lift(bg, [0.045, 0.046, 0.05]),
			cortexGain: 0.05,
			cerebellum: lift(bg, [0.075, 0.078, 0.088]),
			spine: lift(bg, [0.065, 0.068, 0.078]),
		},
	};
}

/** Anatomy point colors. `out` allows repainting the existing attribute. */
export const APP_BG = "#1a1a1a";
export const APP_ACCENT = "#4a9eff";

/** NTS uses a single dark theme: the graph follows the app background and accent color. */
export function resolveTheme(paletteId: PaletteId = "nebula"): BrainTheme {
	const palette = paletteId === "accent" ? accentPalette(new Color(APP_ACCENT)) : (PALETTES[paletteId] ?? PALETTES.nebula);
	return darkTheme(new Color(APP_BG), palette);
}

export function shellColors(
	shell: Shell,
	theme: BrainTheme,
	out: Float32Array<ArrayBufferLike> = new Float32Array(shell.kind.length * 3),
): Float32Array<ArrayBufferLike> {
	const { boundary, sulcusGain, cerebellum, spine } = theme.shell;
	for (let i = 0; i < shell.kind.length; i++) {
		const o = i * 3;
		const kind: ShellKind = shell.kind[i];
		switch (kind) {
			case ShellKind.Boundary:
				out.set(boundary, o);
				break;
			case ShellKind.Sulcus: {
				const t = theme.lobeTint[shell.lobe[i]];
				out[o] = t[0] * sulcusGain;
				out[o + 1] = t[1] * sulcusGain;
				out[o + 2] = t[2] * sulcusGain;
				break;
			}
			case ShellKind.Cerebellum:
				out.set(cerebellum, o);
				break;
			default: {
				const f = shell.fade[i];
				out[o] = spine[0] * f;
				out[o + 1] = spine[1] * f;
				out[o + 2] = spine[2] * f;
			}
		}
	}
	return out;
}

/** Per-vertex colors of an anatomy mesh. `out` allows repainting the existing attribute. */
export function meshColors(
	mesh: SurfaceMesh,
	theme: BrainTheme,
	out: Float32Array<ArrayBufferLike> = new Float32Array(mesh.positions.length),
): Float32Array<ArrayBufferLike> {
	const a = theme.anatomy;
	const n = mesh.positions.length / 3;
	for (let i = 0; i < n; i++) {
		const o = i * 3;
		if (mesh.part === "cortex") {
			const t = theme.lobeTint[mesh.lobe![i]];
			out[o] = a.cortexBase[0] + t[0] * a.cortexGain;
			out[o + 1] = a.cortexBase[1] + t[1] * a.cortexGain;
			out[o + 2] = a.cortexBase[2] + t[2] * a.cortexGain;
		} else if (mesh.part === "cerebellum") {
			out.set(a.cerebellum, o);
		} else {
			const f = mesh.fade![i];
			out[o] = a.spine[0] * f;
			out[o + 1] = a.spine[1] * f;
			out[o + 2] = a.spine[2] * f;
		}
	}
	return out;
}

export function groupColor(theme: BrainTheme, group: number): Color {
	if (group < 0) return theme.orphan.clone();
	if (group < theme.palette.length || theme.paletteCycle) {
		const hex = theme.palette[group % theme.palette.length];
		return theme.displayPalette ? new Color().setStyle(hex, LinearSRGBColorSpace) : new Color(hex);
	}
	return new Color().setHSL(((group * 137.508) % 360) / 360, 0.7, theme.extraLightness);
}

/**
 * User-chosen color, in screen values (the hex appears as is). Lightness is clamped so the color
 * does not vanish into the background: nothing darker than 0.5.
 */
export function customColor(hex: string): Color {
	const c = new Color().setStyle(hex, LinearSRGBColorSpace);
	const rgb: [number, number, number] = [c.r, c.g, c.b];
	clampLightness(rgb, 0.5, 1);
	return c.setRGB(rgb[0], rgb[1], rgb[2], LinearSRGBColorSpace);
}
