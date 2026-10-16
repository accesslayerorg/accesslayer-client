import { AlertCircle, BellRing } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
	useNotificationPreferences,
	type UseNotificationPreferencesOptions,
} from '@/hooks/useNotificationPreferences';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import {
	NOTIFICATION_PREFERENCE_TYPES,
	type NotificationChannel,
} from '@/services/notificationPreferences.service';
import {
	NOTIFICATION_PREFERENCE_COPY,
	SAVE_ERROR_COPY,
	SAVE_SUCCESS_COPY,
} from '@/constants/notificationPreferences';
import showToast from '@/utils/toast.util';

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
	email: 'Email',
	inApp: 'In-app',
};

type NotificationPreferencesPageProps = Pick<
	UseNotificationPreferencesOptions,
	'fetchPreferences' | 'updatePreferences'
>;

export default function NotificationPreferencesPage({
	fetchPreferences,
	updatePreferences,
}: NotificationPreferencesPageProps = {}) {
	useNavigationTiming('notification_preferences');

	const {
		preferences,
		loadStatus,
		saveStatus,
		allEnabled,
		setChannel,
		setAll,
		retrySave,
		reload,
	} = useNotificationPreferences({
		fetchPreferences,
		updatePreferences,
		onSaveSuccess: () => showToast.success(SAVE_SUCCESS_COPY),
		onSaveError: () => showToast.error(SAVE_ERROR_COPY),
	});

	return (
		<main className="mx-auto max-w-3xl px-6 py-16">
			<nav aria-label="Breadcrumb" className="mb-4 text-sm">
				<Link
					to="/notifications"
					className="text-muted-foreground transition-colors hover:text-foreground"
				>
					Notifications
				</Link>
				<span className="mx-2 text-muted-foreground">/</span>
				<span className="text-foreground">Preferences</span>
			</nav>

			<div className="mb-8 flex items-center gap-3">
				<BellRing className="size-6 text-foreground" aria-hidden="true" />
				<div>
					<h1 className="font-jakarta text-2xl font-semibold">
						Notification preferences
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Choose which platform events reach you by email or in the app.
						Changes save automatically.
					</p>
				</div>
			</div>

			{loadStatus === 'loading' && (
				<div
					data-testid="notification-preferences-loading"
					className="space-y-3"
				>
					{NOTIFICATION_PREFERENCE_TYPES.map(type => (
						<div
							key={type}
							className="h-16 w-full animate-pulse rounded-xl bg-muted"
						/>
					))}
				</div>
			)}

			{loadStatus === 'error' && (
				<div
					role="alert"
					className="flex flex-col items-center gap-4 rounded-2xl border border-border py-12 text-center"
				>
					<AlertCircle
						className="size-6 text-destructive"
						aria-hidden="true"
					/>
					<p className="text-sm text-muted-foreground">
						We couldn't load your notification preferences.
					</p>
					<Button variant="outline" size="sm" onClick={reload}>
						Try again
					</Button>
				</div>
			)}

			{loadStatus === 'ready' && preferences && (
				<>
					{saveStatus === 'error' && (
						<div
							role="alert"
							className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
						>
							<span className="flex items-center gap-2 text-destructive">
								<AlertCircle className="size-4" aria-hidden="true" />
								{SAVE_ERROR_COPY} Your last change was undone.
							</span>
							<Button variant="outline" size="sm" onClick={retrySave}>
								Retry
							</Button>
						</div>
					)}

					<div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-4">
						<div>
							<p
								id="notification-preferences-all-label"
								className="text-sm font-medium text-foreground"
							>
								All notifications
							</p>
							<p className="mt-0.5 text-xs text-muted-foreground">
								{allEnabled
									? 'Every type is on for email and in-app.'
									: 'Turn every type on for both channels.'}
							</p>
						</div>
						<div className="flex items-center gap-3">
							<span
								aria-live="polite"
								className="text-xs text-muted-foreground"
							>
								{saveStatus === 'saving' ? 'Saving…' : ''}
							</span>
							<Switch
								checked={allEnabled}
								onCheckedChange={setAll}
								aria-labelledby="notification-preferences-all-label"
							/>
						</div>
					</div>

					<table className="w-full overflow-hidden rounded-xl border border-border text-left">
						<thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
							<tr>
								<th scope="col" className="px-4 py-3 font-medium">
									Event
								</th>
								{(
									Object.keys(CHANNEL_LABELS) as NotificationChannel[]
								).map(channel => (
									<th
										key={channel}
										scope="col"
										className="w-24 px-4 py-3 text-center font-medium"
									>
										{CHANNEL_LABELS[channel]}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{NOTIFICATION_PREFERENCE_TYPES.map(type => {
								const copy = NOTIFICATION_PREFERENCE_COPY[type];
								return (
									<tr
										key={type}
										data-testid={`notification-preference-${type}`}
									>
										<th scope="row" className="px-4 py-4 font-normal">
											<p className="text-sm font-medium text-foreground">
												{copy.label}
											</p>
											<p className="mt-0.5 text-xs text-muted-foreground">
												{copy.description}
											</p>
										</th>
										{(
											Object.keys(
												CHANNEL_LABELS
											) as NotificationChannel[]
										).map(channel => (
											<td
												key={channel}
												className="px-4 py-4 text-center"
											>
												<Switch
													checked={preferences[type][channel]}
													onCheckedChange={enabled =>
														setChannel(type, channel, enabled)
													}
													aria-label={`${copy.label} ${CHANNEL_LABELS[channel].toLowerCase()} notifications`}
												/>
											</td>
										))}
									</tr>
								);
							})}
						</tbody>
					</table>
				</>
			)}
		</main>
	);
}
