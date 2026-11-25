import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BadgeShowcase from '../BadgeShowcase';
import { badgeContractService } from '@/services/badgeContract.service';

const mockUseAccount = vi.fn();
vi.mock('wagmi', () => ({
	useAccount: () => mockUseAccount(),
}));

function renderWithClient(ui: React.ReactElement) {
	const testQueryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});
	return render(
		<QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>
	);
}

describe('BadgeShowcase & Soulbound Badges (#1444)', () => {
	const holderWallet =
		'GDEMOWALLET0000000000000000000000000000000000000000000000001';
	const issuerWallet =
		'GISSUER00000000000000000000000000000000000000000000000000001';
	const otherWallet =
		'GOTHERWALLET000000000000000000000000000000000000000000000002';

	beforeEach(() => {
		badgeContractService.reset();
		mockUseAccount.mockReturnValue({ address: holderWallet });
	});

	it("shows holder's badges with correct name and issuer", async () => {
		renderWithClient(<BadgeShowcase wallet={holderWallet} />);

		await waitFor(() => {
			expect(screen.getByTestId('badge-card-badge-1')).toBeInTheDocument();
		});

		expect(screen.getByTestId('badge-name-badge-1')).toHaveTextContent(
			'Early Contributor'
		);
		expect(screen.getByTestId('badge-name-badge-2')).toHaveTextContent(
			'Governance Pioneer'
		);
	});

	it('marks badges as non-transferable and includes explanatory tooltip', async () => {
		renderWithClient(<BadgeShowcase wallet={holderWallet} />);

		await waitFor(() => {
			expect(screen.getByTestId('badge-card-badge-1')).toBeInTheDocument();
		});

		const tooltipTriggers = screen.getAllByText('Non-transferable');
		expect(tooltipTriggers.length).toBeGreaterThan(0);
	});

	it('allows badge owner to renounce badge, removing it from their profile', async () => {
		const user = userEvent.setup();
		mockUseAccount.mockReturnValue({ address: holderWallet });

		renderWithClient(<BadgeShowcase wallet={holderWallet} />);

		await waitFor(() => {
			expect(screen.getByTestId('renounce-badge-btn-badge-1')).toBeInTheDocument();
		});

		// Click renounce on badge-1
		await user.click(screen.getByTestId('renounce-badge-btn-badge-1'));

		// Modal opens
		expect(screen.getByTestId('renounce-badge-modal')).toBeInTheDocument();

		// Confirm renounce
		await user.click(screen.getByTestId('confirm-renounce-btn'));

		// Badge-1 should be removed
		await waitFor(() => {
			expect(
				screen.queryByTestId('badge-card-badge-1')
			).not.toBeInTheDocument();
		});
		// Badge-2 should still remain
		expect(screen.getByTestId('badge-card-badge-2')).toBeInTheDocument();
	});

	it('shows revoke action ONLY for the defined issuer, and not for non-issuers', async () => {
		// As holder (not issuer):
		mockUseAccount.mockReturnValue({ address: holderWallet });
		const { unmount } = renderWithClient(
			<BadgeShowcase wallet={holderWallet} />
		);

		await waitFor(() => {
			expect(screen.getByTestId('badge-card-badge-1')).toBeInTheDocument();
		});
		expect(
			screen.queryByTestId('revoke-badge-btn-badge-1')
		).not.toBeInTheDocument();

		unmount();

		// As issuer:
		mockUseAccount.mockReturnValue({ address: issuerWallet });
		renderWithClient(<BadgeShowcase wallet={holderWallet} />);

		await waitFor(() => {
			expect(
				screen.getByTestId('revoke-badge-btn-badge-1')
			).toBeInTheDocument();
		});
	});

	it('allows issuer to revoke badge with reason', async () => {
		const user = userEvent.setup();
		mockUseAccount.mockReturnValue({ address: issuerWallet });

		renderWithClient(<BadgeShowcase wallet={holderWallet} />);

		await waitFor(() => {
			expect(
				screen.getByTestId('revoke-badge-btn-badge-1')
			).toBeInTheDocument();
		});

		await user.click(screen.getByTestId('revoke-badge-btn-badge-1'));

		// Revoke modal opens
		expect(screen.getByTestId('revoke-badge-modal')).toBeInTheDocument();

		// Enter reason
		await user.type(
			screen.getByTestId('revoke-reason-input'),
			'Account violated terms of service'
		);

		// Submit revoke
		await user.click(screen.getByTestId('confirm-revoke-btn'));

		await waitFor(() => {
			expect(
				screen.queryByTestId('badge-card-badge-1')
			).not.toBeInTheDocument();
		});
	});

	it('allows issuer to award badge and blocks duplicate award with error message', async () => {
		const user = userEvent.setup();
		mockUseAccount.mockReturnValue({ address: issuerWallet });

		renderWithClient(<BadgeShowcase wallet={holderWallet} />);

		await waitFor(() => {
			expect(
				screen.getByTestId('open-award-badge-modal-btn')
			).toBeInTheDocument();
		});

		await user.click(screen.getByTestId('open-award-badge-modal-btn'));

		expect(screen.getByTestId('award-badge-modal')).toBeInTheDocument();

		// Attempt to award duplicate 'early_contributor' to holderWallet
		await user.type(
			screen.getByTestId('badge-recipient-input'),
			holderWallet
		);

		await user.click(screen.getByTestId('award-badge-submit-btn'));

		// Should show duplicate award error
		await waitFor(() => {
			expect(screen.getByTestId('award-badge-error')).toHaveTextContent(
				/Duplicate award/i
			);
		});

		// Now change recipient to other valid wallet
		await user.clear(screen.getByTestId('badge-recipient-input'));
		await user.type(
			screen.getByTestId('badge-recipient-input'),
			otherWallet
		);

		await user.click(screen.getByTestId('award-badge-submit-btn'));

		// Modal closes on success
		await waitFor(() => {
			expect(
				screen.queryByTestId('award-badge-modal')
			).not.toBeInTheDocument();
		});
	});
});
