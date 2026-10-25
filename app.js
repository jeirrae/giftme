(function () {
  "use strict";

  const MAX_TOP = 5;
  const MAX_ITEMS = 12; // gifts that aren't favorites
  const STORAGE_KEY = "giftme:v1";
  const STEPS = ["list", "name", "review", "done"];
  const CATEGORIES = window.WISHLIST_CATEGORIES || [];

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- State ----------

  // picks: { [itemId]: { kind: "want" | "need", note, price, top } }
  // custom: [{ id, name }] — user-added items (always shown in "Something else?")
  let state = load() || { picks: {}, custom: [], name: "", confirmed: false };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return {
        picks: s.picks || {},
        custom: Array.isArray(s.custom) ? s.custom : [],
        name: s.name || "",
        confirmed: !!s.confirmed,
      };
    } catch (_) {
      return null;
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      /* storage unavailable: progress just won't persist */
    }
  }

  function changed() {
    state.confirmed = false;
    save();
    updateTally();
  }

  const itemIndex = new Map(); // id -> { name, category }
  CATEGORIES.forEach((cat) =>
    cat.items.forEach((it) => itemIndex.set(it.id, { name: it.name, category: cat }))
  );
  const CUSTOM_CATEGORY = { id: "custom", name: "Something else", emoji: "✨" };

  function itemName(id) {
    if (itemIndex.has(id)) return itemIndex.get(id).name;
    const c = state.custom.find((x) => x.id === id);
    return c ? c.name : null;
  }

  // Ordered, grouped list of the current picks.
  function pickedGroups() {
    const groups = CATEGORIES.map((cat) => ({
      category: cat,
      items: cat.items.filter((it) => state.picks[it.id]).map((it) => entry(it.id, it.name)),
    }));
    groups.push({
      category: CUSTOM_CATEGORY,
      items: state.custom.filter((c) => state.picks[c.id]).map((c) => entry(c.id, c.name)),
    });
    return groups.filter((g) => g.items.length);
  }

  function entry(id, name) {
    return Object.assign({ id, name }, state.picks[id]);
  }

  function pickCount() {
    return Object.keys(state.picks).filter((id) => itemName(id)).length;
  }

  function regularCount() {
    return pickCount() - topCount();
  }

  function topCount() {
    return Object.keys(state.picks).filter((id) => state.picks[id].top && itemName(id)).length;
  }

  function formatPrice(p) {
    const n = Number(p);
    return p && n > 0 ? "₱" + n.toLocaleString("en-PH") : "";
  }

  function christmasYear(now = new Date()) {
    const y = now.getFullYear();
    return now.getMonth() === 11 && now.getDate() > 25 ? y + 1 : y;
  }

  function possessive(name) {
    return /s$/i.test(name) ? name + "’" : name + "’s";
  }

  // ---------- Step 1: checklist ----------

  function itemHTML(id, name, removable) {
    return `
      <li class="item" data-id="${id}">
        <div class="item-row">
          <label class="check">
            <input type="checkbox" />
            <span class="box" aria-hidden="true"></span>
            <span class="item-name"></span>
          </label>
          <button type="button" class="star" aria-pressed="false" aria-label="Favorite">☆</button>
          ${removable ? `<button type="button" class="icon-btn remove" aria-label="Remove item">×</button>` : ""}
        </div>
        <div class="details">
          <div class="seg" role="group" aria-label="Want or need">
            <button type="button" data-kind="want" aria-pressed="true">Want</button>
            <button type="button" data-kind="need" aria-pressed="false">Need</button>
          </div>
          <div class="detail-fields">
            <input type="text" class="note" maxlength="80" placeholder="Note (size, color…)" aria-label="Note" />
            <label class="price-field">
              <span>₱</span>
              <input type="text" class="price" inputmode="numeric" maxlength="9" placeholder="Price" aria-label="Price in pesos" />
            </label>
          </div>
        </div>
      </li>`;
  }

  function renderCategories() {
    const host = $("#categories");
    host.innerHTML = CATEGORIES.map(
      (cat) => `
      <section class="group" data-cat="${cat.id}">
        <h2 class="group-title">${escapeHTML(cat.name)} <span class="cat-count"></span></h2>
        <ul class="card items">${cat.items.map((it) => itemHTML(it.id, it.name)).join("")}</ul>
      </section>`
    ).join("");
    // Set names via textContent so preset/custom text is never parsed as HTML.
    CATEGORIES.forEach((cat) =>
      cat.items.forEach((it) => {
        $(`.item[data-id="${it.id}"] .item-name`, host).textContent = it.name;
      })
    );
    renderCustom();
    $$(".item").forEach(syncItem);
    updateTally();
  }

  function renderCustom() {
    const list = $("#custom-items");
    list.innerHTML = state.custom.map((c) => itemHTML(c.id, c.name, true)).join("");
    state.custom.forEach((c) => {
      $(`.item[data-id="${c.id}"] .item-name`, list).textContent = c.name;
    });
    $$(".item", list).forEach(syncItem);
  }

  function syncItem(li) {
    const pick = state.picks[li.dataset.id];
    const checked = !!pick;
    li.classList.toggle("is-checked", checked);
    $(".check input", li).checked = checked;
    const star = $(".star", li);
    const isTop = !!(pick && pick.top);
    star.setAttribute("aria-pressed", String(isTop));
    star.textContent = isTop ? "★" : "☆";
    if (pick) {
      $$(".seg button", li).forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.kind === pick.kind))
      );
      const note = $(".note", li);
      const price = $(".price", li);
      if (document.activeElement !== note) note.value = pick.note || "";
      if (document.activeElement !== price) price.value = pick.price || "";
    }
  }

  function updateTally() {
    const n = pickCount();
    const t = topCount();
    const r = regularCount();
    const count = $("#tally-count");
    count.textContent = `${r}/${MAX_ITEMS} gifts`;
    count.classList.toggle("over", r > MAX_ITEMS);
    const top = $("#tally-top");
    top.textContent = `${t}/${MAX_TOP} favorites`;
    top.classList.toggle("full", t >= MAX_TOP);
    $("#next-btn").disabled = n === 0 || r > MAX_ITEMS;

    // At a limit, the things that would go over it are locked.
    const giftsFull = r >= MAX_ITEMS;
    const starsFull = t >= MAX_TOP;
    $$(".item").forEach((li) => li.classList.toggle("is-locked", giftsFull && !state.picks[li.dataset.id]));
    $("#custom-form").classList.toggle("is-locked", giftsFull);
    $$(".star").forEach((star) => {
      const locked = starsFull && star.getAttribute("aria-pressed") !== "true";
      star.classList.toggle("is-locked", locked);
      star.setAttribute("aria-disabled", String(locked));
    });
    if (warned === "gifts" && !giftsFull) warned = null;
    if (warned === "stars" && !starsFull) warned = null;
    renderLimit();

    $$(".group[data-cat]").forEach((group) => {
      const c = $$(".item.is-checked", group).length;
      $(".cat-count", group).textContent = c ? `${c} picked` : "";
    });
  }

  // Banner above the bottom bar: yellow when a limit is reached, red (with a
  // little shake) when someone tries to go past it.
  let warned = null; // null | "gifts" | "stars"
  let shakeTimer;
  let calmTimer;

  function renderLimit() {
    const r = regularCount();
    const t = topCount();
    const box = $("#limit");
    const over = r > MAX_ITEMS;
    const giftsFull = r >= MAX_ITEMS;
    const starsFull = t >= MAX_TOP;
    let msg = null;

    if (over) {
      const extra = r - MAX_ITEMS;
      msg = ["over", "🎅", "Ho ho ho… hold on!",
        `You're asking for too much! Santa's back hurts already. Uncheck ${extra} ${extra === 1 ? "gift" : "gifts"} to continue.`];
    } else if (warned === "gifts") {
      msg = ["over", "🎅", "Ho ho ho… hold on!",
        "You're asking for too much! Santa's back hurts already. Uncheck a gift to add a new one."];
    } else if (warned === "stars") {
      msg = ["over", "🧝", "Whoa there, superstar!",
        `Only ${MAX_TOP} favorites, or the elves get confused! Tap a gold star to remove it first.`];
    } else if (giftsFull && starsFull) {
      msg = ["full", "🛷", "That's the max!",
        `${MAX_ITEMS} gifts and ${MAX_TOP} favorites. Santa's sleigh is officially full.`];
    } else if (giftsFull) {
      msg = ["full", "🛷", `That's ${MAX_ITEMS}, the max!`,
        "Santa's sleigh is officially full. You can still swap gifts around."];
    } else if (starsFull) {
      msg = ["full", "⭐", `That's ${MAX_TOP} favorites, the max!`,
        "Your top picks are locked in. Tap a gold star to swap one out."];
    }

    box.hidden = !msg;
    if (!msg) return;
    box.classList.toggle("over", msg[0] === "over");
    box.classList.toggle("full", msg[0] === "full");
    $("#limit-emoji").textContent = msg[1];
    $("#limit-title").textContent = msg[2];
    $("#limit-text").textContent = msg[3];
  }

  function warnLimit(kind) {
    warned = kind;
    renderLimit();
    const box = $("#limit");
    box.classList.remove("shake");
    void box.offsetWidth; // restart the animation
    box.classList.add("shake");
    clearTimeout(shakeTimer);
    clearTimeout(calmTimer);
    shakeTimer = setTimeout(() => box.classList.remove("shake"), 500);
    calmTimer = setTimeout(() => {
      warned = null;
      renderLimit();
    }, 4000);
  }

  function onListClick(e) {
    const li = e.target.closest(".item");
    if (!li) return;
    const id = li.dataset.id;

    if (e.target.closest(".star")) {
      const pick = state.picks[id];
      if (pick && pick.top) {
        if (regularCount() >= MAX_ITEMS) {
          warnLimit("gifts");
          return;
        }
        pick.top = false;
      } else if (topCount() >= MAX_TOP) {
        warnLimit("stars");
        return;
      } else {
        state.picks[id] = Object.assign({ kind: "want", note: "", price: "" }, pick, { top: true });
      }
      syncItem(li);
      changed();
      return;
    }

    const seg = e.target.closest(".seg button");
    if (seg && state.picks[id]) {
      state.picks[id].kind = seg.dataset.kind;
      syncItem(li);
      changed();
      return;
    }

    if (e.target.closest(".remove")) {
      state.custom = state.custom.filter((c) => c.id !== id);
      delete state.picks[id];
      li.remove();
      changed();
    }
  }

  function onListChange(e) {
    if (!e.target.matches(".check input")) return;
    const li = e.target.closest(".item");
    const id = li.dataset.id;
    if (e.target.checked) {
      if (!state.picks[id] && regularCount() >= MAX_ITEMS) {
        e.target.checked = false;
        warnLimit("gifts");
        return;
      }
      state.picks[id] = state.picks[id] || { kind: "want", note: "", price: "", top: false };
    } else {
      delete state.picks[id];
    }
    syncItem(li);
    changed();
  }

  function onListInput(e) {
    const li = e.target.closest(".item");
    if (!li || !state.picks[li.dataset.id]) return;
    const pick = state.picks[li.dataset.id];
    if (e.target.matches(".note")) {
      pick.note = e.target.value;
    } else if (e.target.matches(".price")) {
      const digits = e.target.value.replace(/\D/g, "");
      if (digits !== e.target.value) e.target.value = digits;
      pick.price = digits;
    } else {
      return;
    }
    changed();
  }

  function onCustomSubmit(e) {
    e.preventDefault();
    const input = $("#custom-input");
    const name = input.value.trim().replace(/\s+/g, " ");
    if (!name) return;
    if (regularCount() >= MAX_ITEMS) {
      warnLimit("gifts");
      return;
    }
    const id = "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    state.custom.push({ id, name });
    state.picks[id] = { kind: "want", note: "", price: "", top: false };
    input.value = "";
    renderCustom();
    changed();
    input.focus();
  }

  // ---------- Steps / routing ----------

  function allowedStep(step) {
    if (step === "name" && pickCount() === 0) return "list";
    if (step === "review" && (pickCount() === 0 || !state.name.trim())) return pickCount() ? "name" : "list";
    if (step === "done" && !state.confirmed) return allowedStep("review");
    return STEPS.includes(step) ? step : "list";
  }

  function go(step) {
    const target = allowedStep(step);
    if (location.hash.slice(1) !== target) {
      location.hash = target; // triggers render via hashchange
    } else {
      showStep(target);
    }
  }

  function showStep(step) {
    $$(".step").forEach((s) => (s.hidden = s.dataset.step !== step));
    $("#bottombar").hidden = step !== "list";
    window.scrollTo(0, 0);

    if (step === "list") {
      $$(".item").forEach(syncItem);
      updateTally();
    } else if (step === "name") {
      const input = $("#name-input");
      input.value = state.name;
      $("#name-error").hidden = true;
      setTimeout(() => input.focus(), 50);
    } else if (step === "review") {
      renderReview();
    } else if (step === "done") {
      renderDone();
    }
  }

  function onHashChange() {
    const requested = location.hash.slice(1) || "list";
    const step = allowedStep(requested);
    if (step !== requested) {
      history.replaceState(null, "", "#" + step);
    }
    showStep(step);
  }

  // ---------- Step 3: review ----------

  function renderReview() {
    $("#review-name").textContent = state.name.trim();
    const host = $("#review-list");
    host.innerHTML = "";
    const tops = [];
    pickedGroups().forEach((g) => g.items.forEach((it) => it.top && tops.push(it)));

    const groups = [];
    if (tops.length) groups.push({ title: "★ Favorites", items: tops });
    pickedGroups().forEach((g) => {
      const rest = g.items.filter((it) => !it.top);
      if (rest.length) groups.push({ title: g.category.name, items: rest });
    });

    groups.forEach((g) => {
      const section = document.createElement("section");
      section.className = "group";
      const h = document.createElement("h2");
      h.className = "group-title";
      h.textContent = g.title;
      const ul = document.createElement("ul");
      ul.className = "card items";
      g.items.forEach((it) => {
        const li = document.createElement("li");
        li.className = "r-item";
        li.innerHTML = `<span class="r-main"><span class="r-name"></span>
          <span class="r-sub"><span class="kind kind-${it.kind}">${it.kind === "need" ? "Need" : "Want"}</span><span class="r-note"></span></span></span>
          <span class="r-price"></span>`;
        $(".r-name", li).textContent = it.name;
        const note = (it.note || "").trim();
        $(".r-note", li).textContent = note ? ` · ${note}` : "";
        $(".r-price", li).textContent = formatPrice(it.price);
        ul.appendChild(li);
      });
      section.append(h, ul);
      host.appendChild(section);
    });
  }

  // ---------- Step 4: image ----------

  let currentBlob = null;
  let currentURL = null;

  async function renderDone() {
    const img = $("#preview-img");
    const loading = $("#preview-loading");
    loading.hidden = false;
    loading.textContent = "Wrapping your list…";
    $(".preview").style.aspectRatio = "";
    img.removeAttribute("src");
    setupShareUI(null);

    try {
      const blob = await drawCard();
      currentBlob = blob;
      if (currentURL) URL.revokeObjectURL(currentURL);
      currentURL = URL.createObjectURL(blob);
      img.onload = () => $(".preview").style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
      img.src = currentURL;
      loading.hidden = true;
      setupShareUI(blob);
    } catch (err) {
      console.error(err);
      loading.textContent = "Couldn't create the image. Please try again.";
    }
  }

  function fileName() {
    const slug = state.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `christmas-wishlist-${slug || "me"}.png`;
  }

  function setupShareUI(blob) {
    const shareBtn = $("#share-btn");
    const hint = $("#share-hint");
    const msgLink = $("#messenger-link");
    let canShareFile = false;
    if (blob && navigator.canShare) {
      try {
        const file = new File([blob], fileName(), { type: "image/png" });
        canShareFile = navigator.canShare({ files: [file] });
      } catch (_) {
        canShareFile = false;
      }
    }
    shareBtn.hidden = !canShareFile;
    msgLink.hidden = canShareFile || !blob;
    hint.textContent = !blob
      ? ""
      : canShareFile
      ? "Tap Share, then pick Messenger. You can also long-press the image to save it."
      : "Download the image, then send it to the family in Messenger.";
  }

  async function shareImage() {
    if (!currentBlob) return;
    const file = new File([currentBlob], fileName(), { type: "image/png" });
    try {
      await navigator.share({ files: [file], title: `${possessive(state.name.trim())} Christmas Wishlist` });
    } catch (err) {
      if (err && err.name !== "AbortError") toast("Sharing didn't work. Try downloading instead.");
    }
  }

  function downloadImage() {
    if (!currentURL) return;
    const a = document.createElement("a");
    a.href = currentURL;
    a.download = fileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("Image saved 🎁");
  }

  // Canvas drawing — a fixed 1080×1620 (4:6) card that looks the same everywhere.
  const W = 1080;
  const H = 1620;
  const PAD = 64;
  const CONTENT_TOP = 300;
  const CONTENT_BOTTOM = H - 112;
  const C = {
    bg: "#fbf7f0",
    text: "#1d1d1f",
    muted: "#8a8279",
    red: "#c8102e",
    redDark: "#9e0c24",
    green: "#1f5e3f",
    gold: "#f4c542",
    box: "#ebe5da",
    inner: "#f9f6f1",
    hairline: "#e4ddd1",
    flake: "#e3d8c6",
  };
  const THEME = {
    fav: { text: "#ffffff", muted: "rgba(255,255,255,0.72)", hairline: "rgba(255,255,255,0.16)", want: "#d9a21b", need: "#4fa77a" },
    light: { text: C.text, muted: C.muted, hairline: C.hairline, want: "#c98b0e", need: "#1e7b4e" },
  };
  const SANS = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  async function ensureFonts() {
    if (!document.fonts || !document.fonts.load) return;
    const loads = Promise.all([400, 500, 600, 700].map((w) => document.fonts.load(`${w} 30px ${SANS}`)));
    await Promise.race([loads, new Promise((r) => setTimeout(r, 2500))]);
  }

  function cardData() {
    const favorites = [];
    const custom = [];
    const byKind = { want: [], need: [] };
    pickedGroups().forEach((g) => {
      const perKind = { want: [], need: [] };
      g.items.forEach((it) => {
        if (it.top) favorites.push(it);
        else if (g.category === CUSTOM_CATEGORY) custom.push(it);
        else perKind[it.kind === "need" ? "need" : "want"].push(it);
      });
      ["want", "need"].forEach((k) => {
        if (perKind[k].length) byKind[k].push({ title: g.category.name, items: perKind[k] });
      });
    });
    const kinds = ["want", "need"].filter((k) => byKind[k].length).map((k) => ({ kind: k, cats: byKind[k] }));
    return { favorites, custom, kinds };
  }

  async function drawCard() {
    await ensureFonts();
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const data = cardData();
    const total = pickCount();

    // Pick the largest text size that fits; shrink further only if needed.
    const attempts = [];
    for (let s = 1.36; s >= 0.6; s -= 0.04) attempts.push({ s, cols: 2 });
    for (let s = 0.62; s >= 0.5; s -= 0.04) attempts.push({ s, cols: 3 });
    let plan = null;
    for (const a of attempts) {
      plan = layout(ctx, data, a.s, a.cols);
      if (plan.bottom <= CONTENT_BOTTOM) break;
    }

    // Background, ribbon, snow
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.red;
    ctx.fillRect(0, 0, W, 12);
    drawBow(ctx, W - 150, 12);
    [
      [470, 66, 14], [560, 40, 9], [640, 92, 12], [735, 52, 17], [830, 104, 10],
      [W / 2 - 230, H - 62, 11], [W / 2 + 230, H - 62, 11],
    ].forEach(([x, y, r]) => snowflake(ctx, x, y, r));

    // Header: eyebrow → title → subtitle
    setFont(ctx, 600, 28);
    ctx.fillStyle = C.red;
    ctx.fillText(`Christmas ${christmasYear()}`, PAD, 104);

    const title = `${possessive(state.name.trim())} Wishlist`;
    let size = 80;
    const fitTitle = () => {
      spaced(ctx, -0.03 * size);
      setFont(ctx, 700, size);
    };
    fitTitle();
    while (ctx.measureText(title).width > W - PAD * 2 && size > 52) {
      size -= 2;
      fitTitle();
    }
    ctx.fillStyle = C.text;
    ctx.fillText(fitText(ctx, title, W - PAD * 2), PAD - 3, 200);
    spaced(ctx, 0);

    setFont(ctx, 500, 28);
    ctx.fillStyle = C.muted;
    const f = data.favorites.length;
    ctx.fillText(
      `${total} ${total === 1 ? "item" : "items"}${f ? ` · ${f} ${f === 1 ? "favorite" : "favorites"}` : ""}`,
      PAD,
      252
    );

    // Content; if even the smallest size overflows, scale it down evenly.
    const used = plan.bottom - CONTENT_TOP;
    const room = CONTENT_BOTTOM - CONTENT_TOP;
    ctx.save();
    if (used > room) {
      const k = room / used;
      ctx.translate(W / 2, CONTENT_TOP);
      ctx.scale(k, k);
      ctx.translate(-W / 2, -CONTENT_TOP);
    }
    plan.draw(ctx);
    ctx.restore();

    // Footer
    setFont(ctx, 600, 26);
    ctx.fillStyle = C.green;
    ctx.textAlign = "center";
    ctx.fillText("Merry Christmas", W / 2, H - 54);
    ctx.textAlign = "left";

    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
    );
  }

  // Up to three full-width boxes stacked: Favorites, the rest, Something else.
  function layout(mctx, data, s, maxCols) {
    const fullW = W - PAD * 2;
    const gap = 24;
    const boxes = [];
    if (data.favorites.length) {
      boxes.push(measureListBox(mctx, {
        title: "Favorites", star: true, items: data.favorites, bg: C.green, theme: THEME.fav, big: true,
      }, fullW, s));
    }
    if (data.kinds.length) {
      const title = data.favorites.length ? "Also on my list" : "My list";
      boxes.push(measureMainBox(mctx, title, data.kinds, fullW, s, maxCols));
    }
    if (data.custom.length) {
      boxes.push(measureListBox(mctx, {
        title: "Something else", items: data.custom, bg: C.box, theme: THEME.light,
      }, fullW, s));
    }

    let y = CONTENT_TOP;
    const placed = boxes.map((b) => {
      const p = { b, y };
      y += b.h + gap;
      return p;
    });
    return {
      bottom: y - gap,
      draw: (ctx) => placed.forEach((p) => p.b.draw(ctx, PAD, p.y)),
    };
  }

  // A box of items, each with a small Want/Need pill.
  function measureListBox(mctx, o, w, s) {
    const padX = 32 * s;
    const padTop = 30 * s;
    const padBottom = 12 * s;
    const headerSize = (o.star ? 24 : 22) * s;
    const headerH = headerSize + 12 * s;
    const rows = o.items.map((it) => measureRow(mctx, it, w - padX * 2, s, o.theme, { tag: true, big: o.big }));
    const h = padTop + headerH + rows.reduce((a, r) => a + r.h, 0) + padBottom;

    return {
      h,
      draw(ctx, x, y) {
        roundRect(ctx, x, y, w, h, 32);
        ctx.fillStyle = o.bg;
        ctx.fill();

        let hx = x + padX;
        const hy = y + padTop + headerSize * 0.8;
        if (o.star) {
          ctx.fillStyle = C.gold;
          star(ctx, hx + headerSize * 0.45, hy - headerSize * 0.36, headerSize * 0.55);
          hx += headerSize * 1.3;
        }
        setFont(ctx, o.star ? 700 : 600, headerSize);
        ctx.fillStyle = o.star ? "#ffffff" : o.theme.muted;
        ctx.fillText(o.title, hx, hy);

        let ry = y + padTop + headerH;
        rows.forEach((r, i) => {
          if (i > 0) hairline(ctx, x + padX, x + w - padX, ry, o.theme.hairline);
          r.draw(ctx, x + padX, ry);
          ry += r.h;
        });
      },
    };
  }

  // The big gray box: Want / Need sections (labels only when both exist),
  // each with category boxes in columns.
  function measureMainBox(mctx, title, kinds, w, s, maxCols) {
    const padX = 28 * s;
    const padTop = 30 * s;
    const padBottom = 28 * s;
    const headerSize = 22 * s;
    const headerH = headerSize + 18 * s;
    const innerW = w - padX * 2;
    const showLabels = kinds.length > 1;
    const labelH = showLabels ? 36 * s + 16 * s : 0;
    const gap = 16 * s;
    const sectionGap = 26 * s;

    const sections = kinds.map((k) => {
      const cols = Math.min(maxCols, k.cats.length);
      const colW = (innerW - gap * (cols - 1)) / cols;
      const heights = new Array(cols).fill(0);
      const cats = k.cats.map((cat) => {
        const box = measureCatBox(mctx, cat, colW, s);
        const col = heights.indexOf(Math.min(...heights));
        const p = { box, dx: col * (colW + gap), dy: heights[col] };
        heights[col] += box.h + gap;
        return p;
      });
      const count = k.cats.reduce((a, c) => a + c.items.length, 0);
      return { kind: k.kind, count, cats, h: labelH + Math.max(...heights) - gap };
    });

    const h = padTop + headerH + sections.reduce((a, sec) => a + sec.h, 0) +
      sectionGap * (sections.length - 1) + padBottom;

    return {
      h,
      draw(ctx, x, y) {
        roundRect(ctx, x, y, w, h, 32);
        ctx.fillStyle = C.box;
        ctx.fill();

        setFont(ctx, 600, headerSize);
        ctx.fillStyle = C.muted;
        ctx.fillText(title, x + padX, y + padTop + headerSize * 0.8);

        let sy = y + padTop + headerH;
        sections.forEach((sec) => {
          if (showLabels) {
            const label = sec.kind === "need" ? "Need" : "Want";
            const pw = pill(ctx, x + padX, sy + 18 * s, label, 20 * s, 36 * s,
              THEME.light[sec.kind]);
            setFont(ctx, 500, 20 * s);
            ctx.fillStyle = C.muted;
            ctx.textBaseline = "middle";
            ctx.fillText(`${sec.count} ${sec.count === 1 ? "item" : "items"}`, x + padX + pw + 12 * s, sy + 19 * s);
            ctx.textBaseline = "alphabetic";
          }
          sec.cats.forEach((c) => c.box.draw(ctx, x + padX + c.dx, sy + labelH + c.dy));
          sy += sec.h + sectionGap;
        });
      },
    };
  }

  function measureCatBox(mctx, cat, w, s) {
    const padX = 22 * s;
    const padTop = 22 * s;
    const padBottom = 6 * s;
    const headerSize = 19 * s;
    const headerH = headerSize + 6 * s;
    const rows = cat.items.map((it) => measureRow(mctx, it, w - padX * 2, s, THEME.light, {}));
    const h = padTop + headerH + rows.reduce((a, r) => a + r.h, 0) + padBottom;

    return {
      h,
      draw(ctx, x, y) {
        roundRect(ctx, x, y, w, h, 24);
        ctx.fillStyle = C.inner;
        ctx.fill();
        setFont(ctx, 600, headerSize);
        ctx.fillStyle = C.muted;
        ctx.fillText(fitText(ctx, cat.title, w - padX * 2), x + padX, y + padTop + headerSize * 0.8);
        let ry = y + padTop + headerH;
        rows.forEach((r, i) => {
          if (i > 0) hairline(ctx, x + padX, x + w - padX, ry, C.hairline);
          r.draw(ctx, x + padX, ry);
          ry += r.h;
        });
      },
    };
  }

  // One item: name (up to 2 lines), optional note below; price and pill on the right.
  function measureRow(mctx, it, w, s, theme, opt) {
    const nameSize = (opt.big ? 30 : 25) * s;
    const nameLH = nameSize * 1.25;
    const noteSize = (opt.big ? 21 : 19) * s;
    const noteLH = noteSize * 1.45;
    const padY = (opt.big ? 15 : 12) * s;
    const pillSize = 16 * s;
    const pillH = 28 * s;
    const priceSize = (opt.big ? 24 : 21) * s;

    const label = it.kind === "need" ? "Need" : "Want";
    setFont(mctx, 600, pillSize);
    const pillW = opt.tag ? mctx.measureText(label).width + 24 * s : 0;
    const price = formatPrice(it.price);
    setFont(mctx, 500, priceSize);
    const priceW = price ? mctx.measureText(price).width : 0;
    const rightW = (pillW ? pillW + 14 * s : 0) + (priceW ? priceW + 16 * s : 0);

    setFont(mctx, opt.big ? 600 : 500, nameSize);
    const nameLines = wrap(mctx, it.name, Math.max(40, w - rightW), 2);
    const note = (it.note || "").trim();
    const h = padY * 2 + nameLines.length * nameLH + (note ? noteLH : 0);

    return {
      h,
      draw(ctx, x, y) {
        const base = y + padY + nameSize * 0.92;
        const mid = base - nameSize * 0.36;
        setFont(ctx, opt.big ? 600 : 500, nameSize);
        ctx.fillStyle = theme.text;
        nameLines.forEach((ln, i) => ctx.fillText(ln, x, base + i * nameLH));

        let rx = x + w;
        if (opt.tag) {
          rx -= pillW;
          pill(ctx, rx, mid, label, pillSize, pillH, theme[it.kind === "need" ? "need" : "want"], pillW);
          rx -= 14 * s;
        }
        if (price) {
          setFont(ctx, 500, priceSize);
          ctx.fillStyle = theme.muted;
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";
          ctx.fillText(price, rx, mid);
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
        }

        if (note) {
          setFont(ctx, 400, noteSize);
          ctx.fillStyle = theme.muted;
          ctx.fillText(fitText(ctx, note, w), x, base + (nameLines.length - 1) * nameLH + noteLH);
        }
      },
    };
  }

  // Rounded pill with white text, vertically centered on cy. Returns its width.
  function pill(ctx, x, cy, text, size, h, fill, width) {
    setFont(ctx, 600, size);
    const w = width || ctx.measureText(text).width + size * 1.5;
    roundRect(ctx, x, cy - h / 2, w, h, h / 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + w / 2, cy + size * 0.04);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    return w;
  }

  function hairline(ctx, x1, x2, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x1, y - 1, x2 - x1, 2);
  }

  function drawBow(ctx, cx, top) {
    ctx.fillStyle = C.red;
    [-1, 1].forEach((d) => {
      ctx.beginPath();
      ctx.ellipse(cx + d * 24, top + 12, 26, 13, d * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + d * 4, top + 14);
      ctx.lineTo(cx + d * 26, top + 58);
      ctx.lineTo(cx + d * 12, top + 54);
      ctx.lineTo(cx + d * 2, top + 64);
      ctx.closePath();
      ctx.fill();
    });
    ctx.fillStyle = C.bg;
    [-1, 1].forEach((d) => {
      ctx.beginPath();
      ctx.ellipse(cx + d * 26, top + 12, 11, 4.5, d * 0.45, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = C.redDark;
    ctx.beginPath();
    ctx.arc(cx, top + 12, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  function snowflake(ctx, cx, cy, r) {
    ctx.save();
    ctx.strokeStyle = C.flake;
    ctx.lineWidth = Math.max(2, r / 6);
    ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const ex = cx + Math.cos(a) * r;
      const ey = cy + Math.sin(a) * r;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex, ey);
      // small branches
      const bx = cx + Math.cos(a) * r * 0.6;
      const by = cy + Math.sin(a) * r * 0.6;
      [-0.6, 0.6].forEach((t) => {
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a + t) * r * 0.32, by + Math.sin(a + t) * r * 0.32);
      });
      ctx.stroke();
    }
    ctx.restore();
  }

  function star(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 ? r * 0.45 : r;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      ctx.lineTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
    }
    ctx.closePath();
    ctx.fill();
  }

  function setFont(ctx, weight, size) {
    ctx.font = `${weight} ${Math.round(size * 10) / 10}px ${SANS}`;
  }

  function spaced(ctx, px) {
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${px}px`;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function fitText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
    return t.trimEnd() + "…";
  }

  function wrap(ctx, text, maxW, maxLines) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width <= maxW || !line) {
        line = test;
      } else {
        lines.push(line);
        line = words[i];
        if (lines.length === maxLines - 1) {
          line = words.slice(i).join(" ");
          break;
        }
      }
    }
    if (line) lines.push(line);
    return lines.slice(0, maxLines).map((l) => fitText(ctx, l, maxW));
  }

  // ---------- Misc ----------

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function renderCountdown() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const xmas = new Date(christmasYear(now), 11, 25);
    const days = Math.round((xmas - today) / 86400000);
    $("#countdown").textContent =
      days === 0 ? "🎄 Merry Christmas!" : `${days} ${days === 1 ? "day" : "days"} to Christmas`;
    $$(".js-year").forEach((el) => (el.textContent = christmasYear(now)));
  }

  // ---------- Wire up ----------

  function init() {
    renderCountdown();
    renderCategories();

    const main = $("main");
    main.addEventListener("click", onListClick);
    main.addEventListener("change", onListChange);
    main.addEventListener("input", onListInput);
    $("#custom-form").addEventListener("submit", onCustomSubmit);

    $$("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
    $("#next-btn").addEventListener("click", () => go("name"));

    $("#name-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#name-input").value.trim().replace(/\s+/g, " ");
      if (!name) {
        $("#name-error").hidden = false;
        return;
      }
      if (name !== state.name) state.confirmed = false;
      state.name = name;
      save();
      go("review");
    });

    $("#confirm-btn").addEventListener("click", () => {
      state.confirmed = true;
      save();
      go("done");
    });

    $("#share-btn").addEventListener("click", shareImage);
    $("#download-btn").addEventListener("click", downloadImage);
    $("#reset-btn").addEventListener("click", () => {
      if (!confirm("Clear this list and start a new one?")) return;
      state = { picks: {}, custom: [], name: "", confirmed: false };
      save();
      renderCategories();
      go("list");
    });

    const TIPS_KEY = "giftme:tips-hidden";
    const setTips = (hidden) => {
      $("#tips").hidden = hidden;
      $("#tips-show").hidden = !hidden;
      try {
        localStorage.setItem(TIPS_KEY, hidden ? "1" : "");
      } catch (_) {}
    };
    let tipsHidden = false;
    try {
      tipsHidden = localStorage.getItem(TIPS_KEY) === "1";
    } catch (_) {}
    setTips(tipsHidden);
    $("#tips-close").addEventListener("click", () => setTips(true));
    $("#tips-show").addEventListener("click", () => setTips(false));

    window.addEventListener("hashchange", onHashChange);
    onHashChange();
  }

  init();
})();
