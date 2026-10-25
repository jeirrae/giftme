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
      <div class="card" data-cat="${cat.id}">
        <h2 class="cat-title"><span aria-hidden="true">${cat.emoji || ""}</span> ${escapeHTML(cat.name)}
          <span class="cat-count"></span></h2>
        <ul class="items">${cat.items.map((it) => itemHTML(it.id, it.name)).join("")}</ul>
      </div>`
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
    $$(".card[data-cat]").forEach((card) => {
      const c = $$(".item.is-checked", card).length;
      $(".cat-count", card).textContent = c ? `${c} picked` : "";
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
      if (rest.length) groups.push({ title: `${g.category.emoji || ""} ${g.category.name}`, items: rest });
    });

    groups.forEach((g) => {
      const card = document.createElement("div");
      card.className = "card review-group";
      const h = document.createElement("h2");
      h.textContent = g.title;
      const ul = document.createElement("ul");
      g.items.forEach((it) => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="tag tag-${it.kind}">${it.kind}</span>
          <span class="r-main"><span class="r-name"></span><span class="r-note"></span></span>
          <span class="r-price"></span>`;
        $(".r-name", li).textContent = it.name;
        const note = $(".r-note", li);
        if (it.note && it.note.trim()) note.textContent = it.note.trim();
        else note.remove();
        $(".r-price", li).textContent = formatPrice(it.price);
        ul.appendChild(li);
      });
      card.append(h, ul);
      host.appendChild(card);
    });
  }

  // ---------- Step 4: image ----------

  let currentBlob = null;
  let currentURL = null;

  async function renderDone() {
    const img = $("#preview-img");
    const loading = $("#preview-loading");
    loading.hidden = false;
    img.removeAttribute("src");
    setupShareUI(null);

    try {
      const blob = await drawCard();
      currentBlob = blob;
      if (currentURL) URL.revokeObjectURL(currentURL);
      currentURL = URL.createObjectURL(blob);
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
  const PAD = 80;
  const C = {
    bg: "#ffffff",
    text: "#17201b",
    muted: "#7a847e",
    line: "#eceeea",
    red: "#c8202f",
    redSoft: "#fdecee",
    green: "#1d6b45",
    greenSoft: "#e8f3ed",
    gold: "#e0a526",
    topBg: "#fff8ec",
  };
  const SANS = '"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const SERIF = 'Fraunces, Georgia, serif';

  async function ensureFonts() {
    if (!document.fonts || !document.fonts.load) return;
    const loads = Promise.all([
      document.fonts.load(`700 80px ${SERIF}`),
      document.fonts.load(`700 30px ${SANS}`),
      document.fonts.load(`600 30px ${SANS}`),
      document.fonts.load(`500 30px ${SANS}`),
    ]);
    await Promise.race([loads, new Promise((r) => setTimeout(r, 2500))]);
  }

  async function drawCard() {
    await ensureFonts();
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    const groups = pickedGroups();
    const tops = [];
    groups.forEach((g) => g.items.forEach((it) => it.top && tops.push(it)));
    const rest = groups
      .map((g) => ({ category: g.category, items: g.items.filter((it) => !it.top) }))
      .filter((g) => g.items.length);
    const total = pickCount();

    // Background + accents
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.red;
    ctx.fillRect(0, 0, W / 2, 12);
    ctx.fillStyle = C.green;
    ctx.fillRect(W / 2, 0, W / 2, 12);
    drawTree(ctx, W - PAD - 70, 96, 1);

    // Header
    let y = 128;
    setFont(ctx, 700, 24, SANS);
    ctx.fillStyle = C.red;
    spaced(ctx, 0.18 * 24);
    ctx.fillText(`CHRISTMAS ${christmasYear()}`, PAD, y);
    spaced(ctx, 0);

    const title = `${possessive(state.name.trim())} Wishlist`;
    let size = 84;
    setFont(ctx, 700, size, SERIF);
    while (ctx.measureText(title).width > W - PAD * 2 - 130 && size > 48) {
      size -= 2;
      setFont(ctx, 700, size, SERIF);
    }
    y += 20 + size;
    ctx.fillStyle = C.text;
    ctx.fillText(fitText(ctx, title, W - PAD * 2 - 130), PAD, y);

    y += 52;
    setFont(ctx, 500, 26, SANS);
    ctx.fillStyle = C.muted;
    const t = tops.length;
    ctx.fillText(
      `${total} ${total === 1 ? "item" : "items"}${t ? ` · ${t} top ${t === 1 ? "pick" : "picks"}` : ""}`,
      PAD,
      y
    );

    const contentTop = y + 44;
    const contentBottom = H - 120;

    // Fit content: try one column, then two, shrinking text as needed.
    const attempts = [];
    for (let s = 1; s >= 0.76; s -= 0.04) attempts.push({ cols: 1, s });
    for (let s = 0.9; s >= 0.6; s -= 0.03) attempts.push({ cols: 2, s });
    let plan = null;
    for (const a of attempts) {
      plan = layout(ctx, tops, rest, a.cols, a.s, contentTop, contentBottom, false);
      if (plan.fits) break;
    }
    if (!plan.fits) {
      const last = attempts[attempts.length - 1];
      plan = layout(ctx, tops, rest, last.cols, last.s, contentTop, contentBottom, true);
    }
    plan.draw();

    // Footer
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD, H - 96);
    ctx.lineTo(W - PAD, H - 96);
    ctx.stroke();
    setFont(ctx, 600, 24, SANS);
    ctx.fillStyle = C.green;
    ctx.fillText("Merry Christmas! 🎄", PAD, H - 50);
    setFont(ctx, 500, 22, SANS);
    ctx.fillStyle = C.muted;
    ctx.textAlign = "right";
    ctx.fillText("Family Christmas Wishlist", W - PAD, H - 50);
    ctx.textAlign = "left";

    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
    );
  }

  // Builds a draw plan. Returns { fits, draw }.
  function layout(ctx, tops, rest, cols, s, top, bottom, truncate) {
    const ops = [];
    let y = top;
    const fullW = W - PAD * 2;

    // Top picks block (full width)
    if (tops.length) {
      const innerPad = 28 * s;
      const rows = tops.map((it) => measureItem(ctx, it, fullW - innerPad * 2, s, true));
      const headerH = 46 * s;
      const blockH = innerPad * 2 + headerH + rows.reduce((a, r) => a + r.h, 0);
      const by = y;
      ops.push(() => {
        roundRect(ctx, PAD, by, fullW, blockH, 24);
        ctx.fillStyle = C.topBg;
        ctx.fill();
        setFont(ctx, 700, 22 * s, SANS);
        ctx.fillStyle = C.gold;
        spaced(ctx, 0.14 * 22 * s);
        ctx.fillText("★ TOP PICKS", PAD + innerPad, by + innerPad + 22 * s);
        spaced(ctx, 0);
        let ry = by + innerPad + headerH;
        rows.forEach((r) => {
          r.draw(PAD + innerPad, ry);
          ry += r.h;
        });
      });
      y += blockH + 36 * s;
    }

    // Remaining items flow into columns
    const gap = 48;
    const colW = (fullW - gap * (cols - 1)) / cols;
    const rows = [];
    rest.forEach((g) => {
      rows.push({ header: true, ...measureHeader(ctx, g.category, colW, s) });
      g.items.forEach((it) => rows.push(measureItem(ctx, it, colW, s, false)));
    });

    const colTop = y;
    let col = 0;
    let cy = colTop;
    let placed = 0;
    let fits = true;
    const moreH = 40 * s;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const next = rows[i + 1];
      // Keep a header together with its first item.
      const need = r.header && next ? r.h + next.h : r.h;
      const limit = truncate ? bottom - moreH : bottom;
      if (cy + need > limit) {
        if (col < cols - 1) {
          col++;
          cy = colTop;
        }
        if (cy + need > limit) {
          fits = false;
          break;
        }
      }
      const x = PAD + col * (colW + gap);
      const ry = cy;
      ops.push(() => r.draw(x, ry));
      cy += r.h;
      placed++;
    }
    if (colTop > bottom) fits = false;

    if (!fits && truncate) {
      const remaining = rows.slice(placed).filter((r) => !r.header).length;
      if (remaining > 0) {
        const x = PAD + col * (colW + gap);
        const ry = Math.min(cy, bottom - moreH);
        ops.push(() => {
          setFont(ctx, 600, 24 * s, SANS);
          ctx.fillStyle = C.muted;
          ctx.fillText(`+ ${remaining} more ${remaining === 1 ? "item" : "items"}`, x, ry + 28 * s);
        });
      }
    }

    return { fits, draw: () => ops.forEach((op) => op()) };
  }

  function measureHeader(ctx, category, colW, s) {
    const size = 21 * s;
    const h = 64 * s;
    return {
      h,
      draw(x, y) {
        setFont(ctx, 700, size, SANS);
        ctx.fillStyle = C.muted;
        spaced(ctx, 0.12 * size);
        const label = `${category.emoji ? category.emoji + "  " : ""}${category.name.toUpperCase()}`;
        ctx.fillText(fitText(ctx, label, colW), x, y + h - 18 * s);
        spaced(ctx, 0);
      },
    };
  }

  function measureItem(ctx, it, colW, s, isTop) {
    const nameSize = (isTop ? 32 : 29) * s;
    const noteSize = 22 * s;
    const lineH = nameSize * 1.3;
    const noteLineH = noteSize * 1.35;
    const markerW = 36 * s;
    const padY = 12 * s;

    const tagText = it.kind === "need" ? "NEED" : "WANT";
    const tagSize = 16 * s;
    setFont(ctx, 700, tagSize, SANS);
    spaced(ctx, 0.08 * tagSize);
    const tagW = ctx.measureText(tagText).width + 20 * s;
    spaced(ctx, 0);
    const tagH = 30 * s;

    const price = formatPrice(it.price);
    setFont(ctx, 600, 24 * s, SANS);
    const priceW = price ? ctx.measureText(price).width + 14 * s : 0;

    const rightW = tagW + priceW + 14 * s;
    const textW = colW - markerW - rightW;
    setFont(ctx, isTop ? 700 : 600, nameSize, SANS);
    const nameLines = wrap(ctx, it.name, textW, 2);
    setFont(ctx, 500, noteSize, SANS);
    const note = (it.note || "").trim();
    const noteLines = note ? wrap(ctx, note, colW - markerW, 2) : [];

    const h = padY * 2 + nameLines.length * lineH + noteLines.length * noteLineH;

    return {
      h,
      draw(x, y) {
        const firstBase = y + padY + nameSize;
        // Marker
        const cx = x + 11 * s;
        const cyy = firstBase - nameSize * 0.36;
        ctx.beginPath();
        ctx.arc(cx, cyy, 9 * s, 0, Math.PI * 2);
        ctx.fillStyle = it.kind === "need" ? C.green : C.red;
        ctx.fill();

        // Name
        setFont(ctx, isTop ? 700 : 600, nameSize, SANS);
        ctx.fillStyle = C.text;
        nameLines.forEach((ln, i) => ctx.fillText(ln, x + markerW, firstBase + i * lineH));

        // Note
        if (noteLines.length) {
          setFont(ctx, 500, noteSize, SANS);
          ctx.fillStyle = C.muted;
          const ny = firstBase + (nameLines.length - 1) * lineH + noteLineH + 2 * s;
          noteLines.forEach((ln, i) => ctx.fillText(ln, x + markerW, ny + i * noteLineH));
        }

        // Price + tag on the right, aligned with first line
        let rx = x + colW;
        rx -= tagW;
        roundRect(ctx, rx, cyy - tagH / 2, tagW, tagH, 8 * s);
        ctx.fillStyle = it.kind === "need" ? C.greenSoft : C.redSoft;
        ctx.fill();
        setFont(ctx, 700, tagSize, SANS);
        spaced(ctx, 0.08 * tagSize);
        ctx.fillStyle = it.kind === "need" ? C.green : C.red;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tagText, rx + tagW / 2, cyy + 1);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        spaced(ctx, 0);
        if (price) {
          setFont(ctx, 600, 24 * s, SANS);
          ctx.fillStyle = C.muted;
          ctx.textAlign = "right";
          ctx.fillText(price, rx - 14 * s, firstBase - 2 * s);
          ctx.textAlign = "left";
        }
      },
    };
  }

  function drawTree(ctx, x, y, s) {
    // Minimal stacked-triangle tree with a star
    ctx.fillStyle = C.green;
    const tiers = [
      [0, 26, 26],
      [18, 38, 40],
      [40, 52, 50],
    ];
    tiers.forEach(([dy, half, h]) => {
      ctx.beginPath();
      ctx.moveTo(x + 52 * s, y + dy * s);
      ctx.lineTo(x + (52 - half) * s, y + (dy + h) * s);
      ctx.lineTo(x + (52 + half) * s, y + (dy + h) * s);
      ctx.closePath();
      ctx.fill();
    });
    ctx.fillStyle = "#8a5a3c";
    ctx.fillRect(x + 46 * s, y + 90 * s, 12 * s, 14 * s);
    ctx.fillStyle = C.gold;
    star(ctx, x + 52 * s, y - 6 * s, 12 * s);
    ctx.fillStyle = C.red;
    [
      [40, 50],
      [64, 62],
      [34, 80],
      [70, 86],
    ].forEach(([ox, oy]) => {
      ctx.beginPath();
      ctx.arc(x + ox * s, y + oy * s, 4.5 * s, 0, Math.PI * 2);
      ctx.fill();
    });
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

  function setFont(ctx, weight, size, family) {
    ctx.font = `${weight} ${Math.round(size * 10) / 10}px ${family}`;
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
