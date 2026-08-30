import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import KeyHolderList from '@/components/common/KeyHolderList';
import type { KeyHolder } from '@/utils/keyHolderRanking.utils';

function holder(id: string, displayName: string, keyCount: number): KeyHolder {
	return { id, displayName, keyCount };
}

describe('KeyHolderList', () => {
	it('renders holders sorted descending by key count', () => {
		render(
			<KeyHolderList
				holders={[
					holder('a', 'Alice', 5),
					holder('b', 'Bob', 20),
					holder('c', 'Cara', 10),
				]}
			/>
		);

		const rows = screen.getAllByTestId('key-holder-row');
		expect(rows.map(row => within(row).getByText(/^(Alice|Bob|Cara)$/).textContent)).toEqual([
			'Bob',
			'Cara',
			'Alice',
		]);
	});

	it('renders sequential rank numbers 1, 2, 3', () => {
		render(
			<KeyHolderList
				holders={[
					holder('a', 'Alice', 5),
					holder('b', 'Bob', 20),
					holder('c', 'Cara', 10),
				]}
			/>
		);

		const ranks = screen.getAllByTestId('key-holder-rank').map(el => el.textContent);
		expect(ranks).toEqual(['1', '2', '3']);
	});

	it('shows a single holder with all keys at 100% share', () => {
		render(<KeyHolderList holders={[holder('a', 'Solo Holder', 42)]} />);

		expect(screen.getByTestId('key-holder-share')).toHaveTextContent('100%');
	});

	it('renders tied holders at the same rank', () => {
		render(
			<KeyHolderList
				holders={[holder('a', 'Alice', 10), holder('b', 'Bob', 10), holder('c', 'Cara', 5)]}
			/>
		);

		const ranks = screen.getAllByTestId('key-holder-rank').map(el => el.textContent);
		expect(ranks).toEqual(['1', '1', '3']);
	});

	it('renders share percentages for each holder that are internally consistent with key counts', () => {
		render(
			<KeyHolderList holders={[holder('a', 'Alice', 30), holder('b', 'Bob', 70)]} />
		);

		const shares = screen.getAllByTestId('key-holder-share').map(el => el.textContent);
		expect(shares).toEqual(['70%', '30%']);
	});

	it('shows an empty state when there are no holders', () => {
		render(<KeyHolderList holders={[]} />);

		expect(screen.getByTestId('key-holder-list-empty')).toBeInTheDocument();
		expect(screen.queryByTestId('key-holder-list')).not.toBeInTheDocument();
	});

	it('sets an accessible label on each rank badge', () => {
		render(<KeyHolderList holders={[holder('a', 'Alice', 10)]} />);

		expect(screen.getByLabelText('Rank 1')).toBeInTheDocument();
	});
});

function stakedHolder(
	id: string,
	displayName: string,
	keyCount: number,
	stakedQuantity: number
): KeyHolder {
	return { id, displayName, keyCount, stakedQuantity };
}

describe('KeyHolderList staking columns (#814)', () => {
	it('renders Staked and Liquid values per holder', () => {
		render(
			<KeyHolderList holders={[stakedHolder('a', 'Alice', 20, 8)]} />
		);

		expect(screen.getByTestId('key-holder-staked')).toHaveTextContent('8');
		expect(screen.getByTestId('key-holder-liquid')).toHaveTextContent('12');
		expect(screen.getByTestId('key-holder-key-count')).toHaveTextContent('20');
	});

	it('shows a staking badge only on rows with stakedQuantity greater than zero', () => {
		render(
			<KeyHolderList
				holders={[
					stakedHolder('a', 'Staker', 20, 8),
					stakedHolder('b', 'Plain', 15, 0),
				]}
			/>
		);

		const badges = screen.getAllByTestId('key-holder-staking-badge');
		expect(badges).toHaveLength(1);

		const rows = screen.getAllByTestId('key-holder-row');
		const stakerRow = rows.find(r => within(r).queryByText('Staker'))!;
		const plainRow = rows.find(r => within(r).queryByText('Plain'))!;
		expect(within(stakerRow).getByTestId('key-holder-staking-badge')).toBeInTheDocument();
		expect(within(plainRow).queryByTestId('key-holder-staking-badge')).not.toBeInTheDocument();
	});

	it('renders 0 for a holder with no staked keys and no badge', () => {
		render(<KeyHolderList holders={[stakedHolder('a', 'Alice', 10, 0)]} />);

		expect(screen.getByTestId('key-holder-staked')).toHaveTextContent('0');
		expect(screen.getByTestId('key-holder-liquid')).toHaveTextContent('10');
		expect(screen.queryByTestId('key-holder-staking-badge')).not.toBeInTheDocument();
	});

	it('treats holders without a stakedQuantity field as fully liquid', () => {
		render(<KeyHolderList holders={[holder('a', 'Alice', 10)]} />);

		expect(screen.getByTestId('key-holder-staked')).toHaveTextContent('0');
		expect(screen.getByTestId('key-holder-liquid')).toHaveTextContent('10');
	});

	it('orders rows by total quantity descending regardless of staked split', () => {
		render(
			<KeyHolderList
				holders={[
					stakedHolder('a', 'Alice', 10, 0),
					stakedHolder('b', 'Bob', 30, 30),
					stakedHolder('c', 'Cara', 20, 5),
				]}
			/>
		);

		const rows = screen.getAllByTestId('key-holder-row');
		expect(
			rows.map(row => within(row).getByText(/^(Alice|Bob|Cara)$/).textContent)
		).toEqual(['Bob', 'Cara', 'Alice']);
	});
});
