import { useCallback, useEffect, useRef, useState } from 'react';
import { decodeJwtExpiryMs } from '@/utils/jwt.utils';
import { authService } from '@/services/auth.service';

/** How long before the JWT expires the warning should appear. */
export const SESSION_EXPIRY_WARNING_LEAD_MS = 5 * 60 * 1000; // 5 minutes

export interface UseSessionExpiryWarningOptions {
	/**
	 * How long before expiry to show the warning. Overridable for tests;
	 * defaults to `SESSION_EXPIRY_WARNING_LEAD_MS`.
	 */
	warningLeadMs?: number;
	/**
	 * Called when the user chooses to renew the session. Should
	 * re-trigger whatever re-auth flow establishes a fresh token (e.g. a
	 * wallet challenge-verify round trip, or — as currently wired here —
	 * the existing `POST /auth/refresh` endpoint) without a full logout.
	 * Resolving re-arms the timer against the new token's expiry;
	 * rejecting leaves the warning visible so the user can retry or log
	 * out.
	 */
	onRenew: () => Promise<void>;
	/**
	 * Called when the user chooses to log out from the warning (or when
	 * renewal is abandoned). Typically clears the session and navigates
	 * away.
	 */
	onLogout: () => void;
}

export interface UseSessionExpiryWarningResult {
	/** Whether the "session is about to expire" modal should be shown. */
	isWarningVisible: boolean;
	/** Whether a renew attempt is currently in flight. */
	isRenewing: boolean;
	/** Set when the last renew attempt failed; cleared on retry or dismissal. */
	renewError: string | null;
	/** Call when the user clicks "Renew Session". */
	renewSession: () => Promise<void>;
	/** Call when the user clicks "Log Out". */
	logOut: () => void;
}

/**
 * Watches the current access token's JWT expiry and surfaces a warning
 * `warningLeadMs` before it lapses (#878).
 *
 * The token is read from cookie storage (`authService.getAuthToken()`,
 * the app's actual session store) each time the timer is (re)armed, so
 * logging in, renewing, or logging out from another part of the app is
 * picked up automatically:
 *  - No token, or a token that can't be decoded / has no `exp` claim:
 *    the hook does nothing (no session to watch).
 *  - Token already expired, or expiring within `warningLeadMs`: the
 *    warning is shown immediately rather than scheduling a timer for a
 *    point already in the past.
 *  - Otherwise a single `setTimeout` is scheduled for
 *    `expiry - warningLeadMs`.
 *
 * The timer is cleared on unmount and whenever `logOut` runs, so no
 * warning can fire after the user has already logged out.
 */
export function useSessionExpiryWarning({
	warningLeadMs = SESSION_EXPIRY_WARNING_LEAD_MS,
	onRenew,
	onLogout,
}: UseSessionExpiryWarningOptions): UseSessionExpiryWarningResult {
	const [isWarningVisible, setIsWarningVisible] = useState(false);
	const [isRenewing, setIsRenewing] = useState(false);
	const [renewError, setRenewError] = useState<string | null>(null);

	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearScheduledTimer = useCallback(() => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const scheduleFromCurrentToken = useCallback(() => {
		clearScheduledTimer();

		const token = authService.getAuthToken();
		if (!token) {
			return;
		}

		const expiryMs = decodeJwtExpiryMs(token);
		if (expiryMs === null) {
			return;
		}

		const msUntilWarning = expiryMs - warningLeadMs - Date.now();

		if (msUntilWarning <= 0) {
			setIsWarningVisible(true);
			return;
		}

		timerRef.current = setTimeout(() => {
			setIsWarningVisible(true);
		}, msUntilWarning);
	}, [clearScheduledTimer, warningLeadMs]);

	useEffect(() => {
		scheduleFromCurrentToken();
		return clearScheduledTimer;
	}, [scheduleFromCurrentToken, clearScheduledTimer]);

	const renewSession = useCallback(async () => {
		setIsRenewing(true);
		setRenewError(null);
		try {
			await onRenew();
			setIsWarningVisible(false);
			// The renewed token has a new expiry — re-arm against it.
			scheduleFromCurrentToken();
		} catch (error) {
			setRenewError(
				error instanceof Error
					? error.message
					: 'Failed to renew session. Please try again.'
			);
		} finally {
			setIsRenewing(false);
		}
	}, [onRenew, scheduleFromCurrentToken]);

	const logOut = useCallback(() => {
		// Clear the pending warning timer up front so a race between an
		// in-flight timer callback and logout can't briefly flash the
		// modal after the session is already gone.
		clearScheduledTimer();
		setIsWarningVisible(false);
		setRenewError(null);
		onLogout();
	}, [clearScheduledTimer, onLogout]);

	return {
		isWarningVisible,
		isRenewing,
		renewError,
		renewSession,
		logOut,
	};
}
