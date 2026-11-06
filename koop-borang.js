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
  const kelasT = (k) => { const m = String(k || "").match(/\d+/); return m ? parseInt(m[0], 10) : 99; };

  /* ---------- keadaan ---------- */
  const F = { murid: [], kelasList: [], barang: [], kat: [], resit: {}, mode: "ada", kelas: "", mi: "", grp: "Luar asrama", ting: 1, tingMurid: 1,
    baru: { nama: "", kp: "" }, off: {}, qty: {}, busy: false, err: "", done: null, ok: false,
    view: "home", qrPay: "", cash: false, bq: "", bres: null, bbusy: false, berr: "", bmsg: {} };

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
  const HERO = (t, p, back) => `<div class="hero"><span class="logo logoimg"><img src="${KP_LOGO}" alt="Logo sekolah" referrerpolicy="no-referrer" onerror="this.parentNode.textContent='K'"></span><div style="flex:1"><h1>${t}</h1><p>${p}</p></div>${back ? `<button class="btn line sm" data-a="home" style="background:#fff">← Menu</button>` : ""}</div>`;
  function draw() {
    const A = $("#app");
    if (F.view === "home") { A.innerHTML = homeView(); return; }
    if (F.view === "bayar") { A.innerHTML = bayarView(); return; }
    if (F.done) { A.innerHTML = billView(); return; }
    let h = `<div class="hero"><span class="logo logoimg"><img src="${KP_LOGO}" alt="Logo sekolah" referrerpolicy="no-referrer" onerror="this.parentNode.textContent='K'"></span><div><h1>Tempahan Barang Koperasi</h1><p>SM Arab (JAIM) Al-Asyraf · Pilih set mengikut tingkatan, semak, kemudian hantar.</p></div><button class="btn line sm" data-a="home" style="background:#fff">← Menu</button></div>`;
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
  function homeView() {
    return HERO("Koperasi Sekolah", "SM Arab (JAIM) Al-Asyraf · Sila pilih perkhidmatan.", false) + `<div class="home">
      <button class="hcard" data-a="go" data-k="tempah"><span class="hi" style="background:var(--grad)">🛍️</span><b>Tempahan Barang</b><span class="muted">Pilih set mengikut tingkatan, hantar tempahan dan muat turun invoice (PDF).</span><i class="hgo">Mula tempah →</i></button>
      <button class="hcard" data-a="go" data-k="bayar"><span class="hi" style="background:var(--grad-cta)">💳</span><b>Pembayaran</b><span class="muted">Muat naik bukti pembayaran menggunakan No. Invoice atau No. Kad Pengenalan murid.</span><i class="hgo">Muat naik bukti →</i></button></div>`;
  }
  function billView() {
    const t = F.done;
    return HERO("Tempahan telah dibuat", "Tempahan anda telah diterima oleh koperasi.", false) + `<div class="card pad ok-box"><b>✓ Tempahan ${esc(t.no)} telah dibuat.</b><div class="small" style="margin-top:4px">Anda boleh <b>terus membuat pembayaran</b> (pindahan / QR dan muat naik bukti) atau <b>bayar tunai di koperasi</b>. Muat turun invoice di bawah untuk imbasan QR akaun koperasi.</div></div>
      ${F.cash ? `<div class="note">Sila bawa invoice (atau tunjuk QR) ke kaunter koperasi untuk bayaran tunai dan pengambilan barang. Terima kasih.</div>` : ""}
      <div class="card pad" style="display:flex;flex-direction:column;gap:12px">${billHtml(t)}
        <button class="btn cta" data-a="pdf">⬇ Muat turun invoice (PDF)</button>
        <div class="sp" style="gap:8px;flex-wrap:wrap"><button class="btn" data-a="teruskan">Teruskan pembayaran</button><button class="btn line" data-a="tunai">Bayar tunai di koperasi</button></div>
        <button class="btn line" data-a="baru">Buat tempahan lain</button></div>`;
  }
  function bayarView() {
    let h = HERO("Pembayaran", "Muat naik bukti pembayaran tempahan koperasi.", true);
    h += `<div class="card pad"><div class="step"><i>1</i><h2>Cari tempahan</h2></div>
      <label class="fld"><span class="lbl">No. Invoice (cth. T-00012) atau No. Kad Pengenalan murid</span><input data-i="bq" data-enter="semak" autocomplete="off" value="${esc(F.bq)}" placeholder="T-00012 atau 110203040506"></label>
      <div style="margin-top:10px"><button class="btn cta" data-a="semak" ${F.bbusy ? "disabled" : ""}>${F.bbusy ? "Mencari…" : "Semak tempahan"}</button></div>
      ${F.berr ? `<div class="err" role="alert" style="margin-top:10px">${esc(F.berr)}</div>` : ""}</div>`;
    if (F.bres) F.bres.forEach((t) => {
      const m = F.bmsg[t.no] || {}, can = t.status === "Baharu" && t.bayar !== "Disahkan";
      h += `<div class="card pad" style="display:flex;flex-direction:column;gap:10px"><div class="sp"><div><b class="hd" style="font-size:18px">${esc(t.no)}</b><div class="muted small">${esc(t.tarikh.slice(0, 16))} · ${esc(t.murid)}${t.kelas ? " · " + esc(t.kelas) : ""}</div></div>
        <div style="text-align:right"><i class="pill ${t.bayar === "Disahkan" ? "p-ok" : t.bayar === "Belum" ? "p-gr" : "p-warn"}">${esc(t.bayar === "Belum" ? "Belum dibayar" : t.bayar)}</i><div class="muted small" style="margin-top:4px">Status: ${esc(t.status)}</div></div></div>
        <div>${t.items.map((i) => `<div class="irow" style="grid-template-columns:1fr auto;padding:8px 0"><span>${esc(i.nama)}<span class="muted small"> · ${i.qty} x ${i.harga.toFixed(2)}</span></span><b>${(i.qty * i.harga).toFixed(2)}</b></div>`).join("")}
        <div class="sp" style="padding-top:8px"><b>Jumlah</b><b class="hd" style="font-size:20px;color:var(--pri-d)">${rm(t.jumlah)}</b></div></div>
        ${can ? `<div class="up"><div class="step" style="margin-bottom:8px"><i>2</i><h2>Muat naik bukti pembayaran</h2></div><label class="drop"><input type="file" accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg" data-i="fail" data-no="${esc(t.no)}"><span>📎 Pilih fail bukti pembayaran<br><small class="muted">PDF, PNG atau JPEG · maksimum 4 MB</small></span></label>
          ${m.busy ? `<div class="note">Memuat naik…</div>` : ""}${m.err ? `<div class="err" role="alert">${esc(m.err)}</div>` : ""}${m.ok ? `<div class="ok-box card pad">✓ Bukti dimuat naik. Koperasi akan menyemak bayaran anda.</div>` : ""}</div>`
          : `<div class="note small">${t.bayar === "Disahkan" ? "Bayaran telah disahkan oleh koperasi." : "Tempahan ini sudah " + esc(t.status.toLowerCase()) + ", muat naik tidak diperlukan."}</div>`}
        ${t.bayar === "Menunggu semakan" && can ? `<div class="muted small">Bukti telah diterima. Anda boleh memuat naik semula jika perlu.</div>` : ""}</div>`;
    });
    return h;
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
    y += 6; d.setFont("helvetica", "bold"); d.text("Set", M, y); d.setFont("helvetica", "normal"); d.text("Tingkatan " + t.ting + " - " + A(t.grp), M + 28, y);
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
    go: (t) => { F.view = t.dataset.k; F.cash = false; draw(); window.scrollTo(0, 0); },
    pdf: () => { const d = buatPdf(F.done); if (d) d.save("Invois-" + F.done.no + ".pdf"); },
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
    mode: (t) => { F.mode = t.dataset.k; reset(); draw(); },
    grp: (t) => { F.grp = t.dataset.k; reset(); draw(); },
    ting: (t) => { F.ting = +t.dataset.k; reset(); draw(); },
    tm: (t) => { F.tingMurid = +t.dataset.k; F.ting = F.tingMurid; reset(); draw(); },
    tog: (t) => { const k = t.dataset.k; if (F.off[k]) delete F.off[k]; else F.off[k] = 1; draw(); },
    "q+": (t) => { const k = t.dataset.k; F.qty[k] = Math.min(10, (F.qty[k] || 1) + 1); draw(); },
    "q-": (t) => { const k = t.dataset.k; F.qty[k] = Math.max(1, (F.qty[k] || 1) - 1); draw(); },
    baru: () => { F.done = null; F.cash = false; F.view = "tempah"; F.mi = ""; F.kelas = ""; F.baru = { nama: "", kp: "" }; reset(); draw(); window.scrollTo(0, 0); },
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
    bkp: (t) => { F.baru.kp = t.value; },
    bq: (t) => { F.bq = t.value; }
  };
  document.addEventListener("click", (e) => { const t = e.target.closest("[data-a]"); if (t && ACT[t.dataset.a]) ACT[t.dataset.a](t); });
  document.addEventListener("input", (e) => { const t = e.target.closest("[data-i]"); if (t && INP[t.dataset.i] && (t.tagName === "INPUT")) INP[t.dataset.i](t); });
  document.addEventListener("keydown", (e) => { if (e.key === "Enter") { const t = e.target.closest("[data-enter]"); if (t && ACT[t.dataset.enter]) { e.preventDefault(); ACT[t.dataset.enter](t); } } });
  document.addEventListener("change", (e) => { const f = e.target.closest('input[type=file][data-i="fail"]'); if (f) { if (f.files[0]) muatNaik(f.dataset.no, f.files[0]); return; }
     const t = e.target.closest("[data-i]"); if (t && INP[t.dataset.i] && t.tagName === "SELECT") INP[t.dataset.i](t); });
  preloadQr();
  load();
})();
