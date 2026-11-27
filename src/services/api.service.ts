import { env } from '@/utils/env.utils';
import { recordRecentError } from '@/utils/recentErrors.utils';
import axios, { type AxiosInstance, AxiosError } from 'axios';
import Cookies from 'js-cookie';

export interface APIResponse<T = undefined> {
	success: boolean;
	data: T;
	message: string;
}

export interface APIErrorResponse {
	success: false;
	message: string;
	code?: string;
	errors?: Array<{
		field?: string;
		message: string;
	}>;
}

// Minimal shape of the OpenAPI document served at GET /v1/openapi.json.
// Only the parts the docs portal relies on are typed; the rest is passed
// through untouched so the portal can render whatever the server emits.
export interface OpenApiDocument {
	openapi: string;
	info: {
		title: string;
		version: string;
		description?: string;
	};
	servers?: Array<{ url: string; description?: string }>;
	tags?: Array<{ name: string; description?: string }>;
	paths: Record<string, OpenApiPathItem>;
	components?: {
		schemas?: Record<string, unknown>;
		securitySchemes?: Record<string, unknown>;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

export interface OpenApiOperation {
	tags?: string[];
	summary?: string;
	description?: string;
	operationId?: string;
	parameters?: unknown[];
	requestBody?: unknown;
	responses?: Record<string, unknown>;
	security?: Array<Record<string, string[]>>;
	[key: string]: unknown;
}

export type OpenApiPathItem = Record<string, OpenApiOperation | unknown>;

export class ApiError extends Error {
	public status: number;
	public response?: APIErrorResponse;

	constructor(
		message: string,
		status: number = 500,
		response?: APIErrorResponse
	) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.response = response;
	}
}

// Thrown when the server responds 451 (access restricted for the connected wallet).
// Intentionally carries no screening details: only a neutral message is exposed.
export class RestrictedAccessError extends ApiError {
	constructor() {
		super('Access to this service is restricted for this wallet.', 451);
		this.name = 'RestrictedAccessError';
	}
}

export function isRestrictedAccessError(
	error: unknown
): error is RestrictedAccessError {
	return error instanceof RestrictedAccessError;
}

// Listeners notified when a 451 is received, so access state can be updated
// (e.g. useAccessStatus). Kept free of any screening details.
type RestrictedListener = () => void;
const restrictedListeners = new Set<RestrictedListener>();

export function onRestrictedAccess(listener: RestrictedListener): () => void {
	restrictedListeners.add(listener);
	return () => {
		restrictedListeners.delete(listener);
	};
}

function notifyRestrictedAccess(): void {
	restrictedListeners.forEach(listener => {
		try {
			listener();
		} catch {
			// Listener failures must not affect request error handling.
		}
	});
}

// ---------------------------------------------------------------------------
// Rate limiting (#1402)
// ---------------------------------------------------------------------------

// Default backoff (ms) used when a 429 arrives without a usable Retry-After.
export const DEFAULT_RATE_LIMIT_BACKOFF_MS = 30_000;

export interface RateLimitState {
	// Endpoint name only (no query string / ids) — safe for analytics.
	endpoint: string;
	// Epoch ms at which the wait period ends.
	retryAt: number;
}

let rateLimitState: RateLimitState | null = null;
const rateLimitListeners = new Set<(state: RateLimitState | null) => void>();

function notifyRateLimitListeners(): void {
	rateLimitListeners.forEach(listener => listener(rateLimitState));
}

// Read the current rate-limit state (null when no wait is active).
export function getRateLimitState(): RateLimitState | null {
	return rateLimitState;
}

// Subscribe to rate-limit state changes. Returns an unsubscribe function.
export function subscribeRateLimit(
	listener: (state: RateLimitState | null) => void
): () => void {
	rateLimitListeners.add(listener);
	return () => {
		rateLimitListeners.delete(listener);
	};
}

// Clear the rate-limit state once the wait has elapsed.
export function clearRateLimitState(): void {
	rateLimitState = null;
	notifyRateLimitListeners();
}

// True while a rate-limit wait is active.
export function isRateLimited(now: number = Date.now()): boolean {
	return rateLimitState !== null && rateLimitState.retryAt > now;
}

// Parse a Retry-After header value (seconds or HTTP date) into a wait in ms.
// Falls back to the default backoff when missing or unparseable.
export function parseRetryAfter(
	headerValue: string | number | null | undefined,
	now: number = Date.now()
): number {
	if (headerValue === null || headerValue === undefined) {
		return DEFAULT_RATE_LIMIT_BACKOFF_MS;
	}

	const raw = String(headerValue).trim();
	if (raw === '') {
		return DEFAULT_RATE_LIMIT_BACKOFF_MS;
	}

	// Numeric seconds (may be fractional).
	if (/^\d+(\.\d+)?$/.test(raw)) {
		const seconds = Number(raw);
		if (!Number.isFinite(seconds) || seconds < 0) {
			return DEFAULT_RATE_LIMIT_BACKOFF_MS;
		}
		return Math.round(seconds * 1000);
	}

	// HTTP date.
	const parsedDate = Date.parse(raw);
	if (!Number.isNaN(parsedDate)) {
		return Math.max(0, parsedDate - now);
	}

	return DEFAULT_RATE_LIMIT_BACKOFF_MS;
}

// Derive an endpoint name (path only) from a request URL for analytics.
export function getEndpointName(url: string | undefined): string {
	if (!url) return 'unknown';
	try {
		const parsed = new URL(url, 'http://localhost');
		return parsed.pathname;
	} catch {
		return url.split('?')[0] || 'unknown';
	}
}

function publishRateLimit(endpoint: string, retryAfterMs: number): void {
	const retryAt = Date.now() + retryAfterMs;
	// Keep the furthest-out wait if multiple 429s arrive in quick succession.
	if (rateLimitState && rateLimitState.retryAt > retryAt) {
		return;
	}
	rateLimitState = { endpoint, retryAt };
	notifyRateLimitListeners();
}

// BASE CLASS - All services inherit from this
export class BaseApiService {
	protected api: AxiosInstance;
	protected API_URL: string;
	private ACCESS_TOKEN: string = 'course_hub_access_token';
	private REFRESH_TOKEN: string = 'course_hub_refresh_token';

