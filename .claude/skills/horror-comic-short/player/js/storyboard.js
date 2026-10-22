/* Storyboard loading, panel cropping and the drag-to-adjust crop editor. */
(function () {
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not load " + String(src).slice(0, 60)));
      img.src = src;
    });
  }

  // Try assets/storyboard.{png,jpg,jpeg,webp} next to index.html.
  async function findAsset(base, exts) {
    for (const ext of exts) {
      try { return { img: await loadImage(`assets/${base}.${ext}`), src: `assets/${base}.${ext}` }; } catch (e) { /* next */ }
    }
    return null;
  }

  function cropPanel(img, rect, insetPct) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    let [x, y, w, h] = rect;
    const ix = (w * insetPct) / 100, iy = (h * insetPct) / 100;
    x += ix; y += iy; w -= ix * 2; h -= iy * 2;
    const sx = Math.max(0, x * iw), sy = Math.max(0, y * ih);
    const sw = Math.min(iw - sx, w * iw), sh = Math.min(ih - sy, h * ih);
    // Upscale small crops once with high-quality smoothing so per-frame scaling stays clean.
    const k = Math.max(1, Math.min(4, 1400 / sw));
    const c = document.createElement("canvas");
    c.width = Math.round(sw * k); c.height = Math.round(sh * k);
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return c;
  }

  // ---------- crop editor ----------
  class CropEditor {
    constructor(canvas, onChange) {
      this.cv = canvas; this.g = canvas.getContext("2d");
      this.onChange = onChange; this.img = null; this.panels = []; this.sel = -1; this.drag = null;
      canvas.addEventListener("pointerdown", e => this.down(e));
      canvas.addEventListener("pointermove", e => this.move(e));
      window.addEventListener("pointerup", () => this.up());
    }
    set(img, panels) {
      this.img = img; this.panels = panels;
      const maxW = this.cv.parentElement.clientWidth || 360;
      const ar = img ? img.naturalHeight / img.naturalWidth : 1.5;
      this.cv.width = maxW * 2; this.cv.height = maxW * ar * 2;
      this.cv.style.height = maxW * ar + "px";
      this.draw();
    }
    pt(e) {
      const r = this.cv.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
    }
    hit([x, y]) {
      const tol = 0.012;
      for (let i = this.panels.length - 1; i >= 0; i--) {
        const [rx, ry, rw, rh] = this.panels[i].rect;
        if (x < rx - tol || x > rx + rw + tol || y < ry - tol || y > ry + rh + tol) continue;
        const nearR = Math.abs(x - (rx + rw)) < tol * 1.5, nearB = Math.abs(y - (ry + rh)) < tol * 1.5;
        const nearL = Math.abs(x - rx) < tol * 1.5, nearT = Math.abs(y - ry) < tol * 1.5;
        return { i, mode: nearR || nearB || nearL || nearT ? { r: nearR, b: nearB, l: nearL, t: nearT } : "move" };
      }
      return null;
    }
    down(e) {
      if (!this.img) return;
      const p = this.pt(e), h = this.hit(p);
      this.sel = h ? h.i : -1;
      if (h) { this.drag = { ...h, p0: p, r0: [...this.panels[h.i].rect] }; this.cv.setPointerCapture(e.pointerId); }
      this.draw();
    }
    move(e) {
      if (!this.drag) {
        const h = this.img && this.hit(this.pt(e));
        this.cv.style.cursor = !h ? "default" : h.mode === "move" ? "move" : "nwse-resize";
        return;
      }
      const [x, y] = this.pt(e), d = this.drag, [x0, y0] = d.p0, r = [...d.r0];
      const dx = x - x0, dy = y - y0;
      if (d.mode === "move") { r[0] += dx; r[1] += dy; }
      else {
        if (d.mode.l) { r[0] += dx; r[2] -= dx; }
        if (d.mode.r) r[2] += dx;
        if (d.mode.t) { r[1] += dy; r[3] -= dy; }
        if (d.mode.b) r[3] += dy;
      }
      r[2] = Math.max(0.02, r[2]); r[3] = Math.max(0.02, r[3]);
      this.panels[d.i].rect = r.map(v => Math.round(v * 10000) / 10000);
      this.draw();
    }
    up() {
      if (this.drag) { const i = this.drag.i; this.drag = null; this.onChange(i); }
    }
    draw() {
      const { g, cv } = this;
      g.clearRect(0, 0, cv.width, cv.height);
      if (!this.img) {
        g.fillStyle = "#222"; g.fillRect(0, 0, cv.width, cv.height);
        g.fillStyle = "#888"; g.font = "28px sans-serif"; g.textAlign = "center";
        g.fillText("Upload the storyboard image", cv.width / 2, cv.height / 2);
        return;
      }
      g.drawImage(this.img, 0, 0, cv.width, cv.height);
      g.fillStyle = "rgba(0,0,0,0.45)"; g.fillRect(0, 0, cv.width, cv.height);
      this.panels.forEach((p, i) => {
        const [x, y, w, h] = p.rect.map((v, k) => v * (k % 2 ? cv.height : cv.width));
        g.drawImage(this.img, p.rect[0] * this.img.naturalWidth, p.rect[1] * this.img.naturalHeight,
          p.rect[2] * this.img.naturalWidth, p.rect[3] * this.img.naturalHeight, x, y, w, h);
        g.lineWidth = i === this.sel ? 5 : 3;
        g.strokeStyle = i === this.sel ? "#ffd400" : "#ff3b3b";
        g.strokeRect(x, y, w, h);
        g.fillStyle = g.strokeStyle; g.fillRect(x, y, 44, 32);
        g.fillStyle = "#000"; g.font = "bold 24px sans-serif"; g.textAlign = "center";
        g.fillText(p.n, x + 22, y + 25);
      });
    }
  }

  window.WishStoryboard = { loadImage, findAsset, cropPanel, CropEditor };
})();
