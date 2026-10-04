import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SectionErrorBoundary from '@/components/common/SectionErrorBoundary';

let shouldThrow = true;

function CrashableSection() {
	if (shouldThrow) throw new Error('section failed');
	return <p>Recovered section</p>;
}

describe('SectionErrorBoundary retry', () => {
	beforeEach(() => {
		shouldThrow = true;
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => vi.restoreAllMocks());

	it('keeps healthy siblings available and remounts only the failed section on retry', () => {
		render(
			<div>
				<p>Healthy sibling section</p>
				<SectionErrorBoundary sectionName="test section">
					<CrashableSection />
				</SectionErrorBoundary>
			</div>
		);

		expect(screen.getByText('Healthy sibling section')).toBeInTheDocument();
		expect(
			screen.getByRole('link', { name: /contact support/i })
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /retry/i })
		).toBeInTheDocument();

		shouldThrow = false;
		fireEvent.click(screen.getByRole('button', { name: /retry/i }));

		expect(screen.getByText('Healthy sibling section')).toBeInTheDocument();
		expect(screen.getByText('Recovered section')).toBeInTheDocument();
	});
});
