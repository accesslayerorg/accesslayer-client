import { useState } from 'react';
import { useAccount } from 'wagmi';
import { CalendarPlus } from 'lucide-react';
import ConnectWalletButton from '@/components/common/ConnectWalletButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateEvent } from '@/hooks/useEvents';
import { useWalletHoldings } from '@/hooks/useWallet';
import { cn } from '@/lib/utils';

function localDateTime(offsetHours: number): string {
	const date = new Date(Date.now() + offsetHours * 3_600_000);
	const pad = (value: number) => String(value).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
		date.getDate()
	)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function CreateEventForm() {
	const { address } = useAccount();
	const holdingsQuery = useWalletHoldings(address ?? '');
	const createEvent = useCreateEvent();
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [keyId, setKeyId] = useState('');
	const [startsAt, setStartsAt] = useState(() => localDateTime(1));
	const [endsAt, setEndsAt] = useState(() => localDateTime(72));
	const [passSupply, setPassSupply] = useState('50');
	const [perWalletCap, setPerWalletCap] = useState('1');

	const heldKeys = (holdingsQuery.data ?? []).filter(
		position => (position.quantity ?? 0) > 0
	);

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!address || !keyId) return;
		createEvent.mutate({
			creator: address,
			keyId,
			keyName: keyId,
			title,
			description,
			startsAt: new Date(startsAt).toISOString(),
			endsAt: new Date(endsAt).toISOString(),
			passSupply: Number(passSupply),
			perWalletCap: Number(perWalletCap),
		});
		if (!createEvent.isError) {
			setTitle('');
			setDescription('');
			setKeyId('');
		}
	};

	return (
		<section
			className={cn(
				'rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-xl backdrop-blur-md'
			)}
			data-testid="create-event-form"
		>
			<div className="flex items-center gap-2">
				<CalendarPlus
					className="size-4 text-amber-400"
					aria-hidden="true"
				/>
				<h2 className="text-lg font-bold">Create an event</h2>
			</div>
			<p className="mt-1 text-xs text-white/45">
				Redeemable passes are limited to holders of the key you select.
			</p>

			{!address ? (
				<div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
					<p className="text-xs text-amber-100/80">
						Connect your creator wallet to publish an event.
					</p>
					<ConnectWalletButton />
				</div>
			) : heldKeys.length === 0 ? (
				<p className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/45">
					You need to hold a key before you can create a holder event.
				</p>
			) : (
				<form
					onSubmit={handleSubmit}
					className="mt-5 grid gap-4 sm:grid-cols-2"
				>
					<div className="space-y-1.5 sm:col-span-2">
						<Label htmlFor="event-title">Event title</Label>
						<Input
							id="event-title"
							value={title}
							onChange={event => setTitle(event.target.value)}
							placeholder="Holder meetup — Berlin"
							required
							data-testid="event-title"
						/>
					</div>
					<div className="space-y-1.5 sm:col-span-2">
						<Label htmlFor="event-key">Eligibility key</Label>
						<select
							id="event-key"
							value={keyId}
							onChange={event => setKeyId(event.target.value)}
							className="h-9 w-full rounded-md border border-white/15 bg-[#0b1728] px-3 text-sm text-white"
							required
							data-testid="event-key"
						>
							<option value="">Select a key you hold</option>
							{heldKeys.map(position => (
								<option
									key={position.creatorId}
									value={position.creatorId}
								>
									{position.creatorId}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-1.5 sm:col-span-2">
						<Label htmlFor="event-description">Description</Label>
						<Textarea
							id="event-description"
							rows={2}
							value={description}
							onChange={event => setDescription(event.target.value)}
							placeholder="Tell holders what the pass includes"
							data-testid="event-description"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="event-start">Starts</Label>
						<Input
							id="event-start"
							type="datetime-local"
							value={startsAt}
							onChange={event => setStartsAt(event.target.value)}
							required
							data-testid="event-start"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="event-end">Ends</Label>
						<Input
							id="event-end"
							type="datetime-local"
							value={endsAt}
							onChange={event => setEndsAt(event.target.value)}
							required
							data-testid="event-end"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="event-supply">Pass supply</Label>
						<Input
							id="event-supply"
							type="number"
							min={1}
							value={passSupply}
							onChange={event => setPassSupply(event.target.value)}
							required
							data-testid="event-supply"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="event-cap">Per-wallet cap</Label>
						<Input
							id="event-cap"
							type="number"
							min={1}
							value={perWalletCap}
							onChange={event => setPerWalletCap(event.target.value)}
							required
							data-testid="event-cap"
						/>
					</div>
					<div className="sm:col-span-2">
						<Button
							type="submit"
							disabled={createEvent.isPending}
							className="w-full bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300"
							data-testid="event-create-submit"
						>
							{createEvent.isPending ? 'Creating…' : 'Create event'}
						</Button>
					</div>
				</form>
			)}
		</section>
	);
}
