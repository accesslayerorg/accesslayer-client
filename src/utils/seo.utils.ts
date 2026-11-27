import { env } from '@/utils/env.utils';

export const PUBLIC_SITE_ORIGIN = 'https://accesslayer.xyz';
export const DEFAULT_PAGE_TITLE =
	'Access Layer | Creator Keys Marketplace on Stellar';
export const DEFAULT_PAGE_DESCRIPTION =
	'AccessLayer is an open source marketplace on the Stellar blockchain where fans can buy and sell keys tied to their favorite creators.';
export const DEFAULT_PAGE_IMAGE = `${PUBLIC_SITE_ORIGIN}/images/og-image.png`;

export function buildCanonicalUrl(path: string = '/'): string {
	return new URL(path, PUBLIC_SITE_ORIGIN).toString();
}

export function buildCreatorShareImageUrl(handle: string): string {
	const backendUrl = new URL(env.VITE_BACKEND_URL, PUBLIC_SITE_ORIGIN);
	const basePath = backendUrl.pathname.replace(/\/+$/, '');
	const apiVersion = /\/v\d+$/.test(basePath) ? '' : '/v1';
	const normalizedHandle = handle.trim().replace(/^@/, '');

	backendUrl.pathname = `${basePath}${apiVersion}/share/creators/${encodeURIComponent(normalizedHandle)}/image.png`;
	backendUrl.search = '';
	backendUrl.hash = '';

	return backendUrl.toString();
}
