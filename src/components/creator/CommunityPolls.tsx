import { useState, useEffect } from 'react';
import { BarChart3, Plus, Vote, Clock, CheckCircle, Lock } from 'lucide-react';

interface PollOption {
	index: number;
	label: string;
	voteWeight: number;
	voterCount: number;
}

interface Poll {
	id: string;
	question: string;
	options: PollOption[];
	createdAt: number;
	expiresAt: number;
	totalVoteWeight: number;
	createdBy: string;
	hasVoted?: boolean;
	votedOption?: number;
}

interface CommunityPollsProps {
	polls: Poll[];
	isCreator: boolean;
	currentWallet?: string;
	onCreatePoll?: (question: string, options: string[], durationHours: number) => Promise<void>;
	onCastVote?: (pollId: string, optionIndex: number) => Promise<void>;
	className?: string;
}

/**
 * Community poll creator and voter UI (#1199).
 * Shows active and closed polls on the key detail page with live result charts.
 */
export function CommunityPolls({
	polls,
	isCreator,
	currentWallet,
	onCreatePoll,
	onCastVote,
	className = '',
}: CommunityPollsProps) {
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [question, setQuestion] = useState('');
	const [options, setOptions] = useState(['', '', '', '']);
	const [durationHours, setDurationHours] = useState(24);
	const [selectedVotes, setSelectedVotes] = useState<Record<string, number>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(interval);
	}, []);

	const activePolls = polls.filter((p) => now < p.expiresAt);
	const closedPolls = polls.filter((p) => now >= p.expiresAt);

	const handleCreate = async () => {
		if (!onCreatePoll || isSubmitting) return;
		const validOptions = options.filter((o) => o.trim().length > 0);
		if (!question.trim() || validOptions.length < 2) return;
		setIsSubmitting(true);
		try {
			await onCreatePoll(question.trim(), validOptions, durationHours);
			setQuestion('');
			setOptions(['', '', '', '']);
			setShowCreateForm(false);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleVote = async (pollId: string) => {
		if (!onCastVote || isSubmitting) return;
		const optionIndex = selectedVotes[pollId];
		if (optionIndex === undefined) return;
		setIsSubmitting(true);
		try {
			await onCastVote(pollId, optionIndex);
		} finally {
			setIsSubmitting(false);
		}
	};

	const formatCountdown = (expiresAt: number) => {
		const remaining = Math.max(expiresAt - now, 0);
		const h = Math.floor(remaining / 3600000);
		const m = Math.floor((remaining % 3600000) / 60000);
		return `${h}h ${m}m`;
	};

	const PollCard = ({ poll }: { poll: Poll }) => {
		const isExpired = now >= poll.expiresAt;
		const totalWeight = poll.totalVoteWeight || 1;

		return (
			<div data-testid={`poll-${poll.id}`} className={`rounded-xl border p-4 ${isExpired ? 'border-white/5 bg-white/[0.01]' : 'border-white/10 bg-white/[0.03]'}`}>
				<div className="flex items-start justify-between gap-3 mb-3">
					<h4 className="text-sm font-semibold text-white">{poll.question}</h4>
					{isExpired ? (
						<span data-testid="poll-closed-badge" className="flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-white/50">
							<Lock className="size-3" /> PollClosed
						</span>
					) : (
						<span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300">
							<Clock className="size-3" /> {formatCountdown(poll.expiresAt)}
						</span>
					)}
				</div>

				{/* Results bar chart */}
				<div className="space-y-2 mb-3">
					{poll.options.map((opt) => {
						const pct = (opt.voteWeight / totalWeight) * 100;
						return (
							<div key={opt.index}>
								<div className="flex items-center justify-between text-xs mb-1">
									<span className="text-white/70">{opt.label}</span>
									<span className="text-white/50">
										{pct.toFixed(1)}% ({opt.voterCount} votes)
									</span>
								</div>
								<div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
									<div
										data-testid={`poll-option-${poll.id}-${opt.index}`}
										className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
										style={{ width: `${pct}%` }}
									/>
								</div>
							</div>
						);
					})}
				</div>

				{/* Vote panel (active polls, holders only) */}
				{!isExpired && !poll.hasVoted && currentWallet && (
					<div data-testid={`vote-panel-${poll.id}`} className="mt-3 border-t border-white/5 pt-3">
						<div className="flex flex-wrap gap-2 mb-2">
							{poll.options.map((opt) => (
								<button
									key={opt.index}
									data-testid={`vote-option-${poll.id}-${opt.index}`}
									onClick={() => setSelectedVotes((prev) => ({ ...prev, [poll.id]: opt.index }))}
									className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
										selectedVotes[poll.id] === opt.index
											? 'bg-blue-500 text-white'
											: 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1]'
									}`}
								>
									{opt.label}
								</button>
							))}
						</div>
						<button
							data-testid={`cast-vote-${poll.id}`}
							onClick={() => handleVote(poll.id)}
							disabled={selectedVotes[poll.id] === undefined || isSubmitting}
							className="w-full rounded-lg bg-blue-500 py-2 text-xs font-bold text-white hover:bg-blue-600 disabled:opacity-50"
						>
							{isSubmitting ? 'Casting…' : 'Cast Vote'}
						</button>
					</div>
				)}

				{/* Already voted indicator */}
				{poll.hasVoted && (
					<div className="mt-3 flex items-center gap-1 text-xs text-green-400">
						<CheckCircle className="size-3" /> You voted for {poll.options[poll.votedOption ?? 0]?.label}
					</div>
				)}

				{/* Vote blocked after expiry */}
				{isExpired && !poll.hasVoted && currentWallet && (
					<div data-testid={`vote-blocked-${poll.id}`} className="mt-3 flex items-center gap-1 text-xs text-white/40">
						<Lock className="size-3" /> Voting closed — poll has expired
					</div>
				)}
			</div>
		);
	};

	return (
		<div data-testid="community-polls" className={`rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md ${className}`}>
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-xl bg-blue-400/10 text-blue-400">
						<BarChart3 className="size-5" />
					</div>
					<div>
						<h2 className="font-grotesque text-xl font-black tracking-tight text-white">Community Polls</h2>
						<p className="text-xs text-white/60">Vote on proposals and see live results</p>
					</div>
				</div>
				{isCreator && (
					<button
						data-testid="create-poll-button"
						onClick={() => setShowCreateForm(!showCreateForm)}
						className="flex items-center gap-1.5 rounded-lg bg-blue-500/20 border border-blue-400/30 px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/30"
					>
						<Plus className="size-3" /> Create Poll
					</button>
				)}
			</div>

			{/* Create poll form */}
			{showCreateForm && isCreator && (
				<div data-testid="create-poll-form" className="mb-6 rounded-xl border border-blue-400/20 bg-blue-400/[0.05] p-4">
					<div className="mb-3">
						<label className="block text-xs font-semibold text-white/70 mb-1">Question</label>
						<input
							type="text"
							value={question}
							onChange={(e) => setQuestion(e.target.value)}
							placeholder="What should we vote on?"
							data-testid="poll-question-input"
							className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-blue-400 focus:outline-none"
						/>
					</div>
					<div className="mb-3">
						<label className="block text-xs font-semibold text-white/70 mb-1">Options (up to 4)</label>
						{options.map((opt, i) => (
							<input
								key={i}
								type="text"
								value={opt}
								onChange={(e) => {
									const next = [...options];
									next[i] = e.target.value;
									setOptions(next);
								}}
								placeholder={`Option ${i + 1}`}
								data-testid={`poll-option-input-${i}`}
								className="mb-2 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-blue-400 focus:outline-none"
							/>
						))}
					</div>
					<div className="mb-4">
						<label className="block text-xs font-semibold text-white/70 mb-1">Duration</label>
						<select
							value={durationHours}
							onChange={(e) => setDurationHours(Number(e.target.value))}
							data-testid="poll-duration-select"
							className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
						>
							<option value={1}>1 hour</option>
							<option value={6}>6 hours</option>
							<option value={24}>24 hours</option>
							<option value={72}>3 days</option>
							<option value={168}>7 days</option>
						</select>
					</div>
					<button
						onClick={handleCreate}
						disabled={isSubmitting || !question.trim() || options.filter((o) => o.trim()).length < 2}
						data-testid="submit-poll-button"
						className="w-full rounded-lg bg-blue-500 py-2 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-50"
					>
						{isSubmitting ? 'Creating…' : 'Create Poll'}
					</button>
				</div>
			)}

			{/* Active polls */}
			{activePolls.length > 0 && (
				<div className="mb-4">
					<h3 className="text-xs font-semibold text-white/50 mb-3">Active Polls</h3>
					<div className="space-y-3">
						{activePolls.map((p) => <PollCard key={p.id} poll={p} />)}
					</div>
				</div>
			)}

			{/* Closed polls */}
			{closedPolls.length > 0 && (
				<div>
					<h3 className="text-xs font-semibold text-white/50 mb-3">Closed Polls</h3>
					<div className="space-y-3">
						{closedPolls.map((p) => <PollCard key={p.id} poll={p} />)}
					</div>
				</div>
			)}

			{/* Empty state */}
			{polls.length === 0 && (
				<div className="text-center py-8 text-white/40 text-sm">
					<Vote className="size-8 mx-auto mb-2 opacity-50" />
					No polls yet
				</div>
			)}
		</div>
	);
}

export default CommunityPolls;
