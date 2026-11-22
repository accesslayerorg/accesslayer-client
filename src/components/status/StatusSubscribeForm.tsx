import { useState, type FormEvent } from 'react';
import { Bell, Mail } from 'lucide-react';
import { AsyncButton } from '@/components/ui/async-button';
import { useStatusSubscription } from '@/hooks/useStatusSubscription';
import { ApiError } from '@/services/api.service';
import { isValidSubscriberEmail } from '@/utils/status.utils';

/**
 * Email capture for incident notifications (#1051).
 *
 * Submission posts to the status notification endpoint via
 * `useStatusSubscription`; success and failure copy is rendered inline so
 * the form works without a toast host.
 */
export default function StatusSubscribeForm() {
	const [email, setEmail] = useState('');
	const [validationError, setValidationError] = useState<string | null>(null);
	const [subscribedEmail, setSubscribedEmail] = useState<string | null>(null);
	const { mutateAsync, isPending, error, reset } = useStatusSubscription();

	const errorMessage =
		error == null
			? null
			: error instanceof ApiError
				? error.message
				: 'We could not save your subscription. Please try again.';

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const trimmed = email.trim();
		if (!isValidSubscriberEmail(trimmed)) {
			setValidationError('Enter a valid email address.');
			return;
		}

		setValidationError(null);
		setSubscribedEmail(null);
		reset();

		try {
			await mutateAsync(trimmed);
			setSubscribedEmail(trimmed);
			setEmail('');
		} catch {
			// The mutation error is rendered below; nothing else to do here.
		}
	};

	return (
		<section
			aria-labelledby="status-subscribe-heading"
			className="rounded-2xl border border-border bg-card p-6"
		>
			<div className="flex items-start gap-3">
				<span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground">
					<Bell className="size-4" aria-hidden="true" />
				</span>
				<div>
					<h2
						id="status-subscribe-heading"
						className="font-jakarta text-sm font-semibold text-foreground"
					>
						Subscribe to status updates
					</h2>
					<p className="mt-1 text-xs leading-5 text-muted-foreground">
						Get an email when an incident opens or resolves across contract
						RPC, the indexer, the API, or IPFS.
					</p>
				</div>
			</div>

			<form
				onSubmit={handleSubmit}
				noValidate
				className="mt-5 flex flex-col gap-3 sm:flex-row"
			>
				<div className="flex-1">
					<label htmlFor="status-subscribe-email" className="sr-only">
						Email address
					</label>
					<div className="relative">
						<Mail
							className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
							aria-hidden="true"
						/>
						<input
							id="status-subscribe-email"
							name="email"
							type="email"
							inputMode="email"
							autoComplete="email"
							placeholder="you@example.com"
							value={email}
							onChange={event => setEmail(event.target.value)}
							aria-invalid={validationError ? true : undefined}
							aria-describedby={
								validationError ? 'status-subscribe-error' : undefined
							}
							className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive"
						/>
					</div>
				</div>

				<AsyncButton
					type="submit"
					isPending={isPending}
					pendingText="Subscribing…"
					className="h-11 rounded-xl px-5 font-jakarta text-sm font-semibold"
				>
					Subscribe
				</AsyncButton>
			</form>

			{validationError && (
				<p
					id="status-subscribe-error"
					role="alert"
					className="mt-3 text-xs font-medium text-red-600 dark:text-red-400"
				>
					{validationError}
				</p>
			)}

			{!validationError && errorMessage && (
				<p
					role="alert"
					className="mt-3 text-xs font-medium text-red-600 dark:text-red-400"
				>
					{errorMessage}
				</p>
			)}

			{subscribedEmail && (
				<p
					data-testid="status-subscribe-success"
					role="status"
					aria-live="polite"
					className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400"
				>
					{subscribedEmail} is subscribed. You will hear from us the next time
					something breaks.
				</p>
			)}
		</section>
	);
}
