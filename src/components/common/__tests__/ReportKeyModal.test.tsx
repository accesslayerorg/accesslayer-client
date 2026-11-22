import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/api.service';
import ReportKeyModal from '@/components/common/ReportKeyModal';
import { reportKey } from '@/services/moderation.service';
import { useAccount, useConnect } from 'wagmi';

vi.mock('wagmi', () => ({
	useAccount: vi.fn(),
	useConnect: vi.fn(),
}));

vi.mock('@/services/moderation.service', () => ({
	reportKey: vi.fn(),
}));

const mockUseAccount = vi.mocked(useAccount);
const mockUseConnect = vi.mocked(useConnect);
const mockReportKey = vi.mocked(reportKey);

function renderModal() {
	return render(
		<ReportKeyModal
			open
			onOpenChange={vi.fn()}
			keyId="key-1"
			keyName="Example Key"
		/>
	);
}

describe('ReportKeyModal', () => {
	beforeEach(() => {
		window.sessionStorage.clear();
		mockReportKey.mockReset().mockResolvedValue();
		mockUseAccount.mockReturnValue({
			address: '0xreporter',
		} as ReturnType<typeof useAccount>);
		mockUseConnect.mockReturnValue({
			connect: vi.fn(),
			connectors: [{ id: 'wallet' }],
			error: null,
			isPending: false,
		} as unknown as ReturnType<typeof useConnect>);
	});

	it('prompts disconnected users to connect without showing the report form', () => {
		mockUseAccount.mockReturnValue({
			address: undefined,
		} as ReturnType<typeof useAccount>);

		renderModal();

		expect(
			screen.getByText('Connect your wallet to report this key.')
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'Connect wallet' })
		).toBeInTheDocument();
		expect(screen.queryByLabelText('Reason')).not.toBeInTheDocument();
	});

	it('requires a reason and limits details to 500 characters', async () => {
		const user = userEvent.setup();
		renderModal();

		const submit = screen.getByRole('button', { name: 'Submit report' });
		expect(submit).toBeDisabled();

		const details = screen.getByLabelText('Details (optional)');
		expect(details).toHaveAttribute('maxLength', '500');
		fireEvent.change(details, { target: { value: 'x'.repeat(500) } });
		expect(screen.getByText('500/500')).toBeInTheDocument();
		expect(submit).toBeDisabled();

		await user.selectOptions(screen.getByLabelText('Reason'), 'other');
		expect(submit).toBeEnabled();
	});

	it('submits the selected reason and reporter address, then confirms and records the report', async () => {
		const user = userEvent.setup();
		renderModal();

		await user.selectOptions(
			screen.getByLabelText('Reason'),
			'impersonation'
		);
		await user.type(
			screen.getByLabelText('Details (optional)'),
			'Pretending to be someone else'
		);
		await user.click(screen.getByRole('button', { name: 'Submit report' }));

		await waitFor(() => {
			expect(mockReportKey).toHaveBeenCalledWith('key-1', {
				reason: 'impersonation',
				details: 'Pretending to be someone else',
				reporterAddress: '0xreporter',
			});
		});
		expect(await screen.findByRole('status')).toHaveTextContent(
			'Your report has been submitted for moderator review.'
		);
		expect(window.sessionStorage.getItem('reported-key:key-1')).toBe('true');
	});

	it.each([
		[409, 'This key has already been reported.'],
		[429, 'Too many reports have been submitted. Please try again later.'],
	])('shows a distinct message for HTTP %i', async (status, message) => {
		const user = userEvent.setup();
		mockReportKey.mockRejectedValue(new ApiError('Request failed', status));
		renderModal();

		await user.selectOptions(screen.getByLabelText('Reason'), 'scam');
		await user.click(screen.getByRole('button', { name: 'Submit report' }));

		expect(await screen.findByRole('alert')).toHaveTextContent(message);
	});

	it('blocks another report for the same key during this session', async () => {
		window.sessionStorage.setItem('reported-key:key-1', 'true');
		renderModal();

		expect(await screen.findByRole('status')).toHaveTextContent(
			'This key has already been reported in this session.'
		);
		expect(screen.queryByLabelText('Reason')).not.toBeInTheDocument();
	});
});
