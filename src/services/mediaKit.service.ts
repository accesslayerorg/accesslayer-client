import {
	readLocalCollection,
	resetLocalCollection,
	writeLocalCollection,
} from '@/services/localCollection.service';

/**
 * Creator media kits (#1475): per-key settings for the press page at
 * `/k/:handle/press`. Stored through the shared local collection like the
 * other creator tools; the public page is resolved from the same store.
 */

const MEDIA_KIT_KEY = 'creator-media-kits';

export const MEDIA_KIT_FIELDS = [
	'stats',
	'bio',
	'talkingPoints',
	'contactEmail',
	'assets',
	'qrCode',
] as const;
export type MediaKitField = (typeof MEDIA_KIT_FIELDS)[number];

export const MAX_BIO_LENGTH = 280;
export const MAX_TALKING_POINTS = 5;
export const MAX_TALKING_POINT_LENGTH = 140;
const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface MediaKitSettings {
	keyId: string;
	/** URL handle for the public page: `/k/<handle>/press`. */
	handle: string;
	/** The public page exists only while this is true. */
	isPublic: boolean;
	bio: string;
	talkingPoints: string[];
	contactEmail: string;
	/** Fields shown on the public page. */
	visibleFields: Record<MediaKitField, boolean>;
	updatedAt: string;
}

export type MediaKitInput = Omit<MediaKitSettings, 'updatedAt'>;

export class MediaKitValidationError extends Error {
	readonly field: keyof MediaKitInput;

	constructor(field: keyof MediaKitInput, message: string) {
		super(message);
		this.name = 'MediaKitValidationError';
		this.field = field;
	}
}

/** A URL-safe handle derived from a name or social handle. */
export function slugifyHandle(value: string): string {
	return value
		.toLowerCase()
		.replace(/^@/, '')
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40)
		.replace(/-+$/g, '');
}

export function defaultMediaKit(keyId: string, handle: string): MediaKitSettings {
	return {
		keyId,
		handle: slugifyHandle(handle) || slugifyHandle(keyId) || 'creator',
		isPublic: false,
		bio: '',
		talkingPoints: [],
		contactEmail: '',
		visibleFields: {
			stats: true,
			bio: true,
			talkingPoints: true,
			contactEmail: false,
			assets: true,
			qrCode: true,
		},
		updatedAt: new Date(0).toISOString(),
	};
}

const readAll = () => readLocalCollection<MediaKitSettings>(MEDIA_KIT_KEY, () => []);

export function getMediaKitSettings(keyId: string): MediaKitSettings | null {
	return readAll().find(k => k.keyId === keyId) ?? null;
}

/** Validates and stores a media kit. Throws MediaKitValidationError. */
export function saveMediaKitSettings(
	input: MediaKitInput,
	now: Date = new Date()
): MediaKitSettings {
	const handle = input.handle.trim().toLowerCase();
	if (!HANDLE_RE.test(handle))
		throw new MediaKitValidationError(
			'handle',
			'Use 1–40 lowercase letters, numbers or dashes, starting and ending with a letter or number.'
		);
	const all = readAll();
	if (all.some(k => k.handle === handle && k.keyId !== input.keyId))
		throw new MediaKitValidationError('handle', 'That handle is already used by another key.');
	const bio = input.bio.trim();
	if (bio.length > MAX_BIO_LENGTH)
		throw new MediaKitValidationError('bio', `Keep the bio to ${MAX_BIO_LENGTH} characters.`);
	const talkingPoints = input.talkingPoints.map(p => p.trim()).filter(Boolean);
	if (talkingPoints.length > MAX_TALKING_POINTS)
		throw new MediaKitValidationError('talkingPoints', `Add at most ${MAX_TALKING_POINTS} talking points.`);
	if (talkingPoints.some(p => p.length > MAX_TALKING_POINT_LENGTH))
		throw new MediaKitValidationError(
			'talkingPoints',
			`Keep each talking point to ${MAX_TALKING_POINT_LENGTH} characters.`
		);
	const contactEmail = input.contactEmail.trim();
	if (contactEmail && !EMAIL_RE.test(contactEmail))
		throw new MediaKitValidationError('contactEmail', 'Enter a valid email address or leave it empty.');

	const visibleFields = { ...defaultMediaKit(input.keyId, handle).visibleFields };
	for (const f of MEDIA_KIT_FIELDS) visibleFields[f] = Boolean(input.visibleFields[f]);

	const saved: MediaKitSettings = {
		keyId: input.keyId,
		handle,
		isPublic: Boolean(input.isPublic),
		bio,
		talkingPoints,
		contactEmail,
		visibleFields,
		updatedAt: now.toISOString(),
	};
	writeLocalCollection(MEDIA_KIT_KEY, [...all.filter(k => k.keyId !== input.keyId), saved]);
	return saved;
}

/**
 * The public view of a media kit by handle, or null when there is none or the
 * creator has not made it public. Fields the creator turned off are removed
 * rather than just hidden, so they never reach the page.
 */
export function getPublicMediaKit(handle: string): PublicMediaKit | null {
	const kit = readAll().find(k => k.handle === handle.toLowerCase());
	if (!kit || !kit.isPublic) return null;
	const v = kit.visibleFields;
	return {
		keyId: kit.keyId,
		handle: kit.handle,
		showStats: v.stats,
		showAssets: v.assets,
		showQrCode: v.qrCode,
		bio: v.bio && kit.bio ? kit.bio : null,
		talkingPoints: v.talkingPoints && kit.talkingPoints.length ? kit.talkingPoints : null,
		contactEmail: v.contactEmail && kit.contactEmail ? kit.contactEmail : null,
		updatedAt: kit.updatedAt,
	};
}

export interface PublicMediaKit {
	keyId: string;
	handle: string;
	showStats: boolean;
	showAssets: boolean;
	showQrCode: boolean;
	bio: string | null;
	talkingPoints: string[] | null;
	contactEmail: string | null;
	updatedAt: string;
}

export function resetMediaKitStore(): void {
	resetLocalCollection(MEDIA_KIT_KEY);
}
