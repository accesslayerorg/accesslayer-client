import { formatActivityAmount } from '@/utils/activityTimeline.utils';
import { formatKeyPrice } from '@/utils/keyPriceDisplay.utils';

describe('formatActivityAmount', () => {
	it('formats a buy amount with a negative sign', () => {
		const amount = 10_000_000n; // 1 XLM
		expect(formatActivityAmount(amount, 'buy')).toBe(`-${formatKeyPrice(amount)}`);
	});

	it('formats a sell amount with a positive sign', () => {
		const amount = 10_000_000n; // 1 XLM
		expect(formatActivityAmount(amount, 'sell')).toBe(`+${formatKeyPrice(amount)}`);
	});

	it('formats a zero amount with a positive sign', () => {
		const amount = 0n;
		expect(formatActivityAmount(amount, 'sell')).toBe('+0.00 XLM');
	});

	it('formats a zero amount for buy type with a positive sign', () => {
		const amount = 0n;
		expect(formatActivityAmount(amount, 'buy')).toBe('+0.00 XLM');
	});

	it('formats a small amount with 4 decimal places', () => {
		const amount = 5_000_000n; // 0.5 XLM
		expect(formatActivityAmount(amount, 'sell')).toBe(`+${formatKeyPrice(amount)}`);
	});
});
