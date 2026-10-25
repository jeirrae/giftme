# Family Christmas Wishlist 🎄

A simple static site where each family member ticks off what they want or need for Christmas, then gets a shareable wishlist image.

**Flow:** checklist → name/nickname → "Are you sure?" review → download or share the image.

- Categories open one at a time; ones with picks turn green
- Each gift can be **Want**, **Need**, or **Both**, with quick style chips (or your own), a budget range, and a Size & color box
- Sizes are shared by type: set a shoe size once and every footwear item uses it
- Up to **8 gifts** plus **4 favorites** (☆). At the limit, the rest lock and Santa complains if you try for more
- Add your own items under "Something else?"
- Every visit starts a fresh list (good for shared phones) and shows the How it works guide; refreshing the same tab keeps your progress
- "Copy my edit link" on the last page packs the whole list into a link, so it can be reopened and changed later
- Duplicate gifts are blocked, and a simple word filter keeps it family-friendly
- Christmas countdown and automatic dark mode
- Inside Messenger, tapping Download also shows how to save by pressing and holding the image
- The image is a 1080×1920 PNG: favorites in a red box, everything else grouped by Want/Need and category, and your own items in a separate box. Text resizes so every item fits. After editing, bump the `?v=` number on the file links in `index.html` so phones load the new files. On phones, **Share** opens the share sheet so you can pick Messenger. On desktop, download it and send it in Messenger.

The Inter font is bundled in `fonts/` (SIL Open Font License), so nothing loads from outside the site.

## Editing the preset items

All categories and items are in [`items.js`](items.js). Add, rename, or remove entries there. Each item needs a unique `id`; `styles` lists up to 5 suggestions and `size` (`shoe`, `top`, `bottom`) picks which shared size it uses; `budget` (`small`, `mid`, `big`, on a category or an item) picks the price ranges; `color: false` hides the color picker (cash, tickets, food…).

## Running locally

No build step. Serve the folder with any static server:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Hosting on GitHub Pages

Repo **Settings → Pages → Build and deployment → Deploy from a branch**, then pick the branch (e.g. `main`) and `/ (root)`.
