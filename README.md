# Access Layer Client

This repository contains the frontend for Access Layer, a Stellar-native creator keys marketplace where fans buy access keys tied to creators and unlock perks defined by those creators.

## Purpose

The client is responsible for:

- creator and fan onboarding
- wallet connection and transaction prompts
- marketplace browsing and creator profiles
- buying and selling creator keys
- gated access to creator perks and content

## Tech

- Vite
- React
- TypeScript
- Tailwind CSS

## Current state

- the root app renders a branded landing page
- frontend infrastructure is in place for future marketplace routes
- older template-era code still needs to be replaced with Stellar-specific flows

## Keyboard shortcuts

- `Ctrl/Cmd + Alt + R` refreshes creator list data from the marketplace
  page. The shortcut is ignored while focus is inside text inputs,
  textareas, selects, or editable text regions.

## Local setup

```bash
pnpm install
pnpm dev
```

## Verification

```bash
pnpm lint
pnpm build
```

## Open source workflow

- Read [CONTRIBUTING.md](./CONTRIBUTING.md) before starting work.
- Browse the maintainer issue inventory in [docs/open-source/issue-backlog.md](./docs/open-source/issue-backlog.md).
- Use the issue templates in [`.github/ISSUE_TEMPLATE`](./.github/ISSUE_TEMPLATE).
- Review [SECURITY.md](./SECURITY.md) before reporting vulnerabilities.
