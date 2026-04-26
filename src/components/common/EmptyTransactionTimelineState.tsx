import { Button } from '@/components/ui/button';
import { Clock3 } from 'lucide-react';

const EmptyTransactionTimelineState: React.FC = () => {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-amber-300">
          <Clock3 className="size-5" />
        </div>
        <h3 className="font-grotesque text-2xl font-bold text-white">
          No transactions yet
        </h3>
        <p className="mt-2 text-sm text-white/65">
          New users will see transaction milestones here after submitting their first buy or sell action.
        </p>
        <div className="mt-5 flex justify-center">
          <Button className="rounded-xl">Buy your first key</Button>
        </div>
      </div>
    </section>
  );
};

export default EmptyTransactionTimelineState;
