import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const marketplaceSectionVariants = cva('w-full', {
	variants: {
		spacing: {
			compact: 'marketplace-section-compact',
			default: 'marketplace-section',
			relaxed: 'marketplace-section-relaxed',
			major: 'marketplace-section-major',
			none: 'my-0',
		},
		container: {
			default: 'mx-auto max-w-7xl',
			full: 'w-full',
			none: '',
		},
	},
	defaultVariants: {
		spacing: 'default',
		container: 'none',
	},
});

interface MarketplaceSectionProps
	extends React.HTMLAttributes<HTMLElement>,
		VariantProps<typeof marketplaceSectionVariants> {
	as?: 'section' | 'div' | 'header' | 'footer';
}

const MarketplaceSection: React.FC<MarketplaceSectionProps> = ({
	children,
	spacing,
	container,
	className,
	as: Tag = 'section',
	...props
}) => {
	return (
		<Tag
			className={cn(
				marketplaceSectionVariants({ spacing, container }),
				className
			)}
			{...props}
		>
			{children}
		</Tag>
	);
};

export default MarketplaceSection;
