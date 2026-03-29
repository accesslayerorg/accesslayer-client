import toast from 'react-hot-toast';

const showToast = {
	message: (message: string) => {
		toast.remove();
		toast(message);
	},
	success: (message: string) => {
		toast.remove();
		toast.success(message);
	},
	error: (message: string) => {
		toast.remove();
		toast.error(message);
	},
	loading: (message: string) => {
		toast.remove();
		toast.loading(message);
	},
	transactionSuccess: (title: string, message?: string) => {
		toast.remove();
		toast.custom(
			t => (
				<div
					className={`${
						t.visible ? 'animate-enter' : 'animate-leave'
					} pointer-events-auto flex w-full max-w-sm rounded-xl border border-amber-500/20 bg-slate-900 shadow-xl shadow-amber-500/10`}
				>
					<div className="flex w-full p-4">
						<div className="flex items-start">
							<div className="ml-3 flex-1">
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
					</div>
				</div>
			),
			{ duration: 4000 }
		);
	},
};

export default showToast;
