/**
 * Accent color customization and contrast-safe palette generation (#1488).
 *
 * Implements WCAG 2.1 AA relative luminance and contrast ratio calculations,
 * validates user/creator input colors, suggests the nearest compliant color
 * when input cannot produce a 4.5:1 compliant palette, and generates theme-safe
 * palettes for both light and dark themes.
 */

export interface AccentThemeShades {
	/** Base accent color hex code */
	accent: string;
	/** Foreground text color guaranteed to meet >= 4.5:1 contrast against accent */
	foreground: string;
	/** High-contrast text/link color guaranteed to meet >= 4.5:1 against the theme background */
	text: string;
	/** Hover state shade */
	hover: string;
	/** Active / pressed state shade */
	active: string;
	/** Subtle background tint */
	muted: string;
	/** Text for subtle / muted background */
	mutedForeground: string;
	/** Border shade */
	border: string;
	/** Contrast ratio of foreground on accent */
	contrastRatio: number;
	/** Contrast ratio of text on theme background */
	textContrastRatio: number;
}

export interface AccentPalette {
	/** Normalized input hex */
	input: string;
	/** Shades for light theme */
	light: AccentThemeShades;
	/** Shades for dark theme */
	dark: AccentThemeShades;
}

export interface AccentValidationResult {
	isValid: boolean;
	error?: string;
	suggestion?: string;
}

export interface AccentPreset {
	id: string;
	name: string;
	hex: string;
}

export const ACCENT_STORAGE_KEY = 'al:accent';
export const CREATOR_ACCENT_PREFIX = 'al:creator-accent:';
export const DEFAULT_ACCENT = '#4f46e5'; // Indigo

export const PRESET_ACCENTS: AccentPreset[] = [
	{ id: 'indigo', name: 'Indigo', hex: '#4f46e5' },
	{ id: 'emerald', name: 'Emerald', hex: '#059669' },
	{ id: 'amber', name: 'Amber', hex: '#d97706' },
	{ id: 'rose', name: 'Rose', hex: '#dc2626' },
	{ id: 'cyan', name: 'Cyan', hex: '#0891b2' },
	{ id: 'violet', name: 'Violet', hex: '#7c3aed' },
	{ id: 'sky', name: 'Sky', hex: '#0284c7' },
	{ id: 'orange', name: 'Orange', hex: '#ea580c' },
];

export const LIGHT_BACKGROUND = '#ffffff';
export const DARK_BACKGROUND = '#090d16';
const MIN_CONTRAST_RATIO = 4.5; // WCAG 2.1 AA

/**
 * Normalizes hex strings (e.g. '#abc' -> '#aabbcc', '6366f1' -> '#6366f1').
 */
