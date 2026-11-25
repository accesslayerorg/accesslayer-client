# Commit-reveal launch participation

The key detail page displays the commit-reveal panel when the key detail
response includes a valid launch schedule:

- `launchStartLedger`: first participating ledger
- `launchCommitEndLedger`: first ledger in the reveal phase
- `launchRevealEndLedger`: first ledger after the reveal phase
- `currentLedger`: latest network ledger
- `launchSettled`: optional explicit settlement flag
- `launchFillAmount`, `launchRefundAmount`, `launchClearingPrice`: optional
  wallet-scoped settlement results

The client estimates ledger progress at five seconds per ledger between key
detail refreshes. The commit window is `[launchStartLedger,
launchCommitEndLedger)` and the reveal window is
`[launchCommitEndLedger, launchRevealEndLedger)`.

The client generates a 32-byte cryptographically random salt and hashes the
UTF-8 JSON encoding of `[keyId, lowercasedWalletAddress, decimalAmount, salt]`
with Keccak-256. Commit submissions contain the key, wallet and commitment
hash only. Reveal submissions contain the order amount and salt. The complete
secret is saved in IndexedDB using the key and wallet as its storage identity;
users can export or restore the JSON backup from the reveal step.

The commit/reveal mutations follow the existing `submitCreatorContractCall`
contract-action convention. That helper currently simulates submission; a
production chain integration must wire `commit_launch_order` and
`reveal_launch_order` to the corresponding contract calls and return errors
when the transaction fails.
