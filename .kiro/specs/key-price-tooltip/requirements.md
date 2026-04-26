# Requirements Document

## Introduction

This feature enhances the `KeySupplyBadge` component by wrapping it in a rich tooltip that surfaces additional context about the key price — such as the last-updated timestamp and the quote source. The tooltip must be accessible (hover, keyboard focus, and mobile tap), handle missing/partial data gracefully, and remain visually unobtrusive within the existing UI.

## Glossary

- **Tooltip**: A transient overlay that appears on hover, keyboard focus, or mobile tap to display supplementary information without cluttering the primary UI.
- **KeySupplyBadge**: The existing badge component (`src/components/common/KeySupplyBadge.tsx`) that displays the current key supply count.
- **TooltipContent**: The structured data object passed to the tooltip, containing optional fields such as `lastUpdated` and `quoteSource`.
- **Tooltip_Component**: The existing CSS-based tooltip primitive (`src/components/ui/tooltip.tsx`) used as the rendering foundation.
- **Last_Updated**: An optional ISO 8601 timestamp indicating when the key price data was last refreshed.
- **Quote_Source**: An optional string identifying the data provider or exchange from which the key price was sourced.

## Requirements

### Requirement 1: Tooltip Trigger Interactions

**User Story:** As a user, I want the key price tooltip to appear when I hover over, focus on, or tap the badge, so that I can access additional context without it being permanently visible.

#### Acceptance Criteria

1. WHEN a pointer device hovers over the `KeySupplyBadge`, THE `Tooltip_Component` SHALL display the tooltip overlay.
2. WHEN keyboard focus moves to the `KeySupplyBadge` wrapper, THE `Tooltip_Component` SHALL display the tooltip overlay.
3. WHEN a touch user taps the `KeySupplyBadge` on a mobile device, THE `Tooltip_Component` SHALL toggle the tooltip overlay.
4. WHEN the pointer leaves the `KeySupplyBadge` or focus moves away, THE `Tooltip_Component` SHALL hide the tooltip overlay.

---

### Requirement 2: Tooltip Content — Last Updated

**User Story:** As a user, I want to see when the key price was last updated, so that I can judge the freshness of the data.

#### Acceptance Criteria

1. WHEN `TooltipContent.lastUpdated` is a valid ISO 8601 timestamp, THE `Tooltip_Component` SHALL display a human-readable relative time string (e.g. "Updated 3 min ago").
2. IF `TooltipContent.lastUpdated` is absent or null, THEN THE `Tooltip_Component` SHALL display the text "Last updated: N/A" in place of the relative time string.

---

### Requirement 3: Tooltip Content — Quote Source

**User Story:** As a user, I want to see the source of the key price quote, so that I can evaluate the reliability of the data.

#### Acceptance Criteria

1. WHEN `TooltipContent.quoteSource` is a non-empty string, THE `Tooltip_Component` SHALL display the source label prefixed with "Source:" (e.g. "Source: CoinGecko").
2. IF `TooltipContent.quoteSource` is absent, null, or an empty string, THEN THE `Tooltip_Component` SHALL display the text "Source: N/A" in place of the source label.

---

### Requirement 4: Graceful Handling of Fully Missing Data

**User Story:** As a user, I want the tooltip to remain functional even when no metadata is available, so that the badge never appears broken.

#### Acceptance Criteria

1. WHEN all fields in `TooltipContent` are absent or null, THE `Tooltip_Component` SHALL render the tooltip with all fields showing their "N/A" fallback values.
2. THE `KeySupplyBadge` SHALL remain fully functional and visually unchanged when no `TooltipContent` is provided.

---

### Requirement 5: Accessibility

**User Story:** As a user relying on assistive technology, I want the tooltip to be accessible, so that I can consume its content with a screen reader.

#### Acceptance Criteria

1. THE `Tooltip_Component` SHALL render the tooltip overlay with `role="tooltip"`.
2. THE `KeySupplyBadge` wrapper element SHALL include an `aria-describedby` attribute referencing the tooltip element's `id` when the tooltip is visible.
3. WHEN the tooltip is hidden, THE `Tooltip_Component` SHALL ensure the tooltip overlay is not announced by screen readers.

---

### Requirement 6: Visual Design — Unobtrusive Appearance

**User Story:** As a user, I want the tooltip to be visually subtle and consistent with the existing UI, so that it does not distract from the primary content.

#### Acceptance Criteria

1. THE `Tooltip_Component` SHALL render the tooltip overlay using the existing dark background, rounded corners, and shadow styles already defined in `src/components/ui/tooltip.tsx`.
2. THE `Tooltip_Component` SHALL support multi-line content within the tooltip overlay without truncating or overflowing the viewport.
3. THE `KeySupplyBadge` SHALL NOT change its own visual appearance (size, color, or layout) as a result of this feature.

---

### Requirement 7: Tooltip Component API Extension

**User Story:** As a developer, I want the Tooltip component to accept structured React node content, so that I can render rich multi-line tooltips beyond a single string.

#### Acceptance Criteria

1. THE `Tooltip_Component` SHALL accept a `content` prop typed as `React.ReactNode` in addition to the existing `string` type, remaining backward-compatible with all current usages.
2. WHEN `content` is a `React.ReactNode`, THE `Tooltip_Component` SHALL render it inside the tooltip overlay without modification.
