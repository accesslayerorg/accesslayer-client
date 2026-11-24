import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
	buildResponsiveImageUrl,
	buildSrcSet,
	DEFAULT_IMAGE_SIZES,
} from '@/utils/responsiveImage.utils';
import { Image as ImageIcon } from 'lucide-react';

export interface ResponsiveImageProps {
	src?: string | null;
	alt: string;
	width?: number;
	height?: number;
	aspectRatio?: string | number;
	sizes?: string;
	priority?: boolean;
	className?: string;
	imageClassName?: string;
	placeholderClassName?: string;
	fallbackLabel?: string;
	onError?: () => void;
	onLoad?: () => void;
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
	src,
	alt,
	width,
	height,
	aspectRatio = 'auto',
	sizes = DEFAULT_IMAGE_SIZES,
	priority = false,
	className,
	imageClassName,
	placeholderClassName,
	fallbackLabel,
	onError,
	onLoad,
}) => {
	const [hasError, setHasError] = useState(false);
	const [isLoaded, setIsLoaded] = useState(false);

	const computedAspectRatio =
		aspectRatio !== 'auto'
			? aspectRatio
			: width && height
				? `${width} / ${height}`
				: undefined;

	const handleImageError = () => {
		setHasError(true);
		onError?.();
	};

	const handleImageLoad = () => {
		setIsLoaded(true);
		onLoad?.();
	};

	if (!src || hasError) {
		return (
			<div
				role="img"
				aria-label={alt || fallbackLabel || 'Image placeholder'}
				data-testid="responsive-image-fallback"
				className={cn(
					'relative flex size-full items-center justify-center overflow-hidden bg-slate-800 text-slate-400 select-none',
					placeholderClassName,
					className
				)}
				style={computedAspectRatio ? { aspectRatio: computedAspectRatio } : undefined}
			>
				<div className="flex flex-col items-center justify-center gap-1.5 p-2 text-center">
					<ImageIcon className="size-6 text-slate-400/70" aria-hidden="true" />
					<span className="text-xs font-medium text-slate-300">
						{fallbackLabel || alt || 'Missing image'}
					</span>
				</div>
			</div>
		);
	}

	const isSvgOrData =
		src.startsWith('data:') || src.startsWith('blob:') || src.endsWith('.svg');

	const avifSrcSet = !isSvgOrData ? buildSrcSet(src, 'avif') : undefined;
	const webpSrcSet = !isSvgOrData ? buildSrcSet(src, 'webp') : undefined;
	const jpegSrcSet = !isSvgOrData ? buildSrcSet(src, 'jpeg') : undefined;
	const fallbackSrc = !isSvgOrData ? buildResponsiveImageUrl(src, 1024, 'jpeg') : src;

	return (
		<div
			className={cn('relative overflow-hidden', className)}
			style={computedAspectRatio ? { aspectRatio: computedAspectRatio } : undefined}
			data-testid="responsive-image-container"
		>
			{/* Low-quality blur placeholder to prevent layout shift & flash */}
			{!isLoaded && (
				<div
					data-testid="responsive-image-blur-placeholder"
					aria-hidden="true"
					className={cn(
						'absolute inset-0 z-0 bg-slate-800/80 backdrop-blur-md transition-opacity duration-300 animate-pulse',
						placeholderClassName
					)}
				/>
			)}

			<picture>
				{avifSrcSet && (
					<source
						type="image/avif"
						srcSet={avifSrcSet}
						sizes={sizes}
						data-testid="source-avif"
					/>
				)}
				{webpSrcSet && (
					<source
						type="image/webp"
						srcSet={webpSrcSet}
						sizes={sizes}
						data-testid="source-webp"
					/>
				)}
				<img
					src={fallbackSrc}
					srcSet={jpegSrcSet}
					sizes={sizes}
					alt={alt}
					width={width}
					height={height}
					loading={priority ? 'eager' : 'lazy'}
					fetchPriority={priority ? 'high' : 'auto'}
					decoding="async"
					onError={handleImageError}
					onLoad={handleImageLoad}
					className={cn(
						'relative z-10 size-full object-cover transition-opacity duration-300',
						!isLoaded ? 'opacity-0' : 'opacity-100',
						imageClassName
					)}
				/>
			</picture>
		</div>
	);
};

export default ResponsiveImage;