export function normalizeHex(hex: string): string | null {
	if (!hex || typeof hex !== 'string') return null;
	const clean = hex.trim().replace(/^#/, '');
	if (/^[0-9a-fA-F]{3}$/.test(clean)) {
		return '#' + clean.split('').map(c => c + c).join('').toLowerCase();
	}
	if (/^[0-9a-fA-F]{6}$/.test(clean)) {
		return '#' + clean.toLowerCase();
	}
	return null;
}

/**
 * Converts a hex code to RGB [0-255].
 */
export function hexToRgb(hex: string): [number, number, number] | null {
	const normalized = normalizeHex(hex);
	if (!normalized) return null;
	const num = parseInt(normalized.slice(1), 16);
	const r = (num >> 16) & 255;
	const g = (num >> 8) & 255;
	const b = num & 255;
	return [r, g, b];
}

/**
 * Converts RGB [0-255] to hex string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
	const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
	const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculates WCAG relative luminance from an sRGB hex code.
 * Follows WCAG 2.1 specification: https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getRelativeLuminance(hex: string): number {
	const rgb = hexToRgb(hex);
	if (!rgb) return 0;
	const [rs, gs, bs] = rgb.map(c => {
		const s = c / 255;
		return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates contrast ratio between two hex colors (WCAG 2.1).
 * Returns a value between 1 and 21.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
	const lum1 = getRelativeLuminance(hex1);
	const lum2 = getRelativeLuminance(hex2);
	const brightest = Math.max(lum1, lum2);
	const darkest = Math.min(lum1, lum2);
	return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

/**
 * Converts RGB to HSL.
 * r, g, b in [0, 255]
 * Returns [h (0-360), s (0-1), l (0-1)]
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
	const rNorm = r / 255;
	const gNorm = g / 255;
	const bNorm = b / 255;
	const max = Math.max(rNorm, gNorm, bNorm);
	const min = Math.min(rNorm, gNorm, bNorm);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case rNorm:
				h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
				break;
			case gNorm:
				h = (bNorm - rNorm) / d + 2;
				break;
			case bNorm:
				h = (rNorm - gNorm) / d + 4;
				break;
		}
		h /= 6;
	}

	return [Math.round(h * 360), Number(s.toFixed(3)), Number(l.toFixed(3))];
}

/**
 * Converts HSL to RGB.
 * h in [0, 360], s in [0, 1], l in [0, 1]
 * Returns [r, g, b] in [0, 255]
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
	const hNorm = (h % 360) / 360;
	if (s === 0) {
		const val = Math.round(l * 255);
		return [val, val, val];
	}

	const hue2rgb = (p: number, q: number, t: number) => {
		let tNorm = t;
		if (tNorm < 0) tNorm += 1;
		if (tNorm > 1) tNorm -= 1;
		if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
		if (tNorm < 1 / 2) return q;
		if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
		return p;
	};

	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	const r = Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255);
	const g = Math.round(hue2rgb(p, q, hNorm) * 255);
	const b = Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255);

	return [r, g, b];
}

/**
 * Finds the nearest contrast-safe color for a given color.
 * Preserves hue and adjusts lightness/saturation until it produces a compliant palette.
 */
export function suggestNearestCompliantColor(rawColor: string): string {
	const normalized = normalizeHex(rawColor);
	if (!normalized) return DEFAULT_ACCENT;

	const rgb = hexToRgb(normalized);
	if (!rgb) return DEFAULT_ACCENT;

	const [h, s] = rgbToHsl(rgb[0], rgb[1], rgb[2]);

	// If no saturation (pure gray/white/black), default to Indigo
	if (s < 0.1) {
		return DEFAULT_ACCENT;
	}

	// Target lightness around 0.45 - 0.55 which safely balances light & dark themes
	const candidateLightnesses = [0.50, 0.45, 0.55, 0.40, 0.60, 0.35, 0.65];
	const candidateSaturations = [Math.max(0.6, s), 0.75, 0.85];

	for (const candL of candidateLightnesses) {
		for (const candS of candidateSaturations) {
			const candidateRgb = hslToRgb(h, candS, candL);
			const candidateHex = rgbToHex(candidateRgb[0], candidateRgb[1], candidateRgb[2]);
			const validation = validateAccentColor(candidateHex, false);
			if (validation.isValid) {
				return candidateHex;
			}
		}
	}

	return DEFAULT_ACCENT;
}

/**
 * Validates whether an accent color can produce a compliant palette meeting WCAG 2.1 AA (4.5:1).
 * If non-compliant, rejects the color and suggests the nearest valid color.
 */
export function validateAccentColor(
	accentHex: string,
	includeSuggestion = true
): AccentValidationResult {
	const normalized = normalizeHex(accentHex);
	if (!normalized) {
		return {
			isValid: false,
			error: 'Invalid hex color code. Expected 3 or 6 hex digits (e.g. #6366f1).',
			suggestion: includeSuggestion ? DEFAULT_ACCENT : undefined,
		};
	}

	const lum = getRelativeLuminance(normalized);

	// Extremes: pure white/near white (lum > 0.82) has insufficient contrast on light mode
	if (lum > 0.82) {
		return {
			isValid: false,
			error: 'Color is too light. It cannot achieve WCAG 4.5:1 contrast against light backgrounds.',
			suggestion: includeSuggestion ? suggestNearestCompliantColor(normalized) : undefined,
		};
	}

	// Extremes: pure black/near black (lum < 0.04) has insufficient contrast on dark mode
	if (lum < 0.04) {
		return {
			isValid: false,
			error: 'Color is too dark. It cannot achieve WCAG 4.5:1 contrast against dark backgrounds.',
			suggestion: includeSuggestion ? suggestNearestCompliantColor(normalized) : undefined,
		};
	}

	const rgb = hexToRgb(normalized);
	if (rgb) {
		const [, s] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
		if (s < 0.08) {
			return {
				isValid: false,
				error: 'Grayscale shades cannot be used as brand accent colors.',
				suggestion: includeSuggestion ? DEFAULT_ACCENT : undefined,
			};
		}
	}

	// Check if palette can be generated meeting >= 4.5:1
	try {
		const palette = generatePalette(normalized);
		const lightSafe = palette.light.contrastRatio >= MIN_CONTRAST_RATIO &&
			palette.light.textContrastRatio >= MIN_CONTRAST_RATIO;
		const darkSafe = palette.dark.contrastRatio >= MIN_CONTRAST_RATIO &&
			palette.dark.textContrastRatio >= MIN_CONTRAST_RATIO;

		if (!lightSafe || !darkSafe) {
			return {
				isValid: false,
				error: 'Accent cannot produce a palette meeting WCAG 4.5:1 contrast in both light and dark themes.',
				suggestion: includeSuggestion ? suggestNearestCompliantColor(normalized) : undefined,
			};
		}
	} catch {
		return {
			isValid: false,
			error: 'Failed to generate contrast-safe palette for this color.',
			suggestion: includeSuggestion ? DEFAULT_ACCENT : undefined,
		};
	}

	return { isValid: true };
}

/**
 * Finds high-contrast foreground text color (#ffffff or dark) meeting >= 4.5:1 against the given background.
 */
export function getContrastForeground(bgHex: string): { foreground: string; ratio: number } {
	const whiteRatio = getContrastRatio(bgHex, '#ffffff');
	const darkRatio = getContrastRatio(bgHex, '#000000');

	if (whiteRatio >= darkRatio) {
		return { foreground: '#ffffff', ratio: whiteRatio };
	}
	return { foreground: '#050505', ratio: darkRatio };
}

/**
 * Generates a theme-safe text/link shade that achieves >= 4.5:1 against the given theme background.
 */
function generateContrastText(
	accentHex: string,
	themeBg: string,
	mode: 'light' | 'dark'
): { text: string; ratio: number } {
	let ratio = getContrastRatio(accentHex, themeBg);
	if (ratio >= MIN_CONTRAST_RATIO) {
		return { text: accentHex, ratio };
	}

	const rgb = hexToRgb(accentHex);
	if (!rgb) return { text: mode === 'light' ? '#1e1b4b' : '#a5b4fc', ratio: 5 };

	const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
	let adjustedL = l;

	// In light mode, darken to increase contrast against white
	// In dark mode, brighten to increase contrast against dark
	for (let step = 0; step < 30; step++) {
		if (mode === 'light') {
			adjustedL = Math.max(0.12, adjustedL - 0.025);
		} else {
			adjustedL = Math.min(0.92, adjustedL + 0.025);
		}
		const newRgb = hslToRgb(h, s, adjustedL);
		const newHex = rgbToHex(newRgb[0], newRgb[1], newRgb[2]);
		ratio = getContrastRatio(newHex, themeBg);
		if (ratio >= MIN_CONTRAST_RATIO) {
			return { text: newHex, ratio };
		}
	}

	// Fallback safe colors
	const fallbackHex = mode === 'light' ? '#1e1b4b' : '#e0e7ff';
	return { text: fallbackHex, ratio: getContrastRatio(fallbackHex, themeBg) };
}

/**
 * Generates complete AccentPalette containing light and dark theme shades,
 * all verified to meet WCAG AA 4.5:1 contrast requirements.
 */
export function generatePalette(accentHex: string): AccentPalette {
	const normalized = normalizeHex(accentHex) ?? DEFAULT_ACCENT;
	const rgb = hexToRgb(normalized) ?? [79, 70, 229];
	const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);

	// Foreground text on accent button
	const { foreground } = getContrastForeground(normalized);
	let buttonContrast = getContrastRatio(normalized, foreground);
	let adjustedAccent = normalized;

	if (buttonContrast < MIN_CONTRAST_RATIO) {
		// Adjust luminance slightly so button text meets >= 4.5:1
		const targetL = foreground === '#ffffff' ? Math.max(0.12, l - 0.06) : Math.min(0.85, l + 0.06);
		const adjRgb = hslToRgb(h, s, targetL);
		adjustedAccent = rgbToHex(adjRgb[0], adjRgb[1], adjRgb[2]);
		buttonContrast = getContrastRatio(adjustedAccent, foreground);
	}

	// Light Theme Shades
	const lightText = generateContrastText(adjustedAccent, LIGHT_BACKGROUND, 'light');
	const lightHoverRgb = hslToRgb(h, s, Math.max(0.15, l - 0.07));
	const lightActiveRgb = hslToRgb(h, s, Math.max(0.10, l - 0.12));
	const lightMutedRgb = hslToRgb(h, Math.min(0.7, s), 0.94);
	const lightBorderRgb = hslToRgb(h, Math.min(0.6, s), 0.82);

	const lightShades: AccentThemeShades = {
		accent: adjustedAccent,
		foreground,
		text: lightText.text,
		hover: rgbToHex(lightHoverRgb[0], lightHoverRgb[1], lightHoverRgb[2]),
		active: rgbToHex(lightActiveRgb[0], lightActiveRgb[1], lightActiveRgb[2]),
		muted: rgbToHex(lightMutedRgb[0], lightMutedRgb[1], lightMutedRgb[2]),
		mutedForeground: lightText.text,
		border: rgbToHex(lightBorderRgb[0], lightBorderRgb[1], lightBorderRgb[2]),
		contrastRatio: buttonContrast,
		textContrastRatio: lightText.ratio,
	};

	// Dark Theme Shades
	const darkText = generateContrastText(adjustedAccent, DARK_BACKGROUND, 'dark');
	const darkHoverRgb = hslToRgb(h, s, Math.min(0.85, l + 0.07));
	const darkActiveRgb = hslToRgb(h, s, Math.min(0.90, l + 0.12));
	const darkMutedRgb = hslToRgb(h, Math.min(0.5, s), 0.18);
	const darkBorderRgb = hslToRgb(h, Math.min(0.5, s), 0.32);

	const darkShades: AccentThemeShades = {
		accent: adjustedAccent,
		foreground,
		text: darkText.text,
		hover: rgbToHex(darkHoverRgb[0], darkHoverRgb[1], darkHoverRgb[2]),
		active: rgbToHex(darkActiveRgb[0], darkActiveRgb[1], darkActiveRgb[2]),
		muted: rgbToHex(darkMutedRgb[0], darkMutedRgb[1], darkMutedRgb[2]),
		mutedForeground: darkText.text,
		border: rgbToHex(darkBorderRgb[0], darkBorderRgb[1], darkBorderRgb[2]),
		contrastRatio: buttonContrast,
		textContrastRatio: darkText.ratio,
	};

	return {
		input: normalized,
		light: lightShades,
		dark: darkShades,
	};
}

