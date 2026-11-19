import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
  const { register, handleSubmit, reset } = useForm<KeyTransferFormData>({
    defaultValues: {
      recipientAddress: '',
      transferMessage: '',
    },
  });

  const handleInitiateTransfer = async (data: KeyTransferFormData) => {
    if (!data.recipientAddress) {
      showToast.error('Please enter a recipient address');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Integrate with key transfer service
      // const result = await initiateKeyTransfer({
      //   keyId,
      //   recipientAddress: data.recipientAddress,
      //   message: data.transferMessage,
      // });

      showToast.success('Transfer initiated. Waiting for recipient acceptance.');
      setShowTransferForm(false);
      reset();
      onTransferInitiated?.();
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Failed to initiate transfer'
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
        error instanceof Error ? error.message : 'Failed to accept transfer'
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
        error instanceof Error ? error.message : 'Failed to cancel transfer'
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
                <CardTitle className="text-orange-900">Pending Transfer</CardTitle>
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
                Expires: {new Date(pendingTransfer.expiresAt).toLocaleDateString()}
              </p>
            </div>

            {canAcceptTransfer && (
              <div className="flex gap-2">
                <Button
                  onClick={handleAcceptTransfer}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : null}
                  Accept Transfer
                </Button>
              </div>
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
                <p className="font-semibold text-green-900">You own this key</p>
                <p className="text-sm text-green-800 mt-1">
                  "{keyName}" has been successfully transferred to your ownership
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
              <Button onClick={() => setShowTransferForm(true)} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Initiate Transfer
              </Button>
            ) : (
              <form onSubmit={handleSubmit(handleInitiateTransfer)} className="space-y-4">
                <Alert>
                  <AlertDescription>
                    The recipient will need to accept this transfer within 7 days.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="recipientAddress">Recipient Address</Label>
                  <Input
                    id="recipientAddress"
                    placeholder="0x..."
                    {...register('recipientAddress', {
                      required: 'Recipient address is required',
                    })}
                    className="mt-1 font-mono text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="transferMessage">Message (Optional)</Label>
                  <Input
                    id="transferMessage"
                    placeholder="Add a note for the recipient..."
                    {...register('transferMessage')}
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : null}
                    Send Transfer Request
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowTransferForm(false)}
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
