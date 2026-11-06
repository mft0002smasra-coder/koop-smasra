/* Borang Tempahan Barang Koperasi (embed awam untuk murid / ibu bapa). BERDIRI SENDIRI — tidak memuatkan koop-core.js.
 * Baca: Google Sheet (gviz) — DatabaseMurid (app-smasra) + KP_Barang / KP_Tetapan (koperasi).
 * Tulis: Apps Script (tindakan awam "hantarTempahan", disahkan sepenuhnya di pelayan). */
const KP_API = "https://script.google.com/macros/s/AKfycbwyLzwfPFsazYkoGbnLQfI8G36LvngSxnEqVb6DSnieDN7kXLDhPmSAAz-eq4K1_oqU/exec";
const KP_SHEET_ID = "1_qim2NXJ4et0Z2eWiNvrFNozm0SDi9a0urEB96Gt88A";   // Sheet Koperasi
const MURID_SHEET_ID = "1EohV_hfuS6SDgiqDn--QQiM_y92_K4jvGyh87nA3HOo"; // Sheet app-smasra (tab DatabaseMurid)
const KP_LOGO = "https://lh3.googleusercontent.com/d/1JFlMpX8nCN4ZKW9SRiNdtFT-UC8D3nlN";

(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rm = (n) => "RM " + (Math.round((+n || 0) * 100) / 100).toFixed(2);
  const n = (v) => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };
  const f1 = (v) => (v === true || v === 1 || v === "1" || String(v).toUpperCase() === "TRUE" ? 1 : 0);
  const norm = (h) => String(h == null ? "" : h).trim().toUpperCase().replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();

  /* ---------- baca Sheet ---------- */
  async function gv(id, tab) {
    const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}&headers=1&_ts=${Date.now()}`;
    const res = await fetch(url), t = await res.text();
    const j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
    if (j.status === "error") throw new Error("Tab " + tab + " tidak dijumpai");
    let cols = (j.table.cols || []).map((c) => norm(c.label)), rows = j.table.rows || [];
    if (cols.every((c) => !c)) { if (!rows.length) return []; cols = (rows[0].c || []).map((c) => norm(c && c.v)); rows = rows.slice(1); }
    return rows.map((r) => { const o = {}; cols.forEach((k, i) => { const c = r.c && r.c[i]; o[k] = c && c.v != null ? c.v : ""; }); return o; });
  }
  const kelasT = (k) => { const m = String(k || "").match(/\d+/); return m ? parseInt(m[0], 10) : 99; };

  /* ---------- keadaan ---------- */
  const F = { murid: [], kelasList: [], barang: [], kat: [], resit: {}, mode: "ada", kelas: "", mi: "", grp: "Luar asrama", ting: 1, tingMurid: 1,
    baru: { nama: "", kp: "" }, off: {}, qty: {}, busy: false, err: "", done: null, ok: false };

  async function load() {
    try {
      const [mr, br, tt] = await Promise.all([gv(MURID_SHEET_ID, "DatabaseMurid"), gv(KP_SHEET_ID, "KP_Barang"), gv(KP_SHEET_ID, "KP_Tetapan")]);
      const seen = new Set();
      F.murid = mr.map((r) => Object.assign(r, { NAMA: r["NAMA"] || r["NAMA MURID"] })).filter((r) => r["NAMA"] && r["KELAS"]).map((r) => {
        const kod = norm(r["ASRAMA"]), kp = String(r["NO PENGENALAN"] || "").replace(/\D/g, "");
        return { nama: String(r["NAMA"]).trim(), kelas: String(r["KELAS"]).trim(), kp, grp: kod === "LA" || kod === "PA" ? "Asrama" : "Luar asrama" };
      }).filter((m) => { const k = (m.kp || "-") + "|" + m.nama.toUpperCase(); if (seen.has(k)) return false; seen.add(k); return true; });
      F.kelasList = [...new Set(F.murid.map((m) => m.kelas))].sort((a, b) => kelasT(a) - kelasT(b) || a.localeCompare(b, "ms", { numeric: true }));
      F.barang = br.filter((r) => r["KOD"] && f1(r["AKTIF"])).map((r) => ({ kod: String(r["KOD"]), nama: String(r["NAMA"]), kategori: String(r["KATEGORI"] || ""), jual: n(r["JUAL"]), lr: f1(r["LR"]), as: f1(r["AS"]),
        t: [1, 2, 3, 4, 5, 6].map((i) => f1(r["T" + i])), w: [1, 2, 3, 4, 5, 6].map((i) => f1(r["W" + i])) }));
      tt.forEach((r) => { try { const v = JSON.parse(r["NILAI"]); if (r["KUNCI"] === "kategori") F.kat = v; if (r["KUNCI"] === "resit") F.resit = v; } catch (e) {} });
      F.ok = true;
    } catch (e) { F.ok = false; F.err = "Borang tidak dapat dimuatkan. Semak sambungan internet dan cuba lagi. (" + (e.message || e) + ")"; }
    draw();
  }

  /* ---------- logik set ---------- */
  const ada = (b) => b.lr || b.as;
  const items = () => F.barang.filter((b) => (F.grp === "Asrama" ? b.as : b.lr) && b.t[F.ting - 1] && ada(b));
  const wajib = (b) => !!b.w[F.ting - 1];
  const isOn = (b) => wajib(b) || !F.off[b.kod];
  const qtyOf = (b) => F.qty[b.kod] || 1;
  const total = () => items().filter(isOn).reduce((s, b) => s + b.jual * qtyOf(b), 0);
  const muridKelas = () => F.murid.filter((m) => m.kelas === F.kelas);
  const reset = () => { F.off = {}; F.qty = {}; F.err = ""; };

  /* ---------- paparan ---------- */
  function draw() {
    const A = $("#app");
    if (F.done) { A.innerHTML = billView(); return; }
    let h = `<div class="hero"><span class="logo logoimg"><img src="${KP_LOGO}" alt="Logo sekolah" referrerpolicy="no-referrer" onerror="this.parentNode.textContent='K'"></span><div><h1>Tempahan Barang Koperasi</h1><p>SM Arab (JAIM) Al-Asyraf · Pilih set mengikut tingkatan, semak, kemudian hantar.</p></div></div>`;
    if (!F.ok) { A.innerHTML = h + `<div class="card pad"><div class="err">${esc(F.err || "Memuatkan borang…")}</div><div style="margin-top:10px"><button class="btn" data-a="muat">Cuba lagi</button></div></div>`; return; }
    // langkah 1
    h += `<div class="card pad"><div class="step"><i>1</i><h2>Maklumat murid</h2></div>
      <div class="chips" style="margin-bottom:12px"><button class="ch ${F.mode === "ada" ? "on" : ""}" data-a="mode" data-k="ada">Murid sedia ada</button><button class="ch ${F.mode === "baru" ? "on" : ""}" data-a="mode" data-k="baru">Murid baharu</button></div>`;
    if (F.mode === "ada") {
      const ml = muridKelas(), m = F.murid.find((x) => (x.kp || x.nama) + "|" + x.kelas === F.mi);
      h += `<div class="form" style="grid-template-columns:1fr 1fr"><label class="fld"><span class="lbl">Kelas (tahun semasa)</span><select data-i="kelas"><option value="">— pilih kelas —</option>${F.kelasList.map((k) => `<option ${k === F.kelas ? "selected" : ""}>${esc(k)}</option>`).join("")}</select></label>
        <label class="fld"><span class="lbl">Nama murid</span><select data-i="murid" ${F.kelas ? "" : "disabled"}><option value="">${F.kelas ? "— pilih nama —" : "Pilih kelas dahulu"}</option>${ml.map((x) => { const k = (x.kp || x.nama) + "|" + x.kelas; return `<option value="${esc(k)}" ${k === F.mi ? "selected" : ""}>${esc(x.nama)}</option>`; }).join("")}</select></label></div>
        ${m ? `<div class="note small" style="margin-top:10px">Murid: <b>${esc(m.nama)}</b> · Kelas ${esc(m.kelas)}</div>` : ""}`;
    } else {
      h += `<div class="form" style="grid-template-columns:1fr 1fr"><label class="fld span2"><span class="lbl">Nama penuh murid</span><input data-i="bnama" autocomplete="off" value="${esc(F.baru.nama)}" placeholder="Seperti dalam Kad Pengenalan"></label>
        <label class="fld span2"><span class="lbl">No. Kad Pengenalan (12 digit)</span><input data-i="bkp" inputmode="numeric" maxlength="14" autocomplete="off" value="${esc(F.baru.kp)}" placeholder="cth. 110203040506"></label>
        <div class="fld span2"><span class="lbl">Tingkatan murid</span><div class="chips">${[1, 2, 3, 4, 5, 6].map((t) => `<button class="ch ${t === F.tingMurid ? "on" : ""}" data-a="tm" data-k="${t}">T${t}</button>`).join("")}</div></div></div>`;
    }
    h += `<div class="fld" style="margin-top:12px"><span class="lbl">Murid asrama atau luar asrama?</span><div class="chips">${["Luar asrama", "Asrama"].map((g) => `<button class="ch ${g === F.grp ? "on" : ""}" data-a="grp" data-k="${g}">${g}</button>`).join("")}</div></div></div>`;
    // langkah 2
    const L = items(), kats = [...new Set(F.kat.concat(L.map((b) => b.kategori)))].filter((k) => L.some((b) => b.kategori === k));
    h += `<div class="card" style="padding:16px 0 4px"><div class="step" style="padding:0 16px"><i>2</i><h2>Pilih set tingkatan</h2></div>
      <div style="padding:0 16px 10px"><div class="chips">${[1, 2, 3, 4, 5, 6].map((t) => `<button class="ch ${t === F.ting ? "on" : ""}" data-a="ting" data-k="${t}">Set Tingkatan ${t}</button>`).join("")}</div>
      <div class="muted small" style="margin-top:8px">Semua barang dalam set ditanda. Buang tanda pada barang yang <b>tidak wajib</b> dan tidak diperlukan. Barang bertanda <b>WAJIB</b> tidak boleh dibuang.</div></div>`;
    if (!L.length) h += `<div class="empty">Set Tingkatan ${F.ting} (${F.grp}) belum disediakan oleh koperasi.</div>`;
    kats.forEach((k) => {
      h += `<div class="kat">${esc(k)}</div>`;
      L.filter((b) => b.kategori === k).forEach((b) => {
        const on = isOn(b), w = wajib(b);
        h += `<div class="irow ${on ? "" : "off"}"><button class="cb ${on ? "on" : ""}" data-a="tog" data-k="${esc(b.kod)}" ${w ? "disabled" : ""} aria-label="${esc(b.nama)}" aria-pressed="${on}">${on ? "✓" : ""}</button>
          <div style="min-width:0"><b style="font-weight:600">${esc(b.nama)}</b> ${w ? `<i class="pill p-warn" style="margin-left:4px">WAJIB</i>` : ""}<div class="muted small">${rm(b.jual)}</div></div>
          ${on ? `<span class="qty"><button data-a="q-" data-k="${esc(b.kod)}" aria-label="Kurang">−</button><b class="num">${qtyOf(b)}</b><button data-a="q+" data-k="${esc(b.kod)}" aria-label="Tambah">+</button></span>` : ""}</div>`;
      });
    });
    h += `</div>`;
    if (F.err) h += `<div class="err" role="alert">${esc(F.err)}</div>`;
    h += `<input class="hp" id="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="bar-fix"><div><div><div class="lbl">Jumlah keseluruhan</div><b class="hd" style="font-size:24px;color:var(--pri-d)">${rm(total())}</b> <span class="muted small">${L.filter(isOn).length} barang</span></div><button class="btn cta" data-a="hantar" ${F.busy || !L.length ? "disabled" : ""} style="font-size:15px">${F.busy ? "Menghantar…" : "Hantar tempahan"}</button></div></div>`;
    A.innerHTML = h;
  }

  function billHtml(t) {
    let img = ""; try { const q = qrcode(0, "M"); q.addData(t.no); q.make(); img = `<img alt="QR ${esc(t.no)}" src="${q.createDataURL(6, 2)}" style="width:170px;height:170px;image-rendering:pixelated">`; } catch (e) { img = `<b style="font-size:20px">${esc(t.no)}</b>`; }
    return `<div class="resit"><div style="text-align:center"><b>${esc(F.resit.nama || "Koperasi SMA (JAIM) Al-Asyraf")}</b><br>BILL TEMPAHAN<br><b style="font-size:18px">${esc(t.no)}</b><br>${esc(t.tarikh)}</div><hr>
      <div>Murid: ${esc(t.murid)}${t.kelas ? " (" + esc(t.kelas) + ")" : ""}</div><div>Set: Tingkatan ${t.ting} · ${esc(t.grp)}</div><hr>
      ${t.items.map((i) => `<div class="l"><span>${esc(i.nama)}<br>&nbsp;${i.qty} x ${i.harga.toFixed(2)}</span><span>${(i.qty * i.harga).toFixed(2)}</span></div>`).join("")}<hr>
      <div class="l"><b>JUMLAH</b><b>${rm(t.jumlah)}</b></div><hr><div style="text-align:center">${img}<br>Tunjuk QR ini di kaunter koperasi untuk bayaran &amp; pengambilan barang</div></div>`;
  }
  function billView() {
    return `<div class="hero"><span class="logo logoimg"><img src="${KP_LOGO}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.textContent='K'"></span><div><h1>Tempahan berjaya dihantar</h1><p>Simpan atau cetak bill ini. QR ditunjukkan di kaunter koperasi.</p></div></div>
      <div class="card pad" style="display:flex;flex-direction:column;gap:12px">${billHtml(F.done)}<div class="sp"><button class="btn line" data-a="baru">Buat tempahan lain</button><button class="btn cta" data-a="cetak">Cetak / Simpan PDF</button></div></div>`;
  }

  /* ---------- tindakan ---------- */
  const ACT = {
    muat: () => { F.err = ""; load(); },
    mode: (t) => { F.mode = t.dataset.k; reset(); draw(); },
    grp: (t) => { F.grp = t.dataset.k; reset(); draw(); },
    ting: (t) => { F.ting = +t.dataset.k; reset(); draw(); },
    tm: (t) => { F.tingMurid = +t.dataset.k; F.ting = F.tingMurid; reset(); draw(); },
    tog: (t) => { const k = t.dataset.k; if (F.off[k]) delete F.off[k]; else F.off[k] = 1; draw(); },
    "q+": (t) => { const k = t.dataset.k; F.qty[k] = Math.min(10, (F.qty[k] || 1) + 1); draw(); },
    "q-": (t) => { const k = t.dataset.k; F.qty[k] = Math.max(1, (F.qty[k] || 1) - 1); draw(); },
    baru: () => { F.done = null; F.mi = ""; F.kelas = ""; F.baru = { nama: "", kp: "" }; reset(); draw(); window.scrollTo(0, 0); },
    cetak: () => { const p = $("#print"); p.innerHTML = billHtml(F.done); p.hidden = false; setTimeout(() => { window.print(); p.hidden = true; }, 60); },
    hantar: async () => {
      F.err = "";
      let murid;
      if (F.mode === "ada") {
        const m = F.murid.find((x) => (x.kp || x.nama) + "|" + x.kelas === F.mi);
        if (!m) { F.err = "Sila pilih kelas dan nama murid."; draw(); window.scrollTo(0, 0); return; }
        murid = { nama: m.nama, kelas: m.kelas, kp: m.kp, baru: false };
      } else {
        const kp = F.baru.kp.replace(/\D/g, "");
        if (F.baru.nama.trim().length < 3) { F.err = "Sila taip nama penuh murid."; draw(); window.scrollTo(0, 0); return; }
        if (kp.length !== 12) { F.err = "No. Kad Pengenalan mesti 12 digit."; draw(); window.scrollTo(0, 0); return; }
        murid = { nama: F.baru.nama.trim(), kp, kelas: "", baru: true };
      }
      const L = items().filter(isOn);
      if (!L.length) { F.err = "Tiada barang dipilih."; draw(); return; }
      F.busy = true; draw();
      try {
        const res = await fetch(KP_API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "hantarTempahan", murid, kumpulan: F.grp, tingkatan: F.ting, tingkatanMurid: F.tingMurid, items: L.map((b) => ({ kod: b.kod, qty: qtyOf(b) })), hp: ($("#hp") || {}).value || "" }) });
        const j = await res.json();
        F.busy = false;
        if (!j.success) { F.err = j.message || "Tempahan gagal. Cuba lagi."; draw(); window.scrollTo(0, document.body.scrollHeight); return; }
        F.done = { no: j.no, tarikh: j.tarikh, jumlah: j.jumlah, murid: murid.nama.toUpperCase(), kelas: murid.baru ? "Baharu T" + F.tingMurid : murid.kelas, ting: F.ting, grp: F.grp, items: L.map((b) => ({ nama: b.nama, qty: qtyOf(b), harga: b.jual })) };
        draw(); window.scrollTo(0, 0);
      } catch (e) { F.busy = false; F.err = "Tiada sambungan ke pelayan. Cuba lagi."; draw(); }
    }
  };
  const INP = {
    kelas: (t) => { F.kelas = t.value; F.mi = ""; draw(); },
    murid: (t) => { F.mi = t.value; const m = F.murid.find((x) => (x.kp || x.nama) + "|" + x.kelas === F.mi); if (m) { F.grp = m.grp; F.ting = F.tingMurid = kelasT(m.kelas) <= 6 ? kelasT(m.kelas) : 1; reset(); } draw(); },
    bnama: (t) => { F.baru.nama = t.value; },
    bkp: (t) => { F.baru.kp = t.value; }
  };
  document.addEventListener("click", (e) => { const t = e.target.closest("[data-a]"); if (t && ACT[t.dataset.a]) ACT[t.dataset.a](t); });
  document.addEventListener("input", (e) => { const t = e.target.closest("[data-i]"); if (t && INP[t.dataset.i] && (t.tagName === "INPUT")) INP[t.dataset.i](t); });
  document.addEventListener("change", (e) => { const t = e.target.closest("[data-i]"); if (t && INP[t.dataset.i] && t.tagName === "SELECT") INP[t.dataset.i](t); });
  load();
})();
