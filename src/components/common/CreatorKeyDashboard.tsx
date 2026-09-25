import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import {
	useCreatorKeyStore,
	selectSelectedKey,
} from '@/hooks/useCreatorKeyStore';
import {
	validateKeyConfig,
	validateKeyMetadata,
	CONFIG_BOUNDS,
	type KeyConfig,
	type KeyMetadata,
} from '@/services/creatorKey.service';
import {
	Key,
	Users,
	BarChart3,
	TrendingUp,
	Sliders,
	Edit3,
	Clock,
	CheckCircle,
	AlertCircle,
	Shield,
	ExternalLink,
	RefreshCw,
} from 'lucide-react';

export interface CreatorKeyDashboardProps {
	creatorAddress?: string;
	className?: string;
}

export const CreatorKeyDashboard: React.FC<CreatorKeyDashboardProps> = ({
	creatorAddress,
	className = '',
}) => {
	const { address, isConnected } = useAccount();
	const effectiveAddress = creatorAddress ?? address;
	const effectiveConnected = Boolean(creatorAddress || (isConnected && address));
	const {
		keys,
		selectedKeyId,
		isLoading,
		isSubmitting,
		txStatus,
		txMessage,
		timelockNotice,
		fetchKeys,
		selectKey,
		updateMetadata,
		updateConfig,
		clearStatus,
	} = useCreatorKeyStore();

	const selectedKey = selectSelectedKey({ keys, selectedKeyId });

	const [activeTab, setActiveTab] = useState<'analytics' | 'metadata' | 'config'>('analytics');

	// Metadata form state
	const [metaForm, setMetaForm] = useState<KeyMetadata>({
		name: '',
		symbol: '',
		description: '',
		imageUri: '',
	});
	const [metaErrors, setMetaErrors] = useState<Partial<Record<keyof KeyMetadata, string>>>({});

	// Config form state
	const [configForm, setConfigForm] = useState<KeyConfig>({
		spreadBps: 500,
		cooldownSeconds: 300,
		holdingCap: 50,
	});
	const [configErrors, setConfigErrors] = useState<Partial<Record<keyof KeyConfig, string>>>({});

	// Fetch keys on connect or address change
	useEffect(() => {
		if (effectiveConnected && effectiveAddress) {
			void fetchKeys(effectiveAddress);
		} else {
			void fetchKeys(undefined);
		}
	}, [effectiveConnected, effectiveAddress, fetchKeys]);

	// Sync local forms when selected key changes
	useEffect(() => {
		if (selectedKey) {
			setMetaForm({
				name: selectedKey.metadata.name,
				symbol: selectedKey.metadata.symbol,
				description: selectedKey.metadata.description,
				imageUri: selectedKey.metadata.imageUri,
			});
			setMetaErrors({});

			setConfigForm({
				spreadBps: selectedKey.config.spreadBps,
				cooldownSeconds: selectedKey.config.cooldownSeconds,
				holdingCap: selectedKey.config.holdingCap,
			});
			setConfigErrors({});
		}
	}, [selectedKey]);

	// Metadata submission handler
	const handleSaveMetadata = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedKey) return;

		const validation = validateKeyMetadata(metaForm);
		if (!validation.isValid) {
			setMetaErrors(validation.errors);
			return;
		}
		setMetaErrors({});

		await updateMetadata(selectedKey.id, metaForm);
	};

	// Config submission handler
	const handleSaveConfig = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedKey || !effectiveAddress) return;

		const validation = validateKeyConfig(configForm);
		if (!validation.isValid) {
			setConfigErrors(validation.errors);
			return;
		}
		setConfigErrors({});

		await updateConfig(selectedKey.id, configForm, effectiveAddress);
	};

	// Helper for format cooldown seconds into readable string
	const formatDuration = (secs: number) => {
		if (secs < 60) return `${secs} seconds`;
		if (secs < 3600) return `${Math.round(secs / 60)} minutes`;
		if (secs < 86400) return `${Math.round(secs / 3600)} hours`;
		return `${(secs / 86400).toFixed(1)} days`;
	};

	return (
		<div
			className={`rounded-2xl border border-white/10 bg-slate-900/60 p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden ${className}`}
			data-testid="creator-key-dashboard"
		>
			{/* Top Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
				<div className="flex items-center gap-3">
					<div className="p-2.5 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
						<Key className="w-6 h-6" />
					</div>
					<div>
						<h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
							Creator Key Management
						</h2>
						<p className="text-sm text-slate-400">
							Manage your deployed creator keys, modify on-chain configurations, and track per-key analytics.
						</p>
					</div>
				</div>

				{/* Connected Wallet Badge */}
				<div className="flex items-center gap-2 self-start md:self-auto">
					{effectiveConnected && effectiveAddress ? (
						<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
							<span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
							<span>Creator: {effectiveAddress.slice(0, 6)}...{effectiveAddress.slice(-4)}</span>
							<span className="text-slate-500">({keys.length} {keys.length === 1 ? 'key' : 'keys'})</span>
						</div>
					) : (
						<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
							<AlertCircle className="w-3.5 h-3.5" />
							<span>Wallet not connected</span>
						</div>
					)}

					{effectiveConnected && effectiveAddress && (
						<button
							onClick={() => void fetchKeys(effectiveAddress)}
							disabled={isLoading}
							className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
							title="Refresh keys"
							aria-label="Refresh keys"
						>
							<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
						</button>
					)}
				</div>
			</div>

			{/* Non-connected / Empty States */}
			{!effectiveConnected ? (
				<div
					className="text-center py-12 px-4 rounded-xl border border-white/5 bg-slate-950/40"
					data-testid="dashboard-unconnected-state"
				>
					<Key className="w-12 h-12 text-slate-600 mx-auto mb-3" />
					<h3 className="text-lg font-semibold text-white mb-1">Connect Creator Wallet</h3>
					<p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
						Connect your wallet to access your deployed keys, update bond parameters, edit metadata, and view real-time trading metrics.
					</p>
				</div>
			) : keys.length === 0 && !isLoading ? (
				<div
					className="text-center py-12 px-4 rounded-xl border border-white/5 bg-slate-950/40"
					data-testid="dashboard-empty-state"
				>
					<Key className="w-12 h-12 text-slate-600 mx-auto mb-3" />
					<h3 className="text-lg font-semibold text-white mb-1">No Deployed Keys Found</h3>
					<p className="text-sm text-slate-400 max-w-md mx-auto">
						Only creator keys deployed by <span className="font-mono text-violet-400">{effectiveAddress}</span> are displayed here. Deploy a key through the creator launcher to start managing it.
					</p>
				</div>
			) : (
				<>
					{/* Deployed Keys Selector */}
					<div className="mb-6">
						<label className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
							Select Deployed Key
						</label>
						<div
							className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
							role="tablist"
							aria-label="Deployed Creator Keys"
						>
							{keys.map(k => {
								const isSelected = k.id === selectedKeyId;
								return (
									<button
										key={k.id}
										role="tab"
										aria-selected={isSelected}
										onClick={() => selectKey(k.id)}
										className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
											isSelected
												? 'border-violet-500/50 bg-violet-500/10 shadow-lg shadow-violet-500/5 ring-1 ring-violet-500/30'
												: 'border-white/5 bg-slate-950/30 hover:border-white/10 hover:bg-slate-950/50'
										}`}
										data-testid={`key-card-${k.id}`}
									>
										{k.metadata.imageUri ? (
											<img
												src={k.metadata.imageUri}
												alt={k.metadata.name}
												className="w-10 h-10 rounded-lg object-cover border border-white/10"
											/>
										) : (
											<div className="w-10 h-10 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-sm">
												{k.metadata.symbol.slice(0, 2)}
											</div>
										)}
										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between">
												<span className="font-semibold text-white text-sm truncate">
													{k.metadata.name}
												</span>
												<span className="text-xs font-mono text-violet-400 px-1.5 py-0.5 rounded bg-violet-500/10">
													${k.metadata.symbol}
												</span>
											</div>
											<div className="flex items-center justify-between text-xs text-slate-400 mt-1">
												<span>{k.analytics.holderCount} holders</span>
												<span className="font-mono text-emerald-400 font-medium">
													{k.analytics.currentPriceXlm} XLM
												</span>
											</div>
										</div>
									</button>
								);
							})}
						</div>
					</div>

					{selectedKey && (
						<>
							{/* Per-Key Analytics Overview Cards */}
							<div
								className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6"
								data-testid="key-analytics-overview"
							>
								{/* Holders */}
								<div className="p-4 rounded-xl border border-white/5 bg-slate-950/40">
									<div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
										<Users className="w-4 h-4 text-cyan-400" />
										<span>Key Holders</span>
									</div>
									<div className="text-xl md:text-2xl font-bold text-white font-mono" data-testid="stat-holders">
										{selectedKey.analytics.holderCount.toLocaleString()}
									</div>
									<div className="text-[11px] text-slate-500 mt-0.5">Active unique owners</div>
								</div>

								{/* Volume */}
								<div className="p-4 rounded-xl border border-white/5 bg-slate-950/40">
									<div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
										<BarChart3 className="w-4 h-4 text-emerald-400" />
										<span>Trade Volume</span>
									</div>
									<div className="text-xl md:text-2xl font-bold text-white font-mono" data-testid="stat-volume">
										{selectedKey.analytics.volumeXlm.toLocaleString()} <span className="text-xs text-slate-400 font-normal">XLM</span>
									</div>
									<div className="text-[11px] text-slate-500 mt-0.5">
										≈ ${selectedKey.analytics.volumeUsd.toLocaleString()} USD
									</div>
								</div>

								{/* Trades */}
								<div className="p-4 rounded-xl border border-white/5 bg-slate-950/40">
									<div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
										<TrendingUp className="w-4 h-4 text-violet-400" />
										<span>Total Trades</span>
									</div>
									<div className="text-xl md:text-2xl font-bold text-white font-mono" data-testid="stat-trades">
										{selectedKey.analytics.tradeCount.toLocaleString()}
									</div>
									<div className="text-[11px] text-slate-500 mt-0.5">Buys & sells combined</div>
								</div>

								{/* Current Price */}
								<div className="p-4 rounded-xl border border-white/5 bg-slate-950/40">
									<div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
										<Key className="w-4 h-4 text-amber-400" />
										<span>Current Price</span>
									</div>
									<div className="text-xl md:text-2xl font-bold text-emerald-400 font-mono" data-testid="stat-price">
										{selectedKey.analytics.currentPriceXlm} <span className="text-xs text-slate-400 font-normal">XLM</span>
									</div>
									<div className="text-[11px] text-slate-500 mt-0.5">
										≈ ${selectedKey.analytics.currentPriceUsd} USD
									</div>
								</div>
							</div>

							{/* Feedback & Timelock Banners */}
							{txStatus !== 'idle' && txMessage && (
								<div
									className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
										txStatus === 'success'
											? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
											: txStatus === 'error'
											? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
											: 'bg-violet-500/10 border-violet-500/30 text-violet-300'
									}`}
									data-testid="dashboard-tx-banner"
								>
									{txStatus === 'success' ? (
										<CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
									) : txStatus === 'error' ? (
										<AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
									) : (
										<RefreshCw className="w-5 h-5 flex-shrink-0 mt-0.5 text-violet-400 animate-spin" />
									)}
									<div className="flex-1 text-sm">{txMessage}</div>
									<button
										onClick={clearStatus}
										className="text-xs opacity-60 hover:opacity-100 transition-opacity"
										aria-label="Dismiss message"
									>
										✕
									</button>
								</div>
							)}

							{/* Timelock Notice Alert */}
							{timelockNotice && (
								<div
									className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 flex items-start gap-3"
									data-testid="timelock-notice-banner"
								>
									<Clock className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
									<div className="flex-1 text-sm">
										<p className="font-semibold text-amber-200">
											Timelock Notice ({timelockNotice.delayHours}h Execution Delay Required)
										</p>
										<p className="text-amber-300/90 text-xs mt-0.5">
											{timelockNotice.message} The proposed change has been added to the pending timelock governance queue and can be executed once the buffer elapses.
										</p>
									</div>
								</div>
							)}

							{/* Navigation Sub-Tabs */}
							<div className="flex border-b border-white/10 mb-6 gap-2">
								<button
									onClick={() => setActiveTab('analytics')}
									className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all ${
										activeTab === 'analytics'
											? 'border-violet-500 text-white'
											: 'border-transparent text-slate-400 hover:text-slate-200'
									}`}
									data-testid="tab-analytics"
								>
									<BarChart3 className="w-4 h-4" />
									<span>Overview</span>
								</button>
								<button
									onClick={() => setActiveTab('metadata')}
									className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all ${
										activeTab === 'metadata'
											? 'border-violet-500 text-white'
											: 'border-transparent text-slate-400 hover:text-slate-200'
									}`}
									data-testid="tab-metadata"
								>
									<Edit3 className="w-4 h-4" />
									<span>Edit Metadata</span>
								</button>
								<button
									onClick={() => setActiveTab('config')}
									className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all ${
										activeTab === 'config'
											? 'border-violet-500 text-white'
											: 'border-transparent text-slate-400 hover:text-slate-200'
									}`}
									data-testid="tab-config"
								>
									<Sliders className="w-4 h-4" />
									<span>Config Update</span>
								</button>
							</div>

							{/* TAB 1: OVERVIEW */}
							{activeTab === 'analytics' && (
								<div className="space-y-4" data-testid="pane-analytics">
									<div className="p-4 rounded-xl border border-white/5 bg-slate-950/30">
										<h4 className="text-sm font-semibold text-white mb-3">Key Details & Parameters</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
											<div>
												<span className="text-slate-400 block mb-0.5">Contract Address</span>
												<div className="flex items-center gap-2 font-mono text-slate-200">
													<span>{selectedKey.contractAddress}</span>
													<ExternalLink className="w-3.5 h-3.5 text-slate-500 hover:text-white cursor-pointer" />
												</div>
											</div>
											<div>
												<span className="text-slate-400 block mb-0.5">Deployment Date</span>
												<span className="text-slate-200 font-mono">
													{new Date(selectedKey.deployedAt).toLocaleDateString()}
												</span>
											</div>
											<div>
												<span className="text-slate-400 block mb-0.5">Current Trading Spread</span>
												<span className="text-slate-200 font-mono">
													{selectedKey.config.spreadBps} bps ({(selectedKey.config.spreadBps / 100).toFixed(1)}%)
												</span>
											</div>
											<div>
												<span className="text-slate-400 block mb-0.5">Anti-Frontrun Cooldown</span>
												<span className="text-slate-200 font-mono">
													{formatDuration(selectedKey.config.cooldownSeconds)} ({selectedKey.config.cooldownSeconds}s)
												</span>
											</div>
											<div>
												<span className="text-slate-400 block mb-0.5">Max Holding Cap</span>
												<span className="text-slate-200 font-mono">
													{selectedKey.config.holdingCap.toLocaleString()} keys per wallet
												</span>
											</div>
											<div>
												<span className="text-slate-400 block mb-0.5">Description</span>
												<p className="text-slate-300 italic">
													{selectedKey.metadata.description || 'No description provided.'}
												</p>
											</div>
										</div>
									</div>
								</div>
							)}

							{/* TAB 2: EDIT METADATA FORM */}
							{activeTab === 'metadata' && (
								<form noValidate onSubmit={handleSaveMetadata} className="space-y-4" data-testid="form-metadata">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{/* Key Name */}
										<div>
											<label htmlFor="meta-name" className="text-xs text-slate-300 font-medium block mb-1">
												Key Name *
											</label>
											<input
												id="meta-name"
												type="text"
												value={metaForm.name}
												onChange={e => setMetaForm(prev => ({ ...prev, name: e.target.value }))}
												className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
												placeholder="e.g. Creator Access Key"
												disabled={isSubmitting}
											/>
											{metaErrors.name && (
												<span className="text-xs text-rose-400 mt-1 block" data-testid="err-meta-name">
													{metaErrors.name}
												</span>
											)}
										</div>

										{/* Symbol */}
										<div>
											<label htmlFor="meta-symbol" className="text-xs text-slate-300 font-medium block mb-1">
												Symbol *
											</label>
											<input
												id="meta-symbol"
												type="text"
												value={metaForm.symbol}
												onChange={e => setMetaForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
												className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-violet-500 transition-colors"
												placeholder="e.g. RIVER"
												disabled={isSubmitting}
											/>
											{metaErrors.symbol && (
												<span className="text-xs text-rose-400 mt-1 block" data-testid="err-meta-symbol">
													{metaErrors.symbol}
												</span>
											)}
										</div>
									</div>

									{/* Image URI with preview */}
									<div>
										<label htmlFor="meta-image" className="text-xs text-slate-300 font-medium block mb-1">
											Image URI (HTTPS or IPFS)
										</label>
										<div className="flex items-center gap-3">
											<input
												id="meta-image"
												type="text"
												value={metaForm.imageUri}
												onChange={e => setMetaForm(prev => ({ ...prev, imageUri: e.target.value }))}
												className="flex-1 bg-slate-950/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono text-xs focus:outline-none focus:border-violet-500 transition-colors"
												placeholder="https://... or ipfs://..."
												disabled={isSubmitting}
											/>
											{metaForm.imageUri && (
												<img
													src={metaForm.imageUri}
													alt="Preview"
													className="w-10 h-10 rounded-lg object-cover border border-white/10 bg-slate-800"
													onError={e => {
														// Hide broken image preview
														(e.target as HTMLElement).style.display = 'none';
													}}
												/>
											)}
										</div>
										{metaErrors.imageUri && (
											<span className="text-xs text-rose-400 mt-1 block" data-testid="err-meta-image">
												{metaErrors.imageUri}
											</span>
										)}
									</div>

									{/* Description */}
									<div>
										<label htmlFor="meta-desc" className="text-xs text-slate-300 font-medium block mb-1">
											Key Description ({500 - (metaForm.description?.length || 0)} characters left)
										</label>
										<textarea
											id="meta-desc"
											rows={3}
											value={metaForm.description}
											onChange={e => setMetaForm(prev => ({ ...prev, description: e.target.value }))}
											className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
											placeholder="Describe what access, perks, or content this creator key provides..."
											disabled={isSubmitting}
										/>
										{metaErrors.description && (
											<span className="text-xs text-rose-400 mt-1 block" data-testid="err-meta-desc">
												{metaErrors.description}
											</span>
										)}
									</div>

									<div className="flex justify-end pt-2">
										<button
											type="submit"
											disabled={isSubmitting}
											className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-all shadow-lg shadow-violet-600/20 disabled:opacity-50 flex items-center gap-2"
											data-testid="btn-save-metadata"
										>
											{isSubmitting ? (
												<>
													<RefreshCw className="w-4 h-4 animate-spin" />
													<span>Submitting On-Chain...</span>
												</>
											) : (
												<>
													<CheckCircle className="w-4 h-4" />
													<span>Save Metadata On-Chain</span>
												</>
											)}
										</button>
									</div>
								</form>
							)}

							{/* TAB 3: CONFIG UPDATE PANEL */}
							{activeTab === 'config' && (
								<form noValidate onSubmit={handleSaveConfig} className="space-y-5" data-testid="form-config">
									{/* Timelock Advisory Header */}
									<div className="p-3.5 rounded-xl border border-white/5 bg-slate-950/30 flex items-start gap-2.5 text-xs text-slate-300">
										<Shield className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
										<span>
											<strong>Parameter Protection Policy:</strong> Changes that increase spread by ≥100 bps, set cooldown &gt;1 hour, or reduce holding caps require a 24-hour timelock delay before becoming active.
										</span>
									</div>

									{/* Spread Input */}
									<div className="p-4 rounded-xl border border-white/5 bg-slate-950/30">
										<div className="flex items-center justify-between mb-1.5">
											<label htmlFor="config-spread" className="text-xs text-slate-300 font-medium">
												Trading Spread (Basis Points)
											</label>
											<span className="text-xs font-mono text-violet-400 font-semibold">
												{configForm.spreadBps} bps ({(configForm.spreadBps / 100).toFixed(1)}%)
											</span>
										</div>
										<p className="text-[11px] text-slate-400 mb-3">
											Allowed range: {CONFIG_BOUNDS.spreadBps.min} bps (0.1%) to {CONFIG_BOUNDS.spreadBps.max} bps (15.0%).
										</p>
										<div className="flex items-center gap-4">
											<input
												id="config-spread-slider"
												type="range"
												min={CONFIG_BOUNDS.spreadBps.min}
												max={CONFIG_BOUNDS.spreadBps.max}
												step={10}
												value={configForm.spreadBps}
												onChange={e => setConfigForm(prev => ({ ...prev, spreadBps: Number(e.target.value) }))}
												className="flex-1 accent-violet-500 cursor-pointer"
												disabled={isSubmitting}
											/>
											<input
												id="config-spread"
												type="number"
												min={CONFIG_BOUNDS.spreadBps.min}
												max={CONFIG_BOUNDS.spreadBps.max}
												value={configForm.spreadBps}
												onChange={e => setConfigForm(prev => ({ ...prev, spreadBps: Number(e.target.value) }))}
												className="w-24 bg-slate-950/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono text-center focus:outline-none focus:border-violet-500"
												disabled={isSubmitting}
												data-testid="input-config-spread"
											/>
										</div>
										{configErrors.spreadBps && (
											<span className="text-xs text-rose-400 mt-2 block" data-testid="err-config-spread">
												{configErrors.spreadBps}
											</span>
										)}
									</div>

									{/* Cooldown Duration */}
									<div className="p-4 rounded-xl border border-white/5 bg-slate-950/30">
										<div className="flex items-center justify-between mb-1.5">
											<label htmlFor="config-cooldown" className="text-xs text-slate-300 font-medium">
												Anti-Frontrun Cooldown (Seconds)
											</label>
											<span className="text-xs font-mono text-cyan-400 font-semibold">
												{formatDuration(configForm.cooldownSeconds)}
											</span>
										</div>
										<p className="text-[11px] text-slate-400 mb-3">
											Allowed range: 0 seconds (disabled) to 604,800 seconds (7 days).
										</p>
										<input
											id="config-cooldown"
											type="number"
											min={CONFIG_BOUNDS.cooldownSeconds.min}
											max={CONFIG_BOUNDS.cooldownSeconds.max}
											value={configForm.cooldownSeconds}
											onChange={e => setConfigForm(prev => ({ ...prev, cooldownSeconds: Number(e.target.value) }))}
											className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-violet-500"
											placeholder="e.g. 300 for 5 minutes"
											disabled={isSubmitting}
											data-testid="input-config-cooldown"
										/>
										{configErrors.cooldownSeconds && (
											<span className="text-xs text-rose-400 mt-2 block" data-testid="err-config-cooldown">
												{configErrors.cooldownSeconds}
											</span>
										)}
									</div>

									{/* Holding Cap */}
									<div className="p-4 rounded-xl border border-white/5 bg-slate-950/30">
										<div className="flex items-center justify-between mb-1.5">
											<label htmlFor="config-cap" className="text-xs text-slate-300 font-medium">
												Individual Wallet Holding Cap
											</label>
											<span className="text-xs font-mono text-emerald-400 font-semibold">
												{configForm.holdingCap.toLocaleString()} keys
											</span>
										</div>
										<p className="text-[11px] text-slate-400 mb-3">
											Limits key concentration to prevent whale manipulation. Allowed: 1 to 100,000 keys.
										</p>
										<input
											id="config-cap"
											type="number"
											min={CONFIG_BOUNDS.holdingCap.min}
											max={CONFIG_BOUNDS.holdingCap.max}
											value={configForm.holdingCap}
											onChange={e => setConfigForm(prev => ({ ...prev, holdingCap: Number(e.target.value) }))}
											className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-violet-500"
											placeholder="e.g. 50"
											disabled={isSubmitting}
											data-testid="input-config-cap"
										/>
										{configErrors.holdingCap && (
											<span className="text-xs text-rose-400 mt-2 block" data-testid="err-config-cap">
												{configErrors.holdingCap}
											</span>
										)}
									</div>

									<div className="flex justify-end pt-2">
										<button
											type="submit"
											disabled={isSubmitting}
											className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-all shadow-lg shadow-violet-600/20 disabled:opacity-50 flex items-center gap-2"
											data-testid="btn-save-config"
										>
											{isSubmitting ? (
												<>
													<RefreshCw className="w-4 h-4 animate-spin" />
													<span>Validating & Updating...</span>
												</>
											) : (
												<>
													<Sliders className="w-4 h-4" />
													<span>Update Key Config</span>
												</>
											)}
										</button>
									</div>
								</form>
							)}
						</>
					)}
				</>
			)}
		</div>
	);
};