	constructor() {
		this.API_URL = env.VITE_BACKEND_URL;

		this.api = axios.create({
			baseURL: this.API_URL,
			withCredentials: true, // Send cookies
		});

		this.setupInterceptors();
	}

	private setupInterceptors() {
		// Response interceptor - handles token refresh and restricted access
		this.api.interceptors.response.use(
			response => response,
			async error => {
				const originalRequest = error.config;

				// Sanctioned / restricted address: map 451 to RestrictedAccessError.
				// Callers should check isRestrictedAccessError() and render RestrictedAccessScreen;
				// no screening details are exposed or logged here.
				if (error.response?.status === 451) {
					notifyRestrictedAccess();
					return Promise.reject(new RestrictedAccessError());
				}

				if (
					error.response?.status === 401 &&
					error.response?.data?.code === 'TOKEN_EXPIRED' &&
					!originalRequest._retry
				) {
					originalRequest._retry = true;

					try {
						// Call refresh endpoint
						await this.api.post('/auth/refresh');

						// Retry original request
						return this.api(originalRequest);
					} catch (refreshError) {
						// Refresh failed - clear auth and redirect
						this.clearAuth();
						window.location.href = '/login';
						return Promise.reject(refreshError);
					}
				}

				if (error.response?.status === 429) {
					const retryAfterMs = parseRetryAfter(
						error.response.headers?.['retry-after']
					);
					const endpoint = getEndpointName(originalRequest?.url);
					publishRateLimit(endpoint, retryAfterMs);
				}

				return Promise.reject(error);
			}
		);
	}

	// Store authentication token in cookie
	public setAuthToken(token: string): void {
		// Store token with expiry of 7 days
		Cookies.set(this.ACCESS_TOKEN, token, {
			expires: 7,
		});
	}

	// Read back the current access token, if any (#878 — used to decode
	// the JWT's expiry so a session-expiry warning can be scheduled).
	public getAuthToken(): string | undefined {
		return Cookies.get(this.ACCESS_TOKEN);
	}

	// Common error handler
	protected handleError(error: unknown): ApiError {
		if (error instanceof RestrictedAccessError) {
			return error;
		}

		let apiError: ApiError;
		if (axios.isAxiosError(error)) {
			const axiosError = error as AxiosError<APIErrorResponse>;

			if (axiosError.response) {
				const status = axiosError.response.status;
				const data = axiosError.response.data;
				const message = data?.message || 'An error occurred';

				apiError = new ApiError(message, status, data);
			} else if (axiosError.request) {
				apiError = new ApiError('Network error - check your connection', 0);
			} else {
				apiError = new ApiError(axiosError.message, 500);
			}
		} else if (error instanceof Error) {
			apiError = new ApiError(error.message, 500);
		} else {
			apiError = new ApiError('Something went wrong', 500);
		}

		recordRecentError(apiError.message, 'api');
		return apiError;
	}

	// Override this in child classes if needed
	protected clearAuth(): void {
		Cookies.remove(this.ACCESS_TOKEN);
		Cookies.remove(this.REFRESH_TOKEN);
	}
}

// Standalone fetch for the public OpenAPI document (#1416). The docs portal
// must be able to load the spec even when the user is signed out, so this
// deliberately bypasses the authenticated axios instance and its refresh
// interceptor. Failures are surfaced as ApiError so callers can show a
// retryable error state.
export async function fetchOpenApiDocument(): Promise<OpenApiDocument> {
	try {
		const response = await axios.get<OpenApiDocument>(
			`${env.VITE_BACKEND_URL}/v1/openapi.json`,
			{ withCredentials: true }
		);

		const document = response.data;

		if (!document || typeof document !== 'object' || !document.paths) {
			throw new ApiError(
				'Received an invalid OpenAPI document from the server',
				response.status
			);
		}

		return document;
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}

		if (axios.isAxiosError(error)) {
			const axiosError = error as AxiosError<APIErrorResponse>;

			if (axiosError.response) {
				const status = axiosError.response.status;
				const data = axiosError.response.data;
				const message =
					data?.message || 'Failed to load the API specification';

				throw new ApiError(message, status, data);
			}

			if (axiosError.request) {
				throw new ApiError(
					'Network error - could not reach the API specification',
					0
				);
			}
		}

		if (error instanceof Error) {
			throw new ApiError(error.message, 500);
		}

		throw new ApiError('Failed to load the API specification', 500);
	}
}