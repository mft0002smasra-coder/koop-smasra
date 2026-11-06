/* Koperasi SMA (JAIM) Al-Asyraf — teras: API, sesi, shell, router. Kod ini BERASINGAN daripada app-smasra. */
const KP_API = "https://script.google.com/macros/s/AKfycbwyLzwfPFsazYkoGbnLQfI8G36LvngSxnEqVb6DSnieDN7kXLDhPmSAAz-eq4K1_oqU/exec";

const KP_LOGO = "https://lh3.googleusercontent.com/d/1JFlMpX8nCN4ZKW9SRiNdtFT-UC8D3nlN"; // logo sekolah (sama seperti app-smasra)

const KP = {
  S: { token: "", user: null, tetapan: { kategori: [], resit: {} } },
  pages: {}, act: {}, inp: {}, cur: "", mem: {},

  /* ---------- storan selamat (iframe Google Sites boleh sekat) ---------- */
  store: {
    get(k) { try { return localStorage.getItem(k) || KP.mem[k] || ""; } catch (e) { return KP.mem[k] || ""; } },
    set(k, v) { KP.mem[k] = v; try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { delete KP.mem[k]; try { localStorage.removeItem(k); } catch (e) {} }
  },

  /* ---------- utiliti ---------- */
  logo() { return `<span class="logo logoimg"><img src="${KP_LOGO}" alt="Logo sekolah" referrerpolicy="no-referrer" onerror="this.parentNode.textContent='K'"></span>`; },
  esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); },
  rm(n) { return "RM " + (Math.round((+n || 0) * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
  rm0(n) { return "RM " + Math.round(+n || 0).toLocaleString("en-US"); },
  today() { return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Kuala_Lumpur" }); },
  addDays(iso, d) { const t = new Date(iso + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + d); return t.toISOString().slice(0, 10); },
  $(s, r) { return (r || document).querySelector(s); },
  pill(t, c) { return `<i class="pill p-${c}">${KP.esc(t)}</i>`; },
  stokPill(b) { return b.stok <= 0 ? KP.pill("Habis", "bad") : b.stok <= b.min ? KP.pill(b.stok + " rendah", "warn") : KP.pill(b.stok, "ok"); },
  toast(m, bad) {
    const d = document.createElement("div"); d.className = "toast" + (bad ? " bad" : ""); d.setAttribute("role", "status"); d.textContent = m;
    document.body.appendChild(d); setTimeout(() => d.remove(), bad ? 4500 : 2600);
  },
  modal(html) { const m = KP.$("#modal"); m.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="card">${html}</div></div>`; const f = m.querySelector("input,select,textarea,button"); if (f) f.focus(); },
  closeModal() { KP.$("#modal").innerHTML = ""; },
  csv(name, rows) {
    const t = rows.map((r) => r.map((v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + t], { type: "text/csv" })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  },

  /* ---------- API ---------- */
  async api(action, data) {
    const r = await fetch(KP_API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ action, token: KP.S.token }, data || {})) });
    const j = await r.json();
    if (j.auth === false) { KP.logout(true); }
    return j;
  },
  // panggil + papar ralat; pulang null jika gagal
  // bacaan = terus daripada Google Sheet (KP.data, laju); penulisan = Apps Script
  async call(action, data) {
    const baca = !!(KP.data && KP.data[action]);
    try {
      const j = baca ? await KP.data[action](data || {}) : await KP.api(action, data);
      if (!j.success) { KP.toast(j.message || "Gagal.", true); return null; }
      if (!baca && !/^(me|senaraiGuru|senaraiMurid|login)$/.test(action)) await new Promise((r) => setTimeout(r, 900)); // beri masa Sheet tersegerak sebelum dibaca semula
      return j;
    } catch (e) { KP.toast(baca ? String(e.message || "Gagal membaca Sheet.") : "Tiada sambungan ke pelayan.", true); return null; }
  },

  /* ---------- sesi ---------- */
  async start() {
    document.addEventListener("click", (e) => { const t = e.target.closest("[data-a]"); if (t && KP.act[t.dataset.a]) KP.act[t.dataset.a](t, e); });
    const on = (e) => { const t = e.target.closest("[data-i]"); if (t && KP.inp[t.dataset.i]) KP.inp[t.dataset.i](t, e); };
    document.addEventListener("input", on); document.addEventListener("change", on);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") KP.closeModal(); if (e.key === "Enter" && e.target.dataset && e.target.dataset.enter && KP.act[e.target.dataset.enter]) KP.act[e.target.dataset.enter](e.target, e); });
    window.addEventListener("hashchange", () => KP.draw(true));
    const tk = KP.store.get("kp_token");
    if (tk) {
      KP.S.token = tk;
      try { const j = await KP.api("me"); if (j.success) { KP.S.user = j.user; KP.S.tetapan = j.tetapan; } else KP.S.token = ""; } catch (e) { KP.S.token = ""; }
    }
    KP.draw(true);
  },
  logout(soft) {
    KP.S.token = ""; KP.S.user = null; KP.store.del("kp_token"); Object.keys(KP.pages).forEach((k) => { KP.pages[k]._ok = false; });
    if (soft) KP.toast("Sesi tamat. Sila log masuk semula.", true);
    KP.draw(true);
  },

  /* ---------- navigasi ---------- */
  nav: [
    ["utama", "Utama", "M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v5H3z", () => true],
    ["jualan", "Jualan (POS)", "M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6 M10 21h.01 M18 21h.01", (u) => u.jualan],
    // halaman "Tempahan" (cipta bill QR) disimpan untuk kemudian: akan dibina bersama page murid
    // ["tempahan", "Tempahan", "M9 3h6l1 2h3v16H5V5h3z M9 12h6 M9 16h4", (u) => u.jualan],
    ["sejarah", "Sejarah Jualan", "M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6", (u) => u.jualan || u.laporan],
    ["barangan", "Senarai Barangan", "M21 8 12 3 3 8v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8", (u) => u.admin],
    ["inventori", "Inventori & Akses", "M4 5h16v14H4z M8 12l3 3 5-6", (u) => u.inventori],
    ["stok", "Stok", "M3 7h11v9H3z M14 10h4l3 3v3h-7z M7 19h.01 M17 19h.01", (u) => u.stok],
    ["laporan", "Laporan", "M4 20V10 M10 20V4 M16 20v-7 M22 20H2", (u) => u.laporan],
    ["tetapan", "Tetapan", "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M19 5l-2 2 M7 17l-2 2", (u) => u.admin]
  ],
  go(k) { if (location.hash === "#/" + k) KP.draw(true); else location.hash = "#/" + k; },

  async draw(reload) {
    const root = KP.$("#root");
    if (!KP.S.user) { KP.loginView(); return; }
    const u = KP.S.user, ok = KP.nav.filter((n) => n[3](u));
    let key = (location.hash.replace("#/", "") || "utama").split("?")[0];
    if (!ok.some((n) => n[0] === key)) key = "utama";
    const pg = KP.pages[key], first = KP.cur !== key || !KP.$("#pg");
    KP.cur = key;
    if (first) {
      root.innerHTML = `<div class="app"><div class="backdrop" id="bd" data-a="menu" hidden></div><aside class="side" id="side"><div class="brand">${KP.logo()}<div><b>Koperasi SMA (JAIM) Al-Asyraf</b><small>Sistem Pengurusan Koperasi</small></div></div>
        ${ok.map((n) => `<a class="nav ${n[0] === key ? "on" : ""}" href="#/${n[0]}" data-a="navgo"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${n[2]}"/></svg>${n[1]}</a>`).join("")}
        <div class="who"><b>${KP.esc(u.nama)}</b><small>${u.admin ? "Admin App" : "Guru Koop"}</small><button class="btn line sm" data-a="pin">Tukar PIN</button><button class="btn line sm" data-a="keluar">Log keluar</button></div></aside>
        <div class="main"><div class="top"><div style="display:flex;align-items:center;gap:10px"><button class="btn line sm menu" data-a="menu" aria-label="Buka / tutup menu" title="Menu">☰ Menu</button><h1 id="ttl"></h1></div><span class="pill p-info">${u.admin ? "Admin App" : "Guru Koop"}</span></div><div class="page" id="pg"></div></div></div>`;
    } else {
      document.querySelectorAll(".nav").forEach((a, i) => a.classList.toggle("on", ok[i] && ok[i][0] === key));
    }
    KP.$("#ttl").textContent = ok.find((n) => n[0] === key)[1];
    KP.side(false);
    if (key !== "jualan" && KP.scan) KP.scan.stop();
    const pgEl = KP.$("#pg");
    if (reload && pg.load) {
      if (pg._ok) {
        // data lama dipaparkan serta-merta; data baharu dimuat di latar belakang
        pgEl.innerHTML = pg.view(); if (pg.after) pg.after();
        pg.load().then(() => {
          const ae = document.activeElement;
          if (KP.cur !== key || KP.$("#modal").innerHTML || (ae && /INPUT|SELECT|TEXTAREA/.test(ae.tagName) && pgEl.contains(ae))) return;
          KP.rerender();
        }).catch(() => {});
        return;
      }
      pgEl.innerHTML = `<div class="load">Memuatkan…</div>`;
      try { await pg.load(); pg._ok = true; } catch (e) { pgEl.innerHTML = `<div class="empty">Gagal memuat data. <button class="btn line sm" data-a="muat">Cuba lagi</button></div>`; return; }
    }
    if (KP.cur !== key) return;
    pgEl.innerHTML = pg.view();
    if (pg.after) pg.after();
  },
  side(open) { const sd = KP.$("#side"), bd = KP.$("#bd"); if (!sd) return; const o = open === undefined ? !sd.classList.contains("open") : open; sd.classList.toggle("open", o); if (bd) bd.hidden = !o; },
  rerender() { const pg = KP.pages[KP.cur], el = KP.$("#pg"); if (pg && el) { const y = window.scrollY; el.innerHTML = pg.view(); if (pg.after) pg.after(); window.scrollTo(0, y); } },

  loginView() {
    KP.$("#root").innerHTML = `<div class="login"><div class="card"><div style="display:flex;gap:12px;align-items:center">${KP.logo()}<div><b class="hd" style="color:var(--pri-d)">Koperasi SMA (JAIM) Al-Asyraf</b><div class="muted small">Log masuk pengguna koperasi</div></div></div>
      <label class="fld"><span class="lbl">Emel</span><input id="lg-e" type="email" autocomplete="username" data-enter="login" placeholder="emel@moe-dl.edu.my"></label>
      <label class="fld"><span class="lbl">PIN</span><input id="lg-p" type="password" inputmode="numeric" autocomplete="current-password" data-enter="login" placeholder="PIN"></label>
      <button class="btn cta block" data-a="login" id="lg-b">Log masuk</button>
      <div class="muted small">Akaun ditetapkan oleh Admin App di bahagian Tetapan. PIN awal 1234 mesti ditukar semasa log masuk pertama.</div></div></div>`;
    const e = KP.store.get("kp_emel"); if (e) { KP.$("#lg-e").value = e; KP.$("#lg-p").focus(); }
  },
  pinModal(wajib) {
    KP.modal(`<h2>${wajib ? "Tukar PIN (wajib)" : "Tukar PIN"}</h2><p class="muted small">PIN 4 hingga 8 digit, bukan 1234.</p>
      <div style="display:grid;gap:10px"><label class="fld"><span class="lbl">PIN lama</span><input id="pn-0" type="password" inputmode="numeric"></label>
      <label class="fld"><span class="lbl">PIN baharu</span><input id="pn-1" type="password" inputmode="numeric"></label>
      <label class="fld"><span class="lbl">Sahkan PIN baharu</span><input id="pn-2" type="password" inputmode="numeric"></label></div>
      <div class="sp" style="margin-top:14px">${wajib ? "<span></span>" : `<button class="btn line" data-a="tutup">Batal</button>`}<button class="btn cta" data-a="pinsimpan">Simpan PIN</button></div>`);
  }
};

KP.act.navgo = () => KP.side(false);
KP.act.menu = () => KP.side();
KP.act.tutup = () => KP.closeModal();
KP.act.keluar = () => KP.logout(false);
KP.act.muat = () => KP.draw(true);
KP.act.pin = () => KP.pinModal(false);
KP.act.login = async () => {
  const e = KP.$("#lg-e").value.trim(), p = KP.$("#lg-p").value, b = KP.$("#lg-b");
  if (!e || !p) { KP.toast("Isi emel dan PIN.", true); return; }
  b.disabled = true; b.textContent = "Menyemak…";
  const j = await KP.call("login", { emel: e, pin: p });
  b.disabled = false; b.textContent = "Log masuk";
  if (!j) return;
  KP.S.token = j.token; KP.S.user = j.user; KP.S.tetapan = j.tetapan;
  KP.store.set("kp_token", j.token); KP.store.set("kp_emel", e);
  KP.draw(true);
  if (j.user.wajibTukar) KP.pinModal(true);
};
KP.act.pinsimpan = async () => {
  const a = KP.$("#pn-0").value, b = KP.$("#pn-1").value, c = KP.$("#pn-2").value;
  if (b !== c) { KP.toast("PIN baharu tidak sepadan.", true); return; }
  const j = await KP.call("tukarPin", { pinLama: a, pinBaru: b });
  if (!j) return;
  KP.S.user.wajibTukar = 0; KP.closeModal(); KP.toast("PIN ditukar.");
};
