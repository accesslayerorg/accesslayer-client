import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DeprecationNotice from '@/components/common/DeprecationNotice';

describe('DeprecationNotice (#871)', () => {
	it('renders the "Deprecated" label', () => {
		render(<DeprecationNotice />);
		expect(screen.getByTestId('deprecation-notice')).toHaveTextContent('Deprecated');
	});

	it('uses a default title when no reason is given', () => {
		render(<DeprecationNotice />);
		expect(screen.getByTestId('deprecation-notice')).toHaveAttribute(
			'title',
			'This key has been deprecated and can no longer be traded.'
		);
	});

	it('uses the provided reason as the title', () => {
		render(<DeprecationNotice reason="Creator left the platform" />);
		expect(screen.getByTestId('deprecation-notice')).toHaveAttribute(
			'title',
			'Creator left the platform'
		);
	});
});
