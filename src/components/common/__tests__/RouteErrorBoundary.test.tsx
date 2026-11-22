import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import RouteErrorBoundary from '@/components/common/RouteErrorBoundary';

let shouldThrow = true;

function CrashableRoute() {
	if (shouldThrow) throw new Error('private runtime detail');
	return <p>Recovered route content</p>;
}

describe('RouteErrorBoundary', () => {
	beforeEach(() => {
		shouldThrow = true;
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => vi.restoreAllMocks());

	it('shows a contextual fallback with retry and support actions, then remounts the route', () => {
		render(
			<RouteErrorBoundary routeName="Portfolio">
				<CrashableRoute />
			</RouteErrorBoundary>
		);

		expect(screen.getByTestId('route-error-fallback')).toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: /portfolio couldn't load/i })
		).toBeInTheDocument();
		expect(
			screen.getByRole('link', { name: /contact support/i })
		).toHaveAttribute(
			'href',
			'https://github.com/accesslayerorg/accesslayer-client/issues'
		);

		shouldThrow = false;
		fireEvent.click(screen.getByTestId('route-error-retry'));

		expect(screen.getByText('Recovered route content')).toBeInTheDocument();
		expect(
			screen.queryByTestId('route-error-fallback')
		).not.toBeInTheDocument();
	});

	it('does not render error details in production builds', () => {
		render(
			<RouteErrorBoundary routeName="Marketplace">
				<CrashableRoute />
			</RouteErrorBoundary>
		);

		if (import.meta.env.DEV) {
			expect(screen.getByTestId('route-error-details')).toHaveTextContent(
				'private runtime detail'
			);
		} else {
			expect(
				screen.queryByTestId('route-error-details')
			).not.toBeInTheDocument();
			expect(
				screen.queryByText('private runtime detail')
			).not.toBeInTheDocument();
		}
	});
});
