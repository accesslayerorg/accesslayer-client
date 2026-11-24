import { useEffect, useState } from 'react';
import { Upload, Link2 } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { computeEvidenceHash } from '@/utils/hash.utils';

export interface EvidenceValues {
	link: string;
	description: string;
	fileHash: string;
	fileName?: string;
}

export interface SubmitEvidenceModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	milestoneTitle: string;
	isSubmitting?: boolean;
	onSubmit: (values: EvidenceValues) => void;
}

export default function SubmitEvidenceModal({
	open,
	onOpenChange,
	milestoneTitle,
	isSubmitting = false,
	onSubmit,
}: SubmitEvidenceModalProps) {
	const [link, setLink] = useState('');
	const [description, setDescription] = useState('');
	const [file, setFile] = useState<File | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setLink('');
		setDescription('');
		setFile(null);
		setError(null);
	}, [open, milestoneTitle]);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (link.trim() && !/^https?:\/\//i.test(link.trim())) {
			setError('Enter a valid http(s) link.');
			return;
		}
		if (!link.trim() && !file) {
			setError('Add a link or an evidence file.');
			return;
		}

		let bytes: ArrayBuffer | null = null;
		if (file) {
			try {
				bytes = await file.arrayBuffer();
			} catch {
				setError('The evidence file could not be read.');
				return;
			}
		}

		setError(null);
		onSubmit({
			link: link.trim(),
			description: description.trim(),
			fileHash: computeEvidenceHash(link, description, bytes),
			fileName: file?.name,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="max-w-md border-white/10 bg-[#0b1728] text-white"
				data-testid="submit-evidence-modal"
			>
				<DialogHeader>
					<DialogTitle className="text-lg font-bold">
						Submit evidence
					</DialogTitle>
					<DialogDescription className="text-sm text-white/50">
						{milestoneTitle} — evidence is hashed before it is sent for
						review.
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={event => void handleSubmit(event)}
					className="space-y-4"
				>
					<div className="space-y-1.5">
						<Label htmlFor="evidence-link">Link to work</Label>
						<div className="relative">
							<Link2
								className="absolute top-2.5 left-2.5 size-4 text-white/35"
								aria-hidden="true"
							/>
							<Input
								id="evidence-link"
								type="url"
								placeholder="https://…"
								value={link}
								onChange={event => setLink(event.target.value)}
								className="pl-8"
								data-testid="evidence-link"
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="evidence-file">Evidence file</Label>
						<label
							htmlFor="evidence-file"
							className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-white/20 bg-white/[0.02] p-3 text-sm text-white/60 hover:border-white/40"
						>
							<Upload
								className="size-4 text-amber-400"
								aria-hidden="true"
							/>
							<span className="truncate">
								{file?.name ?? 'Choose a file to upload'}
							</span>
							<input
								id="evidence-file"
								type="file"
								className="sr-only"
								onChange={event =>
									setFile(event.target.files?.[0] ?? null)
								}
								data-testid="evidence-file"
							/>
						</label>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="evidence-description">Description</Label>
						<Textarea
							id="evidence-description"
							rows={3}
							value={description}
							onChange={event => setDescription(event.target.value)}
							placeholder="Summarise what this milestone delivered"
							data-testid="evidence-description"
						/>
					</div>

					{error && (
						<p
							role="alert"
							className="text-xs text-rose-400"
							data-testid="evidence-error"
						>
							{error}
						</p>
					)}

					<DialogFooter className="gap-2">
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting}
							className="bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300"
							data-testid="evidence-submit"
						>
							{isSubmitting ? 'Submitting…' : 'Submit evidence'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
