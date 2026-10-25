# Family Christmas Wishlist 🎄

A simple static site where each family member ticks off what they want or need for Christmas, then gets a shareable wishlist image.

**Flow:** checklist → name/nickname → "Are you sure?" review → download or share the image.

- Each item can be tagged **Want**, **Need**, or **Both**, with an optional note (size, color, brand) and ₱ price
- Up to **12 gifts** plus **5 favorites** (☆). At 12, the other gifts lock and Santa complains if you try for more
- Add your own items under "Something else?"
- Every visit starts a fresh list (good for shared phones); refreshing the same tab keeps your progress
- Prices are capped at ₱10,000, duplicate gifts are blocked, and a simple word filter keeps it family-friendly
- Christmas countdown and automatic dark mode
- Inside Messenger, tapping Download also shows how to save by pressing and holding the image
- The image is a 1080×1620 (4:6) PNG: favorites in a green box, everything else grouped by Want/Need and category, and your own items in a separate box. Text resizes so every item fits. On phones, **Share** opens the share sheet so you can pick Messenger. On desktop, download it and send it in Messenger.

The Inter font is bundled in `fonts/` (SIL Open Font License), so nothing loads from outside the site.

## Editing the preset items

All categories and items are in [`items.js`](items.js). Add, rename, or remove entries there. Each item needs a unique `id`.

## Running locally

No build step. Serve the folder with any static server:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Hosting on GitHub Pages

Repo **Settings → Pages → Build and deployment → Deploy from a branch**, then pick the branch (e.g. `main`) and `/ (root)`.