/**
 * Applies the generated palette to document.documentElement CSS variables immediately.
 */
export function applyAccentToDocument(
	palette: AccentPalette,
	resolvedTheme: 'light' | 'dark'
): void {
	if (typeof document === 'undefined') return;
	const shades = resolvedTheme === 'dark' ? palette.dark : palette.light;
	const root = document.documentElement;

	root.style.setProperty('--accent', shades.accent);
	root.style.setProperty('--accent-foreground', shades.foreground);
	root.style.setProperty('--accent-hover', shades.hover);
	root.style.setProperty('--accent-active', shades.active);
	root.style.setProperty('--accent-muted', shades.muted);
	root.style.setProperty('--accent-muted-foreground', shades.mutedForeground);
	root.style.setProperty('--accent-border', shades.border);
	root.style.setProperty('--accent-text', shades.text);
	root.style.setProperty('--color-accent', shades.accent);
	root.style.setProperty('--color-accent-foreground', shades.foreground);
}

/**
 * Reads stored accent choice from localStorage, with fallback to default.
 */
export function readStoredAccent(): string {
	if (typeof window === 'undefined') return DEFAULT_ACCENT;
	try {
		const stored = window.localStorage.getItem(ACCENT_STORAGE_KEY);
		if (stored && normalizeHex(stored)) {
			return normalizeHex(stored)!;
		}
	} catch {
		// localStorage can be unavailable
	}
	return DEFAULT_ACCENT;
}

