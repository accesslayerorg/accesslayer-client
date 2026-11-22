import { cleanup, render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import PageMeta from '@/components/common/PageMeta';
import {
	DEFAULT_PAGE_DESCRIPTION,
	DEFAULT_PAGE_TITLE,
	PUBLIC_SITE_ORIGIN,
	buildCreatorShareImageUrl,
} from '@/utils/seo.utils';

afterEach(() => {
	cleanup();
	document.head.replaceChildren();
});

function renderPageMeta(props: ComponentProps<typeof PageMeta> = {}) {
	return render(
		<HelmetProvider>
			<PageMeta {...props} />
		</HelmetProvider>
	);
}

describe('PageMeta', () => {
	it('renders page-specific social, canonical, robots, and JSON-LD tags', async () => {
		const canonicalUrl = `${PUBLIC_SITE_ORIGIN}/creator/alice/profile`;
		const image = `${PUBLIC_SITE_ORIGIN}/api/v1/share/creators/alice/image.png`;

		renderPageMeta({
			title: 'Alice — Creator Profile | AccessLayer',
			description: 'Alice creates digital art.',
			image,
			canonicalUrl,
			structuredData: {
				'@context': 'https://schema.org',
				'@type': 'Person',
				name: 'Alice',
			},
		});

		await waitFor(() => {
			expect(document.title).toBe('Alice — Creator Profile | AccessLayer');
			expect(
				document.head.querySelector('meta[property="og:image"]')
			).toHaveAttribute('content', image);
		});
		expect(
			document.head.querySelector('meta[name="description"]')
		).toHaveAttribute('content', 'Alice creates digital art.');
		expect(
			document.head.querySelector('meta[name="twitter:image"]')
		).toHaveAttribute('content', image);
		expect(
			document.head.querySelector('link[rel="canonical"]')
		).toHaveAttribute('href', canonicalUrl);
		expect(
			document.head.querySelector('meta[name="robots"]')
		).toHaveAttribute('content', 'index, follow');
		expect(
			JSON.parse(
				document.querySelector('script[type="application/ld+json"]')
					?.textContent ?? '{}'
			)
		).toMatchObject({ '@type': 'Person', name: 'Alice' });
	});

	it('keeps site defaults in the head while page data is unavailable', async () => {
		renderPageMeta({ title: null, description: '', image: null });

		await waitFor(() => expect(document.title).toBe(DEFAULT_PAGE_TITLE));
		expect(
			document.head.querySelector('meta[name="description"]')
		).toHaveAttribute('content', DEFAULT_PAGE_DESCRIPTION);
		expect(
			document.head.querySelector('link[rel="canonical"]')
		).toHaveAttribute('href', `${PUBLIC_SITE_ORIGIN}/`);
		expect(
			document.head.querySelector('meta[name="robots"]')
		).toHaveAttribute('content', 'index, follow');
	});

	it('targets the backend creator share-image endpoint', () => {
		expect(buildCreatorShareImageUrl('@alice')).toContain(
			'/share/creators/alice/image.png'
		);
	});
});
