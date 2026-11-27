import { Check, Pencil, Bookmark, Trash2 } from 'lucide-react';
import type { SavedDiscoveryView } from '@/hooks/useSavedViews';

interface SavedViewsMenuProps {
	views: SavedDiscoveryView[];
	activeViewId: string | null;
	isModified: boolean;
	onApply: (id: string) => void;
	onSave: (name: string) => void;
	onRename: (id: string, name: string) => void;
	onDelete: (id: string) => void;
}

export default function SavedViewsMenu({
	views,
	activeViewId,
	isModified,
	onApply,
	onSave,
	onRename,
	onDelete,
}: SavedViewsMenuProps) {
	const handleSave = () => {
		const name = window.prompt('Name this saved view');
		if (name?.trim()) onSave(name.trim());
	};

	const handleRename = (view: SavedDiscoveryView) => {
		const name = window.prompt('Rename saved view', view.name);
		if (name?.trim()) onRename(view.id, name.trim());
	};

	return (
		<details className="relative" data-testid="saved-views-menu">
			<summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-[0.72rem] font-bold text-muted-foreground transition-colors hover:text-foreground">
				<Bookmark className="size-3.5" aria-hidden="true" />
				Saved views
				{views.length > 0 && <span>({views.length})</span>}
			</summary>
			<div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-border bg-background p-2 shadow-lg">
				<button
					type="button"
					className="w-full rounded-md px-2 py-1.5 text-left text-xs font-medium hover:bg-muted"
					onClick={handleSave}
				>
					Save current view
				</button>
				{views.length === 0 ? (
					<p className="px-2 py-2 text-xs text-muted-foreground">
						No saved views yet.
					</p>
				) : (
					views.map((view) => (
						<div
							key={view.id}
							className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted"
						>
							<button
								type="button"
								className="flex min-w-0 flex-1 items-center gap-1 text-left text-xs"
								onClick={() => onApply(view.id)}
							>
								{view.id === activeViewId && (
									<Check className="size-3 shrink-0" aria-hidden="true" />
								)}
								<span className="truncate">
									{view.name}
									{view.id === activeViewId && isModified && ' *'}
								</span>
							</button>
							<button
								type="button"
								aria-label={`Rename ${view.name}`}
								className="rounded p-1 text-muted-foreground hover:text-foreground"
								onClick={() => handleRename(view)}
							>
								<Pencil className="size-3" aria-hidden="true" />
							</button>
							<button
								type="button"
								aria-label={`Delete ${view.name}`}
								className="rounded p-1 text-muted-foreground hover:text-foreground"
								onClick={() => onDelete(view.id)}
							>
								<Trash2 className="size-3" aria-hidden="true" />
							</button>
						</div>
					))
				)}
			</div>
		</details>
	);
}
