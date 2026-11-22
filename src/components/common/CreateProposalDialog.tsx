import { useState, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { useCreateProposalMutation } from '@/hooks/useGovernanceProposals';
import type { CreateProposalPayload, Proposal } from '@/types/governance';

export interface CreateProposalFormProps {
	onSubmit: (payload: CreateProposalPayload) => void | Promise<void>;
	onCancel?: () => void;
	isSubmitting?: boolean;
	error?: string | null;
	submitLabel?: string;
	idPrefix?: string;
}

const FIELD_CLASS =
	'w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50';

/** Shared accessible governance proposal form (#1273). */
export function CreateProposalForm({
	onSubmit,
	onCancel,
	isSubmitting = false,
	error,
	submitLabel = 'Submit Proposal',
	idPrefix = 'create-proposal',
}: CreateProposalFormProps) {
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [endDate, setEndDate] = useState('');

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		void onSubmit({ title: title.trim(), description: description.trim(), endDate });
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<label
					htmlFor={`${idPrefix}-title`}
					className="text-sm font-semibold text-white/70"
				>
					Title
				</label>
				<input
					id={`${idPrefix}-title`}
					name="title"
					type="text"
					value={title}
					onChange={event => setTitle(event.target.value)}
					placeholder="e.g. Increase quorum threshold to 60%"
					className={FIELD_CLASS}
					required
				/>
			</div>

			<div className="space-y-2">
				<label
					htmlFor={`${idPrefix}-description`}
					className="text-sm font-semibold text-white/70"
				>
					Description
				</label>
				<textarea
					id={`${idPrefix}-description`}
					name="description"
					value={description}
					onChange={event => setDescription(event.target.value)}
					placeholder="Explain the rationale for this proposal..."
					rows={4}
					className={FIELD_CLASS}
					required
				/>
			</div>

			<div className="space-y-2">
				<label
					htmlFor={`${idPrefix}-end-date`}
					className="text-sm font-semibold text-white/70"
				>
					Voting end date
				</label>
				<input
					id={`${idPrefix}-end-date`}
					name="endDate"
					type="date"
					value={endDate}
					onChange={event => setEndDate(event.target.value)}
					className={FIELD_CLASS}
					required
				/>
			</div>

			{error && (
				<p role="alert" className="text-sm text-red-300">
					{error}
				</p>
			)}

			<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				{onCancel && (
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
				)}
				<Button type="submit" disabled={isSubmitting} className="font-bold">
					{isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
					{isSubmitting ? 'Submitting…' : submitLabel}
				</Button>
			</div>
		</form>
	);
}

function MutationCreateProposalForm({
	creatorId,
	onSubmitted,
	onCancel,
}: {
	creatorId?: string;
	onSubmitted?: (proposal: Proposal) => void;
	onCancel?: () => void;
}) {
	const mutation = useCreateProposalMutation(creatorId);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (payload: CreateProposalPayload) => {
		setError(null);
		try {
			let created: Proposal;
			if (mutation.mutateAsync) {
				created = await mutation.mutateAsync(payload);
			} else {
				created = await new Promise<Proposal>((resolve, reject) => {
					mutation.mutate(payload, {
						onSuccess: resolve,
						onError: reject,
					});
				});
			}
			onSubmitted?.(created);
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Failed to submit proposal'
			);
		}
	};

	return (
		<CreateProposalForm
			onSubmit={handleSubmit}
			onCancel={onCancel}
			isSubmitting={mutation.isPending}
			error={error}
		/>
	);
}

export interface CreateProposalDialogProps {
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	creatorId?: string;
	onSubmit?: (payload: CreateProposalPayload) => void | Promise<void>;
	onSuccess?: (proposal: Proposal) => void;
	trigger?: ReactNode;
}

export function CreateProposalDialog({
	open,
	defaultOpen = false,
	onOpenChange,
	creatorId,
	onSubmit,
	onSuccess,
	trigger,
}: CreateProposalDialogProps) {
	const [internalOpen, setInternalOpen] = useState(defaultOpen);
	const isOpen = open ?? internalOpen;

	const setOpen = (next: boolean) => {
		if (open === undefined) setInternalOpen(next);
		onOpenChange?.(next);
	};

	return (
		<Dialog open={isOpen} onOpenChange={setOpen}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Proposal</DialogTitle>
					<DialogDescription>
						Submit a governance proposal for on-chain voting.
					</DialogDescription>
				</DialogHeader>
				{onSubmit ? (
					<CreateProposalForm
						onSubmit={onSubmit}
						onCancel={() => setOpen(false)}
					/>
				) : (
					<MutationCreateProposalForm
						creatorId={creatorId}
						onSubmitted={proposal => {
							onSuccess?.(proposal);
							setOpen(false);
						}}
						onCancel={() => setOpen(false)}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

export default CreateProposalDialog;
