/* Koperasi SMA (JAIM) Al-Asyraf — halaman: Utama, Jualan, Sejarah, Barangan, Inventori, Stok, Laporan, Tetapan */
(function () {
  const { esc, rm, rm0, pill, stokPill } = KP, $ = KP.$;
  const D = { barang: [], kat: [] }; // cache barang
  const val = (id) => { const e = document.getElementById(id); return e ? e.value : ""; };
  const kats = () => KP.S.tetapan.kategori || [];
  const chips = (list, cur, act) => `<div class="chips">${list.map((k) => `<button class="ch ${k === cur ? "on" : ""}" data-a="${act}" data-k="${esc(k)}">${esc(k)}</button>`).join("")}</div>`;
  const katOpts = (cur) => kats().concat(cur && !kats().includes(cur) ? [cur] : []).map((k) => `<option ${k === cur ? "selected" : ""}>${esc(k)}</option>`).join("");
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
    return `<div class="resit"><div style="text-align:center"><b>${esc(nm)}</b><br>${esc(r.no)}<br>${esc(r.tarikh)}</div><hr>
      <div>Juruwang: ${esc(r.juruwang)}</div>${r.murid ? `<div>Murid: ${esc(r.murid)}${r.kelasMurid ? " (" + esc(r.kelasMurid) + ")" : ""}</div>` : ""}<div>Pembeli: ${esc(r.kumpulan)} · T${r.tingkatan}</div><hr>
      ${(r.items || []).map((i) => `<div class="l"><span>${esc(i.nama)}<br>&nbsp;${i.qty} x ${Number(i.harga).toFixed(2)}</span><span>${Number(i.jumlah != null ? i.jumlah : i.harga * i.qty).toFixed(2)}</span></div>`).join("")}<hr>
      <div class="l"><b>JUMLAH</b><b>${rm(r.jumlah)}</b></div><div class="l"><span>${esc(r.kaedah)}</span><span>${rm(r.tunai)}</span></div><div class="l"><span>Baki</span><span>${rm(r.baki)}</span></div>
      ${r.status === "Batal" ? `<hr><div style="text-align:center"><b>*** DIBATALKAN ***</b></div>` : ""}<hr><div style="text-align:center">Terima kasih</div></div>`;
  }
  KP.printResit = (r) => { const p = $("#print"); p.innerHTML = resitHtml(r); p.hidden = false; setTimeout(() => { window.print(); p.hidden = true; }, 50); };

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

  /* ================= JUALAN (POS) ================= */
  const J = { grp: "Luar asrama", ting: 1, kat: "Semua", q: "", cart: {}, kaedah: "Tunai", tunai: "", murid: null, mlist: null };
  const jVis = () => D.barang.filter((b) => b.set && (J.grp === "Asrama" ? b.as : b.lr) && b.t[J.ting - 1] && (J.kat === "Semua" || b.kategori === J.kat) && (!J.q || b.nama.toLowerCase().includes(J.q.toLowerCase())));
  const jAllowed = () => new Set(D.barang.filter((b) => b.set && (J.grp === "Asrama" ? b.as : b.lr) && b.t[J.ting - 1]).map((b) => b.kod));
  const jTotal = () => D.barang.reduce((s, b) => s + (J.cart[b.kod] ? b.jual * J.cart[b.kod] : 0), 0);
  function jPrune() { const ok = jAllowed(); Object.keys(J.cart).forEach((k) => { if (!ok.has(k)) delete J.cart[k]; }); }
  function jBayarState() {
    const tot = jTotal(), tn = parseFloat(J.tunai) || 0, n = Object.keys(J.cart).length;
    const el = $("#j-baki"), bt = $("#j-bayar");
    if (el) el.textContent = J.kaedah === "Tunai" ? rm(Math.max(0, tn - tot)) : rm(0);
    if (bt) bt.disabled = !n || (J.kaedah === "Tunai" && tn + 0.0001 < tot);
  }
  KP.pages.jualan = {
    async load() { await loadBarang(true); if (!J.mlist) KP.call("senaraiMurid").then((j) => { if (j) J.mlist = j.murid; }); },
    view() {
      const vis = jVis(), tot = jTotal(), lines = D.barang.filter((b) => J.cart[b.kod]);
      return `<div class="pos"><div class="prods" style="display:flex;flex-direction:column;gap:12px">
        <div class="card pad" style="display:flex;flex-direction:column;gap:10px">
          <div style="position:relative"><label class="fld"><span class="lbl">Cari murid (pilihan) — kumpulan &amp; tingkatan diisi automatik</span><input id="j-mq" data-i="mq" autocomplete="off" placeholder="Taip nama atau No. KP murid" value="${esc(J.murid ? J.murid.nama + " (" + J.murid.kelas + ")" : "")}"></label><div class="dd" id="j-dd" hidden></div></div>
          <div class="sp"><div class="chips">${["Luar asrama", "Asrama"].map((k) => `<button class="ch ${k === J.grp ? "on" : ""}" data-a="j-grp" data-k="${k}">${k}</button>`).join("")}</div>
          <div class="chips">${[1, 2, 3, 4, 5, 6].map((n) => `<button class="ch ${n === J.ting ? "on" : ""}" data-a="j-ting" data-k="${n}">T${n}</button>`).join("")}</div></div>
          <div class="sp">${chips(["Semua"].concat(D.kat), J.kat, "j-kat")}<input data-i="jq" placeholder="Cari barang" value="${esc(J.q)}" style="max-width:200px"></div></div>
        <div class="tiles">${vis.map((b) => `<button class="tile" data-a="j-add" data-k="${esc(b.kod)}" ${b.stok <= 0 ? "disabled" : ""}><b>${esc(b.nama)}</b><span class="pr">${rm(b.jual)}</span><span>${stokPill(b)}</span></button>`).join("") || `<div class="empty card" style="grid-column:1/-1">Tiada barang untuk pilihan ini. Barang mesti ditanda SET di Inventori &amp; Akses.</div>`}</div></div>
        <div class="card pad cart" style="display:flex;flex-direction:column;gap:10px"><div class="sp"><h2>Troli</h2><span class="muted small">${J.grp} · T${J.ting}</span></div>
          ${lines.map((b) => `<div class="sp" style="border-bottom:1px solid var(--ln2);padding-bottom:6px"><div style="min-width:0"><b style="font-size:13.5px">${esc(b.nama)}</b><div class="muted small">${rm(b.jual)} × ${J.cart[b.kod]} = <b>${rm(b.jual * J.cart[b.kod])}</b></div></div><div class="qty"><button data-a="j-min" data-k="${esc(b.kod)}" aria-label="Kurang">−</button><b class="num">${J.cart[b.kod]}</b><button data-a="j-add" data-k="${esc(b.kod)}" aria-label="Tambah">+</button></div></div>`).join("") || `<div class="empty">Troli kosong. Pilih barang.</div>`}
          <div class="sp"><span class="lbl">Jumlah</span><b class="hd" style="font-size:24px;color:var(--pri-d)">${rm(tot)}</b></div>
          <div class="chips">${["Tunai", "QR DuitNow"].map((k) => `<button class="ch ${k === J.kaedah ? "on" : ""}" data-a="j-kae" data-k="${k}">${k}</button>`).join("")}</div>
          ${J.kaedah === "Tunai" ? `<label class="fld"><span class="lbl">Wang diterima (RM)</span><input data-i="tunai" inputmode="decimal" value="${esc(J.tunai)}"></label>
          <div class="chips"><button class="ch" data-a="j-tn" data-k="${tot}">Tepat</button>${[5, 10, 20, 50, 100].map((n) => `<button class="ch" data-a="j-tn" data-k="${n}">${n}</button>`).join("")}</div><div class="sp"><span class="muted">Baki</span><b class="num" id="j-baki"></b></div>` : `<div class="note small">Imbas QR DuitNow koperasi, sahkan bayaran diterima sebelum teruskan.</div>`}
          <button class="btn cta block" id="j-bayar" data-a="j-bayar" style="font-size:15px">Bayar &amp; cetak resit</button>
          <button class="btn line block" data-a="j-kosong" ${lines.length ? "" : "disabled"}>Kosongkan troli</button></div></div>`;
    },
    after() { jBayarState(); }
  };
  KP.act["j-grp"] = (t) => { J.grp = t.dataset.k; J.murid = null; jPrune(); KP.rerender(); };
  KP.act["j-ting"] = (t) => { J.ting = +t.dataset.k; J.murid = null; jPrune(); KP.rerender(); };
  KP.act["j-kat"] = (t) => { J.kat = t.dataset.k; KP.rerender(); };
  KP.act["j-kae"] = (t) => { J.kaedah = t.dataset.k; KP.rerender(); };
  KP.act["j-add"] = (t) => { const b = D.barang.find((x) => x.kod === t.dataset.k); if (!b) return; if ((J.cart[b.kod] || 0) >= b.stok) { KP.toast("Stok tidak mencukupi.", true); return; } J.cart[b.kod] = (J.cart[b.kod] || 0) + 1; KP.rerender(); };
  KP.act["j-min"] = (t) => { const k = t.dataset.k; if (--J.cart[k] <= 0) delete J.cart[k]; KP.rerender(); };
  KP.act["j-kosong"] = () => { J.cart = {}; J.tunai = ""; KP.rerender(); };
  KP.act["j-tn"] = (t) => { J.tunai = String(+t.dataset.k); KP.rerender(); };
  KP.inp.tunai = (t) => { J.tunai = t.value; jBayarState(); };
  KP.inp.jq = (t) => { J.q = t.value; const pos = t.selectionStart; KP.rerender(); const n = $('[data-i="jq"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } };
  KP.inp.mq = (t) => {
    const q = t.value.trim().toLowerCase(), dd = $("#j-dd");
    if (J.murid) J.murid = null;
    if (q.length < 2 || !J.mlist) { dd.hidden = true; return; }
    const r = J.mlist.filter((m) => m.nama.toLowerCase().includes(q) || (m.kp && m.kp.includes(q))).slice(0, 8);
    dd.innerHTML = r.map((m, i) => `<button data-a="j-mpick" data-k="${J.mlist.indexOf(m)}"><span><b>${esc(m.nama)}</b> <span class="muted small">${esc(m.kelas)}</span></span>${pill(m.kumpulan, m.kumpulan === "Asrama" ? "info" : "gr")}</button>`).join("") || `<div class="empty">Tiada padanan.</div>`;
    dd.hidden = false;
  };
  KP.act["j-mpick"] = (t) => { const m = J.mlist[+t.dataset.k]; J.murid = m; J.grp = m.kumpulan; if (m.tingkatan) J.ting = m.tingkatan; jPrune(); KP.rerender(); };
  KP.act["j-bayar"] = async (t) => {
    const items = Object.keys(J.cart).map((k) => ({ kod: k, qty: J.cart[k] }));
    t.disabled = true;
    const j = await KP.call("jual", { items, kumpulan: J.grp, tingkatan: J.ting, kaedah: J.kaedah, tunai: parseFloat(J.tunai) || 0, murid: J.murid ? { nama: J.murid.nama, kelas: J.murid.kelas } : null });
    if (!j) { t.disabled = false; return; }
    const r = j.resit; r.murid = J.murid ? J.murid.nama : ""; r.kelasMurid = J.murid ? J.murid.kelas : "";
    J.cart = {}; J.tunai = ""; J.murid = null;
    KP.modal(`<h2 style="margin-bottom:10px">Jualan berjaya</h2>${resitHtml(r)}<div class="sp" style="margin-top:12px"><button class="btn line" data-a="tutup">Tutup</button><button class="btn cta" data-a="cetak-baru">Cetak resit</button></div>`);
    KP.lastResit = r;
    try { await loadBarang(true); } catch (e) {}
    KP.rerender();
  };
  KP.act["cetak-baru"] = () => KP.printResit(KP.lastResit);

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
      const L = H.list.filter((r) => H.grp === "Semua" || r.kumpulan === H.grp), sah = L.filter((r) => r.status !== "Batal"), sel = H.list.find((r) => r.no === H.sel);
      const sum = (f) => sah.filter(f).reduce((s, r) => s + r.jumlah, 0), admin = KP.S.user.admin;
      return `<div class="card pad"><div class="sp"><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:end"><label class="fld"><span class="lbl">Dari</span><input type="date" data-i="h-dari" value="${H.dari}"></label><label class="fld"><span class="lbl">Hingga</span><input type="date" data-i="h-hingga" value="${H.hingga}"></label></div>${chips(["Semua", "Asrama", "Luar asrama"], H.grp, "h-grp")}</div></div>
      <div class="row"><div class="card kpi"><div class="lbl">Jumlah jualan</div><div class="v">${rm(sum(() => 1))}</div></div><div class="card kpi"><div class="lbl">Bil. resit</div><div class="v">${sah.length}</div></div><div class="card kpi"><div class="lbl">Tunai</div><div class="v">${rm(sum((r) => r.kaedah === "Tunai"))}</div></div><div class="card kpi"><div class="lbl">QR DuitNow</div><div class="v">${rm(sum((r) => r.kaedah !== "Tunai"))}</div></div></div>
      <div class="pos"><div class="card prods" style="padding:6px 0"><div class="tbl"><table><thead><tr><th>No.</th><th>Masa</th><th>Murid / pembeli</th><th>Kaedah</th><th class="r">Jumlah</th><th>Status</th></tr></thead><tbody>${L.map((r) => `<tr class="${r.no === H.sel ? "sel" : ""}" data-a="h-pilih" data-k="${esc(r.no)}" style="cursor:pointer"><td><b>${esc(r.no)}</b></td><td class="muted">${esc(r.tarikh.slice(5, 16))}</td><td>${esc(r.murid || r.kumpulan + " · T" + r.tingkatan)}</td><td>${esc(r.kaedah)}</td><td class="r num">${rm(r.jumlah)}</td><td>${r.status === "Batal" ? pill("Batal", "bad") : pill("Sah", "ok")}</td></tr>`).join("") || `<tr><td colspan="6" class="empty">Tiada resit dalam tempoh ini.</td></tr>`}</tbody></table></div></div>
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
        <label class="fld"><span class="lbl">Kategori</span><select id="m-kat">${katOpts("")}</select></label><label class="fld"><span class="lbl">Unit</span><input id="m-unit" value="Biji"></label><label class="fld"><span class="lbl">Stok awal</span><input id="m-stok" type="number" min="0" value="0"></label>
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
  KP.inp["b-q"] = (t) => { B.q = t.value; const p = t.selectionStart; KP.rerender(); const n = $('[data-i="b-q"]'); if (n) { n.focus(); n.setSelectionRange(p, p); } };
  KP.act["b-simpan"] = async () => {
    const j = await KP.call("saveBarang", { barang: { nama: val("m-nama"), kod: val("m-kod"), kategori: val("m-kat"), unit: val("m-unit"), stok: val("m-stok"), kos: val("m-kos"), jual: val("m-jual"), min: val("m-min") } });
    if (!j) return; KP.toast("Disimpan: " + j.kod); KP.draw(true);
  };
  KP.act["b-edit"] = (t) => {
    const b = D.barang.find((x) => x.kod === t.dataset.k);
    KP.modal(`<h2>Edit ${esc(b.kod)}</h2><div class="form" style="margin-top:10px;grid-template-columns:1fr 1fr"><label class="fld span2"><span class="lbl">Nama</span><input id="e-nama" value="${esc(b.nama)}"></label><label class="fld"><span class="lbl">Kategori</span><select id="e-kat">${katOpts(b.kategori)}</select></label><label class="fld"><span class="lbl">Unit</span><input id="e-unit" value="${esc(b.unit)}"></label><label class="fld"><span class="lbl">Kos (RM)</span><input id="e-kos" value="${b.kos || 0}"></label><label class="fld"><span class="lbl">Jual (RM)</span><input id="e-jual" value="${b.jual}"></label><label class="fld"><span class="lbl">Stok minimum</span><input id="e-min" type="number" value="${b.min}"></label></div>
      <div class="muted small" style="margin-top:8px">Stok diubah melalui halaman Stok (terima / pelarasan).</div><div class="sp" style="margin-top:12px"><button class="btn bad" data-a="b-nyah" data-k="${esc(b.kod)}">Nyahaktif</button><div style="display:flex;gap:8px"><button class="btn line" data-a="tutup">Batal</button><button class="btn cta" data-a="b-edit-ok" data-k="${esc(b.kod)}">Simpan</button></div></div>`);
  };
  KP.act["b-edit-ok"] = async (t) => { const j = await KP.call("saveBarang", { barang: { kod: t.dataset.k, nama: val("e-nama"), kategori: val("e-kat"), unit: val("e-unit"), kos: val("e-kos"), jual: val("e-jual"), min: val("e-min") } }); if (!j) return; KP.closeModal(); KP.toast("Disimpan."); KP.draw(true); };
  KP.act["b-nyah"] = async (t) => { if (!confirm("Nyahaktif barang ini? Ia tidak lagi dipaparkan.")) return; const b = D.barang.find((x) => x.kod === t.dataset.k); const j = await KP.call("saveBarang", { barang: { kod: b.kod, nama: b.nama, kategori: b.kategori, unit: b.unit, kos: b.kos, jual: b.jual, aktif: 0 } }); if (!j) return; KP.closeModal(); KP.draw(true); };

  /* ================= INVENTORI & AKSES ================= */
  const I = { kat: "Semua", ov: {} };
  const iCur = (b) => I.ov[b.kod] || { lr: b.lr, as: b.as, t: b.t.slice() };
  const iSet = (c) => (c.lr || c.as) && c.t.every((v) => v);
  const iSt = (c) => iSet(c) ? pill("SET", "ok") : (c.lr || c.as || c.t.some((v) => v)) ? pill("Separa", "warn") : pill("Belum", "gr");
  const iPut = (kod, f) => { const b = D.barang.find((x) => x.kod === kod), c = iCur(b), n = { lr: c.lr, as: c.as, t: c.t.slice() }; f(n); I.ov[kod] = n; };
  KP.pages.inventori = {
    async load() { await loadBarang(false); I.ov = {}; },
    view() {
      const vis = D.barang.filter((b) => I.kat === "Semua" || b.kategori === I.kat), all = D.barang.map(iCur);
      const nSet = all.filter(iSet).length, nNone = all.filter((c) => !(c.lr || c.as || c.t.some((v) => v))).length, nChg = Object.keys(I.ov).length;
      return `<div class="row"><div class="card kpi"><div class="lbl">Jumlah barang</div><div class="v">${D.barang.length}</div></div><div class="card kpi ok"><div class="lbl">Set lengkap (boleh dijual)</div><div class="v">${nSet}</div></div><div class="card kpi warn"><div class="lbl">Belum lengkap</div><div class="v">${D.barang.length - nSet - nNone}</div></div><div class="card kpi"><div class="lbl">Belum ditetapkan</div><div class="v">${nNone}</div></div></div>
      <div class="note"><b class="hd">Syarat “SET”:</b> barang mesti ditanda untuk <b>sekurang-kurangnya satu</b> kumpulan (Luar asrama / Asrama) <b>dan</b> semua <b>Tingkatan 1 hingga 6</b>. Hanya barang SET dipaparkan di Jualan (POS).</div>
      <div class="card" style="padding:14px 0 0"><div class="sp" style="padding:0 16px 10px">${chips(["Semua"].concat(kats()), I.kat, "i-kat")}<div class="chips"><button class="ch" data-a="i-bulk" data-k="lr">Semua luar asrama</button><button class="ch" data-a="i-bulk" data-k="as">Semua asrama</button><button class="ch" data-a="i-bulk" data-k="t">Semua T1–T6</button><button class="ch" data-a="i-bulk" data-k="x">Kosongkan</button></div></div>
      <div class="tbl"><table style="min-width:760px"><thead><tr><th>Kod</th><th>Nama barang</th><th class="c">Luar asrama</th><th class="c">Asrama</th>${[1, 2, 3, 4, 5, 6].map((n) => `<th class="c">T${n}</th>`).join("")}<th class="c">Status</th></tr></thead><tbody>${vis.map((b) => { const c = iCur(b), cb = (on, a, extra) => `<td class="c"><button class="cb ${extra || ""} ${on ? "on" : ""}" data-a="${a}" data-k="${esc(b.kod)}" aria-label="${esc(b.nama)}">${on ? "✓" : ""}</button></td>`; return `<tr class="${I.ov[b.kod] ? "chg" : ""}"><td class="muted">${esc(b.kod)}</td><td><b>${esc(b.nama)}</b></td>${cb(c.lr, "i-lr")}${cb(c.as, "i-as")}${c.t.map((v, i) => `<td class="c"><button class="cb t ${v ? "on" : ""}" data-a="i-t" data-k="${esc(b.kod)}" data-n="${i}" aria-label="Tingkatan ${i + 1} ${esc(b.nama)}">${v ? "✓" : ""}</button></td>`).join("")}<td class="c">${iSt(c)}</td></tr>`; }).join("") || `<tr><td colspan="11" class="empty">Tiada barang.</td></tr>`}</tbody></table></div>
      <div class="sp" style="padding:12px 16px;background:var(--bg);border-top:1px solid var(--ln);border-radius:0 0 12px 12px"><span class="muted small"><b>${nChg}</b> barang diubah, belum disimpan. Baris kuning = ada perubahan.</span><div style="display:flex;gap:8px"><button class="btn line" data-a="i-reset">Batalkan</button><button class="btn cta" data-a="i-simpan" ${nChg ? "" : "disabled"}>Simpan perubahan</button></div></div></div>`;
    }
  };
  KP.act["i-kat"] = (t) => { I.kat = t.dataset.k; KP.rerender(); };
  KP.act["i-lr"] = (t) => { iPut(t.dataset.k, (n) => { n.lr = n.lr ? 0 : 1; }); KP.rerender(); };
  KP.act["i-as"] = (t) => { iPut(t.dataset.k, (n) => { n.as = n.as ? 0 : 1; }); KP.rerender(); };
  KP.act["i-t"] = (t) => { iPut(t.dataset.k, (n) => { n.t[+t.dataset.n] = n.t[+t.dataset.n] ? 0 : 1; }); KP.rerender(); };
  KP.act["i-bulk"] = (t) => { const k = t.dataset.k; D.barang.filter((b) => I.kat === "Semua" || b.kategori === I.kat).forEach((b) => iPut(b.kod, (n) => { if (k === "lr") n.lr = 1; else if (k === "as") n.as = 1; else if (k === "t") n.t = [1, 1, 1, 1, 1, 1]; else { n.lr = 0; n.as = 0; n.t = [0, 0, 0, 0, 0, 0]; } })); KP.rerender(); };
  KP.act["i-reset"] = () => { I.ov = {}; KP.rerender(); };
  KP.act["i-simpan"] = async () => {
    const items = Object.keys(I.ov).map((k) => ({ kod: k, lr: I.ov[k].lr, as: I.ov[k].as, t: I.ov[k].t }));
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
      <div class="grow" style="flex:1 1 320px;display:flex;flex-direction:column;gap:12px"><div class="card pad"><h2 style="margin-bottom:10px">Kaedah bayaran</h2>${share(L.kaedah)}</div><div class="card pad"><h2 style="margin-bottom:10px">Kumpulan pembeli</h2>${share(L.kumpulan)}</div></div></div>
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
  const T = { tab: "Guru Koop", pgn: [], guru: [], ping: "" };
  KP.pages.tetapan = {
    async load() {
      const [a, b] = await Promise.all([KP.call("getPengguna"), KP.call("senaraiGuru")]);
      if (!a) throw new Error("pengguna");
      T.pgn = a.pengguna; T.guru = b ? b.guru : []; T.nota = b && b.nota;
    },
    view() {
      const tabs = ["Guru Koop", "Kategori", "Jualan & Resit", "Sambungan"];
      let h = `<div class="chips">${tabs.map((k) => `<button class="ch ${k === T.tab ? "on" : ""}" data-a="t-tab" data-k="${k}">${k}</button>`).join("")}</div>`;
      if (T.tab === "Guru Koop") {
        const have = new Set(T.pgn.map((p) => p.emel));
        h += `<div class="card" style="padding:14px 0 8px"><div style="padding:0 16px 10px"><h2>Guru Koop &amp; kebenaran</h2><div class="muted small">Admin App sentiasa mempunyai semua kebenaran. Perubahan disimpan terus.</div></div><div class="tbl"><table><thead><tr><th>Pengguna</th><th>Peranan</th><th class="c">Jualan</th><th class="c">Stok</th><th class="c">Inventori</th><th class="c">Laporan</th><th class="c">Aktif</th><th></th></tr></thead><tbody>${T.pgn.map((p) => { const cb = (f) => p.admin ? `<td class="c muted">✓</td>` : `<td class="c"><button class="cb ${p[f] ? "on" : ""}" data-a="t-perm" data-k="${esc(p.emel)}" data-f="${f}" aria-label="${f} ${esc(p.nama)}">${p[f] ? "✓" : ""}</button></td>`; return `<tr><td><b>${esc(p.nama)}</b><div class="muted small">${esc(p.emel)}</div></td><td>${p.admin ? pill("Admin App", "info") : pill("Guru Koop", "ok")}</td>${cb("jualan")}${cb("stok")}${cb("inventori")}${cb("laporan")}<td class="c"><button class="cb ${p.aktif ? "on" : ""}" data-a="t-perm" data-k="${esc(p.emel)}" data-f="aktif" aria-label="Aktif ${esc(p.nama)}">${p.aktif ? "✓" : ""}</button></td><td><button class="btn line sm" data-a="t-reset" data-k="${esc(p.emel)}">Reset PIN</button></td></tr>`; }).join("")}</tbody></table></div>
          <div style="padding:12px 16px 4px;display:flex;flex-wrap:wrap;gap:10px;align-items:end"><label class="fld" style="flex:1 1 260px"><span class="lbl">Tambah daripada senarai guru app-smasra</span><select id="t-guru"><option value="">— pilih guru —</option>${T.guru.filter((g) => !have.has(g.emel)).map((g) => `<option value="${esc(g.emel)}" data-n="${esc(g.nama)}">${esc(g.nama)} (${esc(g.emel)})</option>`).join("")}</select></label>
          <label class="fld" style="flex:1 1 200px"><span class="lbl">atau taip emel</span><input id="t-emel" type="email"></label><label class="fld" style="flex:0 1 150px"><span class="lbl">Peranan</span><select id="t-per"><option value="Guru">Guru Koop</option><option value="Admin">Admin App</option></select></label><button class="btn cta" data-a="t-tambah">+ Tambah</button></div>
          ${T.nota ? `<div class="muted small" style="padding:6px 16px">${esc(T.nota)}</div>` : ""}<div class="muted small" style="padding:8px 16px 4px">Pengguna baharu menggunakan PIN awal 1234 dan diminta menukarnya semasa log masuk pertama. Inventori = tanda asrama / luar asrama &amp; T1–T6.</div></div>`;
      } else if (T.tab === "Kategori") {
        h += `<div class="card pad" style="display:flex;flex-direction:column;gap:12px;max-width:640px"><h2>Kategori barangan</h2><div class="chips">${kats().map((k, i) => `<span class="pill p-gr" style="font-size:13px;padding:6px 12px">${esc(k)} <button class="btn sm" style="all:unset;cursor:pointer;margin-left:4px" data-a="t-kdel" data-k="${i}" aria-label="Buang ${esc(k)}">✕</button></span>`).join("")}</div><div style="display:flex;gap:8px"><input id="t-knew" placeholder="Nama kategori baharu" data-enter="t-kadd"><button class="btn" data-a="t-kadd">Tambah</button></div></div>`;
      } else if (T.tab === "Jualan & Resit") {
        const r = KP.S.tetapan.resit || {};
        h += `<div class="card pad" style="max-width:640px;display:flex;flex-direction:column;gap:12px"><h2>Tetapan jualan &amp; resit</h2><div class="form" style="grid-template-columns:1fr 1fr"><label class="fld span2"><span class="lbl">Nama pada resit</span><input id="t-rnama" value="${esc(r.nama)}"></label><label class="fld"><span class="lbl">Awalan no. resit</span><input id="t-rawal" value="${esc(r.awalan)}"></label><label class="fld"><span class="lbl">Stok minimum lalai</span><input id="t-rmin" type="number" value="${esc(r.minLalai)}"></label></div><div style="text-align:right"><button class="btn cta" data-a="t-rsimpan">Simpan tetapan</button></div></div>`;
      } else {
        h += `<div class="card pad sp"><div><h2>Sambungan data</h2><div class="muted small">Google Sheet Koperasi · Apps Script Web App</div></div><div style="display:flex;gap:8px;align-items:center">${T.ping ? pill(T.ping, T.ping === "Bersambung" ? "ok" : "bad") : ""}<button class="btn line" data-a="t-ping">Uji sambungan</button></div></div>`;
      }
      return h;
    }
  };
  KP.act["t-tab"] = (t) => { T.tab = t.dataset.k; KP.rerender(); };
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
  KP.act["t-ping"] = async () => { T.ping = "Menguji…"; KP.rerender(); try { const j = await (await fetch(KP_API + "?action=ping")).json(); T.ping = j.ok ? "Bersambung" : "Gagal"; } catch (e) { T.ping = "Tidak bersambung"; } KP.rerender(); };
})();
