import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
	it('renders the title and description', () => {
		render(
			<EmptyState
				image="/images/no-results.png"
				title="No holdings yet"
				description="You don't currently hold any creator keys."
			/>
		);

		expect(screen.getByText('No holdings yet')).toBeInTheDocument();
		expect(
			screen.getByText("You don't currently hold any creator keys.")
		).toBeInTheDocument();
	});

	it('renders no action button when neither onReset nor cta is supplied', () => {
		render(
			<EmptyState image="/images/no-results.png" title="Empty" description="Nothing here." />
		);

		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('renders the legacy reset button and calls onReset when clicked', () => {
		const onReset = vi.fn();
		render(
			<EmptyState
				image="/images/no-results.png"
				title="No creators found"
				description="Try a different search."
				onReset={onReset}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: /reset search results/i }));
		expect(onReset).toHaveBeenCalledTimes(1);
	});

	it('renders a generic cta button and calls its onClick when clicked', () => {
		const onClick = vi.fn();
		render(
			<EmptyState
				image="/images/no-results.png"
				title="No holdings yet"
				description="Discover creators to get started."
				cta={{ label: 'Discover creators', onClick }}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: 'Discover creators' }));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('prefers onReset over cta when both are somehow supplied', () => {
		const onReset = vi.fn();
		const onClick = vi.fn();
		render(
			<EmptyState
				image="/images/no-results.png"
				title="No creators found"
				description="Try a different search."
				onReset={onReset}
				cta={{ label: 'Discover creators', onClick }}
			/>
		);

		expect(screen.getByRole('button', { name: /reset search results/i })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Discover creators' })).not.toBeInTheDocument();
	});
});
