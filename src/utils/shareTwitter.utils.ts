export interface BuildShareTweetOptions {
	creatorName: string;
	amount?: number | string | null;
	referralLink: string;
	priceXlm?: string | number | null;
}

export function buildKeyPurchaseTweetText({
	creatorName,
	amount,
	referralLink,
	priceXlm,
}: BuildShareTweetOptions): string {
	const quantity =
		amount != null && String(amount).trim() !== ''
			? Number(amount)
			: null;
	const hasValidQuantity =
		quantity != null && !Number.isNaN(quantity) && quantity > 0;
	const countStr = hasValidQuantity
		? `${quantity} `
		: amount != null && String(amount).trim() !== ''
		? `${amount} `
		: '';
	const keyWord = quantity === 1 ? 'key' : 'keys';

	if (countStr) {
		if (priceXlm != null && String(priceXlm).trim() !== '') {
			return `Just bought ${countStr}${creatorName} ${keyWord} on AccessLayer at ${priceXlm} XLM. Buy here: ${referralLink}`;
		}
		return `Just bought ${countStr}${creatorName} ${keyWord} on AccessLayer! Buy here: ${referralLink}`;
	}

	if (priceXlm != null && String(priceXlm).trim() !== '') {
		return `Just bought ${creatorName} keys on AccessLayer at ${priceXlm} XLM. Buy here: ${referralLink}`;
	}

	return `Just bought ${creatorName} keys on AccessLayer! Buy here: ${referralLink}`;
}

export function buildShareTweetText(
	creatorName: string,
	priceXlm: string | number,
	buyUrl: string,
	amount?: number | string | null
): string {
	return buildKeyPurchaseTweetText({
		creatorName,
		priceXlm,
		referralLink: buyUrl,
		amount,
	});
}

export function buildTwitterIntentUrl(tweetText: string): string {
	return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
}

