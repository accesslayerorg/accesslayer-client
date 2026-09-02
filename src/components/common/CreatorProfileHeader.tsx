import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Share2, Pencil } from 'lucide-react';
import appendUtmParams from '@/utils/utm.utils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import CreatorBio from '@/components/common/CreatorBio';
import { formatCreatorHandle } from '@/utils/handleDisplay.utils';
import { normalizeCreatorDisplayName } from '@/utils/creatorDisplayName.utils';
import { CREATOR_CARD_MEDIA_RADIUS_CLASS } from '@/utils/creatorCardTokens';
import { isOwnWallet } from '@/utils/isOwnWallet';
import { useFormatXlm } from '@/hooks/useFormatXlm';

interface CreatorProfileHeaderProps {
	name: string;
	handle: string;
	creatorId?: string | number | null;
	avatarUrl?: string;
	isVerified?: boolean;
	bio?: string | null;
	priceStroops?: number | null;
	className?: string;
	connectedWalletAddress?: string | null;
	showBackButton?: boolean;
	onBack?: () => void;
}

const CREATOR_PROFILE_SUBTITLE_WRAP_CLASS_NAME =
	'max-w-full whitespace-normal break-words [overflow-wrap:anywhere]';

const COPIED_FEEDBACK_MS = 2000;

