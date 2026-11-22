import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import AdminTwoFactorGuard from '../AdminTwoFactorGuard';
import { setAdminSession, clearAdminSession } from '@/utils/adminSession';

describe('AdminTwoFactorGuard', () => {
	it('redirects pending 2FA sessions away from admin pages', () => {
		setAdminSession({ status: 'pending_2fa' });
		render(
			<MemoryRouter initialEntries={['/admin/dashboard']}>
				<Routes>
					<Route
						path="/admin/dashboard"
						element={
							<AdminTwoFactorGuard>
								<h1>Admin dashboard</h1>
							</AdminTwoFactorGuard>
						}
					/>
					<Route path="/admin/2fa/challenge" element={<h1>2FA challenge</h1>} />
				</Routes>
			</MemoryRouter>
		);
		expect(screen.getByRole('heading', { name: '2FA challenge' })).toBeInTheDocument();
		clearAdminSession();
	});
});
