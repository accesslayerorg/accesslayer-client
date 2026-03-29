import React, { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import showToast from '@/utils/toast.util';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';

interface CreatorProfileHeaderProps {
	name: string;
	handle: string;
	avatarUrl?: string;
	isVerified?: boolean;
	className?: string;
}

const CreatorProfileHeader: React.FC<CreatorProfileHeaderProps> = ({
	name,
	handle,
	avatarUrl,
	isVerified,
	className,
}) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			setCopied(true);
			showToast.success('Profile link copied to clipboard!');
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error('Failed to copy profile link:', err);
			showToast.error('Failed to copy link');
		}
	};

	return (
		<div
			className={cn(
				'flex flex-col gap-6 md:flex-row md:items-end md:justify-between',
				className
			)}
		>
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
				<div className="size-24 overflow-hidden rounded-2xl border-4 border-white/10 shadow-xl md:size-32">
					<CreatorInitialsAvatar name={name} imageSrc={avatarUrl} />
				</div>
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<h1 className="font-grotesque text-3xl font-black tracking-tight text-white md:text-4xl">
							{name}
						</h1>
						{isVerified && <VerifiedBadge verified={true} />}
					</div>
					<p className="font-jakarta text-lg text-white/50">@{handle}</p>
				</div>
			</div>

			<div className="flex items-center gap-3">
				<Button
					onClick={handleCopy}
					variant="outline"
					className="h-11 rounded-xl border-white/10 bg-white/5 px-4 font-bold text-white transition-all hover:border-amber-500/30 hover:bg-amber-500/10 active:scale-95"
				>
					{copied ? (
						<Check className="mr-2 size-4 text-emerald-400" />
					) : (
						<Copy className="mr-2 size-4 text-amber-500" />
					)}
					<span className="hidden sm:inline">
						{copied ? 'Copied!' : 'Copy Profile Link'}
					</span>
					<span className="sm:hidden">{copied ? 'Copied' : 'Copy'}</span>
				</Button>
				<Button
					variant="outline"
					size="icon"
					className="h-11 w-11 rounded-xl border-white/10 bg-white/5 text-white transition-all hover:border-amber-500/30 hover:bg-amber-500/10 md:hidden active:scale-95"
					onClick={handleCopy}
					aria-label="Share profile"
				>
					<Share2 className="size-4" />
				</Button>
			</div>
		</div>
	);
};

export default CreatorProfileHeader;
