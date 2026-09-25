import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CreatorProfileErrorState from '../CreatorProfileErrorState';

describe('CreatorProfileErrorState (#573)', () => {
	it('renders network error title and default plain language description', () => {
		render(<CreatorProfileErrorState />);

		expect(
			screen.getByRole('alert')
		).toBeInTheDocument();
		expect(
			screen.getByText('Unable to load this creator profile')
		).toBeInTheDocument();
		expect(
			screen.getByText(/We couldn't load the latest profile details due to a network error/i)
		).toBeInTheDocument();
	});

	it('renders custom error message when supplied as an Error object or string', () => {
		const customError = new Error('Failed to connect to Stellar node');
		render(<CreatorProfileErrorState error={customError} />);

		expect(
			screen.getByText('Failed to connect to Stellar node')
		).toBeInTheDocument();
	});

	it('triggers onRetry callback when retry button is clicked', async () => {
		const user = userEvent.setup();
		const handleRetry = vi.fn();
		render(<CreatorProfileErrorState onRetry={handleRetry} />);

		const retryButton = screen.getByRole('button', { name: /retry/i });
		expect(retryButton).toBeEnabled();

		await user.click(retryButton);
		expect(handleRetry).toHaveBeenCalledTimes(1);
	});

	it('renders retrying loading state when isRetrying is true', () => {
		const handleRetry = vi.fn();
		render(
			<CreatorProfileErrorState onRetry={handleRetry} isRetrying={true} />
		);

		const retryButton = screen.getByRole('button', { name: /retrying\.\.\./i });
		expect(retryButton).toBeDisabled();
	});

	it('renders without error when onRetry is not provided', () => {
		render(<CreatorProfileErrorState />);

		expect(screen.getByRole('alert')).toBeInTheDocument();
		expect(screen.getByText('Unable to load this creator profile')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
	});
});
