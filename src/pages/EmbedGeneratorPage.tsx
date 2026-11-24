import React, { useState, useMemo } from 'react';
import {
	buildMarkdownSnippet,
	buildHtmlSnippet,
	buildIframeSnippet,
	buildBadgeUrl,
	generateSvgBadge,
	formatBadgeMetricLabel,
} from '@/utils/embedGenerator.utils';
import type { BadgeStyle, EmbedMetric, EmbedTheme } from '@/types/embed.types';
import EmbedWidgetView from '@/components/creator/EmbedWidgetView';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Copy, Check, Code2, Eye, ShieldCheck, BarChart3, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

const CREATOR_OPTIONS = [
	{ id: 'alice-key', name: 'Alice Stellar', priceXlm: 14.5, holders: 128, change24hPercent: 8.4 },
	{ id: 'bob-key', name: 'Bob Horizons', priceXlm: 8.2, holders: 64, change24hPercent: -2.1 },
	{ id: 'charlie-key', name: 'Charlie Soroban', priceXlm: 22.0, holders: 215, change24hPercent: 15.2 },
];

const WEEKLY_ANALYTICS = [
	{ day: 'Mon', loads: 185 },
	{ day: 'Tue', loads: 210 },
	{ day: 'Wed', loads: 194 },
	{ day: 'Thu', loads: 245 },
	{ day: 'Fri', loads: 280 },
	{ day: 'Sat', loads: 162 },
	{ day: 'Sun', loads: 144 },
];

