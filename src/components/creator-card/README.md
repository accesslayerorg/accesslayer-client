# CreatorCard

## Keyboard Shortcuts

When a creator card has focus, the following keyboard shortcuts are available:

| Key | Action |
|-----|--------|
| `B` | Quick buy from this creator |
| `Enter` / `Space` | Activate focused element (standard behavior) |

## Accessibility

- Cards are focusable (`tabIndex={0}`) and announce themselves as "Creator card for [name]"
- The "B" shortcut is documented via screen-reader-only text
- Visual hint appears on hover/focus, hidden from screen readers (`aria-hidden`)
- Mobile UX unchanged: hint hidden on small screens via `md:` breakpoint