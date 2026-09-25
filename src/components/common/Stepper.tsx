import React from 'react';
import { cn } from '@/lib/utils';

interface StepperProps {
	currentStep: number;
	totalSteps: number;
	steps?: string[];
	onStepClick?: (step: number) => void;
	disabledSteps?: number[];
	className?: string;
	size?: 'sm' | 'md' | 'lg';
	variant?: 'default' | 'rounded' | 'pills';
	clickableSteps?: boolean;
	ariaLabel?: string;
}

const Stepper: React.FC<StepperProps> = ({
	currentStep,
	totalSteps,
	steps,
	onStepClick,
	disabledSteps = [],
	className = '',
	size = 'md',
	variant = 'pills',
	clickableSteps = true,
	ariaLabel = 'Step progress',
}) => {
	const sizeClasses = {
		sm: 'h-1',
		md: 'h-2',
		lg: 'h-3',
	};

	const widthClasses = {
		sm: 'w-8',
		md: 'w-12',
		lg: 'w-16',
	};

	const gapClasses = {
		sm: 'gap-1',
		md: 'gap-2',
		lg: 'gap-3',
	};

	const radiusClasses = {
		default: '',
		rounded: 'rounded',
		pills: 'rounded-full',
	};

	const handleStepClick = (stepNumber: number) => {
		if (
			clickableSteps &&
			onStepClick &&
			!disabledSteps.includes(stepNumber)
		) {
			onStepClick(stepNumber);
		}
	};

	const safeCurrentStep = Math.min(Math.max(currentStep, 1), totalSteps);

	return (
		<nav
			className={cn('flex flex-col gap-2', className)}
			aria-label={`${ariaLabel}: step ${safeCurrentStep} of ${totalSteps}`}
		>
			<div className="sr-only" aria-live="polite" aria-atomic="true">
				Step {safeCurrentStep} of {totalSteps}
			</div>
			<ol className={cn('flex items-center', gapClasses[size])}>
				{Array.from({ length: totalSteps }, (_, index) => {
					const stepNumber = index + 1;
					const isCompleted = stepNumber < safeCurrentStep;
					const isCurrent = stepNumber === safeCurrentStep;
					const isDisabled = disabledSteps.includes(stepNumber);
					const isClickable = clickableSteps && onStepClick && !isDisabled;
					const label = steps?.[index] ?? `Step ${stepNumber}`;
					const status = isCompleted
						? 'completed'
						: isCurrent
							? 'current'
							: 'upcoming';
					const stepClassName = cn(
						'block transition-all duration-300',
						sizeClasses[size],
						steps ? 'w-full' : widthClasses[size],
						radiusClasses[variant],
						isCompleted && 'bg-blue-600',
						isCurrent && 'bg-blue-600 ring-2 ring-blue-200 ring-offset-2',
						status === 'upcoming' && 'bg-gray-300',
						isClickable && [
							'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
							status === 'upcoming' && 'hover:bg-gray-400',
						],
						isDisabled && 'cursor-not-allowed opacity-50'
					);
					const stepAriaLabel = `${label}, step ${stepNumber} of ${totalSteps}, ${status}${
						isClickable ? ', click to navigate' : ''
					}`;

					return (
						<li
							key={stepNumber}
							className="flex-1"
							aria-current={!isClickable && isCurrent ? 'step' : undefined}
							aria-label={!isClickable ? stepAriaLabel : undefined}
						>
							{isClickable ? (
								<button
									type="button"
									onClick={() => handleStepClick(stepNumber)}
									className={stepClassName}
									aria-current={isCurrent ? 'step' : undefined}
									aria-label={stepAriaLabel}
									title={`Go to step ${stepNumber}`}
								/>
							) : (
								<div
									className={stepClassName}
									aria-hidden="true"
								/>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
};

export default Stepper;
