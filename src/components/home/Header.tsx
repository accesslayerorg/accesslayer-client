import { useEffect, useState } from 'react';
import { Link } from 'react-router';

const navLinks = [
	{ label: 'Marketplace', href: '/marketplace', external: false },
	{ label: 'About', href: '/about', external: false },
	{ label: 'GitHub', href: 'https://github.com/accesslayerorg', external: true },
];

export default function Header() {
	const [scrolled, setScrolled] = useState(false);

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
			<div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
				{/* Logo */}
				<Link to="/" className="flex items-center gap-2.5">
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
				<nav className="hidden items-center gap-8 md:flex">
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

				{/* CTA */}
				<Link
					to="/connect"
					className={`rounded-sm px-5 py-2 font-mono text-[10px] uppercase tracking-wider transition-all duration-300 ${
						scrolled
							? 'border border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-900 hover:bg-gray-900 hover:text-white'
							: 'border border-white/15 bg-white/[0.05] text-white/60 hover:border-white/30 hover:bg-white/[0.09] hover:text-white'
					}`}
				>
					Connect Wallet
				</Link>
			</div>
		</header>
	);
}
