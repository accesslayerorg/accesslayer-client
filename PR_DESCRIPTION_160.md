## Summary
- #160: Add truncated tx hash copy action in timeline rows

## Changes
- Replaced the placeholder timeline empty-state panel with compact transaction timeline rows that include truncated transaction hash entries.
- Added a copy-to-clipboard action per row for tx hashes, with brief inline feedback for both success (`check`) and failure (`x`) outcomes.
- Kept the row layout compact and scannable by using a dense 4-column row structure (action, amount, hash+copy action, status/time).

## Testing
- [ ] Open the landing page and confirm timeline rows render under "Transaction timeline pattern" with truncated hash values.
- [ ] Click the copy icon for each row and verify success feedback appears briefly, then resets.
- [ ] Simulate clipboard denial/unavailable state and verify failure feedback appears briefly, then resets.
- [ ] Confirm row layout remains compact on small and medium breakpoints.

## Closing
Closes accesslayerorg/accesslayer-client#160
