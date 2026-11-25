import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { AsyncButton } from '@/components/ui/async-button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateApiKey } from '@/hooks/useApiKeys';
import {
	API_KEY_SCOPES,
	API_KEY_SCOPE_LABELS,
	type ApiKeyScope,
	type CreatedApiKey,
} from '@/services/apiKey.service';

export interface CreateApiKeyModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSecretCreated: (created: CreatedApiKey) => void;
}

/** Create-key form with a name and the scopes the key may use (#1322). */
export default function CreateApiKeyModal({
	open,
	onOpenChange,
	onSecretCreated,
}: CreateApiKeyModalProps) {
	const [name, setName] = useState('');
	const [scopes, setScopes] = useState<ApiKeyScope[]>([]);
	const [formError, setFormError] = useState<string | null>(null);

	const createKey = useCreateApiKey(onSecretCreated);

	const reset = () => {
		setName('');
		setScopes([]);
		setFormError(null);
	};

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) reset();
		onOpenChange(nextOpen);
	};

	const toggleScope = (scope: ApiKeyScope, checked: boolean) => {
		setScopes(current =>
			checked ? [...current, scope] : current.filter(item => item !== scope)
		);
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const trimmedName = name.trim();
		if (!trimmedName) {
			setFormError('Give the key a name.');
			return;
		}
		if (scopes.length === 0) {
			setFormError('Select at least one scope.');
			return;
		}

		setFormError(null);
		try {
			await createKey.mutateAsync({ name: trimmedName, scopes });
			reset();
		} catch {
			// The hook surfaces the failure with a toast; keep the form open.
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent data-testid="create-api-key-dialog">
				<DialogHeader>
					<DialogTitle>Create API key</DialogTitle>
					<DialogDescription>
						Name the integration and pick the scopes it needs. You'll see
						the secret once after creating it.
					</DialogDescription>
				</DialogHeader>

				<form className="space-y-4" onSubmit={handleSubmit} noValidate>
					<div className="space-y-2">
						<Label htmlFor="api-key-name">Name</Label>
						<Input
							id="api-key-name"
							name="name"
							value={name}
							onChange={event => setName(event.target.value)}
							placeholder="Production integration"
							maxLength={64}
							autoFocus
						/>
					</div>

					<fieldset className="space-y-2">
						<legend className="text-sm font-medium">Scopes</legend>
						{API_KEY_SCOPES.map(scope => (
							<div key={scope} className="flex items-center gap-2">
								<Checkbox
									id={`api-key-scope-${scope}`}
									checked={scopes.includes(scope)}
									onCheckedChange={checked =>
										toggleScope(scope, checked)
									}
								/>
								<Label
									htmlFor={`api-key-scope-${scope}`}
									className="font-normal"
								>
									<span className="font-mono text-xs">{scope}</span>
									<span className="ml-2 text-xs text-muted-foreground">
										{API_KEY_SCOPE_LABELS[scope]}
									</span>
								</Label>
							</div>
						))}
					</fieldset>

					{formError && (
						<p role="alert" className="text-sm text-destructive">
							{formError}
						</p>
					)}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
						>
							Cancel
						</Button>
						<AsyncButton
							type="submit"
							isPending={createKey.isPending}
							pendingText="Creating…"
						>
							Create key
						</AsyncButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
