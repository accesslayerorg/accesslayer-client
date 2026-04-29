import { describe, expect, it } from 'vitest';
import { truncateCreatorName } from '@/utils/creatorName.utils';

describe('truncateCreatorName', () => {
	it('returns the name unchanged when within the default limit', () => {
		expect(truncateCreatorName('Alex Rivers')).toBe('Alex Rivers');
	});

	it('truncates names that exceed the default 24-character limit', () => {
		const long = 'Maximilian Thunderstruck Jr';
		expect(long.length).toBeGreaterThan(24);
		const result = truncateCreatorName(long);
		expect(result.endsWith('…')).toBe(true);
		expect(result.length).toBeLessThanOrEqual(25); // 24 chars + ellipsis
	});

	it('does not truncate a name exactly at the limit', () => {
		const exact = 'A'.repeat(24);
		expect(truncateCreatorName(exact)).toBe(exact);
	});

	it('respects a custom maxLength', () => {
		const result = truncateCreatorName('Sarah Chen', 5);
		expect(result).toBe('Sarah…');
	});

	it('returns an empty string for empty input', () => {
		expect(truncateCreatorName('')).toBe('');
	});

	it('trims surrounding whitespace before truncating', () => {
		expect(truncateCreatorName('  Alex  ')).toBe('Alex');
	});

	it('does not add ellipsis for short names', () => {
		expect(truncateCreatorName('Jo')).toBe('Jo');
		expect(truncateCreatorName('Jo').includes('…')).toBe(false);
	});
});
