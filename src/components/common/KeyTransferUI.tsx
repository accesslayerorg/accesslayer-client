
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AddressInput from '@/components/common/AddressInput';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAddressBook, validateAddressBookInput } from '@/hooks/useAddressBook';
import { Loader, Send, CheckCircle, Clock } from 'lucide-react';
import showToast from '@/utils/toast.util';

interface KeyTransferFormData {
	recipientAddress: string;
	transferMessage?: string;
}

interface PendingTransfer {
	id: string;
	recipientAddress: string;
	initiatedAt: Date;
	expiresAt: Date;
}

interface KeyTransferUIProps {
	keyId: string;
	keyName: string;
	currentOwner: string;
	onTransferInitiated?: () => void;
	onTransferAccepted?: () => void;
	onTransferCancelled?: () => void;
	pendingTransfer?: PendingTransfer;
	canAcceptTransfer?: boolean;
}

export default function KeyTransferUI({
	keyName,
	currentOwner,
	onTransferInitiated,
	onTransferAccepted,
	onTransferCancelled,
	pendingTransfer,
	canAcceptTransfer = false,
}: KeyTransferUIProps) {
	const [showTransferForm, setShowTransferForm] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [recipientInput, setRecipientInput] = useState('');
	const [resolvedRecipient, setResolvedRecipient] = useState<string | null>(
		null
	);
	const [saveRecipient, setSaveRecipient] = useState(false);
	const [saveLabel, setSaveLabel] = useState('');

	const entries = useAddressBook(state => state.entries);
	const addToAddressBook = useAddressBook(state => state.add);

	const { register, handleSubmit, reset } = useForm<KeyTransferFormData>({
		defaultValues: {
			recipientAddress: '',
			transferMessage: '',
		},
	});

	const canOfferSave =
		!!resolvedRecipient &&
		!validateAddressBookInput(entries, {
			label: 'x',
			address: resolvedRecipient,
		})?.field;

	const handleInitiateTransfer = async (data: KeyTransferFormData) => {
		const finalAddress = resolvedRecipient;

		if (!finalAddress) {
			showToast.error('Please enter a valid recipient address');
			return;
		}

		if (saveRecipient && !saveLabel.trim()) {
			showToast.error('Please enter a label for the recipient');
			return;
		}

		setIsLoading(true);

		try {
			// TODO: Integrate with key transfer service
			// const result = await initiateKeyTransfer({
			//   keyId,
			//   recipientAddress: finalAddress,
			//   message: data.transferMessage,
			// });

			showToast.success(
				'Transfer initiated. Waiting for recipient acceptance.'
			);

			if (saveRecipient && canOfferSave) {
				const saved = addToAddressBook({
					label: saveLabel.trim(),
					address: finalAddress,
				});

				if (saved.ok) {
					showToast.success('Recipient saved to your address book.');
				} else {
					showToast.error(
						`Recipient not saved: ${saved.error.message}`
					);
				}
			}

			setShowTransferForm(false);
			setRecipientInput('');
			setResolvedRecipient(null);
			setSaveRecipient(false);
			setSaveLabel('');
			reset();

			onTransferInitiated?.();
		} catch (error) {
			showToast.error(
				error instanceof Error
					? error.message
					: 'Failed to initiate transfer'
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleAcceptTransfer = async () => {
		if (!pendingTransfer) return;

		setIsLoading(true);

		try {
			// TODO: Integrate with key transfer service
			// const result = await acceptKeyTransfer({
			//   keyId,
			//   transferId: pendingTransfer.id,
			// });

			showToast.success('Transfer accepted! You are now the key owner.');
			onTransferAccepted?.();
		} catch (error) {
			showToast.error(
				error instanceof Error
					? error.message
					: 'Failed to accept transfer'
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancelTransfer = async () => {
		if (!pendingTransfer) return;

		setIsLoading(true);

		try {
			// TODO: Integrate with key transfer service
			// const result = await cancelKeyTransfer({
			//   keyId,
			//   transferId: pendingTransfer.id,
			// });

			showToast.success('Transfer cancelled.');
			onTransferCancelled?.();
		} catch (error) {
			showToast.error(
				error instanceof Error
					? error.message
					: 'Failed to cancel transfer'
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="space-y-4">
			{/* Pending Transfer Status */}
			{pendingTransfer && (
				<Card className="border-orange-200 bg-orange-50">
					<CardHeader>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Clock className="h-5 w-5 text-orange-600" />
								<CardTitle className="text-orange-900">
									Pending Transfer
								</CardTitle>
							</div>
							<Badge variant="outline" className="bg-orange-100">
								Awaiting Acceptance
							</Badge>
						</div>
					</CardHeader>

					<CardContent className="space-y-4">
						<div>
							<p className="text-sm text-orange-800">
								<strong>From:</strong> {currentOwner}
							</p>
							<p className="text-sm text-orange-800">
								<strong>To:</strong> {pendingTransfer.recipientAddress}
							</p>
							<p className="text-xs text-orange-700 mt-2">
								Expires:{' '}
								{new Date(
									pendingTransfer.expiresAt
								).toLocaleDateString()}
							</p>
						</div>

						{canAcceptTransfer && (
							<Button
								onClick={handleAcceptTransfer}
								disabled={isLoading}
								className="w-full"
							>
								{isLoading && (
									<Loader className="h-4 w-4 animate-spin mr-2" />
								)}
								Accept Transfer
							</Button>
						)}

						{!canAcceptTransfer && (
							<Button
								variant="outline"
								onClick={handleCancelTransfer}
								disabled={isLoading}
								className="w-full"
							>
								Cancel Transfer
							</Button>
						)}
					</CardContent>
				</Card>
			)}

			{/* Completed Transfer Status */}
			{!pendingTransfer && currentOwner !== 'You' && (
				<Card className="border-green-200 bg-green-50">
					<CardContent className="pt-6">
						<div className="flex items-start gap-3">
							<CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
							<div>
								<p className="font-semibold text-green-900">
									You own this key
								</p>
								<p className="text-sm text-green-800 mt-1">
									"{keyName}" has been successfully transferred to your
									ownership
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Transfer Initiation Form */}
			{!pendingTransfer && currentOwner === 'You' && (
				<Card>
					<CardHeader>
						<CardTitle>Transfer Key Ownership</CardTitle>
						<CardDescription>
							Initiate a handover of "{keyName}" to another creator
						</CardDescription>
					</CardHeader>

					<CardContent>
						{!showTransferForm ? (
							<Button
								onClick={() => setShowTransferForm(true)}
								className="w-full"
							>
								<Send className="h-4 w-4 mr-2" />
								Initiate Transfer
							</Button>
						) : (
							<form
								onSubmit={handleSubmit(handleInitiateTransfer)}
								className="space-y-4"
							>
								<Alert>
									<AlertDescription>
										The recipient will need to accept this transfer
										within 7 days.
									</AlertDescription>
								</Alert>

								<div>
									<Label htmlFor="recipientAddress">
										Recipient Address
									</Label>

									<AddressInput
										id="recipientAddress"
										placeholder="Stellar address (G...) or name*domain"
										value={recipientInput}
										onChange={e => {
											setRecipientInput(e.target.value);
											setResolvedRecipient(null);
										}}
										onResolved={setResolvedRecipient}
										className="mt-1 font-mono text-sm"
									/>
								</div>

								{canOfferSave && (
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<Checkbox
												id="saveRecipient"
												checked={saveRecipient}
												onCheckedChange={checked =>
													setSaveRecipient(checked === true)
												}
											/>
											<Label htmlFor="saveRecipient">
												Save recipient
											</Label>
										</div>

										{saveRecipient && (
											<Input
												aria-label="Recipient label"
												placeholder="Label, e.g. Alice"
												value={saveLabel}
												onChange={e =>
													setSaveLabel(e.target.value)
												}
											/>
										)}
									</div>
								)}

								<div>
									<Label htmlFor="transferMessage">
										Message (Optional)
									</Label>
									<Input
										id="transferMessage"
										placeholder="Add a note for the recipient..."
										{...register('transferMessage')}
										className="mt-1"
									/>
								</div>

								<div className="flex gap-2">
									<Button
										type="submit"
										disabled={
											isLoading ||
											!resolvedRecipient ||
											(saveRecipient && !saveLabel.trim())
										}
										className="flex-1"
									>
										{isLoading && (
											<Loader className="h-4 w-4 animate-spin mr-2" />
										)}
										Send Transfer Request
									</Button>

									<Button
										type="button"
										variant="outline"
										onClick={() => {
											setShowTransferForm(false);
											setRecipientInput('');
											setResolvedRecipient(null);
											setSaveRecipient(false);
											setSaveLabel('');
											reset();
										}}
										disabled={isLoading}
									>
										Cancel
									</Button>
								</div>
							</form>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
