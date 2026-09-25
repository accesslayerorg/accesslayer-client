import { describe, expect, it } from 'vitest';
import {
	lineClampClassFor,
	creatorCardSubtitleClampClass,
	DEFAULT_CREATOR_CARD_SUBTITLE_MAX_LINES,
} from '../lineClamp.utils';

describe('lineClamp.utils', () => {
	describe('DEFAULT_CREATOR_CARD_SUBTITLE_MAX_LINES', () => {
		it('defaults to 2 lines for creator card subtitles', () => {
			expect(DEFAULT_CREATOR_CARD_SUBTITLE_MAX_LINES).toBe(2);
		});
	});

	describe('creatorCardSubtitleClampClass', () => {
		it('returns line-clamp-2 by default when no parameter is passed', () => {
			expect(creatorCardSubtitleClampClass()).toBe('line-clamp-2');
		});

		it('returns correct line-clamp class for specified line counts', () => {
			expect(creatorCardSubtitleClampClass(1)).toBe('line-clamp-1');
			expect(creatorCardSubtitleClampClass(2)).toBe('line-clamp-2');
			expect(creatorCardSubtitleClampClass(3)).toBe('line-clamp-3');
			expect(creatorCardSubtitleClampClass(4)).toBe('line-clamp-4');
			expect(creatorCardSubtitleClampClass(5)).toBe('line-clamp-5');
			expect(creatorCardSubtitleClampClass(6)).toBe('line-clamp-6');
		});

		it('caps higher values at line-clamp-6 to keep card heights bounded', () => {
			expect(creatorCardSubtitleClampClass(7)).toBe('line-clamp-6');
			expect(creatorCardSubtitleClampClass(100)).toBe('line-clamp-6');
		});

		it('returns empty string for null, undefined, 0, or negative values', () => {
			expect(creatorCardSubtitleClampClass(null)).toBe('');
			expect(creatorCardSubtitleClampClass(0)).toBe('');
			expect(creatorCardSubtitleClampClass(-1)).toBe('');
		});
	});

	describe('lineClampClassFor', () => {
		it('returns empty string for profile variant', () => {
			expect(lineClampClassFor('profile', 3)).toBe('');
			expect(lineClampClassFor('profile', null)).toBe('');
			expect(lineClampClassFor('profile', undefined)).toBe('');
		});

		it('returns empty string for invalid maxLines', () => {
			expect(lineClampClassFor('card', null)).toBe('');
			expect(lineClampClassFor('card', undefined)).toBe('');
			expect(lineClampClassFor('card', 0)).toBe('');
			expect(lineClampClassFor('card', -5)).toBe('');
		});

		it('returns correct line-clamp classes for card variant', () => {
			expect(lineClampClassFor('card', 1)).toBe('line-clamp-1');
			expect(lineClampClassFor('card', 2)).toBe('line-clamp-2');
			expect(lineClampClassFor('card', 3)).toBe('line-clamp-3');
		});
	});
});
