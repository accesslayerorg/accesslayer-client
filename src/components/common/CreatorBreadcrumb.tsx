import React from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreatorBreadcrumbProps {
	parentLabel: string;
	parentHref: string;
	currentLabel: string;
	className?: string;
}

const CreatorBreadcrumb: React.FC<CreatorBreadcrumbProps> = ({
	parentLabel,
	parentHref,
	currentLabel,
	className,
}) => {
	return (
		<nav
			aria-label="Breadcrumb"
			className={cn(
				'flex items-center gap-2 font-jakarta text-sm',
				className
			)}
		>
			<Link
				to={parentHref}
				className="font-medium text-white/50 transition-colors hover:text-amber-400"
			>
				{parentLabel}
			</Link>
			<ChevronRight className="size-4 text-white/30" />
			<span className="font-bold text-white truncate max-w-[150px] sm:max-w-none">
				{currentLabel}
			</span>
		</nav>
	);
};

export default CreatorBreadcrumb;
