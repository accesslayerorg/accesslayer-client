import { X } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { ComparisonKey } from '@/hooks/useKeyComparison';

interface ComparisonTrayProps {
	selectedKeys: ComparisonKey[];
	onRemoveKey: (id: string) => void;
	onClearAll: () => void;
}

export default function ComparisonTray({
	selectedKeys,
	onRemoveKey,
	onClearAll,
}: ComparisonTrayProps) {
	const navigate = useNavigate();

	if (selectedKeys.length === 0) return null;

	const handleCompare = () => {
		const keyIds = selectedKeys.map(k => k.id).join(',');
		navigate(`/compare?keys=${keyIds}`);
	};

	return (
		<div
			data-testid="comparison-tray"
			className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-slate-950/95 backdrop-blur-md"
		>
			<div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
				<div className="flex items-center gap-3">
					<span className="text-sm font-medium text-white/70">
						Compare ({selectedKeys.length}/3)
					</span>
					<div className="flex items-center gap-2">
						{selectedKeys.map(key => (
							<div
								key={key.id}
								className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1"
							>
								<span className="text-xs text-white/80">{key.name}</span>
								<button
									type="button"
									onClick={() => onRemoveKey(key.id)}
									className="ml-1 text-white/40 hover:text-white/80"
									aria-label={`Remove ${key.name} from comparison`}
								>
									<X className="size-3" />
								</button>
							</div>
						))}
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onClearAll}
						className="text-xs text-white/50 hover:text-white/80"
					>
						Clear all
					</button>
					<button
						type="button"
						onClick={handleCompare}
						disabled={selectedKeys.length < 2}
						className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Compare
					</button>
				</div>
			</div>
		</div>
	);
}