/**
 * Persists accent choice to localStorage.
 */
export function persistAccent(hex: string): void {
	if (typeof window === 'undefined') return;
	try {
		const normalized = normalizeHex(hex);
		if (normalized) {
			window.localStorage.setItem(ACCENT_STORAGE_KEY, normalized);
		}
	} catch {
		// Persistence is best-effort
	}
}

/**
 * Reads stored creator accent choice from localStorage for a specific creator key ID.
 */
export function readStoredCreatorAccent(creatorId: string): string | null {
	if (typeof window === 'undefined' || !creatorId) return null;
	try {
		const stored = window.localStorage.getItem(CREATOR_ACCENT_PREFIX + creatorId);
		if (stored && normalizeHex(stored)) {
			return normalizeHex(stored);
		}
	} catch {
		// localStorage can be unavailable
	}
	return null;
}

/**
 * Persists creator accent choice to localStorage for a specific creator key ID.
 */
export function persistCreatorAccent(creatorId: string, hex: string | null): void {
	if (typeof window === 'undefined' || !creatorId) return null as unknown as void;
	try {
		if (hex) {
			const normalized = normalizeHex(hex);
			if (normalized) {
				window.localStorage.setItem(CREATOR_ACCENT_PREFIX + creatorId, normalized);
				return;
			}
		}
		window.localStorage.removeItem(CREATOR_ACCENT_PREFIX + creatorId);
	} catch {
		// Persistence is best-effort
	}
}

/**
 * Creates CSS properties object for scoped creator accent application.
 */
export function createCreatorAccentStyle(
	palette: AccentPalette,
	resolvedTheme: 'light' | 'dark'
): Record<string, string> {
	const shades = resolvedTheme === 'dark' ? palette.dark : palette.light;
	return {
		'--accent': shades.accent,
		'--accent-foreground': shades.foreground,
		'--accent-hover': shades.hover,
		'--accent-active': shades.active,
		'--accent-muted': shades.muted,
		'--accent-muted-foreground': shades.mutedForeground,
		'--accent-border': shades.border,
		'--accent-text': shades.text,
		'--color-accent': shades.accent,
		'--color-accent-foreground': shades.foreground,
	};
}
