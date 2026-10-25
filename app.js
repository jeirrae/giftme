(function () {
  "use strict";

  const MAX_TOP = 5;
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
          <button type="button" class="star" aria-pressed="false" aria-label="Top pick">☆</button>
          ${removable ? `<button type="button" class="icon-btn remove" aria-label="Remove item">×</button>` : ""}
        </div>
        <div class="details">
          <div class="seg" role="group" aria-label="Want or need">
            <button type="button" data-kind="want" aria-pressed="true">Want</button>
            <button type="button" data-kind="need" aria-pressed="false">Need</button>
          </div>
          <div class="detail-fields">
            <input type="text" class="note" maxlength="80" placeholder="Note: size, color, brand…" aria-label="Note" />
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
    $("#tally-count").textContent = `${n} ${n === 1 ? "item" : "items"}`;
    const top = $("#tally-top");
    top.textContent = `${t}/${MAX_TOP} top picks`;
    top.classList.toggle("full", t >= MAX_TOP);
    $("#next-btn").disabled = n === 0;

    // Disable stars that can't be pressed anymore.
    $$(".star").forEach((s) => {
      s.disabled = t >= MAX_TOP && s.getAttribute("aria-pressed") !== "true";
    });
    $$(".group[data-cat]").forEach((group) => {
      const c = $$(".item.is-checked", group).length;
      $(".cat-count", group).textContent = c ? `${c} picked` : "";
    });
  }

  function onListClick(e) {
    const li = e.target.closest(".item");
    if (!li) return;
    const id = li.dataset.id;

    if (e.target.closest(".star")) {
      const pick = state.picks[id];
      if (pick && pick.top) {
        pick.top = false;
      } else if (topCount() >= MAX_TOP) {
        toast(`You can only have ${MAX_TOP} top picks.`);
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
    if (tops.length) groups.push({ title: "★ Top picks", items: tops });
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

  // Canvas drawing — always a light card so it looks the same everywhere.
  const W = 1080;
  const H = 1350;
  const PAD = 72;
  const C = {
    bg: "#ffffff",
    box: "#f5f5f7",
    text: "#1d1d1f",
    muted: "#86868b",
    hairline: "#e3e3e8",
    red: "#c8102e",
    green: "#1e7b4e",
    amber: "#b07400",
    gold: "#f5b300",
  };
  const SANS = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  async function ensureFonts() {
    if (!document.fonts || !document.fonts.load) return;
    const loads = Promise.all([400, 500, 600, 700].map((w) => document.fonts.load(`${w} 30px ${SANS}`)));
    await Promise.race([loads, new Promise((r) => setTimeout(r, 2500))]);
  }

  async function drawCard() {
    await ensureFonts();
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    let ctx = canvas.getContext("2d");

    const groups = pickedGroups();
    const tops = [];
    groups.forEach((g) => g.items.forEach((it) => it.top && tops.push(it)));
    const rest = groups
      .map((g) => ({ title: g.category.name, items: g.items.filter((it) => !it.top) }))
      .filter((g) => g.items.length);
    const total = pickCount();

    const top = 300;
    const footerH = 110;

    // Fit into 1080×1350: one column, then two, shrinking a little.
    // Long lists never get cut off; the image grows taller instead.
    const attempts = [];
    for (let s = 1; s >= 0.8; s -= 0.05) attempts.push({ cols: 1, s });
    for (let s = 0.94; s >= 0.78; s -= 0.04) attempts.push({ cols: 2, s });
    let plan = null;
    for (const a of attempts) {
      plan = layout(ctx, tops, rest, a.cols, a.s, top);
      if (plan.bottom <= H - footerH) break;
      plan = null;
    }
    if (!plan) plan = layout(ctx, tops, rest, 2, 0.86, top);
    const height = Math.max(H, Math.ceil(plan.bottom + footerH));
    if (height !== canvas.height) {
      canvas.height = height; // resets context state
      ctx = canvas.getContext("2d");
    }

    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, height);

    // Header: eyebrow → title → subtitle
    let y = PAD + 28;
    setFont(ctx, 600, 28);
    ctx.fillStyle = C.red;
    ctx.fillText(`Christmas ${christmasYear()}`, PAD, y);

    const title = `${possessive(state.name.trim())} Wishlist`;
    let size = 80;
    spaced(ctx, -0.03 * size);
    setFont(ctx, 700, size);
    while (ctx.measureText(title).width > W - PAD * 2 && size > 52) {
      size -= 2;
      spaced(ctx, -0.03 * size);
      setFont(ctx, 700, size);
    }
    y += 18 + 80;
    ctx.fillStyle = C.text;
    ctx.fillText(fitText(ctx, title, W - PAD * 2), PAD - 3, y);
    spaced(ctx, 0);

    y += 50;
    setFont(ctx, 500, 28);
    ctx.fillStyle = C.muted;
    const t = tops.length;
    ctx.fillText(
      `${total} ${total === 1 ? "item" : "items"}${t ? ` · ${t} top ${t === 1 ? "pick" : "picks"}` : ""}`,
      PAD,
      y
    );

    plan.draw(ctx);

    // Footer
    setFont(ctx, 600, 24);
    ctx.fillStyle = C.green;
    ctx.textAlign = "center";
    ctx.fillText("Merry Christmas", W / 2, height - 52);
    ctx.textAlign = "left";

    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
    );
  }

  // Top picks span the full width; categories are placed as rounded boxes
  // into the shortest column. Returns { fits, draw }.
  function layout(mctx, tops, rest, cols, s, top) {
    const fullW = W - PAD * 2;
    const gap = 24;
    const boxes = [];
    let y = top;

    if (tops.length) {
      const box = measureBox(mctx, "Top picks", tops, fullW, s, { star: true });
      boxes.push({ box, x: PAD, y });
      y += box.h + gap;
    }

    const colW = (fullW - gap * (cols - 1)) / cols;
    const heights = new Array(cols).fill(y);
    rest.forEach((g) => {
      const box = measureBox(mctx, g.title, g.items, colW, s, {});
      const col = heights.indexOf(Math.min(...heights));
      boxes.push({ box, x: PAD + col * (colW + gap), y: heights[col] });
      heights[col] += box.h + gap;
    });

    return {
      bottom: Math.max(...heights) - gap,
      draw: (ctx) => boxes.forEach((b) => b.box.draw(ctx, b.x, b.y)),
    };
  }

  function measureBox(mctx, title, items, w, s, opts) {
    const padX = 30 * s;
    const padTop = 26 * s;
    const padBottom = 8 * s;
    const headerSize = 22 * s;
    const headerH = headerSize + 8 * s;
    const innerW = w - padX * 2;
    const rows = items.map((it) => measureRow(mctx, it, innerW, s));
    const h = padTop + headerH + rows.reduce((a, r) => a + r.h, 0) + padBottom;

    return {
      h,
      draw(ctx, x, y) {
        roundRect(ctx, x, y, w, h, 28);
        ctx.fillStyle = C.box;
        ctx.fill();

        let hx = x + padX;
        const hy = y + padTop + headerSize * 0.8;
        if (opts.star) {
          ctx.fillStyle = C.gold;
          star(ctx, hx + headerSize * 0.45, hy - headerSize * 0.36, headerSize * 0.52);
          hx += headerSize * 1.25;
        }
        setFont(ctx, 600, headerSize);
        ctx.fillStyle = C.muted;
        ctx.fillText(fitText(ctx, title, x + w - padX - hx), hx, hy);

        let ry = y + padTop + headerH;
        rows.forEach((r, i) => {
          if (i > 0) hairline(ctx, x + padX, x + w - padX, ry);
          r.draw(ctx, x + padX, ry);
          ry += r.h;
        });
      },
    };
  }

  function measureRow(mctx, it, w, s) {
    const nameSize = 28 * s;
    const nameLH = nameSize * 1.25;
    const subSize = 21 * s;
    const subLH = subSize * 1.45;
    const padY = 14 * s;

    const price = formatPrice(it.price);
    setFont(mctx, 500, 24 * s);
    const priceW = price ? mctx.measureText(price).width + 20 * s : 0;

    setFont(mctx, 500, nameSize);
    const nameLines = wrap(mctx, it.name, w - priceW, 2);

    const kind = it.kind === "need" ? "Need" : "Want";
    const note = (it.note || "").trim();
    const h = padY * 2 + nameLines.length * nameLH + subLH;

    return {
      h,
      draw(ctx, x, y) {
        const base = y + padY + nameSize * 0.92;
        setFont(ctx, 500, nameSize);
        ctx.fillStyle = C.text;
        nameLines.forEach((ln, i) => ctx.fillText(ln, x, base + i * nameLH));

        if (price) {
          setFont(ctx, 500, 24 * s);
          ctx.fillStyle = C.muted;
          ctx.textAlign = "right";
          ctx.fillText(price, x + w, base);
          ctx.textAlign = "left";
        }

        // Secondary line: "Want · note"
        const sy = base + (nameLines.length - 1) * nameLH + subLH;
        setFont(ctx, 600, subSize);
        ctx.fillStyle = it.kind === "need" ? C.green : C.amber;
        ctx.fillText(kind, x, sy);
        if (note) {
          const kw = ctx.measureText(kind).width;
          setFont(ctx, 400, subSize);
          ctx.fillStyle = C.muted;
          ctx.fillText(fitText(ctx, ` · ${note}`, w - kw), x + kw, sy);
        }
      },
    };
  }

  function hairline(ctx, x1, x2, y) {
    ctx.fillStyle = C.hairline;
    ctx.fillRect(x1, y - 1, x2 - x1, 2);
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

    window.addEventListener("hashchange", onHashChange);
    onHashChange();
  }

  init();
})();
