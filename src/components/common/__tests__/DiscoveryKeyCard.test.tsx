import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import React from 'react';
import DiscoveryKeyCard from '../DiscoveryKeyCard';
import type { Course } from '@/services/course.service';

function createMockCreator(overrides: Partial<Course> = {}): Course {
	return {
		id: 'creator_1',
		title: 'Alice Wonderland',
		description: 'Creating exclusive content',
		price: 15.5,
		priceStroops: 155000000,
		instructorId: 'alicew',
		socialHandle: '@alice',
		category: 'Art',
		level: 'BEGINNER',
		volume24h: 420.5,
		change24h: 12.5,
		...overrides,
	};
}

function renderCard(creator: Course, props: Partial<React.ComponentProps<typeof DiscoveryKeyCard>> = {}) {
	return render(
		<MemoryRouter>
			<DiscoveryKeyCard creator={creator} {...props} />
		</MemoryRouter>
	);
}

describe('DiscoveryKeyCard (#937)', () => {
	it('renders avatar, name, price, and 24h change correctly', () => {
		const creator = createMockCreator();
		renderCard(creator, { rank: 1 });

		// Name & Handle
		expect(screen.getByTestId('discovery-card-name')).toHaveTextContent('Alice Wonderland');
		expect(screen.getByTestId('discovery-card-handle')).toHaveTextContent('@alice');

		// Price (formatted XLM)
		expect(screen.getByTestId('discovery-card-price')).toHaveTextContent('15.5 XLM');

		// 24h change
		expect(screen.getByText('+12.5%')).toBeInTheDocument();

		// Rank badge
		expect(screen.getByTestId('discovery-card-rank')).toHaveTextContent('#1');

		// Avatar image/fallback accessible role
		expect(screen.getByRole('img', { name: /Alice Wonderland avatar/i })).toBeInTheDocument();
	});

	it('renders negative 24h change badge appropriately', () => {
		const creator = createMockCreator({ change24h: -8.4 });
		renderCard(creator);

		expect(screen.getByText('-8.4%')).toBeInTheDocument();
	});

	it('renders optional badge label (e.g., NEW)', () => {
		const creator = createMockCreator();
		renderCard(creator, { badgeLabel: 'NEW' });

		expect(screen.getByTestId('discovery-card-badge')).toHaveTextContent('NEW');
	});

	it('links to the creator profile page', () => {
		const creator = createMockCreator({ id: 'creator_99' });
		renderCard(creator);

		const link = screen.getByRole('link', { name: /View Alice Wonderland's key/i });
		expect(link).toHaveAttribute('href', '/creator/creator_99');
	});
});
