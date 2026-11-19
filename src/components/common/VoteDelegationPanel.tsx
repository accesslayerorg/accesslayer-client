import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader } from 'lucide-react';
import showToast from '@/utils/toast.util';

interface VoteDelegationFormData {
  delegateAddress: string;
  delegationPercentage?: number;
}

interface VoteDelegationPanelProps {
  creatorId: string;
  currentDelegate?: string;
  delegationBalance?: number;
  onDelegationComplete?: () => void;
}

export default function VoteDelegationPanel({
  currentDelegate,
  delegationBalance = 0,
  onDelegationComplete,
}: VoteDelegationPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDelegateForm, setShowDelegateForm] = useState(false);
  const { register, handleSubmit, reset, watch } = useForm<VoteDelegationFormData>({
    defaultValues: {
      delegateAddress: currentDelegate || '',
      delegationPercentage: 100,
    },
  });

  const delegationPercentage = watch('delegationPercentage');

  const handleDelegateVotes = async (data: VoteDelegationFormData) => {
    if (!data.delegateAddress) {
      showToast.error('Please enter a valid address');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Integrate with governance contract service
      // const result = await delegateVotes({
      //   creatorId,
      //   delegateAddress: data.delegateAddress,
      //   percentage: data.delegationPercentage || 100,
      // });

      showToast.success('Voting power delegated successfully');
      setShowDelegateForm(false);
      reset();
      onDelegationComplete?.();
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Failed to delegate voting power'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeDelegation = async () => {
    setIsLoading(true);
    try {
      // TODO: Integrate with governance contract service
      // const result = await revokeDelegation(creatorId);

      showToast.success('Delegation revoked successfully');
      onDelegationComplete?.();
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to revoke delegation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-primary/10">
      <CardHeader>
        <CardTitle>Vote Delegation</CardTitle>
        <CardDescription>Delegate your governance voting power</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {delegationBalance > 0 && (
          <Alert>
            <AlertDescription>
              Your delegable voting balance: <strong>{delegationBalance.toFixed(2)}</strong> votes
            </AlertDescription>
          </Alert>
        )}

        {currentDelegate && (
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-sm text-muted-foreground">Currently delegated to:</p>
            <p className="font-mono text-sm">{currentDelegate}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevokeDelegation}
              disabled={isLoading}
              className="mt-2"
            >
              {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : null}
              Revoke Delegation
            </Button>
          </div>
        )}

        {!showDelegateForm ? (
          <Button onClick={() => setShowDelegateForm(true)} variant="outline" className="w-full">
            {currentDelegate ? 'Change Delegate' : 'Delegate Voting Power'}
          </Button>
        ) : (
          <form onSubmit={handleSubmit(handleDelegateVotes)} className="space-y-4">
            <div>
              <Label htmlFor="delegateAddress">Delegate Address</Label>
              <Input
                id="delegateAddress"
                placeholder="0x..."
                {...register('delegateAddress', {
                  required: 'Address is required',
                })}
                className="mt-1 font-mono text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="delegationPercentage">Voting Power Percentage</Label>
                <span className="text-sm font-semibold">{delegationPercentage || 0}%</span>
              </div>
              <Input
                id="delegationPercentage"
                type="number"
                min="0"
                max="100"
                {...register('delegationPercentage')}
                className="mt-1"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : null}
                Confirm Delegation
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDelegateForm(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
