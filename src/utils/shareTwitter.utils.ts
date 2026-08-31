export function buildShareTweetText(
	creatorName: string,
	priceXlm: string | number,
	buyUrl: string
): string {
	return `Just bought ${creatorName} keys on AccessLayer at ${priceXlm} XLM. Buy here: ${buyUrl}`;
}

export function buildTwitterIntentUrl(tweetText: string): string {
	return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
}
