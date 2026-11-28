import { Helmet } from 'react-helmet-async';
import {
	DEFAULT_PAGE_DESCRIPTION,
	DEFAULT_PAGE_IMAGE,
	DEFAULT_PAGE_TITLE,
	PUBLIC_SITE_ORIGIN,
} from '@/utils/seo.utils';

interface PageMetaProps {
	title?: string | null;
	description?: string | null;
	image?: string | null;
	canonicalUrl?: string | null;
	noindex?: boolean;
	structuredData?: Record<string, unknown> | null;
}

export default function PageMeta({
	title,
	description,
	image,
	canonicalUrl,
	noindex = false,
	structuredData,
}: PageMetaProps) {
	const pageTitle = title?.trim() || DEFAULT_PAGE_TITLE;
	const pageDescription = description?.trim() || DEFAULT_PAGE_DESCRIPTION;
	const pageImage = image?.trim() || DEFAULT_PAGE_IMAGE;
	const pageCanonicalUrl = canonicalUrl?.trim() || `${PUBLIC_SITE_ORIGIN}/`;
	const openGraphType =
		structuredData?.['@type'] === 'Product' ? 'product' : 'website';
	const jsonLd = structuredData
		? JSON.stringify(structuredData).replace(/</g, '\\u003c')
		: null;

	return (
		<Helmet
			script={
				jsonLd ? [{ type: 'application/ld+json', innerHTML: jsonLd }] : []
			}
		>
			<title>{pageTitle}</title>
			<meta name="description" content={pageDescription} />
			<meta
				name="robots"
				content={noindex ? 'noindex, follow' : 'index, follow'}
			/>
			<link rel="canonical" href={pageCanonicalUrl} />

			<meta property="og:type" content={openGraphType} />
			<meta property="og:title" content={pageTitle} />
			<meta property="og:description" content={pageDescription} />
			<meta property="og:url" content={pageCanonicalUrl} />
			<meta property="og:image" content={pageImage} />
			<meta property="og:image:width" content="1200" />
			<meta property="og:image:height" content="630" />

			<meta name="twitter:card" content="summary_large_image" />
			<meta name="twitter:title" content={pageTitle} />
			<meta name="twitter:description" content={pageDescription} />
			<meta name="twitter:image" content={pageImage} />
		</Helmet>
	);
}
