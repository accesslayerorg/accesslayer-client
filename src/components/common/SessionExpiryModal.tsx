import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StableButtonContent } from '@/components/ui/stable-button-content';

export interface SessionExpiryModalProps {
	open: boolean;
	isRenewing: boolean;
	renewError: string | null;
	onRenew: () => void;
	onLogout: () => void;
}

/**
 * Warns the user their session is about to expire and offers to renew it
 * in place, or log out (#878).
 *
 * Built on the shared `Dialog`/`DialogContent` primitive, so it inherits
 * the app-wide modal a11y contract (role="dialog", aria-modal,
 * aria-labelledby via DialogTitle, focus trap, Escape dismissal, focus
 * restore — see #876) automatically.
 */
export default function SessionExpiryModal({
	open,
	isRenewing,
	renewError,
	onRenew,
	onLogout,
}: SessionExpiryModalProps) {
	return (
		<Dialog open={open}>
			<DialogContent
				showCloseButton={false}
				// Losing the session is a meaningful state change the user
				// should act on deliberately — don't let a stray Escape or
				// an outside click dismiss it into ambiguity. "Log Out" is
				// always available as an explicit, unambiguous action.
				// showEscapeHint is turned off to match: the "Esc to close"
				// hint would otherwise be actively misleading here, since
				// Escape is intentionally disabled below.
				showEscapeHint={false}
				onEscapeKeyDown={event => event.preventDefault()}
				onInteractOutside={event => event.preventDefault()}
			>
				<DialogHeader>
					<DialogTitle>Session expiring soon</DialogTitle>
					<DialogDescription>
						Your session expires in 5 minutes. Renew to stay logged in.
					</DialogDescription>
				</DialogHeader>

				{renewError && (
					<p
						role="alert"
						aria-live="polite"
						data-testid="session-expiry-renew-error"
						className="text-sm text-red-400"
					>
						{renewError}
					</p>
				)}

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={onLogout}
						disabled={isRenewing}
						data-testid="session-expiry-logout-button"
					>
						Log Out
					</Button>
					<Button
						type="button"
						onClick={onRenew}
						disabled={isRenewing}
						data-testid="session-expiry-renew-button"
					>
						<StableButtonContent
							isLoading={isRenewing}
							loadingLabel="Renewing…"
						>
							Renew Session
						</StableButtonContent>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
