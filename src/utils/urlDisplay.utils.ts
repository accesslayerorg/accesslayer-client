/**
 * URL display utilities for safe truncation with full URL access via tooltips
 */

export interface UrlDisplayOptions {
	/** Maximum length before truncation. Defaults to 40. */
	maxLength?: number;
	/** Whether to include protocol in display. Defaults to true. */
	showProtocol?: boolean;
	/** Whether to truncate from the middle. Defaults to true. */
	truncateMiddle?: boolean;
}

/**
 * Truncates a URL for safe display while preserving full URL access via tooltip
 * 
 * @param url - The URL to truncate
 * @param options - Display options
 * @returns Object containing display text and full URL for tooltip
 */
export function truncateUrlForDisplay(url: string, options: UrlDisplayOptions = {}) {
	const {
		maxLength = 40,
		showProtocol = true,
		truncateMiddle = true
	} = options;

	if (!url) {
		return { displayText: '', fullUrl: '' };
	}

	// Clean the URL - remove trailing slashes for consistency
	const cleanUrl = url.replace(/\/+$/, '');

	// If URL is short enough, return as-is
	if (cleanUrl.length <= maxLength) {
		return {
			displayText: cleanUrl,
			fullUrl: cleanUrl
		};
	}

	// Parse URL to understand structure
	try {
		const urlObj = new URL(cleanUrl);
		const protocol = urlObj.protocol;
		const domain = urlObj.hostname;
		const path = urlObj.pathname + urlObj.search + urlObj.hash;

		// Build display based on options
		if (showProtocol) {
			const protocolPart = `${protocol}//`;
			const remainingLength = maxLength - protocolPart.length;
			
			if (truncateMiddle) {
				// Truncate middle: keep protocol and domain, truncate path
				const domainWithPath = domain + path;
				if (domainWithPath.length <= remainingLength) {
					return {
						displayText: cleanUrl,
						fullUrl: cleanUrl
					};
				}
				
				// Show domain fully, truncate path
				const pathStart = Math.max(domain.length, Math.floor(remainingLength / 2));
				const beforeEllipsis = domainWithPath.substring(0, pathStart);
				const afterEllipsis = domainWithPath.substring(domainWithPath.length - (remainingLength - pathStart - 3));
				
				return {
					displayText: `${protocolPart}${beforeEllipsis}...${afterEllipsis}`,
					fullUrl: cleanUrl
				};
			} else {
				// Truncate from end
				const displayPart = cleanUrl.substring(0, maxLength - 3);
				return {
					displayText: `${displayPart}...`,
					fullUrl: cleanUrl
				};
			}
		} else {
			// No protocol shown - focus on domain and path
			const domainAndPath = domain + path;
			
			if (truncateMiddle) {
				if (domainAndPath.length <= maxLength) {
					return {
						displayText: domainAndPath,
						fullUrl: cleanUrl
					};
				}
				
				const beforeEllipsis = domainAndPath.substring(0, Math.floor(maxLength / 2));
				const afterEllipsis = domainAndPath.substring(domainAndPath.length - Math.floor(maxLength / 2) - 3);
				
				return {
					displayText: `${beforeEllipsis}...${afterEllipsis}`,
					fullUrl: cleanUrl
				};
			} else {
				const displayPart = domainAndPath.substring(0, maxLength - 3);
				return {
					displayText: `${displayPart}...`,
					fullUrl: cleanUrl
				};
			}
		}
	} catch {
		// URL parsing failed, treat as plain string
		if (truncateMiddle) {
			const beforeEllipsis = cleanUrl.substring(0, Math.floor(maxLength / 2));
			const afterEllipsis = cleanUrl.substring(cleanUrl.length - Math.floor(maxLength / 2) - 3);
			return {
				displayText: `${beforeEllipsis}...${afterEllipsis}`,
				fullUrl: cleanUrl
			};
		} else {
			const displayPart = cleanUrl.substring(0, maxLength - 3);
			return {
				displayText: `${displayPart}...`,
				fullUrl: cleanUrl
			};
		}
	}
}

/**
 * Simplified version that returns just the display text
 */
export function getDisplayUrl(url: string, options?: UrlDisplayOptions): string {
	return truncateUrlForDisplay(url, options).displayText;
}

/**
 * Checks if a URL should be truncated based on options
 */
export function shouldTruncateUrl(url: string, options?: UrlDisplayOptions): boolean {
	const { maxLength = 40 } = options || {};
	return url.length > maxLength;
}
