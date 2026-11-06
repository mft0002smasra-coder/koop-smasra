/* Koperasi SMA (JAIM) Al-Asyraf — BACAAN data terus daripada Google Sheet (gviz), seperti Markah Ujian.
 * Sheet Koperasi mesti dikongsi "Anyone with the link — Viewer". Penulisan kekal melalui Apps Script (token + semakan peranan).
 * Bentuk hasil sama dengan jawapan Apps Script, jadi halaman tidak perlu tahu dari mana data datang. */
const KP_SHEET_ID = "1_qim2NXJ4et0Z2eWiNvrFNozm0SDi9a0urEB96Gt88A";

KP.data = (function () {
  const f1 = (v) => (v === true || v === 1 || v === "1" || String(v).toUpperCase() === "TRUE" ? 1 : 0);
  const n = (v) => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };
  const s = (v) => (v == null ? "" : String(v));
  const r2 = (x) => Math.round(x * 100) / 100;

  async function gv(name) {
    const url = `https://docs.google.com/spreadsheets/d/${KP_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(name)}&headers=1&_ts=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Sheet tidak dapat dibaca (" + res.status + "). Pastikan dikongsi 'Anyone with the link'.");
    const t = await res.text();
    let j; try { j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)); } catch (e) { throw new Error("Sheet tidak dikongsi 'Anyone with the link — Viewer'."); }
    if (j.status === "error") throw new Error("Tab " + name + " tidak dijumpai.");
    let cols = (j.table.cols || []).map((c) => String(c.label || "").trim()), rows = j.table.rows || [];
    if (cols.every((c) => !c)) { // tab hanya ada baris tajuk
      if (!rows.length) return [];
      cols = (rows[0].c || []).map((c) => String((c && c.v) || "").trim()); rows = rows.slice(1);
    }
    return rows.map((r) => { const o = {}; cols.forEach((k, i) => { const c = r.c && r.c[i]; o[k] = c && c.v != null ? c.v : ""; }); return o; });
  }

  async function tetapan() {
    const o = {}; (await gv("KP_Tetapan")).forEach((r) => { try { o[r.KUNCI] = JSON.parse(r.NILAI); } catch (e) {} });
    return o;
  }
  const bOut = (x) => ({ barcode: s(x.BARCODE).trim(), kod: s(x.KOD), nama: s(x.NAMA), kategori: s(x.KATEGORI), unit: s(x.UNIT), kos: n(x.KOS), jual: n(x.JUAL), stok: n(x.STOK), min: n(x.MIN), lr: f1(x.LR), as: f1(x.AS), t: [1, 2, 3, 4, 5, 6].map((i) => f1(x["T" + i])), w: [1, 2, 3, 4, 5, 6].map((i) => f1(x["W" + i])), aktif: f1(x.AKTIF) });
  const isSet = (b) => ((b.lr || b.as) && b.t.every((v) => v) ? 1 : 0);

  async function allBarang() { return (await gv("KP_Barang")).filter((x) => s(x.KOD)).map(bOut).filter((b) => b.aktif).map((b) => Object.assign(b, { set: isSet(b) })); }

  async function getBarang(b) {
    const [br, tt] = await Promise.all([allBarang(), tetapan()]);
    KP.S.tetapan = { kategori: tt.kategori || [], resit: tt.resit || {} };
    return { success: true, barang: b && b.hanyaSet ? br.filter((x) => x.set) : br, kategori: tt.kategori || [] };
  }

  async function getStokLog(b) {
    let r = (await gv("KP_Stok")).filter((x) => s(x.KOD)).reverse();
    if (b && b.jenis && b.jenis !== "Semua") r = r.filter((x) => x.JENIS === b.jenis);
    return { success: true, log: r.slice(0, Math.min((b && b.had) || 200, 1000)).map((x) => ({ tarikh: s(x.TARIKH), kod: s(x.KOD), nama: s(x.NAMA), jenis: s(x.JENIS), qty: n(x.QTY), baki: n(x.BAKI), oleh: s(x.OLEH), rujukan: s(x.RUJUKAN) })) };
  }

  async function resitList(dari, hingga, nama) {
    const [jr, ji] = await Promise.all([gv("KP_Jualan"), gv("KP_JualanItem")]), items = {};
    ji.forEach((x) => { (items[x.NO] = items[x.NO] || []).push({ kod: s(x.KOD), nama: s(x.NAMA), kategori: s(x.KATEGORI), qty: n(x.QTY), harga: n(x.HARGA), kos: n(x.KOS), jumlah: r2(n(x.HARGA) * n(x.QTY)) }); });
    return jr.filter((x) => s(x.NO)).filter((x) => { const d = s(x.TARIKH).slice(0, 10); return (!dari || d >= dari) && (!hingga || d <= hingga) && (!nama || x.JURUWANG === nama); }).map((x) => ({
      no: s(x.NO), tarikh: s(x.TARIKH), juruwang: s(x.JURUWANG), kumpulan: s(x.KUMPULAN), tingkatan: n(x.TINGKATAN), murid: s(x.MURID), kelasMurid: s(x.KELAS_MURID), kaedah: s(x.KAEDAH),
      jumlah: n(x.JUMLAH), tunai: n(x.TUNAI), baki: n(x.BAKI), status: s(x.STATUS), dibatalOleh: s(x.DIBATAL_OLEH), sebabBatal: s(x.SEBAB_BATAL), items: items[x.NO] || [] }));
  }

  async function getJualan(b) {
    const u = KP.S.user, sendiri = !(u.admin || u.laporan);
    const r = (await resitList(s(b.dari), s(b.hingga), sendiri ? u.nama : "")).reverse();
    return { success: true, resit: r.slice(0, Math.min(b.had || 300, 2000)) };
  }

  async function laporan(b) {
    const [all, br] = await Promise.all([resitList(s(b.dari), s(b.hingga), ""), allBarang()]);
    const rs = all.filter((x) => x.status !== "Batal"), T = { hasil: 0, kos: 0, resit: rs.length }, kat = {}, kae = {}, kum = {}, hari = {}, bulan = {}, brg = {};
    const add = (m, k, h, c) => { const o = (m[k] = m[k] || { hasil: 0, kos: 0 }); o.hasil += h; o.kos += c; };
    rs.forEach((r) => {
      let h = 0, c = 0;
      r.items.forEach((i) => { const ih = i.harga * i.qty, ic = i.kos * i.qty; h += ih; c += ic; add(kat, i.kategori || "Lain-lain", ih, ic); const bo = (brg[i.nama] = brg[i.nama] || { qty: 0, hasil: 0 }); bo.qty += i.qty; bo.hasil += ih; });
      T.hasil += h; T.kos += c; add(kae, r.kaedah, h, c); add(kum, r.kumpulan, h, c); add(hari, r.tarikh.slice(0, 10), h, c); add(bulan, r.tarikh.slice(0, 7), h, c);
    });
    const arr = (m, key) => Object.keys(m).sort().map((k) => { const o = {}; o[key] = k; o.hasil = r2(m[k].hasil); o.kos = r2(m[k].kos); o.untung = r2(m[k].hasil - m[k].kos); return o; });
    T.hasil = r2(T.hasil); T.kos = r2(T.kos); T.untung = r2(T.hasil - T.kos); T.margin = T.hasil ? Math.round(T.untung / T.hasil * 1000) / 10 : 0;
    return { success: true, jumlah: T, kategori: arr(kat, "nama"), kaedah: arr(kae, "nama"), kumpulan: arr(kum, "nama"), harian: arr(hari, "tarikh"), bulanan: arr(bulan, "bulan"),
      terlaris: Object.keys(brg).map((k) => ({ nama: k, qty: brg[k].qty, hasil: r2(brg[k].hasil) })).sort((a, c) => c.qty - a.qty).slice(0, 10),
      stokRendah: br.filter((x) => x.stok <= x.min).map((x) => ({ kod: x.kod, nama: x.nama, stok: x.stok, min: x.min })), nilaiStok: r2(br.reduce((t, x) => t + x.stok * x.kos, 0)) };
  }

  async function getPengguna() {
    return { success: true, pengguna: (await gv("KP_Pengguna")).filter((x) => s(x.EMEL)).map((x) => { const a = x.PERANAN === "Admin"; return { emel: s(x.EMEL).toLowerCase(), nama: s(x.NAMA), peranan: s(x.PERANAN), admin: a, jualan: a || !!f1(x.JUALAN), stok: a || !!f1(x.STOK), inventori: a || !!f1(x.INVENTORI), laporan: a || !!f1(x.LAPORAN), aktif: f1(x.AKTIF) }; }) };
  }

  async function getTempahan() {
    return { success: true, tempahan: (await gv("KP_Tempahan")).filter((x) => s(x.NO)).reverse().map((x) => { let it = []; try { it = JSON.parse(x.ITEMS); } catch (e) {} return { no: s(x.NO), tarikh: s(x.TARIKH), murid: s(x.MURID), kelasMurid: s(x.KELAS_MURID), kumpulan: s(x.KUMPULAN), tingkatan: n(x.TINGKATAN), items: it, jumlah: n(x.JUMLAH), status: s(x.STATUS), oleh: s(x.OLEH), noResit: s(x.NO_RESIT), catatan: s(x.CATATAN), kp: s(x.KP), baru: f1(x.BARU) }; }) };
  }

  return { getTempahan, getBarang, getStokLog, getJualan, laporan, getPengguna };
})();
