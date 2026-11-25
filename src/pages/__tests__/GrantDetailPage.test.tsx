import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GrantDetailPage from '@/pages/GrantDetailPage';
import { getGrant, resetGrantStore } from '@/services/grants.service';

const { useGrantMock, useSubmitEvidenceMock, useReviewMilestoneMock } =
	vi.hoisted(() => ({
		useGrantMock: vi.fn(),
		useSubmitEvidenceMock: vi.fn(),
		useReviewMilestoneMock: vi.fn(),
	}));

let currentWallet: string | undefined;

vi.mock('@/hooks/useGrants', () => ({
	useGrant: () => useGrantMock(),
	useSubmitEvidence: () => useSubmitEvidenceMock(),
	useReviewMilestone: () => useReviewMilestoneMock(),
}));

vi.mock('wagmi', async importOriginal => {
	const actual = await importOriginal<typeof import('wagmi')>();
	return { ...actual, useAccount: () => ({ address: currentWallet }) };
});

vi.mock('@/components/common/ConnectWalletButton', () => ({
	default: () => <button type="button">Connect Wallet</button>,
}));

function renderDetail() {
	return render(
		<MemoryRouter initialEntries={['/treasury/grants/grant-1']}>
			<Routes>
				<Route
					path="/treasury/grants/:grantId"
					element={<GrantDetailPage />}
				/>
			</Routes>
		</MemoryRouter>
	);
}

describe('GrantDetailPage role-based actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetGrantStore();
		useGrantMock.mockReturnValue({
			data: getGrant('grant-1'),
			isLoading: false,
		});
		useSubmitEvidenceMock.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
		});
		useReviewMilestoneMock.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
		});
	});

	it('lets only the recipient submit evidence for pending milestones', () => {
		currentWallet = 'GRECIPIENT_1';
		renderDetail();

		expect(screen.getByTestId('submit-evidence-grant-1-m3')).toBeTruthy();
		expect(screen.queryByTestId('approve-milestone-grant-1-m2')).toBeNull();
	});

	it('lets only the reviewer approve or reject submitted evidence', () => {
		currentWallet = 'GREVIEWER_1';
		renderDetail();

		expect(screen.getByTestId('approve-milestone-grant-1-m2')).toBeTruthy();
		expect(screen.getByTestId('reject-milestone-grant-1-m2')).toBeTruthy();
		expect(screen.queryByTestId('submit-evidence-grant-1-m3')).toBeNull();
	});

	it('shows a read-only view for observers', () => {
		currentWallet = 'GOUTSIDER';
		renderDetail();

		expect(
			screen.getByText(/viewing this grant as an observer/i)
		).toBeTruthy();
		expect(screen.queryByTestId('submit-evidence-grant-1-m3')).toBeNull();
		expect(screen.queryByTestId('approve-milestone-grant-1-m2')).toBeNull();
	});
});
