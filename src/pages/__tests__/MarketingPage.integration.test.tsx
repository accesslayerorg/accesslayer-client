import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MarketingPage from '@/pages/MarketingPage';

describe('MarketingPage integration (#525)', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders without console errors or warnings and includes all major sections', () => {
		const consoleErrorSpy = vi.spyOn(console, 'error');
		const consoleWarnSpy = vi.spyOn(console, 'warn');

		render(<MarketingPage />);

		expect(consoleErrorSpy).not.toHaveBeenCalled();
		expect(consoleWarnSpy).not.toHaveBeenCalled();

		expect(
			screen.getByRole('heading', { name: /access layer/i })
		).toBeInTheDocument();

		expect(
			screen.getByText(
				/AccessLayer is an open source platform built on the Stellar blockchain/i
			)
		).toBeInTheDocument();

		expect(screen.getByText(/how it works/i)).toBeInTheDocument();
		expect(
			screen.getByText(
				/You connect your Stellar wallet, browse the marketplace, and buy keys/i
			)
		).toBeInTheDocument();

		expect(screen.getAllByText(/^built on stellar$/i)).toHaveLength(2);
		expect(
			screen.getByText(
				/AccessLayer is built on the Stellar blockchain using Soroban smart contracts/i
			)
		).toBeInTheDocument();

		expect(screen.getByText(/join the community/i)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /github/i })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /telegram/i })).toBeInTheDocument();

		expect(screen.getByAltText(/access layer/i)).toBeInTheDocument();
	});
});
