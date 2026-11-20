import { beforeEach, describe, expect, it } from 'vitest';
import { StrKey } from '@stellar/stellar-sdk';
import {
	ADDRESS_BOOK_STORAGE_KEY,
	useAddressBook,
} from '../useAddressBook';

const ADDR_A = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 1));
const ADDR_B = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 2));

function stored() {
	return JSON.parse(
		window.localStorage.getItem(ADDRESS_BOOK_STORAGE_KEY) ?? '[]'
	) as Array<{ id: string; label: string; address: string }>;
}

describe('useAddressBook (#1296)', () => {
	beforeEach(() => {
		window.localStorage.clear();
		useAddressBook.setState({ entries: [] });
	});

	it('adds a valid entry and persists it', () => {
		const result = useAddressBook
			.getState()
			.add({ label: ' Alice ', address: ADDR_A });

		expect(result.ok).toBe(true);
		expect(useAddressBook.getState().entries).toHaveLength(1);
		expect(useAddressBook.getState().entries[0]).toMatchObject({
			label: 'Alice',
			address: ADDR_A,
		});
		expect(stored()).toHaveLength(1);
	});

	it('rejects invalid addresses with an address error', () => {
		const result = useAddressBook
			.getState()
			.add({ label: 'Bad', address: 'GNOTAVALIDADDRESS' });

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.field).toBe('address');
		expect(useAddressBook.getState().entries).toHaveLength(0);
		expect(stored()).toHaveLength(0);
	});

	it('rejects blank labels', () => {
		const result = useAddressBook
			.getState()
			.add({ label: '  ', address: ADDR_A });

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.field).toBe('label');
	});

	it('rejects duplicate addresses', () => {
		const { add } = useAddressBook.getState();
		add({ label: 'Alice', address: ADDR_A });
		const result = add({ label: 'Other', address: ADDR_A });

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.field).toBe('address');
		expect(useAddressBook.getState().entries).toHaveLength(1);
	});

	it('rejects duplicate labels case-insensitively', () => {
		const { add } = useAddressBook.getState();
		add({ label: 'Alice', address: ADDR_A });
		const result = add({ label: 'alice', address: ADDR_B });

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.field).toBe('label');
		expect(useAddressBook.getState().entries).toHaveLength(1);
	});

	it('edits an entry and persists the change', () => {
		const added = useAddressBook
			.getState()
			.add({ label: 'Alice', address: ADDR_A });
		if (!added.ok) throw new Error('setup failed');

		const result = useAddressBook
			.getState()
			.update(added.entry.id, { label: 'Alice B', address: ADDR_B });

		expect(result.ok).toBe(true);
		expect(useAddressBook.getState().entries[0]).toMatchObject({
			id: added.entry.id,
			label: 'Alice B',
			address: ADDR_B,
		});
		expect(stored()[0].label).toBe('Alice B');
	});

	it('allows an edit that keeps its own label and address', () => {
		const added = useAddressBook
			.getState()
			.add({ label: 'Alice', address: ADDR_A });
		if (!added.ok) throw new Error('setup failed');

		const result = useAddressBook
			.getState()
			.update(added.entry.id, { label: 'Alice', address: ADDR_A });

		expect(result.ok).toBe(true);
	});

	it('rejects an edit that collides with another entry', () => {
		const { add } = useAddressBook.getState();
		add({ label: 'Alice', address: ADDR_A });
		const second = add({ label: 'Bob', address: ADDR_B });
		if (!second.ok) throw new Error('setup failed');

		const result = useAddressBook
			.getState()
			.update(second.entry.id, { label: 'Alice', address: ADDR_B });

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.field).toBe('label');
	});

	it('deletes an entry and persists the removal', () => {
		const added = useAddressBook
			.getState()
			.add({ label: 'Alice', address: ADDR_A });
		if (!added.ok) throw new Error('setup failed');

		useAddressBook.getState().remove(added.entry.id);

		expect(useAddressBook.getState().entries).toHaveLength(0);
		expect(stored()).toHaveLength(0);
	});

	it('restores entries from localStorage on reload', () => {
		useAddressBook.getState().add({ label: 'Alice', address: ADDR_A });
		useAddressBook.setState({ entries: [] });

		useAddressBook.getState().reload();

		expect(useAddressBook.getState().entries).toHaveLength(1);
		expect(useAddressBook.getState().findByAddress(ADDR_A)?.label).toBe(
			'Alice'
		);
	});

	it('ignores corrupt stored data on reload', () => {
		window.localStorage.setItem(ADDRESS_BOOK_STORAGE_KEY, '{not json');

		useAddressBook.getState().reload();

		expect(useAddressBook.getState().entries).toEqual([]);
	});
});
