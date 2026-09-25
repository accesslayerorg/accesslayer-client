export const creatorListKey = (creatorId: number | string): string => {
	const str = String(creatorId);
	return str.startsWith('creator-') ? str : `creator-${str}`;
};

