# Shared Component Library

This guide documents the shared UI components available in the Access Layer client. It provides guidance on when to use each component, how to extend them, and the conventions for adding new shared components to the repository.

Refer to the [Adding a New Page Route Guide](file:///Users/marvellous/Desktop/accesslayer-client/docs/adding-page-routes.md) when you are ready to wire these components into a new route or screen.

---

## Shared Components List

### 1. Button (`Button` & `AsyncButton`)

- **Purpose**: Render consistent visual states for standard CTA actions and async operations.
- **File location**: `src/components/ui/button.tsx` & `src/components/ui/async-button.tsx`
- **Key Props**:
   - `variant`: `'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'`
   - `size`: `'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'`
   - `asChild`: `boolean` (when true, delegates rendering to its child using Radix `@radix-ui/react-slot`)
   - `isLoading` (on `AsyncButton`): `boolean` (renders a loading spinner and disables the button during async flows)
- **When to use**: Use `Button` for all static actions, standard routing links, and interactive buttons. Use `AsyncButton` whenever the action triggers a promise or network request (e.g. submitting a form or executing a transaction) to prevent duplicate submissions.
- **When to build a new one**: Avoid building custom buttons. If you need a completely unique button layout (e.g. with complex custom graphic animations), create a local component inside your feature folder instead of overriding the shared button.

### 2. Inputs (`FormInput`)

- **Purpose**: Render styled text inputs with validation states, labels, and error messages.
- **File location**: `src/components/common/FormInput.tsx`
- **Key Props**:
   - `label`: `string`
   - `error`: `string` (displays validation errors below the input)
   - `required`: `boolean`
   - `leftIcon` / `rightIcon`: `React.ReactNode`
- **When to use**: Use `FormInput` for user inputs, forms, price filter fields, and onboarding details.
- **When to build a new one**: If you need specialized inputs like dates or select dropdowns, use the existing `FormDate` or `FormSelector` sibling components rather than expanding `FormInput` excessively.

### 3. Card (`CreatorCard`)

- **Purpose**: Displays a summary of a creator's portfolio, verification badge, daily price change, and on-chain supply.
- **File location**: `src/components/common/CreatorCard.tsx`
- **Key Props**:
   - `creator`: `Course` (object containing creator details)
   - `isPinned`: `boolean`
   - `onTrade`: `() => void`
- **When to use**: Use `CreatorCard` when displaying creators in grid or list views, such as on the Marketplace discover page.
- **When to build a new one**: If a feature requires displaying non-creator summary information (like transaction details or logs), design a new semantic list row/card rather than modifying `CreatorCard`.

### 4. Toast Notifications (`showToast`)

- **Purpose**: Surface success, error, loading, and transaction status feedback to the user.
- **File location**: `src/utils/toast.util.tsx`
- **Usage**:
   - `showToast.success(message, options)`
   - `showToast.error(message, options)`
   - `showToast.loading(message, options)`
   - `showToast.transactionSuccess(title, description)`
- **When to use**: Trigger toast notifications on any key lifecycle milestone, such as trade completion, address copying, or request failure.
- **When to build a new one**: Never build custom toast wrappers. Standardize on the `showToast` API which is pre-configured with the app's brand colors and accessibility attributes.

### 5. Skeletons (`Skeleton`, `CreatorCardSkeleton`, `CreatorSkeleton`)

- **Purpose**: Render placeholders during data loading phases to reduce layout shifts.
- **File location**: `src/components/ui/skeleton.tsx` & `src/components/common/CreatorCardSkeleton.tsx`
- **Key Props**:
   - `className`: `string` (for sizing and styling)
- **When to use**: Use `Skeleton` to construct localized skeleton layouts, or use the prepackaged `CreatorCardSkeleton` when loading list grids.
- **When to build a new one**: When building a completely new page layout, construct a dedicated page skeleton from the primitive `Skeleton` blocks.

---

## Tailwind Class Conventions

Our shared UI components follow standard class naming conventions for consistency:

1. **Utility Merging**: Shared components use the `cn` utility (`src/lib/utils.ts`) to merge standard tailwind classes with custom classes provided via `className`.
   ```tsx
   import { cn } from '@/lib/utils';
   // Always wrap variant/base styles in cn to allow overriding
   return <div className={cn('base-classes', className)} {...props} />;
   ```
2. **Harmonious Palette**: Use Tailwind classes that match our dark/gold palette:
   - Primary buttons/highlights: `bg-primary`, `text-primary-foreground`
   - Border accents: `border-white/15`, `border-amber-500/30`
   - Muted typography: `text-white/60`, `text-white/40`
3. **Responsive Spacing**: Wrap multi-device layouts in standard margins/paddings (`px-6 md:px-12`).

---

## Process for Adding New Shared Components

Follow these conventions when contributing a new shared component:

### 1. Naming & File Location Conventions

- Place generic primitive UI elements under `src/components/ui/` (e.g. inputs, drawers, tooltips).
- Place feature-rich common components under `src/components/common/` (e.g. search bars, fee badges, creator avatars).
- Component files must use PascalCase naming matching the exported component, for example `src/components/ui/Switch.tsx`.
- Use a single default export or clean named exports where appropriate.

### 2. Naming Tests

- Every new shared component must have a corresponding unit or integration test file under `src/components/ui/__tests__/` or `src/components/common/__tests__/`.
- Name the test file using the component name followed by `.test.tsx`, e.g., `src/components/ui/__tests__/Switch.test.tsx`.
