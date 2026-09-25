import { Link } from 'react-router';

const links = [
	{ label: 'Marketplace', href: '/marketplace', external: false },
	{ label: 'About', href: '/about', external: false },
	{ label: 'GitHub', href: 'https://github.com/accesslayerorg', external: true },
	{ label: 'Telegram', href: 'https://t.me/c/accesslayerorg/', external: true },
];

export default function Footer() {
	return (
		<footer className="border-t border-gray-100 bg-white px-6 py-14">
			<div className="mx-auto max-w-5xl">
				<div className="flex flex-col items-start justify-between gap-10 sm:flex-row sm:items-center">
					{/* Brand */}
					<div className="flex items-center gap-3">
						<img src="/icons/logo.svg" alt="Access Layer" className="size-5 opacity-30 invert" />
						<span className="font-mono text-[12px] uppercase tracking-[0.08em] text-gray-400">
							Access Layer
						</span>
					</div>

					{/* Links */}
					<nav className="flex flex-wrap items-center gap-6">
						{links.map(link =>
							link.external ? (
								<a
									key={link.label}
									href={link.href}
									target="_blank"
									rel="noopener noreferrer"
									className="font-jakarta text-sm text-gray-400 transition-colors hover:text-gray-900"
								>
									{link.label}
								</a>
							) : (
								<Link
									key={link.label}
									to={link.href}
									className="font-jakarta text-sm text-gray-400 transition-colors hover:text-gray-900"
								>
									{link.label}
								</Link>
							)
						)}
					</nav>
				</div>

				<div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-gray-100 pt-8 sm:flex-row sm:items-center">
					<p className="font-mono text-[10px] text-gray-300">
						Built on Stellar · Open source
					</p>
					<p className="font-mono text-[10px] text-gray-300">
						© {new Date().getFullYear()} Access Layer
					</p>
				</div>
			</div>
		</footer>
	);
}
