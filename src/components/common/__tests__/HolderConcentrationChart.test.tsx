import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HolderConcentrationChart from '@/components/common/HolderConcentrationChart';
import type { KeyHolder } from '@/utils/keyHolderRanking.utils';

const holder = (
	id: string,
	keyCount: number,
	walletAddress = `G${id.padEnd(55, 'A')}`
): KeyHolder => ({
	id,
	displayName: id,
	walletAddress,
	keyCount,
});

describe('HolderConcentrationChart', () => {
	it('renders top 10 holders, address labels, and the combined Others share', () => {
		render(
			<HolderConcentrationChart
				totalSupply={100}
				holders={[
					holder(
						'1',
						20,
						'GABCDE1234567890ABCDE1234567890ABCDE1234567890ABCDEF'
					),
					holder('2', 15),
					holder('3', 10),
					holder('4', 8),
					holder('5', 7),
					holder('6', 6),
					holder('7', 5),
					holder('8', 4),
					holder('9', 3),
					holder('10', 2),
					holder('11', 1),
				]}
			/>
		);

		expect(screen.getAllByTestId('holder-concentration-bar')).toHaveLength(
			11
		);
		expect(
			screen.getAllByTestId('holder-concentration-label')[0]
		).toHaveTextContent('GABCDE...CDEF');
		expect(
			screen.getAllByTestId('holder-concentration-percent')[0]
		).toHaveTextContent('20%');
		expect(
			screen.getByTestId('holder-concentration-others-label')
		).toHaveTextContent('Others');
		expect(
			screen.getByTestId('holder-concentration-others-percent')
		).toHaveTextContent('20%');
	});

	it('shows a Highly concentrated badge when the top three holders exceed 50%', () => {
		render(
			<HolderConcentrationChart
				totalSupply={100}
				holders={[holder('1', 30), holder('2', 15), holder('3', 10)]}
			/>
		);

		expect(
			screen.getByTestId('holder-concentration-warning')
		).toHaveTextContent('Highly concentrated');
	});
});
