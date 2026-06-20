// ─── NL Lighting Quotation ─ Client Script ───────────────────────────────────

const NL_DEFAULTS = { exchange_rates: { EUR: 4.5, USD: 3.8, AED: 1.0, GBP: 5.2 } };

// ── Helpers ───────────────────────────────────────────────────────────────────
function flt(v) { return parseFloat(v) || 0; }
function fmt0(v) { return flt(v).toLocaleString("en-US", { maximumFractionDigits: 0 }); }
function fmt2(v) { return flt(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmt4(v) { return flt(v).toFixed(4); }

function get_fx(frm, cur) {
    const r = (frm.doc.nl_exchange_rates || []).find(x => x.currency === cur);
    return r ? flt(r.rate) || 1 : NL_DEFAULTS.exchange_rates[cur] || 1;
}
function detect_row_type(row) {
    const p = (row.nl_proposed_product || "").trim().toUpperCase();
    if (p.startsWith("DRIVER")) return "Driver";
    if (p.startsWith("ACC:") || p.startsWith("ACC ")) return "Accessory";
    if ((row.nl_is || "").includes(".")) return "Accessory";
    return "Main Item";
}

// ── Formula engine ────────────────────────────────────────────────────────────
function calc_row(frm, row) {
    const qty  = flt(row.nl_qty);
    const uexw = flt(row.nl_uexw_value);
    const disc = flt(row.nl_discount_pct);
    const fx   = flt(row.nl_fx_rate) || get_fx(frm, row.nl_exw_currency || "USD");
    const mu   = flt(row.nl_markup) || flt(frm.doc.nl_default_markup) || 1.5;
    const sP   = flt(row.nl_ship_pct) || flt(frm.doc.nl_freight_pct)    || 10;
    const iP   = flt(row.nl_ins_pct)  || flt(frm.doc.nl_insurance_pct)  || 1;
    const cP   = flt(row.nl_cus_pct)  || flt(frm.doc.nl_customs_pct)    || 6;
    const smP  = flt(row.nl_sam_pct)  || flt(frm.doc.nl_samples_pct)    || 1;
    const lcP  = flt(row.nl_lc_pct)   || flt(frm.doc.nl_lc_pct)         || 2;

    row.nl_fx_rate           = fx;
    const net                = uexw * (1 - disc / 100);
    row.nl_net_uexw          = net;
    row.nl_tot_exw           = net * qty;
    const eu                 = net * fx;
    row.nl_exworks_unit_aed  = eu;
    row.nl_exworks_total_aed = eu * qty;
    const s = eu*sP/100, i = eu*iP/100, c = eu*cP/100, sm = eu*smP/100, lc = eu*lcP/100;
    row.nl_ship_unit_aed = s;  row.nl_ship_total_aed  = s  * qty;
    row.nl_ins_unit_aed  = i;  row.nl_ins_total_aed   = i  * qty;
    row.nl_cus_unit_aed  = c;  row.nl_cus_total_aed   = c  * qty;
    row.nl_sam_unit_aed  = sm; row.nl_sam_total_aed   = sm * qty;
    row.nl_lc_unit_aed   = lc; row.nl_lc_total_aed    = lc * qty;
    const land           = eu + s + i + c + sm + lc;
    row.nl_landed_unit_aed   = land;
    row.nl_landed_total_aed  = land * qty;
    const sell           = Math.round(land * mu);
    row.nl_unit_sell_aed     = sell;
    row.nl_total_sell_aed    = sell * qty;
    row.nl_gm_pct            = sell > 0 ? (sell - land) / sell * 100 : 0;
}
function calc_all(frm) {
    (frm.doc.nl_quotation_lines || []).forEach(r => calc_row(frm, r));
    frm.dirty();
}

// ── Per-cell formula tooltips (shows actual live values) ──────────────────────
function fx_tip(row) {
    const e  = flt(row.nl_exworks_unit_aed);
    return {
        nl_net_uexw:          `NET EXW = ${fmt2(row.nl_uexw_value)} x (1 - ${flt(row.nl_discount_pct).toFixed(1)}%) = ${fmt2(row.nl_net_uexw)}`,
        nl_tot_exw:           `TOT EXW = NET EXW ${fmt2(row.nl_net_uexw)} x QTY ${flt(row.nl_qty)} = ${fmt2(row.nl_tot_exw)}`,
        nl_exworks_unit_aed:  `EXW UNIT AED = NET EXW ${fmt2(row.nl_net_uexw)} x FX ${fmt4(row.nl_fx_rate)} = ${fmt2(e)}`,
        nl_exworks_total_aed: `EXW TOT AED = EXW UNIT ${fmt2(e)} x QTY ${flt(row.nl_qty)} = ${fmt2(row.nl_exworks_total_aed)}`,
        nl_ship_unit_aed:     `FREIGHT UNIT = EXW ${fmt2(e)} x ${flt(row.nl_ship_pct).toFixed(1)}% = ${fmt2(row.nl_ship_unit_aed)}`,
        nl_ship_total_aed:    `FREIGHT TOTAL = FREIGHT UNIT ${fmt2(row.nl_ship_unit_aed)} x QTY ${flt(row.nl_qty)} = ${fmt2(row.nl_ship_total_aed)}`,
        nl_ins_unit_aed:      `INS UNIT = EXW ${fmt2(e)} x ${flt(row.nl_ins_pct).toFixed(1)}% = ${fmt2(row.nl_ins_unit_aed)}`,
        nl_ins_total_aed:     `INS TOTAL = INS UNIT ${fmt2(row.nl_ins_unit_aed)} x QTY ${flt(row.nl_qty)} = ${fmt2(row.nl_ins_total_aed)}`,
        nl_cus_unit_aed:      `CUSTOMS UNIT = EXW ${fmt2(e)} x ${flt(row.nl_cus_pct).toFixed(1)}% = ${fmt2(row.nl_cus_unit_aed)}`,
        nl_cus_total_aed:     `CUSTOMS TOTAL = ${fmt2(row.nl_cus_unit_aed)} x QTY ${flt(row.nl_qty)} = ${fmt2(row.nl_cus_total_aed)}`,
        nl_sam_unit_aed:      `SAMPLES UNIT = EXW ${fmt2(e)} x ${flt(row.nl_sam_pct).toFixed(1)}% = ${fmt2(row.nl_sam_unit_aed)}`,
        nl_sam_total_aed:     `SAMPLES TOTAL = ${fmt2(row.nl_sam_unit_aed)} x QTY ${flt(row.nl_qty)} = ${fmt2(row.nl_sam_total_aed)}`,
        nl_lc_unit_aed:       `LC UNIT = EXW ${fmt2(e)} x ${flt(row.nl_lc_pct).toFixed(1)}% = ${fmt2(row.nl_lc_unit_aed)}`,
        nl_lc_total_aed:      `LC TOTAL = ${fmt2(row.nl_lc_unit_aed)} x QTY ${flt(row.nl_qty)} = ${fmt2(row.nl_lc_total_aed)}`,
        nl_landed_unit_aed:   `LANDED = EXW ${fmt2(e)} + FRT ${fmt2(row.nl_ship_unit_aed)} + INS ${fmt2(row.nl_ins_unit_aed)} + CST ${fmt2(row.nl_cus_unit_aed)} + SAM ${fmt2(row.nl_sam_unit_aed)} + LC ${fmt2(row.nl_lc_unit_aed)} = ${fmt2(row.nl_landed_unit_aed)}`,
        nl_landed_total_aed:  `LANDED TOT = LANDED UNIT ${fmt2(row.nl_landed_unit_aed)} x QTY ${flt(row.nl_qty)} = ${fmt2(row.nl_landed_total_aed)}`,
        nl_unit_sell_aed:     `SELL UNIT = LANDED ${fmt2(row.nl_landed_unit_aed)} x ${flt(row.nl_markup).toFixed(2)}x = ${fmt0(row.nl_unit_sell_aed)} (rounded)`,
        nl_total_sell_aed:    `SELL TOT = SELL UNIT ${fmt0(row.nl_unit_sell_aed)} x QTY ${flt(row.nl_qty)} = ${fmt0(row.nl_total_sell_aed)}`,
        nl_gm_pct:            `GM% = (${fmt0(row.nl_unit_sell_aed)} - ${fmt2(row.nl_landed_unit_aed)}) / ${fmt0(row.nl_unit_sell_aed)} x 100 = ${flt(row.nl_gm_pct).toFixed(1)}%`,
        nl_fx_rate:           `FX for ${row.nl_exw_currency || "USD"} from Exchange Rates table = ${fmt4(row.nl_fx_rate)}`,
    };
}

// ── Brand summary ─────────────────────────────────────────────────────────────
function brand_summary(frm) {
    const data = {};
    (frm.doc.nl_quotation_lines || []).forEach(r => {
        if (r.nl_row_type !== "Main Item") return;
        const b = r.nl_supplier_brand || r.nl_proposed_brand || "Unknown";
        if (!data[b]) data[b] = { exw: 0, land: 0, sell: 0 };
        data[b].exw  += flt(r.nl_tot_exw);
        data[b].land += flt(r.nl_landed_total_aed);
        data[b].sell += flt(r.nl_total_sell_aed);
    });
    return data;
}

// ── Column definitions ────────────────────────────────────────────────────────
const GROUPS = [
    { label: "PROPOSED PRODUCT DETAILS",   bg: "#1a1a3e", n: 9 },
    { label: "",                            bg: "#1a1a3e", n: 1 },
    { label: "EXWORKS",                     bg: "#1e3a5f", n: 9 },
    { label: "FREIGHT",                     bg: "#1a4731", n: 3 },
    { label: "INSURANCE",                   bg: "#3d3416", n: 3 },
    { label: "CUSTOMS",                     bg: "#4a1e1e", n: 3 },
    { label: "SAMPLES",                     bg: "#2d1a4a", n: 3 },
    { label: "LETTER OF CREDIT",            bg: "#1a3a3a", n: 3 },
    { label: "LANDED AED",                  bg: "#0a2a4a", n: 2 },
    { label: "SELLING",                     bg: "#1a3d1a", n: 4 },
    { label: "QTY",                         bg: "#3d2000", n: 2 },
    { label: "RISK",                        bg: "#3d1a2a", n: 1 },
    { label: "PROJECT SPECIFICATIONS",      bg: "#5c1a00", n: 4 },
];

// [field, label, width, align]
const COLS = [
    ["nl_is",                   "IS",           36, "c"],
    ["nl_product_package",      "PKG",          80, "l"],
    ["nl_specification",        "SPEC",         95, "l"],
    ["nl_product_type",         "TYPE",         85, "l"],
    ["nl_location",             "LOCATION",     80, "l"],
    ["nl_image",                "IMG",          54, "c"],
    ["nl_proposed_brand",       "BRAND",        80, "l"],
    ["nl_proposed_product",     "PRODUCT",     105, "l"],
    ["nl_proposed_description", "DESCRIPTION", 190, "l"],
    ["__actions",               "",             44, "c"],
    ["nl_price_type",           "PRICE",        68, "c"],
    ["nl_supplier_brand",       "SUP.BRAND",    80, "l"],
    ["nl_uexw_value",           "U.EXW",        78, "r"],
    ["nl_discount_pct",         "DISC%",        50, "r"],
    ["nl_net_uexw",             "NET EXW",      78, "r"],
    ["nl_exw_currency",         "CUR",          36, "c"],
    ["nl_fx_rate",              "FX",           58, "r"],
    ["nl_exworks_unit_aed",     "UNIT AED",     82, "r"],
    ["nl_exworks_total_aed",    "TOT AED",      82, "r"],
    ["nl_ship_pct",             "%",            40, "r"],
    ["nl_ship_unit_aed",        "UNIT",         72, "r"],
    ["nl_ship_total_aed",       "TOTAL",        72, "r"],
    ["nl_ins_pct",              "%",            40, "r"],
    ["nl_ins_unit_aed",         "UNIT",         72, "r"],
    ["nl_ins_total_aed",        "TOTAL",        72, "r"],
    ["nl_cus_pct",              "%",            40, "r"],
    ["nl_cus_unit_aed",         "UNIT",         72, "r"],
    ["nl_cus_total_aed",        "TOTAL",        72, "r"],
    ["nl_sam_pct",              "%",            40, "r"],
    ["nl_sam_unit_aed",         "UNIT",         72, "r"],
    ["nl_sam_total_aed",        "TOTAL",        72, "r"],
    ["nl_lc_pct",               "%",            40, "r"],
    ["nl_lc_unit_aed",          "UNIT",         72, "r"],
    ["nl_lc_total_aed",         "TOTAL",        72, "r"],
    ["nl_landed_unit_aed",      "UNIT AED",     84, "r"],
    ["nl_landed_total_aed",     "TOT AED",      84, "r"],
    ["nl_markup",               "MU",           42, "r"],
    ["nl_gm_pct",               "GM%",          50, "r"],
    ["nl_unit_sell_aed",        "UNIT SELL",    84, "r"],
    ["nl_total_sell_aed",       "TOT SELL",     84, "r"],
    ["nl_qty",                  "QTY",          48, "c"],
    ["nl_uom",                  "UOM",          42, "c"],
    ["nl_approval_risk",        "RISK",         58, "c"],
    ["nl_alt1_brand",           "ALT1 BRAND",   75, "l"],
    ["nl_alt1_product",         "ALT1 PRODUCT", 92, "l"],
    ["nl_alt2_brand",           "ALT2 BRAND",   75, "l"],
    ["nl_alt2_product",         "ALT2 PRODUCT", 92, "l"],
];

const ROW_STYLE = {
    "Main Item": { bg: "#ffffff", fg: "#1a1a3e", lb: "3px solid #1a1a3e" },
    "Driver":    { bg: "#eef4ff", fg: "#1a3a6e", lb: "3px solid #4a7ab5" },
    "Accessory": { bg: "#f8f8f8", fg: "#555555", lb: "3px solid #aaaaaa" },
};
const RISK_COLOR = { High: "#c0392b", Medium: "#d35400", Low: "#27ae60" };

// ── Render a single cell ──────────────────────────────────────────────────────
function cell_val(row, field) {
    const v = row[field];
    if (field === "__actions")
        return `<button class="nl-edit-btn" data-rowname="${row.name}" title="Edit row">&#9998;</button>`;
    if (field === "nl_image")
        return v ? `<img src="${v}" style="max-height:36px;max-width:46px;object-fit:contain;">` : "";
    if (field === "nl_proposed_description")
        return `<span class="nl-clip" title="${(v||"").replace(/"/g,"")}">${v||""}</span>`;
    if (field === "nl_proposed_brand")
        return v ? `<strong>${v}</strong>` : "";
    if (field === "nl_is")
        return `<span style="font-weight:800;font-size:10px;">${v||""}</span>`;
    if (field === "nl_fx_rate")       return v ? fmt4(v) : "";
    if (field === "nl_markup")        return v ? `${flt(v).toFixed(2)}x` : "";
    if (field === "nl_discount_pct")  return v ? `${flt(v).toFixed(1)}%` : "";
    if (["nl_ship_pct","nl_ins_pct","nl_cus_pct","nl_sam_pct","nl_lc_pct"].includes(field))
        return v ? `${flt(v).toFixed(1)}%` : "";
    if (field === "nl_gm_pct") {
        if (!v) return "";
        const g = flt(v);
        const c = g >= 30 ? "#27ae60" : g >= 20 ? "#e67e22" : "#c0392b";
        return `<span style="color:${c};font-weight:700;">${g.toFixed(1)}%</span>`;
    }
    if (field === "nl_approval_risk") {
        if (!v) return "";
        return `<span style="color:${RISK_COLOR[v]||"#888"};font-weight:700;font-size:10px;">${v}</span>`;
    }
    if (["nl_uexw_value","nl_net_uexw","nl_tot_exw"].includes(field))
        return v ? fmt2(v) : "";
    if (["nl_exworks_unit_aed","nl_exworks_total_aed",
         "nl_ship_unit_aed","nl_ship_total_aed",
         "nl_ins_unit_aed","nl_ins_total_aed",
         "nl_cus_unit_aed","nl_cus_total_aed",
         "nl_sam_unit_aed","nl_sam_total_aed",
         "nl_lc_unit_aed","nl_lc_total_aed"].includes(field))
        return v ? fmt0(v) : "";
    if (["nl_landed_unit_aed","nl_landed_total_aed"].includes(field))
        return v ? `<strong>${fmt0(v)}</strong>` : "";
    if (["nl_unit_sell_aed","nl_total_sell_aed"].includes(field))
        return v ? `<strong>${fmt0(v)}</strong>` : "";
    if (field === "nl_qty") return v ? flt(v).toLocaleString("en-US") : "";
    return v || "";
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const WS_CSS = `
<style>
.nl-ws{font-family:Arial,sans-serif;font-size:11px;color:#212529;background:#eef0f4;padding:0;}
.nl-ws *{box-sizing:border-box;}
/* Full-screen */
.nl-ws.nl-fs{position:fixed;top:0;left:0;right:0;bottom:0;z-index:2000;
  display:flex;flex-direction:column;overflow:hidden;background:#eef0f4;}
.nl-ws.nl-fs .nl-wrap{max-height:none!important;flex:1;}
.nl-ws.nl-fs .nl-bar{border-radius:0;}
/* Top bar */
.nl-bar{display:flex;align-items:center;flex-wrap:wrap;gap:4px;
  background:#1a1a3e;color:#fff;padding:8px 12px;border-radius:6px 6px 0 0;flex-shrink:0;}
.nl-pinfo{display:flex;align-items:center;gap:5px;font-size:10.5px;margin-right:6px;}
.nl-pinfo .lbl{color:#7080a0;font-size:8.5px;font-weight:700;text-transform:uppercase;}
.nl-pinfo .val{color:#fff;font-weight:600;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.nl-pinfo .sp{color:#2a3a5e;margin:0 1px;}
.nl-ctrl{display:flex;align-items:center;gap:3px;background:#212d4e;border-radius:4px;padding:3px 7px;}
.nl-ctrl label{font-size:8.5px;font-weight:700;color:#7080a0;text-transform:uppercase;white-space:nowrap;}
.nl-ctrl input{width:44px;background:#161e38;border:1px solid #2a3a58;border-radius:3px;
  padding:2px 4px;font-size:10.5px;color:#fff;text-align:right;}
.nl-ctrl input:focus{outline:1px solid #5080b0;background:#0c142a;}
.nl-add-btn{background:#27ae60;color:#fff;border:none;border-radius:4px;padding:5px 12px;
  font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;margin-left:4px;}
.nl-add-btn:hover{background:#219d55;}
.nl-ibtn{background:transparent;color:#7080a0;border:1px solid #2a3a58;border-radius:4px;
  padding:4px 9px;font-size:10px;cursor:pointer;white-space:nowrap;}
.nl-ibtn:hover{color:#fff;border-color:#5080b0;background:#212d4e;}
.nl-std-btn{background:transparent;color:#7080a0;border:1px solid #2a3a58;border-radius:4px;
  padding:4px 9px;font-size:10px;cursor:pointer;white-space:nowrap;margin-left:auto;}
.nl-std-btn:hover{color:#fff;border-color:#5080b0;}
/* Table wrapper */
.nl-wrap{overflow:auto;border:1px solid #c4c8d0;border-top:none;
  border-radius:0 0 6px 6px;max-height:calc(100vh - 180px);background:#fff;}
/* Excel grid */
.nl-t{border-collapse:collapse;width:max-content;font-size:10.5px;}
.nl-t td,.nl-t th{border-right:1px solid #d4d8de;border-bottom:1px solid #d4d8de;
  padding:3px 5px;white-space:nowrap;vertical-align:middle;}
/* Row number col */
.nl-t .rn{background:#f0f2f6;color:#9090a0;font-size:9px;text-align:center;
  border-right:2px solid #c4c8d0;min-width:30px;width:30px;
  position:sticky;left:0;z-index:4;}
/* Group header */
.nl-grp th{padding:5px 4px;font-size:9px;font-weight:700;color:#fff;text-align:center;
  letter-spacing:.7px;border-right:2px solid rgba(255,255,255,.2);
  position:sticky;top:0;z-index:13;}
.nl-grp .rn{background:#111828!important;border-right:2px solid rgba(255,255,255,.2);}
/* Column header */
.nl-hdr th{font-size:9px;font-weight:700;color:#b8c8e0;text-align:center;
  background:#263547;padding:4px 4px;
  border-right:1px solid rgba(255,255,255,.12);border-bottom:2px solid #111828;
  position:sticky;top:31px;z-index:12;}
.nl-hdr .rn{background:#263547;position:sticky;left:0;z-index:20;top:31px;}
.nl-hdr th.stk0{position:sticky;left:30px;z-index:20;background:#263547;}
/* Data cells */
.nl-t tbody tr:hover td{background:#fffde7!important;}
.nl-t tbody tr:hover .rn{background:#e8e8f0!important;}
.nl-t td.stk0{position:sticky;left:30px;z-index:5;border-right:3px solid #c4c8d0;}
.nl-t td.r{text-align:right;}
.nl-t td.c{text-align:center;}
.nl-t td.land{background:#e8f0fa;}
.nl-t td.sell{background:#e8f5e9;}
.nl-t td.fxc{background:#fffff0;}
/* Formula cursor */
.nl-t td[title]{cursor:help;}
/* Totals */
.nl-tot td{background:#111828!important;color:#fff;font-weight:700;padding:5px 5px;
  border-right:1px solid rgba(255,255,255,.15);}
.nl-tot .rn{background:#080e1c!important;color:#505070;}
.nl-tot .tl{color:#7bb8f5;}
.nl-tot .ts{color:#7cf59d;}
/* Buttons */
.nl-edit-btn{background:none;border:1px solid #c0c8d8;border-radius:3px;
  padding:1px 6px;cursor:pointer;font-size:12px;color:#555;}
.nl-edit-btn:hover{background:#1a1a3e;color:#fff;border-color:#1a1a3e;}
.nl-clip{display:block;overflow:hidden;text-overflow:ellipsis;max-width:188px;}
/* Formula legend */
.nl-fref{margin-top:8px;background:#fff;border:1px solid #c4c8d0;border-radius:6px;overflow:hidden;}
.nl-fref-hdr{background:#263547;color:#b8c8e0;padding:8px 14px;font-size:10.5px;
  font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;user-select:none;}
.nl-fref-hdr:hover{background:#2f4358;}
.nl-fref-hdr .hint{font-weight:400;color:#7080a0;font-size:9px;}
.nl-fref-hdr .arr{margin-left:auto;font-size:10px;color:#7080a0;}
.nl-fref-body{display:none;padding:12px 16px;background:#f8f9fc;}
.nl-fref-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:6px 18px;}
.nl-fi{background:#fff;border:1px solid #dde2ec;border-radius:4px;padding:7px 10px;}
.nl-fi .fi-l{font-size:9px;font-weight:700;color:#7080a0;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;}
.nl-fi .fi-f{font-size:11px;color:#1a1a3e;font-family:'Courier New',monospace;font-weight:700;}
.nl-fi .fi-e{font-size:9.5px;color:#777;margin-top:3px;}
/* Modals above full-screen overlay */
body.nl-fs-active .modal-backdrop{z-index:2050!important;}
body.nl-fs-active .modal{z-index:2100!important;}
/* Brand summary */
.nl-bsum{margin-top:8px;border:1px solid #c4c8d0;border-radius:6px;overflow:hidden;}
.nl-bsum-hdr{background:#1a1a3e;color:#fff;padding:8px 14px;font-size:11px;font-weight:700;
  display:flex;align-items:center;letter-spacing:.5px;}
.nl-bsum-hdr .bst{margin-left:auto;font-size:10px;color:#aab4d0;}
.nl-bsum table{border-collapse:collapse;font-size:10.5px;}
.nl-bsum th{background:#263547;color:#b8c8e0;padding:4px 12px;text-align:right;
  font-size:9.5px;font-weight:700;border:1px solid rgba(255,255,255,.1);}
.nl-bsum th:first-child{text-align:left;}
.nl-bsum td{padding:3px 12px;border-bottom:1px solid #e8eaf0;text-align:right;border-right:1px solid #e8eaf0;}
.nl-bsum td:first-child{text-align:left;font-weight:600;}
.nl-bsum tfoot td{background:#f0f4ff;font-weight:700;border-top:2px solid #263547;}
</style>`;

// ── Formula reference definitions ─────────────────────────────────────────────
const FORMULA_REF = [
    { l:"NET EXW",       f:"U.EXW x (1 - DISC%)",                            e:"e.g. 100 x (1 - 5%) = 95.00" },
    { l:"EXW UNIT AED",  f:"NET EXW x FX RATE",                              e:"e.g. 95 x 3.80 = 361.00" },
    { l:"EXW TOT AED",   f:"EXW UNIT AED x QTY",                             e:"e.g. 361 x 10 = 3,610" },
    { l:"FREIGHT UNIT",  f:"EXW UNIT AED x FREIGHT %",                       e:"e.g. 361 x 10% = 36.10" },
    { l:"FREIGHT TOTAL", f:"FREIGHT UNIT x QTY",                             e:"e.g. 36.10 x 10 = 361" },
    { l:"INS UNIT",      f:"EXW UNIT AED x INS %",                           e:"e.g. 361 x 1% = 3.61" },
    { l:"CUSTOMS UNIT",  f:"EXW UNIT AED x CUSTOMS %",                       e:"e.g. 361 x 6% = 21.66" },
    { l:"SAMPLES UNIT",  f:"EXW UNIT AED x SAMPLES %",                       e:"e.g. 361 x 1% = 3.61" },
    { l:"LC UNIT",       f:"EXW UNIT AED x LC %",                            e:"e.g. 361 x 2% = 7.22" },
    { l:"LANDED UNIT",   f:"EXW + FRT + INS + CUST + SAM + LC",              e:"e.g. 361+36.1+3.61+21.66+3.61+7.22 = 433.20" },
    { l:"LANDED TOTAL",  f:"LANDED UNIT x QTY",                              e:"e.g. 433.20 x 10 = 4,332" },
    { l:"UNIT SELL",     f:"LANDED UNIT x MARKUP  (rounded to nearest AED)", e:"e.g. 433.20 x 1.50 = 650" },
    { l:"TOTAL SELL",    f:"UNIT SELL x QTY",                                e:"e.g. 650 x 10 = 6,500" },
    { l:"GM %",          f:"(UNIT SELL - LANDED UNIT) / UNIT SELL x 100",    e:"e.g. (650 - 433.20) / 650 = 33.4%" },
    { l:"FX RATE",       f:"Exchange Rates table (set in Project Details)",   e:"EUR / USD / GBP per AED" },
];

// ── Render workspace ──────────────────────────────────────────────────────────
function render_workspace(frm) {
    const ctrl = frm.fields_dict && frm.fields_dict.nl_workspace;
    if (!ctrl) return;

    if (!frm.doc.nl_mode) {
        ctrl.html(`
<div style="text-align:center;padding:52px 20px;background:#f8f9ff;
  border:2px dashed #c0c8e0;border-radius:10px;margin:4px 0;">
  <div style="font-size:34px;margin-bottom:10px;">&#128202;</div>
  <div style="font-size:16px;font-weight:700;color:#1a1a3e;margin-bottom:6px;">NL Lighting View</div>
  <div style="font-size:12px;color:#777;max-width:440px;margin:0 auto 22px;line-height:1.6;">
    Full Excel-style costing workspace with live formula cascade, landed cost, markup &amp; GM%.
  </div>
  <button id="nl-activate-btn" style="background:#1a1a3e;color:#fff;border:none;border-radius:8px;
    padding:12px 34px;font-size:13px;font-weight:700;cursor:pointer;
    box-shadow:0 4px 16px rgba(26,26,62,.3);">
    &#128202; Activate NL Lighting View
  </button>
</div>`);
        return;
    }

    const lines = frm.doc.nl_quotation_lines || [];
    let tot_exw = 0, tot_land = 0, tot_sell = 0, tot_qty = 0;
    lines.forEach(r => {
        if (r.nl_row_type === "Main Item") {
            tot_exw  += flt(r.nl_exworks_total_aed);
            tot_land += flt(r.nl_landed_total_aed);
            tot_sell += flt(r.nl_total_sell_aed);
        }
        tot_qty += flt(r.nl_qty);
    });

    const proj = frm.doc.nl_project_name  || "&#x2014;";
    const ref  = frm.doc.nl_ref_number    || "&#x2014;";
    const date = frm.doc.nl_project_date  || frm.doc.transaction_date || "&#x2014;";
    const cust = frm.doc.customer_name    || "&#x2014;";

    let html = WS_CSS + `<div class="nl-ws" id="nl-ws-root">`;

    // ── Top bar ───────────────────────────────────────────────────────────────
    html += `
<div class="nl-bar">
  <div class="nl-pinfo">
    <span class="lbl">PROJECT</span><span class="val">${proj}</span>
    <span class="sp">|</span>
    <span class="lbl">REF</span><span class="val">${ref}</span>
    <span class="sp">|</span>
    <span class="lbl">CUSTOMER</span><span class="val">${cust}</span>
    <span class="sp">|</span>
    <span class="lbl">DATE</span><span class="val">${date}</span>
  </div>
  <div class="nl-ctrl"><label>FREIGHT%</label>
    <input type="number" class="nl-gi" data-f="nl_freight_pct"    value="${flt(frm.doc.nl_freight_pct)||10}"    step="0.1"></div>
  <div class="nl-ctrl"><label>INS%</label>
    <input type="number" class="nl-gi" data-f="nl_insurance_pct"  value="${flt(frm.doc.nl_insurance_pct)||1}"   step="0.1"></div>
  <div class="nl-ctrl"><label>CUST%</label>
    <input type="number" class="nl-gi" data-f="nl_customs_pct"    value="${flt(frm.doc.nl_customs_pct)||6}"     step="0.1"></div>
  <div class="nl-ctrl"><label>SAM%</label>
    <input type="number" class="nl-gi" data-f="nl_samples_pct"    value="${flt(frm.doc.nl_samples_pct)||1}"     step="0.1"></div>
  <div class="nl-ctrl"><label>LC%</label>
    <input type="number" class="nl-gi" data-f="nl_lc_pct"         value="${flt(frm.doc.nl_lc_pct)||2}"         step="0.1"></div>
  <div class="nl-ctrl"><label>MARKUP</label>
    <input type="number" class="nl-gi" data-f="nl_default_markup" value="${flt(frm.doc.nl_default_markup)||1.5}" step="0.05"></div>
  <button class="nl-add-btn" id="nl-add-btn">+ Add Row</button>
  <button class="nl-ibtn" id="nl-fs-btn">&#9974; Expand</button>
  <button class="nl-ibtn" id="nl-excel-btn">&#8595; Excel</button>
  <button class="nl-std-btn" id="nl-deactivate-btn">&#8592; Standard View</button>
</div>`;

    // ── Table ─────────────────────────────────────────────────────────────────
    html += `<div class="nl-wrap"><table class="nl-t"><thead>`;

    html += `<tr class="nl-grp"><th class="rn"></th>`;
    GROUPS.forEach(g => {
        html += `<th colspan="${g.n}" style="background:${g.bg};">${g.label}</th>`;
    });
    html += `</tr><tr class="nl-hdr"><th class="rn">#</th>`;
    COLS.forEach(([f, lbl, w]) => {
        const cls = f === "nl_is" ? " stk0" : "";
        html += `<th class="${cls}" style="min-width:${w}px;width:${w}px;">${lbl}</th>`;
    });
    html += `</tr></thead><tbody>`;

    lines.forEach((row, idx) => {
        const rt  = row.nl_row_type || "Main Item";
        const rs  = ROW_STYLE[rt] || ROW_STYLE["Main Item"];
        const ind = (row.nl_is || "").includes(".");
        const tips = fx_tip(row);

        html += `<tr data-rowname="${row.name}"><td class="rn">${idx + 1}</td>`;

        COLS.forEach(([f,,,align]) => {
            const isStk  = f === "nl_is";
            const isLand = ["nl_landed_unit_aed","nl_landed_total_aed"].includes(f);
            const isSell = ["nl_unit_sell_aed","nl_total_sell_aed"].includes(f);
            const isFX   = f === "nl_fx_rate";

            let cls = "";
            if (isStk)  cls += " stk0";
            if (isLand) cls += " land";
            if (isSell) cls += " sell";
            if (isFX)   cls += " fxc";
            if (align === "r") cls += " r";
            if (align === "c") cls += " c";

            let sty = `background:${rs.bg};color:${rs.fg};`;
            if (isStk) {
                sty += `border-left:${rs.lb};`;
                if (ind) sty += "padding-left:18px;";
            }

            const tip = tips[f] ? ` title="${tips[f]}"` : "";
            html += `<td class="${cls.trim()}" style="${sty}"${tip}>${cell_val(row, f)}</td>`;
        });
        html += `</tr>`;
    });

    html += `<tr class="nl-tot"><td class="rn">&#931;</td>`;
    COLS.forEach(([f,,,align]) => {
        const cls = align === "r" ? " r" : align === "c" ? " c" : "";
        let c = "";
        if (f === "nl_is")                   c = `<strong>TOTAL</strong>`;
        else if (f === "nl_exworks_total_aed") c = `<span class="tl">${fmt0(tot_exw)}</span>`;
        else if (f === "nl_landed_total_aed")  c = `<span class="tl">${fmt0(tot_land)}</span>`;
        else if (f === "nl_total_sell_aed")    c = `<span class="ts">${fmt0(tot_sell)}</span>`;
        else if (f === "nl_qty")               c = `<span class="ts">${fmt0(tot_qty)}</span>`;
        html += `<td class="${cls.trim()}">${c}</td>`;
    });
    html += `</tr></tbody></table></div>`;

    // ── Formula reference ─────────────────────────────────────────────────────
    html += `
<div class="nl-fref">
  <div class="nl-fref-hdr" id="nl-fref-toggle">
    &#128208; Formula Reference
    <span class="hint">&#x2014; hover any calculated cell to see its live formula with actual values</span>
    <span class="arr" id="nl-fref-arr">&#9658; Show</span>
  </div>
  <div class="nl-fref-body" id="nl-fref-body">
    <div class="nl-fref-grid">`;
    FORMULA_REF.forEach(({ l, f, e }) => {
        html += `<div class="nl-fi">
      <div class="fi-l">${l}</div>
      <div class="fi-f">= ${f}</div>
      <div class="fi-e">${e}</div>
    </div>`;
    });
    html += `</div></div></div>`;

    // ── Brand summary ─────────────────────────────────────────────────────────
    const bd = brand_summary(frm);
    const brands = Object.keys(bd).sort();
    if (brands.length) {
        const ge = brands.reduce((s,b)=>s+bd[b].exw, 0);
        const gl = brands.reduce((s,b)=>s+bd[b].land,0);
        const gs = brands.reduce((s,b)=>s+bd[b].sell,0);
        const gm = gs > 0 ? ((gs-gl)/gs*100).toFixed(1)+"%" : "&#x2014;";
        html += `
<div class="nl-bsum">
  <div class="nl-bsum-hdr">BRAND SUMMARY
    <span class="bst">EXW: <strong>AED ${fmt0(ge)}</strong> &nbsp;|&nbsp;
      Landed: <strong>AED ${fmt0(gl)}</strong> &nbsp;|&nbsp;
      Sell: <strong>AED ${fmt0(gs)}</strong> &nbsp;|&nbsp;
      GM: <strong style="color:#7cf59d;">${gm}</strong></span>
  </div>
  <table><thead><tr>
    <th style="text-align:left;min-width:130px;">BRAND</th>
    <th>EXW TOTAL</th><th>% EXW</th>
    <th>LANDED</th><th>% LND</th>
    <th>PROFIT</th><th>SELL TOTAL</th><th>% SELL</th>
  </tr></thead><tbody>`;
        brands.forEach(b => {
            const d = bd[b];
            html += `<tr>
    <td>${b}</td>
    <td>${fmt2(d.exw)}</td><td>${ge ? flt(d.exw/ge*100).toFixed(1)+"%" : ""}</td>
    <td>${fmt2(d.land)}</td><td>${gl ? flt(d.land/gl*100).toFixed(1)+"%" : ""}</td>
    <td style="color:#27ae60;font-weight:600;">${fmt2(d.sell-d.land)}</td>
    <td style="font-weight:700;">${fmt0(d.sell)}</td>
    <td>${gs ? flt(d.sell/gs*100).toFixed(1)+"%" : ""}</td>
  </tr>`;
        });
        html += `</tbody><tfoot><tr>
    <td>TOTAL</td><td>${fmt2(ge)}</td><td>100%</td>
    <td>${fmt2(gl)}</td><td>100%</td>
    <td style="color:#27ae60;">${fmt2(gs-gl)}</td>
    <td style="color:#1a3d1a;font-weight:700;">${fmt0(gs)}</td><td>100%</td>
  </tr></tfoot></table>
</div>`;
    }

    html += `</div>`; // .nl-ws
    ctrl.html(html);
}

// ── Events ────────────────────────────────────────────────────────────────────
function setup_events(frm) {
    frm.$wrapper.off(".nl-ws");

    frm.$wrapper.on("click.nl-ws", "#nl-activate-btn",   () => set_nl_mode(frm, true));
    frm.$wrapper.on("click.nl-ws", "#nl-deactivate-btn", () => set_nl_mode(frm, false));
    frm.$wrapper.on("click.nl-ws", "#nl-add-btn",        () => open_add_dialog(frm));

    frm.$wrapper.on("click.nl-ws", "#nl-excel-btn", function() {
        window.location.href = frappe.urllib.get_full_url(
            `/api/method/newline.newline.api.download_costing_excel?quotation=${encodeURIComponent(frm.doc.name)}`
        );
    });

    frm.$wrapper.on("click.nl-ws", "#nl-fs-btn", function() {
        const ws  = frm.$wrapper.find("#nl-ws-root");
        const btn = $(this);
        if (ws.hasClass("nl-fs")) {
            ws.removeClass("nl-fs");
            $("body").removeClass("nl-fs-active");
            btn.html("&#9974; Expand");
        } else {
            ws.addClass("nl-fs");
            $("body").addClass("nl-fs-active");
            btn.html("&#8855; Exit Full Screen");
        }
    });

    frm.$wrapper.on("click.nl-ws", "#nl-fref-toggle", function() {
        const body = frm.$wrapper.find("#nl-fref-body");
        const arr  = frm.$wrapper.find("#nl-fref-arr");
        const open = body.is(":visible");
        body.slideToggle(150);
        arr.html(open ? "&#9658; Show" : "&#9660; Hide");
    });

    frm.$wrapper.on("click.nl-ws", ".nl-edit-btn", function(e) {
        e.stopPropagation();
        const row = (frm.doc.nl_quotation_lines||[]).find(r=>r.name===$(this).data("rowname"));
        if (row) open_row_dialog(frm, row);
    });
    frm.$wrapper.on("dblclick.nl-ws", "tr[data-rowname]", function() {
        const row = (frm.doc.nl_quotation_lines||[]).find(r=>r.name===$(this).data("rowname"));
        if (row) open_row_dialog(frm, row);
    });

    const GI_MAP = {
        nl_freight_pct:   "nl_ship_pct",
        nl_insurance_pct: "nl_ins_pct",
        nl_customs_pct:   "nl_cus_pct",
        nl_samples_pct:   "nl_sam_pct",
        nl_lc_pct:        "nl_lc_pct",
        nl_default_markup:"nl_markup",
    };
    frm.$wrapper.on("change.nl-ws", ".nl-gi", function() {
        const field = $(this).data("f");
        const val   = parseFloat($(this).val()) || 0;
        frm.set_value(field, val);
        (frm.doc.nl_quotation_lines||[]).forEach(r => {
            if (GI_MAP[field]) r[GI_MAP[field]] = val;
        });
        calc_all(frm);
        render_workspace(frm);
    });
}

// ── Mode toggle ───────────────────────────────────────────────────────────────
function set_nl_mode(frm, enable) {
    if (!enable) $("body").removeClass("nl-fs-active");
    frm.doc.nl_mode = enable ? 1 : 0;
    ["items_section","items","pricing_rule_section"].forEach(f =>
        frm.set_df_property(f, "hidden", enable ? 1 : 0));
    ["nl_section_project","nl_section_costs","nl_quotation_lines",
     "nl_brand_summary","nl_section_summary"
    ].forEach(f => frm.set_df_property(f, "hidden", enable ? 1 : 0));
    if (enable) calc_all(frm);
    render_workspace(frm);
    frm.refresh_header();
}

// ── Row dialog ────────────────────────────────────────────────────────────────
function apply_row(frm, row, values) {
    Object.assign(row, values);
    if (!row.nl_fx_rate || values.nl_exw_currency)
        row.nl_fx_rate = get_fx(frm, row.nl_exw_currency || "USD");
    row.nl_row_type = detect_row_type(row);
    calc_row(frm, row);
    frm.dirty();
    render_workspace(frm);
}

function open_row_dialog(frm, row) {
    const d = new frappe.ui.Dialog({
        title: `Edit — ${row.nl_proposed_product || "Row " + (row.nl_is || "")}`,
        size: "large",
        fields: [
            { fieldtype:"Section Break", label:"Product Identity" },
            { fieldtype:"Data",   fieldname:"nl_is",              label:"IS #",          default: row.nl_is },
            { fieldtype:"Select", fieldname:"nl_row_type",        label:"Row Type",      default: row.nl_row_type||"Main Item", options:"Main Item\nAccessory\nDriver" },
            { fieldtype:"Data",   fieldname:"nl_product_package", label:"Package",       default: row.nl_product_package },
            { fieldtype:"Select", fieldname:"nl_specification",   label:"Specification", default: row.nl_specification, options:"\nSpecified\nEqually Approved\nApproved Vendor List\nAlternative" },
            { fieldtype:"Link",   fieldname:"nl_product_type",    label:"Item Code",     default: row.nl_product_type, options:"Item",
              onchange: function() {
                  const code = d.get_value("nl_product_type");
                  if (!code) return;
                  frappe.db.get_doc("Item", code).then(item => {
                      const upd = {};
                      if (item.brand)                upd.nl_proposed_brand       = item.brand;
                      if (item.brand)                upd.nl_supplier_brand       = item.brand;
                      if (item.nl_reference_number)  upd.nl_proposed_product     = item.nl_reference_number;
                      if (item.description)          upd.nl_proposed_description = item.description;
                      if (item.nl_ex_works_price)    upd.nl_uexw_value           = item.nl_ex_works_price;
                      if (item.nl_purchase_currency) upd.nl_exw_currency         = item.nl_purchase_currency;
                      if (item.nl_image)             upd.nl_image                = item.nl_image;
                      d.set_values(upd);
                  });
              }
            },
            { fieldtype:"Data",   fieldname:"nl_location",        label:"Location",      default: row.nl_location },
            { fieldtype:"Column Break" },
            { fieldtype:"Data",   fieldname:"nl_proposed_brand",       label:"Proposed Brand",   default: row.nl_proposed_brand },
            { fieldtype:"Data",   fieldname:"nl_proposed_product",     label:"Proposed Product", default: row.nl_proposed_product },
            { fieldtype:"Text",   fieldname:"nl_proposed_description", label:"Description",      default: row.nl_proposed_description },
            { fieldtype:"Attach Image", fieldname:"nl_image",          label:"Image",            default: row.nl_image },
            { fieldtype:"Section Break", label:"Pricing (EXW)" },
            { fieldtype:"Select",  fieldname:"nl_price_type",     label:"Price Type", default: row.nl_price_type, options:"\nAccurate\nEstimated" },
            { fieldtype:"Data",    fieldname:"nl_supplier_brand", label:"Sup. Brand", default: row.nl_supplier_brand },
            { fieldtype:"Currency",fieldname:"nl_uexw_value",     label:"U.EXW",      default: row.nl_uexw_value },
            { fieldtype:"Percent", fieldname:"nl_discount_pct",   label:"Discount %", default: row.nl_discount_pct },
            { fieldtype:"Select",  fieldname:"nl_exw_currency",   label:"Currency",   default: row.nl_exw_currency||"USD", options:"EUR\nUSD\nAED\nGBP" },
            { fieldtype:"Column Break" },
            { fieldtype:"Float",  fieldname:"nl_markup",          label:"Markup x",   default: row.nl_markup||1.5, precision:2 },
            { fieldtype:"Float",  fieldname:"nl_qty",             label:"Qty",        default: row.nl_qty },
            { fieldtype:"Select", fieldname:"nl_uom",             label:"UOM",        default: row.nl_uom||"Nos", options:"Nos\nMeter\nSet" },
            { fieldtype:"Select", fieldname:"nl_approval_risk",   label:"Risk",       default: row.nl_approval_risk, options:"\nHigh\nMedium\nLow" },
            { fieldtype:"Section Break", label:"Cost % Overrides (0 = use global)" },
            { fieldtype:"Percent", fieldname:"nl_ship_pct", label:"Freight %",    default: row.nl_ship_pct },
            { fieldtype:"Percent", fieldname:"nl_ins_pct",  label:"Insurance %",  default: row.nl_ins_pct },
            { fieldtype:"Percent", fieldname:"nl_cus_pct",  label:"Customs %",    default: row.nl_cus_pct },
            { fieldtype:"Column Break" },
            { fieldtype:"Percent", fieldname:"nl_sam_pct",  label:"Samples %",   default: row.nl_sam_pct },
            { fieldtype:"Percent", fieldname:"nl_lc_pct",   label:"LC %",        default: row.nl_lc_pct },
            { fieldtype:"Section Break", label:"Alternatives" },
            { fieldtype:"Data", fieldname:"nl_alt1_brand",       label:"Alt 1 Brand",   default: row.nl_alt1_brand },
            { fieldtype:"Data", fieldname:"nl_alt1_product",     label:"Alt 1 Product", default: row.nl_alt1_product },
            { fieldtype:"Text", fieldname:"nl_alt1_description", label:"Alt 1 Desc",    default: row.nl_alt1_description },
            { fieldtype:"Column Break" },
            { fieldtype:"Data", fieldname:"nl_alt2_brand",       label:"Alt 2 Brand",   default: row.nl_alt2_brand },
            { fieldtype:"Data", fieldname:"nl_alt2_product",     label:"Alt 2 Product", default: row.nl_alt2_product },
            { fieldtype:"Text", fieldname:"nl_alt2_description", label:"Alt 2 Desc",    default: row.nl_alt2_description },
        ],
        primary_action_label: "Save Row",
        primary_action(values) {
            apply_row(frm, row, values);
            d.hide();
        },
        secondary_action_label: "Delete Row",
        secondary_action() {
            frappe.confirm("Delete this row?", () => {
                frm.doc.nl_quotation_lines = (frm.doc.nl_quotation_lines||[]).filter(r=>r.name!==row.name);
                frm.dirty(); render_workspace(frm); d.hide();
            });
        },
    });
    d.show();
    d.$wrapper.find(".modal-dialog").css("max-width","820px");
}

function open_add_dialog(frm) {
    const nr   = frappe.model.add_child(frm.doc, "NL Quotation Line", "nl_quotation_lines");
    const nums = (frm.doc.nl_quotation_lines||[]).map(r=>parseInt(r.nl_is)||0).filter(n=>n>0);
    nr.nl_is           = nums.length ? String(Math.max(...nums) + 1) : "1";
    nr.nl_row_type     = "Main Item";
    nr.nl_uom          = "Nos";
    nr.nl_markup       = flt(frm.doc.nl_default_markup)  || 1.5;
    nr.nl_ship_pct     = flt(frm.doc.nl_freight_pct)     || 10;
    nr.nl_ins_pct      = flt(frm.doc.nl_insurance_pct)   || 1;
    nr.nl_cus_pct      = flt(frm.doc.nl_customs_pct)     || 6;
    nr.nl_sam_pct      = flt(frm.doc.nl_samples_pct)     || 1;
    nr.nl_lc_pct       = flt(frm.doc.nl_lc_pct)          || 2;
    nr.nl_exw_currency = "USD";
    open_row_dialog(frm, nr);
}

// ── Frappe form hooks ─────────────────────────────────────────────────────────
frappe.ui.form.on("Quotation", {
    onload(frm) {
        if (frm.is_new() && !(frm.doc.nl_exchange_rates||[]).length) {
            Object.entries(NL_DEFAULTS.exchange_rates).forEach(([cur, rate]) => {
                const r = frappe.model.add_child(frm.doc, "NL Exchange Rate", "nl_exchange_rates");
                r.currency = cur; r.rate = rate;
            });
        }
        if (frm.is_new() && !frm.doc.nl_project_date)
            frm.doc.nl_project_date = frappe.datetime.get_today();
    },

    refresh(frm) {
        frm.add_custom_button(
            frm.doc.nl_mode ? "Standard View" : "NL Lighting View",
            () => set_nl_mode(frm, !frm.doc.nl_mode)
        );
        setup_events(frm);
        render_workspace(frm);
        if (frm.doc.nl_mode) {
            ["items_section","items","pricing_rule_section"].forEach(f =>
                frm.set_df_property(f, "hidden", 1));
            ["nl_section_project","nl_section_costs","nl_quotation_lines",
             "nl_brand_summary","nl_section_summary"
            ].forEach(f => frm.set_df_property(f, "hidden", 1));
        }
    },

    nl_freight_pct(frm)   { (frm.doc.nl_quotation_lines||[]).forEach(r=>r.nl_ship_pct=flt(frm.doc.nl_freight_pct));   calc_all(frm); render_workspace(frm); },
    nl_insurance_pct(frm) { (frm.doc.nl_quotation_lines||[]).forEach(r=>r.nl_ins_pct =flt(frm.doc.nl_insurance_pct));  calc_all(frm); render_workspace(frm); },
    nl_customs_pct(frm)   { (frm.doc.nl_quotation_lines||[]).forEach(r=>r.nl_cus_pct =flt(frm.doc.nl_customs_pct));    calc_all(frm); render_workspace(frm); },
    nl_samples_pct(frm)   { (frm.doc.nl_quotation_lines||[]).forEach(r=>r.nl_sam_pct =flt(frm.doc.nl_samples_pct));    calc_all(frm); render_workspace(frm); },
    nl_lc_pct(frm)        { (frm.doc.nl_quotation_lines||[]).forEach(r=>r.nl_lc_pct  =flt(frm.doc.nl_lc_pct));         calc_all(frm); render_workspace(frm); },
    nl_default_markup(frm){ (frm.doc.nl_quotation_lines||[]).forEach(r=>r.nl_markup   =flt(frm.doc.nl_default_markup)); calc_all(frm); render_workspace(frm); },
});

frappe.ui.form.on("NL Exchange Rate", {
    rate(frm)     { calc_all(frm); render_workspace(frm); },
    currency(frm) { calc_all(frm); render_workspace(frm); },
});