export default function EmbedGeneratorPage() {
	useDocumentTitle('Embeddable Key Stats & Widget — AccessLayer');

	const [creatorKeyId, setCreatorKeyId] = useState(CREATOR_OPTIONS[0].id);
	const [style, setStyle] = useState<BadgeStyle>('flat');
	const [metric, setMetric] = useState<EmbedMetric>('price');
	const [theme, setTheme] = useState<EmbedTheme>('dark');
	const [width, setWidth] = useState<number>(360);
	const [height, setHeight] = useState<number>(180);
	const [domainInput, setDomainInput] = useState('');
	const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
	const [copiedTab, setCopiedTab] = useState<'markdown' | 'html' | 'iframe' | null>(null);

	const selectedCreator = useMemo(
		() => CREATOR_OPTIONS.find((c) => c.id === creatorKeyId) ?? CREATOR_OPTIONS[0],
		[creatorKeyId]
	);

	const metricValueString = useMemo(() => {
		switch (metric) {
			case 'price':
				return `${selectedCreator.priceXlm.toFixed(2)} XLM`;
			case 'holders':
				return `${selectedCreator.holders}`;
			case 'change24h':
				return `${selectedCreator.change24hPercent >= 0 ? '+' : ''}${selectedCreator.change24hPercent.toFixed(1)}%`;
		}
	}, [metric, selectedCreator]);

	const badgeSvgString = useMemo(
		() =>
			generateSvgBadge({
				label: `${selectedCreator.name} • ${formatBadgeMetricLabel(metric)}`,
				value: metricValueString,
				style,
				theme,
			}),
		[selectedCreator.name, metric, metricValueString, style, theme]
	);

	const config = useMemo(
		() => ({
			creatorKeyId: selectedCreator.id,
			creatorName: selectedCreator.name,
			style,
			metric,
			theme,
			width,
			height,
			allowedDomains,
		}),
		[selectedCreator, style, metric, theme, width, height, allowedDomains]
	);

	const markdownCode = useMemo(() => buildMarkdownSnippet(config), [config]);
	const htmlCode = useMemo(() => buildHtmlSnippet(config), [config]);
	const iframeCode = useMemo(() => buildIframeSnippet(config), [config]);
	const badgeUrl = useMemo(() => buildBadgeUrl(config), [config]);

	const totalWeeklyLoads = useMemo(
		() => WEEKLY_ANALYTICS.reduce((sum, item) => sum + item.loads, 0),
		[]
	);

	const handleCopy = async (type: 'markdown' | 'html' | 'iframe', text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedTab(type);
			toast.success(`${type.toUpperCase()} snippet copied to clipboard`);
			setTimeout(() => setCopiedTab(null), 2000);
		} catch {
			toast.error('Failed to copy snippet');
		}
	};

	const handleAddDomain = (e: React.FormEvent) => {
		e.preventDefault();
		const cleaned = domainInput.trim().toLowerCase();
		if (!cleaned) return;
		if (!allowedDomains.includes(cleaned)) {
			setAllowedDomains([...allowedDomains, cleaned]);
		}
		setDomainInput('');
	};

	const handleRemoveDomain = (domain: string) => {
		setAllowedDomains(allowedDomains.filter((d) => d !== domain));
	};

	return (
		<div className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12" data-testid="embed-generator-page">
			<div className="mx-auto max-w-6xl space-y-8">
				{/* Header */}
				<header>
					<span className="rounded-md bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-300 border border-amber-400/20">
						Creator Tools
					</span>
					<h1 className="mt-2 font-grotesque text-3xl font-black tracking-tight">
						Embeddable Key Stats & Widget Generator
					</h1>
					<p className="mt-1 text-sm text-white/60">
						Display live AccessLayer key metrics on your personal website, blog, or GitHub README.
					</p>
				</header>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
					{/* Configuration Panel */}
					<section className="lg:col-span-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
						<h2 className="text-lg font-bold flex items-center gap-2">
							<Code2 className="h-5 w-5 text-amber-400" />
							Configuration
						</h2>

						{/* Creator Key Select */}
						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-white/70">Creator Key</label>
							<select
								value={creatorKeyId}
								onChange={(e) => setCreatorKeyId(e.target.value)}
								className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
								data-testid="embed-creator-select"
							>
								{CREATOR_OPTIONS.map((c) => (
									<option key={c.id} value={c.id} className="bg-[#0b1728]">
										{c.name} ({c.id})
									</option>
								))}
							</select>
						</div>

						{/* Metric & Style */}
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1.5">
								<label className="text-xs font-semibold text-white/70">Badge Metric</label>
								<select
									value={metric}
									onChange={(e) => setMetric(e.target.value as EmbedMetric)}
									className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
									data-testid="embed-metric-select"
								>
									<option value="price" className="bg-[#0b1728]">Price (XLM)</option>
									<option value="holders" className="bg-[#0b1728]">Holders</option>
									<option value="change24h" className="bg-[#0b1728]">24h Change</option>
								</select>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-semibold text-white/70">Badge Style</label>
								<select
									value={style}
									onChange={(e) => setStyle(e.target.value as BadgeStyle)}
									className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
									data-testid="embed-style-select"
								>
									<option value="flat" className="bg-[#0b1728]">Flat</option>
									<option value="plastic" className="bg-[#0b1728]">Plastic</option>
									<option value="for-the-badge" className="bg-[#0b1728]">For The Badge</option>
								</select>
							</div>
						</div>

						{/* Theme & Widget Size */}
						<div className="grid grid-cols-3 gap-3">
							<div className="space-y-1.5">
								<label className="text-xs font-semibold text-white/70">Theme</label>
								<select
									value={theme}
									onChange={(e) => setTheme(e.target.value as EmbedTheme)}
									className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
									data-testid="embed-theme-select"
								>
									<option value="dark" className="bg-[#0b1728]">Dark</option>
									<option value="light" className="bg-[#0b1728]">Light</option>
								</select>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-semibold text-white/70">Width (px)</label>
								<input
									type="number"
									min="260"
									max="800"
									value={width}
									onChange={(e) => setWidth(Math.max(260, parseInt(e.target.value, 10) || 360))}
									className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-mono text-white focus:border-amber-400 focus:outline-none"
									data-testid="embed-width-input"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-semibold text-white/70">Height (px)</label>
								<input
									type="number"
									min="140"
									max="400"
									value={height}
									onChange={(e) => setHeight(Math.max(140, parseInt(e.target.value, 10) || 180))}
									className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-mono text-white focus:border-amber-400 focus:outline-none"
									data-testid="embed-height-input"
								/>
							</div>
						</div>

						{/* Domain Allowlist (#1479) */}
						<div className="space-y-2 border-t border-white/5 pt-4">
							<label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
								<ShieldCheck className="h-4 w-4 text-emerald-400" />
								Widget Domain Allowlist (optional)
							</label>
							<form onSubmit={handleAddDomain} className="flex gap-2">
								<input
									type="text"
									placeholder="e.g. myblog.com or *.mysite.io"
									value={domainInput}
									onChange={(e) => setDomainInput(e.target.value)}
									className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
									data-testid="embed-domain-input"
								/>
								<button
									type="submit"
									className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
									data-testid="embed-add-domain-btn"
								>
									<Plus className="h-4 w-4" />
								</button>
							</form>

							{allowedDomains.length > 0 ? (
								<div className="flex flex-wrap gap-1.5 mt-2" data-testid="embed-domain-list">
									{allowedDomains.map((domain) => (
										<span
											key={domain}
											className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-mono text-emerald-300 border border-emerald-500/30"
										>
											{domain}
											<button
												type="button"
												onClick={() => handleRemoveDomain(domain)}
												className="hover:text-white"
											>
												<X className="h-3 w-3" />
											</button>
										</span>
									))}
								</div>
							) : (
								<p className="text-[11px] text-white/40">
									No domains restricted — widget can be embedded on any site.
								</p>
							)}
						</div>
					</section>

					{/* Preview & Snippets Panel */}
					<section className="lg:col-span-7 space-y-6">
						{/* Live Preview Pane */}
						<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
							<div className="flex items-center justify-between">
								<h2 className="text-lg font-bold flex items-center gap-2">
									<Eye className="h-5 w-5 text-amber-400" />
									Live Preview
								</h2>
								<span className="text-[11px] text-white/40 font-mono">
									Cache-Control: max-age=60, s-maxage=300
								</span>
							</div>

							{/* SVG Badge Preview */}
							<div className="space-y-2">
								<span className="text-xs font-semibold text-white/60 block">SVG Badge</span>
								<div
									className="rounded-xl border border-dashed border-white/15 bg-black/30 p-4 flex items-center justify-center"
									data-testid="badge-preview-container"
									dangerouslySetInnerHTML={{ __html: badgeSvgString }}
								/>
								<p className="text-[10px] font-mono text-white/40 truncate" data-testid="badge-url-display">
									API Endpoint: {badgeUrl}
								</p>
							</div>

							{/* Widget Preview */}
							<div className="space-y-2">
								<span className="text-xs font-semibold text-white/60 block">
									Iframe Widget ({width}×{height}px)
								</span>
								<div className="rounded-xl border border-dashed border-white/15 bg-black/30 p-4 flex justify-center overflow-auto">
									<div style={{ width: `${width}px`, height: `${height}px` }} data-testid="widget-preview-box">
										<EmbedWidgetView
											creatorKeyId={selectedCreator.id}
											creatorName={selectedCreator.name}
											theme={theme}
											priceXlm={selectedCreator.priceXlm}
											holders={selectedCreator.holders}
											change24hPercent={selectedCreator.change24hPercent}
										/>
									</div>
								</div>
							</div>
						</div>

						{/* Snippets & Copy Buttons (#1479) */}
						<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
							<h3 className="text-sm font-bold text-white">Generated Embed Snippets</h3>

							{/* Markdown */}
							<div className="space-y-1.5">
								<div className="flex justify-between items-center text-xs">
									<span className="text-white/60 font-semibold">Markdown (GitHub README)</span>
									<button
										type="button"
										onClick={() => handleCopy('markdown', markdownCode)}
										className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-medium hover:bg-white/20"
										data-testid="copy-markdown-btn"
									>
										{copiedTab === 'markdown' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
										{copiedTab === 'markdown' ? 'Copied' : 'Copy Markdown'}
									</button>
								</div>
								<pre className="rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] font-mono text-amber-200 overflow-x-auto" data-testid="markdown-snippet-code">
									{markdownCode}
								</pre>
							</div>

							{/* HTML */}
							<div className="space-y-1.5">
								<div className="flex justify-between items-center text-xs">
									<span className="text-white/60 font-semibold">HTML Image Badge</span>
									<button
										type="button"
										onClick={() => handleCopy('html', htmlCode)}
										className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-medium hover:bg-white/20"
										data-testid="copy-html-btn"
									>
										{copiedTab === 'html' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
										{copiedTab === 'html' ? 'Copied' : 'Copy HTML'}
									</button>
								</div>
								<pre className="rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] font-mono text-emerald-200 overflow-x-auto" data-testid="html-snippet-code">
									{htmlCode}
								</pre>
							</div>

							{/* iframe */}
							<div className="space-y-1.5">
								<div className="flex justify-between items-center text-xs">
									<span className="text-white/60 font-semibold">Interactive Iframe Widget</span>
									<button
										type="button"
										onClick={() => handleCopy('iframe', iframeCode)}
										className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-medium hover:bg-white/20"
										data-testid="copy-iframe-btn"
									>
										{copiedTab === 'iframe' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
										{copiedTab === 'iframe' ? 'Copied' : 'Copy Iframe'}
									</button>
								</div>
								<pre className="rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] font-mono text-sky-200 overflow-x-auto" data-testid="iframe-snippet-code">
									{iframeCode}
								</pre>
							</div>
						</div>

						{/* Weekly Embed Analytics (#1479) */}
						<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4" data-testid="embed-analytics-panel">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<BarChart3 className="h-5 w-5 text-amber-400" />
									<h3 className="text-sm font-bold text-white">Embed Analytics (This Week)</h3>
								</div>
								<span className="font-mono text-lg font-black text-amber-300" data-testid="weekly-load-count">
									{totalWeeklyLoads.toLocaleString()} loads
								</span>
							</div>

							<div className="grid grid-cols-7 gap-2 pt-2">
								{WEEKLY_ANALYTICS.map((d) => {
									const heightPct = Math.round((d.loads / 300) * 100);
									return (
										<div key={d.day} className="flex flex-col items-center gap-1.5">
											<div className="w-full h-20 flex items-end justify-center bg-white/[0.02] rounded-lg p-1">
												<div
													style={{ height: `${heightPct}%` }}
													className="w-full rounded-sm bg-amber-400/80"
													title={`${d.loads} loads`}
												/>
											</div>
											<span className="text-[10px] text-white/50 font-mono">{d.day}</span>
										</div>
									);
								})}
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
