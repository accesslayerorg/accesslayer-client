import MultiSigAdminPanel from '@/components/admin/MultiSigAdminPanel';
import OracleAccessPanel from '@/components/admin/OracleAccessPanel';
import AclWhitelistPanel from '@/components/admin/AclWhitelistPanel';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { isAdminWallet } from '@/utils/adminAccess';
import { Navigate } from 'react-router';

export default function AdminDashboardPage() {
	useNavigationTiming('admin-dashboard');
	const { address, isConnected } = useStellarWallet();
	const isAdmin = isConnected && isAdminWallet(address);

	if (isConnected && !isAdmin) {
		return <Navigate to="/" replace />;
	}

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-5xl space-y-8">
				<header>
					<h1 className="font-grotesque text-3xl font-black tracking-tight">
						Admin dashboard
					</h1>
					<p className="mt-2 text-sm text-white/50">
						Manage protocol integrations and access control.
					</p>
				</header>

				{isAdmin && (
					<>
						<AclWhitelistPanel />
						<OracleAccessPanel />
						<MultiSigAdminPanel isAdmin={isAdmin} />
					</>
				)}
				{!isConnected && (
					<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/50">
						Please connect your admin wallet to view this page.
					</div>
				)}
			</div>
		</main>
	);
}
