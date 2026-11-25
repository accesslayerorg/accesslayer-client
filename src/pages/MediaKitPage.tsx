import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAccount } from 'wagmi';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import Skeleton from '@/components/ui/skeleton';
import MediaKitStatsCard from '@/components/mediaKit/MediaKitStatsCard';
import MediaKitAssets from '@/components/mediaKit/MediaKitAssets';
import MediaKitCopyBlocks from '@/components/mediaKit/MediaKitCopyBlocks';
import MediaKitQrCode from '@/components/mediaKit/MediaKitQrCode';
import { useMediaKit } from '@/hooks/useMediaKit';
import {
	MAX_BIO_LENGTH,
	MAX_TALKING_POINTS,
	MEDIA_KIT_FIELDS,
	MediaKitValidationError,
	type MediaKitField,
	type MediaKitSettings,
} from '@/services/mediaKit.service';
import { buildCopyBlocks, keyPageUrl, pressPageUrl } from '@/utils/mediaKitCopy';
import { isOwnWallet } from '@/utils/isOwnWallet';
import showToast from '@/utils/toast.util';

const FIELD_LABELS: Record<MediaKitField, string> = {
	stats: 'Stats',
	bio: 'Bio',
	talkingPoints: 'Talking points',
	contactEmail: 'Contact email',
	assets: 'Downloads',
	qrCode: 'QR code',
};

const origin = () => (typeof window === 'undefined' ? '' : window.location.origin);

/**
 * Creator media kit editor (#1475) at `/creator/media-kit?key=<keyId>`.
 * Only the key's creator wallet can edit it; the public version lives at
 * `/k/:handle/press` and exists only while visibility is on.
 */
export default function MediaKitPage() {
	const [params] = useSearchParams();
	const keyId = params.get('key') ?? '';
	const { address } = useAccount();
	const kit = useMediaKit(keyId);

	if (!keyId)
		return (
			<Shell>
				<p className="text-white/60">
					Open the media kit from your key&apos;s creator dashboard so we
					know which key it is for, or go back to the{' '}
					<Link to="/" className="text-amber-300 hover:underline">marketplace</Link>.
				</p>
			</Shell>
		);
	if (kit.isLoading || !kit.settings)
		return (
			<Shell>
				<Skeleton className="h-40 w-full" />
			</Shell>
		);
	if (!isOwnWallet(address, kit.creator?.instructorId))
		return (
			<Shell>
				<p role="alert" className="text-white/60">Only the wallet that created this key can edit its media kit.</p>
			</Shell>
		);

	const keyUrl = keyPageUrl(keyId, origin());
	const stats = kit.stats;
	return (
		<Shell title={kit.creator?.title}>
			<MediaKitEditor
				key={kit.settings.updatedAt}
				settings={kit.settings}
				saving={kit.save.isPending}
				onSave={async input => {
					try {
						await kit.save.mutateAsync(input);
						showToast.success('Media kit saved');
						return null;
					} catch (error) {
						if (error instanceof MediaKitValidationError) return error.message;
						throw error;
					}
				}}
			/>
			{stats && (
				<>
					<MediaKitStatsCard stats={stats} updatedAt={kit.statsUpdatedAt} />
					<MediaKitAssets
						data={{
							name: stats.keyName,
							handle: kit.settings.handle,
							avatarUrl: stats.avatarUrl,
							priceLabel: stats.priceLabel,
							holdersLabel: `${stats.holdersLabel} holders`,
							keyUrl,
						}}
					/>
					<MediaKitCopyBlocks
						blocks={buildCopyBlocks(stats, {
							bio: kit.settings.bio,
							talkingPoints: kit.settings.talkingPoints,
							keyUrl,
						})}
					/>
				</>
			)}
			<MediaKitQrCode url={keyUrl} handle={kit.settings.handle} />
		</Shell>
	);
}

