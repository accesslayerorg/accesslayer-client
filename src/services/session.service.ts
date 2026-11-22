// src/services/session.service.ts
import { BaseApiService, type APIResponse } from './api.service';

/** A single active login session for the current user. */
export interface Session {
	id: string;
	/** Human-readable device label, e.g. "MacBook Pro". */
	device: string;
	/** Browser or client that opened the session, e.g. "Chrome 121". */
	browser: string;
	/** IP address the session was last seen from. */
	ipAddress: string;
	/** ISO 8601 timestamp of the last authenticated request. */
	lastActiveAt: string;
	/** ISO 8601 timestamp when the session was first created. */
	createdAt: string;
	/**
	 * True for the session making the current request. The API is the source
	 * of truth; the client never assumes which session is current.
	 */
	isCurrent: boolean;
}

export interface SessionsResponse {
	sessions: Session[];
}

class SessionService extends BaseApiService {
	/** List every active session for the current user — GET /auth/sessions */
	async getSessions(userId: string): Promise<SessionsResponse> {
		try {
			const response = await this.api.get<APIResponse<SessionsResponse>>(
				'/auth/sessions',
				{ params: { userId } }
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Revoke a single session — DELETE /auth/sessions/:id
	 *
	 * Revoking the current session is rejected by the API; callers must
	 * exclude it from the list.
	 */
	async revokeSession(sessionId: string): Promise<void> {
		try {
			await this.api.delete(`/auth/sessions/${sessionId}`);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Revoke all sessions except the current one — DELETE /auth/sessions
	 */
	async revokeAllOtherSessions(): Promise<void> {
		try {
			await this.api.delete('/auth/sessions', {
				params: { keepCurrent: true },
			});
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const sessionService = new SessionService();
