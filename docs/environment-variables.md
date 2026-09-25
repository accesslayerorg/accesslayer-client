# Environment Variable Guide

This guide explains how to add a new client environment variable safely and consistently in Access Layer Client.

The client is built with Vite, so any value that must be available in browser code must use the `VITE_` prefix. Values without that prefix are not exposed to the client bundle.

## Files involved

| File                     | Purpose                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `.env.example`           | Documents every supported variable and provides safe local defaults or blank optional placeholders.              |
| `src/utils/env.utils.ts` | Validates environment variables at startup with Zod and exports the typed `env` object used by application code. |
| `.env`                   | Local developer overrides. This file should not be committed.                                                    |

## Add a new variable

1. Add the variable to `.env.example`.
2. Add validation for the variable in `src/utils/env.utils.ts`.
3. Pass the raw `import.meta.env` value into the `envSchema.parse(...)` call in `src/utils/env.utils.ts`.
4. Import the validated `env` object in application code.
5. Avoid reading `import.meta.env` directly from components, hooks, or service files.

## Declaration pattern

Add the new variable to `.env.example` near related settings. Use a short comment that explains what the value controls and whether it is required.

```env
# Feature flag for the creator discovery experiment. Use `true` to enable locally.
VITE_ENABLE_CREATOR_DISCOVERY=false
```

Prefer safe development defaults when the app can run without secrets. Leave optional third-party keys blank if a contributor can work without them.

## Runtime validation pattern

All supported variables should be declared in `src/utils/env.utils.ts` so missing or malformed configuration is caught in one place.

```ts
const envSchema = z.object({
	VITE_ENABLE_CREATOR_DISCOVERY: z.coerce.boolean().default(false),
});

export const env = envSchema.parse({
	VITE_ENABLE_CREATOR_DISCOVERY: import.meta.env.VITE_ENABLE_CREATOR_DISCOVERY,
});
```

Use the Zod type that matches how the app consumes the value:

| Value type      | Validation example                              |
| --------------- | ----------------------------------------------- |
| Required string | `z.string().min(1, "VITE_API_KEY is required")` |
| Optional string | `z.string().optional()`                         |
| Number          | `z.coerce.number().default(84532)`              |
| Boolean flag    | `z.coerce.boolean().default(false)`             |

If a value is required for the app to start, avoid a silent fallback. Use `.min(1, "... is required")` or another explicit validation rule so the startup error points to the missing variable.

## Access pattern in application code

Import `env` from the validation module and read the typed value from there:

```ts
import { env } from '@/utils/env.utils';

if (env.VITE_ENABLE_CREATOR_DISCOVERY) {
	// Render or enable the feature.
}
```

This keeps validation, defaults, and type coercion centralized.

## Anti-pattern: direct component access

Do not import or read `import.meta.env` directly in components, hooks, services, or utilities outside the validation module.

```tsx
// Avoid this.
const backendUrl = import.meta.env.VITE_BACKEND_URL;
```

Direct access bypasses schema validation, makes defaults inconsistent, and spreads environment knowledge across the app. Use `env` instead:

```tsx
import { env } from '@/utils/env.utils';

const backendUrl = env.VITE_BACKEND_URL;
```

## Required vs optional checklist

Use this checklist before opening a PR that adds a new variable:

- The variable is listed in `.env.example`.
- The variable has a clear comment describing its purpose.
- Required values fail fast in `src/utils/env.utils.ts` with a useful error.
- Optional values use `.optional()` or a safe `.default(...)`.
- Application code reads from `env`, not `import.meta.env`.
- The variable name starts with `VITE_` if browser code needs it.
