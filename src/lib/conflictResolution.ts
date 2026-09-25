export interface ConflictEntry {
	data: Record<string, unknown>;
	dataUpdatedAt: number;
}

export interface ConflictResolutionOptions {
	optimisticFields?: string[];
}

/**
 * Last-write-wins merge for IndexedDB vs server data.
 *
 * If the server response is newer, its data wins for all fields except those
 * listed in `optimisticFields`, which are preserved from the local entry (they
 * carry user-initiated optimistic updates made while offline).
 *
 * If the local entry is newer, it is returned unchanged — the server has
 * nothing new to offer.
 */
export function resolveConflict(
	localEntry: ConflictEntry,
	serverEntry: ConflictEntry,
	options: ConflictResolutionOptions = {}
): ConflictEntry {
	const { optimisticFields = [] } = options;

	if (serverEntry.dataUpdatedAt <= localEntry.dataUpdatedAt) {
		return localEntry;
	}

	if (optimisticFields.length === 0) {
		return serverEntry;
	}

	const merged: Record<string, unknown> = { ...serverEntry.data };
	for (const field of optimisticFields) {
		if (Object.prototype.hasOwnProperty.call(localEntry.data, field)) {
			merged[field] = localEntry.data[field];
		}
	}

	return { data: merged, dataUpdatedAt: serverEntry.dataUpdatedAt };
}
