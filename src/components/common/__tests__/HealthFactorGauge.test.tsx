import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HealthFactorGauge from '../HealthFactorGauge';

describe('HealthFactorGauge', () => {
  it.each([[1.5, 'Safe'], [1.2, 'Caution'], [0.8, 'Danger']] as const)(
    'shows the %s band',
    (healthFactor, band) => {
      render(<HealthFactorGauge healthFactor={healthFactor} liquidationPrice={2.4} />);
      expect(screen.getByTestId('health-factor')).toHaveTextContent(healthFactor.toFixed(2));
      expect(screen.getByTestId('health-band')).toHaveTextContent(band);
      expect(screen.getByText(/Liquidation price/)).toHaveTextContent('2.4000 XLM');
    }
  );
});
