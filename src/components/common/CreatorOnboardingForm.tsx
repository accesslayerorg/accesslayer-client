import React, { useState, useEffect } from 'react';
import { FormInput } from './FormInput';
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
	};

	return (
		<form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
			<FormInput
				label="Creator Name"
				value={formData.name}
				onChange={value => handleChange('name', value)}
				placeholder="Your creator name"
				required
				touched={touched.name}
			/>

			<FormInput
				label="Email"
				type="email"
				value={formData.email}
				onChange={value => handleChange('email', value)}
				placeholder="your@email.com"
				required
				touched={touched.email}
			/>

			<FormInput
				label="Bio"
				type="textarea"
				value={formData.bio}
				onChange={value => handleChange('bio', value)}
				placeholder="Tell us about yourself..."
				touched={touched.bio}
				rows={4}
			/>

			<FormInput
				label="Category"
				value={formData.category}
				onChange={value => handleChange('category', value)}
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
