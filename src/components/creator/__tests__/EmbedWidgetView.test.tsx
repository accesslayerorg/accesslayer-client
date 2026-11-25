import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { EmbedWidgetView } from '@/components/creator/EmbedWidgetView';

describe('EmbedWidgetView (#1479)', () => {
	it('renders key stats when domain is in allowlist', () => {
		render(
			<MemoryRouter>
				<EmbedWidgetView
					creatorKeyId="alice-key"
					creatorName="Alice Stellar"
					allowedDomains={['myblog.com']}
					referrerDomain="myblog.com"
				/>
			</MemoryRouter>
		);

		expect(screen.getByTestId('embed-widget-view')).toBeInTheDocument();
		expect(screen.getByText('Alice Stellar')).toBeInTheDocument();
	});

	it('renders unauthorized placeholder when domain is outside allowlist', () => {
		render(
			<MemoryRouter>
				<EmbedWidgetView
					creatorKeyId="alice-key"
					creatorName="Alice Stellar"
					allowedDomains={['myblog.com']}
					referrerDomain="unauthorized-site.org"
				/>
			</MemoryRouter>
		);

		expect(screen.getByTestId('embed-unauthorized-placeholder')).toBeInTheDocument();
		expect(screen.getByText('Domain not authorized for this widget')).toBeInTheDocument();
	});
});
