import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AppErrorBoundary from '@/components/common/AppErrorBoundary';

describe('AppErrorBoundary', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders the fallback and recovers when the retry action resets the boundary', async () => {
		const user = userEvent.setup();
		const consoleErrorSpy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {});
		let shouldThrow = true;

		const FlakyChild = () => {
			if (shouldThrow) throw new Error('Simulated app crash');
			return <p>Recovered content</p>;
		};

		render(
			<AppErrorBoundary>
				<FlakyChild />
			</AppErrorBoundary>
		);

		expect(screen.getByRole('alert')).toBeInTheDocument();
		expect(screen.getByText('Something went wrong')).toBeInTheDocument();

		shouldThrow = false;
		await user.click(screen.getByRole('button', { name: /retry/i }));

		expect(screen.getByText('Recovered content')).toBeInTheDocument();
		expect(consoleErrorSpy).toHaveBeenCalled();
	});
});
