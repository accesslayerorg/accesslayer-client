import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { StrKey } from '@stellar/stellar-sdk';
import AddressBookPanel from '../AddressBookPanel';
import { useAddressBook } from '@/hooks/useAddressBook';

const ADDR_A = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 1));

function fill(label: string, address: string) {
	fireEvent.change(screen.getByLabelText('Label'), {
		target: { value: label },
	});
	fireEvent.change(screen.getByLabelText('Stellar address'), {
		target: { value: address },
	});
}

describe('AddressBookPanel (#1296)', () => {
	beforeEach(() => {
		window.localStorage.clear();
		useAddressBook.setState({ entries: [] });
	});

	it('shows an inline error for an invalid address', () => {
		render(<AddressBookPanel />);
		fill('Alice', 'not-an-address');
		fireEvent.click(screen.getByRole('button', { name: 'Add recipient' }));

		expect(screen.getByRole('alert')).toHaveTextContent(/valid Stellar/i);
		expect(useAddressBook.getState().entries).toHaveLength(0);
	});

	it('adds, edits and deletes an entry', () => {
		render(<AddressBookPanel />);
		fill('Alice', ADDR_A);
		fireEvent.click(screen.getByRole('button', { name: 'Add recipient' }));
		expect(screen.getByText('Alice')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Edit Alice' }));
		fireEvent.change(screen.getByLabelText('Label'), {
			target: { value: 'Alicia' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
		expect(screen.getByText('Alicia')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: 'Delete Alicia' }));
		expect(screen.queryByText('Alicia')).not.toBeInTheDocument();
	});

	it('shows an inline error for a duplicate address', () => {
		useAddressBook.getState().add({ label: 'Alice', address: ADDR_A });
		render(<AddressBookPanel />);
		fill('Other', ADDR_A);
		fireEvent.click(screen.getByRole('button', { name: 'Add recipient' }));

		expect(screen.getByRole('alert')).toHaveTextContent(/already saved/i);
	});
});
