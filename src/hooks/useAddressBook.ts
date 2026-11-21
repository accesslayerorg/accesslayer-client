import { create } from 'zustand';
import { StrKey } from '@stellar/stellar-sdk';

/** localStorage key backing the saved recipient address book (#1296). */
export const ADDRESS_BOOK_STORAGE_KEY = 'al:address-book';

export const MAX_LABEL_LENGTH = 40;

export interface AddressBookEntry {
	id: string;
	label: string;
	address: string;
}

export interface AddressBookInput {
	label: string;
	address: string;
}

export type AddressBookField = 'label' | 'address';

export interface AddressBookError {
	field: AddressBookField;
	message: string;
}

export type AddressBookResult =
	| { ok: true; entry: AddressBookEntry }
	| { ok: false; error: AddressBookError };

/** Trims an address; Stellar public keys are uppercase base32. */
export function normalizeAddress(address: string): string {
	return address.trim().toUpperCase();
}

function normalizeLabel(label: string): string {
	return label.trim();
}

function isValidAddress(address: string): boolean {
	try {
		return StrKey.isValidEd25519PublicKey(address);
	} catch {
		return false;
	}
}

/**
 * Validates a candidate entry against the existing entries. `excludeId` skips
 * the entry being edited so it does not conflict with itself.
 */
export function validateAddressBookInput(
	entries: AddressBookEntry[],
	input: AddressBookInput,
	excludeId?: string
): AddressBookError | null {
	const label = normalizeLabel(input.label);
	const address = normalizeAddress(input.address);

	if (!label) return { field: 'label', message: 'Label is required' };
	if (label.length > MAX_LABEL_LENGTH) {
		return {
			field: 'label',
			message: `Label must be ${MAX_LABEL_LENGTH} characters or fewer`,
		};
	}
	if (!address) return { field: 'address', message: 'Address is required' };
	if (!isValidAddress(address)) {
		return {
			field: 'address',
			message: 'Enter a valid Stellar public address (starts with G)',
		};
	}

	const others = entries.filter(entry => entry.id !== excludeId);
	if (others.some(entry => entry.address === address)) {
		return { field: 'address', message: 'This address is already saved' };
	}
	if (others.some(entry => entry.label.toLowerCase() === label.toLowerCase())) {
		return { field: 'label', message: 'This label is already in use' };
	}
	return null;
}

function readStoredEntries(): AddressBookEntry[] {
	try {
		const raw = window.localStorage.getItem(ADDRESS_BOOK_STORAGE_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(item): item is AddressBookEntry =>
				typeof item === 'object' &&
				item !== null &&
				typeof (item as AddressBookEntry).id === 'string' &&
				typeof (item as AddressBookEntry).label === 'string' &&
				typeof (item as AddressBookEntry).address === 'string'
		);
	} catch {
		return [];
	}
}

function persist(entries: AddressBookEntry[]) {
	try {
		window.localStorage.setItem(
			ADDRESS_BOOK_STORAGE_KEY,
			JSON.stringify(entries)
		);
	} catch {
		// Storage unavailable or full: keep the in-memory state usable.
	}
}

function createId(): string {
	return typeof crypto !== 'undefined' && 'randomUUID' in crypto
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface AddressBookState {
	entries: AddressBookEntry[];
	add: (input: AddressBookInput) => AddressBookResult;
	update: (id: string, input: AddressBookInput) => AddressBookResult;
	remove: (id: string) => void;
	findByAddress: (address: string) => AddressBookEntry | undefined;
	/** Re-reads entries from localStorage (e.g. after a reload). */
	reload: () => void;
}

/**
 * Local address book of labeled key-transfer recipients (#1296).
 *
 * Backed by a shared store so edits in account settings are reflected
 * immediately in every recipient picker, and persisted to localStorage.
 */
export const useAddressBook = create<AddressBookState>((set, get) => ({
	entries: readStoredEntries(),

	add: input => {
		const error = validateAddressBookInput(get().entries, input);
		if (error) return { ok: false, error };
		const entry: AddressBookEntry = {
			id: createId(),
			label: normalizeLabel(input.label),
			address: normalizeAddress(input.address),
		};
		const entries = [...get().entries, entry];
		persist(entries);
		set({ entries });
		return { ok: true, entry };
	},

	update: (id, input) => {
		const existing = get().entries.find(entry => entry.id === id);
		if (!existing) {
			return {
				ok: false,
				error: { field: 'label', message: 'Entry no longer exists' },
			};
		}
		const error = validateAddressBookInput(get().entries, input, id);
		if (error) return { ok: false, error };
		const entry: AddressBookEntry = {
			id,
			label: normalizeLabel(input.label),
			address: normalizeAddress(input.address),
		};
		const entries = get().entries.map(item => (item.id === id ? entry : item));
		persist(entries);
		set({ entries });
		return { ok: true, entry };
	},

	remove: id => {
		const entries = get().entries.filter(entry => entry.id !== id);
		persist(entries);
		set({ entries });
	},

	findByAddress: address => {
		const key = normalizeAddress(address);
		return key ? get().entries.find(entry => entry.address === key) : undefined;
	},

	reload: () => set({ entries: readStoredEntries() }),
}));
