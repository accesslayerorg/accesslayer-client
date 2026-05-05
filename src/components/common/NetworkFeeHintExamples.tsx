// Test component to demonstrate NetworkFeeHint usage
// This file shows how the component can be used in different contexts

import NetworkFeeHint from './NetworkFeeHint';

export const NetworkFeeHintExamples = () => {
  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-white mb-2">Chip Variant (Default)</h3>
        <NetworkFeeHint fee="~0.0001 ETH" />
      </div>
      
      <div>
        <h3 className="text-white mb-2">Text Variant</h3>
        <NetworkFeeHint fee="~0.0002 ETH" variant="text" />
      </div>
      
      <div>
        <h3 className="text-white mb-2">Custom Fee Amount</h3>
        <NetworkFeeHint fee="~0.00005 ETH" />
      </div>
      
      <div>
        <h3 className="text-white mb-2">With Custom ClassName</h3>
        <NetworkFeeHint fee="~0.0001 ETH" className="border-red-500/20 bg-red-500/5" />
      </div>
    </div>
  );
};

export default NetworkFeeHintExamples;
