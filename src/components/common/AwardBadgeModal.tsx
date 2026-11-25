import { useState, type FormEvent } from 'react';
import { StrKey } from '@stellar/stellar-sdk';
import { Award, AlertCircle } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AwardBadgeParams, SoulboundBadge } from '@/types/badge.types';

const PRESET_BADGE_TYPES = [
	{
		type: 'early_contributor',
		name: 'Early Contributor',
		description: 'Awarded for active participation in the early alpha network.',
	},
	{
		type: 'governance_pioneer',
		name: 'Governance Pioneer',
		description: 'Voted on 10 or more key governance proposals.',
	},
	{
		type: 'creator_partner',
		name: 'Creator Partner',
		description: 'Verified content partner with over 100 key holders.',
	},
	{
		type: 'community_ambassador',
		name: 'Community Ambassador',
		description: 'Distinguished community leader providing support and education.',
	},
	{
		type: 'custom',
		name: '',
		description: '',
	},
];

interface AwardBadgeModalProps {
	isOpen: boolean;
	onClose: () => void;
	onAward: (params: AwardBadgeParams) => Promise<unknown>;
	existingBadges?: SoulboundBadge[];
}

export function AwardBadgeModal({
	isOpen,
	onClose,
	onAward,
	existingBadges = [],
}: AwardBadgeModalProps) {
	const [selectedType, setSelectedType] = useState('early_contributor');
	const [recipient, setRecipient] = useState('');
	const [customName, setCustomName] = useState('');
	const [customDescription, setCustomDescription] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const isCustom = selectedType === 'custom';
	const preset = PRESET_BADGE_TYPES.find(p => p.type === selectedType);
	const badgeName = isCustom ? customName : (preset?.name || '');
	const badgeDescription = isCustom ? customDescription : (preset?.description || '');

	const validateRecipient = (address: string): boolean => {
		const trimmed = address.trim();
		if (!trimmed) return false;
		return (
			StrKey.isValidEd25519PublicKey(trimmed) ||
			(trimmed.startsWith('G') && trimmed.length >= 20)
		);
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError(null);

		const trimmedRecipient = recipient.trim();
		if (!validateRecipient(trimmedRecipient)) {
			setError('Invalid recipient address. Must be a valid Stellar public key.');
			return;
		}

		if (!badgeName.trim()) {
			setError('Badge name is required.');
			return;
		}

		// Check duplicate award
		const isDuplicate = existingBadges.some(
			badge =>
				badge.recipient.toLowerCase() === trimmedRecipient.toLowerCase() &&
				badge.badgeType === selectedType &&
				!badge.revoked
		);

		if (isDuplicate) {
			setError(`Duplicate award: Recipient already holds the "${badgeName}" badge.`);
			return;
		}

		setIsSubmitting(true);
		try {
			await onAward({
				recipient: trimmedRecipient,
				badgeType: selectedType,
				name: badgeName.trim(),
				description: badgeDescription.trim(),
			});
			setRecipient('');
			setCustomName('');
			setCustomDescription('');
			onClose();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Failed to award badge';
			setError(msg);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
			<DialogContent
				data-testid="award-badge-modal"
				className="max-w-md border border-white/10 bg-[#06111f] text-white"
			>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-lg font-bold">
						<Award className="size-5 text-amber-400" />
						Award Soulbound Badge
					</DialogTitle>
					<DialogDescription className="text-xs text-white/60">
						Award a permanent, non-transferable soulbound achievement badge to a recipient.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
					{error && (
						<div
							data-testid="award-badge-error"
							className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300"
						>
							<AlertCircle className="size-4 shrink-0" />
							<span>{error}</span>
						</div>
					)}

					<div className="space-y-1.5">
						<Label htmlFor="badge-type" className="text-xs font-semibold text-white/80">
							Badge Type
						</Label>
						<select
							id="badge-type"
							data-testid="badge-type-select"
							value={selectedType}
							onChange={e => {
								setSelectedType(e.target.value);
								setError(null);
							}}
							className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
						>
							{PRESET_BADGE_TYPES.map(presetItem => (
								<option
									key={presetItem.type}
									value={presetItem.type}
									className="bg-[#06111f] text-white"
								>
									{presetItem.type === 'custom' ? 'Custom Badge...' : presetItem.name}
								</option>
							))}
						</select>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="badge-recipient" className="text-xs font-semibold text-white/80">
							Recipient Stellar Address
						</Label>
						<Input
							id="badge-recipient"
							data-testid="badge-recipient-input"
							placeholder="G..."
							value={recipient}
							onChange={e => {
								setRecipient(e.target.value);
								setError(null);
							}}
							className="border-white/10 bg-white/5 font-mono text-xs text-white"
						/>
						{recipient && !validateRecipient(recipient) && (
							<p className="text-[10px] text-amber-400/80">
								Please enter a valid Stellar address starting with 'G'.
							</p>
						)}
					</div>

					{isCustom && (
						<>
							<div className="space-y-1.5">
								<Label htmlFor="badge-name" className="text-xs font-semibold text-white/80">
									Badge Name
								</Label>
								<Input
									id="badge-name"
									data-testid="badge-name-input"
									placeholder="e.g. Master Contributor"
									value={customName}
									onChange={e => setCustomName(e.target.value)}
									className="border-white/10 bg-white/5 text-sm text-white"
								/>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="badge-desc" className="text-xs font-semibold text-white/80">
									Description
								</Label>
								<Textarea
									id="badge-desc"
									data-testid="badge-description-input"
									placeholder="Describe the criteria or achievement..."
									value={customDescription}
									onChange={e => setCustomDescription(e.target.value)}
									className="border-white/10 bg-white/5 text-sm text-white"
								/>
							</div>
						</>
					)}

					{!isCustom && preset?.description && (
						<p className="rounded-lg bg-white/[0.03] p-2 text-xs text-white/60">
							{preset.description}
						</p>
					)}

					<DialogFooter className="pt-2">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={isSubmitting}
							className="border-white/10 text-white/80 hover:bg-white/10"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							data-testid="award-badge-submit-btn"
							disabled={isSubmitting || !recipient.trim()}
							className="bg-amber-400 font-bold text-slate-950 hover:bg-amber-300"
						>
							{isSubmitting ? 'Awarding...' : 'Award Badge'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default AwardBadgeModal;
