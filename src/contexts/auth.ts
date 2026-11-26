import { authService, type User } from '@/services/auth.service';

export interface UseUserResult {
	data: User | null;
}

/**
 * Current authenticated user from the persisted auth profile. Collection
 * pages use it to decide whether editor-only controls should be shown.
 */
export function useUser(): UseUserResult {
	return { data: authService.getUser() };
}

export default useUser;
