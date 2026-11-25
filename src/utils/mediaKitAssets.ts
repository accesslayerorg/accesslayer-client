/**
 * Downloadable media kit assets (#1475): avatars in several sizes, a banner
 * and a branded square card, rendered on a canvas as PNG.
 */

export type MediaKitAssetKind = 'avatar' | 'banner' | 'card';

export interface MediaKitAssetSpec {
	id: string;
	kind: MediaKitAssetKind;
	label: string;
	width: number;
	height: number;
	mimeType: 'image/png';
}

export const MEDIA_KIT_ASSETS: readonly MediaKitAssetSpec[] = [
	{ id: 'avatar-128', kind: 'avatar', label: 'Avatar · 128 × 128', width: 128, height: 128, mimeType: 'image/png' },
	{ id: 'avatar-256', kind: 'avatar', label: 'Avatar · 256 × 256', width: 256, height: 256, mimeType: 'image/png' },
	{ id: 'avatar-512', kind: 'avatar', label: 'Avatar · 512 × 512', width: 512, height: 512, mimeType: 'image/png' },
	{ id: 'banner', kind: 'banner', label: 'Banner · 1500 × 500', width: 1500, height: 500, mimeType: 'image/png' },
	{ id: 'card', kind: 'card', label: 'Square card · 1080 × 1080', width: 1080, height: 1080, mimeType: 'image/png' },
];

export interface MediaKitAssetData {
	name: string;
	handle: string;
	avatarUrl?: string | null;
	priceLabel: string;
	holdersLabel: string;
	keyUrl: string;
}

export interface CanvasLike {
	width: number;
	height: number;
	getContext(type: '2d'): CanvasRenderingContext2D | null;
	toBlob(callback: (blob: Blob | null) => void, type?: string): void;
}

export interface RenderDependencies {
	createCanvas?: () => CanvasLike;
	/** Loads the avatar image; resolves null when it cannot be drawn. */
	loadImage?: (url: string) => Promise<CanvasImageSource | null>;
}

export const assetFilename = (handle: string, spec: MediaKitAssetSpec) =>
	`${handle.replace(/[^a-z0-9-]/gi, '_')}-${spec.id}.png`;

export function initialsOf(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? '?').slice(0, 2);
	return letters.toUpperCase();
}

function defaultCreateCanvas(): CanvasLike {
	return document.createElement('canvas');
}

function defaultLoadImage(url: string): Promise<CanvasImageSource | null> {
	return new Promise(resolve => {
		const img = new Image();
		// Without CORS the canvas would be tainted and toBlob would throw.
		img.crossOrigin = 'anonymous';
		img.onload = () => resolve(img);
		img.onerror = () => resolve(null);
		img.src = url;
	});
}

const BG = '#06111f';
const ACCENT = '#fbbf24';

function drawAvatar(
	ctx: CanvasRenderingContext2D,
	image: CanvasImageSource | null,
	name: string,
	cx: number,
	cy: number,
	r: number
) {
	ctx.save();
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.closePath();
	ctx.clip();
	if (image) ctx.drawImage(image, cx - r, cy - r, r * 2, r * 2);
	else {
		ctx.fillStyle = ACCENT;
		ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
		ctx.fillStyle = BG;
		ctx.font = `bold ${Math.round(r * 0.8)}px sans-serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(initialsOf(name), cx, cy);
	}
	ctx.restore();
}

/** Renders one asset to a PNG blob of exactly the spec's size. */
export async function renderMediaKitAsset(
	spec: MediaKitAssetSpec,
	data: MediaKitAssetData,
	{ createCanvas = defaultCreateCanvas, loadImage = defaultLoadImage }: RenderDependencies = {}
): Promise<Blob> {
	const canvas = createCanvas();
	canvas.width = spec.width;
	canvas.height = spec.height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas is not available in this browser.');
	const image = data.avatarUrl ? await loadImage(data.avatarUrl) : null;
	const { width: w, height: h } = spec;

	if (spec.kind === 'avatar') {
		ctx.fillStyle = BG;
		ctx.fillRect(0, 0, w, h);
		drawAvatar(ctx, image, data.name, w / 2, h / 2, w / 2);
	} else {
		ctx.fillStyle = BG;
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = ACCENT;
		ctx.fillRect(0, h - Math.round(h * 0.03), w, Math.round(h * 0.03));
		const isBanner = spec.kind === 'banner';
		const r = isBanner ? h * 0.28 : w * 0.16;
		const cx = isBanner ? h * 0.5 : w / 2;
		const cy = isBanner ? h / 2 : h * 0.3;
		drawAvatar(ctx, image, data.name, cx, cy, r);
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = isBanner ? 'left' : 'center';
		ctx.textBaseline = 'alphabetic';
		const x = isBanner ? cx + r + h * 0.15 : w / 2;
		ctx.font = `bold ${Math.round(h * (isBanner ? 0.14 : 0.07))}px sans-serif`;
		ctx.fillText(data.name, x, isBanner ? h * 0.42 : h * 0.58);
		ctx.font = `${Math.round(h * (isBanner ? 0.07 : 0.035))}px sans-serif`;
		ctx.fillStyle = 'rgba(255,255,255,0.7)';
		ctx.fillText(`@${data.handle} on AccessLayer`, x, isBanner ? h * 0.58 : h * 0.65);
		ctx.fillStyle = ACCENT;
		ctx.font = `bold ${Math.round(h * (isBanner ? 0.08 : 0.045))}px monospace`;
		ctx.fillText(`${data.priceLabel} · ${data.holdersLabel}`, x, isBanner ? h * 0.76 : h * 0.76);
		if (!isBanner) {
			ctx.fillStyle = 'rgba(255,255,255,0.5)';
			ctx.font = `${Math.round(h * 0.028)}px sans-serif`;
			ctx.fillText(data.keyUrl, x, h * 0.88);
		}
	}

	return new Promise((resolve, reject) =>
		canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not create the image.'))), spec.mimeType)
	);
}

/** Saves a blob through a temporary download link. */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}
