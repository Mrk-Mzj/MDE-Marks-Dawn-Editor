// Runs in the MDE page: converts what is on screen into a layered SVG.
(() => {
  const W = innerWidth;
  const H = innerHeight;

  // ---------- Colours ----------
  const canvas1 = document.createElement("canvas");
  canvas1.width = canvas1.height = 1;
  const c1 = canvas1.getContext("2d", { willReadFrequently: true });
  const gamma = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  const clamp = (x) => Math.min(1, Math.max(0, x));
  function oklab(L, a, b) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ].map((x) => Math.round(clamp(gamma(x)) * 255));
  }
  const num = (v) => (v.endsWith("%") ? parseFloat(v) / 100 : v === "none" ? 0 : parseFloat(v));
  /** {r,g,b,a} or null when transparent. */
  function color(str) {
    if (!str || str === "transparent" || str === "none") return null;
    let m;
    let out;
    if ((m = str.match(/^rgba?\(([^)]+)\)$/))) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean);
      out = { r: +p[0], g: +p[1], b: +p[2], a: p[3] === undefined ? 1 : num(p[3]) };
    } else if ((m = str.match(/^oklch\(([^)]+)\)$/))) {
      const [main, alpha] = m[1].split("/");
      const [L, C, h] = main.trim().split(/\s+/).map(num);
      const rad = (h * Math.PI) / 180;
      const [r, g, b] = oklab(L, C * Math.cos(rad), C * Math.sin(rad));
      out = { r, g, b, a: alpha === undefined ? 1 : num(alpha.trim()) };
    } else if ((m = str.match(/^oklab\(([^)]+)\)$/))) {
      const [main, alpha] = m[1].split("/");
      const [L, a, bb] = main.trim().split(/\s+/).map(num);
      const [r, g, b] = oklab(L, a, bb);
      out = { r, g, b, a: alpha === undefined ? 1 : num(alpha.trim()) };
    } else if ((m = str.match(/^color\(srgb ([^)]+)\)$/))) {
      const [main, alpha] = m[1].split("/");
      const [r, g, b] = main.trim().split(/\s+/).map((v) => Math.round(clamp(num(v)) * 255));
      out = { r, g, b, a: alpha === undefined ? 1 : num(alpha.trim()) };
    } else {
      c1.clearRect(0, 0, 1, 1);
      c1.fillStyle = str;
      c1.fillRect(0, 0, 1, 1);
      const d = c1.getImageData(0, 0, 1, 1).data;
      out = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
    }
    out.a = Math.round(out.a * 1000) / 1000;
    return out.a <= 0 ? null : out;
  }
  const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("");

  // Tokens, so every shape can say which one it shows.
  const tokenNames = [
    "background", "foreground", "card", "popover", "primary", "secondary", "muted", "accent",
    "muted-foreground", "destructive", "border", "input", "ring", "warning", "search-match", "search-current",
    "topbar", "tab", "toolbar", "statusbar", "statusbar-foreground", "scrollbar", "content-foreground", "content-strong",
  ];
  const rootStyle = getComputedStyle(document.documentElement);
  const tokens = tokenNames.map((name) => {
    const raw = rootStyle.getPropertyValue("--" + name).trim();
    const probe = document.createElement("div");
    probe.style.color = `var(--${name})`;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return { name, raw, c: color(resolved) };
  });
  const key = (c) => `${c.r},${c.g},${c.b}`;
  function tokenOf(c) {
    if (!c) return "";
    const exact = tokens.filter((t) => t.c && key(t.c) === key(c) && Math.abs(t.c.a - c.a) < 0.006).map((t) => t.name);
    if (exact.length) return exact.join("/");
    const sameRgb = tokens.filter((t) => t.c && key(t.c) === key(c) && t.c.a === 1).map((t) => t.name);
    if (sameRgb.length) return `${sameRgb.join("/")} ${Math.round(c.a * 100)}%`;
    return hex(c) + (c.a < 1 ? ` ${Math.round(c.a * 100)}%` : "");
  }

  // ---------- SVG output helpers ----------
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const f = (n) => String(Math.round(n * 100) / 100);
  const ids = new Map();
  function idFor(name) {
    const slug =
      name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/ł/g, "l").replace(/Ł/g, "L")
        .replace(/[^A-Za-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "el";
    const base = /^[A-Za-z]/.test(slug) ? slug : "el-" + slug;
    const n = (ids.get(base) || 0) + 1;
    ids.set(base, n);
    return n === 1 ? base : `${base}_${n}`;
  }
  const named = (name) => `id="${idFor(name)}" serif:id="${esc(name)}"`;
  function paint(attr, c, opacity) {
    const a = c.a * opacity;
    return `${attr}="${hex(c)}"` + (a < 0.999 ? ` ${attr}-opacity="${f(Math.round(a * 1000) / 1000)}"` : "");
  }
  function roundRect(x, y, w, h, [tl, tr, br, bl]) {
    const lim = (r) => Math.max(0, Math.min(r, w / 2, h / 2));
    [tl, tr, br, bl] = [tl, tr, br, bl].map(lim);
    if (!tl && !tr && !br && !bl) return null;
    return (
      `M${f(x + tl)} ${f(y)}H${f(x + w - tr)}` +
      (tr ? `A${f(tr)} ${f(tr)} 0 0 1 ${f(x + w)} ${f(y + tr)}` : "") +
      `V${f(y + h - br)}` +
      (br ? `A${f(br)} ${f(br)} 0 0 1 ${f(x + w - br)} ${f(y + h)}` : "") +
      `H${f(x + bl)}` +
      (bl ? `A${f(bl)} ${f(bl)} 0 0 1 ${f(x)} ${f(y + h - bl)}` : "") +
      `V${f(y + tl)}` +
      (tl ? `A${f(tl)} ${f(tl)} 0 0 1 ${f(x + tl)} ${f(y)}` : "") +
      "Z"
    );
  }
  function shape(name, x, y, w, h, radii, fillAttr) {
    const d = radii && roundRect(x, y, w, h, radii);
    return d
      ? `<path ${named(name)} d="${d}" ${fillAttr}/>`
      : `<rect ${named(name)} x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" ${fillAttr}/>`;
  }

  // ---------- Names of the parts of the app ----------
  function label(el) {
    const text = (s) => (s || "").replace(/\s+/g, " ").trim();
    const short = (s) => (s.length > 40 ? s.slice(0, 39) + "…" : s);
    const byId = {
      "menu-button": "Przycisk menu", tabs: "Zakładki", toolbar: "Pasek formatowania", "editor-area": "Edytor (lewy panel)",
      editor: "Edytor", preview: "Podgląd", "char-count": "Licznik znaków", "spell-status": "Przycisk pisowni",
      "minimap-status": "Przycisk minimapy", "panes-status": "Przycisk trybu okien", "sync-status": "Przycisk przewijania razem",
    };
    if (el.id && byId[el.id]) return byId[el.id];
    const slot = el.dataset?.slot;
    const bySlot = { topbar: "Górny pasek", statusbar: "Pasek stanu", "editor-pane": "Panel edytora", "preview-pane": "Panel podglądu" };
    if (slot && bySlot[slot]) return bySlot[slot];
    const cls = el.classList;
    if (cls.contains("tab")) return `Zakładka: ${text(el.querySelector(".tab-title")?.textContent)}${el.getAttribute("aria-selected") === "true" ? " (aktywna)" : ""}`;
    if (cls.contains("tab-dot")) return "Kropka niezapisanych zmian";
    if (cls.contains("minimap")) return "Minimapa";
    if (cls.contains("minimap-slider")) return "Suwak minimapy";
    if (cls.contains("pane-divider")) return "Linia podziału paneli";
    if (cls.contains("workspace")) return "Panele";
    if (cls.contains("cm-scroller")) return "Obszar tekstu";
    if (cls.contains("cm-line")) return "Linia: " + short(text(el.textContent) || "(pusta)");
    if (cls.contains("cm-cursor")) return "Kursor";
    if (cls.contains("task-box")) return "Pole zadania";
    if (cls.contains("blank-line")) return null;
    const tag = el.tagName.toLowerCase();
    if (tag === "button") return "Przycisk: " + (el.getAttribute("aria-label") || el.title || text(el.textContent) || "?");
    const byTag = { h1: "Nagłówek 1", h2: "Nagłówek 2", h3: "Nagłówek 3", h4: "Nagłówek 4", p: "Akapit", ul: "Lista", ol: "Lista numerowana", li: "Punkt", blockquote: "Cytat", pre: "Blok kodu", table: "Tabela", tr: "Wiersz tabeli", th: "Komórka nagłówka", td: "Komórka", a: "Link", code: "Kod w linii", kbd: "Klawisz (kbd)", strong: "Pogrubienie", em: "Kursywa" };
    if (byTag[tag]) {
      const t = text(el.textContent);
      return ["h1", "h2", "h3", "h4", "p", "li", "a", "th", "td", "code", "kbd"].includes(tag) && t ? `${byTag[tag]}: ${short(t)}` : byTag[tag];
    }
    if (el.id) return "#" + el.id;
    if (slot) return slot;
    return null;
  }

  // ---------- Text measuring ----------
  const baselineCache = new Map();
  /** Distance from the top of a text box (its content area) to the baseline, and the content area's height. */
  function metrics(style) {
    const k = `${style.fontFamily}|${style.fontSize}|${style.fontWeight}|${style.fontStyle}`;
    if (baselineCache.has(k)) return baselineCache.get(k);
    const box = document.createElement("div");
    box.style.cssText = `position:absolute;left:0;top:0;visibility:hidden;line-height:normal;white-space:nowrap;font-family:${style.fontFamily};font-size:${style.fontSize};font-weight:${style.fontWeight};font-style:${style.fontStyle}`;
    const span = document.createElement("span");
    span.textContent = "Hg";
    const mark = document.createElement("span");
    mark.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
    box.append(span, mark);
    document.body.append(box);
    const sr = span.getClientRects()[0];
    const m = { ascent: mark.getBoundingClientRect().bottom - sr.top, height: sr.height };
    box.remove();
    baselineCache.set(k, m);
    return m;
  }
  const measureCtx = document.createElement("canvas").getContext("2d");
  const family = (s) => s.split(",")[0].trim().replace(/^["']|["']$/g, "");
  function textAttrs(style, c, opacity) {
    let a = `font-family="${esc(family(style.fontFamily))}" font-size="${f(parseFloat(style.fontSize))}"`;
    if (style.fontWeight !== "400") a += ` font-weight="${style.fontWeight}"`;
    if (style.fontStyle !== "normal") a += ` font-style="${style.fontStyle}"`;
    if (style.letterSpacing !== "normal" && parseFloat(style.letterSpacing)) a += ` letter-spacing="${f(parseFloat(style.letterSpacing))}"`;
    return a + " " + paint("fill", c, opacity);
  }

  // ---------- Walking the page ----------
  const defs = [];
  let clipCount = 0;
  const outside = (r, clip) => r.right <= clip.left || r.left >= clip.right || r.bottom <= clip.top || r.top >= clip.bottom;

  function emitText(node, style, ctx) {
    const c = color(style.color);
    if (!c) return;
    const range = document.createRange();
    const s = node.data;
    const lines = [];
    let cur = null;
    for (let i = 0; i < s.length; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rects = range.getClientRects();
      if (!rects.length) continue;
      const rc = rects[rects.length - 1];
      if (s[i] === "\n") continue;
      if (!cur || Math.abs(rc.top - cur.top) > 2) {
        cur = { top: rc.top, bottom: rc.bottom, chars: [] };
        lines.push(cur);
      }
      cur.chars.push({ ch: s[i], left: rc.left, right: rc.right });
    }
    const m = metrics(style);
    const out = [];
    for (const line of lines) {
      let a = 0;
      let b = line.chars.length;
      while (a < b && /\s/.test(line.chars[a].ch)) a++;
      while (b > a && /\s/.test(line.chars[b - 1].ch)) b--;
      if (a >= b) continue;
      const chars = line.chars.slice(a, b);
      const box = { left: chars[0].left, right: chars[chars.length - 1].right, top: line.top, bottom: line.bottom };
      if (outside(box, ctx.clip)) continue;
      const str = chars.map((x) => x.ch).join("").replace(/\s/g, " ");
      const baseline = line.top + m.ascent;
      out.push(`<text ${named(`tekst „${str.length > 40 ? str.slice(0, 39) + "…" : str}” · ${tokenOf(c)}`)} x="${f(box.left)}" y="${f(baseline)}" ${textAttrs(style, c, ctx.opacity)} xml:space="preserve">${esc(str)}</text>`);
      if (ctx.underline) {
        const u = ctx.underline;
        out.push(shape(`podkreślenie · ${tokenOf(u.c)}`, box.left, baseline + u.offset, box.right - box.left, u.thickness, null, paint("fill", u.c, ctx.opacity)));
      }
    }
    return out;
  }

  function emitIcon(svg, ctx) {
    const r = svg.getBoundingClientRect();
    if (!r.width || outside(r, ctx.clip)) return [];
    const vb = svg.viewBox.baseVal;
    const s = vb && vb.width ? r.width / vb.width : 1;
    const tx = r.left - (vb ? vb.x * s : 0);
    const ty = r.top - (vb ? vb.y * s : 0);
    const parts = [];
    let colorName = "";
    for (const el of svg.querySelectorAll("path, rect, circle, line, polyline, polygon, ellipse")) {
      const st = getComputedStyle(el);
      if (st.display === "none") continue;
      const attrs = [];
      for (const at of ["d", "x", "y", "width", "height", "rx", "ry", "cx", "cy", "r", "x1", "y1", "x2", "y2", "points"]) {
        if (el.hasAttribute(at)) attrs.push(`${at}="${esc(el.getAttribute(at))}"`);
      }
      const fill = color(st.fill);
      const stroke = color(st.stroke);
      attrs.push(fill ? paint("fill", fill, ctx.opacity * +st.fillOpacity) : 'fill="none"');
      if (fill && st.fillRule === "evenodd") attrs.push('fill-rule="evenodd"');
      if (stroke && parseFloat(st.strokeWidth) > 0) {
        attrs.push(paint("stroke", stroke, ctx.opacity * +st.strokeOpacity));
        attrs.push(`stroke-width="${f(parseFloat(st.strokeWidth))}"`);
        if (st.strokeLinecap !== "butt") attrs.push(`stroke-linecap="${st.strokeLinecap}"`);
        if (st.strokeLinejoin !== "miter") attrs.push(`stroke-linejoin="${st.strokeLinejoin}"`);
      }
      colorName = colorName || tokenOf(stroke || fill);
      parts.push(`<${el.tagName} ${attrs.join(" ")}/>`);
    }
    if (!parts.length) return [];
    return [`<g ${named(`ikona · ${colorName}`)} transform="translate(${f(tx)} ${f(ty)}) scale(${f(Math.round(s * 10000) / 10000)})">${parts.join("")}</g>`];
  }

  function emitCanvas(cv, ctx) {
    const r = cv.getBoundingClientRect();
    if (!r.width || !cv.width) return [];
    const data = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
    const sx = r.width / cv.width;
    const sy = r.height / cv.height;
    const c = color(getComputedStyle(cv.parentElement).color);
    const runs = [];
    for (let y = 0; y < cv.height; y++) {
      let x = 0;
      while (x < cv.width) {
        if (data[(y * cv.width + x) * 4 + 3] > 20) {
          const start = x;
          while (x < cv.width && data[(y * cv.width + x) * 4 + 3] > 20) x++;
          runs.push([start, y, x - start]);
        } else x++;
      }
    }
    // Bars more than one device pixel tall: merge runs stacked on top of each other.
    const merged = [];
    const open = new Map();
    for (const [x, y, w] of runs) {
      const k = `${x},${w}`;
      const prev = open.get(k);
      if (prev && prev.y + prev.h === y) prev.h++;
      else {
        const bar = { x, y, w, h: 1 };
        merged.push(bar);
        open.set(k, bar);
      }
    }
    const rects = merged.map((b) => `<rect x="${f(r.left + b.x * sx)}" y="${f(r.top + b.y * sy)}" width="${f(b.w * sx)}" height="${f(b.h * sy)}"/>`);
    return [`<g ${named(`obraz minimapy · ${tokenOf(c)}`)} ${paint("fill", c, ctx.opacity)}>${rects.join("")}</g>`];
  }

  function walk(el, ctx) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return [];
    if (el.tagName === "STYLE" || el.tagName === "SCRIPT") return [];
    // The blinking caret would make every run differ.
    if (el.classList.contains("cm-cursorLayer")) return [];
    const opacity = ctx.opacity * parseFloat(style.opacity);
    if (opacity < 0.01) return [];
    const r = el.getBoundingClientRect();
    const local = { ...ctx, opacity };
    if (el instanceof SVGSVGElement) return emitIcon(el, local);
    if (el.tagName === "CANVAS") return emitCanvas(el, local);

    const out = [];
    const radii = ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"].map((p) => parseFloat(style[p]) || 0);
    const visible = r.width > 0 && r.height > 0 && !outside(r, ctx.clip);

    // Background
    const bg = color(style.backgroundColor);
    if (bg && visible) out.push(shape(`tło · ${tokenOf(bg)}`, r.left, r.top, r.width, r.height, radii, paint("fill", bg, opacity)));

    // Borders
    if (visible) {
      const sides = ["Top", "Right", "Bottom", "Left"].map((s) => ({
        s,
        w: parseFloat(style[`border${s}Width`]) || 0,
        c: style[`border${s}Style`] === "none" ? null : color(style[`border${s}Color`]),
      })).map((b) => ({ ...b, on: b.w > 0 && b.c }));
      const present = sides.filter((b) => b.on);
      if (present.length) {
        const same = present.every((b) => b.w === present[0].w && key(b.c) === key(present[0].c) && b.c.a === present[0].c.a);
        const names = { Top: "górna", Right: "prawa", Bottom: "dolna", Left: "lewa" };
        if (same && present.length === 4) {
          const w = present[0].w;
          const inner = radii.map((x) => Math.max(0, x - w / 2));
          const d = roundRect(r.left + w / 2, r.top + w / 2, r.width - w, r.height - w, inner);
          const attrs = `fill="none" ${paint("stroke", present[0].c, opacity)} stroke-width="${f(w)}"`;
          out.push(d ? `<path ${named(`krawędź · ${tokenOf(present[0].c)}`)} d="${d}" ${attrs}/>` : `<rect ${named(`krawędź · ${tokenOf(present[0].c)}`)} x="${f(r.left + w / 2)}" y="${f(r.top + w / 2)}" width="${f(r.width - w)}" height="${f(r.height - w)}" ${attrs}/>`);
        } else if (same && radii.some((x) => x > 0)) {
          // Open outline along the sides that have a border, round corners included.
          const w = present[0].w;
          const x0 = r.left + w / 2, y0 = r.top + w / 2, x1 = r.right - w / 2, y1 = r.bottom - w / 2;
          const [tl, tr, br, bl] = radii.map((x) => Math.max(0, x - w / 2));
          const seg = [
            { from: [x0 + tl, y0], to: [x1 - tr, y0] },
            { from: [x1, y0 + tr], to: [x1, y1 - br] },
            { from: [x1 - br, y1], to: [x0 + bl, y1] },
            { from: [x0, y1 - bl], to: [x0, y0 + tl] },
          ];
          const corner = [[tr, x1, y0 + tr], [br, x1 - br, y1], [bl, x0, y1 - bl], [tl, x0 + tl, y0]];
          const start = sides.findIndex((b) => !b.on);
          let d = "";
          let penDown = false;
          for (let k = 1; k <= 4; k++) {
            const i = (start + k) % 4;
            if (!sides[i].on) { penDown = false; continue; }
            const sg = seg[i];
            if (!penDown) d += `M${f(sg.from[0])} ${f(sg.from[1])}`;
            d += `L${f(sg.to[0])} ${f(sg.to[1])}`;
            penDown = true;
            const next = (i + 1) % 4;
            if (sides[next].on && k < 4) {
              const [rad, cx2, cy2] = corner[i];
              d += rad ? `A${f(rad)} ${f(rad)} 0 0 1 ${f(cx2)} ${f(cy2)}` : `L${f(seg[next].from[0])} ${f(seg[next].from[1])}`;
            }
          }
          out.push(`<path ${named(`krawędź (${present.map((b) => names[b.s]).join(", ")}) · ${tokenOf(present[0].c)}`)} d="${d}" fill="none" ${paint("stroke", present[0].c, opacity)} stroke-width="${f(w)}"/>`);
        } else {
          for (const b of present) {
            const geo = {
              Top: [r.left, r.top, r.width, b.w],
              Bottom: [r.left, r.bottom - b.w, r.width, b.w],
              Left: [r.left, r.top, b.w, r.height],
              Right: [r.right - b.w, r.top, b.w, r.height],
            }[b.s];
            out.push(shape(`krawędź ${names[b.s]} · ${tokenOf(b.c)}`, ...geo, null, paint("fill", b.c, opacity)));
          }
        }
      }
    }

    // List markers (::marker cannot be measured, so the bullet is set as text).
    if (el.tagName === "LI" && style.display === "list-item" && style.listStyleType !== "none" && visible) {
      const c = color(style.color);
      const type = style.listStyleType;
      const index = [...el.parentElement.children].indexOf(el) + (parseInt(el.parentElement.getAttribute("start")) || 1);
      const m = metrics(style);
      const fs = parseFloat(style.fontSize);
      const lh = parseFloat(style.lineHeight) || m.height;
      const baseline = r.top + (lh - m.height) / 2 + m.ascent;
      const symbol = { disc: "kropka", circle: "kółko", square: "kwadrat" }[type];
      if (symbol) {
        // Chrome draws these as shapes: about 0.375em wide, centred 0.9em before the text.
        const cx = r.left - 0.906 * fs;
        const cy = baseline - 0.355 * fs;
        const name = named(`znacznik listy (${symbol}) · ${tokenOf(c)}`);
        if (type === "disc") out.push(`<circle ${name} cx="${f(cx)}" cy="${f(cy)}" r="${f(0.1875 * fs)}" ${paint("fill", c, opacity)}/>`);
        else if (type === "circle") out.push(`<circle ${name} cx="${f(cx)}" cy="${f(cy)}" r="${f(0.1875 * fs - 0.5)}" fill="none" ${paint("stroke", c, opacity)} stroke-width="1"/>`);
        else out.push(`<rect ${name} x="${f(cx - 0.1875 * fs)}" y="${f(cy - 0.1875 * fs)}" width="${f(0.375 * fs)}" height="${f(0.375 * fs)}" ${paint("fill", c, opacity)}/>`);
      } else {
        const marker = `${index}.`;
        measureCtx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const width = measureCtx.measureText(marker + " ").width;
        out.push(`<text ${named(`znacznik listy „${marker}” · ${tokenOf(c)}`)} x="${f(r.left - width)}" y="${f(baseline)}" ${textAttrs(style, c, opacity)}>${esc(marker)}</text>`);
      }
    }

    // Children
    if (style.textDecorationLine.includes("underline")) {
      const fs = parseFloat(style.fontSize);
      const off = parseFloat(style.textUnderlineOffset);
      const th = parseFloat(style.textDecorationThickness);
      local.underline = { c: color(style.textDecorationColor) || color(style.color), offset: isNaN(off) ? fs * 0.1 : off, thickness: isNaN(th) ? 1 : th };
    }
    const clips = style.overflowX !== "visible" || style.overflowY !== "visible";
    if (clips) {
      const cr = { left: r.left + el.clientLeft, top: r.top + el.clientTop };
      cr.right = cr.left + el.clientWidth;
      cr.bottom = cr.top + el.clientHeight;
      local.clip = {
        left: Math.max(ctx.clip.left, cr.left), top: Math.max(ctx.clip.top, cr.top),
        right: Math.min(ctx.clip.right, cr.right), bottom: Math.min(ctx.clip.bottom, cr.bottom),
      };
    }
    const kids = [];
    // Children with a positive z-index (the minimap's word bars over its
    // slider) are painted last, as the browser does.
    const z = (node) => (node.nodeType === Node.ELEMENT_NODE ? parseInt(getComputedStyle(node).zIndex, 10) || 0 : 0);
    const nodes = [...(el.shadowRoot ? el.shadowRoot.childNodes : el.childNodes)].sort((a, b) => Math.max(z(a), 0) - Math.max(z(b), 0));
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.data.trim()) kids.push(...(emitText(node, style, local) || []));
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        kids.push(...walk(node, local));
      }
    }

    if (clips && kids.length) {
      const id = `clip${++clipCount}`;
      defs.push(`<clipPath id="${id}"><rect x="${f(local.clip.left)}" y="${f(local.clip.top)}" width="${f(local.clip.right - local.clip.left)}" height="${f(local.clip.bottom - local.clip.top)}"/></clipPath>`);
      kids.splice(0, kids.length, `<g clip-path="url(#${id})">${kids.join("")}</g>`);
    }
    out.push(...kids);
    // Scroll bar thumb (a pseudo-element, drawn from the scroll position).
    if ((style.overflowY === "auto" || style.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 1 && el.offsetWidth - el.clientWidth - el.clientLeft * 2 >= 6) {
      const track = el.clientHeight;
      const thumb = Math.max(20, (track * track) / el.scrollHeight);
      const top = r.top + el.clientTop + (el.scrollTop / (el.scrollHeight - track)) * (track - thumb);
      const x = r.left + el.clientLeft + el.clientWidth + 3;
      const thumbC = tokens.find((t) => t.name === "scrollbar").c;
      out.push(shape("uchwyt paska przewijania · scrollbar", x, top + 3, 6, thumb - 6, [3, 3, 3, 3], paint("fill", thumbC, opacity)));
    }

    if (!out.length) return [];
    const name = label(el);
    if (name || clips) return [`<g ${named(name || "obszar przycięty")}>${out.join("")}</g>`];
    return out;
  }

  const root = { opacity: 1, clip: { left: 0, top: 0, right: W, bottom: H } };
  const page = walk(document.body, root);

  // ---------- Things drawn by Windows, not by the page ----------
  const tok = (n) => tokens.find((t) => t.name === n).c;
  const topbar = tok("topbar");
  const mutedFg = tok("muted-foreground");
  const caption = [];
  const capX = W - 138;
  const glyphs = [
    ["Minimalizuj", (cx, cy) => `<path d="M${cx - 5} ${cy + 0.5}H${cx + 5}"/>`],
    ["Maksymalizuj", (cx, cy) => `<rect x="${cx - 4.5}" y="${cy - 4.5}" width="9" height="9" rx="1"/>`],
    ["Zamknij", (cx, cy) => `<path d="M${cx - 5} ${cy - 5}L${cx + 5} ${cy + 5}M${cx + 5} ${cy - 5}L${cx - 5} ${cy + 5}"/>`],
  ];
  glyphs.forEach(([name, draw], i) => {
    const x = capX + i * 46;
    caption.push(
      `<g ${named("Przycisk okna: " + name)}>` +
        shape("tło · topbar", x, 0, 46, 39, null, paint("fill", topbar, 1)) +
        `<g ${named("ikona · muted-foreground")} fill="none" ${paint("stroke", mutedFg, 1)} stroke-width="1">${draw(x + 23, 19.5)}</g>` +
      `</g>`,
    );
  });

  // A misspelled word, as the spell checker underlines it.
  const spell = [];
  const host = document.querySelector("#editor").shadowRoot;
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode()); ) {
    const at = n.data.indexOf("dokumnet");
    const word = at >= 0 ? "dokumnet" : null;
    if (!word) continue;
    const range = document.createRange();
    range.setStart(n, at);
    range.setEnd(n, at + word.length);
    const rc = range.getClientRects()[0];
    const st = getComputedStyle(n.parentElement);
    const base = rc.top + metrics(st).ascent;
    spell.push(`<g ${named("Błąd pisowni")}>${shape("podkreślenie · warning", rc.left, base + 3, rc.width, 1, null, paint("fill", tok("warning"), 1))}</g>`);
    break;
  }

  // ---------- Token legend beside the window ----------
  const LX = W + 48;
  const legend = [];
  const uses = {
    background: "tło okna, paneli i minimapy",
    foreground: "tekst interfejsu",
    card: "pasek ostrzeżenia, bloki kodu",
    popover: "menu i okienka",
    primary: "akcja główna (rzadko)",
    secondary: "akcja drugorzędna",
    muted: "tło kodu w linii",
    accent: "hover, włączone przyciski",
    "muted-foreground": "tekst pomocniczy, ikony",
    destructive: "błędy, usuwanie",
    border: "linie i obramowania",
    input: "pola, linia cytatu",
    ring: "pierścień focusa",
    warning: "błąd pisowni, kropka zmian",
    "search-match": "wyniki wyszukiwania",
    "search-current": "bieżący wynik",
    topbar: "górny pasek, przyciski okna",
    tab: "nieaktywne zakładki",
    toolbar: "aktywna zakładka, pasek narzędzi, suwak minimapy",
    statusbar: "pasek stanu",
    "statusbar-foreground": "ikony i napisy paska stanu",
    scrollbar: "uchwyt paska przewijania",
    "content-foreground": "tekst akapitów",
    "content-strong": "tekst sformatowany, punktory, pola zadań",
  };
  legend.push(`<text ${named("Tytuł legendy")} x="${LX}" y="40" font-family="Segoe UI" font-size="18" font-weight="600" fill="#fafafa">Tokeny kolorów</text>`);
  legend.push(`<text ${named("Opis legendy")} x="${LX}" y="62" font-family="Segoe UI" font-size="12" fill="#a1a1a1">Wartości z src/styles.css (sRGB)</text>`);
  tokens.forEach((t, i) => {
    const y = 88 + i * 46;
    const swatch = shape(`próbka · ${t.name}`, LX, y, 40, 32, [6, 6, 6, 6], paint("fill", t.c, 1));
    legend.push(
      `<g ${named("Token: " + t.name)}>` +
        `<path d="${roundRect(LX + 0.5, y + 0.5, 39, 31, [5.5, 5.5, 5.5, 5.5])}" fill="#262626"/>` +
        swatch +
        `<path d="${roundRect(LX + 0.5, y + 0.5, 39, 31, [5.5, 5.5, 5.5, 5.5])}" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1"/>` +
        `<text x="${LX + 52}" y="${y + 13}" font-family="Segoe UI" font-size="13" font-weight="600" fill="#fafafa">${esc(t.name)}</text>` +
        `<text x="${LX + 52}" y="${y + 29}" font-family="Segoe UI" font-size="11" fill="#a1a1a1">${hex(t.c)}${t.c.a < 1 ? ` · ${Math.round(t.c.a * 100)}%` : ""} · ${esc(uses[t.name] || "")}</text>` +
      `</g>`,
    );
  });
  const legendH = 88 + tokens.length * 46;
  const totalW = W + 48 + 380;
  const totalH = Math.max(H, legendH) + 0;

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">\n` +
    `<defs>${defs.join("")}<clipPath id="window-clip"><rect x="0" y="0" width="${W}" height="${H}" rx="8"/></clipPath></defs>\n` +
    `<rect ${named("Tło planszy")} x="0" y="0" width="${totalW}" height="${totalH}" fill="#2b2b2b"/>\n` +
    `<g ${named("Okno MDE")} clip-path="url(#window-clip)">\n` +
    page.join("\n") + "\n" +
    `<g ${named("Przyciski okna (rysuje Windows)")}>${caption.join("")}</g>\n` +
    spell.join("") +
    `</g>\n` +
    `<g ${named("Legenda tokenów")}>${legend.join("\n")}</g>\n` +
    `</svg>\n`
  );
})();
