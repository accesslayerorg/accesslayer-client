import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import TransactionHistory, {
	type Transaction,
} from '@/components/common/TransactionHistory';

const CREATOR_A_ID = '101';
const CREATOR_B_ID = '202';

const twoCreatorTrades: Transaction[] = [
	{
		id: 'trade-a',
		type: 'buy',
		creatorId: CREATOR_A_ID,
		creatorHandle: 'arivers',
		amount: 2,
		price: 0.05,
		timestamp: Date.now() - 1000 * 60 * 15,
		txHash: '0xaaaa...1111',
		status: 'completed',
	},
	{
		id: 'trade-b',
		type: 'sell',
		creatorId: CREATOR_B_ID,
		creatorHandle: 'schen_dev',
		amount: 1,
		price: 0.12,
		timestamp: Date.now() - 1000 * 60 * 45,
		txHash: '0xbbbb...2222',
		status: 'completed',
	},
];

beforeEach(() => {
	vi.stubEnv('NODE_ENV', 'test');
	localStorage.clear();
});

describe('TransactionHistory – activity feed creator handles (integration)', () => {
	it('renders the correct creator handle for each trade entry', () => {
		render(<TransactionHistory transactions={twoCreatorTrades} />);

		expect(
			screen.getByTestId('activity-creator-handle-trade-a')
		).toHaveTextContent('@arivers');
		expect(
			screen.getByTestId('activity-creator-handle-trade-b')
		).toHaveTextContent('@schen_dev');
	});

	it('shows different handles for entries from different creators', () => {
		render(<TransactionHistory transactions={twoCreatorTrades} />);

		const handleA = screen.getByTestId('activity-creator-handle-trade-a');
		const handleB = screen.getByTestId('activity-creator-handle-trade-b');

		expect(handleA.textContent).not.toBe(handleB.textContent);
		expect(handleA).toHaveTextContent('@arivers');
		expect(handleB).toHaveTextContent('@schen_dev');
	});

	it('does not expose raw creator IDs in the rendered output', () => {
		const { container } = render(
			<TransactionHistory transactions={twoCreatorTrades} />
		);

		const buyRow = screen.getByTestId('activity-item-buy');
		const sellRow = screen.getByTestId('activity-item-sell');

		expect(within(buyRow).queryByText(CREATOR_A_ID)).not.toBeInTheDocument();
		expect(within(sellRow).queryByText(CREATOR_B_ID)).not.toBeInTheDocument();
		expect(container.textContent).not.toContain(CREATOR_A_ID);
		expect(container.textContent).not.toContain(CREATOR_B_ID);
	});
});
