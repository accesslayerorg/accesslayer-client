import { Switch } from '@/components/ui/switch';
import {
	useMotionOverrideStore,
	useReducedMotion,
} from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

export interface MotionSettingsSectionProps {
	className?: string;
}

/**
 * Reduced-motion setting. The toggle reflects the effective state (the OS
 * preference unless overridden) and persists the override so a choice made
 * here wins over the operating system setting.
 */
export default function MotionSettingsSection({
	className,
}: MotionSettingsSectionProps) {
	const reducedMotion = useReducedMotion();
	const setOverride = useMotionOverrideStore(state => state.setOverride);

	return (
		<section
			className={cn('rounded-xl border border-border p-4', className)}
			aria-labelledby="motion-settings-heading"
			data-testid="motion-settings"
		>
			<div className="flex items-center justify-between gap-4">
				<div>
					<h2
						id="motion-settings-heading"
						className="text-sm font-medium text-foreground"
					>
						Reduce motion
					</h2>
					<p className="mt-0.5 text-xs text-muted-foreground">
						Turn off chart animations, confetti and page transitions.
						Follows your system setting until you change it here.
					</p>
				</div>
				<Switch
					checked={reducedMotion}
					onCheckedChange={setOverride}
					aria-labelledby="motion-settings-heading"
					data-testid="reduce-motion-toggle"
				/>
			</div>
		</section>
	);
}
