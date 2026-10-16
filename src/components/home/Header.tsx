import { useEffect, useState } from 'react';
import WalletStatusChip from '@/components/common/WalletStatusChip';
import NotificationBell from '@/components/common/NotificationBell';
import ThemeToggle from '@/components/common/ThemeToggle';
import { useProfileStore } from '@/hooks/useProfileStore';
import { Link } from 'react-router';

const navLinks = [
	{ label: 'Marketplace', href: '/marketplace', external: false },
	{ label: 'About', href: '/about', external: false },
	{ label: 'GitHub', href: 'https://github.com/accesslayerorg', external: true },
];

export default function Header() {
	const [scrolled, setScrolled] = useState(false);
	const profile = useProfileStore(state => state.profile);

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
					? 'border-b border-black/8 dark:border-white/10 bg-white/80 dark:bg-[#06111f]/80 backdrop-blur-md top-0'
					: 'top-2'
			}`}
		>
			<div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
				{/* Logo */}
				<Link to="/" className="flex items-center gap-2.5">
					<img
						src="/icons/logo.svg"
						alt="Access Layer"
						className={`size-6 sm:size-5 transition-all duration-300 ${scrolled ? 'opacity-60 invert dark:invert-0' : 'opacity-70'}`}
					/>
					<span className={`hidden font-mono text-[13px] uppercase tracking-[0.08em] sm:inline transition-colors duration-300 ${scrolled ? 'text-gray-700 dark:text-white/80' : 'text-white/70'}`}>
						Access Layer
					</span>
				</Link>

				{/* Nav */}
				<nav className="hidden items-center gap-8 md:flex">
					{navLinks.map(link =>
						link.external ? (
							<a
								key={link.href}
								href={link.href}
								target="_blank"
								rel="noopener noreferrer"
								className={`font-jakarta text-sm transition-colors duration-300 ${scrolled ? 'text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white' : 'text-white/45 hover:text-white/80'}`}
							>
								{link.label}
							</a>
						) : (
							<Link
								key={link.href}
								to={link.href}
								className={`font-jakarta text-sm transition-colors duration-300 ${scrolled ? 'text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white' : 'text-white/45 hover:text-white/80'}`}
							>
								{link.label}
							</Link>
						)
					)}
				</nav>

				{/* Right-side actions: notification bell (#720), theme toggle (#1085) +
				    wallet status chip (#686).
				    NotificationBell is only rendered when a user profile is available. */}
				<div className="flex items-center gap-2">
					{profile && (
						<NotificationBell
							userId={profile.id}
							className={
								scrolled
									? 'text-gray-600 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
									: ''
							}
						/>
					)}
					<ThemeToggle
						className={
							scrolled
								? 'text-gray-600 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white focus-visible:ring-gray-400 dark:focus-visible:ring-white/50'
								: ''
						}
					/>
					<WalletStatusChip />
				</div>
			</div>
		</header>
	);
}
