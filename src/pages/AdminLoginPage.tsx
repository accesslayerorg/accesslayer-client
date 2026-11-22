import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminTwoFactor } from '@/hooks/useAdminTwoFactor';

export default function AdminLoginPage() {
	const navigate = useNavigate();
	const { login, isLoading, error } = useAdminTwoFactor();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');

	const submit = (event: React.FormEvent) => {
		event.preventDefault();
		login.mutate({ email, password }, {
			onSuccess: result => navigate(
				result.status === 'pending_2fa' || result.twoFactorRequired
					? '/admin/2fa/challenge'
					: '/admin/dashboard',
				{ replace: true }
			),
		});
	};

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white">
			<form onSubmit={submit} className="mx-auto max-w-md space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
				<h1 className="font-grotesque text-3xl font-black">Admin login</h1>
				<label htmlFor="admin-email" className="block text-sm">Email</label>
				<Input id="admin-email" type="email" value={email} onChange={event => setEmail(event.target.value)} />
				<label htmlFor="admin-password" className="block text-sm">Password</label>
				<Input id="admin-password" type="password" value={password} onChange={event => setPassword(event.target.value)} />
				{error && <p role="alert" className="text-sm text-rose-400">{error.message}</p>}
				<Button type="submit" disabled={isLoading || !email || !password}>Sign in</Button>
			</form>
		</main>
	);
}
