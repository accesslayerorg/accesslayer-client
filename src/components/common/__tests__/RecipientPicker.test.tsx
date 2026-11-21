import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { StrKey } from '@stellar/stellar-sdk';
import RecipientPicker from '../RecipientPicker';
import { useAddressBook } from '@/hooks/useAddressBook';

const ADDR_A = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 1));
const ADDR_B = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 2));

function Harness() {
	const [value, setValue] = useState('');
	return (
		<>
			<RecipientPicker id="recipient" value={value} onChange={setValue} />
			<output data-testid="value">{value}</output>
		</>
	);
}

describe('RecipientPicker (#1296)', () => {
	beforeEach(() => {
		window.localStorage.clear();
		useAddressBook.setState({ entries: [] });
		useAddressBook.getState().add({ label: 'Alice', address: ADDR_A });
		useAddressBook.getState().add({ label: 'Bob', address: ADDR_B });
	});

	it('filters entries by label as the user types', () => {
		render(<Harness />);
		const input = screen.getByRole('combobox');
		fireEvent.focus(input);
		expect(screen.getAllByRole('option')).toHaveLength(2);

		fireEvent.change(input, { target: { value: 'ali' } });

		const options = screen.getAllByRole('option');
		expect(options).toHaveLength(1);
		expect(options[0]).toHaveTextContent('Alice');
	});

	it('filters entries by address as the user types', () => {
		render(<Harness />);
		const input = screen.getByRole('combobox');

		fireEvent.change(input, { target: { value: ADDR_B.slice(0, 12) } });

		const options = screen.getAllByRole('option');
		expect(options).toHaveLength(1);
		expect(options[0]).toHaveTextContent('Bob');
	});

	it('shows label and truncated address, and selects the full address', () => {
		render(<Harness />);
		fireEvent.focus(screen.getByRole('combobox'));

		const option = screen.getByRole('option', { name: /Alice/ });
		expect(option).toHaveTextContent(`${ADDR_A.slice(0, 4)}…${ADDR_A.slice(-4)}`);

		fireEvent.mouseDown(option);

		expect(screen.getByTestId('value')).toHaveTextContent(ADDR_A);
	});

	it('removes a deleted entry from the picker immediately', () => {
		render(<Harness />);
		fireEvent.focus(screen.getByRole('combobox'));
		expect(screen.getAllByRole('option')).toHaveLength(2);

		const alice = useAddressBook.getState().findByAddress(ADDR_A)!;
		act(() => useAddressBook.getState().remove(alice.id));

		const options = screen.getAllByRole('option');
		expect(options).toHaveLength(1);
		expect(options[0]).toHaveTextContent('Bob');
	});
});
