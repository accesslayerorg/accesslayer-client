import { useRef, useState } from 'react';
import {
	AlertTriangle,
	Download,
	FileText,
	Loader2,
	Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { useAllowlistImport } from '@/hooks/useCreatorWhitelist';
import type { AllowlistImportReport } from '@/services/creatorWhitelist.service';
import {
	ALLOWLIST_IMPORT_TEMPLATE,
	MAX_ALLOWLIST_IMPORT_BYTES,
	parseAllowlistCsvPreview,
	type CsvPreview,
} from '@/utils/allowlistImport.utils';
import { cn } from '@/lib/utils';

interface AllowlistImportModalProps {
	keyId: string;
	disabled?: boolean;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'The CSV import failed.';
}

function sameCounts(
	first: AllowlistImportReport,
	second: AllowlistImportReport
): boolean {
	return (
		first.created === second.created &&
		first.updated === second.updated &&
		first.skipped === second.skipped
	);
}

function PreviewTable({ preview }: { preview: CsvPreview }) {
	return (
		<div className="space-y-2" data-testid="allowlist-preview">
			<h3 className="text-sm font-semibold text-white/80">
				Preview · first {preview.rows.length} data row
				{preview.rows.length === 1 ? '' : 's'}
			</h3>
			<div className="overflow-x-auto rounded-lg border border-white/10">
				<table className="w-full text-left text-xs">
					<thead className="bg-white/[0.04] text-white/60">
						<tr>
							{preview.columns.map((column, index) => (
								<th
									key={`${column}-${index}`}
									className="whitespace-nowrap px-3 py-2 font-semibold"
								>
									{column}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-white/5">
						{preview.rows.map(row => (
							<tr key={row.rowNumber}>
								{preview.columns.map((_, index) => (
									<td
										key={`${row.rowNumber}-${index}`}
										className="max-w-64 truncate px-3 py-2 font-mono text-white/70"
									>
										{row.values[index] ?? ''}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{preview.rows.length === 0 && (
				<p className="text-xs text-white/45">
					The CSV contains a header but no data rows.
				</p>
			)}
		</div>
	);
}

export default function AllowlistImportModal({
	keyId,
	disabled = false,
}: AllowlistImportModalProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={disabled}
				onClick={() => setIsOpen(true)}
				data-testid="allowlist-import-open"
				className="rounded-lg border-white/10 bg-white/[0.03] text-xs font-semibold text-white/70 hover:border-amber-400/40 hover:text-amber-300"
			>
				<Upload className="size-3.5" aria-hidden="true" />
				Import CSV
			</Button>
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				{isOpen && (
					<AllowlistImportDialog
						keyId={keyId}
						onClose={() => setIsOpen(false)}
					/>
				)}
			</Dialog>
		</>
	);
}

function AllowlistImportDialog({
	keyId,
	onClose,
}: {
	keyId: string;
	onClose: () => void;
}) {
	const fileInput = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<CsvPreview | null>(null);
	const [localError, setLocalError] = useState<string | null>(null);
	const [appliedReport, setAppliedReport] =
		useState<AllowlistImportReport | null>(null);
	const importFlow = useAllowlistImport(keyId);

	const reset = () => {
		setFile(null);
		setPreview(null);
		setLocalError(null);
		setAppliedReport(null);
		importFlow.reset();
		if (fileInput.current) fileInput.current.value = '';
	};

	const handleFile = async (selectedFile?: File) => {
		reset();
		if (!selectedFile) return;

		if (selectedFile.size > MAX_ALLOWLIST_IMPORT_BYTES) {
			setLocalError('Files must be 2 MB or smaller.');
			return;
		}
		if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
			setLocalError('Choose a CSV file.');
			return;
		}

		setFile(selectedFile);
		try {
			const text =
				typeof selectedFile.text === 'function'
					? await selectedFile.text()
					: await new Promise<string>((resolve, reject) => {
							const reader = new FileReader();
							reader.onload = () => resolve(String(reader.result ?? ''));
							reader.onerror = () => reject(reader.error);
							reader.readAsText(selectedFile);
						});
			const parsed = parseAllowlistCsvPreview(text);
			setPreview(parsed);
			if (parsed.error) setLocalError(parsed.error);
		} catch (error) {
			setLocalError(errorMessage(error));
		}
	};

	const handleDryRun = async () => {
		if (!file) return;
		setLocalError(null);
		try {
			await importFlow.dryRun(file);
		} catch (error) {
			setLocalError(errorMessage(error));
		}
	};

	const handleApply = async () => {
		if (!file) return;
		setLocalError(null);
		try {
			const result = await importFlow.apply(file);
			setAppliedReport(result);
		} catch (error) {
			setLocalError(errorMessage(error));
		}
	};

	const report = appliedReport ?? importFlow.report;
	const canRunDryRun =
		Boolean(file && preview && !preview.error) &&
		!importFlow.isDryRunning &&
		!importFlow.isApplying;

	return (
		<DialogContent
			className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#0b1626] text-white sm:max-w-2xl"
			showEscapeHint={false}
		>
			<DialogHeader>
				<DialogTitle className="font-grotesque">
					Import allowlist from CSV
				</DialogTitle>
				<DialogDescription className="text-white/60">
					Preview the file and run a dry run before applying any changes.
					Files are limited to 2 MB.
				</DialogDescription>
			</DialogHeader>

			<div className="space-y-4">
				<div
					role="button"
					tabIndex={0}
					aria-label="Choose or drop a CSV file"
					data-testid="allowlist-import-dropzone"
					onClick={() => fileInput.current?.click()}
					onKeyDown={event => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							fileInput.current?.click();
						}
					}}
					onDragOver={event => {
						event.preventDefault();
						setIsDragging(true);
					}}
					onDragLeave={() => setIsDragging(false)}
					onDrop={event => {
						event.preventDefault();
						setIsDragging(false);
						void handleFile(event.dataTransfer.files[0]);
					}}
					className={cn(
						'cursor-pointer rounded-xl border border-dashed px-5 py-8 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/40',
						isDragging
							? 'border-amber-400/60 bg-amber-400/10'
							: 'border-white/20 bg-white/[0.02] hover:border-white/35'
					)}
				>
					<input
						ref={fileInput}
						type="file"
						accept=".csv,text/csv"
						aria-label="CSV file"
						data-testid="allowlist-import-file"
						className="sr-only"
						onChange={event => {
							void handleFile(event.target.files?.[0]);
						}}
					/>
					<FileText className="mx-auto mb-2 size-6 text-white/45" />
					<p className="text-sm font-semibold text-white/80">
						{file ? file.name : 'Drop a CSV file here or browse'}
					</p>
					<p className="mt-1 text-xs text-white/45">
						Maximum file size: 2 MB
					</p>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-3">
					<a
						href={`data:text/csv;charset=utf-8,${encodeURIComponent(ALLOWLIST_IMPORT_TEMPLATE)}`}
						download="allowlist-template.csv"
						data-testid="allowlist-template-download"
						className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200"
					>
						<Download className="size-3.5" aria-hidden="true" />
						Download sample CSV
					</a>
					<Button
						type="button"
						onClick={() => void handleDryRun()}
						disabled={!canRunDryRun}
						data-testid="allowlist-dry-run"
						className="rounded-lg"
					>
						{importFlow.isDryRunning && (
							<Loader2
								className="size-4 animate-spin"
								aria-hidden="true"
							/>
						)}
						{importFlow.isDryRunning ? 'Validating…' : 'Run dry run'}
					</Button>
				</div>

				{preview && !preview.error && <PreviewTable preview={preview} />}

				{report && (
					<section
						aria-live="polite"
						data-testid="allowlist-import-report"
						className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4"
					>
						<h3 className="text-sm font-semibold text-white/85">
							{appliedReport ? 'Import complete' : 'Dry run report'}
						</h3>
						<dl className="grid grid-cols-3 gap-3 text-center text-xs">
							<div>
								<dt className="text-white/45">Created</dt>
								<dd
									data-testid="allowlist-created-count"
									className="mt-1 text-lg font-bold text-emerald-300"
								>
									{report.created}
								</dd>
							</div>
							<div>
								<dt className="text-white/45">Updated</dt>
								<dd
									data-testid="allowlist-updated-count"
									className="mt-1 text-lg font-bold text-sky-300"
								>
									{report.updated}
								</dd>
							</div>
							<div>
								<dt className="text-white/45">Skipped</dt>
								<dd
									data-testid="allowlist-skipped-count"
									className="mt-1 text-lg font-bold text-amber-300"
								>
									{report.skipped}
								</dd>
							</div>
						</dl>
						{report.fatalErrors > 0 && (
							<p
								role="alert"
								className="flex items-center gap-2 text-sm text-red-300"
							>
								<AlertTriangle className="size-4 shrink-0" />
								{report.fatalErrors} fatal error
								{report.fatalErrors === 1 ? '' : 's'}; resolve these
								before applying.
							</p>
						)}
						{report.invalidRows.length > 0 && (
							<div className="space-y-2">
								<h4 className="text-xs font-semibold text-white/70">
									Invalid rows ({report.invalidRows.length})
								</h4>
								<div className="max-h-40 overflow-auto rounded-lg border border-white/10">
									<table className="w-full text-left text-xs">
										<thead className="sticky top-0 bg-[#0b1626] text-white/50">
											<tr>
												<th className="px-3 py-2">Row</th>
												<th className="px-3 py-2">Reason</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-white/5">
											{report.invalidRows.map(
												(invalidRow, index) => (
													<tr
														key={`${invalidRow.rowNumber}-${index}`}
													>
														<td className="whitespace-nowrap px-3 py-2 font-mono text-white/70">
															{invalidRow.rowNumber}
														</td>
														<td className="px-3 py-2 text-red-200/80">
															{invalidRow.reason}
														</td>
													</tr>
												)
											)}
										</tbody>
									</table>
								</div>
							</div>
						)}
						{appliedReport &&
							importFlow.report &&
							!sameCounts(importFlow.report, appliedReport) && (
								<p role="status" className="text-xs text-amber-200">
									Applied counts differ from the dry run. Review the
									final counts above.
								</p>
							)}
					</section>
				)}

				{localError && (
					<p
						role="alert"
						data-testid="allowlist-import-error"
						className="text-sm text-red-300"
					>
						{localError}
					</p>
				)}
			</div>

			<DialogFooter>
				<Button
					type="button"
					variant="outline"
					onClick={onClose}
					disabled={importFlow.isDryRunning || importFlow.isApplying}
					className="rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10"
				>
					Close
				</Button>
				<Button
					type="button"
					onClick={() => void handleApply()}
					disabled={
						!file ||
						!importFlow.canApply ||
						importFlow.isDryRunning ||
						importFlow.isApplying ||
						Boolean(appliedReport)
					}
					data-testid="allowlist-apply"
					className="rounded-lg"
				>
					{importFlow.isApplying && (
						<Loader2 className="size-4 animate-spin" aria-hidden="true" />
					)}
					{appliedReport
						? 'Applied'
						: importFlow.isApplying
							? 'Applying…'
							: 'Apply import'}
				</Button>
			</DialogFooter>
		</DialogContent>
	);
}
