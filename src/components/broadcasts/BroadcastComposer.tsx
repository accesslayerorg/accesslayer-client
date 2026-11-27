import { useMemo, useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	BroadcastError,
	MAX_BROADCASTS_PER_MONTH,
	MAX_SUBJECT_LENGTH,
	limitMessage,
	renderBroadcastEmail,
	type Audience,
} from '@/services/broadcasts.service';

export interface ComposerSubmit {
	subject: string;
	body: string;
	minBalance: number;
	scheduledFor: Date | null;
}

interface BroadcastComposerProps {
	keyName: string;
	audience: (minBalance: number) => Audience;
	remaining: number;
	busy: boolean;
	onSubmit: (input: ComposerSubmit) => Promise<void>;
}

const origin = () => (typeof window === 'undefined' ? '' : window.location.origin);

/** Compose, preview and send or schedule a holder email (#1476). */
export default function BroadcastComposer({ keyName, audience, remaining, busy, onSubmit }: BroadcastComposerProps) {
	const [subject, setSubject] = useState('');
	const [body, setBody] = useState('');
	const [minBalance, setMinBalance] = useState('1');
	const [scheduleAt, setScheduleAt] = useState('');
	const [error, setError] = useState<string | null>(null);

	const min = Math.max(1, Math.floor(Number(minBalance)) || 1);
	const reach = useMemo(() => audience(min), [audience, min]);
	const preview = renderBroadcastEmail(
		{ id: 'preview', subject: subject || '(no subject)', body: body || '(your message)' },
		{ unsubscribeToken: 'your-token' },
		{ origin: origin(), keyName }
	);
	const limitReached = remaining === 0;

	const submit = async (scheduled: boolean) => {
		setError(null);
		const scheduledFor = scheduled ? new Date(scheduleAt) : null;
		if (scheduled && (!scheduleAt || Number.isNaN(scheduledFor!.getTime()))) {
			setError('Pick a date and time to schedule.');
			return;
		}
		try {
			await onSubmit({ subject, body, minBalance: min, scheduledFor });
			setSubject('');
			setBody('');
			setScheduleAt('');
		} catch (e) {
			setError(e instanceof BroadcastError ? e.message : 'The broadcast could not be sent. Try again.');
		}
	};

	return (
		<form
			noValidate
			aria-label="Compose email broadcast"
			className="space-y-4"
			onSubmit={e => {
				e.preventDefault();
				void submit(false);
			}}
		>
			<p className="text-sm text-white/60" data-testid="broadcast-allowance">
				{remaining} of {MAX_BROADCASTS_PER_MONTH} broadcasts left this month
			</p>
			{limitReached && (
				<p role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
					{limitMessage(new Date())}
				</p>
			)}

			<div>
				<Label htmlFor="broadcast-subject">Subject</Label>
				<Input id="broadcast-subject" value={subject} maxLength={MAX_SUBJECT_LENGTH} onChange={e => setSubject(e.target.value)} className="mt-1" />
			</div>
			<div>
				<Label htmlFor="broadcast-body">Message</Label>
				<Textarea id="broadcast-body" rows={6} value={body} onChange={e => setBody(e.target.value)} className="mt-1" />
			</div>
			<div className="flex flex-wrap items-end gap-4">
				<div>
					<Label htmlFor="broadcast-min-balance">Minimum keys held</Label>
					<Input id="broadcast-min-balance" type="number" min={1} step={1} value={minBalance} onChange={e => setMinBalance(e.target.value)} className="mt-1 w-32" />
				</div>
				<p aria-live="polite" className="pb-2 text-sm" data-testid="broadcast-audience">
					<span className="font-mono font-bold text-white">{reach.recipients.length}</span>{' '}
					<span className="text-white/60">
						opted-in holder{reach.recipients.length === 1 ? '' : 's'} will receive this ({reach.eligibleHolders} hold {min}+ key{min === 1 ? '' : 's'})
					</span>
				</p>
			</div>

			<details className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
				<summary className="cursor-pointer font-bold">Preview</summary>
				<p className="mt-2 font-bold">{preview.subject}</p>
				<pre className="mt-1 whitespace-pre-wrap font-sans text-white/70" data-testid="broadcast-preview">{preview.text}</pre>
			</details>

			{error && <p role="alert" className="text-sm text-red-300">{error}</p>}

			<div className="flex flex-wrap items-end gap-3">
				<Button type="submit" disabled={busy || limitReached} className="gap-2 bg-amber-400 font-bold text-slate-950 hover:bg-amber-300">
					<Mail className="size-4" aria-hidden="true" /> Send now
				</Button>
				<div className="flex items-end gap-2">
					<div>
						<Label htmlFor="broadcast-schedule-at">Or schedule for</Label>
						<Input id="broadcast-schedule-at" type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} className="mt-1" />
					</div>
					<Button type="button" variant="outline" disabled={busy || limitReached} onClick={() => void submit(true)} className="border-white/10 bg-white/[0.03] text-white">
						Schedule
					</Button>
				</div>
			</div>
		</form>
	);
}
