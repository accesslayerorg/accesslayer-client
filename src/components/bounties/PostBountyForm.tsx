import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import type { CreateBountyInput } from '@/services/bounty.service';

export interface PostBountyFormProps {
	keys: Array<{ id: string; name: string }>;
	onSubmit: (input: CreateBountyInput) => void;
	isSubmitting?: boolean;
}

function toDateTimeLocal(daysFromNow: number): string {
	const date = new Date(Date.now() + daysFromNow * 86_400_000);
	return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
		.toISOString()
		.slice(0, 16);
}

export default function PostBountyForm({
	keys,
	onSubmit,
	isSubmitting = false,
}: PostBountyFormProps) {
	const [keyId, setKeyId] = useState(keys[0]?.id ?? '');
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [rewardXlm, setRewardXlm] = useState('');
	const [deadline, setDeadline] = useState(() => toDateTimeLocal(7));
	const [winnersLimit, setWinnersLimit] = useState('1');
	const [holderGated, setHolderGated] = useState(true);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const nextErrors: Record<string, string> = {};
		const reward = Number(rewardXlm);
		const winners = Number(winnersLimit);
		const deadlineMs = new Date(deadline).getTime();

		if (!title.trim()) nextErrors.title = 'Give the bounty a title.';
		if (!Number.isFinite(reward) || reward <= 0)
			nextErrors.reward = 'Reward must be greater than zero.';
		if (!Number.isFinite(deadlineMs) || deadlineMs <= Date.now())
			nextErrors.deadline = 'Deadline must be in the future.';
		if (!Number.isInteger(winners) || winners < 1)
			nextErrors.winners = 'Winner count must be at least one.';

		setErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) return;

		onSubmit({
			keyId,
			keyName: keys.find(key => key.id === keyId)?.name ?? keyId,
			title,
			description,
			rewardStroops: Math.round(reward * STROOPS_PER_XLM),
			deadline: new Date(deadlineMs).toISOString(),
			winnersLimit: winners,
			holderGated,
		});

		setTitle('');
		setDescription('');
		setRewardXlm('');
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5"
			data-testid="post-bounty-form"
		>
			<h2 className="text-lg font-bold text-white">Post a bounty</h2>
			<p className="text-xs text-white/45">
				Rewards are escrowed until you award winners or reclaim after the
				deadline.
			</p>

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor="bounty-key">Key</Label>
					<select
						id="bounty-key"
						value={keyId}
						onChange={event => setKeyId(event.target.value)}
						className="flex h-9 w-full rounded-md border border-white/15 bg-[#0b1728] px-3 text-sm text-white"
						data-testid="post-bounty-key"
					>
						{keys.length === 0 && (
							<option value="">No keys available</option>
						)}
						{keys.map(key => (
							<option key={key.id} value={key.id}>
								{key.name}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="bounty-reward">Reward (XLM per winner)</Label>
					<Input
						id="bounty-reward"
						type="number"
						min="0"
						step="0.0000001"
						placeholder="25"
						value={rewardXlm}
						onChange={event => setRewardXlm(event.target.value)}
						data-testid="post-bounty-reward"
						aria-invalid={Boolean(errors.reward)}
					/>
					{errors.reward && (
						<p role="alert" className="text-xs text-rose-400">
							{errors.reward}
						</p>
					)}
				</div>
			</div>

			<div className="space-y-1.5">
				<Label htmlFor="bounty-title">Title</Label>
				<Input
					id="bounty-title"
					value={title}
					onChange={event => setTitle(event.target.value)}
					placeholder="Design a launch banner"
					data-testid="post-bounty-title"
					aria-invalid={Boolean(errors.title)}
				/>
				{errors.title && (
					<p role="alert" className="text-xs text-rose-400">
						{errors.title}
					</p>
				)}
			</div>

			<div className="space-y-1.5">
				<Label htmlFor="bounty-description">Description</Label>
				<Textarea
					id="bounty-description"
					rows={3}
					value={description}
					onChange={event => setDescription(event.target.value)}
					placeholder="What should holders deliver?"
					data-testid="post-bounty-description"
				/>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor="bounty-deadline">Deadline</Label>
					<Input
						id="bounty-deadline"
						type="datetime-local"
						value={deadline}
						onChange={event => setDeadline(event.target.value)}
						data-testid="post-bounty-deadline"
						aria-invalid={Boolean(errors.deadline)}
					/>
					{errors.deadline && (
						<p role="alert" className="text-xs text-rose-400">
							{errors.deadline}
						</p>
					)}
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="bounty-winners">Winners</Label>
					<Input
						id="bounty-winners"
						type="number"
						min="1"
						step="1"
						value={winnersLimit}
						onChange={event => setWinnersLimit(event.target.value)}
						data-testid="post-bounty-winners"
						aria-invalid={Boolean(errors.winners)}
					/>
					{errors.winners && (
						<p role="alert" className="text-xs text-rose-400">
							{errors.winners}
						</p>
					)}
				</div>
			</div>

			<label className="flex items-center gap-2 text-sm text-white/70">
				<Checkbox
					checked={holderGated}
					onCheckedChange={setHolderGated}
					data-testid="post-bounty-holder-gated"
				/>
				Require holders of this key to submit work
			</label>

			<Button
				type="submit"
				disabled={isSubmitting}
				data-testid="post-bounty-submit"
				className="bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300"
			>
				{isSubmitting ? 'Posting…' : 'Post bounty'}
			</Button>
		</form>
	);
}
