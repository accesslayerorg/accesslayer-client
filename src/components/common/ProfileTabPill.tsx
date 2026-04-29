import React, { useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const profileTabPillVariants = cva(
	'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold font-jakarta tracking-wide transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
	{
		variants: {
			state: {
				active: 'border-amber-400/30 bg-amber-400/15 text-white',
				inactive:
					'border-white/10 bg-white/[0.06] text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white/80',
			},
		},
		defaultVariants: {
			state: 'inactive',
		},
	}
);

export interface ProfileTabPillProps
	extends
		React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof profileTabPillVariants> {
	isActive?: boolean;
	icon?: React.ReactNode;
}

const ProfileTabPill: React.FC<ProfileTabPillProps> = ({
	isActive = false,
	icon,
	className,
	children,
	...props
}) => {
	return (
		<button
			type="button"
			className={cn(
				profileTabPillVariants({
					state: isActive ? 'active' : 'inactive',
					className,
				})
			)}
			{...props}
		>
			{icon && (
				<span className="[&_svg]:size-3.5" aria-hidden="true">
					{icon}
				</span>
			)}
			{children}
		</button>
	);
};

export default ProfileTabPill;

export interface ProfileTabPillGroupTab {
	label: string;
	value: string;
	icon?: React.ReactNode;
}

export interface ProfileTabPillGroupProps {
	tabs: ProfileTabPillGroupTab[];
	activeTab: string;
	onTabChange: (value: string) => void;
	className?: string;
	enableHashRouting?: boolean;
}

export const ProfileTabPillGroup: React.FC<ProfileTabPillGroupProps> = ({
	tabs,
	activeTab,
	onTabChange,
	className,
	enableHashRouting = false,
}) => {
	// Read the initial URL hash on mount and listen for subsequent changes.
	// Both concerns share one effect so there is no race between the initial
	// read and the listener being attached.
	useEffect(() => {
		if (!enableHashRouting) return;

		const syncFromHash = () => {
			const hash = window.location.hash.slice(1);
			const validTab = tabs.find(tab => tab.value === hash);
			if (validTab && hash !== activeTab) {
				onTabChange(hash);
			}
		};

		// Sync immediately on mount so direct URL hash navigation works.
		syncFromHash();

		window.addEventListener('hashchange', syncFromHash);
		return () => window.removeEventListener('hashchange', syncFromHash);
		// activeTab is intentionally excluded: we only want to sync *from* the
		// hash into state, never the other way round inside this effect.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enableHashRouting, tabs, onTabChange]);

	const handleTabClick = (value: string) => {
		onTabChange(value);
		if (enableHashRouting) {
			window.location.hash = value;
		}
	};

	return (
		<nav
			role="tablist"
			aria-label="Profile sections"
			className={cn('flex flex-wrap items-center gap-2', className)}
		>
			{tabs.map(tab => (
				<ProfileTabPill
					key={tab.value}
					id={`profile-tab-${tab.value}`}
					role="tab"
					aria-selected={activeTab === tab.value}
					aria-controls={`profile-panel-${tab.value}`}
					isActive={activeTab === tab.value}
					icon={tab.icon}
					onClick={() => handleTabClick(tab.value)}
				>
					{tab.label}
				</ProfileTabPill>
			))}
		</nav>
	);
};
