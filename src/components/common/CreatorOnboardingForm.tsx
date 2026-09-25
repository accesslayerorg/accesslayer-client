import React, { useState, useEffect } from 'react';
import { FormInput } from './FormInput';
import Stepper from './Stepper';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CreatorOnboardingFormData {
	name: string;
	email: string;
	bio: string;
	category: string;
}

export interface CreatorOnboardingFormProps {
	onSubmit?: (data: CreatorOnboardingFormData) => void;
	initialData?: Partial<CreatorOnboardingFormData>;
	className?: string;
}

const ONBOARDING_STEPS: Array<{
	field: keyof CreatorOnboardingFormData;
	label: string;
}> = [
	{ field: 'name', label: 'Creator name' },
	{ field: 'email', label: 'Email' },
	{ field: 'bio', label: 'Bio' },
	{ field: 'category', label: 'Category' },
];

const getStartingStep = (data: CreatorOnboardingFormData) => {
	const firstIncompleteIndex = ONBOARDING_STEPS.findIndex(
		step => !data[step.field].trim()
	);
	return firstIncompleteIndex === -1
		? ONBOARDING_STEPS.length
		: firstIncompleteIndex + 1;
};

export const CreatorOnboardingForm: React.FC<
	CreatorOnboardingFormProps
> = ({ onSubmit, initialData, className }) => {
	const [formData, setFormData] = useState<CreatorOnboardingFormData>({
		name: initialData?.name || '',
		email: initialData?.email || '',
		bio: initialData?.bio || '',
		category: initialData?.category || '',
	});

	const [isDirty, setIsDirty] = useState(false);
	const [touched, setTouched] = useState<Record<string, boolean>>({});
	const [currentStep, setCurrentStep] = useState(() => getStartingStep(formData));

	const initialDataRef = React.useRef(formData);

	useEffect(() => {
		initialDataRef.current = {
			name: initialData?.name || '',
			email: initialData?.email || '',
			bio: initialData?.bio || '',
			category: initialData?.category || '',
		};
		setFormData(initialDataRef.current);
		setIsDirty(false);
		setCurrentStep(getStartingStep(initialDataRef.current));
	}, [initialData]);

	useEffect(() => {
		const hasChanged = JSON.stringify(formData) !== JSON.stringify(initialDataRef.current);
		setIsDirty(hasChanged);
	}, [formData]);

	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (isDirty) {
				e.preventDefault();
				e.returnValue = '';
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	}, [isDirty]);

	const handleChange = (field: keyof CreatorOnboardingFormData, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
		setTouched(prev => ({ ...prev, [field]: true }));
		const stepIndex = ONBOARDING_STEPS.findIndex(step => step.field === field);
		if (stepIndex >= 0) {
			setCurrentStep(stepIndex + 1);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit?.(formData);
		setIsDirty(false);
		initialDataRef.current = { ...formData };
	};

	const handleReset = () => {
		if (isDirty && !confirm('Discard unsaved changes?')) {
			return;
		}
		setFormData(initialDataRef.current);
		setTouched({});
		setIsDirty(false);
		setCurrentStep(getStartingStep(initialDataRef.current));
	};

	return (
		<form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
			<Stepper
				currentStep={currentStep}
				totalSteps={ONBOARDING_STEPS.length}
				steps={ONBOARDING_STEPS.map(step => step.label)}
				clickableSteps={false}
				ariaLabel="Creator onboarding progress"
			/>

			<FormInput
				id="creator-onboarding-name"
				label="Creator Name"
				value={formData.name}
				onChange={value => handleChange('name', value)}
				onFocus={() => setCurrentStep(1)}
				placeholder="Your creator name"
				required
				touched={touched.name}
			/>

			<FormInput
				id="creator-onboarding-email"
				label="Email"
				type="email"
				value={formData.email}
				onChange={value => handleChange('email', value)}
				onFocus={() => setCurrentStep(2)}
				placeholder="your@email.com"
				required
				touched={touched.email}
			/>

			<FormInput
				id="creator-onboarding-bio"
				label="Bio"
				type="textarea"
				value={formData.bio}
				onChange={value => handleChange('bio', value)}
				onFocus={() => setCurrentStep(3)}
				placeholder="Tell us about yourself..."
				touched={touched.bio}
				rows={4}
				maxLength={200}
				showCharacterCount={true}
			/>

			<FormInput
				id="creator-onboarding-category"
				label="Category"
				value={formData.category}
				onChange={value => handleChange('category', value)}
				onFocus={() => setCurrentStep(4)}
				placeholder="e.g., Art, Music, Tech"
				touched={touched.category}
			/>

			<div className="flex gap-3 pt-4">
				<Button type="submit" className="flex-1">
					Save Profile
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={handleReset}
					disabled={!isDirty}
				>
					Discard
				</Button>
			</div>

			{isDirty && (
				<div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-100">
					You have unsaved changes. They will be lost if you leave this page.
				</div>
			)}
		</form>
	);
};

export default CreatorOnboardingForm;
