import { describe, expect, it } from 'vitest';
import {
	CREATOR_BIO_MAX_LENGTH,
	CREATOR_NAME_MAX_LENGTH,
	diffCreatorMetadata,
	hasCreatorMetadataChange,
	validateCreatorMetadata,
	type CreatorMetadataDraft,
} from '@/utils/creatorMetadata.utils';

const base: CreatorMetadataDraft = {
	name: 'Ada',
	bio: 'Building on Stellar',
	avatarUri: 'https://example.com/a.png',
};

describe('validateCreatorMetadata (#818)', () => {
	it('accepts a name and bio at the limit', () => {
		const result = validateCreatorMetadata({
			...base,
			name: 'a'.repeat(CREATOR_NAME_MAX_LENGTH),
			bio: 'b'.repeat(CREATOR_BIO_MAX_LENGTH),
		});
		expect(result.isValid).toBe(true);
		expect(result.nameError).toBeNull();
		expect(result.bioError).toBeNull();
	});

	it('flags a name longer than 64 characters', () => {
		const result = validateCreatorMetadata({
			...base,
			name: 'a'.repeat(CREATOR_NAME_MAX_LENGTH + 1),
		});
		expect(result.isValid).toBe(false);
		expect(result.nameError).toMatch(/64/);
	});

	it('flags a bio longer than 256 characters', () => {
		const result = validateCreatorMetadata({
			...base,
			bio: 'b'.repeat(CREATOR_BIO_MAX_LENGTH + 1),
		});
		expect(result.isValid).toBe(false);
		expect(result.bioError).toMatch(/256/);
	});
});

describe('diffCreatorMetadata (#818)', () => {
	it('returns an empty object when nothing changed', () => {
		expect(diffCreatorMetadata(base, { ...base })).toEqual({});
		expect(hasCreatorMetadataChange(base, { ...base })).toBe(false);
	});

	it('returns only the fields that changed', () => {
		const change = diffCreatorMetadata(base, { ...base, bio: 'New bio' });
		expect(change).toEqual({ bio: 'New bio' });
		expect(hasCreatorMetadataChange(base, { ...base, bio: 'New bio' })).toBe(true);
	});

	it('includes every changed field', () => {
		const change = diffCreatorMetadata(base, {
			name: 'Ada L',
			bio: 'New bio',
			avatarUri: 'https://example.com/b.png',
		});
		expect(change).toEqual({
			name: 'Ada L',
			bio: 'New bio',
			avatarUri: 'https://example.com/b.png',
		});
	});

	it('treats clearing a field to an empty string as a change', () => {
		expect(diffCreatorMetadata(base, { ...base, avatarUri: '' })).toEqual({
			avatarUri: '',
		});
	});
});
