/* Koperasi SMA (JAIM) Al-Asyraf — halaman: Utama, Jualan, Sejarah, Barangan, Inventori, Stok, Laporan, Tetapan */
(function () {
  const { esc, rm, rm0, pill, stokPill } = KP, $ = KP.$;
  const D = { barang: [], kat: [] }; // cache barang
  const val = (id) => { const e = document.getElementById(id); return e ? e.value : ""; };
  const kats = () => KP.S.tetapan.kategori || [];
  const chips = (list, cur, act) => `<div class="chips">${list.map((k) => `<button class="ch ${k === cur ? "on" : ""}" data-a="${act}" data-k="${esc(k)}">${esc(k)}</button>`).join("")}</div>`;
  // Senarai kategori: daripada Tetapan + kategori sedia ada pada barang + kategori lalai (supaya senarai tidak pernah kosong)
  const katSemua = (cur) => { const o = []; ["Buku & Alat Tulis", "Pakaian", "Asrama", "Koperasi", "Lain-lain"].concat(kats(), (D.barang || []).map((b) => b.kategori), cur ? [cur] : []).forEach((k) => { k = String(k || "").trim(); if (k && !o.includes(k)) o.push(k); }); return o; };
  const katOpts = (cur) => `<option value="" ${cur ? "" : "selected"}>— pilih kategori —</option>` + katSemua(cur).map((k) => `<option ${k === cur ? "selected" : ""}>${esc(k)}</option>`).join("") + `<option value="__baru">＋ Kategori baharu…</option>`;
  async function loadBarang(hanyaSet) {
    const j = await KP.call("getBarang", { hanyaSet: !!hanyaSet });
    if (!j) throw new Error("barang");
    D.barang = j.barang; D.kat = j.kategori; KP.S.tetapan.kategori = j.kategori;
  }
  function range(k) {
    const t = KP.today(), y = t.slice(0, 4), m = t.slice(0, 7);
    if (k === "Hari ini") return [t, t];
    if (k === "7 hari") return [KP.addDays(t, -6), t];
    if (k === "Bulan ini") return [m + "-01", t];
    if (k === "Bulan lepas") { const e = KP.addDays(m + "-01", -1); return [e.slice(0, 7) + "-01", e]; }
    if (k === "Tahun ini") return [y + "-01-01", t];
    return [t, t];
  }
  const bars = (rows, key, fmt) => { const mx = Math.max(1, ...rows.map((r) => r[key])); return rows.map((r) => `<div style="margin-bottom:10px"><div class="sp" style="font-size:13px"><span>${esc(r.nama)}</span><b class="num">${fmt(r)}</b></div><div class="bar"><i style="width:${Math.round(r[key] / mx * 100)}%;background:var(--pri)"></i></div></div>`).join("") || `<div class="muted small">Tiada data.</div>`; };
  function chart(rows, labelFn) {
    if (!rows.length) return `<div class="empty">Tiada jualan dalam tempoh ini.</div>`;
    const mx = Math.max(1, ...rows.map((r) => r.hasil)), pk = rows.findIndex((r) => r.hasil === mx);
    return `<div class="chart">${rows.map((r, i) => `<div class="b" title="${esc(labelFn(r))}: ${rm(r.hasil)}">${rows.length <= 14 ? `<span class="num">${Math.round(r.hasil)}</span>` : ""}<i class="${i === pk ? "pk" : ""}" style="height:${Math.max(2, Math.round(r.hasil / mx * 100))}%"></i></div>`).join("")}</div>
      <div style="display:flex;gap:10px;padding:4px 6px;overflow-x:auto">${rows.map((r) => `<span class="small muted" style="flex:1;min-width:26px;text-align:center">${esc(labelFn(r))}</span>`).join("")}</div>`;
  }

  /* ================= RESIT ================= */
  function resitHtml(r) {
    const nm = (KP.S.tetapan.resit || {}).nama || "Koperasi";
    return `<div class="resit"><div style="text-align:center"><b>${esc(nm).replace(/ (PEKAN )/i, "<br>$1")}</b><br>${esc(r.no)}<br>${esc(r.tarikh)}</div><hr>
      <div>Juruwang: ${esc(r.juruwang)}</div>${r.murid ? `<div>Murid: ${esc(r.murid)}${r.kelasMurid ? " (" + esc(r.kelasMurid) + ")" : ""}</div>` : ""}<div>Pembeli: ${esc(r.kumpulan)}${r.tingkatan ? " · T" + r.tingkatan : ""}</div><hr>
      ${(r.items || []).map((i) => `<div class="l"><span>${esc(i.nama)}<br>&nbsp;${i.qty} x ${Number(i.harga).toFixed(2)}</span><span>${Number(i.jumlah != null ? i.jumlah : i.harga * i.qty).toFixed(2)}</span></div>`).join("")}<hr>
      <div class="l"><b>JUMLAH</b><b>${rm(r.jumlah)}</b></div>${r.qr > 0 && r.kaedah !== "QR DuitNow" ? `<div class="l"><span>Bayaran QR (bukti)</span><span>${rm(r.qr)}</span></div><div class="l"><span>Tunai diterima</span><span>${rm(r.tunai)}</span></div>` : `<div class="l"><span>${esc(r.kaedah)}</span><span>${rm(r.kaedah === "QR DuitNow" ? r.jumlah : r.tunai)}</span></div>`}<div class="l"><span>Baki</span><span>${rm(r.baki)}</span></div>${r.tempahan ? `<div class="l"><span>Rujukan tempahan</span><span>${esc(r.tempahan)}</span></div>` : ""}
      ${r.status === "Batal" ? `<hr><div style="text-align:center"><b>*** DIBATALKAN ***</b></div>` : ""}<hr><div style="text-align:center">Terima kasih</div></div>`;
  }
  KP.printResit = (r) => KP.printHtml(resitHtml(r));

  /* ================= UTAMA ================= */
  const U = { rng: "7 hari", lap: null };
  KP.pages.utama = {
    async load() {
      U.lap = null; const [a, b] = range(U.rng);
      const [, l] = await Promise.all([loadBarang(false), KP.S.user.laporan ? KP.call("laporan", { dari: a, hingga: b }) : null]);
      U.lap = l;
    },
    view() {
      const u = KP.S.user, low = D.barang.filter((b) => b.stok <= b.min), hab = D.barang.filter((b) => b.stok <= 0), L = U.lap;
      let h = "";
      if (u.laporan) h += `<div class="sp"><div class="chips">${["Hari ini", "7 hari", "Bulan ini"].map((k) => `<button class="ch ${k === U.rng ? "on" : ""}" data-a="u-rng" data-k="${k}">${k}</button>`).join("")}</div>${u.jualan ? `<button class="btn cta" data-a="goj">Mula jualan (POS)</button>` : ""}</div>`;
      else if (u.jualan) h += `<div><button class="btn cta" data-a="goj">Mula jualan (POS)</button></div>`;
      h += `<div class="row">`;
      if (L) h += `<div class="card kpi"><div class="lbl">Hasil jualan</div><div class="v">${rm0(L.jumlah.hasil)}</div></div><div class="card kpi"><div class="lbl">Transaksi</div><div class="v">${L.jumlah.resit}</div></div><div class="card kpi ok"><div class="lbl">Untung kasar</div><div class="v">${rm0(L.jumlah.untung)}</div></div>`;
      h += `<div class="card kpi warn"><div class="lbl">Stok rendah</div><div class="v">${low.length}</div></div><div class="card kpi bad"><div class="lbl">Habis stok</div><div class="v">${hab.length}</div></div></div>`;
      if (L) h += `<div class="row"><div class="card pad grow" style="flex:2 1 520px"><h2 style="margin-bottom:10px">Jualan harian</h2>${chart(L.harian, (r) => r.tarikh.slice(5))}</div><div class="card pad grow"><h2 style="margin-bottom:10px">Kategori terlaris</h2>${bars(L.kategori.slice().sort((a, b) => b.hasil - a.hasil).map((k) => ({ nama: k.nama, hasil: k.hasil })), "hasil", (r) => rm0(r.hasil))}</div></div>`;
      h += `<div class="card" style="padding:14px 0 6px"><h2 style="padding:0 16px 8px">Stok rendah</h2><div class="tbl"><table><thead><tr><th>Kod</th><th>Barang</th><th>Kategori</th><th class="r">Baki</th><th class="r">Min.</th><th>Status</th></tr></thead><tbody>${low.map((b) => `<tr><td class="muted">${esc(b.kod)}</td><td><b>${esc(b.nama)}</b></td><td>${esc(b.kategori)}</td><td class="r num">${b.stok}</td><td class="r num">${b.min}</td><td>${stokPill(b)}</td></tr>`).join("") || `<tr><td colspan="6" class="empty">Semua stok mencukupi.</td></tr>`}</tbody></table></div></div>`;
      return h;
    }
  };
  KP.act["u-rng"] = (t) => { U.rng = t.dataset.k; KP.draw(true); };
  KP.act.goj = () => KP.go("jualan");

  /* ================= PENGIMBAS (kamera) ================= */
  KP.scan = {
    inst: null,
    async start(id, cb, msg) {
      await KP.scan.stop();
      if (!window.Html5Qrcode) { msg("Pustaka imbasan tidak dimuatkan. Guna alat pengimbas atau taip kod."); return; }
      try {
        const F = Html5QrcodeSupportedFormats, q = new Html5Qrcode(id, { formatsToSupport: [F.QR_CODE, F.EAN_13, F.EAN_8, F.CODE_128, F.CODE_39, F.UPC_A, F.UPC_E], verbose: false });
        KP.scan.inst = q;
        await q.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 280, height: 170 } }, cb, () => {});
        msg("Kamera aktif. Halakan pada barcode / QR.");
      } catch (e) { KP.scan.inst = null; msg("Kamera tidak dapat dibuka (" + ((e && e.message) || e) + "). Guna alat pengimbas atau taip kod."); }
    },
    async stop() { const q = KP.scan.inst; KP.scan.inst = null; if (q) { try { await q.stop(); } catch (e) {} try { q.clear(); } catch (e) {} } }
  };
  KP.beep = (ok) => { try { const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(); o.frequency.value = ok ? 880 : 220; g.gain.value = 0.08; o.connect(g); g.connect(a.destination); o.start(); setTimeout(() => { o.stop(); a.close(); }, ok ? 90 : 250); } catch (e) {} };
  KP.printHtml = (html, lebar) => { const p = $("#print"); p.innerHTML = html; p.classList.toggle("wide", !!lebar); p.hidden = false; setTimeout(() => { window.print(); p.hidden = true; }, 60); };
  KP.mlist = null;
  const loadMurid = () => (KP.mlist ? Promise.resolve() : KP.call("senaraiMurid").then((j) => { if (j) KP.mlist = j.murid; }));
  const muridDd = (q, ddId, act) => {
    const dd = $("#" + ddId); q = q.trim().toLowerCase();
    if (q.length < 2 || !KP.mlist) { dd.hidden = true; return; }
    const r = KP.mlist.filter((m) => m.nama.toLowerCase().includes(q) || (m.kp && m.kp.includes(q))).slice(0, 8);
    dd.innerHTML = r.map((m) => `<button data-a="${act}" data-k="${KP.mlist.indexOf(m)}"><span><b>${esc(m.nama)}</b> <span class="muted small">${esc(m.kelas)}</span></span>${pill(m.kumpulan, m.kumpulan === "Asrama" ? "info" : "gr")}</button>`).join("") || `<div class="empty">Tiada padanan.</div>`;
    dd.hidden = false;
  };
  const ICON = {
    terus: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></svg>`,
    tempahan: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l1 2h3v16H5V5h3z"/><path d="M9 12h6M9 16h4"/></svg>`,
    scan: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/></svg>`,
    pilih: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    qr: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h1"/></svg>`
  };
  const ACC = [["#7C3AED", "#DB2777"], ["#0891B2", "#2563EB"], ["#EA580C", "#DB2777"], ["#059669", "#0891B2"], ["#C026D3", "#7C3AED"], ["#D97706", "#DC2626"]];
  const acc = (s) => { let h = 0; String(s).split("").forEach((c) => { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); const a = ACC[h % ACC.length]; return `--a:${a[0]};--b:${a[1]}`; };
  const ini = (s) => esc(String(s).replace(/[^A-Za-z0-9 ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "•");
  const big = (act, title, sub, ic, cls) => `<button class="big ${cls || ""}" data-a="${act}"><span class="ic">${ICON[ic]}</span><b>${title}</b><span class="s">${sub}</span></button>`;
  const findCode = (code) => { code = String(code || "").trim(); const lc = code.toLowerCase(); return D.barang.find((b) => (b.barcode && b.barcode === code) || b.kod.toLowerCase() === lc); };

  /* ================= JUALAN (POS) ================= */
  /* ---- Senarai tempahan dalam Jualan Tempahan: cari ikut no. invois / nama / kod barang, salin no., muat ke troli ---- */
  const JT = { list: [], q: "", f: "Belum selesai", loaded: false, busy: false, err: "" };
  const jtBayar = (t) => t.status === "Batal" ? ["Dibatalkan", "gr"] : t.status === "Selesai" ? [t.amaunQr > 0 ? "Selesai · QR " + rm(t.amaunQr) : "Selesai · Tunai", "ok"] : t.bayar === "Disahkan" ? ["Bayaran disahkan", "ok"] : t.adaBukti ? ["Bukti diterima (belum disemak)", "warn"] : ["Belum bayar", "gr"];
  const jtFilter = () => {
    const tk = JT.q.toLowerCase().split(/\s+/).filter(Boolean);
    return JT.list.filter((t) => (JT.f === "Semua" || (JT.f === "Belum selesai" ? t.status === "Baharu" : JT.f === "Sudah bayar" ? t.status === "Baharu" && t.bayar === "Disahkan" : JT.f === "Ada bukti" ? t.status === "Baharu" && t.adaBukti : t.status === JT.f))
      && (!tk.length || (h => tk.every((w) => h.includes(w)))((t.no + " " + t.murid + " " + t.kelasMurid + " " + t.items.map((i) => (i.kod || "") + " " + (i.nama || "")).join(" ")).toLowerCase())));
  };
  const jtRows = () => {
    const L = jtFilter();
    if (JT.busy && !JT.loaded) return `<div class="muted small" style="padding:14px 16px">Memuatkan senarai…</div>`;
    if (JT.err) return `<div class="muted small" style="padding:14px 16px;color:var(--bad,#b91c1c)">${esc(JT.err)}</div>`;
    if (!L.length) return `<div class="muted small" style="padding:14px 16px">Tiada tempahan sepadan.</div>`;
    return L.slice(0, 60).map((t) => { const [bl, bk] = jtBayar(t); return `<div class="jt-row" style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:10px 16px;border-top:1px solid var(--ln2)">
      <div style="min-width:0;flex:1 1 200px"><div style="display:flex;align-items:center;gap:6px"><b style="font-family:monospace;font-size:15px;letter-spacing:.3px" id="jt-no-${esc(t.no)}">${esc(t.no)}</b><button class="btn line sm" data-a="jt-copy" data-k="${esc(t.no)}" title="Salin no. invois" aria-label="Salin no. invois ${esc(t.no)}" style="padding:2px 8px">Salin</button></div>
        <div style="font-size:13px;margin-top:2px"><b>${esc(t.murid || "(murid baharu)")}</b> <span class="muted small">${esc(t.kelasMurid || "")}${t.kelasMurid ? " · " : ""}T${t.tingkatan} ${esc(t.kumpulan)}</span></div></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end"><b>${rm(t.jumlah)}</b>${pill(bl, bk)}${t.status !== "Baharu" ? pill(t.status, "gr") : ""}${t.status === "Baharu" ? `<button class="btn sm" data-a="jt-muat" data-k="${esc(t.no)}">Muat</button>` : ""}</div></div>`; }).join("") + (L.length > 60 ? `<div class="muted small" style="padding:10px 16px">Memaparkan 60 daripada ${L.length}. Perincikan carian untuk menyempitkan.</div>` : "");
  };
  const jtCard = () => `<div class="card" style="padding:14px 0 4px;margin-top:12px"><div style="padding:0 16px 10px;display:flex;flex-direction:column;gap:10px"><div class="sp"><h2>Senarai tempahan</h2><button class="btn line sm" data-a="jt-muat-semula">↻ Muat semula</button></div>
      <input type="search" data-i="jt-q" value="${esc(JT.q)}" placeholder="Cari no. invois, nama murid (sebahagian pun boleh) atau kod barang" aria-label="Cari tempahan" autocomplete="off">
      ${chips(["Belum selesai", "Sudah bayar", "Ada bukti", "Selesai", "Semua"], JT.f, "jt-f")}</div><div id="jt-rows">${jtRows()}</div></div>`;
  async function jtLoad() { JT.busy = true; JT.err = ""; const j = await KP.call("getTempahan"); JT.busy = false; if (j) { JT.list = j.tempahan; JT.loaded = true; } else JT.err = "Gagal memuatkan senarai tempahan."; const e = $("#jt-rows"); if (e) e.innerHTML = jtRows(); }
  const J = { mode: "", sub: "", cat: "", grp: "Luar asrama", ting: 1, cart: {}, kaedah: "Tunai", tunai: "", murid: null, tmp: null, bukti: null, qrMode: "", qrAmt: "", recent: [], last: "", lastAt: 0 };
  const jOk = (b) => (J.mode === "tempahan" ? b.set && (J.grp === "Asrama" ? b.as : b.lr) && b.t[J.ting - 1] : true); // Jualan Terus: SEMUA barang koperasi; Tempahan: ikut SET (kumpulan & tingkatan)
  const jTotal = () => D.barang.reduce((s, b) => s + (J.cart[b.kod] ? b.jual * J.cart[b.kod] : 0), 0);
  function jPrune() { Object.keys(J.cart).forEach((k) => { const b = D.barang.find((x) => x.kod === k); if (!b || !jOk(b)) delete J.cart[k]; }); }
  function jReset() { JT.loaded = false; J.mode = ""; J.sub = ""; J.cat = ""; J.cart = {}; J.tunai = ""; J.murid = null; J.tmp = null; J.recent = []; jClearBukti(); KP.scan.stop(); }
  function jClearBukti() { if (J.bukti && J.bukti.url) URL.revokeObjectURL(J.bukti.url); J.bukti = null; J.qrMode = ""; J.qrAmt = ""; }
  const r2 = (x) => Math.round(x * 100) / 100;
  const jQr = () => { if (!(J.tmp && J.tmp.adaBukti)) return 0; const tot = jTotal(); return J.qrMode === "sama" ? tot : J.qrMode === "beza" ? Math.min(tot, Math.max(0, parseFloat(J.qrAmt) || 0)) : 0; };
  const jDue = () => r2(Math.max(0, jTotal() - jQr()));
  function jBayarState() {
    const tot = jTotal(), tn = parseFloat(J.tunai) || 0, n = Object.keys(J.cart).length, el = $("#j-baki"), bt = $("#j-bayar");
    if (J.tmp) {
      const due = jDue(), blok = J.tmp.adaBukti && (!J.qrMode || (J.qrMode === "beza" && !(parseFloat(J.qrAmt) > 0)));
      if (el) el.textContent = rm(Math.max(0, tn - due));
      if (bt) bt.disabled = !n || blok || (due > 0 && tn + 0.0001 < due);
      return;
    }
    if (el) el.textContent = J.kaedah === "Tunai" ? rm(Math.max(0, tn - tot)) : rm(0);
    if (bt) bt.disabled = !n || (J.kaedah === "Tunai" && tn + 0.0001 < tot);
  }
  function jQrHtml() {
    if (!J.tmp.adaBukti) return `<div class="note small">Tiada bukti pembayaran QR dimuat naik. Teruskan dengan <b>bayaran tunai penuh</b>.</div>`;
    return `<div class="note small"><b>Bukti pembayaran QR ada.</b> Semak amaun pada bukti (paparan di sebelah kiri), kemudian pilih:</div>
      <div class="chips">${[["sama", "✓ Amaun sama"], ["beza", "✗ Amaun tak sama"], ["abai", "Abaikan bukti (tunai penuh)"]].map(([k, v]) => `<button class="ch ${J.qrMode === k ? "on" : ""}" data-a="j-qrm" data-k="${k}">${v}</button>`).join("")}</div>
      ${J.qrMode === "beza" ? `<label class="fld"><span class="lbl">Jumlah pada bukti pembayaran (RM)</span><input data-i="qramt" inputmode="decimal" value="${esc(J.qrAmt)}" placeholder="cth. 50.00"></label>` : ""}`;
  }
  function jDueHtml() {
    const tot = jTotal(), qr = jQr(), due = jDue();
    return `${qr > 0 ? `<div class="sp"><span class="muted">Dibayar melalui QR</span><b class="num">${rm(qr)}</b></div>` : ""}<div class="sp"><span class="lbl">Baki tunai perlu dibayar</span><b class="hd" style="font-size:22px;color:var(--pri-d)">${rm(due)}</b></div>
      ${due > 0 ? `<label class="fld"><span class="lbl">Wang tunai diterima (RM)</span><input data-i="tunai" inputmode="decimal" value="${esc(J.tunai)}"></label><div class="chips"><button class="ch" data-a="j-tn" data-k="${due}">Tepat</button>${[5, 10, 20, 50, 100].map((n) => `<button class="ch" data-a="j-tn" data-k="${n}">${n}</button>`).join("")}</div><div class="sp"><span class="muted">Baki dipulangkan</span><b class="num" id="j-baki"></b></div>` : `<div class="note small">Tiada tunai perlu dikutip.</div>`}`;
  }
  function jCartHtml() {
    const tot = jTotal(), lines = D.barang.filter((b) => J.cart[b.kod]);
    return `<div class="sp"><h2>Troli</h2><span class="muted small">${J.mode === "tempahan" ? J.grp + " · T" + J.ting : "Jualan terus"}</span></div>
      ${lines.map((b) => `<div class="sp" style="border-bottom:1px solid var(--ln2);padding-bottom:6px"><div style="min-width:0"><b style="font-size:13.5px">${esc(b.nama)}</b><div class="muted small">${rm(b.jual)} × ${J.cart[b.kod]} = <b>${rm(b.jual * J.cart[b.kod])}</b></div></div><div class="qty"><button data-a="j-min" data-k="${esc(b.kod)}" aria-label="Kurang">−</button><b class="num">${J.cart[b.kod]}</b><button data-a="j-add" data-k="${esc(b.kod)}" aria-label="Tambah">+</button></div></div>`).join("") || `<div class="empty">Troli kosong.</div>`}
      <div class="sp"><span class="lbl">Jumlah</span><b class="hd" style="font-size:24px;color:var(--pri-d)">${rm(tot)}</b></div>
      ${J.tmp ? jQrHtml() + `<div id="j-paydue" style="display:flex;flex-direction:column;gap:10px">${jDueHtml()}</div>` : `<div class="chips">${["Tunai", "QR DuitNow"].map((k) => `<button class="ch ${k === J.kaedah ? "on" : ""}" data-a="j-kae" data-k="${k}">${k}</button>`).join("")}</div>`}
      ${J.tmp ? "" : J.kaedah === "Tunai" ? `<label class="fld"><span class="lbl">Wang diterima (RM)</span><input data-i="tunai" inputmode="decimal" value="${esc(J.tunai)}"></label>
      <div class="chips"><button class="ch" data-a="j-tn" data-k="${tot}">Tepat</button>${[5, 10, 20, 50, 100].map((n) => `<button class="ch" data-a="j-tn" data-k="${n}">${n}</button>`).join("")}</div><div class="sp"><span class="muted">Baki</span><b class="num" id="j-baki"></b></div>` : `<div class="note small">Imbas QR DuitNow koperasi, sahkan bayaran diterima sebelum teruskan.</div>`}
      <button class="btn cta block" id="j-bayar" data-a="j-bayar" style="font-size:15px">Bayar &amp; cetak resit</button>
      <button class="btn line block" data-a="j-kosong" ${lines.length ? "" : "disabled"}>Kosongkan troli</button>`;
  }
  function jCartRefresh() { const c = $("#j-cart"); if (c) { c.innerHTML = jCartHtml(); jBayarState(); } document.querySelectorAll("[data-kb]").forEach((e) => { const q = J.cart[e.dataset.kb] || 0; e.textContent = q ? "Dalam troli: " + q : ""; }); }
  function jBuyerHtml() {
    if (J.mode === "tempahan") return `<div class="sp"><span class="lbl">Pembeli (daripada tempahan)</span>${pill(J.grp + " · T" + J.ting, "info")}</div>${J.murid ? `<b>${esc(J.murid.nama)}</b> <span class="muted small">${esc(J.murid.kelas)}</span>` : `<span class="muted small">Tanpa nama murid</span>`}`;
    return "";
  }
  function scanCard(title, hint) {
    return `<div class="card pad" style="display:flex;flex-direction:column;gap:10px"><div class="sp"><h2>${title}</h2><span class="muted small" id="j-scanmsg">Membuka kamera…</span></div><div id="j-reader"></div>
      <div style="display:flex;gap:8px"><input id="j-code" data-enter="j-codego" placeholder="${hint}" autocomplete="off" autocapitalize="off"><button class="btn" data-a="j-codego">Tambah</button></div>
      <div class="muted small">Alat pengimbas USB: klik petak di atas, kemudian imbas — ia dimasukkan automatik.</div>${J.mode === "terus" ? `<div id="j-recent" class="small">${jRecentHtml()}</div>` : ""}</div>`;
  }
  const jRecentHtml = () => (J.recent.length ? `<b class="lbl">Imbasan terkini</b>` + J.recent.map((r) => `<div>✓ ${esc(r)}</div>`).join("") : "");
  function jLeft() {
    const back = (t) => `<div class="crumb"><button class="btn line sm" data-a="j-back">‹ Kembali</button><b class="hd" style="color:var(--pri-d)">${t}</b></div>`;
    if (!J.mode) return `<div class="bigs">${big("j-mode", "Jualan Terus", "Imbas barcode atau pilih barang terus daripada kategori.", "terus", "cta").replace('data-a="j-mode"', 'data-a="j-mode" data-k="terus"')}${big("j-mode", "Jualan Tempahan", "Imbas QR / barcode pada bill tempahan, senarai barang terus masuk troli.", "tempahan").replace('data-a="j-mode"', 'data-a="j-mode" data-k="tempahan"')}</div>`;
    if (J.mode === "tempahan") {
      if (J.tmp) return `${back("Jualan Tempahan")}<div class="card pad" style="display:flex;flex-direction:column;gap:8px"><div class="sp"><h2>Tempahan ${esc(J.tmp.no)}</h2>${pill("Dimuatkan ke troli", "ok")}</div><div class="muted small">${esc(J.tmp.tarikh.slice(0, 16))} · oleh ${esc(J.tmp.oleh)}${J.tmp.catatan ? " · " + esc(J.tmp.catatan) : ""}</div><div class="sp"><span>Bayaran: ${pill(J.tmp.bayar, J.tmp.bayar === "Disahkan" ? "ok" : J.tmp.bayar === "Belum" ? "gr" : "warn")}</span><span style="display:flex;gap:8px">${J.tmp.adaBukti ? `<button class="btn line sm" data-a="j-bukti">Besarkan bukti</button>` : ""}</span></div>${J.tmp.adaBukti ? (J.bukti ? (/pdf/.test(J.bukti.mime) ? `<iframe src="${J.bukti.url}" title="Bukti bayaran" style="width:100%;height:340px;border:1px solid var(--ln);border-radius:10px"></iframe>` : `<img src="${J.bukti.url}" alt="Bukti bayaran" data-a="j-bukti" style="max-width:100%;max-height:340px;object-fit:contain;border:1px solid var(--ln);border-radius:10px;cursor:zoom-in;align-self:flex-start">`) : `<div class="muted small">Memuatkan bukti pembayaran…</div>`) : `<div class="note small">Tiada bukti pembayaran QR. Terima bayaran tunai di kaunter.</div>`}<div>Semak troli di sebelah, kemudian bayar. Barang yang habis stok tidak dimasukkan.</div><div><button class="btn line sm" data-a="j-tmp-lain">Imbas tempahan lain</button></div></div>`;
      if (!JT.loaded && !JT.busy) jtLoad();
      return `${back("Jualan Tempahan")}${scanCard("Imbas bill tempahan", "Atau taip no. tempahan, cth. T-K7M2QX9")}${jtCard()}`;
    }
    if (!J.sub) return `${back("Jualan Terus")}<div class="bigs">${big("j-sub", "Scan barcode", "Imbas barcode barang — terus masuk troli.", "scan", "cta").replace('data-a="j-sub"', 'data-a="j-sub" data-k="scan"')}${big("j-sub", "Pilih barang", "Pilih kategori, kemudian pilih barang.", "pilih").replace('data-a="j-sub"', 'data-a="j-sub" data-k="pilih"')}</div>`;
    if (J.sub === "scan") return `${back("Jualan Terus · Scan barcode")}${scanCard("Imbas barcode barang", "Atau taip kod / barcode barang")}`;
    const ok = D.barang.filter(jOk);
    if (!J.cat) {
      const cats = D.kat.concat(ok.map((b) => b.kategori).filter((k) => !D.kat.includes(k))).filter((k, i, a) => a.indexOf(k) === i);
      return `${back("Jualan Terus · Pilih kategori")}<div class="bigs">${cats.map((k) => { const n = ok.filter((b) => b.kategori === k).length; return `<button class="big" style="${acc(k)}" data-a="j-cat" data-k="${esc(k)}" ${n ? "" : "disabled"}><span class="ic">${ini(k)}</span><b>${esc(k)}</b><span class="s">${n} barang</span></button>`; }).join("")}</div>`;
    }
    const L = ok.filter((b) => b.kategori === J.cat);
    return `${back("Jualan Terus · " + esc(J.cat))}<div class="tiles">${L.map((b) => `<button class="tile" style="${acc(b.kategori + b.nama)}" data-a="j-add" data-k="${esc(b.kod)}" ${b.stok <= 0 ? "disabled" : ""}><span class="pv">${ini(b.nama)}</span><b>${esc(b.nama)}</b><span class="pr">${rm(b.jual)}</span><span>${stokPill(b)}</span><span class="small tb" style="color:var(--pri)" data-kb="${esc(b.kod)}">${J.cart[b.kod] ? "Dalam troli: " + J.cart[b.kod] : ""}</span></button>`).join("") || `<div class="empty card" style="grid-column:1/-1">Tiada barang dalam kategori ini.</div>`}</div>`;
  }
  KP.pages.jualan = {
    async load() { await loadBarang(true); },
    view() {
      const side = J.mode ? `<div class="cart" style="display:flex;flex-direction:column;gap:12px">${J.mode === "tempahan" ? `<div class="card pad" style="display:flex;flex-direction:column;gap:10px">${jBuyerHtml()}</div>` : ""}<div class="card pad" id="j-cart" style="display:flex;flex-direction:column;gap:10px">${jCartHtml()}</div></div>` : "";
      return `<div class="pos"><div class="prods" style="display:flex;flex-direction:column;gap:12px">${jLeft()}</div>${side}</div>`;
    },
    after() {
      jBayarState();
      if ($("#j-reader")) { const inp = $("#j-code"); if (inp) inp.focus(); KP.scan.start("j-reader", (t) => jOnCode(t), (m) => { const e = $("#j-scanmsg"); if (e) e.textContent = m; }); } else KP.scan.stop();
    }
  };
  async function jOnCode(code) {
    code = String(code || "").trim(); if (!code) return;
    const now = Date.now(); if (code === J.last && now - J.lastAt < 1500) return; J.last = code; J.lastAt = now;
    if (J.mode === "tempahan") { jLoadTmp(code); return; }
    const b = findCode(code);
    if (!b) { KP.beep(false); KP.toast("Barcode tidak dikenali: " + code, true); return; }
    if (jAdd(b, true)) { J.recent.unshift(b.nama + " — " + rm(b.jual)); J.recent = J.recent.slice(0, 5); const r = $("#j-recent"); if (r) r.innerHTML = jRecentHtml(); }
  }
  function jAdd(b, scan) {
    if (!jOk(b)) { KP.beep(false); KP.toast(b.nama + " tidak boleh dijual untuk tempahan ini.", true); return false; }
    if ((J.cart[b.kod] || 0) >= b.stok) { KP.beep(false); KP.toast("Stok " + b.nama + " tidak mencukupi.", true); return false; }
    J.cart[b.kod] = (J.cart[b.kod] || 0) + 1; if (scan) KP.beep(true); jCartRefresh(); return true;
  }
  async function jLoadTmp(no) {
    no = String(no).trim().toUpperCase();
    const j = await KP.call("getTempahan"); if (!j) return;
    const t = j.tempahan.find((x) => x.no.toUpperCase() === no);
    if (!t) { KP.beep(false); KP.toast("Tempahan tidak dijumpai: " + no, true); return; }
    if (t.status !== "Baharu") { KP.beep(false); KP.toast("Tempahan " + t.no + " sudah " + t.status.toLowerCase() + ".", true); return; }
    jClearBukti(); J.tmp = t; J.grp = t.kumpulan; J.ting = t.tingkatan; J.murid = t.murid ? { nama: t.murid, kelas: t.kelasMurid } : null; J.cart = {};
    const miss = [];
    t.items.forEach((i) => { const b = D.barang.find((x) => x.kod === i.kod); if (!b || !jOk(b)) { miss.push(b ? b.nama : i.kod); return; } if (b.stok <= 0) { miss.push(b.nama + " (stok kosong)"); return; } J.cart[b.kod] = Math.min(i.qty, b.stok); if (i.qty > b.stok) miss.push(b.nama + " (stok " + b.stok + ")"); });
    KP.beep(true); KP.rerender(); if (miss.length) KP.toast("Tidak lengkap: " + miss.join(", "), true);
    if (t.adaBukti) {
      const j2 = await KP.call("lihatBukti", { no: t.no });
      if (j2 && J.tmp && J.tmp.no === t.no) {
        const bin = atob(j2.data), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        J.bukti = { url: URL.createObjectURL(new Blob([u8], { type: j2.mime })), mime: j2.mime }; KP.rerender();
      }
    }
  }
  KP.inp["jt-q"] = (t) => { JT.q = t.value; const e = $("#jt-rows"); if (e) e.innerHTML = jtRows(); };
  KP.act["jt-f"] = (t) => { JT.f = t.dataset.k; KP.rerender(); };
  KP.act["jt-muat-semula"] = () => { JT.loaded = false; jtLoad(); };
  KP.act["jt-muat"] = (t) => jLoadTmp(t.dataset.k);
  KP.act["jt-copy"] = async (t) => { const no = t.dataset.k; let ok = false; try { await navigator.clipboard.writeText(no); ok = true; } catch (e) { try { const a = document.createElement("textarea"); a.value = no; a.style.position = "fixed"; a.style.opacity = "0"; document.body.appendChild(a); a.select(); ok = document.execCommand("copy"); a.remove(); } catch (e2) {} } KP.toast(ok ? "No. invois disalin: " + no : "Tidak dapat menyalin. Tekan lama pada no. untuk salin.", !ok); };
  KP.act["j-mode"] = (t) => { if (t.dataset.k === "tempahan") JT.loaded = false; J.mode = t.dataset.k; J.sub = ""; J.cat = ""; J.cart = {}; J.tmp = null; KP.rerender(); };
  KP.act["j-sub"] = (t) => { J.sub = t.dataset.k; J.cat = ""; KP.rerender(); };
  KP.act["j-cat"] = (t) => { J.cat = t.dataset.k; KP.rerender(); };
  KP.act["j-back"] = () => { JT.loaded = false; if (J.mode === "terus" && J.sub === "pilih" && J.cat) J.cat = ""; else if (J.mode === "terus" && J.sub) J.sub = ""; else { const had = Object.keys(J.cart).length; if (had && !confirm("Troli akan dikosongkan. Teruskan?")) return; jReset(); } KP.rerender(); };
  KP.act["j-bukti"] = async () => {
    const j = await KP.call("lihatBukti", { no: J.tmp.no }); if (!j) return;
    const bin = atob(j.data), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u8], { type: j.mime }));
    KP.modal(`<h2 style="margin-bottom:10px">Bukti bayaran ${esc(J.tmp.no)}</h2>${/pdf/.test(j.mime) ? `<iframe src="${url}" style="width:100%;height:60vh;border:0"></iframe>` : `<img src="${url}" alt="Bukti bayaran" style="max-width:100%;border-radius:8px">`}<div class="sp" style="margin-top:12px"><a class="btn line" href="${url}" download="${esc(j.nama)}">Muat turun</a><button class="btn" data-a="tutup">Tutup</button></div>`);
  };
  KP.act["j-qrm"] = (t) => { J.qrMode = t.dataset.k; if (J.qrMode !== "beza") J.qrAmt = ""; J.tunai = ""; jCartRefresh(); };
  KP.inp.qramt = (t) => { if (J.qrAmt === t.value) return; J.qrAmt = t.value; J.tunai = ""; const e = $("#j-paydue"); if (e) e.innerHTML = jDueHtml(); jBayarState(); };
  KP.act["j-tmp-lain"] = () => { JT.loaded = false; jClearBukti(); J.tmp = null; J.cart = {}; KP.rerender(); };
  KP.act["j-codego"] = () => { const i = $("#j-code"); if (!i) return; const v = i.value; i.value = ""; J.last = ""; jOnCode(v); i.focus(); };
  KP.act["j-kae"] = (t) => { J.kaedah = t.dataset.k; jCartRefresh(); };
  KP.act["j-add"] = (t) => { const b = D.barang.find((x) => x.kod === t.dataset.k); if (b) jAdd(b, false); };
  KP.act["j-min"] = (t) => { const k = t.dataset.k; if (--J.cart[k] <= 0) delete J.cart[k]; jCartRefresh(); };
  KP.act["j-kosong"] = () => { J.cart = {}; J.tunai = ""; jCartRefresh(); };
  KP.act["j-tn"] = (t) => { J.tunai = String(+t.dataset.k); jCartRefresh(); };
  KP.inp.tunai = (t) => { J.tunai = t.value; jBayarState(); };
  KP.act["j-bayar"] = async (t) => {
    const items = Object.keys(J.cart).map((k) => ({ kod: k, qty: J.cart[k] }));
    t.disabled = true; t.textContent = "Memproses…";
    const j = await KP.call("jual", { items, kumpulan: J.mode === "terus" ? "Terus" : J.grp, tingkatan: J.mode === "terus" ? 0 : J.ting, kaedah: J.tmp ? "Tunai" : J.kaedah, qr: J.tmp ? jQr() : 0, tunai: parseFloat(J.tunai) || 0, tempahan: J.tmp ? J.tmp.no : "", murid: J.murid ? { nama: J.murid.nama, kelas: J.murid.kelas } : null });
    if (!j) { t.disabled = false; t.textContent = "Bayar"; return; }
    const r = j.resit; r.murid = J.murid ? J.murid.nama : ""; r.kelasMurid = J.murid ? J.murid.kelas : "";
    jReset(); KP.lastResit = r;
    KP.modal(`<h2 style="margin-bottom:10px">Jualan berjaya</h2>${resitHtml(r)}<div class="sp" style="margin-top:12px"><button class="btn line" data-a="tutup">Tutup</button><button class="btn cta" data-a="cetak-baru">Cetak resit</button></div>`);
    try { await loadBarang(true); } catch (e) {}
    KP.rerender();
  };
  KP.act["cetak-baru"] = () => KP.printResit(KP.lastResit);

  /* ================= TEMPAHAN (cipta bill + QR) ================= */
  const TM = { list: [], f: "Baharu", grp: "Luar asrama", ting: 1, murid: null, items: {}, pick: "", catatan: "" };
  const tmOk = (b) => b.set && (TM.grp === "Asrama" ? b.as : b.lr) && b.t[TM.ting - 1];
  const tmTotal = () => Object.keys(TM.items).reduce((s, k) => { const b = D.barang.find((x) => x.kod === k); return s + (b ? b.jual * TM.items[k] : 0); }, 0);
  function billHtml(t) {
    const nm = (KP.S.tetapan.resit || {}).nama || "Koperasi";
    let img = ""; try { const q = qrcode(0, "M"); q.addData(t.no); q.make(); img = `<img alt="QR ${esc(t.no)}" src="${q.createDataURL(5, 2)}" style="width:150px;height:150px;image-rendering:pixelated">`; } catch (e) { img = `<div class="muted small">QR tidak dapat dijana</div>`; }
    const rows = t.items.map((i) => { const b = D.barang.find((x) => x.kod === i.kod); return { nama: (b ? (b.varian || b.nama) : i.kod) + (i.saiz ? " (saiz " + i.saiz + ")" : ""), qty: i.qty, harga: b ? b.jual : 0 }; });
    return `<div class="resit"><div style="text-align:center"><b>${esc(nm).replace(/ (PEKAN )/i, "<br>$1")}</b><br>BILL TEMPAHAN<br><b style="font-size:16px">${esc(t.no)}</b><br>${esc(t.tarikh)}</div><hr>
      ${t.murid ? `<div>Murid: ${esc(t.murid)}${t.kelasMurid ? " (" + esc(t.kelasMurid) + ")" : ""}</div>` : ""}<div>Pembeli: ${esc(t.kumpulan)} · T${t.tingkatan}</div><hr>
      ${rows.map((r) => `<div class="l"><span>${esc(r.nama)}<br>&nbsp;${r.qty} x ${Number(r.harga).toFixed(2)}</span><span>${(r.qty * r.harga).toFixed(2)}</span></div>`).join("")}<hr>
      <div class="l"><b>JUMLAH</b><b>${rm(t.jumlah)}</b></div><hr><div style="text-align:center">${img}<br>Tunjuk QR ini di kaunter koperasi</div></div>`;
  }
  KP.pages.tempahan = {
    async load() { const [, j] = await Promise.all([loadBarang(true), KP.call("getTempahan")]); if (!j) throw new Error("tempahan"); TM.list = j.tempahan; loadMurid(); },
    view() {
      const ok = D.barang.filter(tmOk), lines = Object.keys(TM.items).map((k) => D.barang.find((b) => b.kod === k)).filter(Boolean);
      const L = TM.list.filter((t) => TM.f === "Semua" || t.status === TM.f);
      return `<div class="row" style="align-items:flex-start"><div class="card pad grow" style="flex:1.2 1 480px;display:flex;flex-direction:column;gap:12px"><h2>Tempahan baharu</h2>
        <div style="position:relative"><label class="fld"><span class="lbl">Cari murid (pilihan)</span><input id="t-mq" data-i="tmq" autocomplete="off" placeholder="Taip nama atau No. KP murid" value="${esc(TM.murid ? TM.murid.nama + " (" + TM.murid.kelas + ")" : "")}"></label><div class="dd" id="t-dd" hidden></div></div>
        <div class="sp"><div class="chips">${["Luar asrama", "Asrama"].map((k) => `<button class="ch ${k === TM.grp ? "on" : ""}" data-a="tm-grp" data-k="${k}">${k}</button>`).join("")}</div><div class="chips">${[1, 2, 3, 4, 5, 6].map((n) => `<button class="ch ${n === TM.ting ? "on" : ""}" data-a="tm-ting" data-k="${n}">T${n}</button>`).join("")}</div></div>
        <div style="display:flex;gap:8px;align-items:end"><label class="fld" style="flex:1"><span class="lbl">Barang</span><select data-i="tm-pick" id="tm-pick"><option value="">— pilih barang —</option>${ok.map((b) => `<option value="${esc(b.kod)}" ${b.kod === TM.pick ? "selected" : ""}>${esc(b.nama)} — ${rm(b.jual)}</option>`).join("")}</select></label><button class="btn" data-a="tm-add">+ Tambah</button></div>
        <div class="tbl"><table style="min-width:360px"><thead><tr><th>Barang</th><th class="c">Kuantiti</th><th class="r">Jumlah</th><th></th></tr></thead><tbody>${lines.map((b) => `<tr><td><b>${esc(b.nama)}</b></td><td class="c"><span class="qty"><button data-a="tm-min" data-k="${esc(b.kod)}" aria-label="Kurang">−</button><b class="num">${TM.items[b.kod]}</b><button data-a="tm-plus" data-k="${esc(b.kod)}" aria-label="Tambah">+</button></span></td><td class="r num">${rm(b.jual * TM.items[b.kod])}</td><td><button class="btn line sm" data-a="tm-del" data-k="${esc(b.kod)}">Buang</button></td></tr>`).join("") || `<tr><td colspan="4" class="empty">Belum ada barang.</td></tr>`}</tbody></table></div>
        <label class="fld"><span class="lbl">Catatan (pilihan)</span><input data-i="tm-cat" value="${esc(TM.catatan)}"></label>
        <div class="sp"><b class="hd" style="font-size:20px;color:var(--pri-d)">${rm(tmTotal())}</b><button class="btn cta" data-a="tm-simpan" ${lines.length ? "" : "disabled"}>Simpan &amp; jana bill QR</button></div></div>
        <div class="card grow" style="flex:1 1 420px;padding:14px 0 6px"><div class="sp" style="padding:0 16px 10px"><h2>Senarai tempahan</h2>${chips(["Baharu", "Selesai", "Batal", "Semua"], TM.f, "tm-f")}</div><div class="tbl"><table style="min-width:420px"><thead><tr><th>No.</th><th>Pembeli</th><th class="r">Jumlah</th><th>Status</th><th></th></tr></thead><tbody>${L.map((t) => `<tr><td><b>${esc(t.no)}</b><div class="muted small">${esc(t.tarikh.slice(5, 16))}</div></td><td>${esc(t.murid || t.kumpulan + " · T" + t.tingkatan)}</td><td class="r num">${rm(t.jumlah)}</td><td>${pill(t.status, { Baharu: "warn", Selesai: "ok", Batal: "bad" }[t.status] || "gr")}</td><td style="white-space:nowrap"><button class="btn line sm" data-a="tm-bill" data-k="${esc(t.no)}">Bill</button>${t.status === "Baharu" ? ` <button class="btn bad sm" data-a="tm-batal" data-k="${esc(t.no)}">Batal</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">Tiada tempahan.</td></tr>`}</tbody></table></div></div></div>`;
    }
  };
  const tmPrune = () => Object.keys(TM.items).forEach((k) => { const b = D.barang.find((x) => x.kod === k); if (!b || !tmOk(b)) delete TM.items[k]; });
  KP.act["tm-grp"] = (t) => { TM.grp = t.dataset.k; TM.murid = null; tmPrune(); KP.rerender(); };
  KP.act["tm-ting"] = (t) => { TM.ting = +t.dataset.k; TM.murid = null; tmPrune(); KP.rerender(); };
  KP.inp.tmq = (t) => { if (TM.murid) TM.murid = null; muridDd(t.value, "t-dd", "tm-mpick"); };
  KP.act["tm-mpick"] = (t) => { const m = KP.mlist[+t.dataset.k]; TM.murid = m; TM.grp = m.kumpulan; if (m.tingkatan) TM.ting = m.tingkatan; tmPrune(); KP.rerender(); };
  KP.inp["tm-pick"] = (t) => { TM.pick = t.value; };
  KP.inp["tm-cat"] = (t) => { TM.catatan = t.value; };
  KP.act["tm-add"] = () => { if (!TM.pick) { KP.toast("Pilih barang dahulu.", true); return; } TM.items[TM.pick] = (TM.items[TM.pick] || 0) + 1; KP.rerender(); };
  KP.act["tm-plus"] = (t) => { TM.items[t.dataset.k]++; KP.rerender(); };
  KP.act["tm-min"] = (t) => { if (--TM.items[t.dataset.k] <= 0) delete TM.items[t.dataset.k]; KP.rerender(); };
  KP.act["tm-del"] = (t) => { delete TM.items[t.dataset.k]; KP.rerender(); };
  KP.act["tm-f"] = (t) => { TM.f = t.dataset.k; KP.rerender(); };
  KP.act["tm-simpan"] = async (t) => {
    t.disabled = true;
    const j = await KP.call("saveTempahan", { murid: TM.murid ? TM.murid.nama : "", kelas: TM.murid ? TM.murid.kelas : "", kumpulan: TM.grp, tingkatan: TM.ting, items: Object.keys(TM.items).map((k) => ({ kod: k, qty: TM.items[k] })), catatan: TM.catatan });
    if (!j) { t.disabled = false; return; }
    const bill = { no: j.no, tarikh: j.tarikh, murid: TM.murid ? TM.murid.nama : "", kelasMurid: TM.murid ? TM.murid.kelas : "", kumpulan: TM.grp, tingkatan: TM.ting, jumlah: j.jumlah, items: Object.keys(TM.items).map((k) => ({ kod: k, qty: TM.items[k] })) };
    TM.items = {}; TM.murid = null; TM.catatan = ""; TM.pick = ""; KP.lastBill = bill;
    KP.modal(`<h2 style="margin-bottom:10px">Tempahan disimpan</h2>${billHtml(bill)}<div class="sp" style="margin-top:12px"><button class="btn line" data-a="tutup">Tutup</button><button class="btn cta" data-a="tm-cetak">Cetak bill</button></div>`);
    KP.pages.tempahan.load().then(() => KP.rerender()).catch(() => {});
  };
  KP.act["tm-cetak"] = () => KP.printHtml(billHtml(KP.lastBill));
  KP.act["tm-bill"] = (t) => { const x = TM.list.find((y) => y.no === t.dataset.k); KP.lastBill = x; KP.modal(`<h2 style="margin-bottom:10px">Bill ${esc(x.no)} ${pill(x.status, x.status === "Baharu" ? "warn" : x.status === "Selesai" ? "ok" : "bad")}</h2>${billHtml(x)}<div class="sp" style="margin-top:12px"><button class="btn line" data-a="tutup">Tutup</button><button class="btn cta" data-a="tm-cetak">Cetak bill</button></div>`); };
  KP.act["tm-batal"] = async (t) => { if (!confirm("Batalkan tempahan " + t.dataset.k + "?")) return; const j = await KP.call("batalTempahan", { no: t.dataset.k, sebab: "" }); if (!j) return; KP.toast("Tempahan dibatalkan."); KP.draw(true); };

  /* ================= SEJARAH ================= */
  const H = { dari: "", hingga: "", grp: "Semua", list: [], sel: "" };
  KP.pages.sejarah = {
    async load() {
      if (!H.dari) H.dari = H.hingga = KP.today();
      const j = await KP.call("getJualan", { dari: H.dari, hingga: H.hingga });
      if (!j) throw new Error("jualan");
      H.list = j.resit; if (!H.list.some((r) => r.no === H.sel)) H.sel = "";
    },
    view() {
      const L = H.list.filter((r) => H.grp === "Semua" || (H.grp === "Tempahan" ? r.kumpulan !== "Terus" : r.kumpulan === H.grp)), sah = L.filter((r) => r.status !== "Batal"), sel = H.list.find((r) => r.no === H.sel);
      const sum = (f) => sah.filter(f).reduce((s, r) => s + r.jumlah, 0), admin = KP.S.user.admin;
      return `<div class="card pad"><div class="sp"><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:end"><label class="fld"><span class="lbl">Dari</span><input type="date" data-i="h-dari" value="${H.dari}"></label><label class="fld"><span class="lbl">Hingga</span><input type="date" data-i="h-hingga" value="${H.hingga}"></label></div>${chips(["Semua", "Terus", "Tempahan", "Asrama", "Luar asrama"], H.grp, "h-grp")}</div></div>
      <div class="row"><div class="card kpi"><div class="lbl">Jumlah jualan</div><div class="v">${rm(sum(() => 1))}</div></div><div class="card kpi"><div class="lbl">Bil. resit</div><div class="v">${sah.length}</div></div><div class="card kpi"><div class="lbl">Tunai</div><div class="v">${rm(sah.reduce((s, r) => s + r.jumlah - Math.min(r.jumlah, r.qr || 0), 0))}</div></div><div class="card kpi"><div class="lbl">QR DuitNow</div><div class="v">${rm(sah.reduce((s, r) => s + Math.min(r.jumlah, r.qr || 0), 0))}</div></div><div class="card kpi"><div class="lbl">Resit tempahan</div><div class="v">${sah.filter((r) => r.kumpulan !== "Terus").length}</div></div></div>
      <div class="pos"><div class="card prods" style="padding:6px 0"><div class="tbl"><table><thead><tr><th>No.</th><th>Masa</th><th>Murid / pembeli</th><th>Tempahan</th><th>Kaedah</th><th class="r">Jumlah</th><th>Status</th></tr></thead><tbody>${L.map((r) => `<tr class="${r.no === H.sel ? "sel" : ""}" data-a="h-pilih" data-k="${esc(r.no)}" style="cursor:pointer"><td><b>${esc(r.no)}</b></td><td class="muted">${esc(r.tarikh.slice(5, 16))}</td><td>${esc(r.murid || r.kumpulan + (r.tingkatan ? " · T" + r.tingkatan : ""))}</td><td class="muted">${esc(r.tempahan || "—")}</td><td>${esc(r.kaedah)}</td><td class="r num">${rm(r.jumlah)}</td><td>${r.status === "Batal" ? pill("Batal", "bad") : pill("Sah", "ok")}</td></tr>`).join("") || `<tr><td colspan="7" class="empty">Tiada resit dalam tempoh ini.</td></tr>`}</tbody></table></div></div>
      <div class="card pad cart" style="display:flex;flex-direction:column;gap:10px">${sel ? `${resitHtml(sel)}<button class="btn line block" data-a="h-cetak">Cetak semula resit</button>${admin && sel.status !== "Batal" ? `<button class="btn bad block" data-a="h-batal">Batalkan resit (Admin)</button><div class="muted small">Stok dipulangkan dan tindakan direkodkan.</div>` : ""}${sel.status === "Batal" ? `<div class="muted small">Dibatalkan oleh ${esc(sel.dibatalOleh)}: ${esc(sel.sebabBatal)}</div>` : ""}` : `<div class="empty">Pilih resit untuk melihat butiran.</div>`}</div></div>`;
    }
  };
  KP.inp["h-dari"] = (t) => { H.dari = t.value; if (H.hingga < H.dari) H.hingga = H.dari; KP.draw(true); };
  KP.inp["h-hingga"] = (t) => { H.hingga = t.value; if (H.hingga < H.dari) H.dari = H.hingga; KP.draw(true); };
  KP.act["h-grp"] = (t) => { H.grp = t.dataset.k; KP.rerender(); };
  KP.act["h-pilih"] = (t) => { H.sel = t.dataset.k; KP.rerender(); };
  KP.act["h-cetak"] = () => KP.printResit(H.list.find((r) => r.no === H.sel));
  KP.act["h-batal"] = () => KP.modal(`<h2>Batalkan resit ${esc(H.sel)}</h2><label class="fld" style="margin-top:10px"><span class="lbl">Sebab pembatalan</span><textarea id="h-sebab"></textarea></label><div class="sp" style="margin-top:12px"><button class="btn line" data-a="tutup">Tidak</button><button class="btn bad" data-a="h-batal-ok">Batalkan resit</button></div>`);
  KP.act["h-batal-ok"] = async () => { const j = await KP.call("batalJualan", { no: H.sel, sebab: val("h-sebab") }); if (!j) return; KP.closeModal(); KP.toast("Resit dibatalkan."); KP.draw(true); };

  /* ================= BARANGAN (Admin) ================= */
  const B = { kat: "Semua", q: "", imp: [], fname: "", paste: "" };
  const UNIT_RE = /\b(PEK|PAK|BTG|BATANG|BIJI|BUAH|BOTOL|TIN|BUNGKUS|KETUL|PASANG|KOTAK|BKS|PCS|SET|HELAI)\b\s*$/i;
  function parseLines(lines) {
    const out = []; let cat = "";
    const ex = new Set(D.barang.map((b) => b.nama.toLowerCase()));
    lines.forEach((raw) => {
      let ln = raw.replace(/\s+/g, " ").trim(); if (!ln) return;
      const pr = [...ln.matchAll(/(?:RM\s*)?(\d{1,4}\.\d{2})(?!\d)/gi)].map((m) => parseFloat(m[1]));
      if (!pr.length) {
        const h = ln.replace(/[:\-–]+$/, "").trim();
        if (h.length >= 3 && h.length <= 40 && !/\d{3,}/.test(h) && (h === h.toUpperCase() || /:$/.test(ln))) { const m = kats().find((k) => k.toLowerCase() === h.toLowerCase() || k.toLowerCase().replace(/&/g, "dan") === h.toLowerCase()); cat = m || h.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()); }
        return;
      }
      let nama = ln.replace(/(?:RM\s*)?\d{1,4}\.\d{2}(?!\d)/gi, " ").replace(/^\s*\d+[.)]\s+/, "").replace(/\s+/g, " ").trim();
      let unit = ""; const um = nama.match(UNIT_RE); if (um) { unit = um[1].charAt(0).toUpperCase() + um[1].slice(1).toLowerCase(); nama = nama.replace(UNIT_RE, "").trim(); }
      nama = nama.replace(/[|;,:\-–]+$/, "").trim();
      out.push({ nama, kategori: cat, unit: unit || "Biji", jual: pr[pr.length - 1], kos: pr.length > 1 ? pr[0] : "", on: true });
    });
    out.forEach((r) => { r.st = bStatus(r, ex); r.on = r.st !== "S"; });
    return out;
  }
  function bStatus(r, ex) {
    ex = ex || new Set(D.barang.map((b) => b.nama.toLowerCase()));
    if (!r.nama || r.nama.length < 3 || !(+r.jual > 0) || +r.jual > 500) return "S";
    return ex.has(r.nama.toLowerCase()) ? "A" : "B";
  }
  async function pdfLines(file) {
    if (!window.pdfjsLib) throw new Error("Pustaka PDF tidak dapat dimuatkan (semak sambungan internet).");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise, lines = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const c = await (await pdf.getPage(p)).getTextContent(), rows = {};
      c.items.forEach((it) => { if (!it.str.trim()) return; const y = Math.round(it.transform[5] / 4); (rows[y] = rows[y] || []).push(it); });
      Object.keys(rows).map(Number).sort((a, b) => b - a).forEach((y) => lines.push(rows[y].sort((a, b) => a.transform[4] - b.transform[4]).map((i) => i.str.trim()).join(" ")));
    }
    return lines;
  }
  KP.pages.barangan = {
    async load() { await loadBarang(false); },
    view() {
      const L = D.barang.filter((b) => (B.kat === "Semua" || b.kategori === B.kat) && (!B.q || (b.nama + b.kod).toLowerCase().includes(B.q.toLowerCase()))), nSel = B.imp.filter((r) => r.on).length;
      const c = { B: B.imp.filter((r) => r.st === "B").length, A: B.imp.filter((r) => r.st === "A").length, S: B.imp.filter((r) => r.st === "S").length };
      return `<div class="row" style="align-items:stretch"><div class="card pad grow" style="flex:1.3 1 560px;display:flex;flex-direction:column;gap:12px"><h2>Tambah barang secara manual</h2>
        <div class="form"><label class="fld span2"><span class="lbl">Nama barang</span><input id="m-nama"></label><label class="fld"><span class="lbl">Kod (auto jika kosong)</span><input id="m-kod"></label>
        <label class="fld"><span class="lbl">Kategori</span><select id="m-kat" data-i="kat-baru">${katOpts("")}</select></label><label class="fld"><span class="lbl">Unit</span><input id="m-unit" value="Biji"></label><label class="fld"><span class="lbl">Stok awal</span><input id="m-stok" type="number" min="0" value="0"></label>
        <label class="fld"><span class="lbl">Harga kos (RM)</span><input id="m-kos" inputmode="decimal"></label><label class="fld"><span class="lbl">Harga jual (RM)</span><input id="m-jual" inputmode="decimal"></label><label class="fld"><span class="lbl">Stok minimum</span><input id="m-min" type="number" min="0" value="${(KP.S.tetapan.resit || {}).minLalai || 10}"></label></div>
        <div class="sp"><span class="muted small" style="max-width:360px">Barang baharu belum dijual sehingga ditetapkan di Inventori &amp; Akses (asrama / luar asrama, T1–T6).</span><button class="btn cta" data-a="b-simpan">Simpan barang</button></div></div>
        <div class="card pad grow" style="flex:1 1 420px;display:flex;flex-direction:column;gap:10px"><h2>Import daripada fail PDF</h2>
        <label class="drop" id="b-drop"><b class="hd">Seret fail PDF senarai harga ke sini</b><span class="muted small">atau klik untuk pilih fail</span><input type="file" accept="application/pdf" data-i="b-file" hidden></label>
        ${B.fname ? `<div class="note small"><b>${esc(B.fname)}</b> — ${B.imp.length} barang dijumpai</div>` : ""}
        <details><summary class="small muted" style="cursor:pointer">PDF imbasan / tidak terbaca? Tampal teks senarai harga</summary><textarea id="b-paste" placeholder="Satu barang setiap baris, cth:&#10;MINUMAN&#10;Milo Tin 240ml 2.50" style="margin-top:8px"></textarea><button class="btn line sm" data-a="b-baca" style="margin-top:6px">Baca teks</button></details>
        <div class="muted small">Anda semak hasil dahulu. Tiada apa disimpan sebelum menekan Import.</div></div></div>
        ${B.imp.length ? `<div class="card" style="padding:14px 0 8px"><div class="sp" style="padding:0 16px 10px"><h2>Semak hasil imbasan</h2><div style="display:flex;gap:8px;flex-wrap:wrap">${pill(c.B + " Baharu", "ok")}${pill(c.A + " Sudah ada", "ind")}${pill(c.S + " Perlu semak", "warn")}</div></div>
        <div class="tbl"><datalist id="b-dl">${kats().map((k) => `<option value="${esc(k)}">`).join("")}</datalist><table><thead><tr><th></th><th>Nama</th><th>Kategori</th><th>Unit</th><th>Kos</th><th>Jual (RM)</th><th>Status</th></tr></thead><tbody>${B.imp.map((r, i) => `<tr style="${r.st === "S" ? "background:#FFFBEB" : ""}"><td><button class="cb ${r.on ? "on" : ""}" data-a="b-tog" data-k="${i}" aria-label="Pilih ${esc(r.nama)}">${r.on ? "✓" : ""}</button></td><td><input data-i="b-f" data-k="${i}" data-f="nama" value="${esc(r.nama)}"></td><td><input list="b-dl" data-i="b-f" data-k="${i}" data-f="kategori" value="${esc(r.kategori)}"></td><td><input style="width:84px" data-i="b-f" data-k="${i}" data-f="unit" value="${esc(r.unit)}"></td><td><input style="width:76px" data-i="b-f" data-k="${i}" data-f="kos" value="${esc(r.kos)}"></td><td><input style="width:84px" data-i="b-f" data-k="${i}" data-f="jual" value="${esc(r.jual)}"></td><td>${r.st === "B" ? pill("Baharu", "ok") : r.st === "A" ? pill("Sudah ada", "ind") : pill("Perlu semak", "warn")}</td></tr>`).join("")}</tbody></table></div>
        <div class="sp" style="padding:12px 16px 4px"><span class="muted small">“Sudah ada” hanya kemas kini harga. Baris “Perlu semak” mesti dibetulkan dahulu.</span><div style="display:flex;gap:8px"><button class="btn line" data-a="b-batal">Batal</button><button class="btn cta" data-a="b-import" ${nSel ? "" : "disabled"}>Import ${nSel} barang terpilih</button></div></div></div>` : ""}
        <div class="card" style="padding:14px 0 8px"><div class="sp" style="padding:0 16px 10px"><h2>Senarai barangan koperasi <span class="muted small" style="font-weight:400">${L.length} barang</span></h2><input data-i="b-q" placeholder="Cari nama atau kod" value="${esc(B.q)}" style="max-width:260px"></div><div style="padding:0 16px 10px">${chips(["Semua"].concat(kats()), B.kat, "b-kat")}</div>
        <div class="tbl"><table><thead><tr><th>Kod</th><th>Nama</th><th>Kategori</th><th>Unit</th><th class="r">Kos</th><th class="r">Jual</th><th>Stok</th><th>SET</th><th></th></tr></thead><tbody>${L.map((b) => `<tr><td class="muted">${esc(b.kod)}</td><td><b>${esc(b.nama)}</b></td><td>${esc(b.kategori)}</td><td>${esc(b.unit)}</td><td class="r num">${(+b.kos || 0).toFixed(2)}</td><td class="r num"><b>${b.jual.toFixed(2)}</b></td><td>${stokPill(b)}</td><td>${b.set ? pill("SET", "ok") : pill("Belum", "gr")}</td><td><button class="btn line sm" data-a="b-edit" data-k="${esc(b.kod)}">Edit</button></td></tr>`).join("") || `<tr><td colspan="9" class="empty">Tiada barang.</td></tr>`}</tbody></table></div></div>`;
    },
    after() {
      const d = $("#b-drop"); if (!d) return;
      ["dragover", "dragenter"].forEach((e) => d.addEventListener(e, (ev) => { ev.preventDefault(); d.classList.add("over"); }));
      ["dragleave", "drop"].forEach((e) => d.addEventListener(e, (ev) => { ev.preventDefault(); d.classList.remove("over"); }));
      d.addEventListener("drop", (ev) => { const f = ev.dataTransfer.files[0]; if (f) bFile(f); });
    }
  };
  async function bFile(f) {
    if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) { KP.toast("Pilih fail PDF.", true); return; }
    KP.toast("Membaca PDF…");
    try {
      B.imp = parseLines(await pdfLines(f)); B.fname = f.name;
      if (!B.imp.length) KP.toast("Tiada barang dikesan. Cuba tampal teks.", true);
    } catch (e) { KP.toast(String(e.message || e), true); }
    KP.rerender();
  }
  KP.inp["b-file"] = (t) => { if (t.files[0]) bFile(t.files[0]); };
  KP.act["b-baca"] = () => { B.imp = parseLines(val("b-paste").split(/\r?\n/)); B.fname = "Teks ditampal"; if (!B.imp.length) KP.toast("Tiada barang dikesan.", true); KP.rerender(); };
  KP.inp["b-f"] = (t, e) => { const r = B.imp[+t.dataset.k]; r[t.dataset.f] = t.value; if (e.type === "change") { r.st = bStatus(r); if (r.st === "S") r.on = false; KP.rerender(); } };
  KP.act["b-tog"] = (t) => { const r = B.imp[+t.dataset.k]; if (r.st === "S") { KP.toast("Betulkan baris ini dahulu.", true); return; } r.on = !r.on; KP.rerender(); };
  KP.act["b-batal"] = () => { B.imp = []; B.fname = ""; KP.rerender(); };
  KP.act["b-import"] = async () => {
    const items = B.imp.filter((r) => r.on && r.st !== "S").map((r) => ({ nama: r.nama, kategori: r.kategori, unit: r.unit, jual: +r.jual, kos: r.kos === "" ? "" : +r.kos }));
    const j = await KP.call("importBarang", { items }); if (!j) return;
    KP.toast(`${j.baru} baharu, ${j.kemas} dikemas kini.`); B.imp = []; B.fname = ""; KP.draw(true);
  };
  KP.act["b-kat"] = (t) => { B.kat = t.dataset.k; KP.rerender(); };
  KP.inp["kat-baru"] = (t) => { if (t.value !== "__baru") return; const n = (prompt("Nama kategori baharu:") || "").trim(); if (!n) { t.selectedIndex = 0; return; } let o = [...t.options].find((x) => x.value === n || x.text === n); if (!o) { o = new Option(n, n); t.add(o, t.options[t.options.length - 1]); } t.value = o.value; };
  KP.inp["b-q"] = (t) => { B.q = t.value; const p = t.selectionStart; KP.rerender(); const n = $('[data-i="b-q"]'); if (n) { n.focus(); n.setSelectionRange(p, p); } };
  KP.act["b-simpan"] = async () => {
    const j = await KP.call("saveBarang", { barang: { nama: val("m-nama"), kod: val("m-kod"), kategori: val("m-kat"), unit: val("m-unit"), stok: val("m-stok"), kos: val("m-kos"), jual: val("m-jual"), min: val("m-min") } });
    if (!j) return; KP.toast("Disimpan: " + j.kod); KP.draw(true);
  };
  KP.act["b-edit"] = (t) => {
    const b = D.barang.find((x) => x.kod === t.dataset.k);
    KP.modal(`<h2>Edit ${esc(b.kod)}</h2><div class="form" style="margin-top:10px;grid-template-columns:1fr 1fr"><label class="fld span2"><span class="lbl">Nama</span><input id="e-nama" value="${esc(b.nama)}"></label><label class="fld"><span class="lbl">Kategori</span><select id="e-kat" data-i="kat-baru">${katOpts(b.kategori)}</select></label><label class="fld"><span class="lbl">Unit</span><input id="e-unit" value="${esc(b.unit)}"></label><label class="fld"><span class="lbl">Kos (RM)</span><input id="e-kos" value="${b.kos || 0}"></label><label class="fld"><span class="lbl">Jual (RM)</span><input id="e-jual" value="${b.jual}"></label><label class="fld"><span class="lbl">Stok minimum</span><input id="e-min" type="number" value="${b.min}"></label>
        <label class="fld"><span class="lbl">Jantina</span><select id="e-jt"><option value="" ${b.jantina ? "" : "selected"}>Semua</option><option value="L" ${b.jantina === "L" ? "selected" : ""}>Lelaki (L)</option><option value="P" ${b.jantina === "P" ? "selected" : ""}>Perempuan (P)</option></select></label>
        <label class="fld"><span class="lbl">Nama kumpulan saiz (varian)</span><input id="e-varian" value="${esc(b.varian)}" placeholder="cth. Baju Prep"></label>
        <label class="fld span2"><span class="lbl">Saiz (asing dengan koma) — kosong jika tiada</span><input id="e-saiz" value="${esc(b.saiz)}" placeholder="cth. S,M,L,XL"></label>
        <label class="fld span2" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="e-baru" ${b.untukBaru ? "checked" : ""} style="width:auto"> <span>Ditanda lalai untuk murid baharu (tidak wajib)</span></label></div>
      <div class="muted small" style="margin-top:8px">Stok diubah melalui halaman Stok (terima / pelarasan).</div><div class="sp" style="margin-top:12px"><button class="btn bad" data-a="b-nyah" data-k="${esc(b.kod)}">Nyahaktif</button><div style="display:flex;gap:8px"><button class="btn line" data-a="tutup">Batal</button><button class="btn cta" data-a="b-edit-ok" data-k="${esc(b.kod)}">Simpan</button></div></div>`);
  };
  KP.act["b-edit-ok"] = async (t) => { const j = await KP.call("saveBarang", { barang: { kod: t.dataset.k, nama: val("e-nama"), kategori: val("e-kat"), unit: val("e-unit"), kos: val("e-kos"), jual: val("e-jual"), min: val("e-min"), jantina: val("e-jt"), varian: val("e-varian"), saiz: val("e-saiz"), untukBaru: ($("#e-baru") || {}).checked ? 1 : 0 } }); if (!j) return; KP.closeModal(); KP.toast("Disimpan."); KP.draw(true); };
  KP.act["b-nyah"] = async (t) => { if (!confirm("Nyahaktif barang ini? Ia tidak lagi dipaparkan.")) return; const b = D.barang.find((x) => x.kod === t.dataset.k); const j = await KP.call("saveBarang", { barang: { kod: b.kod, nama: b.nama, kategori: b.kategori, unit: b.unit, kos: b.kos, jual: b.jual, aktif: 0 } }); if (!j) return; KP.closeModal(); KP.draw(true); };

  /* ================= INVENTORI & AKSES ================= */
  const I = { kat: "Semua", ov: {} };
  const iCur = (b) => I.ov[b.kod] || { lr: b.lr, as: b.as, t: b.t.slice(), w: (b.w || [0, 0, 0, 0, 0, 0]).slice(), q: (b.q || [1, 1, 1, 1, 1, 1]).slice(), bh: (b.bh || ["C", "C", "C", "C", "C", "C"]).slice() };
  const iSet = (c) => (c.lr || c.as) && c.t.some((v) => v);
  const iSt = (c) => iSet(c) ? pill("SET", "ok") : (c.lr || c.as || c.t.some((v) => v)) ? pill("Separa", "warn") : pill("Belum", "gr");
  const iPut = (kod, f) => { const b = D.barang.find((x) => x.kod === kod), c = iCur(b), n = { lr: c.lr, as: c.as, t: c.t.slice(), w: c.w.slice(), q: c.q.slice(), bh: c.bh.slice() }; f(n); I.ov[kod] = n; };
  KP.pages.inventori = {
    async load() { await loadBarang(false); I.ov = {}; },
    view() {
      const vis = D.barang.filter((b) => I.kat === "Semua" || b.kategori === I.kat), all = D.barang.map(iCur);
      const nSet = all.filter(iSet).length, nNone = all.filter((c) => !(c.lr || c.as || c.t.some((v) => v))).length, nChg = Object.keys(I.ov).length;
      return `<div class="row"><div class="card kpi"><div class="lbl">Jumlah barang</div><div class="v">${D.barang.length}</div></div><div class="card kpi ok"><div class="lbl">Set lengkap (boleh dijual)</div><div class="v">${nSet}</div></div><div class="card kpi warn"><div class="lbl">Belum lengkap</div><div class="v">${D.barang.length - nSet - nNone}</div></div><div class="card kpi"><div class="lbl">Belum ditetapkan</div><div class="v">${nNone}</div></div></div>
      <div class="note"><b class="hd">Syarat “SET”:</b> barang ditanda untuk <b>sekurang-kurangnya satu</b> kumpulan (Luar asrama / Asrama) <b>dan sekurang-kurangnya satu</b> tingkatan. <b>Q1–Q6</b> = kuantiti lalai dalam set bagi tingkatan itu (murid masih boleh mengubah di borang). <b>B1–B6</b> = bahagian dalam slip (A Keperluan Sekolah, B Keperluan Asrama, C Lain-lain); klik untuk tukar. SET digunakan untuk <b>Borang Tempahan</b> dan <b>Jualan Tempahan</b>. <b>Jualan Terus</b> boleh menjual semua barang koperasi. Tanda <b>WAJIB</b> = barang wajib dibeli oleh pelajar tingkatan itu (hanya boleh ditanda jika tingkatan itu ditanda).</div>
      <div class="card" style="padding:14px 0 0"><div class="sp" style="padding:0 16px 10px">${chips(["Semua"].concat(kats()), I.kat, "i-kat")}<div class="chips"><button class="ch" data-a="i-bulk" data-k="lr">Semua luar asrama</button><button class="ch" data-a="i-bulk" data-k="as">Semua asrama</button><button class="ch" data-a="i-bulk" data-k="t">Semua T1–T6</button><button class="ch" data-a="i-bulk" data-k="w">Semua WAJIB</button><button class="ch" data-a="i-bulk" data-k="x">Kosongkan</button></div></div>
      <div class="tbl"><table style="min-width:1700px"><thead><tr><th>Kod</th><th>Nama barang</th><th class="c">Luar asrama</th><th class="c">Asrama</th>${[1, 2, 3, 4, 5, 6].map((n) => `<th class="c">T${n}</th>`).join("")}${[1, 2, 3, 4, 5, 6].map((n) => `<th class="c" style="color:#C2410C">W${n}</th>`).join("")}${[1, 2, 3, 4, 5, 6].map((n) => `<th class="c" style="color:#1D4ED8">Q${n}</th>`).join("")}${[1, 2, 3, 4, 5, 6].map((n) => `<th class="c" style="color:#047857">B${n}</th>`).join("")}<th class="c">Status</th></tr></thead><tbody>${vis.map((b) => { const c = iCur(b), cb = (on, a, extra) => `<td class="c"><button class="cb ${extra || ""} ${on ? "on" : ""}" data-a="${a}" data-k="${esc(b.kod)}" aria-label="${esc(b.nama)}">${on ? "✓" : ""}</button></td>`; return `<tr class="${I.ov[b.kod] ? "chg" : ""}"><td class="muted">${esc(b.kod)}</td><td><b>${esc(b.nama)}</b></td>${cb(c.lr, "i-lr")}${cb(c.as, "i-as")}${c.t.map((v, i) => `<td class="c"><button class="cb t ${v ? "on" : ""}" data-a="i-t" data-k="${esc(b.kod)}" data-n="${i}" aria-label="Tingkatan ${i + 1} ${esc(b.nama)}">${v ? "✓" : ""}</button></td>`).join("")}${c.w.map((v, i) => `<td class="c"><button class="cb w ${v ? "on" : ""}" data-a="i-w" data-k="${esc(b.kod)}" data-n="${i}" aria-label="Wajib Tingkatan ${i + 1} ${esc(b.nama)}">${v ? "✓" : ""}</button></td>`).join("")}${c.q.map((v, i) => `<td class="c"><input type="number" min="1" max="99" style="width:52px;text-align:center;padding:6px 4px" value="${v}" ${c.t[i] ? "" : "disabled"} data-i="i-q" data-k="${esc(b.kod)}" data-n="${i}" aria-label="Kuantiti set Tingkatan ${i + 1} ${esc(b.nama)}"></td>`).join("")}${c.bh.map((v, i) => `<td class="c"><button class="cb bh ${c.t[i] ? "on" : ""}" ${c.t[i] ? "" : "disabled"} style="width:34px;font-weight:700" data-a="i-bh" data-k="${esc(b.kod)}" data-n="${i}" aria-label="Bahagian slip Tingkatan ${i + 1} ${esc(b.nama)}">${v}</button></td>`).join("")}<td class="c">${iSt(c)}</td></tr>`; }).join("") || `<tr><td colspan="29" class="empty">Tiada barang.</td></tr>`}</tbody></table></div>
      <div class="sp" style="padding:12px 16px;background:var(--bg);border-top:1px solid var(--ln);border-radius:0 0 12px 12px"><span class="muted small"><b>${nChg}</b> barang diubah, belum disimpan. Baris kuning = ada perubahan.</span><div style="display:flex;gap:8px"><button class="btn line" data-a="i-reset">Batalkan</button><button class="btn cta" data-a="i-simpan" ${nChg ? "" : "disabled"}>Simpan perubahan</button></div></div></div>`;
    }
  };
  KP.act["i-kat"] = (t) => { I.kat = t.dataset.k; KP.rerender(); };
  KP.act["i-lr"] = (t) => { iPut(t.dataset.k, (n) => { n.lr = n.lr ? 0 : 1; }); KP.rerender(); };
  KP.act["i-as"] = (t) => { iPut(t.dataset.k, (n) => { n.as = n.as ? 0 : 1; }); KP.rerender(); };
  KP.act["i-t"] = (t) => { iPut(t.dataset.k, (n) => { const i = +t.dataset.n; n.t[i] = n.t[i] ? 0 : 1; if (!n.t[i]) n.w[i] = 0; }); KP.rerender(); };
  KP.act["i-w"] = (t) => { iPut(t.dataset.k, (n) => { const i = +t.dataset.n; n.w[i] = n.w[i] ? 0 : 1; if (n.w[i]) n.t[i] = 1; }); KP.rerender(); };
  KP.act["i-bh"] = (t) => { iPut(t.dataset.k, (n) => { const i = +t.dataset.n; n.bh[i] = n.bh[i] === "A" ? "B" : n.bh[i] === "B" ? "C" : "A"; }); KP.rerender(); };
  KP.act["i-bulk"] = (t) => { const k = t.dataset.k; D.barang.filter((b) => I.kat === "Semua" || b.kategori === I.kat).forEach((b) => iPut(b.kod, (n) => { if (k === "lr") n.lr = 1; else if (k === "as") n.as = 1; else if (k === "t") n.t = [1, 1, 1, 1, 1, 1]; else if (k === "w") { n.t = [1, 1, 1, 1, 1, 1]; n.w = [1, 1, 1, 1, 1, 1]; } else { n.lr = 0; n.as = 0; n.t = [0, 0, 0, 0, 0, 0]; n.w = [0, 0, 0, 0, 0, 0]; } })); KP.rerender(); };
  KP.inp["i-q"] = (t) => { const v = Math.max(0, Math.min(99, isNaN(parseInt(t.value, 10)) ? 1 : parseInt(t.value, 10))); iPut(t.dataset.k, (n) => { n.q[+t.dataset.n] = v; }); };
  KP.act["i-reset"] = () => { I.ov = {}; KP.rerender(); };
  KP.act["i-simpan"] = async () => {
    const items = Object.keys(I.ov).map((k) => ({ kod: k, lr: I.ov[k].lr, as: I.ov[k].as, t: I.ov[k].t, w: I.ov[k].w, q: I.ov[k].q, bh: I.ov[k].bh }));
    const j = await KP.call("saveAkses", { items }); if (!j) return; KP.toast(j.dikemas + " barang dikemas kini."); KP.draw(true);
  };

  /* ================= STOK ================= */
  const K = { jenis: "Semua", log: [] };
  KP.pages.stok = {
    async load() { const [, j] = await Promise.all([loadBarang(false), KP.call("getStokLog", { jenis: K.jenis, had: 150 })]); if (!j) throw new Error("log"); K.log = j.log; },
    view() {
      const low = D.barang.filter((b) => b.stok > 0 && b.stok <= b.min), hab = D.barang.filter((b) => b.stok <= 0), nilai = D.barang.reduce((s, b) => s + b.stok * (b.kos || 0), 0);
      const opt = D.barang.map((b) => `<option value="${esc(b.kod)}">${esc(b.kod)} · ${esc(b.nama)} (baki ${b.stok})</option>`).join("");
      return `<div class="row"><div class="card kpi"><div class="lbl">Nilai stok (kos)</div><div class="v">${rm0(nilai)}</div></div><div class="card kpi"><div class="lbl">Jenis barang</div><div class="v">${D.barang.length}</div></div><div class="card kpi warn"><div class="lbl">Stok rendah</div><div class="v">${low.length}</div></div><div class="card kpi bad"><div class="lbl">Habis stok</div><div class="v">${hab.length}</div></div></div>
      <div class="row" style="align-items:stretch"><div class="card pad grow" style="flex:1.4 1 520px;display:flex;flex-direction:column;gap:12px"><h2>Terima stok baharu</h2><div class="form"><label class="fld span2"><span class="lbl">Barang</span><select id="s-kod">${opt}</select></label><label class="fld"><span class="lbl">Kuantiti diterima</span><input id="s-qty" type="number" min="1"></label><label class="fld"><span class="lbl">Kos seunit (RM)</span><input id="s-kos" inputmode="decimal"></label><label class="fld"><span class="lbl">Pembekal</span><input id="s-pem"></label><label class="fld"><span class="lbl">No. invois / DO</span><input id="s-inv"></label></div><div style="text-align:right"><button class="btn cta" data-a="s-terima">Simpan penerimaan</button></div>
        <hr style="border:0;border-top:1px solid var(--ln2);width:100%"><h2>Pelarasan stok</h2><div class="form"><label class="fld span2"><span class="lbl">Barang</span><select id="l-kod">${opt}</select></label><label class="fld"><span class="lbl">Ubah (+/−)</span><input id="l-qty" type="number" placeholder="cth. -2"></label><label class="fld span2"><span class="lbl">Sebab (rosak, tamat tempoh, kiraan semula…)</span><input id="l-sebab"></label></div><div style="text-align:right"><button class="btn line" data-a="s-laras">Simpan pelarasan</button></div></div>
        <div class="card grow" style="padding:14px 0 6px;flex:1 1 360px"><h2 style="padding:0 16px 8px">Perlu tambah stok</h2><div class="tbl"><table style="min-width:340px"><thead><tr><th>Barang</th><th class="r">Baki</th><th class="r">Min.</th><th>Status</th></tr></thead><tbody>${hab.concat(low).map((b) => `<tr><td><b>${esc(b.nama)}</b></td><td class="r num">${b.stok}</td><td class="r num">${b.min}</td><td>${stokPill(b)}</td></tr>`).join("") || `<tr><td colspan="4" class="empty">Semua stok mencukupi.</td></tr>`}</tbody></table></div></div></div>
      <div class="card" style="padding:14px 0 8px"><div class="sp" style="padding:0 16px 10px"><h2>Pergerakan stok</h2>${chips(["Semua", "Masuk", "Jualan", "Pelarasan", "Batal"], K.jenis, "s-jenis")}</div><div class="tbl"><table><thead><tr><th>Tarikh &amp; masa</th><th>Barang</th><th>Jenis</th><th class="r">Kuantiti</th><th class="r">Baki</th><th>Oleh / rujukan</th></tr></thead><tbody>${K.log.map((x) => `<tr><td class="muted">${esc(x.tarikh.slice(0, 16))}</td><td><b>${esc(x.nama)}</b></td><td>${pill(x.jenis, { Masuk: "ok", Jualan: "info", Pelarasan: "warn", Batal: "ind", Awal: "gr" }[x.jenis] || "gr")}</td><td class="r num" style="color:${x.qty > 0 ? "var(--ok)" : "var(--bad)"}">${x.qty > 0 ? "+" : ""}${x.qty}</td><td class="r num">${x.baki}</td><td class="muted">${esc(x.oleh)}${x.rujukan ? " · " + esc(x.rujukan) : ""}</td></tr>`).join("") || `<tr><td colspan="6" class="empty">Tiada rekod.</td></tr>`}</tbody></table></div></div>`;
    }
  };
  KP.act["s-jenis"] = (t) => { K.jenis = t.dataset.k; KP.draw(true); };
  KP.act["s-terima"] = async () => { const j = await KP.call("terimaStok", { kod: val("s-kod"), qty: val("s-qty"), kos: val("s-kos"), pembekal: val("s-pem"), invois: val("s-inv") }); if (!j) return; KP.toast("Stok diterima. Baki baharu: " + j.baki); KP.draw(true); };
  KP.act["s-laras"] = async () => { const j = await KP.call("larasStok", { kod: val("l-kod"), qty: val("l-qty"), sebab: val("l-sebab") }); if (!j) return; KP.toast("Pelarasan disimpan. Baki: " + j.baki); KP.draw(true); };

  /* ================= LAPORAN ================= */
  const R = { rng: "Bulan ini", dari: "", hingga: "", lap: null };
  KP.pages.laporan = {
    async load() { if (R.rng !== "Pilih tarikh") { [R.dari, R.hingga] = range(R.rng); } const j = await KP.call("laporan", { dari: R.dari, hingga: R.hingga }); if (!j) throw new Error("laporan"); R.lap = j; },
    view() {
      const L = R.lap, T = L.jumlah, tot = Math.max(1, T.hasil), harian = L.harian.length <= 62;
      const share = (arr) => arr.map((r) => `<div style="margin-bottom:10px"><div class="sp" style="font-size:13px"><span>${esc(r.nama)}</span><b class="num">${rm0(r.hasil)} · ${Math.round(r.hasil / tot * 100)}%</b></div><div class="bar"><i style="width:${Math.round(r.hasil / tot * 100)}%;background:var(--pri)"></i></div></div>`).join("") || `<div class="muted small">Tiada data.</div>`;
      return `<div class="sp"><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:end">${chips(["Hari ini", "7 hari", "Bulan ini", "Bulan lepas", "Tahun ini", "Pilih tarikh"], R.rng, "r-rng")}${R.rng === "Pilih tarikh" ? `<input type="date" data-i="r-dari" value="${R.dari}" style="width:auto"><input type="date" data-i="r-hingga" value="${R.hingga}" style="width:auto">` : ""}</div><div style="display:flex;gap:8px"><button class="btn line sm" data-a="r-csv">Eksport CSV</button><button class="btn sm" data-a="r-cetak">Cetak / PDF</button></div></div>
      <div class="row"><div class="card kpi"><div class="lbl">Hasil jualan</div><div class="v">${rm0(T.hasil)}</div></div><div class="card kpi"><div class="lbl">Kos barang terjual</div><div class="v" style="color:var(--tx2)">${rm0(T.kos)}</div></div><div class="card kpi ok"><div class="lbl">Untung kasar</div><div class="v">${rm0(T.untung)}</div></div><div class="card kpi"><div class="lbl">Margin</div><div class="v">${T.margin}%</div></div><div class="card kpi"><div class="lbl">Nilai stok semasa</div><div class="v">${rm0(L.nilaiStok)}</div></div></div>
      <div class="row"><div class="card pad grow" style="flex:1.6 1 560px"><h2 style="margin-bottom:10px">Hasil jualan ${harian ? "harian" : "bulanan"} <span class="muted small" style="font-weight:400">RM</span></h2>${harian ? chart(L.harian, (r) => r.tarikh.slice(5)) : chart(L.bulanan, (r) => r.bulan)}</div>
      <div class="grow" style="flex:1 1 320px;display:flex;flex-direction:column;gap:12px"><div class="card pad"><h2 style="margin-bottom:10px">Kaedah bayaran (QR vs tunai)</h2>${share(L.kaedah)}</div><div class="card pad"><h2 style="margin-bottom:10px">Kumpulan pembeli</h2>${share(L.kumpulan)}</div></div></div>
      <div class="row"><div class="card pad grow" style="flex:1 1 280px"><h2 style="margin-bottom:10px">Jualan terus vs tempahan</h2>${share(L.jenis || [])}</div><div class="card pad grow" style="flex:1 1 280px"><h2 style="margin-bottom:10px">Tempahan mengikut tingkatan</h2>${share(L.tingkatan || [])}</div></div>
      <div class="row"><div class="card grow" style="flex:2 1 520px;padding:14px 0 6px"><h2 style="padding:0 16px 8px">Ringkasan mengikut kategori</h2><div class="tbl"><table><thead><tr><th>Kategori</th><th class="r">Hasil (RM)</th><th class="r">Kos (RM)</th><th class="r">Untung (RM)</th><th class="r">Margin</th></tr></thead><tbody>${L.kategori.map((k) => `<tr><td><b>${esc(k.nama)}</b></td><td class="r num">${k.hasil.toFixed(2)}</td><td class="r num">${k.kos.toFixed(2)}</td><td class="r num" style="color:var(--ok)">${k.untung.toFixed(2)}</td><td class="r num">${k.hasil ? Math.round(k.untung / k.hasil * 100) : 0}%</td></tr>`).join("")}<tr style="background:var(--pri-xl)"><td><b>Jumlah</b></td><td class="r num">${T.hasil.toFixed(2)}</td><td class="r num">${T.kos.toFixed(2)}</td><td class="r num" style="color:var(--ok)">${T.untung.toFixed(2)}</td><td class="r num">${T.margin}%</td></tr></tbody></table></div></div>
      <div class="card grow" style="flex:1 1 320px;padding:14px 0 6px"><h2 style="padding:0 16px 8px">Barang terlaris</h2><div class="tbl"><table style="min-width:300px"><thead><tr><th>Barang</th><th class="r">Unit</th><th class="r">Hasil</th></tr></thead><tbody>${L.terlaris.map((x) => `<tr><td><b>${esc(x.nama)}</b></td><td class="r num">${x.qty}</td><td class="r num">${x.hasil.toFixed(2)}</td></tr>`).join("") || `<tr><td colspan="3" class="empty">Tiada data.</td></tr>`}</tbody></table></div></div></div>`;
    }
  };
  KP.act["r-rng"] = (t) => { R.rng = t.dataset.k; if (R.rng === "Pilih tarikh" && !R.dari) R.dari = R.hingga = KP.today(); KP.draw(true); };
  KP.inp["r-dari"] = (t) => { R.dari = t.value; if (R.hingga < R.dari) R.hingga = R.dari; KP.draw(true); };
  KP.inp["r-hingga"] = (t) => { R.hingga = t.value; if (R.hingga < R.dari) R.dari = R.hingga; KP.draw(true); };
  KP.act["r-cetak"] = () => window.print();
  KP.act["r-csv"] = () => {
    const L = R.lap, rows = [["Laporan kewangan koperasi", R.dari + " hingga " + R.hingga], [], ["Kategori", "Hasil", "Kos", "Untung"]];
    L.kategori.forEach((k) => rows.push([k.nama, k.hasil, k.kos, k.untung])); rows.push(["JUMLAH", L.jumlah.hasil, L.jumlah.kos, L.jumlah.untung], [], ["Tarikh", "Hasil", "Kos", "Untung"]);
    L.harian.forEach((d) => rows.push([d.tarikh, d.hasil, d.kos, d.untung])); KP.csv(`laporan-koop-${R.dari}_${R.hingga}.csv`, rows);
  };

  /* ================= TETAPAN (Admin) ================= */
  /* ================= LAPORAN TEMPAHAN MURID (dalam Tetapan) =================
     Murid daripada DatabaseMurid dipadankan dengan KP_Tempahan (No. KP berhash, atau nama + kelas). Status:
     Belum tempah · Belum bayar · Sudah bayar (belum settle) · Selesai (settle). */
  const LT = { ting: "Semua", kelas: "Semua", st: "Semua", q: "", rows: [], loaded: false, busy: false, err: "" };
  const LT_ST = ["Belum tempah", "Belum bayar", "Sudah bayar", "Selesai"];
  const LT_KLS = { "Belum tempah": "bad", "Belum bayar": "warn", "Sudah bayar": "info", "Selesai": "ok" };
  const LT_RANK = { "Belum tempah": 0, "Belum bayar": 1, "Sudah bayar": 2, "Selesai": 3 };
  const ltSt = (t) => t.status === "Selesai" ? "Selesai" : t.bayar === "Disahkan" ? "Sudah bayar" : "Belum bayar";
  const sha = async (kp) => { try { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("koopkp:" + kp)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); } catch (e) { return ""; } };
  const nk = (x) => String(x || "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
  async function ltLoad() {
    LT.busy = true; LT.err = ""; KP.rerender();
    try {
      await loadMurid();
      const j = await KP.call("getTempahan"); if (!j) throw new Error("tempahan");
      const aktif = j.tempahan.filter((t) => t.status !== "Batal"), byH = {}, byN = {}, guna = new Set();
      aktif.forEach((t) => { if (t.kph) (byH[t.kph] = byH[t.kph] || []).push(t); (byN[nk(t.murid) + "|" + nk(t.kelasMurid)] = byN[nk(t.murid) + "|" + nk(t.kelasMurid)] || []).push(t); });
      const rows = [];
      for (const m of KP.mlist || []) {
        let L = []; if (m.kp) L = byH[await sha(m.kp)] || [];
        if (!L.length) L = byN[nk(m.nama) + "|" + nk(m.kelas)] || [];
        L.forEach((t) => guna.add(t.no));
        const best = L.slice().sort((a, b) => LT_RANK[ltSt(b)] - LT_RANK[ltSt(a)])[0];
        rows.push({ nama: m.nama, kelas: m.kelas || "-", ting: m.tingkatan, kump: m.kumpulan, st: best ? ltSt(best) : "Belum tempah", no: best ? best.no : "", jumlah: best ? best.jumlah : 0, bil: L.length, baru: false });
      }
      aktif.filter((t) => !guna.has(t.no)).forEach((t) => rows.push({ nama: t.murid || "(tiada nama)", kelas: t.kelasMurid || "Murid baharu", ting: t.tingkatan, kump: t.kumpulan, st: ltSt(t), no: t.no, jumlah: t.jumlah, bil: 1, baru: !t.kelasMurid }));
      LT.rows = rows; LT.loaded = true;
    } catch (e) { LT.err = "Gagal memuatkan data murid / tempahan."; }
    LT.busy = false; KP.rerender();
  }
  const ltTapis = () => { const q = LT.q.toLowerCase().trim(); return LT.rows.filter((r) => (LT.ting === "Semua" || r.ting === +LT.ting.slice(1)) && (LT.kelas === "Semua" || r.kelas === LT.kelas) && (LT.st === "Semua" || r.st === LT.st) && (!q || (r.nama + " " + r.no).toLowerCase().includes(q))); };
  function ltView() {
    if (LT.busy) return `<div class="card pad muted">Memuatkan senarai murid dan tempahan…</div>`;
    if (LT.err) return `<div class="card pad"><div class="muted" style="color:#b91c1c">${esc(LT.err)}</div><div style="margin-top:10px"><button class="btn" data-a="lt-muat">Cuba lagi</button></div></div>`;
    if (!LT.loaded) return `<div class="card pad"><button class="btn cta" data-a="lt-muat">Muat laporan</button></div>`;
    const base = LT.rows.filter((r) => LT.ting === "Semua" || r.ting === +LT.ting.slice(1)), kelasList = [...new Set(base.map((r) => r.kelas))].sort((a, b) => a.localeCompare(b, "ms", { numeric: true }));
    const tp = ltTapis(), cnt = (st) => base.filter((r) => (LT.kelas === "Semua" || r.kelas === LT.kelas) && r.st === st).length, jml = base.filter((r) => LT.kelas === "Semua" || r.kelas === LT.kelas).length;
    const per = {}; base.forEach((r) => { const k = per[r.kelas] = per[r.kelas] || { j: 0, "Belum tempah": 0, "Belum bayar": 0, "Sudah bayar": 0, "Selesai": 0 }; k.j++; k[r.st]++; });
    const kad = (st) => `<button class="card kpi" data-a="lt-st" data-k="${st}" style="text-align:left;cursor:pointer;${LT.st === st ? "outline:3px solid var(--pri)" : ""}"><div class="lbl">${st}</div><div class="v">${cnt(st)}</div><div class="muted small">${jml ? Math.round((cnt(st) / jml) * 100) : 0}% daripada ${jml}</div></button>`;
    return `<div class="card pad" style="display:flex;flex-direction:column;gap:12px"><div class="sp"><div><h2>Laporan tempahan murid</h2><div class="muted small">Status tempahan / belian set sekolah mengikut tingkatan dan kelas. Murid dipadankan dengan tempahan melalui No. KP (atau nama + kelas).</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn line sm" data-a="lt-muat">↻ Muat semula</button><button class="btn line sm" data-a="lt-csv">CSV</button><button class="btn line sm" data-a="lt-cetak">Cetak</button></div></div>
      ${chips(["Semua", "T1", "T2", "T3", "T4", "T5", "T6"], LT.ting, "lt-t")}
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end"><label class="fld" style="flex:0 1 220px"><span class="lbl">Kelas</span><select data-i="lt-kelas"><option value="Semua">Semua kelas</option>${kelasList.map((k) => `<option ${k === LT.kelas ? "selected" : ""}>${esc(k)}</option>`).join("")}</select></label>
      <label class="fld" style="flex:1 1 220px"><span class="lbl">Cari nama / no. invois</span><input type="search" data-i="lt-q" value="${esc(LT.q)}" placeholder="Nama murid (sebahagian pun boleh)"></label></div>
      <div class="row">${LT_ST.map(kad).join("")}</div>
      <div class="muted small">${LT.st === "Semua" ? "Tekan satu kad untuk menapis status." : `Menapis: <b>${LT.st}</b> · <button class="btn line sm" data-a="lt-st" data-k="Semua">Papar semua</button>`}</div></div>
    <div class="card" style="padding:14px 0 6px;margin-top:12px"><h2 style="padding:0 16px 8px">Ringkasan mengikut kelas</h2><div class="tbl"><table><thead><tr><th>Kelas</th><th class="r">Murid</th><th class="r">Belum tempah</th><th class="r">Belum bayar</th><th class="r">Sudah bayar</th><th class="r">Selesai</th><th class="r">Selesai %</th></tr></thead><tbody>${Object.keys(per).sort((a, b) => a.localeCompare(b, "ms", { numeric: true })).map((k) => { const p = per[k]; return `<tr><td><button class="btn line sm" data-a="lt-kelas" data-k="${esc(k)}">${esc(k)}</button></td><td class="r">${p.j}</td><td class="r">${p["Belum tempah"]}</td><td class="r">${p["Belum bayar"]}</td><td class="r">${p["Sudah bayar"]}</td><td class="r">${p["Selesai"]}</td><td class="r">${Math.round((p["Selesai"] / p.j) * 100)}%</td></tr>`; }).join("") || `<tr><td colspan="7" class="muted">Tiada data.</td></tr>`}</tbody></table></div></div>
    <div class="card" style="padding:14px 0 6px;margin-top:12px"><h2 style="padding:0 16px 8px">Senarai murid (${tp.length})</h2><div class="tbl"><table><thead><tr><th>Bil</th><th>Nama</th><th>Kelas</th><th>Kumpulan</th><th>Status</th><th>No. invois</th><th class="r">Jumlah</th></tr></thead><tbody>${tp.slice(0, 300).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.nama)}${r.baru ? ` ${pill("baharu", "ind")}` : ""}</td><td>${esc(r.kelas)}</td><td>${esc(r.kump)}</td><td>${pill(r.st, LT_KLS[r.st])}</td><td>${r.no ? `<span style="font-family:monospace">${esc(r.no)}</span> <button class="btn line sm" data-a="jt-copy" data-k="${esc(r.no)}" style="padding:2px 8px">Salin</button>` : ""}${r.bil > 1 ? ` <span class="muted small">(${r.bil} tempahan)</span>` : ""}</td><td class="r">${r.no ? rm(r.jumlah) : ""}</td></tr>`).join("") || `<tr><td colspan="7" class="muted">Tiada murid sepadan.</td></tr>`}</tbody></table></div>${tp.length > 300 ? `<div class="muted small" style="padding:8px 16px">Memaparkan 300 pertama. Tapis ikut kelas untuk melihat selebihnya, atau muat turun CSV.</div>` : ""}</div>`;
  }
  KP.act["lt-muat"] = () => { LT.loaded = false; ltLoad(); };
  KP.act["lt-t"] = (t) => { LT.ting = t.dataset.k; LT.kelas = "Semua"; KP.rerender(); };
  KP.act["lt-st"] = (t) => { LT.st = LT.st === t.dataset.k ? "Semua" : t.dataset.k; KP.rerender(); };
  KP.act["lt-kelas"] = (t) => { LT.kelas = t.dataset.k; const m = t.dataset.k.match(/\d/); KP.rerender(); };
  KP.inp["lt-kelas"] = (t) => { LT.kelas = t.value; KP.rerender(); };
  KP.inp["lt-q"] = (t) => { LT.q = t.value; const p = t.selectionStart; KP.rerender(); const n = $('[data-i="lt-q"]'); if (n) { n.focus(); n.setSelectionRange(p, p); } };
  KP.act["lt-csv"] = () => KP.csv("laporan-tempahan-murid.csv", [["Nama", "Kelas", "Tingkatan", "Kumpulan", "Status", "No. invois", "Jumlah"]].concat(ltTapis().map((r) => [r.nama, r.kelas, r.ting, r.kump, r.st, r.no, r.no ? r.jumlah.toFixed(2) : ""])));
  KP.act["lt-cetak"] = () => { const tp = ltTapis(); KP.printHtml(`<h2 style="margin:0 0 4px;font:700 16px Arial">Laporan Tempahan Murid</h2><div style="font:12px Arial;margin-bottom:8px">${esc(LT.ting)} · ${esc(LT.kelas === "Semua" ? "Semua kelas" : LT.kelas)} · ${esc(LT.st)} · ${tp.length} murid · ${new Date().toLocaleDateString("ms-MY")}</div><table style="border-collapse:collapse;width:100%;font:11px Arial"><thead><tr>${["Bil", "Nama", "Kelas", "Status", "No. invois", "Jumlah"].map((h) => `<th style="border:1px solid #444;padding:3px 5px;text-align:left;background:#eee">${h}</th>`).join("")}</tr></thead><tbody>${tp.map((r, i) => `<tr>${[i + 1, esc(r.nama), esc(r.kelas), r.st, r.no, r.no ? r.jumlah.toFixed(2) : ""].map((c) => `<td style="border:1px solid #444;padding:3px 5px">${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`, true); };
  const T = { tab: "Guru Koop", pgn: [], guru: [], ping: "" };
  KP.pages.tetapan = {
    async load() {
      const [a, b] = await Promise.all([KP.call("getPengguna"), KP.call("senaraiGuru")]);
      if (!a) throw new Error("pengguna");
      T.pgn = a.pengguna; T.guru = b ? b.guru : []; T.nota = b && b.nota;
    },
    view() {
      const tabs = ["Guru Koop", "Kategori", "Jualan & Resit", "Laporan Tempahan", "Sambungan"];
      let h = `<div class="chips">${tabs.map((k) => `<button class="ch ${k === T.tab ? "on" : ""}" data-a="t-tab" data-k="${k}">${k}</button>`).join("")}</div>`;
      if (T.tab === "Guru Koop") {
        const have = new Set(T.pgn.map((p) => p.emel));
        h += `<div class="card" style="padding:14px 0 8px"><div style="padding:0 16px 10px"><h2>Guru Koop &amp; kebenaran</h2><div class="muted small">Admin App sentiasa mempunyai semua kebenaran. Perubahan disimpan terus.</div></div><div class="tbl"><table><thead><tr><th>Pengguna</th><th>Peranan</th><th class="c">Jualan</th><th class="c">Stok</th><th class="c">Inventori</th><th class="c">Laporan</th><th class="c">Aktif</th><th></th></tr></thead><tbody>${T.pgn.map((p) => { const cb = (f) => p.admin ? `<td class="c muted">✓</td>` : `<td class="c"><button class="cb ${p[f] ? "on" : ""}" data-a="t-perm" data-k="${esc(p.emel)}" data-f="${f}" aria-label="${f} ${esc(p.nama)}">${p[f] ? "✓" : ""}</button></td>`; return `<tr><td><b>${esc(p.nama)}</b><div class="muted small">${esc(p.emel)}</div></td><td>${p.admin ? pill("Admin App", "info") : pill("Guru Koop", "ok")}</td>${cb("jualan")}${cb("stok")}${cb("inventori")}${cb("laporan")}<td class="c"><button class="cb ${p.aktif ? "on" : ""}" data-a="t-perm" data-k="${esc(p.emel)}" data-f="aktif" aria-label="Aktif ${esc(p.nama)}">${p.aktif ? "✓" : ""}</button></td><td><button class="btn line sm" data-a="t-reset" data-k="${esc(p.emel)}">Reset PIN</button></td></tr>`; }).join("")}</tbody></table></div>
          <div style="padding:12px 16px 4px;display:flex;flex-wrap:wrap;gap:10px;align-items:end"><label class="fld" style="flex:1 1 260px"><span class="lbl">Tambah daripada senarai guru app-smasra</span><select id="t-guru"><option value="">— pilih guru —</option>${T.guru.filter((g) => !have.has(g.emel)).map((g) => `<option value="${esc(g.emel)}" data-n="${esc(g.nama)}">${esc(g.nama)} (${esc(g.emel)})</option>`).join("")}</select></label>
          <label class="fld" style="flex:1 1 200px"><span class="lbl">atau taip emel</span><input id="t-emel" type="email"></label><label class="fld" style="flex:0 1 150px"><span class="lbl">Peranan</span><select id="t-per"><option value="Guru">Guru Koop</option><option value="Admin">Admin App</option></select></label><button class="btn cta" data-a="t-tambah">+ Tambah</button></div>
          ${T.nota ? `<div class="muted small" style="padding:6px 16px">${esc(T.nota)}</div>` : ""}<div class="muted small" style="padding:8px 16px 4px">Pengguna baharu menggunakan PIN awal 1234 dan diminta menukarnya semasa log masuk pertama. Inventori = tanda asrama / luar asrama &amp; T1–T6.</div></div>`;
      } else if (T.tab === "Kategori") {
        h += `<div class="card pad" style="display:flex;flex-direction:column;gap:12px;max-width:640px"><h2>Kategori barangan</h2><div class="chips">${kats().map((k, i) => `<span class="pill p-gr" style="font-size:13px;padding:6px 12px">${esc(k)} <button class="btn sm" style="all:unset;cursor:pointer;margin-left:4px" data-a="t-kdel" data-k="${i}" aria-label="Buang ${esc(k)}">✕</button></span>`).join("")}</div><div style="display:flex;gap:8px"><input id="t-knew" placeholder="Nama kategori baharu" data-enter="t-kadd"><button class="btn" data-a="t-kadd">Tambah</button></div></div>`;
      } else if (T.tab === "Laporan Tempahan") {
        h += ltView();
      } else if (T.tab === "Jualan & Resit") {
        const r = KP.S.tetapan.resit || {};
        h += `<div class="card pad" style="max-width:640px;display:flex;flex-direction:column;gap:12px"><h2>Tetapan jualan &amp; resit</h2><div class="form" style="grid-template-columns:1fr 1fr"><label class="fld span2"><span class="lbl">Nama pada resit</span><input id="t-rnama" value="${esc(r.nama)}"></label><label class="fld"><span class="lbl">Awalan no. resit</span><input id="t-rawal" value="${esc(r.awalan)}"></label><label class="fld"><span class="lbl">Stok minimum lalai</span><input id="t-rmin" type="number" value="${esc(r.minLalai)}"></label></div><div style="text-align:right"><button class="btn cta" data-a="t-rsimpan">Simpan tetapan</button></div></div>
        <div class="card pad" style="max-width:640px;display:flex;flex-direction:column;gap:12px;margin-top:14px"><h2>Sesi tempahan (borang murid)</h2><div class="muted small">Dari bulan mula hingga Disember, borang memaparkan set <b>tahun depan</b> (murid naik satu tingkatan). Bulan lain memaparkan set tahun semasa. Tahun sesi boleh ditetapkan terus jika perlu.</div>
        <div class="form" style="grid-template-columns:1fr 1fr"><label class="fld"><span class="lbl">Bulan mula set tahun depan</span><select id="t-smula">${["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"].map((m, i) => `<option value="${i + 1}" ${((KP.S.tetapan.sesi || {}).mula || 10) === i + 1 ? "selected" : ""}>${m}</option>`).join("")}</select></label>
        <label class="fld"><span class="lbl">Tahun sesi (kosong = automatik)</span><input id="t-stahun" inputmode="numeric" placeholder="cth. 2027" value="${esc((KP.S.tetapan.sesi || {}).tahun || "")}"></label></div>
        <div style="text-align:right"><button class="btn cta" data-a="t-ssimpan">Simpan sesi</button></div></div>`;
      } else {
        h += `<div class="card pad sp"><div><h2>Sambungan data</h2><div class="muted small">Google Sheet Koperasi · Apps Script Web App</div></div><div style="display:flex;gap:8px;align-items:center">${T.ping ? pill(T.ping, T.ping === "Bersambung" ? "ok" : "bad") : ""}<button class="btn line" data-a="t-ping">Uji sambungan</button></div></div>`;
      }
      return h;
    }
  };
  KP.act["t-tab"] = (t) => { T.tab = t.dataset.k; if (T.tab === "Laporan Tempahan" && !LT.loaded && !LT.busy) ltLoad(); KP.rerender(); };
  KP.act["t-perm"] = async (t) => {
    const p = T.pgn.find((x) => x.emel === t.dataset.k), f = t.dataset.f; p[f] = p[f] ? 0 : 1;
    const j = await KP.call("savePengguna", { pengguna: { emel: p.emel, nama: p.nama, peranan: p.admin ? "Admin" : "Guru", jualan: p.jualan, stok: p.stok, inventori: p.inventori, laporan: p.laporan, aktif: p.aktif } });
    if (!j) { p[f] = p[f] ? 0 : 1; } KP.rerender();
  };
  KP.act["t-reset"] = async (t) => { if (!confirm("Set semula PIN pengguna ini kepada 1234?")) return; const j = await KP.call("resetPin", { emel: t.dataset.k }); if (j) KP.toast("PIN ditetapkan semula kepada 1234."); };
  KP.act["t-tambah"] = async () => {
    const sel = $("#t-guru"), emel = (val("t-emel") || sel.value).trim(), nama = val("t-emel") ? "" : (sel.selectedOptions[0] && sel.selectedOptions[0].dataset.n) || "";
    if (!emel) { KP.toast("Pilih guru atau taip emel.", true); return; }
    const admin = val("t-per") === "Admin";
    const j = await KP.call("savePengguna", { pengguna: { emel, nama, peranan: admin ? "Admin" : "Guru", jualan: 1, stok: 0, inventori: 0, laporan: 0, aktif: 1 } });
    if (!j) return; KP.toast(j.baru ? "Pengguna ditambah. PIN awal 1234." : "Pengguna dikemas kini."); KP.draw(true);
  };
  const saveKat = async (arr) => { const j = await KP.call("saveTetapan", { kategori: arr }); if (!j) return; KP.S.tetapan = j.tetapan; KP.rerender(); };
  KP.act["t-kadd"] = () => { const v = val("t-knew").trim(); if (!v) return; if (kats().includes(v)) { KP.toast("Kategori sudah wujud.", true); return; } saveKat(kats().concat(v)); };
  KP.act["t-kdel"] = (t) => { const k = kats()[+t.dataset.k]; if (confirm(`Buang kategori “${k}”? Barang sedia ada kekal dengan nama kategori ini.`)) saveKat(kats().filter((_, i) => i !== +t.dataset.k)); };
  KP.act["t-rsimpan"] = async () => { const j = await KP.call("saveTetapan", { resit: { nama: val("t-rnama"), awalan: val("t-rawal"), minLalai: val("t-rmin") } }); if (!j) return; KP.S.tetapan = j.tetapan; KP.toast("Tetapan disimpan."); };
  KP.act["t-ssimpan"] = async () => { const j = await KP.call("saveTetapan", { sesi: { mula: val("t-smula"), tahun: val("t-stahun") } }); if (!j) return; KP.S.tetapan = j.tetapan; KP.toast("Sesi tempahan disimpan."); };
  KP.act["t-ping"] = async () => { T.ping = "Menguji…"; KP.rerender(); try { const j = await (await fetch(KP_API + "?action=ping")).json(); T.ping = j.ok ? "Bersambung" : "Gagal"; } catch (e) { T.ping = "Tidak bersambung"; } KP.rerender(); };
})();
