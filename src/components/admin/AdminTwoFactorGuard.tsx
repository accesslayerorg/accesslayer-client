import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { getAdminSession } from '@/utils/adminSession';

export default function AdminTwoFactorGuard({ children }: { children: ReactNode }) {
	const location = useLocation();
	const session = getAdminSession();
	if (session?.status === 'pending_2fa') {
		return (
			<Navigate
				to="/admin/2fa/challenge"
				replace
				state={{ from: location.pathname }}
			/>
		);
	}
	return <>{children}</>;
}
