# Website improvements

Backlog of potential improvements from a review of the site (August 2026).
Check items off as they land.

## Quick wins (bugs / waste)

- [ ] Add `<!DOCTYPE html>` to `index.html` — without it the page renders in quirks mode. (`impossible-fractal-ca.html` already has it.)
- [ ] Shrink `N.png` — it is 367 KB at 1004×998 px but displayed at 133 px wide. Resize to ~266 px (2× for retina) and compress, or serve WebP.
- [ ] Remove or use `nselmi_photo.png` (178 KB, referenced nowhere on the site).
- [ ] Drop the `bootstrap.bundle.min.js` script tag from `index.html` — no interactive Bootstrap components are used (the dark toggle is custom JS).

## SEO / sharing

- [ ] Add meta description, Open Graph tags, canonical URL, and a favicon to `index.html` (mirror the pattern already used on `impossible-fractal-ca.html`; `N.png` works as `og:image`).
- [ ] Add `Person` JSON-LD structured data (name + `sameAs` links to LinkedIn, GitHub, X, ORCID).

## Dark mode

- [ ] Fix flash of light theme for returning dark-mode visitors: move the `localStorage` check into a small inline script in `<head>` so the class is applied before first paint.
- [ ] Respect `prefers-color-scheme` for first-time visitors with no saved choice.
- [ ] Replace the 𓂀 / 𓁹 toggle glyphs (Egyptian hieroglyphs are missing from default fonts on many systems and render as □) with an SVG or emoji icon — or keep them but add a font fallback.

## Accessibility

- [ ] Add `aria-label`s to the four icon-only social links and the dark-mode toggle button.
- [ ] Darken the muted text color slightly — `#6c757d` at 13 px is near the WCAG AA contrast limit on `#EFEFEF`.

## Content

- [ ] Replace the "Personal Website" subtitle with a one-line bio (who you are, what you work on).
- [ ] Add a short Projects / Writing section — even 2–3 links (the fractal CA explorer is a strong start).
- [ ] Fill in the placeholder sections in `llms.txt` (bio, work, interests).

## Cleanup

- [ ] Delete the empty `<p class="card-text"></p>` and stray `&nbsp;` in `index.html`.
- [ ] Flatten the card-within-a-card markup around the social icons.
