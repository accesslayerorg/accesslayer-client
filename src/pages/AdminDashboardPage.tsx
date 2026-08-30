import OracleAccessPanel from '@/components/admin/OracleAccessPanel';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';

export default function AdminDashboardPage() {
	useNavigationTiming('admin-dashboard');

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

				<OracleAccessPanel />
			</div>
		</main>
	);
}
