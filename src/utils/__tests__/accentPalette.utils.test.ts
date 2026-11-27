import { describe, it, expect, beforeEach } from 'vitest';
import {
	normalizeHex,
	hexToRgb,
	rgbToHex,
	getRelativeLuminance,
	getContrastRatio,
	rgbToHsl,
	hslToRgb,
	suggestNearestCompliantColor,
	validateAccentColor,
	generatePalette,
	applyAccentToDocument,
	readStoredAccent,
	persistAccent,
	readStoredCreatorAccent,
	persistCreatorAccent,
	createCreatorAccentStyle,
	PRESET_ACCENTS,
	DEFAULT_ACCENT,
	ACCENT_STORAGE_KEY,
} from '../accentPalette.utils';

describe('accentPalette.utils', () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.removeAttribute('style');
	});

	describe('Hex & Color Space Conversions', () => {
		it('normalizes 3-digit and 6-digit hex values', () => {
			expect(normalizeHex('#fff')).toBe('#ffffff');
			expect(normalizeHex('fff')).toBe('#ffffff');
			expect(normalizeHex('#6366f1')).toBe('#6366f1');
			expect(normalizeHex('6366F1')).toBe('#6366f1');
			expect(normalizeHex('invalid')).toBeNull();
			expect(normalizeHex('')).toBeNull();
		});

		it('converts hex to RGB accurately', () => {
			expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
			expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
			expect(hexToRgb('#6366f1')).toEqual([99, 102, 241]);
			expect(hexToRgb('xyz')).toBeNull();
		});

		it('converts RGB to hex accurately', () => {
			expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
			expect(rgbToHex(0, 0, 0)).toBe('#000000');
			expect(rgbToHex(99, 102, 241)).toBe('#6366f1');
		});

		it('converts between RGB and HSL round-trip', () => {
			const [h, s, l] = rgbToHsl(99, 102, 241);
			expect(h).toBeGreaterThanOrEqual(230);
			expect(h).toBeLessThanOrEqual(245);
			const [r, g, b] = hslToRgb(h, s, l);
			expect(Math.abs(r - 99)).toBeLessThanOrEqual(2);
			expect(Math.abs(g - 102)).toBeLessThanOrEqual(2);
			expect(Math.abs(b - 241)).toBeLessThanOrEqual(2);
		});
	});

	describe('Luminance and Contrast Calculations (WCAG 2.1)', () => {
		it('calculates relative luminance according to WCAG spec', () => {
			expect(getRelativeLuminance('#000000')).toBe(0);
			expect(getRelativeLuminance('#ffffff')).toBe(1);
			const lumIndigo = getRelativeLuminance('#6366f1');
			expect(lumIndigo).toBeGreaterThan(0.1);
			expect(lumIndigo).toBeLessThan(0.3);
		});

		it('calculates contrast ratio between extremes', () => {
			const ratio = getContrastRatio('#ffffff', '#000000');
			expect(ratio).toBe(21);
			expect(getContrastRatio('#ffffff', '#ffffff')).toBe(1);
		});
	});

	describe('generatePalette', () => {
		it('generates palettes with >= 4.5:1 contrast for all preset accents', () => {
			for (const preset of PRESET_ACCENTS) {
				const palette = generatePalette(preset.hex);
				expect(palette.input).toBe(preset.hex);

				// Light theme
				expect(palette.light.contrastRatio).toBeGreaterThanOrEqual(4.5);
				expect(palette.light.textContrastRatio).toBeGreaterThanOrEqual(4.5);
				expect(palette.light.hover).toBeDefined();
				expect(palette.light.active).toBeDefined();
				expect(palette.light.muted).toBeDefined();

				// Dark theme
				expect(palette.dark.contrastRatio).toBeGreaterThanOrEqual(4.5);
				expect(palette.dark.textContrastRatio).toBeGreaterThanOrEqual(4.5);
				expect(palette.dark.hover).toBeDefined();
				expect(palette.dark.active).toBeDefined();
				expect(palette.dark.muted).toBeDefined();
			}
		});

		it('generates dark foreground text when accent is bright', () => {
			const palette = generatePalette('#f59e0b'); // Amber
			expect(['#050505', '#090d16', '#000000']).toContain(palette.light.foreground);
			expect(['#050505', '#090d16', '#000000']).toContain(palette.dark.foreground);
		});

		it('generates white foreground text when accent is dark', () => {
			const palette = generatePalette('#4338ca'); // Deep Indigo
			expect(palette.light.foreground).toBe('#ffffff');
			expect(palette.dark.foreground).toBe('#ffffff');
		});
	});

	describe('validateAccentColor and Suggestions', () => {
		it('accepts compliant presets', () => {
			for (const preset of PRESET_ACCENTS) {
				const result = validateAccentColor(preset.hex);
				expect(result.isValid).toBe(true);
				expect(result.error).toBeUndefined();
			}
		});

		it('rejects invalid hex formats and suggests default accent', () => {
			const result = validateAccentColor('not-a-color');
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('Invalid hex color code');
			expect(result.suggestion).toBe(DEFAULT_ACCENT);
		});

		it('rejects pure white and near-white colors with suggestion', () => {
			const result = validateAccentColor('#ffffff');
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('too light');
			expect(result.suggestion).toBeDefined();

			const suggestionValidation = validateAccentColor(result.suggestion!);
			expect(suggestionValidation.isValid).toBe(true);
		});

		it('rejects pure black and near-black colors with suggestion', () => {
			const result = validateAccentColor('#000000');
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('too dark');
			expect(result.suggestion).toBeDefined();

			const suggestionValidation = validateAccentColor(result.suggestion!);
			expect(suggestionValidation.isValid).toBe(true);
		});

		it('rejects grayscale colors and suggests compliant color', () => {
			const result = validateAccentColor('#777777');
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('Grayscale');
			expect(result.suggestion).toBeDefined();
		});

		it('suggestNearestCompliantColor preserves hue when possible', () => {
			const suggested = suggestNearestCompliantColor('#fef08a'); // very pale yellow
			expect(validateAccentColor(suggested).isValid).toBe(true);
		});
	});

	describe('Document Application & Scoping', () => {
		it('applies CSS variables to document.documentElement immediately', () => {
			const palette = generatePalette('#10b981');
			applyAccentToDocument(palette, 'light');

			expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#10b981');
			expect(document.documentElement.style.getPropertyValue('--accent-foreground')).toBeDefined();
			expect(document.documentElement.style.getPropertyValue('--accent-hover')).toBeDefined();
			expect(document.documentElement.style.getPropertyValue('--accent-text')).toBeDefined();

			applyAccentToDocument(palette, 'dark');
			expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#10b981');
		});

		it('creates scoped creator accent style', () => {
			const palette = generatePalette('#f43f5e');
			const style = createCreatorAccentStyle(palette, 'dark');
			expect(style['--accent']).toBe('#f43f5e');
			expect(style['--accent-text']).toBe(palette.dark.text);
			expect(style['--accent-foreground']).toBe(palette.dark.foreground);
		});
	});

	describe('Persistence', () => {
		it('reads and writes user accent in localStorage', () => {
			expect(readStoredAccent()).toBe(DEFAULT_ACCENT);
			persistAccent('#10b981');
			expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBe('#10b981');
			expect(readStoredAccent()).toBe('#10b981');
		});

		it('reads and writes creator accent in localStorage', () => {
			expect(readStoredCreatorAccent('creator-1')).toBeNull();
			persistCreatorAccent('creator-1', '#f59e0b');
			expect(readStoredCreatorAccent('creator-1')).toBe('#f59e0b');
			persistCreatorAccent('creator-1', null);
			expect(readStoredCreatorAccent('creator-1')).toBeNull();
		});
	});
});
