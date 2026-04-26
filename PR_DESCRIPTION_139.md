## Summary

- #139: Add high-contrast token overrides for key screens

## Changes

- Added scoped marketplace semantic tokens in `src/index.css` for card surfaces and label contrast.
- Added high-contrast overrides inside `@media (prefers-contrast: more)` so stronger contrast is applied only when users request it.
- Updated key landing screen UI to consume these tokens (`LandingPage` profile panel, filter label, pagination label, and `CreatorCard` surface/labels) instead of hardcoded low-contrast alpha colors.
- Kept the default theme visuals unchanged by preserving existing default token values and only swapping token usage where readability matters most.

## Testing

- [x] `pnpm lint`
- [x] `pnpm build`
- [x] Manual: load `/` with normal contrast and verify marketplace card/background/labels still match existing visual baseline.
- [x] Manual: enable OS/browser high-contrast preference (`prefers-contrast: more`) and verify improved readability for creator cards, filter sort label, profile panel labels, and pagination label text.
- [x] Manual edge case: verify hover/focus states remain visible on creator cards and action buttons in both default and high-contrast modes.

## Closing

Closes accesslayerorg/accesslayer-client#139
