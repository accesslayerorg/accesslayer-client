import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { unsubscribeByToken, type EmailSubscription } from '@/services/broadcasts.service';

/**
 * One-click unsubscribe from creator emails (#1476) at /unsubscribe/:token.
 * Opening the link is enough; the opt-out applies before the next send.
 */
export default function UnsubscribePage() {
	const { token = '' } = useParams<{ token: string }>();
	const [params] = useSearchParams();
	const broadcastId = params.get('b');
	const [result, setResult] = useState<EmailSubscription | null | undefined>(undefined);

	useEffect(() => {
		setResult(unsubscribeByToken(token, broadcastId));
	}, [token, broadcastId]);

	return (
		<main className="mx-auto max-w-xl px-6 py-20 text-center">
			{result === undefined ? (
				<p aria-busy="true">Unsubscribing…</p>
			) : result === null ? (
				<>
					<h1 className="font-jakarta text-2xl font-semibold">Link not recognised</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						This unsubscribe link is invalid. You can manage creator emails in{' '}
						<Link to="/settings/notifications" className="underline">notification settings</Link>.
					</p>
				</>
			) : (
				<>
					<h1 className="font-jakarta text-2xl font-semibold">You are unsubscribed</h1>
					<p role="status" className="mt-2 text-sm text-muted-foreground">
						You will not get any more emails from this creator. You can opt back in from{' '}
						<Link to="/settings/notifications" className="underline">notification settings</Link>.
					</p>
				</>
			)}
		</main>
	);
}
