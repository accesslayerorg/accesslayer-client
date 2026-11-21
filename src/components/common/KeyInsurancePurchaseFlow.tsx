import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader, Shield } from 'lucide-react';
import showToast from '@/utils/toast.util';

interface InsurancePlan {
  id: string;
  name: string;
  coverage: string;
  premium: number;
  description: string;
  benefits: string[];
}

interface InsurancePurchaseFormData {
  planId: string;
  agreeToTerms: boolean;
}

interface KeyInsurancePurchaseFlowProps {
  keyId: string;
  keyName: string;
  onPurchaseComplete?: () => void;
}

const INSURANCE_PLANS: InsurancePlan[] = [
  {
    id: 'basic',
    name: 'Basic Coverage',
    coverage: 'Up to 50% of key value',
    premium: 5,
    description: 'Essential protection for your key investments',
    benefits: ['Loss coverage up to 50%', '24/7 support', 'Quick claim processing'],
  },
  {
    id: 'standard',
    name: 'Standard Coverage',
    coverage: 'Up to 80% of key value',
    premium: 8,
    description: 'Comprehensive protection with enhanced benefits',
    benefits: [
      'Loss coverage up to 80%',
      'Priority claim processing',
      'Price volatility protection',
      'Dedicated support',
    ],
  },
  {
    id: 'premium',
    name: 'Premium Coverage',
    coverage: 'Up to 100% of key value',
    premium: 12,
    description: 'Maximum protection with all benefits included',
    benefits: [
      'Full loss coverage',
      'Instant claim processing',
      'Price floor guarantee',
      'Multi-asset protection',
      'VIP support',
    ],
  },
];

export default function KeyInsurancePurchaseFlow({
  keyName,
  onPurchaseComplete,
}: KeyInsurancePurchaseFlowProps) {
  const [step, setStep] = useState<'select' | 'review' | 'confirm'>('select');
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, watch } = useForm<InsurancePurchaseFormData>({
    defaultValues: {
      planId: 'standard',
      agreeToTerms: false,
    },
  });

  const selectedPlanId = watch('planId');
  const selectedPlan = INSURANCE_PLANS.find((p) => p.id === selectedPlanId);
  const agreeToTerms = watch('agreeToTerms');

  const handlePurchaseInsurance = async (data: InsurancePurchaseFormData) => {
    if (!data.agreeToTerms) {
      showToast.error('Please agree to terms and conditions');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Integrate with insurance service
      // const result = await purchaseKeyInsurance({
      //   keyId,
      //   planId: data.planId,
      // });

      showToast.success(`${selectedPlan?.name} purchased successfully`);
      onPurchaseComplete?.();
      setStep('confirm');
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Failed to purchase insurance'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'confirm' && selectedPlan) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Shield className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">{selectedPlan.name} Active</h3>
              <p className="text-sm text-green-800 mt-1">
                Your key "{keyName}" is now protected with {selectedPlan.name}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setStep('select')}
              >
                View All Plans
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Key Insurance Protection
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Protect your investment in "{keyName}" with comprehensive insurance coverage
        </p>
      </div>

      <form onSubmit={handleSubmit(handlePurchaseInsurance)} className="space-y-6">
        <div>
          <Label className="text-base font-semibold mb-4 block">Select Coverage Plan</Label>
          <RadioGroup value={selectedPlanId}>
            <div className="space-y-3">
              {INSURANCE_PLANS.map((plan) => (
                <label key={plan.id} className="cursor-pointer">
                  <div
                    className={`rounded-lg border-2 p-4 transition-all ${
                      selectedPlanId === plan.id
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem
                        value={plan.id}
                        id={plan.id}
                        {...register('planId')}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold">{plan.name}</span>
                          <span className="text-sm font-bold text-primary">${plan.premium}/mo</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                        <p className="text-xs font-medium text-green-600 mt-2">{plan.coverage}</p>
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {plan.benefits.map((benefit, idx) => (
                            <li key={idx}>✓ {benefit}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </RadioGroup>
        </div>

        {selectedPlan && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {selectedPlan.name} provides {selectedPlan.coverage} coverage for potential losses.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              {...register('agreeToTerms')}
              className="mt-1"
            />
            <Label htmlFor="terms" className="text-sm cursor-pointer">
              I understand and agree to the insurance terms and conditions
            </Label>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || !selectedPlan || !agreeToTerms}
          className="w-full"
        >
          {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Processing...' : `Purchase ${selectedPlan?.name}`}
        </Button>
      </form>
    </div>
  );
}
