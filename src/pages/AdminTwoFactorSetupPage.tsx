import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate } from 'react-router';
import CopyField from '@/components/common/CopyField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RecoveryCodesGate from '@/components/admin/RecoveryCodesGate';
import { useAdminTwoFactor } from '@/hooks/useAdminTwoFactor';

export default function AdminTwoFactorSetupPage() {
	const navigate = useNavigate();
	const { setup, verify, isLoading, error } = useAdminTwoFactor();
	const [code, setCode] = useState('');
	const [codes, setCodes] = useState<string[] | null>(null);

	useEffect(() => {
		setup.mutate(undefined);
		// Setup only once when the page mounts.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const submit = (event: React.FormEvent) => {
		event.preventDefault();
		verify.mutate({ code }, {
			onSuccess: result => {
				if (result.enabled) setCodes(result.recoveryCodes);
			},
		});
	};

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white">
			<div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-6">
				<h1 className="font-grotesque text-3xl font-black">Set up two-factor authentication</h1>
				{setup.data && (
					<>
						<p className="mt-3 text-sm text-white/60">Scan this code in your authenticator app.</p>
						<div className="my-6 flex justify-center rounded-xl bg-white p-4">
							<QRCodeCanvas value={setup.data.otpauthUrl} size={220} level="M" data-testid="admin-2fa-qr" />
						</div>
						<label className="mb-2 block text-sm text-white/70">Manual setup key</label>
						<CopyField value={setup.data.secret} label="Two-factor setup key" />
					</>
				)}
				<form onSubmit={submit} className="mt-6 space-y-3">
					<label htmlFor="admin-2fa-code" className="text-sm">Authenticator code</label>
					<Input
						id="admin-2fa-code"
						inputMode="numeric"
						autoComplete="one-time-code"
						value={code}
						onChange={event => setCode(event.target.value)}
					/>
					{error && <p role="alert" className="text-sm text-rose-400">{error.message}</p>}
					<Button type="submit" disabled={isLoading || code.length === 0}>
						Enable two-factor authentication
					</Button>
				</form>
			</div>
			{codes && (
				<RecoveryCodesGate
					codes={codes}
					onDismiss={() => {
						setCodes(null);
						navigate('/admin/dashboard', { replace: true });
					}}
				/>
		 )}
		</main>
	);
}
