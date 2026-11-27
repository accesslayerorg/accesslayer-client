import { useState } from 'react';

export interface SavedViewOption {
	id: string;
	name: string;
}

export interface SavedViewsMenuProps {
	views: SavedViewOption[];
	activeViewId?: string | null;
	isModified?: boolean;
	onApply: (viewId: string) => void;
	onSave: (name: string) => void;
	onRename: (viewId: string, name: string) => void;
	onDelete: (viewId: string) => void;
}

/** Compact picker for applying, saving, renaming, and deleting discovery views. */
export default function SavedViewsMenu({
	views,
	activeViewId,
	isModified,
	onApply,
	onSave,
	onRename,
	onDelete,
}: SavedViewsMenuProps) {
	const [name, setName] = useState('');
	const activeView = views.find(view => view.id === activeViewId);
	const trimmedName = name.trim();

	const save = () => {
		if (!trimmedName) return;
		onSave(trimmedName);
		setName('');
	};

	const rename = () => {
		if (!activeView || !trimmedName) return;
		onRename(activeView.id, trimmedName);
		setName('');
	};

	return (
		<details className="relative" data-testid="saved-views-menu">
			<summary className="inline-flex h-7 cursor-pointer list-none items-center rounded-full border border-white/15 bg-white/5 px-3 text-[0.72rem] font-bold text-white/80 hover:bg-white/10 [&::-webkit-details-marker]:hidden">
				Saved views
				{activeView ? `: ${activeView.name}` : ''}
				{isModified ? ' *' : ''}
			</summary>
			<div className="absolute right-0 z-20 mt-2 w-64 space-y-2 rounded-xl border border-white/10 bg-slate-900 p-3 shadow-xl">
				<label className="block text-xs text-white/60">
					Apply a view
					<select
						className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-2 py-1 text-xs text-white"
						value={activeViewId ?? ''}
						onChange={event => {
							if (event.target.value) onApply(event.target.value);
						}}
					>
						<option value="">Choose a view</option>
						{views.map(view => (
							<option key={view.id} value={view.id}>
								{view.name}
							</option>
						))}
					</select>
				</label>
				<div className="flex flex-wrap gap-1">
					<input
						aria-label="Saved view name"
						className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-800 px-2 py-1 text-xs text-white"
						placeholder="View name"
						value={name}
						onChange={event => setName(event.target.value)}
					/>
					<button
						type="button"
						className="rounded-lg bg-amber-400 px-2 py-1 text-xs font-bold text-slate-950 disabled:opacity-40"
						disabled={!trimmedName}
						onClick={save}
					>
						Save
					</button>
					<button
						type="button"
						className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white disabled:opacity-40"
						disabled={!activeView || !trimmedName}
						onClick={rename}
					>
						Rename
					</button>
					<button
						type="button"
						className="rounded-lg border border-rose-400/30 px-2 py-1 text-xs text-rose-300 disabled:opacity-40"
						disabled={!activeView}
						onClick={() => activeView && onDelete(activeView.id)}
					>
						Delete
					</button>
				</div>
			</div>
		</details>
	);
}
