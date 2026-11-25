import { useState, type FormEvent } from 'react';
import {
  calculateArbiterFeeStroops,
  isValidWalletAddress,
  OtcContractService,
  type IOtcContractService,
} from '@/services/otcContract.service';
import type { OtcTrade } from '@/types/otc';

const defaultOtcService = new OtcContractService(undefined, undefined);

interface NewOtcTradeWizardProps {
  currentAddress: string;
  contractService?: IOtcContractService;
  onTradeCreated?: (trade: OtcTrade) => void;
}

export function NewOtcTradeWizard({
  currentAddress,
  contractService = defaultOtcService,
  onTradeCreated,
}: NewOtcTradeWizardProps) {
  const [step, setStep] = useState<'details' | 'confirm'>('details');
  const [counterparty, setCounterparty] = useState('');
  const [keyId, setKeyId] = useState('');
  const [quantityInput, setQuantityInput] = useState('1');
  const [priceStroopsInput, setPriceStroopsInput] = useState('1000000');
  const [arbiter, setArbiter] = useState('');
  const [expiresInMinutes, setExpiresInMinutes] = useState('60');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedQuantity = /^\d+$/.test(quantityInput.trim())
    ? BigInt(quantityInput.trim())
    : 0n;
  const parsedPriceStroops = /^\d+$/.test(priceStroopsInput.trim())
    ? BigInt(priceStroopsInput.trim())
    : 0n;
  const totalStroops = parsedQuantity * parsedPriceStroops;
  const arbiterFeeStroops = calculateArbiterFeeStroops(totalStroops);

  const handleReviewStep = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!isValidWalletAddress(counterparty)) {
      setValidationError('Enter a valid counterparty address.');
      return;
    }
    if (counterparty.trim().toLowerCase() === currentAddress.toLowerCase()) {
      setValidationError('Counterparty must be a different address.');
      return;
    }
    if (!keyId.trim()) {
      setValidationError('Key identifier is required.');
      return;
    }
    if (parsedQuantity <= 0n) {
      setValidationError('Quantity must be greater than 0.');
      return;
    }
    if (parsedPriceStroops <= 0n) {
      setValidationError('Price in stroops must be greater than 0.');
      return;
    }
    if (!isValidWalletAddress(arbiter)) {
      setValidationError('Enter a valid arbiter address.');
      return;
    }

    setStep('confirm');
  };

  const handleConfirmCreate = async () => {
    setIsSubmitting(true);
    setValidationError(null);
    try {
      const minutesNum = Math.max(1, Number(expiresInMinutes) || 60);
      const expiresAt = Math.floor(Date.now() / 1000) + minutesNum * 60;
      const trade = await contractService.openTrade(currentAddress, {
        counterparty: counterparty.trim(),
        keyId: keyId.trim(),
        quantity: parsedQuantity,
        priceStroops: parsedPriceStroops,
        arbiter: arbiter.trim(),
        expiresAt,
      });
      onTradeCreated?.(trade);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to create trade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'confirm') {
    return (
      <section aria-label="Confirm OTC Trade">
        <h2>Review & Confirm OTC Escrow</h2>
        <dl>
          <div>
            <dt>Counterparty</dt>
            <dd>{counterparty.trim()}</dd>
          </div>
          <div>
            <dt>Key</dt>
            <dd>{keyId.trim()}</dd>
          </div>
          <div>
            <dt>Quantity</dt>
            <dd>{parsedQuantity.toString()}</dd>
          </div>
          <div>
            <dt>Price (stroops)</dt>
            <dd>{parsedPriceStroops.toString()} stroops</dd>
          </div>
          <div>
            <dt>Total Value (stroops)</dt>
            <dd>{totalStroops.toString()} stroops</dd>
          </div>
          <div>
            <dt>Arbiter Fee</dt>
            <dd data-testid="arbiter-fee-preview">{arbiterFeeStroops.toString()} stroops</dd>
          </div>
          <div>
            <dt>Arbiter</dt>
            <dd>{arbiter.trim()}</dd>
          </div>
          <div>
            <dt>Expiry Window</dt>
            <dd>{expiresInMinutes} minutes</dd>
          </div>
        </dl>

        {validationError && <p role="alert">{validationError}</p>}

        <div>
          <button type="button" onClick={() => setStep('details')} disabled={isSubmitting}>
            Back
          </button>
          <button type="button" onClick={handleConfirmCreate} disabled={isSubmitting}>
            {isSubmitting ? 'Opening Escrow...' : 'Confirm & Open Trade'}
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleReviewStep} aria-label="New OTC Trade Wizard">
      <h2>New OTC Trade</h2>

      <label htmlFor="otc-counterparty">Counterparty Address</label>
      <input
        id="otc-counterparty"
        name="counterparty"
        value={counterparty}
        onChange={e => setCounterparty(e.target.value)}
      />

      <label htmlFor="otc-key">Key</label>
      <input
        id="otc-key"
        name="keyId"
        value={keyId}
        onChange={e => setKeyId(e.target.value)}
      />

      <label htmlFor="otc-quantity">Quantity</label>
      <input
        id="otc-quantity"
        name="quantity"
        type="text"
        inputMode="numeric"
        value={quantityInput}
        onChange={e => setQuantityInput(e.target.value)}
      />

      <label htmlFor="otc-price-stroops">Price (stroops)</label>
      <input
        id="otc-price-stroops"
        name="priceStroops"
        type="text"
        inputMode="numeric"
        value={priceStroopsInput}
        onChange={e => setPriceStroopsInput(e.target.value)}
      />

      <label htmlFor="otc-arbiter">Arbiter Address</label>
      <input
        id="otc-arbiter"
        name="arbiter"
        value={arbiter}
        onChange={e => setArbiter(e.target.value)}
      />

      <label htmlFor="otc-expiry">Expiry (minutes from now)</label>
      <input
        id="otc-expiry"
        name="expiresInMinutes"
        type="number"
        min={1}
        value={expiresInMinutes}
        onChange={e => setExpiresInMinutes(e.target.value)}
      />

      <div>
        <span>Estimated Arbiter Fee: </span>
        <strong data-testid="wizard-arbiter-fee">
          {arbiterFeeStroops.toString()} stroops
        </strong>
      </div>

      {validationError && <p role="alert">{validationError}</p>}

      <button type="submit">Review Trade</button>
    </form>
  );
}
