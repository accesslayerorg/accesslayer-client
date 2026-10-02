import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HoldingCapIndicator from '../HoldingCapIndicator';

describe('HoldingCapIndicator (#1015)', () => {
	it('renders nothing when holdingCap is not provided (unlimited)', () => {
		const { container } = render(
			<HoldingCapIndicator currentHoldings={5} holdingCap={null} />
		);
		expect(container.firstChild).toBeNull();
		expect(screen.queryByTestId('holding-cap-indicator')).not.toBeInTheDocument();
	});

	it('renders nothing when holdingCap is undefined', () => {
		const { container } = render(
			<HoldingCapIndicator currentHoldings={5} holdingCap={undefined} />
		);
		expect(container.firstChild).toBeNull();
	});

	it('renders nothing when holdingCap is zero or negative', () => {
		const { container: c1 } = render(
			<HoldingCapIndicator currentHoldings={5} holdingCap={0} />
		);
		expect(c1.firstChild).toBeNull();

		const { container: c2 } = render(
			<HoldingCapIndicator currentHoldings={5} holdingCap={-5} />
		);
		expect(c2.firstChild).toBeNull();
	});

	it('renders progress bar reflecting the correct current vs cap ratio', () => {
		render(
			<HoldingCapIndicator
				currentHoldings={25}
				holdingCap={100}
				purchaseAmount={0}
			/>
		);

		const indicator = screen.getByTestId('holding-cap-indicator');
		expect(indicator).toBeInTheDocument();

		const ratio = screen.getByTestId('holding-cap-ratio');
		expect(ratio).toHaveTextContent('25 / 100 keys');

		const progressBar = screen.getByTestId('holding-cap-progress-bar');
		expect(progressBar).toHaveAttribute('role', 'progressbar');
		expect(progressBar).toHaveAttribute('aria-valuenow', '25');
		expect(progressBar).toHaveAttribute('aria-valuemin', '0');
		expect(progressBar).toHaveAttribute('aria-valuemax', '100');
		expect(progressBar).toHaveAttribute('aria-valuetext', '25 of 100 keys (25%)');

		const fill = progressBar.querySelector('div');
		expect(fill).toHaveStyle({ width: '25%' });
	});

	it('caps progress percentage at 100% when current holdings exceed cap', () => {
		render(
			<HoldingCapIndicator
				currentHoldings={150}
				holdingCap={100}
			/>
		);

		const progressBar = screen.getByTestId('holding-cap-progress-bar');
		expect(progressBar).toHaveAttribute('aria-valuetext', '150 of 100 keys (100%)');
		const fill = progressBar.querySelector('div');
		expect(fill).toHaveStyle({ width: '100%' });
	});

	it('does not display inline warning when purchase amount stays within cap', () => {
		render(
			<HoldingCapIndicator
				currentHoldings={10}
				holdingCap={50}
				purchaseAmount={5}
			/>
		);

		expect(screen.queryByTestId('holding-cap-warning')).not.toBeInTheDocument();
	});

	it('displays inline warning when purchase amount would breach the cap', () => {
		render(
			<HoldingCapIndicator
				currentHoldings={40}
				holdingCap={50}
				purchaseAmount={15}
			/>
		);

		const warning = screen.getByTestId('holding-cap-warning');
		expect(warning).toBeInTheDocument();
		expect(warning).toHaveAttribute('role', 'alert');
		expect(warning).toHaveTextContent(/would exceed the holding cap of 50 keys/i);
		expect(warning).toHaveTextContent(/you can buy at most 10 keys/i);
	});

	it('displays inline warning when current holdings have already reached the cap', () => {
		render(
			<HoldingCapIndicator
				currentHoldings={50}
				holdingCap={50}
				purchaseAmount={0}
			/>
		);

		const warning = screen.getByTestId('holding-cap-warning');
		expect(warning).toBeInTheDocument();
		expect(warning).toHaveAttribute('role', 'alert');
		expect(warning).toHaveTextContent(/reached the maximum holding cap of 50 keys/i);
	});

	it('renders accessible tooltip trigger explaining the creator holding cap policy accurately', () => {
		render(
			<HoldingCapIndicator
				currentHoldings={10}
				holdingCap={20}
				creatorName="Alex Rivers"
			/>
		);

		const trigger = screen.getByRole('button', { name: /holding cap policy/i });
		expect(trigger).toBeInTheDocument();

		// Trigger tooltip
		fireEvent.mouseEnter(trigger);

		const tooltip = screen.getByRole('tooltip');
		expect(tooltip).toBeInTheDocument();
		expect(tooltip).toHaveTextContent(
			'Alex Rivers has set a maximum holding cap of 20 keys per wallet to prevent concentration and encourage wide distribution.'
		);
	});
});
