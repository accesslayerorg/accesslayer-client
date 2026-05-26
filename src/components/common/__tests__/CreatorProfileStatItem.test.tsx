import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CreatorProfileStatItem from '../CreatorProfileStatItem';

describe('CreatorProfileStatItem', () => {
	it('renders helper text beneath the value when provided', () => {
		render(
			<CreatorProfileStatItem
				label="Followers"
				value="Not available"
				helperText="Follower count not available yet."
			/>
		);

		expect(screen.getByText('Followers')).toBeInTheDocument();
		expect(screen.getByText('Not available')).toBeInTheDocument();
		expect(
			screen.getByText('Follower count not available yet.')
		).toBeInTheDocument();
	});

	it('omits helper text when not provided', () => {
		render(<CreatorProfileStatItem label="Followers" value="12.4K" />);

		expect(
			screen.queryByText('Follower count not available yet.')
		).not.toBeInTheDocument();
	});
});
