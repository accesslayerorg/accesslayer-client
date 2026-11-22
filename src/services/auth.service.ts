// src/services/auth.service.ts
import { BaseApiService, type APIResponse } from './api.service';

export interface User {
	id: string;
	email: string;
	name: string;
	role: 'STUDENT' | 'INSTRUCTOR' | 'BOTH';
	emailVerified: boolean;
	profilePicture?: string;
}

export interface LoginResponse {
	user: User;
}

interface RegisterData {
	firstName: string;
	lastName: string;
	email: string;
	phoneNumber: string;
	password: string;
}

export interface LoginData {
	email: string;
	password: string;
}

class AuthService extends BaseApiService {
	private USER_PROFILE_KEY = 'accesslayer_user';

	// Login - POST /auth/login
	async login(email: string, password: string): Promise<User> {
		try {
			const response = await this.api.post<APIResponse<LoginResponse>>(
				'/auth/login',
				{ email, password }
			);

			const user = response.data.data.user;
			this.setUser(user);
			return user;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Signup - POST /auth/signup
	async register(input: RegisterData): Promise<User> {
		try {
			const response = await this.api.post<APIResponse<LoginResponse>>(
				'/auth/register',
				input
			);

			const user = response.data.data.user;
			this.setUser(user);
			return user;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Renew the current session - POST /auth/refresh (#878)
	//
	// Used by the session-expiry warning's "Renew Session" action to
	// re-establish a fresh access token without a full logout. If the
	// response includes a new token it is stored via setAuthToken (the
	// backend may instead — or additionally — rotate the cookie itself
	// via Set-Cookie, matching how the response interceptor's own silent
	// refresh-on-401 call already treats this endpoint).
	async refreshSession(): Promise<void> {
		try {
			const response = await this.api.post<APIResponse<{ token?: string }>>(
				'/auth/refresh'
			);
			const token = response.data?.data?.token;
			if (token) {
				this.setAuthToken(token);
			}
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Logout - POST /auth/logout
	async logout(): Promise<void> {
		try {
			await this.api.post('/auth/logout');
		} catch (error) {
			console.error('Logout error:', error);
		} finally {
			this.clearAuth();
		}
	}

	// Get profile - GET /auth/profile
	async getProfile(): Promise<User> {
		try {
			const response =
				await this.api.get<APIResponse<User>>('/auth/profile');

			const user = response.data.data;
			this.setUser(user);
			return user;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Request password reset - POST /auth/password-reset/request
	async requestPasswordReset(email: string): Promise<void> {
		try {
			await this.api.post('/auth/password-reset/request', { email });
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Reset password - POST /auth/password-reset/confirm
	async resetPassword(token: string, newPassword: string): Promise<void> {
		try {
			await this.api.post('/auth/password-reset/confirm', {
				token,
				newPassword,
			});
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// User management
	setUser(user: User): void {
		localStorage.setItem(this.USER_PROFILE_KEY, JSON.stringify(user));
	}

	getUser(): User | null {
		const userStr = localStorage.getItem(this.USER_PROFILE_KEY);
		return userStr ? JSON.parse(userStr) : null;
	}

	isAuthenticated(): boolean {
		return !!this.getUser();
	}

	protected clearAuth(): void {
		localStorage.removeItem(this.USER_PROFILE_KEY);
	}
}

export const authService = new AuthService();
