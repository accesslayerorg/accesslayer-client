import { beforeEach, describe, expect, it } from 'vitest';
import {
	MediaKitValidationError,
	defaultMediaKit,
	getPublicMediaKit,
	resetMediaKitStore,
	saveMediaKitSettings,
	slugifyHandle,
	type MediaKitInput,
} from '@/services/mediaKit.service';

function input(overrides: Partial<MediaKitInput> = {}): MediaKitInput {
	const { updatedAt: _updatedAt, ...base } = defaultMediaKit('key-1', 'Ada Lovelace');
	void _updatedAt;
	return {
		...base,
		bio: 'Building keys for analytical engines.',
		talkingPoints: ['First programmer', 'Notes on the engine'],
		contactEmail: 'press@example.com',
		...overrides,
	};
}

describe('media kit visibility (#1475)', () => {
	beforeEach(() => resetMediaKitStore());

	it('has no public page until visibility is turned on', () => {
		saveMediaKitSettings(input({ isPublic: false }));
		expect(getPublicMediaKit('ada-lovelace')).toBeNull();
		saveMediaKitSettings(input({ isPublic: true }));
		expect(getPublicMediaKit('ada-lovelace')).not.toBeNull();
	});

	it('turning visibility off removes the public page again', () => {
		saveMediaKitSettings(input({ isPublic: true }));
		saveMediaKitSettings(input({ isPublic: false }));
		expect(getPublicMediaKit('ada-lovelace')).toBeNull();
	});

	it('exposes only the fields the creator enabled', () => {
		saveMediaKitSettings(
			input({
				isPublic: true,
				visibleFields: { stats: false, bio: true, talkingPoints: false, contactEmail: false, assets: true, qrCode: false },
			})
		);
		expect(getPublicMediaKit('ada-lovelace')).toMatchObject({
			showStats: false,
			showAssets: true,
			showQrCode: false,
			bio: 'Building keys for analytical engines.',
			talkingPoints: null,
			contactEmail: null,
		});
	});

	it('hides contact email by default', () => {
		expect(defaultMediaKit('k', 'x').visibleFields.contactEmail).toBe(false);
		expect(defaultMediaKit('k', 'x').isPublic).toBe(false);
	});
});

describe('media kit validation', () => {
	beforeEach(() => resetMediaKitStore());

	it('rejects bad handles, duplicate handles and bad emails', () => {
		expect(() => saveMediaKitSettings(input({ handle: 'Has Spaces' }))).toThrow(MediaKitValidationError);
		saveMediaKitSettings(input());
		expect(() => saveMediaKitSettings(input({ keyId: 'key-2' }))).toThrow(/already used/);
		expect(() => saveMediaKitSettings(input({ contactEmail: 'nope' }))).toThrow(/valid email/);
		expect(() => saveMediaKitSettings(input({ talkingPoints: ['a', 'b', 'c', 'd', 'e', 'f'] }))).toThrow(/at most 5/);
	});

	it('trims input and drops empty talking points', () => {
		const saved = saveMediaKitSettings(input({ bio: '  hi  ', talkingPoints: [' one ', '', '  '] }));
		expect(saved.bio).toBe('hi');
		expect(saved.talkingPoints).toEqual(['one']);
	});

	it('slugifies handles', () => {
		expect(slugifyHandle('@Ada Lovelace!')).toBe('ada-lovelace');
		expect(slugifyHandle('Crème Brûlée')).toBe('creme-brulee');
	});
});
