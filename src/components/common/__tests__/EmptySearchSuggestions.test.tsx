import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EmptySearchSuggestions from '../EmptySearchSuggestions';

describe('EmptySearchSuggestions', () => {
	it('renders one chip per unique suggestion', () => {
		render(
			<EmptySearchSuggestions
				suggestions={['Art', 'art', '  Tech  ', '', 'Music']}
				onSelect={() => {}}
			/>
		);

		expect(screen.getByRole('button', { name: /^art$/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^tech$/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^music$/i })).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: /^art$/i })).toHaveLength(1);
	});

	it('calls onSelect with the chosen term when a chip is clicked', () => {
		const onSelect = vi.fn();
		render(
			<EmptySearchSuggestions
				suggestions={['Art', 'Music']}
				onSelect={onSelect}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: /^music$/i }));
		expect(onSelect).toHaveBeenCalledWith('Music');
	});

	it('hides itself when dismissed', () => {
		render(
			<EmptySearchSuggestions
				suggestions={['Art']}
				onSelect={() => {}}
			/>
		);

		expect(screen.getByRole('button', { name: /^art$/i })).toBeInTheDocument();
		fireEvent.click(
			screen.getByRole('button', { name: /dismiss search suggestions/i })
		);
		expect(screen.queryByRole('button', { name: /^art$/i })).not.toBeInTheDocument();
	});

	it('caps the rendered chips at maxSuggestions', () => {
		render(
			<EmptySearchSuggestions
				suggestions={['One', 'Two', 'Three', 'Four', 'Five']}
				onSelect={() => {}}
				maxSuggestions={2}
			/>
		);

		expect(screen.getByRole('button', { name: /^one$/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^two$/i })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /^three$/i })).not.toBeInTheDocument();
	});

	it('renders nothing when no usable suggestions are provided', () => {
		const { container } = render(
			<EmptySearchSuggestions
				suggestions={['', '   ']}
				onSelect={() => {}}
			/>
		);
		expect(container).toBeEmptyDOMElement();
	});
});
