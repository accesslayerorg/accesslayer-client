export type BadgeStyle = 'flat' | 'plastic' | 'for-the-badge';
export type EmbedMetric = 'price' | 'holders' | 'change24h';
export type EmbedTheme = 'dark' | 'light';

export interface EmbedConfig {
	creatorKeyId: string;
	creatorName: string;
	style: BadgeStyle;
	metric: EmbedMetric;
	theme: EmbedTheme;
	width: number;
	height: number;
	allowedDomains: string[];
}

export interface EmbedStatsSnapshot {
	priceXlm: number;
	holders: number;
	change24hPercent: number;
	weeklyWidgetLoads: number;
	dailyLoads: Array<{ day: string; loads: number }>;
}
