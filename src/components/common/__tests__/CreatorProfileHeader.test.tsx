import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CreatorProfileHeader from '@/components/common/CreatorProfileHeader';

describe('CreatorProfileHeader', () => {
	it('renders a share/copy button for profile actions', async () => {
		render(
			<CreatorProfileHeader
				name="Alex Rivers"
				handle="arivers"
				creatorId="arivers"
				avatarUrl="https://example.com/avatar.png"
			/>
		);

		// The header exposes a share/copy button for profile link actions
		const actionButton = screen.getByRole('button', {
			name: /Copy Profile Link|Copy|Share Profile|Share/i,
		});

		expect(actionButton).toBeInTheDocument();
		fireEvent.click(actionButton);
		// clicking should not throw and button remains in the document
		expect(actionButton).toBeInTheDocument();
	});
});
