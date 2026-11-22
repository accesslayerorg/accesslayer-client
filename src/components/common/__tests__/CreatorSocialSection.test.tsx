/**
 * Unit tests for CreatorSocialSection (#1103).
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import CreatorSocialSection from '@/components/common/CreatorSocialSection';

const ADDRESS = 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';

function renderSection(
	props: Partial<React.ComponentProps<typeof CreatorSocialSection>> = {}
) {
	return render(
		<MemoryRouter>
			<CreatorSocialSection
				address={ADDRESS}
				socialLinkSources={[]}
				{...props}
			/>
		</MemoryRouter>
	);
}

describe('CreatorSocialSection', () => {
	it('renders social links when the creator has published them', () => {
		renderSection({
			socialLinkSources: [
				{ socialLinks: { twitter: 'https://twitter.com/ada' } },
			],
		});
		expect(screen.getByTestId('creator-social-links')).toBeInTheDocument();
		expect(
			screen.getByTestId('creator-social-link-twitter')
		).toBeInTheDocument();
	});

	it('renders no social links list when none are published', () => {
		renderSection({ socialLinkSources: [] });
		expect(
			screen.queryByTestId('creator-social-links')
		).not.toBeInTheDocument();
	});

	it('still renders the profile link when no social links are published', () => {
		renderSection({ socialLinkSources: [] });
		expect(
			screen.getByTestId('creator-social-profile-link')
		).toBeInTheDocument();
	});

	it('links to the creator full public profile page', () => {
		renderSection();
		const link = screen.getByTestId('creator-social-profile-link');
		expect(link).toHaveAttribute(
			'href',
			`/creator/${encodeURIComponent(ADDRESS)}/profile`
		);
	});

	it('resolves social links from multiple sources', () => {
		renderSection({
			socialLinkSources: [
				{ socialLinks: { discord: 'https://discord.gg/abc' } },
			],
		});
		expect(
			screen.getByTestId('creator-social-link-discord')
		).toBeInTheDocument();
	});
});
