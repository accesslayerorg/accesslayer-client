# Forms

All forms use React Hook Form with a Zod schema. New forms must not hand-roll
validation state.

## Adding a form

1. Add a schema to `schemas/index.ts`, composing the shared validators
   (`stellarAddress`, `keyAmount`, `slippage`) so messages stay consistent.
2. In the component: `const form = useZodForm(mySchema())`.
3. Render each control inside `<FormField name label error>`; it wires the
   label, `aria-invalid` and `aria-describedby`, and announces errors.
4. On submit failure call `applyServerErrors(form, error)` so API validation
   errors appear on the matching fields (unknown fields go to `root.server`).
5. Add valid and invalid cases to `__tests__/schemas.test.ts`.
