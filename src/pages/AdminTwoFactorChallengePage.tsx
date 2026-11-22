import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminTwoFactor } from '@/hooks/useAdminTwoFactor';

export default function AdminTwoFactorChallengePage() {
	const navigate = useNavigate();
	const { challenge, isLoading, error } = useAdminTwoFactor();
	const [mode, setMode] = useState<'totp' | 'recovery'>('totp');
	const [value, setValue] = useState('');
	const [remainingAttempts, setRemainingAttempts] = useState<number | undefined>();
	const blocked = error?.rateLimited;

	useEffect(() => {
		if (error?.remainingAttempts !== undefined) {
			setRemainingAttempts(error.remainingAttempts);
		}
	}, [error]);

	const submit = (event: React.FormEvent) => {
		event.preventDefault();
		if (blocked) return;
		challenge.mutate(
			mode === 'totp' ? { code: value } : { recoveryCode: value },
			{
				onSuccess: result => {
					if (result.enabled || result.status === 'active') {
						navigate('/admin/dashboard', { replace: true });
					}
				},
				onError: (mutationError: unknown) => {
					const response = mutationError as { response?: { errors?: Array<{ field?: string; message: string }> } };
					const remaining = response.response?.errors?.find(item => item.field === 'remainingAttempts');
					if (remaining) setRemainingAttempts(Number(remaining.message));
				},
			}
		);
	};

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white">
			<div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6">
				<h1 className="font-grotesque text-3xl font-black">Admin verification</h1>
				<p className="mt-2 text-sm text-white/60">
					Enter a code from your authenticator or use a recovery code.
				</p>
				<div className="mt-5 flex gap-2">
					<Button type="button" variant={mode === 'totp' ? 'default' : 'outline'} onClick={() => { setMode('totp'); setValue(''); }}>
						Authenticator
					</Button>
					<Button type="button" variant={mode === 'recovery' ? 'default' : 'outline'} onClick={() => { setMode('recovery'); setValue(''); }}>
						Recovery code
					</Button>
				</div>
				<form onSubmit={submit} className="mt-5 space-y-3">
					<label htmlFor="admin-2fa-challenge" className="text-sm">
						{mode === 'totp' ? '6-digit code' : 'Recovery code'}
					</label>
					<Input
						id="admin-2fa-challenge"
						value={value}
						disabled={blocked}
						autoComplete={mode === 'totp' ? 'one-time-code' : 'off'}
						onChange={event => setValue(event.target.value)}
					/>
					{remainingAttempts !== undefined && (
						<p role="status">{remainingAttempts} attempts remaining</p>
					)}
					{error && (
						<p role="alert" className={blocked ? 'text-amber-400' : 'text-rose-400'}>
							{blocked
								? 'Too many attempts. Please wait before trying again.'
								: error.message}
						</p>
					)}
					<Button type="submit" disabled={isLoading || blocked || value.length === 0}>
						Verify and continue
					</Button>
				</form>
			</div>
		</main>
	);
}
