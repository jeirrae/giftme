(function () {
  "use strict";

  const MAX_TOP = 4;
  const MAX_ITEMS = 8; // gifts that aren't favorites

  const KINDS = ["want", "need", "both"];
  const KIND_LABEL = { want: "Want", need: "Need", both: "Want & Need" };
  const KIND_HINT = {
    want: "Want: nice to have, just for fun.",
    need: "Need: something you really need.",
    both: "Both: you need it and you'd love it.",
  };
  const kindOf = (k) => (KINDS.includes(k) ? k : "want");

  // A small family-friendly filter. Short words only match as whole words
  // so things like "computer" or "reputation" don't trip it.
  const RUDE_ANYWHERE = ["fuck", "putangina", "tangina", "punyeta", "tarantado", "asshole", "bitch", "pakyu", "motherf"];
  const RUDE_WORDS = ["shit", "dick", "pussy", "cunt", "slut", "whore", "bastard", "puta", "gago", "tanga",
    "bobo", "ulol", "ulul", "tite", "puke", "pokpok", "kupal", "siraulo", "fck", "fk", "tngina", "pota"];

  function isRude(text) {
    const plain = text.toLowerCase()
      .replace(/[0@4]/g, (c) => ({ 0: "o", "@": "a", 4: "a" }[c]))
      .replace(/[1!]/g, "i").replace(/3/g, "e").replace(/[5$]/g, "s").replace(/7/g, "t");
    const squashed = plain.replace(/[^a-zñ]/g, "");
    if (RUDE_ANYWHERE.some((w) => squashed.includes(w))) return true;
    const words = plain.split(/[^a-zñ]+/);
    return words.some((w) => RUDE_WORDS.includes(w));
  }

  const NAUGHTY = "Uh-oh, that just landed you on the naughty list 🚨 Try nicer words.";
  const NAUGHTY_TOAST = { emoji: "🚨", title: "Uh-oh, naughty list!", text: "Try nicer words." };
  const STORAGE_KEY = "giftme:v1";
  const STEPS = ["list", "name", "review", "done"];
  const CATEGORIES = window.WISHLIST_CATEGORIES || [];

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- State ----------

  // The list lives in sessionStorage: a refresh keeps it, but every new visit
  // starts fresh so the next person on a shared phone gets a blank list.
  try {
    localStorage.removeItem(STORAGE_KEY); // lists saved by older versions
  } catch (_) {}

  // picks: { [itemId]: { kind: "want" | "need" | "both", top, styles, other, budget, color, note } }
  // custom: [{ id, name }] — user-added items (shown under "Something else")
  // sizes: shared sizes by type, e.g. { shoe: { sys: "US", v: "8" }, top: "M" }

  function load() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? sanitize(JSON.parse(raw)) : null;
    } catch (_) {
      return null;
    }
  }

  // Cleans a saved list (from this tab or an edit link) into the shape the app expects.
  function sanitize(s) {
    {
      const picks = {};
      Object.keys(s.picks || {}).forEach((id) => {
        const p = s.picks[id] || {};
        picks[id] = {
          kind: kindOf(p.kind),
          top: !!p.top,
          styles: (Array.isArray(p.styles) ? p.styles : []).map(String).slice(0, 5),
          other: String(p.other || "").slice(0, 40),
          budget: /^\d+(-\d+|\+)$/.test(p.budget || "") ? p.budget : "",
          colors: (Array.isArray(p.colors) ? p.colors : p.color ? [p.color] : []).map(String).slice(0, 11),
          note: String(p.note || "").slice(0, 60),
        };
      });
      const sizes = {};
      const sz = s.sizes || {};
      if (sz.shoe && sz.shoe.sys && sz.shoe.v) sizes.shoe = { sys: String(sz.shoe.sys), v: String(sz.shoe.v) };
      ["top", "bottom"].forEach((k) => {
        if (typeof sz[k] === "string") sizes[k] = sz[k];
      });
      return {
        picks,
        custom: (Array.isArray(s.custom) ? s.custom : [])
          .filter((c) => c && c.id && c.name)
          .map((c) => ({ id: String(c.id), name: String(c.name).slice(0, 60) })),
        name: formatName(s.name),
        confirmed: !!s.confirmed,
        sizes,
        shoeSys: ["US", "UK", "EU", "Kids"].includes(s.shoeSys) ? s.shoeSys : "US",
      };
    }
  }

  // ---------- Edit link ----------
  // The whole list is packed into the link itself, so it can be reopened later.

  function encodeList() {
    const picks = {};
    Object.keys(state.picks).forEach((id) => {
      if (!itemName(id)) return;
      const p = {};
      Object.entries(state.picks[id]).forEach(([k, v]) => {
        if (Array.isArray(v) ? v.length : v) p[k] = v;
      });
      picks[id] = p;
    });
    const json = JSON.stringify({ picks, custom: state.custom, name: state.name, sizes: state.sizes, shoeSys: state.shoeSys });
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decodeList(text) {
    const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(b64))));
  }

  function editLink() {
    return `${location.origin}${location.pathname}?list=${encodeList()}`;
  }

  // Opening an edit link restores that list, then tidies the address bar.
  let openedFromLink = false;
  (function importFromLink() {
    let params;
    try {
      params = new URLSearchParams(location.search);
    } catch (_) {
      return;
    }
    if (!params.has("list")) return;
    try {
      const restored = sanitize(decodeList(params.get("list")));
      restored.confirmed = false;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
      openedFromLink = true;
    } catch (_) {
      /* a broken link just starts a fresh list */
    }
    history.replaceState(null, "", location.pathname + "#list");
  })();

  let state = load() || { picks: {}, custom: [], name: "", confirmed: false, sizes: {}, shoeSys: "US" };

  function save() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
    cat.items.forEach((it) => itemIndex.set(it.id, { name: it.name, category: cat, def: it }))
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
    return Object.assign({ id, name }, state.picks[id], { meta: metaParts(id, state.picks[id]) });
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

  function christmasYear(now = new Date()) {
    const y = now.getFullYear();
    return now.getMonth() === 11 && now.getDate() > 25 ? y + 1 : y;
  }

  // Names: letters, spaces and dashes only, up to 20 characters.
  function cleanName(text) {
    return String(text || "")
      .replace(/[^\p{L}\p{M}\s-]/gu, "")
      .replace(/\s+/g, " ")
      .replace(/-+/g, "-")
      .replace(/\s*-\s*/g, "-")
      .slice(0, 20);
  }

  // "jr" → "Jr", "MARY ANN" → "Mary Ann", "jo-ann" → "Jo-Ann".
  function formatName(text) {
    return cleanName(text)
      .trim()
      .replace(/^-+|-+$/g, "")
      .toLocaleLowerCase()
      .replace(/(^|[\s-])(\p{L})/gu, (m, sep, ch) => sep + ch.toLocaleUpperCase());
  }

  function possessive(name) {
    return /s$/i.test(name) ? name + "’" : name + "’s";
  }

  // ---------- Step 1: checklist ----------

  // Price ranges by kind of gift; items.js picks "small", "mid" or "big".
  const BUDGET_SETS = {
    small: ["50-100", "100-200", "200-500", "500-1000", "1000+"],
    mid: ["200-500", "500-1000", "1000-2000", "2000-5000", "5000+"],
    big: ["1000-3000", "3000-5000", "5000-10000", "10000-20000", "20000+"],
  };

  function budgetsFor(id) {
    const i = itemIndex.get(id);
    const tier = (i && (i.def.budget || i.category.budget)) || "mid";
    return BUDGET_SETS[tier] || BUDGET_SETS.mid;
  }
  const COLORS = [
    { id: "black", name: "Black", hex: "#1d1d1f" },
    { id: "white", name: "White", hex: "#ffffff" },
    { id: "gray", name: "Gray", hex: "#9a9aa1" },
    { id: "red", name: "Red", hex: "#d12a3a" },
    { id: "pink", name: "Pink", hex: "#f28db5" },
    { id: "purple", name: "Purple", hex: "#8a5cd6" },
    { id: "blue", name: "Blue", hex: "#2f6fd6" },
    { id: "green", name: "Green", hex: "#2f9a5c" },
    { id: "yellow", name: "Yellow", hex: "#f2c230" },
    { id: "brown", name: "Brown", hex: "#8a5a3c" },
    { id: "beige", name: "Beige", hex: "#e8d5b5" },
  ];
  const range = (a, b, step) => {
    const out = [];
    for (let v = a; v <= b + 1e-9; v += step) out.push(String(Math.round(v * 10) / 10));
    return out;
  };
  const CLOTHES_SIZES = ["Kids 4", "Kids 6", "Kids 8", "Kids 10", "Kids 12", "XS", "S", "M", "L", "XL", "2XL", "3XL"];
  // Sizes are shared by type: set a shoe size once and every footwear item uses it.
  const SIZE_TYPES = {
    shoe: {
      group: "footwear",
      systems: {
        US: range(4, 13, 0.5),
        UK: range(3, 12, 0.5),
        EU: range(35, 47, 1),
        Kids: range(4, 13, 1).map((v) => v + "C").concat(range(1, 7, 1).map((v) => v + "Y")),
      },
    },
    top: { group: "tops", list: CLOTHES_SIZES },
    bottom: { group: "bottoms", list: CLOTHES_SIZES },
  };

  function newPick(extra) {
    return Object.assign({ kind: "want", top: false, styles: [], other: "", budget: "", colors: [], note: "" }, extra);
  }

  function itemDef(id) {
    const i = itemIndex.get(id);
    return i ? i.def : { styles: [], size: null };
  }

  // Only tangible gifts get a color picker; cash, tickets, food and the like don't.
  function hasColor(id) {
    const i = itemIndex.get(id);
    if (!i) return true; // your own gifts can have colors
    if (i.def.color === false) return false;
    return i.category.color !== false;
  }

  function sizeText(type) {
    const v = state.sizes[type];
    if (!v) return "";
    if (type !== "shoe") return `Size ${v}`;
    return v.sys === "Kids" ? `Kids ${v.v}` : `${v.sys} ${v.v}`;
  }

  // The small "Running • US 8 • Black" line used on the list, review and image.
  function metaParts(id, pick) {
    const def = itemDef(id);
    const parts = (pick.styles || []).slice();
    if (pick.other && pick.other.trim()) parts.push(pick.other.trim());
    if (def.size && sizeText(def.size)) parts.push(sizeText(def.size));
    const colors = hasColor(id) ? colorNames(pick) : "";
    if (colors) parts.push(colors);
    if (pick.note && pick.note.trim()) parts.push(pick.note.trim());
    return parts;
  }

  // "Black / White", in the order of the swatches.
  function colorNames(pick) {
    return COLORS.filter((c) => (pick.colors || []).includes(c.id)).map((c) => c.name).join(" / ");
  }

  // "1000-2000" → "₱1,000–2,000", "5000+" → "₱5,000+".
  function budgetLabel(id) {
    if (!id) return "";
    const n = (v) => Number(v).toLocaleString("en-PH");
    const m = String(id).match(/^(\d+)(?:-(\d+)|(\+))$/);
    if (!m) return "";
    return m[3] ? `₱${n(m[1])}+` : `₱${n(m[1])}–${n(m[2])}`;
  }

  const openDetails = new Set(); // items whose size & color box is open
  const openOther = new Set(); // items showing the "Other" style box
  let openCat = null;

  function chip(attrs, label) {
    return `<button type="button" class="chip" ${attrs} aria-pressed="false">${escapeHTML(label)}</button>`;
  }

  function itemHTML(id, name, removable) {
    const def = itemDef(id);
    const styles = def.styles && def.styles.length
      ? `<div class="opt">
            <p class="opt-label">Style <span>Pick any</span></p>
            <div class="chips">
              ${def.styles.map((st) => chip(`data-style="${escapeHTML(st)}"`, st)).join("")}
              <button type="button" class="chip chip-other" aria-pressed="false">+ Other</button>
            </div>
            <input type="text" class="other-input" maxlength="40" placeholder="Type the style you want" aria-label="Other style" hidden />
          </div>`
      : "";
    const size = def.size
      ? `<div class="opt">
            <p class="opt-label">Size <span class="size-saved"></span></p>
            ${def.size === "shoe"
              ? `<div class="mini-seg" role="group" aria-label="Size system">${Object.keys(SIZE_TYPES.shoe.systems)
                  .map((sys) => `<button type="button" data-sys="${sys}" aria-pressed="false">${sys}</button>`).join("")}</div>`
              : ""}
            <div class="chips scroll size-chips"></div>
          </div>`
      : "";
    return `
      <li class="item" data-id="${id}">
        <div class="item-row">
          <label class="check">
            <input type="checkbox" />
            <span class="box" aria-hidden="true"></span>
            <span class="item-text"><span class="item-name"></span><span class="item-meta"></span></span>
          </label>
          <button type="button" class="details-btn" aria-expanded="false">${def.size ? "Size & color" : hasColor(id) ? "Color & note" : "Add a note"}</button>
          <button type="button" class="star" aria-pressed="false" aria-label="Favorite">☆</button>
          ${removable ? `<button type="button" class="icon-btn remove" aria-label="Remove item">×</button>` : ""}
        </div>
        <div class="details">
          <div class="more" hidden>
            ${size}
            ${hasColor(id) ? `<div class="opt">
              <p class="opt-label">Color <span class="color-name"></span></p>
              <div class="swatches">${COLORS.map((c) =>
                `<button type="button" class="swatch" data-color="${c.id}" style="--c:${c.hex}" aria-label="${c.name}" aria-pressed="false"></button>`).join("")}</div>
            </div>` : ""}
            <div class="opt">
              <p class="opt-label">Note</p>
              <input type="text" class="note" maxlength="60" placeholder="Anything else? e.g. with my name on it" aria-label="Note" />
            </div>
          </div>
          <div class="seg" role="group" aria-label="Want, need, or both">
            <button type="button" data-kind="want" aria-pressed="true">Want</button>
            <button type="button" data-kind="need" aria-pressed="false">Need</button>
            <button type="button" data-kind="both" aria-pressed="false">Both</button>
          </div>
          <p class="kind-hint"></p>
          ${styles}
          <div class="opt">
            <p class="opt-label">Budget</p>
            <div class="chips">${budgetsFor(id).map((b) => chip(`data-budget="${b}"`, budgetLabel(b))).join("")}</div>
          </div>
        </div>
      </li>`;
  }

  function catHTML(id, name, body) {
    return `
      <section class="group" data-cat="${id}">
        <button type="button" class="cat-head" aria-expanded="false">
          <span class="cat-name">${escapeHTML(name)}</span>
          <span class="cat-count"></span>
          <span class="chev" aria-hidden="true"></span>
        </button>
        <div class="cat-body" hidden>${body}</div>
      </section>`;
  }

  // Gift order inside each category: "popular" (the order in items.js, most
  // wanted first) or "az". Remembered on this device only.
  const SORT_KEY = "giftme:sort";
  let sortMode = "popular";
  try {
    if (localStorage.getItem(SORT_KEY) === "az") sortMode = "az";
  } catch (_) {}

  function sortedItems(cat) {
    if (sortMode !== "az") return cat.items;
    return cat.items.slice().sort((a, b) => a.name.localeCompare(b.name));
  }

  function syncSortToggle() {
    const btn = $("#sort-toggle");
    btn.textContent = sortMode === "az" ? "A–Z" : "Default";
    btn.setAttribute("aria-label", `Sort gifts: ${btn.textContent}. Tap to change.`);
  }

  function toggleSort() {
    sortMode = sortMode === "az" ? "popular" : "az";
    try {
      localStorage.setItem(SORT_KEY, sortMode);
    } catch (_) {}
    syncSortToggle();
    renderCategories();
  }

  function renderCategories() {
    const host = $("#categories");
    host.innerHTML = CATEGORIES.map((cat) =>
      catHTML(cat.id, cat.name, `<ul class="items">${sortedItems(cat).map((it) => itemHTML(it.id, it.name)).join("")}</ul>`)
    ).join("") + catHTML("custom", "Something else", `
        <form id="custom-form" class="custom-form" autocomplete="off">
          <label class="sr-only" for="custom-input">Add your own item</label>
          <input id="custom-input" type="text" maxlength="60" placeholder="Add your own gift" />
          <button type="submit" class="btn btn-soft">Add</button>
        </form>
        <ul class="items" id="custom-items"></ul>`);
    // Set names via textContent so preset/custom text is never parsed as HTML.
    CATEGORIES.forEach((cat) =>
      cat.items.forEach((it) => {
        $(`.item[data-id="${it.id}"] .item-name`, host).textContent = it.name;
      })
    );
    $("#custom-form").addEventListener("submit", onCustomSubmit);
    renderCustom();
    $$(".item").forEach(syncItem);
    syncCats();
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

  function syncCats() {
    $$(".group[data-cat]").forEach((g) => {
      const open = g.dataset.cat === openCat;
      $(".cat-head", g).setAttribute("aria-expanded", String(open));
      $(".cat-body", g).hidden = !open;
      g.classList.toggle("is-open", open);
    });
  }

  function toggleCat(id) {
    openCat = openCat === id ? null : id;
    syncCats();
    if (openCat) scrollToCat(openCat);
  }

  // Bring a category's header just below the sticky top bar. Waits a frame so
  // the category that just closed above it has collapsed first.
  function scrollToCat(id) {
    requestAnimationFrame(() => {
      const head = $(`.group[data-cat="${id}"] .cat-head`);
      if (!head) return;
      const bar = $(".topbar").getBoundingClientRect().bottom;
      const top = head.getBoundingClientRect().top + window.scrollY - bar - 12;
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
    });
  }

  function renderSizeChips(li, type) {
    const box = $(".size-chips", li);
    if (!box) return;
    const cur = state.sizes[type];
    let list;
    let isOn;
    if (type === "shoe") {
      const sys = state.shoeSys;
      $$(".mini-seg button", li).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sys === sys)));
      list = SIZE_TYPES.shoe.systems[sys];
      isOn = (v) => !!cur && cur.sys === sys && cur.v === v;
    } else {
      list = SIZE_TYPES[type].list;
      isOn = (v) => cur === v;
    }
    const key = list.join("|") + "#" + JSON.stringify(cur);
    if (box.dataset.key !== key) {
      box.dataset.key = key;
      box.innerHTML = list.map((v) =>
        `<button type="button" class="chip" data-size="${v}" aria-pressed="${isOn(v)}">${v}</button>`).join("");
      scrollSizes(li);
    }
    $(".size-saved", li).textContent = cur ? `Saved for all ${SIZE_TYPES[type].group}` : "";
  }

  // Center the saved size (or a typical one) so people see it was remembered.
  function scrollSizes(li) {
    const box = $(".size-chips", li);
    if (!box) return;
    requestAnimationFrame(() => {
      if (!box.offsetParent) return; // still hidden; runs again when the box opens
      const typical = { US: "7", UK: "6", EU: "39", Kids: "11C" }[state.shoeSys];
      const target = $('.chip[aria-pressed="true"]', box) ||
        $(`.chip[data-size="${itemDef(li.dataset.id).size === "shoe" ? typical : "S"}"]`, box);
      if (target) box.scrollLeft = Math.max(0, target.offsetLeft - box.offsetLeft - (box.clientWidth - target.offsetWidth) / 2);
    });
  }

  function syncItem(li) {
    const id = li.dataset.id;
    const pick = state.picks[id];
    const checked = !!pick;
    li.classList.toggle("is-checked", checked);
    $(".check input", li).checked = checked;
    const star = $(".star", li);
    const isTop = !!(pick && pick.top);
    star.setAttribute("aria-pressed", String(isTop));
    star.textContent = isTop ? "★" : "☆";
    const detailsOpen = checked && openDetails.has(id);
    $(".details-btn", li).setAttribute("aria-expanded", String(detailsOpen));
    $(".more", li).hidden = !detailsOpen;
    if (!pick) {
      $(".item-meta", li).textContent = "";
      return;
    }
    $$(".seg button", li).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === pick.kind)));
    $(".kind-hint", li).textContent = KIND_HINT[kindOf(pick.kind)];
    $$(".chip[data-style]", li).forEach((b) =>
      b.setAttribute("aria-pressed", String(pick.styles.includes(b.dataset.style))));
    const other = $(".other-input", li);
    if (other) {
      const showOther = openOther.has(id) || !!pick.other;
      $(".chip-other", li).setAttribute("aria-pressed", String(showOther));
      other.hidden = !showOther;
      if (document.activeElement !== other) other.value = pick.other || "";
    }
    $$(".chip[data-budget]", li).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.budget === pick.budget)));
    const def = itemDef(id);
    if (def.size) renderSizeChips(li, def.size);
    $$(".swatch", li).forEach((b) => b.setAttribute("aria-pressed", String(pick.colors.includes(b.dataset.color))));
    const colorName = $(".color-name", li);
    if (colorName) colorName.textContent = colorNames(pick) || "Pick any";
    const note = $(".note", li);
    if (document.activeElement !== note) note.value = pick.note || "";
    updateMeta(li);
  }

  // Under the name, show what's tucked inside the closed Size & color box.
  function updateMeta(li) {
    const id = li.dataset.id;
    const pick = state.picks[id];
    const parts = [];
    if (pick && !openDetails.has(id)) {
      const def = itemDef(id);
      if (def.size && sizeText(def.size)) parts.push(sizeText(def.size));
      const colors = hasColor(id) ? colorNames(pick) : "";
      if (colors) parts.push(colors);
      if (pick.note && pick.note.trim()) parts.push(pick.note.trim());
    }
    $(".item-meta", li).textContent = parts.join(" • ");
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
      group.classList.toggle("has-picks", c > 0);
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
    const head = e.target.closest(".cat-head");
    if (head) {
      toggleCat(head.closest(".group").dataset.cat);
      return;
    }
    const li = e.target.closest(".item");
    if (!li) return;
    const id = li.dataset.id;
    const pick = state.picks[id];

    if (e.target.closest(".star")) {
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
        state.picks[id] = pick ? Object.assign(pick, { top: true }) : newPick({ top: true });
      }
      syncItem(li);
      changed();
      return;
    }

    if (e.target.closest(".remove")) {
      state.custom = state.custom.filter((c) => c.id !== id);
      delete state.picks[id];
      li.remove();
      changed();
      return;
    }

    if (!pick) return;
    const t = e.target;

    if (t.closest(".details-btn")) {
      if (openDetails.has(id)) {
        openDetails.delete(id);
      } else {
        openDetails.add(id);
        // Show the tab the saved shoe size is on.
        if (itemDef(id).size === "shoe" && state.sizes.shoe) state.shoeSys = state.sizes.shoe.sys;
      }
      syncItem(li);
      if (openDetails.has(id)) scrollSizes(li);
      return;
    }

    const seg = t.closest(".seg button");
    if (seg) {
      pick.kind = seg.dataset.kind;
    } else if (t.closest(".chip[data-style]")) {
      const st = t.closest(".chip").dataset.style;
      pick.styles = pick.styles.includes(st) ? pick.styles.filter((x) => x !== st) : pick.styles.concat(st);
    } else if (t.closest(".chip-other")) {
      if (openOther.has(id) || pick.other) {
        openOther.delete(id);
        pick.other = "";
      } else {
        openOther.add(id);
        syncItem(li);
        $(".other-input", li).focus();
        return;
      }
    } else if (t.closest(".chip[data-budget]")) {
      const b = t.closest(".chip").dataset.budget;
      pick.budget = pick.budget === b ? "" : b;
    } else if (t.closest(".mini-seg button")) {
      state.shoeSys = t.closest("button").dataset.sys;
      save();
      $$(".item.is-checked").forEach(syncItem);
      scrollSizes(li);
      return;
    } else if (t.closest(".chip[data-size]")) {
      const type = itemDef(id).size;
      const v = t.closest(".chip").dataset.size;
      if (type === "shoe") {
        const cur = state.sizes.shoe;
        if (cur && cur.sys === state.shoeSys && cur.v === v) delete state.sizes.shoe;
        else state.sizes.shoe = { sys: state.shoeSys, v };
      } else if (state.sizes[type] === v) {
        delete state.sizes[type];
      } else {
        state.sizes[type] = v;
      }
      // Every item of this size type shows the shared size.
      $$(".item.is-checked").forEach(syncItem);
      changed();
      return;
    } else if (t.closest(".swatch")) {
      const c = t.closest(".swatch").dataset.color;
      pick.colors = pick.colors.includes(c) ? pick.colors.filter((x) => x !== c) : pick.colors.concat(c);
    } else {
      return;
    }
    syncItem(li);
    changed();
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
      state.picks[id] = state.picks[id] || newPick();
    } else {
      delete state.picks[id];
      openDetails.delete(id);
      openOther.delete(id);
    }
    syncItem(li);
    changed();
  }

  function onListInput(e) {
    const li = e.target.closest(".item");
    if (!li || !state.picks[li.dataset.id]) return;
    const pick = state.picks[li.dataset.id];
    if (e.target.matches(".note")) pick.note = e.target.value;
    else if (e.target.matches(".other-input")) pick.other = e.target.value;
    else return;
    updateMeta(li);
    changed();
  }

  function onCustomSubmit(e) {
    e.preventDefault();
    const input = $("#custom-input");
    const name = input.value.trim().replace(/\s+/g, " ");
    if (!name) return;
    if (isRude(name)) {
      toast(NAUGHTY_TOAST, 3200);
      return;
    }
    const dupe = findDuplicate(name);
    if (dupe) {
      toast({ emoji: "🎁", title: "Already on the list", text: dupe }, 3500);
      return;
    }
    if (regularCount() >= MAX_ITEMS) {
      warnLimit("gifts");
      return;
    }
    const id = "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    state.custom.push({ id, name });
    state.picks[id] = newPick();
    input.value = "";
    renderCustom();
    changed();
    input.focus();
  }

  // "Sneakers", "sneaker" and "SNEAKERS!" all count as the same gift.
  function sameKey(text) {
    return text.toLowerCase().replace(/[^a-z0-9ñ]+/g, " ").trim()
      .split(" ").map((w) => (w.length > 3 ? w.replace(/(es|s)$/, "") : w)).join(" ");
  }

  function findDuplicate(name) {
    const key = sameKey(name);
    for (const cat of CATEGORIES) {
      for (const it of cat.items) {
        const parts = [it.name, ...it.name.split(/\s*(?:\/|\bor\b|\(|\)|,|&)\s*/)];
        if (parts.some((p) => p.trim().length > 2 && sameKey(p) === key)) {
          return `Great minds think alike! "${it.name}" is already on the list under ${cat.name}.`;
        }
      }
    }
    const mine = state.custom.find((c) => sameKey(c.name) === key);
    return mine ? `You already added "${mine.name}". Santa heard you the first time!` : null;
  }

  // Before leaving the list, make sure no note has words that need washing.
  function rudeNoteItem() {
    return Object.keys(state.picks).find((id) =>
      itemName(id) && (isRude(state.picks[id].note || "") || isRude(state.picks[id].other || "")));
  }

  // Re-checked before every step past the list, so a list edited by hand
  // (or saved by an older version) can't sneak past the limits.
  function listProblem() {
    if (regularCount() > MAX_ITEMS) return `Please keep it to ${MAX_ITEMS} gifts plus ${MAX_TOP} favorites.`;
    if (topCount() > MAX_TOP) return `Please keep it to ${MAX_TOP} favorites.`;
    if (rudeNoteItem() || state.custom.some((c) => isRude(c.name))) return NAUGHTY;
    return null;
  }

  // ---------- Steps / routing ----------

  function allowedStep(step) {
    if (step !== "list" && listProblem()) return "list";
    if (step === "name" && pickCount() === 0) return "list";
    if (step === "review" && (pickCount() === 0 || !state.name.trim() || isRude(state.name))) return pickCount() ? "name" : "list";
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
      const problem = listProblem();
      if (problem && step === "list") toast(problem, 3200);
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
          <span class="r-sub">${kindLabelHTML(it.kind)}<span class="r-note"></span></span></span>
          <span class="r-price"></span>`;
        $(".r-name", li).textContent = it.name;
        $(".r-note", li).textContent = it.meta.length ? ` · ${it.meta.join(" • ")}` : "";
        $(".r-price", li).textContent = budgetLabel(it.budget);
        ul.appendChild(li);
      });
      section.append(h, ul);
      host.appendChild(section);
    });
  }

  function kindLabelHTML(kind) {
    const k = kindOf(kind);
    return `<span class="kind kind-${k}">${k === "both" ? "Want | Need" : KIND_LABEL[k]}</span>`;
  }

  // ---------- Step 4: image ----------

  let currentBlob = null;
  let currentURL = null;

  async function renderDone() {
    if (listProblem()) {
      go("list");
      return;
    }
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

  // "Mika's Christmas Wishlist.png", so images on a shared phone are easy to tell apart.
  function fileName() {
    const n = state.name.trim().replace(/[\\/:*?"<>|]+/g, "").trim();
    if (!n) return "My Christmas Wishlist.png";
    return `${n}${/s$/i.test(n) ? "'" : "'s"} Christmas Wishlist.png`;
  }

  let canShareFile = false;

  // Share uses the phone's share sheet when it can; otherwise it saves the
  // image and explains how to send it.
  function setupShareUI(blob) {
    canShareFile = false;
    if (blob && navigator.canShare) {
      try {
        const file = new File([blob], fileName(), { type: "image/png" });
        canShareFile = navigator.canShare({ files: [file] });
      } catch (_) {
        canShareFile = false;
      }
    }
    $("#download-btn").disabled = !blob;
    $("#share-btn").disabled = !blob;
  }

  async function shareImage() {
    if (!currentBlob) return;
    if (!canShareFile) {
      downloadImage(true);
      return;
    }
    const file = new File([currentBlob], fileName(), { type: "image/png" });
    try {
      await navigator.share({ files: [file], title: `${possessive(state.name.trim())} Christmas Wishlist` });
    } catch (err) {
      if (err && err.name !== "AbortError") toast("Sharing didn't work. Try downloading instead.");
    }
  }

  function downloadImage(forShare) {
    if (!currentURL) return;
    const a = document.createElement("a");
    a.href = currentURL;
    a.download = fileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Messenger's built-in browser often ignores downloads.
    if (IN_APP) openSaveHelp();
    else if (forShare === true) toast({ emoji: "📨", title: "Image saved", text: "Open Messenger and send it from your photos." }, 3500);
    else toast({ emoji: "🎁", title: "Image saved", text: "Now send it to the family!" });
  }

  // Canvas drawing — a fixed 1080×1920 (9:16) card that looks the same everywhere.
  const W = 1080;
  const H = 1920;
  const PAD = 64;
  const CONTENT_TOP = 300;
  const CONTENT_BOTTOM = H - 112;
  const C = {
    bg: "#ffffff",
    text: "#1d1d1f",
    muted: "#86868b",
    red: "#c8102e",
    green: "#1f5e3f",
    gold: "#f4c542",
    fav: "#c8102e",
    favInner: "#d8384d", // lighter red box inside Favorites
    box: "#f2f2f5", // Something else
    boxMain: "#e8e8ed", // Also on my list, a tad darker
    inner: "#ffffff",
    hairline: "#e5e5ea",
    flake: "#dedee4",
  };
  // Want / Need pills share one saturation so neither shouts louder.
  const PILL = { want: "#d29a17", need: "#2f9a5c", both: "#70a329" };
  const PILL_SIZE = 16; // text size; every pill uses the same size
  const PILL_H = 28;
  const THEME = {
    fav: { text: "#ffffff", muted: "rgba(255,255,255,0.92)", hairline: "rgba(255,255,255,0.2)" },
    light: { text: C.text, muted: C.muted, hairline: C.hairline },
  };
  const SANS = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  async function ensureFonts() {
    if (!document.fonts || !document.fonts.load) return;
    const loads = Promise.all([400, 500, 600, 700].map((w) => document.fonts.load(`${w} 30px ${SANS}`, "Aa₱")));
    await Promise.race([loads, new Promise((r) => setTimeout(r, 2500))]);
  }

  function cardData() {
    const favorites = [];
    const custom = [];
    const byKind = { want: [], need: [], both: [] };
    pickedGroups().forEach((g) => {
      const perKind = { want: [], need: [], both: [] };
      g.items.forEach((it) => {
        if (it.top) favorites.push(it);
        else if (g.category === CUSTOM_CATEGORY) custom.push(it);
        else perKind[kindOf(it.kind)].push(it);
      });
      KINDS.forEach((k) => {
        if (perKind[k].length) byKind[k].push({ title: g.category.name, items: perKind[k] });
      });
    });
    const kinds = KINDS.filter((k) => byKind[k].length).map((k) => ({ kind: k, cats: byKind[k] }));
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

    // One column, so every box and row shares the same guide lines. Pick the
    // largest text size that fits: short lists read bigger, long lists smaller.
    const attempts = [];
    for (let s = 1.4; s >= 0.56; s -= 0.02) attempts.push({ s, cols: 1 });
    const room = CONTENT_BOTTOM - CONTENT_TOP;
    let plan = null;
    for (const a of attempts) {
      plan = layout(ctx, data, a.s, a.cols);
      if (plan.h <= room) break;
    }
    // Still too tall at the smallest size: lay it out wider, then scale the
    // whole stack down so it lands exactly on the page's guide lines again.
    let k = 1;
    if (plan.h > room) {
      const last = attempts[attempts.length - 1];
      for (let i = 0; i < 4; i++) {
        k = Math.min(1, room / plan.h, k);
        plan = layout(ctx, data, last.s, last.cols, (W - PAD * 2) / k);
      }
      k = Math.min(k, room / plan.h);
    }
    plan.bottom = CONTENT_TOP + plan.h * k;

    // Background, ribbon, snow
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    // Snowflakes sit in the side margins and corners, clear of all content.
    [
      [W - 46, 46, 15], [W - 92, 96, 9], [28, H * 0.24, 10], [W - 28, H * 0.37, 11],
      [28, H * 0.5, 9], [W - 28, H * 0.63, 10], [28, H * 0.76, 11], [W - 28, H * 0.88, 9],
      [W - 46, H - 40, 12], [46, H - 40, 12],
    ].forEach(([x, y, r]) => snowflake(ctx, x, y, r));

    // Short lists: center the title and boxes together so the page stays balanced.
    // "Christmas 2026" always sits at the top center.
    setFont(ctx, 600, 28);
    ctx.fillStyle = C.red;
    ctx.textAlign = "center";
    ctx.fillText(`Christmas ${christmasYear()}`, W / 2, 104);
    ctx.textAlign = "left";

    const spare = Math.max(0, CONTENT_BOTTOM - plan.bottom);
    ctx.save();
    ctx.translate(0, Math.round(spare / 2));

    // Header: title → subtitle

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

    // Content stack, scaled only when a very long list needs it.
    ctx.save();
    ctx.translate(PAD, CONTENT_TOP);
    ctx.scale(k, k);
    plan.draw(ctx);
    ctx.restore();
    ctx.restore();

    // Footer
    setFont(ctx, 600, 26);
    ctx.fillStyle = C.green;
    ctx.textAlign = "center";
    ctx.fillText("Merry Christmas", W / 2, H - 64);
    setFont(ctx, 400, 18);
    ctx.fillStyle = C.muted;
    ctx.fillText("This is a wishlist. Gifts are not guaranteed.", W / 2, H - 28);
    ctx.textAlign = "left";

    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
    );
  }

  // Up to three full-width boxes stacked: Favorites, the rest, Something else.
  // Boxes are measured at width fullW and drawn from (0, 0); the caller
  // positions (and, for very long lists, scales) the whole stack.
  function layout(mctx, data, s, maxCols, fullW = W - PAD * 2) {
    const gap = 24;
    const boxes = [];
    if (data.favorites.length) {
      boxes.push(measureListBox(mctx, {
        title: "Favorites", star: true, items: data.favorites, bg: C.fav, theme: THEME.fav, big: true,
        inner: true, innerBg: C.favInner,
      }, fullW, s));
    }
    if (data.kinds.length) {
      const title = data.favorites.length ? "Also on my list" : "My list";
      boxes.push(measureMainBox(mctx, title, data.kinds, fullW, s, maxCols));
    }
    if (data.custom.length) {
      boxes.push(measureListBox(mctx, {
        title: "Something else", items: data.custom, bg: C.box, theme: THEME.light, inner: true,
      }, fullW, s));
    }

    let y = 0;
    const placed = boxes.map((b) => {
      const p = { b, y };
      y += b.h + gap;
      return p;
    });
    return {
      h: y - gap,
      draw: (ctx) => placed.forEach((p) => p.b.draw(ctx, 0, p.y)),
    };
  }

  // A box of items, each with a small Want/Need pill.
  // A box of items, each with a small Want/Need pill. With o.inner, the
  // rows sit in a white inner box laid out exactly like a category box, so
  // they share the middle box's guide lines.
  function measureListBox(mctx, o, w, s) {
    const padX = 32 * s;
    const padTop = 30 * s;
    const padBottom = (o.inner ? 28 : 12) * s;
    const headerSize = Math.max(o.star ? 19 : 17, (o.star ? 24 : 22) * s);
    const headerH = headerSize + (o.inner ? 18 : 12) * s;
    const innerPad = o.inner ? 22 * s : 0;
    const innerY = o.inner ? 6 * s : 0;
    const rowW = w - padX * 2 - innerPad * 2;
    const rows = o.items.map((it) => measureRow(mctx, it, rowW, s, o.theme, { tag: true, big: o.big }));
    const rowsH = rows.reduce((a, r) => a + r.h, 0) + innerY * 2;
    const h = padTop + headerH + rowsH + padBottom;

    return {
      h,
      draw(ctx, x, y) {
        roundRect(ctx, x, y, w, h, 32);
        ctx.fillStyle = o.bg;
        ctx.fill();

        // Title centered in the box (star included in the width).
        const hy = y + padTop + headerSize * 0.8;
        setFont(ctx, o.star ? 700 : 600, headerSize);
        const starW = o.star ? headerSize * 1.3 : 0;
        let hx = x + (w - starW - ctx.measureText(o.title).width) / 2;
        if (o.star) {
          ctx.fillStyle = C.gold;
          star(ctx, hx + headerSize * 0.45, hy - headerSize * 0.36, headerSize * 0.55);
          hx += starW;
        }
        ctx.fillStyle = o.star ? "#ffffff" : o.theme.muted;
        ctx.fillText(o.title, hx, hy);

        const top = y + padTop + headerH;
        if (o.inner) {
          roundRect(ctx, x + padX, top, w - padX * 2, rowsH, 24);
          ctx.fillStyle = o.innerBg || C.inner;
          ctx.fill();
        }
        const left = x + padX + innerPad;
        let ry = top + innerY;
        rows.forEach((r, i) => {
          if (i > 0) hairline(ctx, left, left + rowW, ry, o.theme.hairline);
          r.draw(ctx, left, ry);
          ry += r.h;
        });
      },
    };
  }

  // The big gray box: Want / Need sections (labels only when both exist),
  // each with category boxes in columns.
  function measureMainBox(mctx, title, kinds, w, s, maxCols) {
    const padX = 32 * s; // same as the other boxes, so all pills share one right edge
    const padTop = 30 * s;
    const padBottom = 28 * s;
    const headerSize = Math.max(17, 22 * s);
    const headerH = headerSize + 18 * s;
    const innerW = w - padX * 2;
    const showLabels = kinds.length > 1;
    const pillSize = Math.max(13, PILL_SIZE * s); // same as the item pills
    const pillH = Math.max(23, PILL_H * s);
    const labelH = showLabels ? pillH + 16 * s : 0;
    const gap = 16 * s;
    const sectionGap = 26 * s;

    const sections = kinds.map((k) => {
      const box = measureSectionBox(mctx, k.cats, innerW, s);
      const count = k.cats.reduce((n, c) => n + c.items.length, 0);
      return { kind: k.kind, count, box, h: labelH + box.h };
    });

    const h = padTop + headerH + sections.reduce((a, sec) => a + sec.h, 0) +
      sectionGap * (sections.length - 1) + padBottom;

    return {
      h,
      draw(ctx, x, y) {
        roundRect(ctx, x, y, w, h, 32);
        ctx.fillStyle = C.boxMain;
        ctx.fill();

        setFont(ctx, 600, headerSize);
        ctx.fillStyle = C.muted;
        ctx.textAlign = "center";
        ctx.fillText(title, x + w / 2, y + padTop + headerSize * 0.8);
        ctx.textAlign = "left";

        let sy = y + padTop + headerH;
        sections.forEach((sec) => {
          if (showLabels) {
            // Count on the left guide line, pill on the right one.
            const cy = sy + pillH / 2;
            const pw = kindPillWidth(ctx, sec.kind, pillSize);
            kindPill(ctx, x + w - padX - pw, cy, sec.kind, pillSize, pillH);
            setFont(ctx, 500, Math.max(15, 19 * s));
            ctx.fillStyle = C.muted;
            ctx.textBaseline = "middle";
            ctx.fillText(`${sec.count} ${sec.count === 1 ? "item" : "items"}`, x + padX, cy);
            ctx.textBaseline = "alphabetic";
          }
          sec.box.draw(ctx, x + padX, sy + labelH);
          sy += sec.h + sectionGap;
        });
      },
    };
  }

  // One white box per Want / Need section; each category is a small
  // sub-heading followed by its gifts.
  function measureSectionBox(mctx, cats, w, s) {
    const padX = 22 * s;
    const padTop = 20 * s;
    const padBottom = 6 * s;
    const headSize = Math.max(14, 17 * s);
    const headH = headSize + 4 * s;
    const catGap = 18 * s;
    const groups = cats.map((cat) => ({
      title: cat.title,
      rows: cat.items.map((it) => measureRow(mctx, it, w - padX * 2, s, THEME.light, {})),
    }));
    const h = padTop + padBottom + groups.reduce((n, g, i) =>
      n + (i ? catGap : 0) + headH + g.rows.reduce((m, r) => m + r.h, 0), 0);

    return {
      h,
      draw(ctx, x, y) {
        roundRect(ctx, x, y, w, h, 24);
        ctx.fillStyle = C.inner;
        ctx.fill();
        let gy = y + padTop;
        groups.forEach((g, i) => {
          if (i) {
            hairline(ctx, x + padX, x + w - padX, gy + catGap / 2, C.hairline);
            gy += catGap;
          }
          setFont(ctx, 600, headSize);
          ctx.fillStyle = C.muted;
          ctx.fillText(fitText(ctx, g.title, w - padX * 2), x + padX, gy + headSize * 0.8);
          gy += headH;
          g.rows.forEach((row, j) => {
            if (j) hairline(ctx, x + padX, x + w - padX, gy, C.hairline);
            row.draw(ctx, x + padX, gy);
            gy += row.h;
          });
        });
      },
    };
  }

  // One item: name (up to 2 lines), optional note below; price and pill on the right.
  function measureRow(mctx, it, w, s, theme, opt) {
    // Every gift name uses the same size and weight, whichever box it's in.
    const nameSize = Math.max(20, 26 * s);
    const nameLH = nameSize * 1.25;
    const metaSize = Math.max(14, 15 * s); // the tiny "Running • US 8" line
    const metaLH = metaSize * 1.45;
    const padY = 12 * s;
    const pillSize = Math.max(13, PILL_SIZE * s);
    const pillH = Math.max(23, PILL_H * s);
    const priceSize = Math.max(17, 21 * s);

    setFont(mctx, 600, pillSize);
    const kind = kindOf(it.kind);
    const pillW = opt.tag ? kindPillWidth(mctx, kind, pillSize) : 0;
    const price = budgetLabel(it.budget);
    setFont(mctx, 500, priceSize);
    const priceW = price ? mctx.measureText(price).width : 0;
    const rightW = (pillW ? pillW + 14 * s : 0) + (priceW ? priceW + 16 * s : 0);

    setFont(mctx, 500, nameSize);
    const nameLines = wrapFirst(mctx, it.name, Math.max(40, w - rightW), w, 2);
    setFont(mctx, 400, metaSize);
    const metaLines = it.meta && it.meta.length ? wrap(mctx, it.meta.join("  •  "), w, 2) : [];
    const h = padY * 2 + nameLines.length * nameLH + (metaLines.length ? 4 * s + metaLines.length * metaLH : 0);

    return {
      h,
      draw(ctx, x, y) {
        const base = y + padY + nameSize * 0.92;
        const mid = base - nameSize * 0.36;
        setFont(ctx, 500, nameSize);
        ctx.fillStyle = theme.text;
        nameLines.forEach((ln, i) => ctx.fillText(ln, x, base + i * nameLH));

        let rx = x + w;
        if (opt.tag) {
          rx -= pillW;
          kindPill(ctx, rx, mid, kind, pillSize, pillH);
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

        if (metaLines.length) {
          setFont(ctx, 400, metaSize);
          ctx.fillStyle = theme.muted;
          const my = base + (nameLines.length - 1) * nameLH + 4 * s + metaLH;
          metaLines.forEach((ln, i) => ctx.fillText(ln, x, my + i * metaLH));
        }
      },
    };
  }

  // Want / Need pills with white text, all the same height. Single pills
  // share one width; Both is a yellow-green "Want | Need" pill with a short
  // divider that stops short of the top and bottom.
  function kindPillWidth(ctx, kind, size) {
    setFont(ctx, 600, size);
    const half = Math.max(ctx.measureText("Want").width, ctx.measureText("Need").width);
    return kind === "both" ? half * 2 + size * 2.6 : half + size * 1.4;
  }

  function kindPill(ctx, x, cy, kind, size, h) {
    const w = kindPillWidth(ctx, kind, size);
    roundRect(ctx, x, cy - h / 2, w, h, h / 2);
    ctx.fillStyle = PILL[kind];
    ctx.fill();
    setFont(ctx, 600, size);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const ty = cy + size * 0.04;
    if (kind === "both") {
      const mid = x + w / 2;
      ctx.fillText("Want", (x + mid) / 2 + size * 0.15, ty);
      ctx.fillText("Need", (mid + x + w) / 2 - size * 0.15, ty);
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = Math.max(1.5, size * 0.1);
      ctx.beginPath();
      ctx.moveTo(mid, cy - h * 0.27);
      ctx.lineTo(mid, cy + h * 0.27);
      ctx.stroke();
    } else {
      ctx.fillText(KIND_LABEL[kind], x + w / 2, ty);
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    return w;
  }

  function hairline(ctx, x1, x2, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x1, y - 1, x2 - x1, 2);
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

  // Like wrap(), but the first line can be narrower than the rest
  // (it shares its row with the price and pill).
  function wrapFirst(ctx, text, firstW, restW, maxLines) {
    const words = text.split(/\s+/);
    let first = words[0];
    let i = 1;
    while (i < words.length && ctx.measureText(first + " " + words[i]).width <= firstW) first += " " + words[i++];
    if (i === words.length) return [fitText(ctx, first, firstW)];
    if (maxLines < 2) return [fitText(ctx, text, firstW)];
    return [fitText(ctx, first, firstW)].concat(wrap(ctx, words.slice(i).join(" "), restW, maxLines - 1));
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
  // Short messages use the same card layout as the limit banners, in gray.
  // msg is a string, or { emoji, title, text }.
  function toast(msg, ms = 2600) {
    const el = $("#toast");
    const m = typeof msg === "string" ? { text: msg } : msg;
    el.innerHTML = `${m.emoji ? '<span class="limit-emoji" aria-hidden="true"></span>' : ""}<span>${m.title ? "<strong></strong>" : ""}<span class="toast-text"></span></span>`;
    if (m.emoji) $(".limit-emoji", el).textContent = m.emoji;
    if (m.title) $("strong", el).textContent = m.title;
    $(".toast-text", el).textContent = m.text || "";
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), ms);
  }

  function renderCountdown() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const xmas = new Date(christmasYear(now), 11, 25);
    const days = Math.round((xmas - today) / 86400000);
    $("#countdown").textContent =
      days === 0 ? "🎄 Merry Christmas!" : `${days} ${days === 1 ? "day" : "days"} until Christmas`;
    $$(".js-year").forEach((el) => (el.textContent = christmasYear(now)));
  }

  // Messenger / Facebook / Instagram open links in their own browser,
  // where downloads often fail. Guide people to their real browser.
  const IN_APP = /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Line\//i.test(navigator.userAgent);

  function openSaveHelp() {
    const modal = $("#save-help");
    modal.hidden = false;
    document.body.classList.add("modal-open");
    setTimeout(() => $(".modal-card", modal).focus(), 50);
  }

  function closeSaveHelp() {
    $("#save-help").hidden = true;
    document.body.classList.remove("modal-open");
    $("#download-btn").focus();
  }

  // ---------- Wire up ----------

  function init() {
    renderCountdown();
    $("#save-help-x").addEventListener("click", closeSaveHelp);
    $("#save-help-ok").addEventListener("click", closeSaveHelp);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#save-help").hidden) closeSaveHelp();
    });
    renderCategories();

    const main = $("main");
    main.addEventListener("click", onListClick);
    main.addEventListener("change", onListChange);
    main.addEventListener("input", onListInput);

    $$("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
    $("#next-btn").addEventListener("click", () => {
      const bad = rudeNoteItem();
      if (bad) {
        const li = $(`.item[data-id="${bad}"]`);
        if (li) {
          const pick = state.picks[bad];
          const field = isRude(pick.other || "") ? $(".other-input", li) : $(".note", li);
          if (field.classList.contains("note")) openDetails.add(bad);
          openCat = li.closest(".group").dataset.cat;
          syncCats();
          syncItem(li);
          field.scrollIntoView({ block: "center" });
          field.focus();
        }
        toast(NAUGHTY_TOAST, 3200);
        return;
      }
      go("name");
    });

    $("#name-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = formatName($("#name-input").value);
      const error = $("#name-error");
      if (!name || isRude(name)) {
        error.textContent = name ? NAUGHTY : "Please enter your first name.";
        error.hidden = false;
        return;
      }
      if (name !== state.name) state.confirmed = false;
      state.name = name;
      save();
      go("review");
    });

    // Remove numbers and symbols as they're typed, and say why.
    $("#name-input").addEventListener("input", (e) => {
      const input = e.target;
      const cleaned = cleanName(input.value);
      const hint = $("#name-hint");
      if (cleaned !== input.value) {
        const pos = Math.max(0, (input.selectionStart || cleaned.length) - (input.value.length - cleaned.length));
        input.value = cleaned;
        try {
          input.setSelectionRange(pos, pos);
        } catch (_) {}
        hint.classList.add("warn");
        clearTimeout(input._hintTimer);
        input._hintTimer = setTimeout(() => hint.classList.remove("warn"), 2500);
      }
      $("#name-error").hidden = true;
    });
    // Show the tidy version when leaving the box.
    $("#name-input").addEventListener("blur", (e) => {
      e.target.value = formatName(e.target.value);
    });

    $("#confirm-btn").addEventListener("click", () => {
      state.confirmed = true;
      save();
      go("done");
    });

    $("#share-btn").addEventListener("click", shareImage);
    $("#sort-toggle").addEventListener("click", toggleSort);
    syncSortToggle();
    $("#download-btn").addEventListener("click", () => downloadImage());
    $("#reset-btn").addEventListener("click", () => {
      if (!confirm("Clear this list and start a new one?")) return;
      state = { picks: {}, custom: [], name: "", confirmed: false, sizes: {}, shoeSys: "US" };
      openDetails.clear();
      openOther.clear();
      openCat = null;
      save();
      renderCategories();
      go("list");
    });

    // Tutorial pop-up: shows each time the link is opened (once per visit, so
    // not again on a refresh); "How it works" opens it anytime.
    const TUTORIAL_KEY = "giftme:tutorial-seen";
    try {
      localStorage.removeItem("giftme:tutorial-hidden"); // older "once per device" flag
    } catch (_) {}
    const modal = $("#tutorial");
    let lastFocus = null;
    const openTutorial = () => {
      lastFocus = document.activeElement;
      modal.hidden = false;
      document.body.classList.add("modal-open");
      setTimeout(() => $(".modal-card").focus(), 50);
    };
    const closeTutorial = () => {
      modal.hidden = true;
      document.body.classList.remove("modal-open");
      if (lastFocus) lastFocus.focus();
    };
    $("#tutorial-x").addEventListener("click", closeTutorial);
    $("#tutorial-continue").addEventListener("click", closeTutorial);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.hidden) closeTutorial();
    });
    $("#tips-show").addEventListener("click", openTutorial);
    let tutorialHidden = false;
    try {
      tutorialHidden = sessionStorage.getItem(TUTORIAL_KEY) === "1";
    } catch (_) {}
    if (!tutorialHidden && !openedFromLink && (location.hash.slice(1) || "list") === "list") {
      openTutorial();
      try {
        sessionStorage.setItem(TUTORIAL_KEY, "1");
      } catch (_) {}
    }

    // Edit link on the last page.
    $("#edit-link-btn").addEventListener("click", async () => {
      const url = editLink();
      try {
        await navigator.clipboard.writeText(url);
        toast({ emoji: "🔗", title: "Edit link copied", text: "Keep it somewhere safe. Open it later to change your list." }, 3500);
      } catch (_) {
        window.prompt("Copy this link. Open it later to change your list:", url);
      }
    });
    if (openedFromLink) {
      setTimeout(() => toast({ emoji: "🎁", title: "Your list is back", text: "Make your changes, then tap Next." }, 3500), 300);
    }

    window.addEventListener("hashchange", onHashChange);
    onHashChange();
  }

  init();
})();
