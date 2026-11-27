import { authService, type User } from '@/services/auth.service';

export interface UseUserResult {
	data: User | null;
}

/** Current authenticated user from the persisted auth profile. */
export function useUser(): UseUserResult {
	return { data: authService.getUser() };
}

export default useUser;
