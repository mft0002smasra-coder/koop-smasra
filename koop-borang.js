/* Borang Tempahan Barang Koperasi (embed awam untuk murid / ibu bapa). BERDIRI SENDIRI — tidak memuatkan koop-core.js.
 * Baca: Google Sheet (gviz) — DatabaseMurid (app-smasra) + KP_Barang / KP_Tetapan (koperasi).
 * Tulis: Apps Script (tindakan awam "hantarTempahan", disahkan sepenuhnya di pelayan). */
const KP_API = "https://script.google.com/macros/s/AKfycbwyLzwfPFsazYkoGbnLQfI8G36LvngSxnEqVb6DSnieDN7kXLDhPmSAAz-eq4K1_oqU/exec";
const KP_SHEET_ID = "1_qim2NXJ4et0Z2eWiNvrFNozm0SDi9a0urEB96Gt88A";   // Sheet Koperasi
const MURID_SHEET_ID = "1EohV_hfuS6SDgiqDn--QQiM_y92_K4jvGyh87nA3HOo"; // Sheet app-smasra (tab DatabaseMurid)
const KP_QR_LOCAL = "qr-bayaran.png"; // letak fail QR akaun Koperasi di repo (sama folder dengan tempahan.html)
const KP_QR_DRIVE = "https://lh3.googleusercontent.com/d/1AYLP1s46NZHi1becX64hfJzrkOKElgQO";
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
  const kpJt = (kp) => { kp = String(kp || "").replace(/\D/g, ""); return kp.length === 12 ? (parseInt(kp.slice(-1), 10) % 2 === 0 ? "P" : "L") : ""; }; // akhir genap = perempuan, ganjil = lelaki
  const kelasT = (k) => { const m = String(k || "").match(/\d+/); return m ? parseInt(m[0], 10) : 99; };

  /* ---------- keadaan ---------- */
  const F = { murid: [], kelasList: [], barang: [], kat: [], resit: {}, mode: "ada", kelas: "", mi: "", grp: "Luar asrama", ting: 0, tingMurid: 1, jtManual: "", step: 1, tukar: false, sesiCfg: {},
    baru: { nama: "", kp: "" }, sel: {}, size: {}, qty: {}, busy: false, err: "", done: null, ok: false,
    view: "home", qrPay: "", cash: false, bq: "", bres: null, bbusy: false, berr: "", bmsg: {}, rq: "", rres: null, rbusy: false, rerr: "" };

  async function load() {
    try {
      const [mr, br, tt] = await Promise.all([gv(MURID_SHEET_ID, "DatabaseMurid"), gv(KP_SHEET_ID, "KP_Barang"), gv(KP_SHEET_ID, "KP_Tetapan")]);
      const seen = new Set();
      F.murid = mr.map((r) => Object.assign(r, { NAMA: r["NAMA"] || r["NAMA MURID"] })).filter((r) => r["NAMA"] && r["KELAS"]).map((r) => {
        const kod = norm(r["ASRAMA"]), kp = String(r["NO PENGENALAN"] || "").replace(/\D/g, "");
        const jr = norm(r["JANTINA"] || r["JANTINA MURID"] || r["JANTINA "]), jt = /^(L|LELAKI)$/.test(jr) ? "L" : /^(P|PEREMPUAN)$/.test(jr) ? "P" : kpJt(kp);
        return { nama: String(r["NAMA"]).trim(), kelas: String(r["KELAS"]).trim(), kp, jt, grp: kod === "LA" || kod === "PA" ? "Asrama" : "Luar asrama" };
      }).filter((m) => { const k = (m.kp || "-") + "|" + m.nama.toUpperCase(); if (seen.has(k)) return false; seen.add(k); return true; });
      F.kelasList = [...new Set(F.murid.map((m) => m.kelas))].sort((a, b) => kelasT(a) - kelasT(b) || a.localeCompare(b, "ms", { numeric: true }));
      F.barang = br.filter((r) => r["KOD"] && f1(r["AKTIF"])).map((r) => ({ kod: String(r["KOD"]), nama: String(r["NAMA"]), kategori: String(r["KATEGORI"] || ""), jual: n(r["JUAL"]), lr: f1(r["LR"]), as: f1(r["AS"]),
        t: [1, 2, 3, 4, 5, 6].map((i) => f1(r["T" + i])), w: [1, 2, 3, 4, 5, 6].map((i) => f1(r["W" + i])),
        q: [1, 2, 3, 4, 5, 6].map((i) => (String(r["Q" + i]).trim() === "" ? 1 : Math.max(0, Math.floor(n(r["Q" + i]))))), jt: /^[LP]$/i.test(String(r["JANTINA"]).trim()) ? String(r["JANTINA"]).trim().toUpperCase() : "", varian: String(r["VARIAN"] || "").trim(), saiz: String(r["SAIZ"] || "").split(",").map((z) => z.trim()).filter(Boolean), baru: f1(r["UNTUKBARU"]),
        bh: [1, 2, 3, 4, 5, 6].map((i) => { const v = String(r["BH" + i] || "").trim().toUpperCase(); return /^[ABC]$/.test(v) ? v : (!f1(r["LR"]) && f1(r["AS"]) ? "B" : f1(r["W" + i]) ? "A" : "C"); }) }));
      tt.forEach((r) => { try { const v = JSON.parse(r["NILAI"]); if (r["KUNCI"] === "kategori") F.kat = v; if (r["KUNCI"] === "resit") F.resit = v; if (r["KUNCI"] === "sesi") F.sesiCfg = v || {}; } catch (e) {} });
      F.ok = true;
    } catch (e) { F.ok = false; F.err = "Borang tidak dapat dimuatkan. Semak sambungan internet dan cuba lagi. (" + (e.message || e) + ")"; }
    draw();
  }

  /* ---------- sesi: tahun & tingkatan set (automatik setiap tahun) ---------- */
  // Dari bulan "mula" (lalai Oktober) hingga Disember => set TAHUN DEPAN (murid naik satu tingkatan). Bulan lain => set tahun semasa.
  const sesi = () => { const d = new Date(), y = d.getFullYear(), m = d.getMonth() + 1, c = F.sesiCfg || {}, mula = Math.floor(n(c.mula)) || 10; let tahun = Math.floor(n(c.tahun)) || 0; if (!tahun) tahun = m >= mula ? y + 1 : y; return { tahun, naik: Math.max(0, tahun - y) }; };
  const curMurid = () => F.murid.find((x) => (x.kp || x.nama) + "|" + x.kelas === F.mi);
  const autoTing = () => { if (F.mode === "baru") return F.tingMurid; const t = F.tingMurid + sesi().naik; return t >= 1 && t <= 6 ? t : 0; };
  const syncTing = () => { F.ting = F.mode === "baru" ? F.tingMurid : (curMurid() ? autoTing() : 0); };

  /* ---------- logik set ---------- */
  const ada = (b) => b.lr || b.as;
  const jantina = () => {
    if (F.mode === "baru") return kpJt(F.baru.kp) || F.jtManual;
    const m = curMurid(); return m ? (m.jt || kpJt(m.kp) || F.jtManual) : "";
  };
  const jtKnown = () => (F.mode === "baru" ? !!kpJt(F.baru.kp) : (() => { const m = curMurid(); return !!(m && (m.jt || kpJt(m.kp))); })());
  // baris paparan: barang sama VARIAN digabung (satu baris, pilihan saiz)
  function rows() {
    const jt = jantina(), map = {}, out = [];
    if (F.ting < 1) return out;
    F.barang.filter((b) => (F.grp === "Asrama" ? b.as : b.lr) && b.t[F.ting - 1] && ada(b) && (!b.jt || (jt && b.jt === jt))).forEach((b) => {
      const key = b.varian || b.kod;
      if (!map[key]) { map[key] = { key, nama: b.varian || b.nama, vars: [], opts: [] }; out.push(map[key]); }
      const r = map[key]; r.vars.push(b);
      (b.saiz.length ? b.saiz : [""]).forEach((z) => r.opts.push({ saiz: z, b }));
    });
    out.forEach((r) => { r.sized = r.opts.some((o) => o.saiz); r.q = r.vars[0].q[F.ting - 1]; r.baru = r.vars.some((b) => b.baru); r.wb = r.baru && F.mode === "baru" && F.grp === "Asrama" && r.vars.every((b) => !b.lr && b.as); r.w = (r.vars.some((b) => b.w[F.ting - 1]) && r.q > 0) || r.wb; r.min = r.w ? Math.max(1, r.q) : 1; r.bh = r.vars[0].bh[F.ting - 1] || "C"; });
    return out;
  }
  const isOn = (r) => r.w || (F.sel[r.key] !== undefined ? F.sel[r.key] : (r.baru && F.mode === "baru"));
  const qtyOf = (r) => Math.max(r.min, F.qty[r.key] || Math.max(1, r.q));
  const pick = (r) => (r.sized ? (r.opts.find((o) => o.saiz === F.size[r.key]) || {}).b : r.vars[0]);
  const total = () => rows().filter(isOn).reduce((s, r) => { const b = pick(r); return s + (b ? b.jual * qtyOf(r) : 0); }, 0);
  const muridKelas = () => F.murid.filter((m) => m.kelas === F.kelas);
  const reset = () => { F.sel = {}; F.size = {}; F.qty = {}; F.err = ""; };
  const namaItem = (r, z) => r.nama + (z ? " (saiz " + z + ")" : "");
  const missing = () => {
    if (F.mode === "ada") { if (!F.kelas) return "Pilih kelas murid"; if (!curMurid()) return "Pilih nama murid"; }
    else { if (F.baru.nama.trim().length < 3) return "Taip nama penuh murid"; if (F.baru.kp.replace(/\D/g, "").length !== 12) return "Taip No. Kad Pengenalan 12 digit"; }
    if (!jantina()) return "Pilih jantina murid";
    if (F.ting < 1) return "Pilih tingkatan set";
    return "";
  };
  const SEK = { A: ["A) Barang Keperluan Sekolah", "WAJIB", "wj"], B: ["B) Barang Keperluan Asrama", "wajib murid baru / jika perlu", "pl"], C: ["C) Lain-lain Keperluan", "jika perlu", "pl"] };
  const EMO = [[/fail/i, "📁"], [/baju|t-shirt|prep|anak melaka|sukan/i, "👕"], [/seluar/i, "👖"], [/tudung/i, "🧕"], [/sampin|tali leher/i, "👔"], [/cadar|selimut/i, "🛏️"], [/kalkulator/i, "🧮"], [/bag/i, "👜"], [/lencana|tanda nama|kad /i, "🏷️"], [/yuran|saham/i, "💰"], [/stiker|sticker/i, "🚗"], [/kain/i, "🧵"], [/buku|nota|kajang|omr|kamus/i, "📒"]];
  const emo = (nm) => { const e = EMO.find(([re]) => re.test(nm)); return e ? e[1] : "📦"; };
  const grpHtml = () => (F.grp === "Asrama" ? "Asrama" : "Luar asrama");

  /* ---------- paparan ---------- */
  const HDR = (t, p, back, act) => `<div class="hdr">${back ? `<button class="bk" data-a="${act || "home"}" aria-label="Kembali">←</button>` : ""}<img class="lg" src="${KP_LOGO}" alt="Logo sekolah" referrerpolicy="no-referrer" onerror="this.style.display='none'"><div style="flex:1;min-width:0"><b>${t}</b>${p ? `<small>${p}</small>` : ""}</div></div>`;
  const NAV = (a) => `<nav class="nav2" aria-label="Menu utama">${[["home", "🏠", "Utama"], ["tempah", "🛍️", "Tempah"], ["bayar", "💳", "Bayar"], ["resit", "🧾", "Resit"]].map(([k, i, l]) => `<button class="${a === k ? "on" : ""}" data-a="${k === "home" ? "home" : "go"}" data-k="${k}"><em>${i}</em>${l}</button>`).join("")}</nav>`;
  const LOGO = `<img class="lg" src="${KP_LOGO}" alt="Logo sekolah" referrerpolicy="no-referrer" onerror="this.style.display='none'">`;
  const PROG = (st) => `<div class="pr">${[1, 2, 3].map((i) => `<i class="${i <= st ? "on" : ""}"></i>`).join("")}</div>`;
  const BOT = (inner) => `<div class="bot"><div class="botin">${inner}</div></div>`;
  function draw() {
    const A = $("#app");
    if (F.view === "home") { A.innerHTML = homeView() + NAV("home"); return; }
    if (F.view === "bayar") { A.innerHTML = bayarView() + NAV("bayar"); return; }
    if (F.view === "resit") { A.innerHTML = resitView() + NAV("resit"); return; }
    if (F.done) { A.innerHTML = billView(); return; }
    if (!F.ok) { A.innerHTML = HDR("Tempahan Barang", "", true) + `<div class="card pad"><div class="err">${esc(F.err || "Memuatkan borang…")}</div><div style="margin-top:10px"><button class="btn" data-a="muat">Cuba lagi</button></div></div>`; return; }
    A.innerHTML = (F.step === 1 ? step1() : F.step === 2 ? step2() : step3());
  }
  function step1() {
    const m = curMurid(), s = sesi(), mi = missing(), jt = jantina(), tahu = jtKnown(), hasMurid = F.mode === "baru" || !!m;
    let h = `<div class="tp">${LOGO}<b style="flex:1">Tempahan Barang</b><button class="lnk" data-a="back">← Utama</button></div>${PROG(1)}<div class="lb">Langkah 1 daripada 3 · Maklumat murid · Set Tahun ${s.tahun}</div>`;
    h += `<div class="fld"><label>Jenis murid</label><button class="ch ${F.mode === "ada" ? "on" : ""}" data-a="mode" data-k="ada">Murid sedia ada</button><button class="ch ${F.mode === "baru" ? "on" : ""}" data-a="mode" data-k="baru">Murid baharu</button></div>`;
    if (F.mode === "ada") {
      const ml = muridKelas();
      h += `<div class="fld"><label for="f-kelas">Kelas tahun semasa</label><select class="in ${F.kelas ? "f" : ""}" id="f-kelas" data-i="kelas"><option value="">— pilih kelas —</option>${F.kelasList.map((k) => `<option ${k === F.kelas ? "selected" : ""}>${esc(k)}</option>`).join("")}</select></div>
        <div class="fld"><label for="f-murid">Nama murid</label><select class="in ${F.mi ? "f" : ""}" id="f-murid" data-i="murid" ${F.kelas ? "" : "disabled"}><option value="">${F.kelas ? "— pilih nama —" : "Pilih kelas dahulu"}</option>${ml.map((x) => { const k = (x.kp || x.nama) + "|" + x.kelas; return `<option value="${esc(k)}" ${k === F.mi ? "selected" : ""}>${esc(x.nama)}</option>`; }).join("")}</select></div>`;
    } else {
      h += `<div class="fld"><label for="f-bn">Nama penuh murid</label><input class="in" id="f-bn" data-i="bnama" autocomplete="off" value="${esc(F.baru.nama)}" placeholder="Seperti dalam Kad Pengenalan"></div>
        <div class="fld"><label for="f-bk">No. Kad Pengenalan (12 digit)</label><input class="in" id="f-bk" data-i="bkp" inputmode="numeric" maxlength="14" autocomplete="off" value="${esc(F.baru.kp)}" placeholder="cth. 110203040506"></div>
        <div class="fld"><label for="f-tm">Tingkatan yang akan dimasuki (Tahun ${s.tahun})</label><select class="in f" id="f-tm" data-i="tmset">${[1, 2, 3, 4, 5, 6].map((t) => `<option value="${t}" ${t === F.tingMurid ? "selected" : ""}>Tingkatan ${t}</option>`).join("")}</select></div>`;
    }
    h += `<div class="fld"><label>Asrama atau luar asrama?</label>${["Asrama", "Luar asrama"].map((g) => `<button class="ch ${g === F.grp ? "on" : ""}" data-a="grp" data-k="${g}">${g}</button>`).join("")}</div>`;
    if (hasMurid) h += `<div class="fld"><label>Jantina</label>${tahu ? `<div class="in ro">${jt === "L" ? "Lelaki" : "Perempuan"} · daripada ${F.mode === "baru" || !(m && m.jt) ? "No. KP" : "data murid"}</div>` : `${[["L", "Lelaki"], ["P", "Perempuan"]].map(([k, v]) => `<button class="ch ${F.jtManual === k ? "on" : ""}" data-a="jt" data-k="${k}">${v}</button>`).join("")}<div class="lb" style="margin:6px 0 0">${F.mode === "baru" ? "Ditentukan automatik bila No. KP 12 digit ditaip." : "Jantina tiada dalam data. Sila pilih."}</div>`}</div>`;
    if (F.mode === "ada" && m) {
      const a = autoTing();
      h += `<div class="fld"><label>Tingkatan (set Tahun ${s.tahun})</label>${a && !F.tukar ? `<div class="in ro">Tingkatan ${a} · ${s.naik > 0 ? "naik daripada Tingkatan " + F.tingMurid : "daripada kelas"} <button class="lnk" data-a="tukar" style="float:right">Tukar</button></div>` : `${s.naik > 0 && !a ? `<div class="lb" style="margin:0 0 6px">Murid kini Tingkatan ${F.tingMurid} (tamat persekolahan). Tiada set Tahun ${s.tahun}; pilih tingkatan jika perlu.</div>` : ""}<select class="in f" data-i="tset"><option value="0" ${F.ting ? "" : "selected"}>— pilih tingkatan —</option>${[1, 2, 3, 4, 5, 6].map((t) => `<option value="${t}" ${t === F.ting ? "selected" : ""}>Tingkatan ${t}</option>`).join("")}</select>`}</div>`;
    }
    if (F.err) h += `<div class="err" role="alert">${esc(F.err)}</div>`;
    return `<div class="sc">${h}</div>` + BOT(`${mi ? `<div class="lb" style="margin:0 0 8px;text-align:center">${esc(mi)}</div>` : ""}<button class="cta ${mi ? "dis" : ""}" data-a="next" ${mi ? "disabled" : ""}>Seterusnya →</button>`);
  }
  function muridBar(ubah) {
    const m = curMurid(), jt = jantina();
    const nm = F.mode === "baru" ? F.baru.nama.trim().toUpperCase() : (m ? m.nama : ""), kl = F.mode === "baru" ? "Murid baharu" : (m ? m.kelas : "");
    return `<div class="sum"><div><b>${esc(nm)}</b><br>${esc(kl)} · T${F.ting} · ${grpHtml()} · ${jt === "L" ? "Lelaki" : "Perempuan"}</div>${ubah ? `<button data-a="ubah">Ubah</button>` : ""}</div>`;
  }
  function step2() {
    const L = rows();
    let h = PROG(2) + muridBar(true) + `<div class="t17">Pilihan Set Tingkatan ${F.ting}</div>`;
    if (!L.length) h += `<div class="it empty">Set Tingkatan ${F.ting} (${grpHtml()}) belum disediakan oleh koperasi.</div>`;
    ["A", "B", "C"].forEach((k) => {
      const li = L.filter((r) => r.bh === k); if (!li.length) return;
      h += `<div class="sec"><span>${SEK[k][0]}</span><small class="${k === "A" ? "g2" : ""}">${SEK[k][1]}</small></div>`;
      li.forEach((r) => {
        const on = isOn(r), pb = pick(r), hs = r.opts.map((o) => o.b.jual), lo = Math.min(...hs), hi = Math.max(...hs);
        const harga = r.sized ? (pb ? rm(pb.jual) : lo === hi ? rm(lo) : rm(lo) + " – " + rm(hi)) : rm(r.vars[0].jual);
        const z = F.size[r.key];
        const sub = `${harga}${on && pb ? " × " + qtyOf(r) : ""}`;
        const sz = r.sized && on ? `<select class="szs" data-i="size" data-k="${esc(r.key)}" aria-label="Saiz ${esc(r.nama)}"><option value="">— pilih saiz —</option>${r.opts.map((o) => `<option value="${esc(o.saiz)}" ${z === o.saiz ? "selected" : ""}>${esc(o.saiz)} — ${rm(o.b.jual)}</option>`).join("")}</select>` : "";
        const mn = r.min, q0 = qtyOf(r);
        const qty = `<div class="q"><i class="${r.w && q0 <= mn ? "dim" : ""}" data-a="q-" data-k="${esc(r.key)}" role="button" tabindex="0" aria-label="Kurang" ${r.w && q0 <= mn ? 'aria-disabled="true"' : ""}>−</i>${q0}<i class="p" data-a="q+" data-k="${esc(r.key)}" role="button" tabindex="0" aria-label="Tambah">+</i></div>`;
        const right = on ? `<div style="text-align:right">${qty}${pb ? `<b style="display:block;margin-top:4px;font-size:12.5px">${rm(pb.jual * q0)}</b>` : ""}</div>` : `<div class="q"><i class="p" data-a="tog" data-k="${esc(r.key)}" role="button" tabindex="0" aria-label="Tambah ${esc(r.nama)}">+</i></div>`;
        h += `<div class="it"><div class="th">${emo(r.nama)}</div><div class="n">${esc(r.nama)}${r.w ? ` <span class="lock">WAJIB${r.wb ? " · murid baharu" : ""}</span>` : ""}<small>${sub}${r.w && r.min > 1 ? ` · minima ${r.min}` : ""}</small>${sz}</div>${right}</div>`;
      });
    });
    if (F.err) h += `<div class="err" role="alert" style="margin-top:10px">${esc(F.err)}</div>`;
    return `<div class="sc">${h}</div>` + BOT(`<div class="tot"><span>Jumlah sementara</span><b>${rm(total())}</b></div><button class="cta ${L.length ? "" : "dis"}" data-a="next" ${L.length ? "" : "disabled"}>Seterusnya →</button>`);
  }
  function step3() {
    const L = rows().filter(isOn);
    let h = PROG(3) + `<div class="t18">Semak tempahan</div><div class="lb2">Pastikan semua betul sebelum dihantar.</div>` + muridBar(false) + `<div class="cd" style="padding:6px 14px">`;
    L.forEach((r, i) => { const b = pick(r), z = F.size[r.key] || ""; h += `<div class="row2" ${i === L.length - 1 ? 'style="border:0"' : ""}><span>${esc(r.nama)}${z ? ` · saiz ${esc(z)}` : ""} × ${qtyOf(r)}</span><b>${(qtyOf(r) * b.jual).toFixed(2)}</b></div>`; });
    h += `</div>`;
    if (F.err) h += `<div class="err" role="alert" style="margin-top:10px">${esc(F.err)}</div>`;
    return `<div class="sc">${h}<input class="hp" id="hp" tabindex="-1" autocomplete="off" aria-hidden="true"></div>` + BOT(`<div class="tot"><span>Jumlah perlu dibayar</span><b>${rm(total())}</b></div><div class="two"><button class="cta ed" data-a="edit" ${F.busy ? "disabled" : ""}>✏️ Edit</button><button class="cta" data-a="hantar" ${F.busy ? "disabled" : ""}>${F.busy ? "Menghantar…" : "Hantar tempahan"}</button></div>`);
  }

  function billHtml(t) {
    let img = ""; try { const q = qrcode(0, "M"); q.addData(t.no); q.make(); img = `<img alt="QR ${esc(t.no)}" src="${q.createDataURL(6, 2)}" style="width:170px;height:170px;image-rendering:pixelated">`; } catch (e) { img = `<b style="font-size:20px">${esc(t.no)}</b>`; }
    return `<div class="resit"><div style="text-align:center"><b>${esc(F.resit.nama || "Koperasi SMA (JAIM) Al-Asyraf")}</b><br>BILL TEMPAHAN<br><b style="font-size:18px">${esc(t.no)}</b><br>${esc(t.tarikh)}</div><hr>
      <div>Murid: ${esc(t.murid)}${t.kelas ? " (" + esc(t.kelas) + ")" : ""}</div><div>Set: Tahun ${t.tahun || ""} · Tingkatan ${t.ting} · ${esc(t.grp)}</div><hr>
      ${t.items.map((i) => `<div class="l"><span>${esc(i.nama)}<br>&nbsp;${i.qty} x ${i.harga.toFixed(2)}</span><span>${(i.qty * i.harga).toFixed(2)}</span></div>`).join("")}<hr>
      <div class="l"><b>JUMLAH</b><b>${rm(t.jumlah)}</b></div><hr><div style="text-align:center">${img}<br>Tunjuk QR ini di kaunter koperasi untuk bayaran &amp; pengambilan barang</div></div>`;
  }
  function homeView() {
    const ty = sesi().tahun;
    return `<div class="sc"><div class="tp">${LOGO}<div><small>Selamat datang</small><b>Koperasi SM Arab (JAIM) Al-Asyraf</b></div></div>
    <div class="ban"><h2>Set sekolah ${ty}, tempah dari rumah</h2><p>Pilih set ikut tingkatan, bayar dan ambil di koperasi.</p><button class="b" data-a="go" data-k="tempah">Tempah sekarang →</button><span class="em" aria-hidden="true">🎒</span></div>
    <h3>Perkhidmatan</h3>
    <div class="g"><button class="cd big" data-a="go" data-k="tempah"><span class="ic" style="background:#FDE68A">🛍️</span><span><b>Tempahan Barang</b><span class="s">Set Tingkatan 1 hingga 6, siap invois PDF</span></span></button>
    <button class="cd" data-a="go" data-k="bayar"><span class="ic" style="background:#EDE9FE">💳</span><b>Pembayaran</b><span class="s">Muat naik bukti bayaran</span></button>
    <button class="cd" data-a="go" data-k="resit"><span class="ic" style="background:#E0ECFF">🧾</span><b>Resit</b><span class="s">Muat turun selepas selesai</span></button></div>
    <h3>Cara tempah</h3><div class="steps"><div class="st"><i>1</i>Isi maklumat murid</div><div class="st"><i>2</i>Pilih set &amp; semak</div><div class="st"><i>3</i>Bayar &amp; ambil</div></div></div>`;
  }
  function billView() {
    const t = F.done;
    return HDR("Tempahan telah dibuat", "Tempahan anda telah diterima oleh koperasi.", false) + `<div class="card pad ok-box"><b>✓ Tempahan ${esc(t.no)} telah dibuat.</b><div class="small" style="margin-top:4px">Anda boleh <b>terus membuat pembayaran</b> (pindahan / QR dan muat naik bukti) atau <b>bayar tunai di koperasi</b>. Muat turun invoice di bawah untuk imbasan QR akaun koperasi.</div></div>
      ${F.cash ? `<div class="note">Sila bawa invoice (atau tunjuk QR) ke kaunter koperasi untuk bayaran tunai dan pengambilan barang. Terima kasih.</div>` : ""}
      <div class="card pad" style="display:flex;flex-direction:column;gap:12px">${billHtml(t)}
        <button class="btn cta" data-a="pdf">⬇ Muat turun invoice (PDF)</button>
        <div class="card pad" style="text-align:center;background:#FAF5FF"><b>QR akaun Koperasi untuk pembayaran</b><div style="margin:10px 0"><img alt="QR akaun Koperasi" src="${F.qrPay || KP_QR_DRIVE}" referrerpolicy="no-referrer" style="max-width:240px;width:100%;border-radius:12px;background:#fff"></div><button class="btn line" data-a="dlqr">⬇ Muat turun gambar QR</button></div>
        <div class="sp" style="gap:8px;flex-wrap:wrap"><button class="btn" data-a="teruskan">Teruskan pembayaran</button><button class="btn line" data-a="tunai">Bayar tunai di koperasi</button></div>
        <button class="btn line" data-a="baru">Buat tempahan lain</button></div>`;
  }
  function bayarView() {
    let h = HDR("Pembayaran", "Muat naik bukti pembayaran tempahan koperasi.", true);
    h += `<div class="card pad"><div class="step"><i>1</i><h2>Cari tempahan</h2></div>
      <label class="fld"><span class="lbl">No. Invoice (cth. T-K7M2QX9) atau No. Kad Pengenalan murid</span><input data-i="bq" data-enter="semak" autocomplete="off" value="${esc(F.bq)}" placeholder="T-00012 atau 110203040506"></label>
      <div style="margin-top:10px"><button class="btn cta" data-a="semak" ${F.bbusy ? "disabled" : ""}>${F.bbusy ? "Mencari…" : "Semak tempahan"}</button></div>
      ${F.berr ? `<div class="err" role="alert" style="margin-top:10px">${esc(F.berr)}</div>` : ""}</div>`;
    if (F.bres) F.bres.forEach((t) => {
      const m = F.bmsg[t.no] || {}, can = t.status === "Baharu" && t.bayar !== "Disahkan";
      h += `<div class="card pad" style="display:flex;flex-direction:column;gap:10px"><div class="sp"><div><b class="hd" style="font-size:18px">${esc(t.no)}</b><div class="muted small">${esc(t.tarikh.slice(0, 16))} · ${esc(t.murid)}${t.kelas ? " · " + esc(t.kelas) : ""}</div></div>
        <div style="text-align:right"><i class="pill ${t.bayar === "Disahkan" ? "p-ok" : t.bayar === "Belum" ? "p-gr" : "p-warn"}">${esc(t.bayar === "Belum" ? "Belum dibayar" : t.bayar)}</i><div class="muted small" style="margin-top:4px">Status: ${esc(t.status)}</div></div></div>
        <div>${t.items.map((i) => `<div class="irow" style="grid-template-columns:1fr auto;padding:8px 0"><span>${esc(i.nama)}${i.saiz ? ` <span class="muted small">(saiz ${esc(i.saiz)})</span>` : ""}<span class="muted small"> · ${i.qty} x ${i.harga.toFixed(2)}</span></span><b>${(i.qty * i.harga).toFixed(2)}</b></div>`).join("")}
        <div class="sp" style="padding-top:8px"><b>Jumlah</b><b class="hd" style="font-size:20px;color:var(--pri-d)">${rm(t.jumlah)}</b></div></div>
        ${can ? `<div class="up"><div class="step" style="margin-bottom:8px"><i>2</i><h2>Muat naik bukti pembayaran</h2></div><label class="drop"><input type="file" accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg" data-i="fail" data-no="${esc(t.no)}"><span>📎 Pilih fail bukti pembayaran<br><small class="muted">PDF, PNG atau JPEG · maksimum 4 MB</small></span></label>
          ${m.busy ? `<div class="note">Memuat naik…</div>` : ""}${m.err ? `<div class="err" role="alert">${esc(m.err)}</div>` : ""}${m.ok ? `<div class="ok-box card pad">✓ Bukti dimuat naik. Koperasi akan menyemak bayaran anda.</div>` : ""}</div>`
          : `<div class="note small">${t.bayar === "Disahkan" ? "Bayaran telah disahkan oleh koperasi." : "Tempahan ini sudah " + esc(t.status.toLowerCase()) + ", muat naik tidak diperlukan."}</div>`}
        ${t.bayar === "Menunggu semakan" && can ? `<div class="muted small">Bukti telah diterima. Anda boleh memuat naik semula jika perlu.</div>` : ""}</div>`;
    });
    return h;
  }

  function resitView() {
    let h = HDR("Resit", "Muat turun resit selepas urusan di koperasi selesai.", true);
    h += `<div class="card pad"><div class="step"><i>1</i><h2>Cari tempahan</h2></div>
      <label class="fld"><span class="lbl">No. Invoice (cth. T-K7M2QX9) atau No. Kad Pengenalan murid</span><input data-i="rq" data-enter="semakResit" autocomplete="off" value="${esc(F.rq)}" placeholder="T-00012 atau 110203040506"></label>
      <div style="margin-top:10px"><button class="btn cta" data-a="semakResit" ${F.rbusy ? "disabled" : ""}>${F.rbusy ? "Mencari…" : "Semak resit"}</button></div>
      ${F.rerr ? `<div class="err" role="alert" style="margin-top:10px">${esc(F.rerr)}</div>` : ""}</div>`;
    if (F.rres) F.rres.forEach((t) => {
      h += t.resit ? `<div class="card pad" style="display:flex;flex-direction:column;gap:10px"><div class="sp"><div><b class="hd" style="font-size:18px">Resit ${esc(t.resit.no)}</b><div class="muted small">Invoice ${esc(t.no)} · ${esc(t.resit.tarikh.slice(0, 16))} · ${esc(t.murid)}</div></div><i class="pill p-ok">Selesai</i></div>
        <div>${t.resit.items.map((i) => `<div class="irow" style="grid-template-columns:1fr auto;padding:8px 0"><span>${esc(i.nama)}<span class="muted small"> · ${i.qty} x ${i.harga.toFixed(2)}</span></span><b>${i.jumlah.toFixed(2)}</b></div>`).join("")}<div class="sp" style="padding-top:8px"><b>Jumlah</b><b class="hd" style="font-size:20px;color:var(--pri-d)">${rm(t.resit.jumlah)}</b></div></div>
        <button class="btn cta" data-a="resitpdf" data-k="${esc(t.no)}">⬇ Muat turun resit (PDF)</button></div>`
        : `<div class="card pad"><div class="sp"><b class="hd" style="font-size:18px">${esc(t.no)}</b><i class="pill ${t.status === "Batal" ? "p-bad" : "p-warn"}">${esc(t.status === "Batal" ? "Dibatalkan" : "Belum selesai")}</i></div><div class="note" style="margin-top:8px">${t.status === "Batal" ? "Tempahan ini telah dibatalkan, tiada resit." : "<b>Resit belum wujud.</b> Resit dikeluarkan selepas anda menyelesaikan urusan pembayaran dan pengambilan barang di koperasi."}</div></div>`;
    });
    return h;
  }
  function buatResitPdf(r, t) {
    if (!window.jspdf) { alert("Pustaka PDF tidak dapat dimuatkan."); return null; }
    const d = new window.jspdf.jsPDF({ unit: "mm", format: "a5" }), W = 148, M = 12; let y = 16;
    d.setFont("helvetica", "bold"); d.setFontSize(14); d.text("RESIT RASMI", W / 2, y, { align: "center" });
    y += 6; d.setFontSize(10); d.text(A(r.nama || F.resit.nama || "Koperasi SMA (JAIM) Al-Asyraf"), W / 2, y, { align: "center" });
    y += 5; d.setFont("helvetica", "normal"); d.text("SM Arab (JAIM) Al-Asyraf", W / 2, y, { align: "center" });
    y += 8; d.setFontSize(10);
    [["No. Resit", r.no], ["Tarikh", r.tarikh], ["Rujukan tempahan", t.no], ["Murid", t.murid + (t.kelas ? " (" + t.kelas + ")" : "")], ["Juruwang", r.juruwang]].forEach(([k, v]) => { d.setFont("helvetica", "bold"); d.text(k, M, y); d.setFont("helvetica", "normal"); d.text(A(v), M + 38, y); y += 5.5; });
    y += 2; d.setDrawColor(150); d.line(M, y, W - M, y); y += 5; d.setFont("helvetica", "bold"); d.text("Barang", M, y); d.text("Qty", 90, y, { align: "right" }); d.text("Harga", 110, y, { align: "right" }); d.text("Jumlah", W - M, y, { align: "right" }); y += 5; d.setFont("helvetica", "normal");
    r.items.forEach((i) => { if (y > 170) { d.addPage(); y = 16; } const ln = d.splitTextToSize(A(i.nama), 66); d.text(ln, M, y); d.text(String(i.qty), 90, y, { align: "right" }); d.text(i.harga.toFixed(2), 110, y, { align: "right" }); d.text(i.jumlah.toFixed(2), W - M, y, { align: "right" }); y += 5 * ln.length; });
    y += 1; d.line(M, y, W - M, y); y += 6; d.setFont("helvetica", "bold"); d.setFontSize(12); d.text("JUMLAH", M, y); d.text("RM " + r.jumlah.toFixed(2), W - M, y, { align: "right" });
    d.setFontSize(10); d.setFont("helvetica", "normal"); y += 6;
    if (r.qr > 0 && r.kaedah !== "QR DuitNow") { d.text("Bayaran QR (bukti)", M, y); d.text("RM " + r.qr.toFixed(2), W - M, y, { align: "right" }); y += 5; d.text("Tunai diterima", M, y); d.text("RM " + r.tunai.toFixed(2), W - M, y, { align: "right" }); y += 5; }
    else { d.text("Kaedah: " + A(r.kaedah), M, y); y += 5; }
    if (r.baki > 0) { d.text("Baki dipulangkan", M, y); d.text("RM " + r.baki.toFixed(2), W - M, y, { align: "right" }); y += 5; }
    d.setFontSize(9); d.setTextColor(120); d.text("Terima kasih. Pemulangan wang tidak dibenarkan.", W / 2, 200, { align: "center" });
    return d;
  }

  /* ---------- invoice PDF ---------- */
  function loadImg(src) { return new Promise((res) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => { try { const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext("2d").drawImage(im, 0, 0); res(c.toDataURL("image/png")); } catch (e) { res(""); } }; im.onerror = () => res(""); im.src = src; }); }
  async function preloadQr() { F.qrPay = (await loadImg(KP_QR_LOCAL)) || (await loadImg(KP_QR_DRIVE)); }
  const A = (x) => String(x == null ? "" : x).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "?");
  function orderQr(no) { try { const q = qrcode(0, "M"); q.addData(no); q.make(); return q.createDataURL(8, 2); } catch (e) { return ""; } }
  function buatPdf(t) {
    if (!window.jspdf) { alert("Pustaka PDF tidak dapat dimuatkan. Gunakan butang Cetak."); return null; }
    const d = new window.jspdf.jsPDF({ unit: "mm", format: "a4" }), W = 210, M = 15; let y = 18;
    d.setFillColor(109, 40, 217); d.rect(0, 0, W, 30, "F"); d.setTextColor(255); d.setFont("helvetica", "bold"); d.setFontSize(17); d.text("INVOIS TEMPAHAN", M, 14);
    d.setFontSize(10); d.setFont("helvetica", "normal"); d.text(A(F.resit.nama || "Koperasi SMA (JAIM) Al-Asyraf"), M, 21); d.text("SM Arab (JAIM) Al-Asyraf", M, 26);
    d.setFont("helvetica", "bold"); d.setFontSize(15); d.text(A(t.no), W - M, 14, { align: "right" }); d.setFont("helvetica", "normal"); d.setFontSize(10); d.text(A(t.tarikh), W - M, 21, { align: "right" });
    d.setTextColor(30); y = 42; d.setFontSize(11); d.setFont("helvetica", "bold"); d.text("Murid", M, y); d.setFont("helvetica", "normal"); d.text(A(t.murid) + (t.kelas ? " (" + A(t.kelas) + ")" : ""), M + 28, y);
    y += 6; d.setFont("helvetica", "bold"); d.text("Set", M, y); d.setFont("helvetica", "normal"); d.text("Tahun " + (t.tahun || "") + " - Tingkatan " + t.ting + " - " + A(t.grp), M + 28, y);
    y += 6; d.setFont("helvetica", "bold"); d.text("Status", M, y); d.setFont("helvetica", "normal"); d.text("Belum dibayar", M + 28, y);
    y += 10; d.setFillColor(237, 233, 254); d.rect(M, y - 5, W - 2 * M, 8, "F"); d.setFont("helvetica", "bold"); d.setFontSize(10);
    d.text("Barang", M + 2, y); d.text("Kuantiti", 125, y, { align: "right" }); d.text("Harga (RM)", 155, y, { align: "right" }); d.text("Jumlah (RM)", W - M - 2, y, { align: "right" });
    d.setFont("helvetica", "normal"); y += 8;
    t.items.forEach((i) => { if (y > 190) { d.addPage(); y = 20; } const ln = d.splitTextToSize(A(i.nama), 90); d.text(ln, M + 2, y); d.text(String(i.qty), 125, y, { align: "right" }); d.text(i.harga.toFixed(2), 155, y, { align: "right" }); d.text((i.qty * i.harga).toFixed(2), W - M - 2, y, { align: "right" }); y += 6 * ln.length; d.setDrawColor(230); d.line(M, y - 3.5, W - M, y - 3.5); });
    y += 3; d.setFont("helvetica", "bold"); d.setFontSize(13); d.text("JUMLAH PERLU DIBAYAR", M + 2, y); d.text("RM " + t.jumlah.toFixed(2), W - M - 2, y, { align: "right" });
    y += 12; if (y > 190) { d.addPage(); y = 20; }
    d.setFontSize(11); d.text("Cara pembayaran", M, y); d.setFont("helvetica", "normal"); d.setFontSize(10);
    d.text(["1. Imbas QR akaun Koperasi (kiri) menggunakan aplikasi perbankan dan bayar jumlah di atas.", "2. Simpan bukti pembayaran, kemudian muat naik di laman Pembayaran guna No. Invois / No. KP murid.", "3. Atau bayar tunai di kaunter koperasi dengan menunjukkan QR tempahan (kanan)."], M, y + 6, { maxWidth: W - 2 * M });
    y += 24;
    d.setFont("helvetica", "bold"); d.text("QR akaun koperasi", M + 25, y, { align: "center" }); d.text("QR tempahan " + A(t.no), W - M - 25, y, { align: "center" });
    if (F.qrPay) { try { d.addImage(F.qrPay, "PNG", M, y + 3, 50, 50); } catch (e) { d.setFont("helvetica", "normal"); d.text("(QR tidak dapat dipaparkan)", M, y + 20); } } else { d.setFont("helvetica", "normal"); d.text(["QR akaun belum tersedia.", "Sila bayar tunai di koperasi."], M, y + 20); }
    const oq = orderQr(t.no); if (oq) d.addImage(oq, "PNG", W - M - 50, y + 3, 50, 50);
    d.setFont("helvetica", "normal"); d.setFontSize(8); d.setTextColor(120); d.text("Invois dijana secara automatik. Simpan untuk rujukan.", W / 2, 285, { align: "center" });
    return d;
  }

  /* ---------- muat naik bukti ---------- */
  function readB64(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(blob); }); }
  async function mampat(file) { // imej besar dikecilkan supaya muat naik pantas
    if (!/^image\//.test(file.type) || file.size < 700 * 1024) return file;
    const url = URL.createObjectURL(file);
    try {
      const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const k = Math.min(1, 1800 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas"); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
      const b = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.85)); return b && b.size < file.size ? b : file;
    } catch (e) { return file; } finally { URL.revokeObjectURL(url); }
  }
  async function muatNaik(no, file) {
    const st = (F.bmsg[no] = { busy: true });
    draw();
    try {
      if (!/^(application\/pdf|image\/png|image\/jpeg)$/.test(file.type) && !/\.(pdf|png|jpe?g)$/i.test(file.name)) throw new Error("Format fail mesti PDF, PNG atau JPEG.");
      const f = await mampat(file);
      if (f.size > 4 * 1024 * 1024) throw new Error("Saiz fail mesti kurang daripada 4 MB.");
      const res = await fetch(KP_API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "muatNaikBukti", no, q: F.bq, nama: file.name, mime: f.type || file.type, data: await readB64(f) }) });
      const j = await res.json(); if (!j.success) throw new Error(j.message || "Muat naik gagal.");
      F.bmsg[no] = { ok: true }; const t = (F.bres || []).find((x) => x.no === no); if (t) t.bayar = j.bayar || "Menunggu semakan";
    } catch (e) { F.bmsg[no] = { err: e.message || "Muat naik gagal. Cuba lagi." }; }
    draw();
  }

  /* ---------- tindakan ---------- */
  const ACT = {
    muat: () => { F.err = ""; load(); },
    home: () => { F.view = "home"; draw(); window.scrollTo(0, 0); },
    go: (t) => { F.view = t.dataset.k; if (F.view === "tempah" && !F.done) { F.step = 1; F.err = ""; syncTing(); } F.cash = false; F.rres = null; F.rerr = ""; draw(); window.scrollTo(0, 0); },
    pdf: () => { const d = buatPdf(F.done); if (d) d.save("Invois-" + F.done.no + ".pdf"); },
    dlqr: () => { if (F.qrPay) { const a = document.createElement("a"); a.href = F.qrPay; a.download = "QR-Bayaran-Koperasi.png"; document.body.appendChild(a); a.click(); a.remove(); } else window.open(KP_QR_DRIVE, "_blank", "noopener"); },
    semakResit: async () => {
      const q = (F.rq || "").trim(); F.rerr = ""; F.rres = null;
      if (!q) { F.rerr = "Sila masukkan No. Invoice atau No. Kad Pengenalan murid."; draw(); return; }
      F.rbusy = true; draw();
      try { const j = await (await fetch(KP_API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "cariTempahan", q }) })).json(); if (!j.success) F.rerr = j.message || "Tempahan tidak dijumpai."; else F.rres = j.hasil; }
      catch (e) { F.rerr = "Tiada sambungan ke pelayan. Cuba lagi."; }
      F.rbusy = false; draw();
    },
    resitpdf: (t) => { const x = (F.rres || []).find((y) => y.no === t.dataset.k); if (!x || !x.resit) return; const d = buatResitPdf(x.resit, x); if (d) d.save("Resit-" + x.resit.no + ".pdf"); },
    tunai: () => { F.cash = true; draw(); window.scrollTo(0, 0); },
    teruskan: () => { F.view = "bayar"; F.bq = F.done.no; F.bres = null; F.berr = ""; F.bmsg = {}; draw(); ACT.semak(); },
    semak: async () => {
      const q = (F.bq || "").trim(); F.berr = ""; F.bres = null;
      if (!q) { F.berr = "Sila masukkan No. Invoice atau No. Kad Pengenalan murid."; draw(); return; }
      F.bbusy = true; draw();
      try { const j = await (await fetch(KP_API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "cariTempahan", q }) })).json(); if (!j.success) F.berr = j.message || "Tempahan tidak dijumpai."; else F.bres = j.hasil; }
      catch (e) { F.berr = "Tiada sambungan ke pelayan. Cuba lagi."; }
      F.bbusy = false; draw();
    },
    mode: (t) => { F.mode = t.dataset.k; reset(); syncTing(); draw(); },
    grp: (t) => { F.grp = t.dataset.k; reset(); draw(); },
    next: () => {
      F.err = "";
      if (F.step === 1) { const mi = missing(); if (mi) { F.err = mi; draw(); return; } F.step = 2; }
      else if (F.step === 2) {
        const L = rows().filter(isOn); if (!L.length) { F.err = "Tiada barang dipilih."; draw(); return; }
        const tanpa = L.filter((r) => r.sized && !pick(r)); if (tanpa.length) { F.err = "Sila pilih saiz bagi: " + tanpa.map((r) => r.nama).join(", ") + "."; draw(); return; }
        F.step = 3;
      }
      draw(); window.scrollTo(0, 0);
    },
    back: () => { F.err = ""; if (F.step > 1) F.step--; else F.view = "home"; draw(); window.scrollTo(0, 0); },
    tukar: () => { F.tukar = true; draw(); },
    ubah: () => { F.err = ""; F.step = 1; draw(); window.scrollTo(0, 0); },
    edit: () => { F.err = ""; F.step = 2; draw(); window.scrollTo(0, 0); },
    jt: (t) => { F.jtManual = t.dataset.k; reset(); draw(); },
    tog: (t) => { const k = t.dataset.k, r = rows().find((x) => x.key === k); if (r) F.sel[k] = !isOn(r); draw(); },
    "q+": (t) => { const k = t.dataset.k, r = rows().find((x) => x.key === k); if (r) F.qty[k] = Math.min(30, qtyOf(r) + 1); draw(); },
    "q-": (t) => { const k = t.dataset.k, r = rows().find((x) => x.key === k); if (r) { if (!r.w && qtyOf(r) <= 1) F.sel[k] = false; else F.qty[k] = Math.max(r.min, qtyOf(r) - 1); } draw(); },
    baru: () => { F.done = null; F.cash = false; F.view = "tempah"; F.step = 1; F.mi = ""; F.kelas = ""; F.baru = { nama: "", kp: "" }; reset(); syncTing(); draw(); window.scrollTo(0, 0); },
    cetak: () => { const p = $("#print"); p.innerHTML = billHtml(F.done); p.hidden = false; setTimeout(() => { window.print(); p.hidden = true; }, 60); },
    hantar: async () => {
      F.err = "";
      let murid;
      if (F.mode === "ada") {
        const m = F.murid.find((x) => (x.kp || x.nama) + "|" + x.kelas === F.mi);
        if (!m) { F.err = "Sila pilih kelas dan nama murid."; draw(); window.scrollTo(0, 0); return; }
        murid = { nama: m.nama, kelas: m.kelas, kp: m.kp, jantina: jantina(), baru: false };
      } else {
        const kp = F.baru.kp.replace(/\D/g, "");
        if (F.baru.nama.trim().length < 3) { F.err = "Sila taip nama penuh murid."; draw(); window.scrollTo(0, 0); return; }
        if (kp.length !== 12) { F.err = "No. Kad Pengenalan mesti 12 digit."; draw(); window.scrollTo(0, 0); return; }
        murid = { nama: F.baru.nama.trim(), kp, kelas: "", jantina: jantina(), baru: true };
      }
      if (!jantina()) { F.err = "Sila pilih jantina murid."; draw(); window.scrollTo(0, 0); return; }
      const L = rows().filter(isOn);
      if (!L.length) { F.err = "Tiada barang dipilih."; draw(); return; }
      const tanpa = L.filter((r) => r.sized && !pick(r));
      if (tanpa.length) { F.err = "Sila pilih saiz bagi: " + tanpa.map((r) => r.nama).join(", ") + "."; draw(); return; }
      F.busy = true; draw();
      try {
        const res = await fetch(KP_API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "hantarTempahan", murid, kumpulan: F.grp, tingkatan: F.ting, tingkatanMurid: F.tingMurid, items: L.map((r) => ({ kod: pick(r).kod, qty: qtyOf(r), saiz: F.size[r.key] || "" })), hp: ($("#hp") || {}).value || "" }) });
        const j = await res.json();
        F.busy = false;
        if (!j.success) { F.err = j.message || "Tempahan gagal. Cuba lagi."; draw(); window.scrollTo(0, document.body.scrollHeight); return; }
        F.done = { no: j.no, tarikh: j.tarikh, jumlah: j.jumlah, murid: murid.nama.toUpperCase(), kelas: murid.baru ? "Baharu T" + F.tingMurid : murid.kelas, ting: F.ting, tahun: sesi().tahun, grp: F.grp, items: L.map((r) => ({ nama: namaItem(r, F.size[r.key] || ""), qty: qtyOf(r), harga: pick(r).jual })) };
        draw(); window.scrollTo(0, 0);
      } catch (e) { F.busy = false; F.err = "Tiada sambungan ke pelayan. Cuba lagi."; draw(); }
    }
  };
  const INP = {
    kelas: (t) => { F.kelas = t.value; F.mi = ""; syncTing(); draw(); },
    murid: (t) => { F.tukar = false; F.mi = t.value; const m = F.murid.find((x) => (x.kp || x.nama) + "|" + x.kelas === F.mi); if (m) { F.grp = m.grp; F.tingMurid = kelasT(m.kelas) <= 6 ? kelasT(m.kelas) : 1; reset(); } syncTing(); draw(); },
    bnama: (t) => { F.baru.nama = t.value; },
    bkp: (t) => { const a = jantina(); F.baru.kp = t.value; if (jantina() !== a) { reset(); draw(); const e = $("[data-i=bkp]"); if (e) { e.focus(); e.setSelectionRange(e.value.length, e.value.length); } } },
    tset: (t) => { F.ting = +t.value; reset(); draw(); },
    tmset: (t) => { F.tingMurid = +t.value; F.ting = F.tingMurid; reset(); draw(); },
    size: (t) => { F.size[t.dataset.k] = t.value; draw(); },
    bq: (t) => { F.bq = t.value; },
    rq: (t) => { F.rq = t.value; }
  };
  document.addEventListener("click", (e) => { const t = e.target.closest("[data-a]"); if (t && ACT[t.dataset.a]) ACT[t.dataset.a](t); });
  document.addEventListener("input", (e) => { const t = e.target.closest("[data-i]"); if (t && INP[t.dataset.i] && (t.tagName === "INPUT")) INP[t.dataset.i](t); });
  document.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.getAttribute && e.target.getAttribute("role") === "button" && ACT[e.target.dataset.a]) { e.preventDefault(); ACT[e.target.dataset.a](e.target); return; } if (e.key === "Enter") { const t = e.target.closest("[data-enter]"); if (t && ACT[t.dataset.enter]) { e.preventDefault(); ACT[t.dataset.enter](t); } } });
  document.addEventListener("change", (e) => { const f = e.target.closest('input[type=file][data-i="fail"]'); if (f) { if (f.files[0]) muatNaik(f.dataset.no, f.files[0]); return; }
     const t = e.target.closest("[data-i]"); if (t && INP[t.dataset.i] && t.tagName === "SELECT") INP[t.dataset.i](t); });
  preloadQr();
  load();
})();
