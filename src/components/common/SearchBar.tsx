import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import InlineValidationMessage from '@/components/common/InlineValidationMessage';

interface SearchBarProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	validationMessage?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
	value,
	onChange,
	placeholder = 'Search creators by name or handle...',
	className,
	validationMessage,
}) => {
	return (
		<div className={cn('w-full max-w-md', className)}>
			<div className="relative">
				<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
					<Search className="size-5 text-white/50" aria-hidden="true" />
				</div>
				<input
					type="text"
					className={cn(
						'block w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-3 text-sm text-white placeholder:text-white/40 focus:border-amber-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500/20',
						validationMessage &&
							'border-amber-400/45 focus:border-amber-400/65 focus:ring-amber-300/20'
					)}
					placeholder={placeholder}
					value={value}
					onChange={e => onChange(e.target.value)}
				/>
			</div>
			{validationMessage && (
				<InlineValidationMessage message={validationMessage} />
			)}
		</div>
	);
};

export default SearchBar;
