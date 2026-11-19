import { Loader2 } from 'lucide-react';

/**
 * Loading state shown while an announcement is pinned to IPFS and the
 * `post_announcement` contract call is in flight (#1159).
 */
export default function PublishingAnnouncement() {
	return (
		<div
			role="status"
			aria-live="polite"
			data-testid="publishing-announcement"
			className="flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
		>
			<Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
			<span>Publishing announcement… uploading to IPFS and confirming on-chain.</span>
		</div>
	);
}
