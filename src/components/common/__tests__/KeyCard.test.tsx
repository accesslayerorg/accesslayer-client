import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import KeyCard from '../KeyCard';
import type { Course } from '@/services/course.service';

function makeCreator(overrides: Partial<Course> = {}): Course {
	return {
		id: 'key-1',
		title: 'Alice Explorer',
		description: 'Creating exclusive content',
		price: 15.5,
		priceStroops: 155_000_000,
		instructorId: 'alice',
		socialHandle: '@alice',
		category: 'Art',
		level: 'BEGINNER',
		volume24h: 420.5,
		change24h: 12.5,
		...overrides,
	};
}

function renderCard(creator: Course) {
	return render(
		<MemoryRouter>
			<KeyCard creator={creator} />
		</MemoryRouter>
	);
}

describe('KeyCard (#1113)', () => {
	it('renders avatar, name, price, and 24h change', () => {
		renderCard(makeCreator());

		expect(screen.getByTestId('key-card-name')).toHaveTextContent(
			'Alice Explorer'
		);
		expect(screen.getByTestId('key-card-price')).toHaveTextContent(
			'15.5 XLM'
		);
		expect(screen.getByText('+12.5%')).toBeInTheDocument();
		expect(screen.getByTestId('key-card-category')).toHaveTextContent('Art');
		expect(
			screen.getByRole('img', { name: /Alice Explorer avatar/i })
		).toBeInTheDocument();
	});

	it('renders a negative 24h change', () => {
		renderCard(makeCreator({ change24h: -8.4 }));
		expect(screen.getByText('-8.4%')).toBeInTheDocument();
	});

	it('renders an unavailable price when the key has none', () => {
		renderCard(
			makeCreator({ price: undefined, priceStroops: undefined })
		);
		expect(screen.getByTestId('key-card-price')).toHaveTextContent('—');
	});

	it('links to the key detail page', () => {
		renderCard(makeCreator({ id: 'key-99' }));
		const link = screen.getByRole('link', {
			name: /View Alice Explorer's key/i,
		});
		expect(link).toHaveAttribute('href', '/creator/key-99');
	});
});
