import { cn } from '@/lib/utils';

interface SectionHeadingProps {
    title: string;
    supportingText?: string;
    eyebrow?: string;
    className?: string;
    titleClassName?: string;
    supportingTextClassName?: string;
    as?: 'h1' | 'h2' | 'h3' | 'p';
}

const SectionHeading: React.FC<SectionHeadingProps> = ({
    title,
    supportingText,
    eyebrow,
    className,
    titleClassName,
    supportingTextClassName,
    as: HeadingTag = 'h2',
}) => {
    return (
        <div className={cn('min-w-0', className)}>
            {eyebrow ? (
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-amber-300/85">
                    {eyebrow}
                </p>
            ) : null}
            <HeadingTag
                className={cn(
                    'mt-2 font-grotesque text-xl font-bold tracking-tight text-white md:text-2xl',
                    titleClassName
                )}
            >
                {title}
            </HeadingTag>
            {supportingText ? (
                <p
                    className={cn(
                        'mt-2 text-sm text-white/62 md:text-base',
                        supportingTextClassName
                    )}
                >
                    {supportingText}
                </p>
            ) : null}
        </div>
    );
};

export default SectionHeading;
