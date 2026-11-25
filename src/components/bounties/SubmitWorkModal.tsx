import { useEffect, useState } from 'react';
import { AlertTriangle, Link2 } from 'lucide-react';
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
import type { Bounty, BountySubmission } from '@/services/bounty.service';
import { computeProofHash } from '@/utils/hash.utils';

export interface SubmitWorkValues {
	link: string;
	description: string;
	proofHash: string;
}

export interface SubmitWorkModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	bounty: Bounty;
	wallet?: string;
	eligibilityReason?: string | null;
	existingSubmission?: BountySubmission;
	isSubmitting?: boolean;
	onSubmit: (values: SubmitWorkValues) => void;
}

export default function SubmitWorkModal({
	open,
	onOpenChange,
	bounty,
	wallet,
	eligibilityReason,
	existingSubmission,
	isSubmitting = false,
	onSubmit,
}: SubmitWorkModalProps) {
	const [link, setLink] = useState('');
	const [description, setDescription] = useState('');
	const [error, setError] = useState<string | null>(null);

	const isResubmission = Boolean(
		existingSubmission?.resubmissionAllowed &&
		!existingSubmission.resubmissionUsed
	);

	useEffect(() => {
		if (!open) return;
		setLink('');
		setDescription('');
		setError(null);
	}, [open, bounty.id]);

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!wallet) {
			setError('Connect your wallet before submitting work.');
			return;
		}
		if (eligibilityReason) {
			setError(eligibilityReason);
			return;
		}
		if (!/^https?:\/\//i.test(link.trim())) {
			setError('Enter a valid http(s) link to your work.');
			return;
		}
		if (description.trim().length < 10) {
			setError('Describe your work in at least 10 characters.');
			return;
		}

		setError(null);
		onSubmit({
			link: link.trim(),
			description: description.trim(),
			proofHash: computeProofHash(link, description),
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="max-w-md border-white/10 bg-[#0b1728] text-white"
				data-testid="submit-work-modal"
			>
				<DialogHeader>
					<DialogTitle className="text-lg font-bold">
						{isResubmission ? 'Resubmit work' : 'Submit work'}
					</DialogTitle>
					<DialogDescription className="text-sm text-white/50">
						{bounty.title} — your work is hashed into a proof on
						submission.
					</DialogDescription>
				</DialogHeader>

				{eligibilityReason && (
					<p
						role="status"
						className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200"
						data-testid="submit-work-gate"
					>
						<AlertTriangle
							className="mt-0.5 size-4 shrink-0"
							aria-hidden="true"
						/>
						{eligibilityReason}
					</p>
				)}

				{existingSubmission?.status === 'rejected' && (
					<p
						className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-white/60"
						data-testid="submit-work-resubmission-state"
					>
						{existingSubmission.resubmissionAllowed
							? 'Your submission was rejected. You have one resubmission available.'
							: 'Your rejected submission has no resubmission remaining.'}
						{existingSubmission.rejectionReason
							? ` Reason: ${existingSubmission.rejectionReason}`
							: ''}
					</p>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="work-link">Work link</Label>
						<div className="relative">
							<Link2
								className="absolute top-2.5 left-2.5 size-4 text-white/35"
								aria-hidden="true"
							/>
							<Input
								id="work-link"
								type="url"
								placeholder="https://…"
								value={link}
								onChange={event => setLink(event.target.value)}
								disabled={Boolean(eligibilityReason)}
								data-testid="submit-work-link"
								className="pl-8"
							/>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="work-description">Description</Label>
						<Textarea
							id="work-description"
							rows={4}
							placeholder="What did you build and where can reviewers find it?"
							value={description}
							onChange={event => setDescription(event.target.value)}
							disabled={Boolean(eligibilityReason)}
							data-testid="submit-work-description"
						/>
					</div>

					{error && (
						<p
							role="alert"
							className="text-xs text-rose-400"
							data-testid="submit-work-error"
						>
							{error}
						</p>
					)}

					<DialogFooter className="gap-2">
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting || Boolean(eligibilityReason)}
							data-testid="submit-work-confirm"
							className="bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300"
						>
							{isSubmitting
								? 'Submitting…'
								: isResubmission
									? 'Resubmit work'
									: 'Submit work'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
