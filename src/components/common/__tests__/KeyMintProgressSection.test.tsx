import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import KeyMintProgressSection from '@/components/common/KeyMintProgressSection';
import { ERROR_CODE_TO_COPY } from '@/utils/errorHandling.utils';

describe('KeyMintProgressSection Component', () => {
	it('renders progress bar with accurate current and max values and progressbar semantics (acceptance #1)', () => {
		render(
			<KeyMintProgressSection
				currentSupply={400}
				maxSupply={1000}
			/>
		);

		const progressbar = screen.getByRole('progressbar');
		expect(progressbar).toBeInTheDocument();
		expect(progressbar).toHaveAttribute('aria-valuenow', '400');
		expect(progressbar).toHaveAttribute('aria-valuemin', '0');
		expect(progressbar).toHaveAttribute('aria-valuemax', '1000');
		expect(progressbar).toHaveAttribute('aria-label', 'Key mint progress');

		expect(screen.getByText('400 / 1,000 minted')).toBeInTheDocument();
		expect(screen.getByText('Supply cap: 1,000 keys')).toBeInTheDocument();
	});

	it('computes and displays percentage label correctly across edge cases (acceptance #2)', () => {
		// 0%
		const { rerender } = render(
			<KeyMintProgressSection currentSupply={0} maxSupply={100} />
		);
		expect(screen.getByTestId('mint-progress-percentage')).toHaveTextContent('0%');

		// Partial (50%)
		rerender(<KeyMintProgressSection currentSupply={50} maxSupply={100} />);
		expect(screen.getByTestId('mint-progress-percentage')).toHaveTextContent('50%');

		// Tiny fraction (1 of 2,000 = 0.05%)
		rerender(<KeyMintProgressSection currentSupply={1} maxSupply={2000} />);
		expect(screen.getByTestId('mint-progress-percentage')).toHaveTextContent('0.05%');

		// Tiny fraction (<0.01%)
		rerender(<KeyMintProgressSection currentSupply={1} maxSupply={100000} />);
		expect(screen.getByTestId('mint-progress-percentage')).toHaveTextContent('<0.01%');

		// Close to cap without reaching it (999 of 1000 = 99.9% - never 100% prematurely)
		rerender(<KeyMintProgressSection currentSupply={999} maxSupply={1000} />);
		expect(screen.getByTestId('mint-progress-percentage')).toHaveTextContent('99.9%');

		// Exactly at cap (100%)
		rerender(<KeyMintProgressSection currentSupply={100} maxSupply={100} />);
		expect(screen.getByTestId('mint-progress-percentage')).toHaveTextContent('100%');

		// Over cap (clamped to 100%)
		rerender(<KeyMintProgressSection currentSupply={110} maxSupply={100} />);
		expect(screen.getByTestId('mint-progress-percentage')).toHaveTextContent('100%');
	});

	it('renders remaining mintable chip showing accurate remaining amount (acceptance #3)', () => {
		const { rerender } = render(
			<KeyMintProgressSection currentSupply={35} maxSupply={100} />
		);

		const remainingChip = screen.getByTestId('remaining-mintable-chip');
		expect(remainingChip).toBeInTheDocument();
		expect(remainingChip).toHaveTextContent('65 keys');

		// At cap -> 0 keys remaining (never negative)
		rerender(<KeyMintProgressSection currentSupply={100} maxSupply={100} />);
		expect(screen.getByTestId('remaining-mintable-chip')).toHaveTextContent('0 keys');

		// Over cap -> still 0 keys remaining (never negative)
		rerender(<KeyMintProgressSection currentSupply={120} maxSupply={100} />);
		expect(screen.getByTestId('remaining-mintable-chip')).toHaveTextContent('0 keys');
	});

	it('disables buy button at cap and shows the MaxSupplyReached message with explanation (acceptance #4)', async () => {
		const handleBuy = vi.fn();
		const user = userEvent.setup();

		render(
			<KeyMintProgressSection
				currentSupply={100}
				maxSupply={100}
				onBuy={handleBuy}
			/>
		);

		const buyButton = screen.getByTestId('buy-key-button');
		expect(buyButton).toBeDisabled();
		expect(buyButton).toHaveAttribute('aria-disabled', 'true');
		expect(buyButton).toHaveAttribute('aria-describedby', 'max-supply-reached-message');

		const message = screen.getByTestId('max-supply-message');
		expect(message).toBeInTheDocument();
		expect(message).toHaveTextContent(ERROR_CODE_TO_COPY.MaxSupplyReached);

		await user.click(buyButton);
		expect(handleBuy).not.toHaveBeenCalled();
	});

	it('hides progress bar and remaining chip for uncapped keys and leaves buy button functional (acceptance #5)', async () => {
		const handleBuy = vi.fn();
		const user = userEvent.setup();

		const { rerender } = render(
			<KeyMintProgressSection
				currentSupply={75}
				maxSupply={null}
				onBuy={handleBuy}
			/>
		);

		// Progress bar and remaining chip should be completely hidden
		expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
		expect(screen.queryByTestId('mint-progress-bar')).not.toBeInTheDocument();
		expect(screen.queryByTestId('remaining-mintable-chip')).not.toBeInTheDocument();
		expect(screen.queryByTestId('max-supply-message')).not.toBeInTheDocument();

		// Buy button should be present, enabled, and functional
		const buyButton = screen.getByTestId('buy-key-button');
		expect(buyButton).toBeInTheDocument();
		expect(buyButton).not.toBeDisabled();
		expect(buyButton).toHaveTextContent(/buy key/i);

		await user.click(buyButton);
		expect(handleBuy).toHaveBeenCalledTimes(1);

		// Same behavior for undefined or 0 max supply
		rerender(
			<KeyMintProgressSection
				currentSupply={75}
				maxSupply={undefined}
				onBuy={handleBuy}
			/>
		);
		expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
		expect(screen.queryByTestId('remaining-mintable-chip')).not.toBeInTheDocument();

		rerender(
			<KeyMintProgressSection
				currentSupply={75}
				maxSupply={0}
				onBuy={handleBuy}
			/>
		);
		expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
		expect(screen.queryByTestId('remaining-mintable-chip')).not.toBeInTheDocument();
	});

	it('renders loading skeleton while isLoading is true without flashing undefined or NaN', () => {
		render(
			<KeyMintProgressSection
				isLoading={true}
			/>
		);

		expect(screen.getByTestId('key-mint-progress-skeleton')).toBeInTheDocument();
		expect(screen.queryByText(/nan/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
	});
});
