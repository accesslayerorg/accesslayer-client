import { describe, expect, it, vi } from 'vitest';
import {
	MEDIA_KIT_ASSETS,
	assetFilename,
	initialsOf,
	renderMediaKitAsset,
	type CanvasLike,
} from '@/utils/mediaKitAssets';

const data = {
	name: 'Ada Lovelace',
	handle: 'ada',
	avatarUrl: 'https://cdn.example.com/ada.png',
	priceLabel: '12 XLM',
	holdersLabel: '42 holders',
	keyUrl: 'https://app.example.com/keys/key-1',
};

/** A canvas double that records size, drawing calls and the export format. */
function fakeCanvas() {
	const calls: string[] = [];
	const ctx = new Proxy(
		{},
		{
			get: (_t, prop) => (typeof prop === 'string' ? (...args: unknown[]) => calls.push(`${prop}:${args.length}`) : undefined),
			set: () => true,
		}
	) as unknown as CanvasRenderingContext2D;
	const canvas = {
		width: 0,
		height: 0,
		type: '',
		getContext: () => ctx,
		toBlob(cb: (b: Blob | null) => void, type?: string) {
			this.type = type ?? '';
			cb(new Blob([`${this.width}x${this.height}`], { type }));
		},
	};
	return { canvas, calls };
}

describe('media kit assets (#1475)', () => {
	it('offers avatars in three sizes, a 3:1 banner and a square card', () => {
		expect(MEDIA_KIT_ASSETS.map(a => [a.id, a.width, a.height])).toEqual([
			['avatar-128', 128, 128],
			['avatar-256', 256, 256],
			['avatar-512', 512, 512],
			['banner', 1500, 500],
			['card', 1080, 1080],
		]);
		expect(MEDIA_KIT_ASSETS.every(a => a.mimeType === 'image/png')).toBe(true);
	});

	it.each(MEDIA_KIT_ASSETS.map(a => [a.id, a]))('renders %s at its exact size as PNG', async (_id, spec) => {
		const { canvas } = fakeCanvas();
		const image = {} as CanvasImageSource;
		const blob = await renderMediaKitAsset(spec, data, {
			createCanvas: () => canvas as CanvasLike,
			loadImage: async () => image,
		});
		expect([canvas.width, canvas.height]).toEqual([spec.width, spec.height]);
		expect(canvas.type).toBe('image/png');
		expect(blob.type).toBe('image/png');
		expect(await blob.text()).toBe(`${spec.width}x${spec.height}`);
		expect(assetFilename('ada', spec)).toBe(`ada-${spec.id}.png`);
	});

	it('draws the avatar image when it loads and initials when it does not', async () => {
		const withImage = fakeCanvas();
		await renderMediaKitAsset(MEDIA_KIT_ASSETS[0], data, {
			createCanvas: () => withImage.canvas as CanvasLike,
			loadImage: async () => ({}) as CanvasImageSource,
		});
		expect(withImage.calls).toContain('drawImage:5');
		expect(withImage.calls).not.toContain('fillText:3');

		const fallback = fakeCanvas();
		const loadImage = vi.fn(async () => null);
		await renderMediaKitAsset(MEDIA_KIT_ASSETS[0], data, {
			createCanvas: () => fallback.canvas as CanvasLike,
			loadImage,
		});
		expect(loadImage).toHaveBeenCalledWith(data.avatarUrl);
		expect(fallback.calls).not.toContain('drawImage:5');
		expect(fallback.calls).toContain('fillText:3');
		expect(initialsOf(data.name)).toBe('AL');
	});

	it('rejects when the browser cannot export the canvas', async () => {
		const { canvas } = fakeCanvas();
		canvas.toBlob = cb => cb(null);
		await expect(
			renderMediaKitAsset(MEDIA_KIT_ASSETS[3], { ...data, avatarUrl: null }, { createCanvas: () => canvas as CanvasLike })
		).rejects.toThrow('Could not create the image.');
	});
});
