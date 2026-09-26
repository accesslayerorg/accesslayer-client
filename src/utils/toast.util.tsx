import toast from 'react-hot-toast';
import type { ToastOptions } from 'react-hot-toast';
import TransactionHashRow from '@/components/common/TransactionHashRow';

const TRANSACTION_TOAST_DURATION_MS = 4_000;

const showToast = {
	message: (message: string, options?: ToastOptions) => {
		toast.remove();
		toast(message, options);
	},
	success: (message: string, options?: ToastOptions) => {
		toast.remove();
		toast.success(message, { duration: TRANSACTION_TOAST_DURATION_MS, ...options });
	},
	error: (message: string, options?: ToastOptions) => {
		toast.remove();
		toast.error(message, options);
	},
	loading: (message: string, options?: ToastOptions) => {
		toast.remove();
		toast.loading(message, options);
	},
	transactionSuccess: (
		title: string,
		message?: string,
		txHash?: string,
		explorerUrl?: string
	) => {
		toast.remove();
		toast.custom(
			t => (
				<div
					role="status"
					aria-live="polite"
					className={`${
						t.visible ? 'animate-enter' : 'animate-leave'
					} pointer-events-auto flex w-full max-w-sm rounded-xl border border-amber-500/20 bg-slate-900 shadow-xl shadow-amber-500/10`}
				>
					<div className="flex w-full p-4 flex-col gap-3">
						<div className="flex items-start">
							<div className="flex-1">
								<p className="font-jakarta text-sm font-bold text-white">
									{title}
								</p>
								{message && (
									<p className="mt-1 font-jakarta text-sm text-white/60">
										{message}
									</p>
								)}
							</div>
						</div>
						{txHash && (
							<TransactionHashRow
								hash={txHash}
								explorerUrl={explorerUrl}
								className="mt-1 bg-white/5 rounded-lg px-2.5 py-1.5"
							/>
						)}
						{explorerUrl && (
							<a
								href={explorerUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-400/80 underline-offset-2 hover:text-amber-300 hover:underline transition-colors"
							>
								View on Stellar Expert
							</a>
						)}
					</div>
				</div>
			),
			{ duration: TRANSACTION_TOAST_DURATION_MS }
		);
	},
};

export default showToast;
