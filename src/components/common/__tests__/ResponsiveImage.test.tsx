import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResponsiveImage } from '../ResponsiveImage';
import {
	buildResponsiveImageUrl,
	buildSrcSet,
	RESPONSIVE_IMAGE_WIDTHS,
} from '@/utils/responsiveImage.utils';

describe('ResponsiveImage (#1491)', () => {
	it('generates correct variant URLs and srcset across all widths', () => {
		const url = 'https://cdn.example.com/images/avatar.png';
		const variant = buildResponsiveImageUrl(url, 256, 'webp');
		expect(variant).toContain('w=256');
		expect(variant).toContain('format=webp');

		const srcSet = buildSrcSet(url, 'avif');
		for (const w of RESPONSIVE_IMAGE_WIDTHS) {
			expect(srcSet).toContain(`${w}w`);
		}
	});

	it('renders picture with AVIF, WebP sources and JPEG img fallback', () => {
		render(
			<ResponsiveImage
				src="https://cdn.example.com/images/banner.jpg"
				alt="Hero banner"
				width={1024}
				height={512}
				aspectRatio="16/9"
			/>
		);

		const avifSource = screen.getByTestId('source-avif');
		const webpSource = screen.getByTestId('source-webp');
		const img = screen.getByRole('img', { name: 'Hero banner' });

		expect(avifSource).toHaveAttribute('type', 'image/avif');
		expect(webpSource).toHaveAttribute('type', 'image/webp');
		expect(img).toHaveAttribute('loading', 'lazy');
		expect(img).toHaveAttribute('decoding', 'async');
	});

	it('prioritizes eager loading and high fetch priority when priority=true', () => {
		render(
			<ResponsiveImage
				src="https://cdn.example.com/images/featured.jpg"
				alt="Featured key"
				priority
			/>
		);

		const img = screen.getByRole('img', { name: 'Featured key' });
		expect(img).toHaveAttribute('loading', 'eager');
		expect(img).toHaveAttribute('fetchpriority', 'high');
	});

	it('renders a labelled placeholder when src is missing', () => {
		render(
			<ResponsiveImage
				src={null}
				alt="Missing avatar"
				fallbackLabel="No avatar uploaded"
			/>
		);

		const placeholder = screen.getByRole('img', { name: 'No avatar uploaded' });
		expect(placeholder).toBeInTheDocument();
		expect(placeholder).toHaveTextContent('No avatar uploaded');
	});

	it('shows labelled placeholder when image fails to load', () => {
		const onError = vi.fn();
		render(
			<ResponsiveImage
				src="https://cdn.example.com/broken.jpg"
				alt="Broken image"
				onError={onError}
			/>
		);

		const img = screen.getByRole('img', { name: 'Broken image' });
		fireEvent.error(img);

		expect(onError).toHaveBeenCalled();
		expect(screen.getByTestId('responsive-image-fallback')).toBeInTheDocument();
	});

	it('reserves aspect ratio to prevent layout shift', () => {
		const { container } = render(
			<ResponsiveImage
				src="https://cdn.example.com/profile.jpg"
				alt="Profile"
				aspectRatio="1/1"
			/>
		);

		const wrapper = container.querySelector('[data-testid="responsive-image-container"]');
		expect(wrapper).toHaveStyle({ aspectRatio: '1/1' });
	});
});
