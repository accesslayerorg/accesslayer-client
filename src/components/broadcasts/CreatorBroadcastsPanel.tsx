import Skeleton from '@/components/ui/skeleton';
import BroadcastComposer from '@/components/broadcasts/BroadcastComposer';
import BroadcastHistory from '@/components/broadcasts/BroadcastHistory';
import { useBroadcasts } from '@/hooks/useBroadcasts';
import showToast from '@/utils/toast.util';

/** Creator dashboard section for holder email broadcasts (#1476). */
export default function CreatorBroadcastsPanel({ keyId, keyName }: { keyId: string; keyName: string }) {
	const b = useBroadcasts(keyId);
	if (b.isLoading) return <Skeleton className="h-48 w-full" />;
	if (b.isError)
		return (
			<p role="alert" className="text-sm text-red-300">
				Holders could not be loaded, so the audience cannot be counted right now.
			</p>
		);
	return (
		<div className="space-y-8">
			<BroadcastComposer
				keyName={keyName}
				audience={b.audience}
				remaining={b.remaining}
				busy={b.send.isPending || b.schedule.isPending}
				onSubmit={async ({ scheduledFor, ...input }) => {
					if (scheduledFor) {
						await b.schedule.mutateAsync({ ...input, scheduledFor });
						showToast.success('Broadcast scheduled');
					} else {
						const sent = await b.send.mutateAsync(input);
						showToast.success(`Broadcast sent to ${sent.recipients.length} holder${sent.recipients.length === 1 ? '' : 's'}`);
					}
				}}
			/>
			<div>
				<h3 className="mb-2 font-bold">History</h3>
				<BroadcastHistory broadcasts={b.history} onCancel={id => b.cancel.mutate(id)} />
			</div>
		</div>
	);
}