function Shell({ title, children }: { title?: string; children: React.ReactNode }) {
	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-4xl space-y-6">
				<div>
					<h1 className="font-grotesque text-2xl font-black tracking-tight">Media kit</h1>
					<p className="mt-1 text-sm text-white/60">
						{title ? `Press page for ${title}.` : 'Stats, assets and copy for press and partners.'}
					</p>
				</div>
				{children}
			</div>
		</main>
	);
}

interface EditorProps {
	settings: MediaKitSettings;
	saving: boolean;
	/** Resolves to a validation message, or null on success. */
	onSave: (input: Omit<MediaKitSettings, 'updatedAt'>) => Promise<string | null>;
}

function MediaKitEditor({ settings, saving, onSave }: EditorProps) {
	const [handle, setHandle] = useState(settings.handle);
	const [isPublic, setIsPublic] = useState(settings.isPublic);
	const [bio, setBio] = useState(settings.bio);
	const [points, setPoints] = useState(settings.talkingPoints.join('\n'));
	const [contactEmail, setContactEmail] = useState(settings.contactEmail);
	const [visible, setVisible] = useState(settings.visibleFields);
	const [error, setError] = useState<string | null>(null);
	const publicUrl = pressPageUrl(settings.handle, origin());

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(
			await onSave({
				keyId: settings.keyId,
				handle,
				isPublic,
				bio,
				talkingPoints: points.split('\n'),
				contactEmail,
				visibleFields: visible,
			})
		);
	};

	return (
		<form noValidate onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5" aria-label="Media kit settings">
			<div className="flex items-center justify-between gap-3">
				<div>
					<p id="media-kit-visibility-label" className="font-bold">Public press page</p>
					<p className="text-xs text-white/55">
						{settings.isPublic ? (
							<a href={publicUrl} className="inline-flex items-center gap-1 text-amber-300 hover:underline">
								{publicUrl} <ExternalLink className="size-3" aria-hidden="true" />
							</a>
						) : (
							'Off: the press page returns “not found” until you turn this on and save.'
						)}
					</p>
				</div>
				<Switch checked={isPublic} onCheckedChange={setIsPublic} aria-labelledby="media-kit-visibility-label" />
			</div>

			<div>
				<Label htmlFor="media-kit-handle">Handle</Label>
				<Input id="media-kit-handle" value={handle} onChange={e => setHandle(e.target.value)} className="mt-1" />
			</div>
			<div>
				<Label htmlFor="media-kit-bio">Short bio</Label>
				<Textarea id="media-kit-bio" value={bio} maxLength={MAX_BIO_LENGTH} onChange={e => setBio(e.target.value)} className="mt-1" />
				<p className="mt-1 text-xs text-white/40">{bio.length}/{MAX_BIO_LENGTH}</p>
			</div>
			<div>
				<Label htmlFor="media-kit-points">Talking points (one per line, up to {MAX_TALKING_POINTS})</Label>
				<Textarea id="media-kit-points" value={points} onChange={e => setPoints(e.target.value)} className="mt-1" />
			</div>
			<div>
				<Label htmlFor="media-kit-email">Contact email</Label>
				<Input id="media-kit-email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="mt-1" />
			</div>

			<fieldset>
				<legend className="text-sm font-bold">Show on the public page</legend>
				<div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
					{MEDIA_KIT_FIELDS.map(field => (
						<label key={field} className="flex items-center gap-2 text-sm text-white/80">
							<Checkbox
								checked={visible[field]}
								onCheckedChange={checked => setVisible(v => ({ ...v, [field]: checked }))}
							/>
							{FIELD_LABELS[field]}
						</label>
					))}
				</div>
			</fieldset>

			{error && <p role="alert" className="text-sm text-red-300">{error}</p>}
			<Button type="submit" disabled={saving} className="bg-amber-400 font-bold text-slate-950 hover:bg-amber-300">
				{saving ? 'Saving…' : 'Save media kit'}
			</Button>
		</form>
	);
}
