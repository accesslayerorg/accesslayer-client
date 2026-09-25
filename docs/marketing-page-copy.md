# Editing Marketing Page Copy

This guide is for non-technical contributors who want to suggest changes to the
marketing page copy. You can edit the text directly on GitHub and open a pull
request — no local development environment is required.

## Where the copy lives

All marketing page copy is in a single file:

**`src/pages/MarketingPage.tsx`**

The page is a single React component. Each visible section is a block of JSX
with inline text. Use the table below to find the section you want to change.

| Visible section on the page     | Location in `MarketingPage.tsx`           | What to look for                                                               |
| ------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| Page title ("Access Layer")     | Hero / Title                              | `<h1>` with the `Access Layer` heading                                         |
| Intro paragraph under the title | Intro                                     | First `<p>` after the title                                                    |
| **The idea**                    | `{/* The idea */}` section                | Eyebrow text `The idea` and the two body paragraphs below it                   |
| **How it works**                | `{/* How it works */}` section            | Eyebrow text `How it works` and the two body paragraphs below it               |
| **What makes it different**     | `{/* What makes it different */}` section | Eyebrow text `What makes it different` and the body paragraph below it         |
| **Built on Stellar**            | `{/* Built on Stellar */}` section        | Eyebrow text `Built on Stellar` and the two body paragraphs below it           |
| **Join the community**          | `{/* Community */}` section               | Eyebrow text `Join the community`, the subtitle, and the GitHub/Telegram links |
| Footer                          | `{/* Footer */}` section                  | Logo label and the "Built on Stellar" tagline                                  |

Section eyebrows use this pattern — a short uppercase label in blue:

```tsx
<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-blue-400">
	The idea
</p>
```

Body copy sits in `<p>` tags directly below each eyebrow. Edit the text inside
the quotes; leave the surrounding JSX and class names unchanged unless you know
what you are doing.

## Edit copy on GitHub (no local setup)

You do not need to install Node.js, pnpm, or run the app locally to submit a
copy change. GitHub's web editor lets you edit the file in your browser.

### Step 1 — Open the file on GitHub

1. Go to the repository on GitHub.
2. Navigate to **`src/pages/MarketingPage.tsx`** using the file browser.
3. Click the **pencil icon** (Edit this file) in the top-right corner of the
   file view.

### Step 2 — Make your copy changes

1. Find the section you want to update using the table above.
2. Edit only the visible text inside the JSX (the strings between tags).
3. Do not change file structure, imports, or class names unless instructed.
4. Scroll down and choose **"Create a new branch for this commit"**.
5. Give the branch a short descriptive name (for example
   `update-marketing-intro-copy`).
6. Click **"Commit changes"**.

### Step 3 — Open a pull request targeting `dev`

1. After committing, GitHub shows a banner to **"Compare & pull request"**.
   Click it (or go to the **Pull requests** tab and click **New pull request**).
2. Set the **base branch** to **`dev`** (not `main`).
3. Set the **compare branch** to the branch you just created.
4. Write a clear title and description explaining what copy you changed and why.
5. Click **Create pull request**.

A maintainer will review your change and merge it when it looks good.

## Verifying your change

Copy-only edits do not require running the app locally. Review your diff on the
pull request page to confirm the text reads correctly. Maintainers may preview
the page in a staging environment before merging.

If you do have a local setup and want to preview, run `pnpm dev` and open the
marketing page route once it is registered in the app router. This step is
optional for copy contributors.

## Tips

- Keep sentences concise and product-specific.
- Preserve existing punctuation and paragraph breaks unless you are intentionally
  restructuring the copy.
- Link URLs (GitHub, Telegram) are in `<a href="...">` tags in the Community
  section — update the link text, not the URL, unless you are changing the
  destination.
- If you are unsure which section a sentence belongs to, open an issue and ask
  before editing.
