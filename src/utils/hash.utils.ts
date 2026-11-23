function fnv1a(input: string, seed: number): number {
	let hash = seed >>> 0;
	for (let index = 0; index < input.length; index += 1) {
		hash ^= input.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	return hash >>> 0;
}

export function computeContentHash(
	...parts: Array<string | ArrayBuffer | null | undefined>
): string {
	const serialized = parts
		.map(part => {
			if (part == null) return '';
			if (typeof part === 'string') return part;
			return Array.from(new Uint8Array(part), byte =>
				byte.toString(16).padStart(2, '0')
			).join('');
		})
		.join('\u0000');

	const seeds = [
		0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f,
		0x165667b1, 0x1b873593,
	];
	const blocks = seeds.map(seed =>
		fnv1a(serialized, seed).toString(16).padStart(8, '0')
	);

	return `0x${blocks.join('')}`;
}

export function computeProofHash(link: string, description: string): string {
	return computeContentHash('proof', link.trim(), description.trim());
}

export function computeEvidenceHash(
	link: string,
	description = '',
	fileBytes?: ArrayBuffer | null
): string {
	return computeContentHash(
		'evidence',
		link.trim(),
		description.trim(),
		fileBytes
	);
}
