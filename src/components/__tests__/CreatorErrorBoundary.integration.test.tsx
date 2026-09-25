import { useState, type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import CreatorPageErrorBoundary from '@/components/common/CreatorPageErrorBoundary';

const BombComponent = () => {
	throw new Error('Simulated component rendering crash');
};

const HealthySibling = () => {
	const [clicked, setClicked] = useState(false);

	return (
		<div>
			<button type="button" onClick={() => setClicked(true)}>
				Healthy sibling
			</button>
			{clicked ? <p>Sibling clicked</p> : null}
		</div>
	);
};

const renderWithRouter = (ui: ReactElement) =>
	render(<MemoryRouter>{ui}</MemoryRouter>);

describe('CreatorPageErrorBoundary integration', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('catches render faults while keeping the rest of the app mounted', async () => {
		const user = userEvent.setup();
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		renderWithRouter(
			<div>
				<HealthySibling />
				<CreatorPageErrorBoundary>
					<BombComponent />
				</CreatorPageErrorBoundary>
			</div>
		);

		expect(screen.getByRole('alert')).toBeInTheDocument();
		expect(screen.getByText(/this creator page could not load/i)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /back to creators/i })).toHaveAttribute(
			'href',
			'/creators'
		);
		expect(screen.getByRole('button', { name: /healthy sibling/i })).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /healthy sibling/i }));

		expect(screen.getByText('Sibling clicked')).toBeInTheDocument();
		expect(consoleErrorSpy).toHaveBeenCalled();
	});
});
