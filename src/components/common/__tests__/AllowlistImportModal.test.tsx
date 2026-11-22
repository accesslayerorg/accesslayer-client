import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AllowlistImportModal from '../AllowlistImportModal';
import { creatorWhitelistService } from '@/services/creatorWhitelist.service';

const report = {
	created: 2,
	updated: 1,
	skipped: 1,
	fatalErrors: 0,
	invalidRows: [{ rowNumber: 5, reason: 'Invalid Stellar address' }],
};

function renderModal() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<AllowlistImportModal keyId="key-1" />
		</QueryClientProvider>
	);
}

describe('AllowlistImportModal', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('rejects files larger than 2 MB without uploading', async () => {
		const importCsv = vi.spyOn(creatorWhitelistService, 'importCsv');
		renderModal();
		fireEvent.click(screen.getByTestId('allowlist-import-open'));

		expect(
			decodeURIComponent(
				screen
					.getByTestId('allowlist-template-download')
					.getAttribute('href') ?? ''
			)
		).toContain('wallet_address\n');

		const oversized = new File(['x'], 'large.csv', { type: 'text/csv' });
		Object.defineProperty(oversized, 'size', { value: 2 * 1024 * 1024 + 1 });
		fireEvent.change(screen.getByTestId('allowlist-import-file'), {
			target: { files: [oversized] },
		});

		expect(
			await screen.findByTestId('allowlist-import-error')
		).toHaveTextContent('Files must be 2 MB or smaller.');
		expect(screen.getByTestId('allowlist-dry-run')).toBeDisabled();
		expect(importCsv).not.toHaveBeenCalled();
	});

	it('shows invalid rows, gates fatal dry runs, then applies a successful dry run', async () => {
		const importCsv = vi
			.spyOn(creatorWhitelistService, 'importCsv')
			.mockResolvedValueOnce({ ...report, fatalErrors: 1 })
			.mockResolvedValueOnce(report)
			.mockResolvedValueOnce(report);
		renderModal();
		fireEvent.click(screen.getByTestId('allowlist-import-open'));
		fireEvent.change(screen.getByTestId('allowlist-import-file'), {
			target: {
				files: [
					new File(['walletAddress\nGABC'], 'members.csv', {
						type: 'text/csv',
					}),
				],
			},
		});

		const applyButton = screen.getByTestId('allowlist-apply');
		expect(applyButton).toBeDisabled();
		expect(
			await screen.findByTestId('allowlist-preview')
		).toBeInTheDocument();

		fireEvent.click(screen.getByTestId('allowlist-dry-run'));
		expect(
			await screen.findByTestId('allowlist-import-report')
		).toHaveTextContent('Invalid Stellar address');
		expect(applyButton).toBeDisabled();

		fireEvent.click(screen.getByTestId('allowlist-dry-run'));
		await waitFor(() => expect(applyButton).toBeEnabled());
		expect(screen.getByTestId('allowlist-import-report')).toHaveTextContent(
			'Row'
		);
		expect(screen.getByTestId('allowlist-import-report')).toHaveTextContent(
			'5'
		);

		fireEvent.click(applyButton);
		await waitFor(() => {
			expect(screen.getByText('Import complete')).toBeInTheDocument();
		});
		expect(screen.getByTestId('allowlist-created-count')).toHaveTextContent(
			'2'
		);
		expect(screen.getByTestId('allowlist-updated-count')).toHaveTextContent(
			'1'
		);
		expect(screen.getByTestId('allowlist-skipped-count')).toHaveTextContent(
			'1'
		);
		expect(importCsv).toHaveBeenNthCalledWith(
			1,
			'key-1',
			expect.any(File),
			true
		);
		expect(importCsv).toHaveBeenNthCalledWith(
			2,
			'key-1',
			expect.any(File),
			true
		);
		expect(importCsv).toHaveBeenNthCalledWith(
			3,
			'key-1',
			expect.any(File),
			false
		);
	});

	it('rejects malformed CSV before making a dry-run request', async () => {
		const importCsv = vi.spyOn(creatorWhitelistService, 'importCsv');
		renderModal();
		fireEvent.click(screen.getByTestId('allowlist-import-open'));
		fireEvent.change(screen.getByTestId('allowlist-import-file'), {
			target: {
				files: [new File(['walletAddress\n"unfinished'], 'bad.csv')],
			},
		});

		expect(
			await screen.findByTestId('allowlist-import-error')
		).toHaveTextContent('unclosed quoted field');
		expect(screen.getByTestId('allowlist-dry-run')).toBeDisabled();
		expect(importCsv).not.toHaveBeenCalled();
	});
});
