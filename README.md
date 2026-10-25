# Family Christmas Wishlist 🎄

A simple static site where each family member ticks off what they want or need for Christmas, then gets a shareable wishlist image.

**Flow:** checklist → name/nickname → "Are you sure?" review → download or share the image.

- Each item can be tagged **Want** or **Need**, with an optional note (size, color, brand) and ₱ price
- Up to **12 gifts** plus **5 favorites** (☆). At 12, the other gifts lock and Santa complains if you try for more
- Add your own items under "Something else?"
- Progress is saved in the browser, so refreshing won't lose anything
- Christmas countdown and automatic dark mode
- The image is a 1080×1620 (4:6) PNG: favorites in a green box, everything else grouped by Want/Need and category, and your own items in a separate box. Text resizes so every item fits. On phones, **Share** opens the share sheet so you can pick Messenger. On desktop, download it and send it in Messenger.

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
