import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import SharePortfolioModal from '@/components/common/SharePortfolioModal';
import * as imageCaptureModule from '@/utils/imageCapture.utils';
import type { HeldKeyPosition, PnLSummary } from '@/utils/portfolioValue.utils';
import type { Course } from '@/services/course.service';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

const mockPnL: PnLSummary = {
	totalInvested: 500_000_000,
	currentValue: 750_000_000,
	unrealisedPnL: 250_000_000,
	pnlPercentage: 50.0,
	status: 'ready',
};

const mockPositions: HeldKeyPosition[] = [
	{ creatorId: 'c1', quantity: 5, priceStroops: 100_000_000 },
];

const mockCreators: Course[] = [
	{
		id: 'c1',
		title: 'Creator One',
		description: 'Desc',
		price: 10,
		priceStroops: 100_000_000,
		instructorId: 'c1',
		category: 'Art',
		level: 'BEGINNER',
	},
];

const TEST_WALLET = 'GDEMOWALLET0000000000000000000000000000000000000000000000001';
const MOCK_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const MOCK_BLOB = new Blob(['test-image'], { type: 'image/png' });

describe('SharePortfolioModal (#881)', () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		vi.clearAllMocks();
		// Spy on captureElementToPng to return fake PNG dataUrl and Blob in jsdom environment
		vi.spyOn(imageCaptureModule, 'captureElementToPng').mockResolvedValue({
			dataUrl: MOCK_DATA_URL,
			blob: MOCK_BLOB,
		});
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	it('renders dialog with header when open', async () => {
		render(
			<SharePortfolioModal
				open={true}
				onOpenChange={vi.fn()}
				pnlSummary={mockPnL}
				walletAddress={TEST_WALLET}
				heldPositions={mockPositions}
				creators={mockCreators}
			/>
		);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Share Portfolio Performance')).toBeInTheDocument();
	});

	it('displays image preview when image generation completes', async () => {
		render(
			<SharePortfolioModal
				open={true}
				onOpenChange={vi.fn()}
				pnlSummary={mockPnL}
				walletAddress={TEST_WALLET}
				heldPositions={mockPositions}
				creators={mockCreators}
			/>
		);

		await waitFor(() => {
			const preview = screen.getByTestId('portfolio-card-preview');
			expect(preview).toBeInTheDocument();
			expect(preview).toHaveAttribute('src', MOCK_DATA_URL);
		});
	});

	it('triggers a file download when "Download PNG" is clicked', async () => {
		const user = userEvent.setup();
		const linkClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

		render(
			<SharePortfolioModal
				open={true}
				onOpenChange={vi.fn()}
				pnlSummary={mockPnL}
				walletAddress={TEST_WALLET}
				heldPositions={mockPositions}
				creators={mockCreators}
			/>
		);

		await waitFor(() => {
			expect(screen.getByTestId('portfolio-card-preview')).toBeInTheDocument();
		});

		const downloadBtn = screen.getByTestId('download-png-button');
		expect(downloadBtn).not.toBeDisabled();

		await user.click(downloadBtn);

		expect(linkClickSpy).toHaveBeenCalled();
		expect(toast.success).toHaveBeenCalledWith('Portfolio card downloaded!');

		linkClickSpy.mockRestore();
	});

	it('copies the image blob to clipboard when "Copy Image" is clicked', async () => {
		const user = userEvent.setup();

		const writeMock = vi.fn().mockResolvedValue(undefined);
		// Polyfill navigator.clipboard.write using Object.defineProperty
		Object.defineProperty(navigator, 'clipboard', {
			value: {
				write: writeMock,
			},
			configurable: true,
			writable: true,
		});

		// Polyfill ClipboardItem if missing in jsdom
		if (typeof global.ClipboardItem === 'undefined') {
			global.ClipboardItem = class ClipboardItem {
				data: Record<string, Blob>;
				constructor(data: Record<string, Blob>) {
					this.data = data;
				}
			} as unknown as typeof ClipboardItem;
		}

		render(
			<SharePortfolioModal
				open={true}
				onOpenChange={vi.fn()}
				pnlSummary={mockPnL}
				walletAddress={TEST_WALLET}
				heldPositions={mockPositions}
				creators={mockCreators}
			/>
		);

		await waitFor(() => {
			expect(screen.getByTestId('portfolio-card-preview')).toBeInTheDocument();
		});

		const copyBtn = screen.getByTestId('copy-image-button');
		await user.click(copyBtn);

		expect(writeMock).toHaveBeenCalledTimes(1);
		expect(toast.success).toHaveBeenCalledWith('Image copied to clipboard!');
	});

	it('strictly generates image client-side without sending data to external services', async () => {
		const fetchSpy = vi.fn();
		global.fetch = fetchSpy;

		render(
			<SharePortfolioModal
				open={true}
				onOpenChange={vi.fn()}
				pnlSummary={mockPnL}
				walletAddress={TEST_WALLET}
				heldPositions={mockPositions}
				creators={mockCreators}
			/>
		);

		await waitFor(() => {
			expect(screen.getByTestId('portfolio-card-preview')).toBeInTheDocument();
		});

		// Verify zero network calls were made
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('displays error state and provides a retry button if image generation fails', async () => {
		vi.spyOn(imageCaptureModule, 'captureElementToPng').mockRejectedValueOnce(
			new Error('Canvas rendering error')
		);

		render(
			<SharePortfolioModal
				open={true}
				onOpenChange={vi.fn()}
				pnlSummary={mockPnL}
				walletAddress={TEST_WALLET}
				heldPositions={mockPositions}
				creators={mockCreators}
			/>
		);

		await waitFor(() => {
			expect(screen.getByText('Generation failed')).toBeInTheDocument();
			expect(screen.getByText('Canvas rendering error')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
		});
	});
});
