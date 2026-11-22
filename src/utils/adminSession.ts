import type { AdminSessionStatus } from '@/services/adminTwoFactor.types';

const ADMIN_SESSION_KEY = 'accesslayer_admin_session';

export interface AdminSession {
	status: AdminSessionStatus;
	email?: string;
}

export function getAdminSession(): AdminSession | null {
	try {
		const raw = localStorage.getItem(ADMIN_SESSION_KEY);
		return raw ? (JSON.parse(raw) as AdminSession) : null;
	} catch {
		return null;
	}
}

export function setAdminSession(session: AdminSession): void {
	localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

export function clearAdminSession(): void {
	localStorage.removeItem(ADMIN_SESSION_KEY);
}