const CreatorProfileHeader: React.FC<CreatorProfileHeaderProps> = ({
	name,
	handle,
	creatorId,
	avatarUrl,
	isVerified,
	bio,
	priceStroops,
	className,
	connectedWalletAddress,
	showBackButton = false,
	onBack,
}) => {
	const [copied, setCopied] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const { format } = useFormatXlm();

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20);
		};
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	useEffect(() => {
		return () => {
			if (copiedTimeoutRef.current) {
				clearTimeout(copiedTimeoutRef.current);
			}
		};
	}, []);

	// Display-normalised handle; raw `handle` is preserved for any equality /
	// URL construction the caller might do via the prop.
	const displayHandle = formatCreatorHandle(handle);
	const displayName = normalizeCreatorDisplayName(name) || 'Unnamed creator';
	const normalizedCreatorId =
		creatorId == null ? creatorId : String(creatorId);

	const own = isOwnWallet(connectedWalletAddress, normalizedCreatorId);

	const handleShare = async () => {
		const url = appendUtmParams(window.location.href);
		const canUseClipboard =
			typeof navigator !== 'undefined' &&
			typeof navigator.clipboard?.writeText === 'function';

		if (canUseClipboard) {
			try {
				await navigator.clipboard.writeText(url);
				setCopied(true);
				if (copiedTimeoutRef.current) {
					clearTimeout(copiedTimeoutRef.current);
				}
				copiedTimeoutRef.current = setTimeout(() => {
					setCopied(false);
					copiedTimeoutRef.current = null;
				}, COPIED_FEEDBACK_MS);
				return;
			} catch {
				// Fall through to the prompt fallback below.
			}
		}

		window.prompt(url);
	};

	const displayPrice =
		priceStroops != null && Number.isFinite(priceStroops)
			? `${format(priceStroops)} XLM`
			: null;

	// Issue #724: omit the share control during SSR (`window` undefined).
	const canShowShareButton = typeof window !== 'undefined';

	return (
		<div
			className={cn(
				'sticky top-0 z-30 -mx-6 px-6 py-4 transition-all duration-300 md:-mx-12 md:px-12',
				isScrolled
					? 'bg-slate-950/80 shadow-lg backdrop-blur-md py-3'
					: 'bg-transparent',
				className
			)}
		>
			<div className="mx-auto max-w-7xl flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="flex items-center gap-4 md:gap-6">
					{showBackButton && (
						<Button
							type="button"
							onClick={onBack}
							aria-label="Back to previous page"
							variant="outline"
							size="icon"
							className={cn(
								'shrink-0 rounded-xl border-white/10 bg-white/5 text-white transition-all hover:border-amber-500/30 hover:bg-amber-500/10 active:scale-95',
								isScrolled ? 'size-9' : 'size-11'
							)}
						>
							<ArrowLeft
								className="size-4 text-amber-500"
								aria-hidden="true"
							/>
						</Button>
					)}
					<motion.div
						animate={{
							scale: isScrolled ? 0.6 : 1,
						}}
						transition={{ duration: 0.3, ease: 'easeInOut' }}
						className={cn(
							'overflow-hidden border-2 border-white/10 shadow-xl shrink-0',
							isScrolled ? 'size-12 md:size-16' : 'size-24 md:size-32',
							CREATOR_CARD_MEDIA_RADIUS_CLASS
						)}
					>
						<CreatorInitialsAvatar
							name={displayName}
							creatorId={creatorId}
							imageSrc={avatarUrl}
						/>
					</motion.div>
					<div className="min-w-0 space-y-0.5">
						<div className="flex items-center gap-2 overflow-hidden">
							<motion.h1
								id="creator-profile-name"
								animate={{
									fontSize: isScrolled ? '1.25rem' : '1.875rem',
								}}
								className={cn(
									'truncate font-grotesque font-black tracking-tight text-white transition-all duration-300',
									isScrolled
										? 'text-xl md:text-2xl'
										: 'text-3xl md:text-4xl'
								)}
							>
								{displayName}
							</motion.h1>
							{isVerified && (
								<div className="shrink-0">
									<VerifiedBadge verified={true} />
								</div>
							)}
						</div>
						{!isScrolled ? (
							<div className="animate-in fade-in slide-in-from-top-1 duration-300">
								<p
									className={cn(
										'font-jakarta text-lg text-white/50',
										CREATOR_PROFILE_SUBTITLE_WRAP_CLASS_NAME
									)}
								>
									{displayHandle || `@${handle}`}
								</p>
								<CreatorBio
									bio={bio}
									variant="profile"
									collapsible
									className="mt-2 max-w-md"
								/>
								{displayPrice && (
									<div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5">
										<span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/45">
											Current key price
										</span>
										<span className="font-jakarta text-sm font-semibold text-amber-300">
											{displayPrice}
										</span>
									</div>
								)}
							</div>
						) : (
							<p className="font-jakarta text-xs text-white/50 truncate">
								{displayHandle || `@${handle}`}
							</p>
						)}
					</div>
				</div>

				<div
					className={cn(
						'flex items-center gap-3 transition-transform duration-300',
						isScrolled ? 'scale-90' : 'scale-100'
					)}
				>
					{own && (
						<>
							<Button
								aria-label="Edit bio"
								variant="outline"
								className={cn(
									'rounded-xl border-white/10 bg-white/5 font-bold text-white transition-all hover:border-amber-500/30 hover:bg-amber-500/10 active:scale-95',
									isScrolled ? 'h-9 px-3 text-xs' : 'h-11 px-4 text-sm'
								)}
							>
								<Pencil className="mr-2 size-4 text-amber-500" />
								<span className="hidden sm:inline">Edit Bio</span>
								<span className="sm:hidden">Edit</span>
							</Button>
							<Button
								aria-label="Change avatar"
								variant="outline"
								className={cn(
									'rounded-xl border-white/10 bg-white/5 font-bold text-white transition-all hover:border-amber-500/30 hover:bg-amber-500/10 active:scale-95',
									isScrolled ? 'h-9 px-3 text-xs' : 'h-11 px-4 text-sm'
								)}
							>
								<Pencil className="mr-2 size-4 text-amber-500" />
								<span className="hidden sm:inline">Change Avatar</span>
								<span className="sm:hidden">Avatar</span>
							</Button>
						</>
					)}
					{canShowShareButton && (
						<Button
							type="button"
							onClick={handleShare}
							aria-label={copied ? 'Copied!' : 'Share profile'}
							variant="outline"
							className={cn(
								'rounded-xl border-white/10 bg-white/5 font-bold text-white transition-all hover:border-amber-500/30 hover:bg-amber-500/10 active:scale-95',
								isScrolled ? 'h-9 px-3 text-xs' : 'h-11 px-4 text-sm'
							)}
						>
							{copied ? (
								<span>Copied!</span>
							) : (
								<Share2
									className="size-4 text-amber-500"
									aria-hidden="true"
								/>
							)}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
};

export default CreatorProfileHeader;
