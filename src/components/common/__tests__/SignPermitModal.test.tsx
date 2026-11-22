import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Networks } from '@stellar/stellar-sdk';
import SignPermitModal from '@/components/common/SignPermitModal';
import { buildPermitPayload } from '@/utils/permit.utils';

afterEach(cleanup);

const payload = buildPermitPayload({
	contractId: 'CCONTRACT',
	networkPassphrase: Networks.TESTNET,
	owner: 'GOWNER',
	spender: 'CSPENDER',
	key: 'CKEY',
	amount: 2,
	deadline: 1_800_000_000,
	nonce: 4n,
});

describe('SignPermitModal (#1390)', () => {
	it('shows every signed field, a plain-language summary, and the exact message', () => {
		render(
			<SignPermitModal
				open={true}
				onOpenChange={vi.fn()}
				payload={payload}
				recipient="CVAULT"
				deadlineMinutes={30}
				onDeadlineMinutesChange={vi.fn()}
				onSign={vi.fn()}
			/>
		);

		expect(
			screen.getByRole('heading', { name: 'Review signed permit' })
		).toBeInTheDocument();
		expect(
			screen.getByText(/Allow CSPENDER to transfer 2 creator keys/)
		).toHaveTextContent('CKEY');
		expect(screen.getAllByText('CSPENDER').length).toBeGreaterThan(0);
		expect(screen.getAllByText('CKEY').length).toBeGreaterThan(0);
		expect(screen.getByText('4')).toBeInTheDocument();
		expect(screen.getByText('2')).toBeInTheDocument();
		expect(screen.getByLabelText('Exact permit message').textContent).toBe(
			payload.message
		);
	});

	it('clamps an adjusted deadline to the configured maximum', () => {
		const onDeadlineMinutesChange = vi.fn();
		render(
			<SignPermitModal
				open={true}
				onOpenChange={vi.fn()}
				payload={payload}
				recipient="CVAULT"
				deadlineMinutes={30}
				maxDeadlineMinutes={120}
				onDeadlineMinutesChange={onDeadlineMinutesChange}
				onSign={vi.fn()}
			/>
		);

		fireEvent.change(screen.getByLabelText('Permit validity in minutes'), {
			target: { value: '121' },
		});
		expect(onDeadlineMinutesChange).toHaveBeenCalledWith(120);
	});

	it('does not prompt for a signature until the reviewed action is confirmed', () => {
		const onSign = vi.fn();
		render(
			<SignPermitModal
				open={true}
				onOpenChange={vi.fn()}
				payload={payload}
				recipient="CVAULT"
				deadlineMinutes={30}
				onDeadlineMinutesChange={vi.fn()}
				onSign={onSign}
			/>
		);

		expect(onSign).not.toHaveBeenCalled();
		fireEvent.click(
			screen.getByRole('button', { name: 'Sign permit and transfer' })
		);
		expect(onSign).toHaveBeenCalledOnce();
	});
});
