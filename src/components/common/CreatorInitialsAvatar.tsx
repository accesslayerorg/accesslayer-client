import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getFallbackAvatarColors } from '@/utils/avatarColor.util';

interface CreatorInitialsAvatarProps {
	name: string;
	creatorId?: string | number | null;
	imageSrc?: string;
	className?: string;
	imageClassName?: string;
}

const getInitials = (name: string) => {
	const cleanName = name.trim();
	if (!cleanName) {
		return 'NA';
	}

	const parts = cleanName.split(/\s+/).filter(Boolean);
	if (parts.length === 1) {
		return parts[0].slice(0, 2).toUpperCase();
	}

	return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
};

const CreatorInitialsAvatar: React.FC<CreatorInitialsAvatarProps> = ({
	name,
	creatorId,
	imageSrc,
	className,
	imageClassName,
}) => {
	const [hasError, setHasError] = useState(false);
	const initials = getInitials(name);
	const fallbackColors = getFallbackAvatarColors(creatorId);

	if (!imageSrc || hasError) {
		const fallbackLabel = hasError
			? `${name} – avatar image unavailable, showing initials`
			: `${name} initials avatar`;

		return (
			<div
				role="img"
				aria-label={fallbackLabel}
				title={hasError ? 'Avatar image could not be loaded' : name}
				className={cn(
					'flex size-full flex-col items-center justify-center gap-1 text-3xl font-black tracking-wide',
					className
				)}
				style={{
					background: fallbackColors.background,
					color: fallbackColors.textColor,
				}}
			>
				<span aria-hidden="true">{initials}</span>
				{hasError && (
					<span className="text-[0.45rem] font-semibold uppercase tracking-widest opacity-60">
						Image unavailable
					</span>
				)}
			</div>
		);
	}

	return (
		<img
			src={imageSrc}
			alt={name}
			onError={() => setHasError(true)}
			className={cn('size-full object-cover', imageClassName, className)}
		/>
	);
};

export default CreatorInitialsAvatar;
