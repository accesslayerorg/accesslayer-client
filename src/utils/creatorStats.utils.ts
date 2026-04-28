/**
 * Creator statistics utilities for providing fallback labels when keys are missing
 */

export interface CreatorStatConfig {
	key: string;
	label: string;
	fallbackLabel?: string;
}

export interface CreatorStatValue {
	value: string | number;
	label?: string;
	fallbackLabel?: string;
}

/**
 * Default fallback labels for common creator stat keys
 */
export const DEFAULT_STAT_FALLBACKS: Record<string, string> = {
	// Engagement metrics
	'followers': 'Followers',
	'following': 'Following',
	'likes': 'Likes',
	'shares': 'Shares',
	'comments': 'Comments',
	'views': 'Views',
	'engagement': 'Engagement',
	
	// Creator-specific metrics
	'collectors': 'Collectors',
	'holders': 'Holders',
	'supply': 'Supply',
	'volume': 'Volume',
	'floor_price': 'Floor Price',
	'market_cap': 'Market Cap',
	'revenue': 'Revenue',
	'sales': 'Sales',
	
	// Content metrics
	'creations': 'Creations',
	'works': 'Works',
	'pieces': 'Pieces',
	'drops': 'Drops',
	'releases': 'Releases',
	
	// Time-based metrics
	'joined': 'Joined',
	'created': 'Created',
	'last_active': 'Last Active',
	'updated': 'Updated',
	
	// Generic metrics
	'count': 'Count',
	'total': 'Total',
	'amount': 'Amount',
	'quantity': 'Quantity',
	'percentage': 'Percentage',
	'ratio': 'Ratio'
};

/**
 * Generates a human-readable fallback label from a key
 * 
 * @param key - The stat key (e.g., 'collector_count', 'monthly_revenue')
 * @returns A readable fallback label
 */
export function generateFallbackLabel(key: string): string {
	if (!key || typeof key !== 'string') {
		return 'Unknown';
	}

	// Check if we have a predefined fallback
	const normalizedKey = key.toLowerCase().trim();
	if (DEFAULT_STAT_FALLBACKS[normalizedKey]) {
		return DEFAULT_STAT_FALLBACKS[normalizedKey];
	}

	// Generate from key by transforming snake_case/camelCase to Title Case
	const words = key
		.replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to words
		.replace(/[_-]/g, ' ') // underscores/hyphens to spaces
		.trim()
		.split(/\s+/)
		.filter(word => word.length > 0);

	if (words.length === 0) {
		return 'Unknown';
	}

	// Capitalize first letter of each word, handle common abbreviations
	const titleCaseWords = words.map(word => {
		const lowerWord = word.toLowerCase();
		
		// Handle common abbreviations
		if (lowerWord === 'id') return 'ID';
		if (lowerWord === 'api') return 'API';
		if (lowerWord === 'url') return 'URL';
		if (lowerWord === 'ui') return 'UI';
		if (lowerWord === 'ux') return 'UX';
		
		// Capitalize first letter
		return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
	});

	return titleCaseWords.join(' ');
}

/**
 * Gets the appropriate label for a creator stat with fallback
 * 
 * @param stat - The stat object containing value and optional label
 * @param key - The stat key for fallback generation
 * @param customFallbacks - Custom fallback mappings
 * @returns The appropriate label
 */
export function getCreatorStatLabel(
	stat: CreatorStatValue | undefined,
	key: string,
	customFallbacks?: Record<string, string>
): string {
	// If stat has a label, use it
	if (stat?.label && typeof stat.label === 'string' && stat.label.trim()) {
		return stat.label.trim();
	}

	// If stat has a custom fallback label, use it
	if (stat?.fallbackLabel && typeof stat.fallbackLabel === 'string' && stat.fallbackLabel.trim()) {
		return stat.fallbackLabel.trim();
	}

	// Check custom fallbacks first
	if (customFallbacks && customFallbacks[key]) {
		return customFallbacks[key];
	}

	// Use default fallbacks
	const normalizedKey = key.toLowerCase().trim();
	if (DEFAULT_STAT_FALLBACKS[normalizedKey]) {
		return DEFAULT_STAT_FALLBACKS[normalizedKey];
	}

	// Generate fallback from key
	return generateFallbackLabel(key);
}

/**
 * Validates that a stat label is present and readable
 * 
 * @param label - The label to validate
 * @returns Whether the label is valid
 */
export function isValidStatLabel(label: string | undefined): boolean {
	return Boolean(
		label && 
		typeof label === 'string' && 
		label.trim().length > 0 &&
		label.trim() !== 'undefined' &&
		label.trim() !== 'null'
	);
}

/**
 * Processes an array of creator stats to ensure all have valid labels
 * 
 * @param stats - Array of stat entries with keys and values
 * @param customFallbacks - Custom fallback mappings
 * @returns Processed stats with guaranteed valid labels
 */
export function processCreatorStats(
	stats: Array<{ key: string; value: CreatorStatValue }>,
	customFallbacks?: Record<string, string>
): Array<{ key: string; value: CreatorStatValue; label: string }> {
	return stats.map(stat => ({
		...stat,
		label: getCreatorStatLabel(stat.value, stat.key, customFallbacks)
	}));
}

/**
 * Creates a stat value object with proper fallback handling
 * 
 * @param value - The stat value
 * @param label - Optional label
 * @param fallbackLabel - Optional custom fallback
 * @returns CreatorStatValue object
 */
export function createCreatorStatValue(
	value: string | number,
	label?: string,
	fallbackLabel?: string
): CreatorStatValue {
	return {
		value,
		label,
		fallbackLabel
	};
}
