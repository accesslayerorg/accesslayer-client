import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import TrendingCreatorCard from '../TrendingCreatorCard';
import type { Course } from '@/services/course.service';

const baseCreator: Course & { walletAddress: string } = {
	id: 'test-1',
	title: 'Test Creator',
	description: 'Test Description',
	price: 10,
	instructorId: 'user1',
	walletAddress: '0x123',
	socialHandle: 'test',
	category: 'Art',
	level: 'Advanced',
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	isVerified: false,
	status: 'active',
};

describe('TrendingCreatorCard integration (#484)', () => {
	it('formats holder count above 1000 with a K suffix', () => {
		render(
			<MemoryRouter>
				<TrendingCreatorCard
					creator={{
						...baseCreator,
						creatorShareSupply: 1500,
					}}
				/>
			</MemoryRouter>
		);
		
		expect(screen.getByText('1.5K')).toBeInTheDocument();
		expect(screen.queryByText('1,500')).not.toBeInTheDocument();
		expect(screen.queryByText('1500')).not.toBeInTheDocument();
	});

	it('shows the raw number for counts below 1000', () => {
		render(
			<MemoryRouter>
				<TrendingCreatorCard
					creator={{
						...baseCreator,
						creatorShareSupply: 999,
					}}
				/>
			</MemoryRouter>
		);
		
		expect(screen.getByText('999')).toBeInTheDocument();
	});

	it('applies creator card subtitle clamp helper class to description', () => {
		render(
			<MemoryRouter>
				<TrendingCreatorCard
					creator={{
						...baseCreator,
						description: 'A long subtitle description for testing clamp helper.',
					}}
				/>
			</MemoryRouter>
		);

		const descriptionElement = screen.getByText(
			'A long subtitle description for testing clamp helper.'
		);
		expect(descriptionElement.className).toMatch(/\bline-clamp-2\b/);
	});
});
