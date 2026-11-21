import { AlertCircle, BellRing, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
	useNotificationPreferences,
	type UseNotificationPreferencesOptions,
} from '@/hooks/useNotificationPreferences';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { NOTIFICATION_PREFERENCE_TYPES } from '@/services/notificationPreferences.service';
import {
	NOTIFICATION_PREFERENCE_COPY,
	SAVE_ERROR_COPY,
	SAVE_SUCCESS_COPY,
} from '@/constants/notificationPreferences';
import showToast from '@/utils/toast.util';

export type NotificationPreferencesPageProps = Pick<
	UseNotificationPreferencesOptions,
	'fetchPreferences' | 'updatePreferences'
>;

export default function NotificationPreferencesPage({
	fetchPreferences,
	updatePreferences,
}: NotificationPreferencesPageProps = {}) {
	useNavigationTiming('notification_preferences');
	const { address, activeSigner, loading: walletLoading } = useStellarWallet();
	const {
		preferences,
		loadStatus,
		saveStatus,
		hasChanges,
		setPreference,
		save,
		reload,
	} = useNotificationPreferences({
		address,
		signer: activeSigner,
		fetchPreferences,
		updatePreferences,
		onSaveSuccess: () => showToast.success(SAVE_SUCCESS_COPY),
		onSaveError: () => showToast.error(SAVE_ERROR_COPY),
	});

	return (
		<main className="mx-auto max-w-3xl px-6 py-16">
			<nav aria-label="Breadcrumb" className="mb-4 text-sm">
				<Link
					to="/settings"
					className="text-muted-foreground transition-colors hover:text-foreground"
				>
					Settings
				</Link>
				<span className="mx-2 text-muted-foreground">/</span>
				<span className="text-foreground">Notification preferences</span>
			</nav>

			<div className="mb-8 flex items-center gap-3">
				<BellRing className="size-6 text-foreground" aria-hidden="true" />
				<div>
					<h1 className="font-jakarta text-2xl font-semibold">
						Notification preferences
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Choose which on-chain alerts you receive.
					</p>
				</div>
			</div>

			{(walletLoading || loadStatus === 'loading') && (
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

			{!walletLoading && loadStatus === 'disconnected' && (
				<p className="rounded-xl border border-border px-4 py-6 text-sm text-muted-foreground">
					Connect your Stellar wallet to manage on-chain alert preferences.
				</p>
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
						<p
							role="alert"
							className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
						>
							{SAVE_ERROR_COPY}
						</p>
					)}

					<div className="overflow-hidden rounded-xl border border-border">
						{NOTIFICATION_PREFERENCE_TYPES.map((type, index) => {
							const copy = NOTIFICATION_PREFERENCE_COPY[type];
							return (
								<div
									key={type}
									data-testid={`notification-preference-${type}`}
									className={`flex items-center justify-between gap-4 px-4 py-4 ${
										index > 0 ? 'border-t border-border' : ''
									}`}
								>
									<div>
										<p
											id={`notification-preference-${type}-label`}
											className="text-sm font-medium text-foreground"
										>
											{copy.label}
										</p>
										<p className="mt-0.5 text-xs text-muted-foreground">
											{copy.description}
										</p>
									</div>
									<Switch
										checked={preferences[type]}
										onCheckedChange={enabled =>
											setPreference(type, enabled)
										}
										disabled={saveStatus === 'saving'}
										aria-labelledby={`notification-preference-${type}-label`}
									/>
								</div>
							);
						})}
					</div>

					<div className="mt-6 flex items-center justify-end gap-4">
						{saveStatus === 'saving' && (
							<span
								aria-live="polite"
								className="flex items-center gap-2 text-sm text-muted-foreground"
							>
								<LoaderCircle
									className="size-4 animate-spin"
									aria-hidden="true"
								/>
								Saving…
							</span>
						)}
						<Button
							type="button"
							onClick={() => void save()}
							disabled={
								!activeSigner || !hasChanges || saveStatus === 'saving'
							}
						>
							Save preferences
						</Button>
					</div>
				</>
			)}
		</main>
	);
}
