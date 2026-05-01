import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CreatorSocialLinksList from '../CreatorSocialLinksList';

describe('CreatorSocialLinksList', () => {
	it('renders link-only action chips with keyboard-visible focus styling hook', () => {
		render(<CreatorSocialLinksList handle="creator" />);

		const xLink = screen.getByRole('link', { name: /x/i });
		expect(xLink.className).toContain('link-action-chip');
		expect(xLink.className).toContain('hover:border-amber-400/40');
	});

	it('shows the default placeholder copy when no handle is provided', () => {
		render(<CreatorSocialLinksList />);

		const placeholder = screen.getByLabelText(
			/creator profile links not provided/i
		);
		expect(placeholder).toHaveTextContent(/no social links added yet/i);
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});

	it('treats whitespace-only handles as missing', () => {
		render(<CreatorSocialLinksList handle="   " />);

		expect(
			screen.getByLabelText(/creator profile links not provided/i)
		).toBeInTheDocument();
	});

	it('honors a custom emptyPlaceholder when provided', () => {
		render(
			<CreatorSocialLinksList emptyPlaceholder="Links coming soon" />
		);

		expect(screen.getByText(/links coming soon/i)).toBeInTheDocument();
	});
});
