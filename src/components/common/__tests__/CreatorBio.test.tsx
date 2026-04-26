import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CreatorBio from '@/components/common/CreatorBio';

describe('CreatorBio', () => {
	it('renders the bio text when provided', () => {
		render(<CreatorBio bio="Building things on Stellar." />);
		expect(
			screen.getByText('Building things on Stellar.')
		).toBeInTheDocument();
	});

	it('falls back to the default helper text when the bio is missing', () => {
		render(<CreatorBio bio={null} />);
		expect(
			screen.getByText("This creator hasn't shared a bio yet.")
		).toBeInTheDocument();
	});

	it('treats whitespace-only strings as missing', () => {
		render(<CreatorBio bio="   " />);
		expect(
			screen.getByText("This creator hasn't shared a bio yet.")
		).toBeInTheDocument();
	});

	it('respects an explicit fallback override', () => {
		render(<CreatorBio bio={undefined} fallback="No story shared yet." />);
		expect(screen.getByText('No story shared yet.')).toBeInTheDocument();
	});

	it('marks the fallback for assistive technology', () => {
		render(<CreatorBio bio="" />);
		expect(
			screen.getByLabelText('Bio not provided')
		).toBeInTheDocument();
	});

	it('trims surrounding whitespace from a real bio before rendering', () => {
		render(<CreatorBio bio="   real bio   " />);
		expect(screen.getByText('real bio')).toBeInTheDocument();
	});
});
