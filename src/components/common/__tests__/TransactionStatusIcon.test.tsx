import { render, screen } from '@testing-library/react';
import TransactionStatusIcon from '../TransactionStatusIcon';

describe('TransactionStatusIcon', () => {
	test('renders pending status with motion-safe pulse animation', () => {
		render(<TransactionStatusIcon status="pending" />);

		const pendingIcon = screen.getByLabelText('Transaction pending');
		expect(pendingIcon).toHaveClass('motion-safe:animate-pulse');
		expect(pendingIcon).toHaveClass('motion-reduce:animate-none');
	});

	test('removes pending pulse when status updates to success', () => {
		const { rerender } = render(<TransactionStatusIcon status="pending" />);
		rerender(<TransactionStatusIcon status="success" />);

		const successIcon = screen.getByLabelText('Transaction success');
		expect(successIcon).not.toHaveClass('motion-safe:animate-pulse');
		expect(successIcon).not.toHaveClass('motion-reduce:animate-none');
	});
});
