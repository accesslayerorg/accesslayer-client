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
		return (
			<div
				className={cn(
					'flex size-full items-center justify-center text-3xl font-black tracking-wide',
					className
				)}
				style={{
					background: fallbackColors.background,
					color: fallbackColors.textColor,
				}}
			>
				<span aria-label={`${name} initials avatar`}>{initials}</span>
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
