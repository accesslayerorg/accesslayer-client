import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import WalletStatusChip from '@/components/common/WalletStatusChip';
import NotificationBell from '@/components/common/NotificationBell';
import MarketplaceHeaderSearch from '@/components/common/MarketplaceHeaderSearch';
import { useProfileStore } from '@/hooks/useProfileStore';
import { useTheme } from '@/hooks/useTheme';
import { Link } from 'react-router';
import BatchBuyModal from '@/components/common/BatchBuyModal';

const navLinks = [
	{ label: 'Marketplace', href: '/marketplace', external: false },
	{ label: 'About', href: '/about', external: false },
	{ label: 'GitHub', href: 'https://github.com/accesslayerorg', external: true },
];

export default function Header() {
	const [scrolled, setScrolled] = useState(false);
	const [batchOpen, setBatchOpen] = useState(false);
	const profile = useProfileStore(state => state.profile);
	const { theme, toggleTheme } = useTheme();

	useEffect(() => {
		const onScroll = () => {
			const threshold = window.innerHeight * 0.95 - 72;
			setScrolled(window.scrollY >= threshold);
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	return (
		<header
			className={`header-animate fixed inset-x-0  z-50 transition-all duration-300 ${
				scrolled
					? 'border-b border-black/8 bg-white/80 backdrop-blur-md top-0'
					: 'top-2'
			}`}
		>
			<div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
				{/* Logo */}
				<Link to="/" className="flex items-center gap-2.5 shrink-0">
					<img
						src="/icons/logo.svg"
						alt="Access Layer"
						className={`size-6 sm:size-5 transition-all duration-300 ${scrolled ? 'opacity-60 invert' : 'opacity-70'}`}
					/>
					<span className={`hidden font-mono text-[13px] uppercase tracking-[0.08em] sm:inline transition-colors duration-300 ${scrolled ? 'text-gray-700' : 'text-white/70'}`}>
						Access Layer
					</span>
				</Link>

				{/* Nav */}
				<nav className="hidden items-center gap-8 md:flex shrink-0">
					{navLinks.map(link =>
						link.external ? (
							<a
								key={link.href}
								href={link.href}
								target="_blank"
								rel="noopener noreferrer"
								className={`font-jakarta text-sm transition-colors duration-300 ${scrolled ? 'text-gray-500 hover:text-gray-900' : 'text-white/45 hover:text-white/80'}`}
							>
								{link.label}
							</a>
						) : (
							<Link
								key={link.href}
								to={link.href}
								className={`font-jakarta text-sm transition-colors duration-300 ${scrolled ? 'text-gray-500 hover:text-gray-900' : 'text-white/45 hover:text-white/80'}`}
							>
								{link.label}
							</Link>
						)
					)}
				</nav>

				{/* Marketplace Header Search */}
				<div className="flex-1 max-w-xs mx-2">
					<MarketplaceHeaderSearch />
				</div>

				{/* Right-side actions: dark mode toggle (#750) + notification bell (#720) + wallet status chip (#686).
				    NotificationBell is only rendered when a user profile is available. */}
				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={() => setBatchOpen(true)}
						className={`rounded-xl border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 ${scrolled ? '' : ''}`}
					>
						Batch Buy
					</button>
					<BatchBuyModal open={batchOpen} onOpenChange={setBatchOpen} />
					<button
						type="button"
						onClick={toggleTheme}
						aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
						className={`rounded-md p-1.5 transition-colors duration-200 ${
							scrolled
								? 'text-gray-600 hover:bg-black/5 hover:text-gray-900'
								: 'text-white/60 hover:text-white/90'
						}`}
					>
						{theme === 'dark' ? (
							<Sun className="size-4" aria-hidden="true" />
						) : (
							<Moon className="size-4" aria-hidden="true" />
						)}
					</button>
					{profile && (
						<NotificationBell
							userId={profile.id}
							className={
								scrolled
									? 'text-gray-600 hover:bg-black/5 hover:text-gray-900'
									: ''
							}
						/>
					)}
					<WalletStatusChip />
				</div>
			</div>
		</header>
	);
}
