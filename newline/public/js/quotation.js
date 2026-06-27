
const NL_DEFAULTS = { exchange_rates: { EUR: 4.5, USD: 3.8, AED: 1.0, GBP: 5.2 } };

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

function calc_row(frm, row) {
    const qty  = flt(row.qty);
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

    row.rate   = sell;
    row.amount = sell * qty;
}
function calc_all(frm) {
    (frm.doc.items || []).forEach(r => calc_row(frm, r));
    frm.dirty();
}

function fx_tip(row) {
    const e  = flt(row.nl_exworks_unit_aed);
    return {
        nl_net_uexw:          `NET EXW = ${fmt2(row.nl_uexw_value)} x (1 - ${flt(row.nl_discount_pct).toFixed(1)}%) = ${fmt2(row.nl_net_uexw)}`,
        nl_tot_exw:           `TOT EXW = NET EXW ${fmt2(row.nl_net_uexw)} x QTY ${flt(row.qty)} = ${fmt2(row.nl_tot_exw)}`,
        nl_exworks_unit_aed:  `EXW UNIT AED = NET EXW ${fmt2(row.nl_net_uexw)} x FX ${fmt4(row.nl_fx_rate)} = ${fmt2(e)}`,
        nl_exworks_total_aed: `EXW TOT AED = EXW UNIT ${fmt2(e)} x QTY ${flt(row.qty)} = ${fmt2(row.nl_exworks_total_aed)}`,
        nl_ship_unit_aed:     `FREIGHT UNIT = EXW ${fmt2(e)} x ${flt(row.nl_ship_pct).toFixed(1)}% = ${fmt2(row.nl_ship_unit_aed)}`,
        nl_ship_total_aed:    `FREIGHT TOTAL = FREIGHT UNIT ${fmt2(row.nl_ship_unit_aed)} x QTY ${flt(row.qty)} = ${fmt2(row.nl_ship_total_aed)}`,
        nl_ins_unit_aed:      `INS UNIT = EXW ${fmt2(e)} x ${flt(row.nl_ins_pct).toFixed(1)}% = ${fmt2(row.nl_ins_unit_aed)}`,
        nl_ins_total_aed:     `INS TOTAL = INS UNIT ${fmt2(row.nl_ins_unit_aed)} x QTY ${flt(row.qty)} = ${fmt2(row.nl_ins_total_aed)}`,
        nl_cus_unit_aed:      `CUSTOMS UNIT = EXW ${fmt2(e)} x ${flt(row.nl_cus_pct).toFixed(1)}% = ${fmt2(row.nl_cus_unit_aed)}`,
        nl_cus_total_aed:     `CUSTOMS TOTAL = ${fmt2(row.nl_cus_unit_aed)} x QTY ${flt(row.qty)} = ${fmt2(row.nl_cus_total_aed)}`,
        nl_sam_unit_aed:      `SAMPLES UNIT = EXW ${fmt2(e)} x ${flt(row.nl_sam_pct).toFixed(1)}% = ${fmt2(row.nl_sam_unit_aed)}`,
        nl_sam_total_aed:     `SAMPLES TOTAL = ${fmt2(row.nl_sam_unit_aed)} x QTY ${flt(row.qty)} = ${fmt2(row.nl_sam_total_aed)}`,
        nl_lc_unit_aed:       `LC UNIT = EXW ${fmt2(e)} x ${flt(row.nl_lc_pct).toFixed(1)}% = ${fmt2(row.nl_lc_unit_aed)}`,
        nl_lc_total_aed:      `LC TOTAL = ${fmt2(row.nl_lc_unit_aed)} x QTY ${flt(row.qty)} = ${fmt2(row.nl_lc_total_aed)}`,
        nl_landed_unit_aed:   `LANDED = EXW ${fmt2(e)} + FRT ${fmt2(row.nl_ship_unit_aed)} + INS ${fmt2(row.nl_ins_unit_aed)} + CST ${fmt2(row.nl_cus_unit_aed)} + SAM ${fmt2(row.nl_sam_unit_aed)} + LC ${fmt2(row.nl_lc_unit_aed)} = ${fmt2(row.nl_landed_unit_aed)}`,
        nl_landed_total_aed:  `LANDED TOT = LANDED UNIT ${fmt2(row.nl_landed_unit_aed)} x QTY ${flt(row.qty)} = ${fmt2(row.nl_landed_total_aed)}`,
        nl_unit_sell_aed:     `SELL UNIT = LANDED ${fmt2(row.nl_landed_unit_aed)} x ${flt(row.nl_markup).toFixed(2)}x = ${fmt0(row.nl_unit_sell_aed)} (rounded)`,
        nl_total_sell_aed:    `SELL TOT = SELL UNIT ${fmt0(row.nl_unit_sell_aed)} x QTY ${flt(row.qty)} = ${fmt0(row.nl_total_sell_aed)}`,
        nl_gm_pct:            `GM% = (${fmt0(row.nl_unit_sell_aed)} - ${fmt2(row.nl_landed_unit_aed)}) / ${fmt0(row.nl_unit_sell_aed)} x 100 = ${flt(row.nl_gm_pct).toFixed(1)}%`,
        nl_fx_rate:           `FX for ${row.nl_exw_currency || "USD"} from Exchange Rates table = ${fmt4(row.nl_fx_rate)}`,
    };
}

function brand_summary(frm) {
    const data = {};
    (frm.doc.items || []).forEach(r => {
        if (r.nl_row_type !== "Main Item") return;
        const b = r.nl_supplier_brand || r.nl_proposed_brand || "Unknown";
        if (!data[b]) data[b] = { exw: 0, land: 0, sell: 0 };
        data[b].exw  += flt(r.nl_tot_exw);
        data[b].land += flt(r.nl_landed_total_aed);
        data[b].sell += flt(r.nl_total_sell_aed);
    });
    return data;
}

const GROUPS = [
    { label: "PROPOSED PRODUCT DETAILS", bg: "#e8eaf6", fg: "#1a1a3e", n: 9 },
    { label: "",                          bg: "#e8eaf6", fg: "#1a1a3e", n: 1 },
    { label: "EXWORKS",                   bg: "#ddeaf5", fg: "#1e3a5f", n: 9 },
    { label: "FREIGHT",                   bg: "#e0f0e8", fg: "#1a4731", n: 3 },
    { label: "INSURANCE",                 bg: "#f5f0e0", fg: "#3d3416", n: 3 },
    { label: "CUSTOMS",                   bg: "#f5e8e8", fg: "#4a1e1e", n: 3 },
    { label: "SAMPLES",                   bg: "#ede8f5", fg: "#2d1a4a", n: 3 },
    { label: "LETTER OF CREDIT",          bg: "#e0f0f0", fg: "#1a3a3a", n: 3 },
    { label: "LANDED AED",                bg: "#dceaf5", fg: "#0a2a4a", n: 2 },
    { label: "SELLING",                   bg: "#e3f0e3", fg: "#1a3d1a", n: 4 },
    { label: "QTY",                       bg: "#f5ece0", fg: "#3d2000", n: 2 },
    { label: "RISK",                      bg: "#f5e3eb", fg: "#3d1a2a", n: 1 },
    { label: "PROJECT SPECIFICATIONS",    bg: "#f5ece3", fg: "#5c1a00", n: 4 },
];

const COLS = [
    ["nl_is",                   "IS",           36, "c"],
    ["nl_product_package",      "PKG",          80, "l"],
    ["nl_specification",        "SPEC",         95, "l"],
    ["item_code",               "TYPE",         85, "l"],
    ["nl_location",             "LOCATION",     80, "l"],
    ["nl_image",                "IMG",          54, "c"],
    ["nl_proposed_brand",       "BRAND",        80, "l"],
    ["nl_proposed_product",     "PRODUCT",     105, "l"],
    ["description",             "DESCRIPTION", 190, "l"],
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
    ["qty",                     "QTY",          48, "c"],
    ["uom",                     "UOM",          42, "c"],
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

const EDITABLE = {
    nl_is:               { t:"text", w:34 },
    nl_product_package:  { t:"text", w:78 },
    nl_specification:    { t:"sel", opts:["","Specified","Equally Approved","Approved Vendor List","Alternative"], w:92 },
    item_code:           { t:"link", options:"Item",  w:83 },
    nl_location:         { t:"text", w:78 },
    nl_proposed_brand:   { t:"link", options:"Brand", w:78 },
    nl_proposed_product: { t:"text", w:103 },
    description:         { t:"area", w:186 },
    nl_price_type:       { t:"sel", opts:["","Accurate","Estimated"], w:65 },
    nl_supplier_brand:   { t:"text", w:78 },
    nl_uexw_value:       { t:"num",  w:75 },
    nl_discount_pct:     { t:"num",  w:46 },
    nl_exw_currency:     { t:"sel", opts:["EUR","USD","AED","GBP"], w:34 },
    nl_markup:           { t:"num",  w:40 },
    nl_ship_pct:         { t:"num",  w:36 },
    nl_ins_pct:          { t:"num",  w:36 },
    nl_cus_pct:          { t:"num",  w:36 },
    nl_sam_pct:          { t:"num",  w:36 },
    nl_lc_pct:           { t:"num",  w:36 },
    qty:                 { t:"num",  w:46 },
    uom:                 { t:"text", w:40 },
    nl_approval_risk:    { t:"sel", opts:["","High","Medium","Low"], w:55 },
    nl_alt1_brand:       { t:"text", w:73 },
    nl_alt1_product:     { t:"text", w:90 },
    nl_alt2_brand:       { t:"text", w:73 },
    nl_alt2_product:     { t:"text", w:90 },
};
const NUM_FIELDS = new Set(["nl_uexw_value","nl_discount_pct","nl_markup",
    "nl_ship_pct","nl_ins_pct","nl_cus_pct","nl_sam_pct","nl_lc_pct","qty"]);

function cell_val(row, field) {
    const v = row[field];
    if (field === "__actions")
        return `<button class="nl-edit-btn"  data-rowname="${row.name}" title="Inline edit">&#9998;</button>` +
               `<button class="nl-popup-btn" data-rowname="${row.name}" title="Open full dialog">&#9783;</button>` +
               `<button class="nl-del-btn"   data-rowname="${row.name}" title="Delete row">&#128465;</button>`;
    if (field === "nl_image")
        return v ? `<img src="${v}" style="max-height:36px;max-width:46px;object-fit:contain;">` : "";
    if (field === "description") {
        const tmp = document.createElement("div");
        tmp.innerHTML = v || "";
        const plain = (tmp.textContent || tmp.innerText || "").trim();
        return `<span class="nl-desc">${plain}</span>`;
    }
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
    if (field === "qty") return v ? flt(v).toLocaleString("en-US") : "";
    return v || "";
}

const WS_CSS = `
<style>
.nl-ws{font-family:Arial,sans-serif;font-size:11px;color:#212529;background:#f4f6f9;padding:0;}
.nl-ws *{box-sizing:border-box;}
.nl-ws.nl-fs{position:fixed;top:0;left:0;right:0;bottom:0;z-index:2000;
  display:flex;flex-direction:column;overflow:hidden;background:#f4f6f9;}
.nl-ws.nl-fs .nl-wrap{max-height:none!important;flex:1;}
.nl-ws.nl-fs .nl-bar{border-radius:0;}
.nl-bar{display:flex;align-items:center;flex-wrap:wrap;gap:4px;
  background:#f8f9fc;color:#1a1a3e;padding:8px 12px;border-radius:6px 6px 0 0;
  flex-shrink:0;border-bottom:2px solid #dde3ee;}
.nl-pinfo{display:flex;align-items:center;gap:5px;font-size:10.5px;margin-right:6px;}
.nl-pinfo .lbl{color:#6070a0;font-size:8.5px;font-weight:700;text-transform:uppercase;}
.nl-pinfo .val{color:#1a1a3e;font-weight:600;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.nl-pinfo .sp{color:#c0c8d8;margin:0 1px;}
.nl-ctrl{display:flex;align-items:center;gap:3px;background:#eef1f8;border:1px solid #dde3ee;border-radius:4px;padding:3px 7px;}
.nl-ctrl label{font-size:8.5px;font-weight:700;color:#6070a0;text-transform:uppercase;white-space:nowrap;}
.nl-ctrl input{width:44px;background:#fff;border:1px solid #ccd3e0;border-radius:3px;
  padding:2px 4px;font-size:10.5px;color:#1a1a3e;text-align:right;}
.nl-ctrl input:focus{outline:1px solid #5080b0;background:#f8fbff;}
.nl-add-btn{background:#27ae60;color:#fff;border:none;border-radius:4px;padding:5px 12px;
  font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;margin-left:4px;}
.nl-add-btn:hover{background:#219d55;}
.nl-ibtn{background:#fff;color:#5060a0;border:1px solid #ccd3e0;border-radius:4px;
  padding:4px 9px;font-size:10px;cursor:pointer;white-space:nowrap;}
.nl-ibtn:hover{color:#1a1a3e;border-color:#5080b0;background:#f0f4ff;}
.nl-std-btn{background:#fff;color:#5060a0;border:1px solid #ccd3e0;border-radius:4px;
  padding:4px 9px;font-size:10px;cursor:pointer;white-space:nowrap;margin-left:auto;}
.nl-std-btn:hover{color:#1a1a3e;border-color:#5080b0;}
.nl-wrap{overflow:auto;border:1px solid #dde3ee;border-top:none;
  border-radius:0 0 6px 6px;max-height:calc(100vh - 180px);background:#fff;}
.nl-t{border-collapse:collapse;width:max-content;font-size:10.5px;}
.nl-t td,.nl-t th{border-right:1px solid #d4d8de;border-bottom:1px solid #d4d8de;
  padding:3px 5px;white-space:nowrap;vertical-align:middle;}
.nl-t .rn{background:#f4f6f9;color:#9090a0;font-size:9px;text-align:center;
  border-right:2px solid #cdd5e0;min-width:30px;width:30px;
  position:sticky;left:0;z-index:4;}
.nl-grp th{padding:5px 4px;font-size:9px;font-weight:700;text-align:center;
  letter-spacing:.7px;border-right:2px solid rgba(0,0,0,.08);
  position:sticky;top:0;z-index:13;}
.nl-grp-th{cursor:pointer;user-select:none;}
.nl-grp-th:hover{filter:brightness(.96);}
.nl-caret{font-size:8px;margin-left:4px;opacity:.6;}
.nl-grp-collapsed{display:none!important;}
.nl-col-lbl{display:inline;}
.nl-stub-lbl{display:none;}
.nl-stub-active{min-width:22px!important;max-width:22px!important;width:22px!important;padding:0!important;overflow:hidden!important;}
.nl-hdr .nl-stub-active .nl-col-lbl{display:none!important;}
.nl-hdr .nl-stub-active .nl-stub-lbl{display:block!important;writing-mode:vertical-lr;font-size:6.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:4px 2px;opacity:.75;white-space:nowrap;}
.nl-collapsed-hdr{min-width:22px!important;max-width:22px!important;overflow:hidden!important;font-size:0!important;padding:3px 0!important;}
.nl-collapsed-hdr .nl-caret{font-size:13px!important;opacity:1;margin:0;}
.nl-grp .rn{background:#f0f2f6!important;border-right:2px solid #cdd5e0;}
.nl-hdr th{font-size:9px;font-weight:700;color:#2a3a5a;text-align:center;
  background:#f0f4f8;padding:4px 4px;
  border-right:1px solid #d4d8de;border-bottom:2px solid #cdd5e0;
  position:sticky;top:31px;z-index:12;}
.nl-hdr .rn{background:#f0f4f8;position:sticky;left:0;z-index:20;top:31px;}
.nl-hdr th.stk0{position:sticky;left:30px;z-index:20;background:#f0f4f8;}
.nl-t tbody tr:hover td{background:#fffde7!important;}
.nl-t tbody tr:hover .rn{background:#e8e8f0!important;}
.nl-t td.stk0{position:sticky;left:30px;z-index:5;border-right:3px solid #c4c8d0;}
.nl-t td.r{text-align:right;}
.nl-t td.c{text-align:center;}
.nl-t td.land{background:#e8f0fa;}
.nl-t td.sell{background:#e8f5e9;}
.nl-t td.fxc{background:#fffff0;}
.nl-t td[title]{cursor:help;}
.nl-tot td{background:#111828!important;color:#fff;font-weight:700;padding:5px 5px;
  border-right:1px solid rgba(255,255,255,.15);}
.nl-tot .rn{background:#080e1c!important;color:#505070;}
.nl-tot .tl{color:#7bb8f5;}
.nl-tot .ts{color:#7cf59d;}
.nl-popup-btn{background:none;border:1px solid #c8d4e8;border-radius:3px;
  padding:1px 4px;cursor:pointer;font-size:11px;color:#3a5a9a;margin-left:2px;line-height:1;}
.nl-popup-btn:hover{background:#3a5a9a;color:#fff;border-color:#3a5a9a;}
.nl-del-btn{background:none;border:1px solid #f0c0c0;border-radius:3px;
  padding:1px 4px;cursor:pointer;font-size:11px;color:#c0392b;margin-left:2px;line-height:1;}
.nl-del-btn:hover{background:#c0392b;color:#fff;border-color:#c0392b;}
.nl-edit-btn{background:none;border:1px solid #c0c8d8;border-radius:3px;
  padding:1px 6px;cursor:pointer;font-size:12px;color:#555;}
.nl-edit-btn:hover{background:#1a1a3e;color:#fff;border-color:#1a1a3e;}
.nl-clip{display:block;overflow:hidden;text-overflow:ellipsis;max-width:188px;}
.nl-fref{margin-top:8px;background:#fff;border:1px solid #dde3ee;border-radius:6px;overflow:hidden;}
.nl-fref-hdr{background:#f0f4f8;color:#2a3a5a;padding:8px 14px;font-size:10.5px;
  font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;user-select:none;}
.nl-fref-hdr:hover{background:#e8eef5;}
.nl-fref-hdr .hint{font-weight:400;color:#7080a0;font-size:9px;}
.nl-fref-hdr .arr{margin-left:auto;font-size:10px;color:#7080a0;}
.nl-fref-body{display:none;padding:12px 16px;background:#f8f9fc;}
.nl-fref-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:6px 18px;}
.nl-fi{background:#fff;border:1px solid #dde2ec;border-radius:4px;padding:7px 10px;}
.nl-fi .fi-l{font-size:9px;font-weight:700;color:#7080a0;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;}
.nl-fi .fi-f{font-size:11px;color:#1a1a3e;font-family:'Courier New',monospace;font-weight:700;}
.nl-fi .fi-e{font-size:9.5px;color:#777;margin-top:3px;}
body.nl-fs-active .modal-backdrop{z-index:2050!important;}
body.nl-fs-active .modal{z-index:2100!important;}
.nl-bsum{margin-top:8px;border:1px solid #dde3ee;border-radius:6px;overflow:hidden;}
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
.nl-desc-cell{white-space:normal!important;vertical-align:top!important;}
.nl-desc{display:block;word-break:break-word;max-width:188px;line-height:1.4;white-space:normal;}
.nl-editing td{background:#fffef0!important;}
.nl-ie{font-size:10px;padding:2px 3px;border:1px solid #aab8d0;border-radius:2px;
  background:#fffef8;outline:none;box-sizing:border-box;}
.nl-ie:focus{border-color:#4a7ab5;background:#fff;}
.nl-ie[type=number]{text-align:right;}
textarea.nl-ie{resize:vertical;min-height:52px;}
select.nl-ie{max-width:100%;}
.nl-save-inline{background:#27ae60;color:#fff;border:none;border-radius:3px;
  padding:2px 6px;cursor:pointer;font-size:13px;margin-right:2px;}
.nl-cancel-inline{background:#e74c3c;color:#fff;border:none;border-radius:3px;
  padding:2px 6px;cursor:pointer;font-size:13px;}
.nl-link-drop{background:#fff;border:1px solid #b8c8e0;border-radius:5px;box-shadow:0 4px 14px rgba(0,0,0,.18);max-height:220px;overflow-y:auto;}
.nl-link-opt{padding:6px 10px;cursor:pointer;font-size:11px;white-space:nowrap;border-bottom:1px solid #f0f4f8;color:#1a2a4a;}
.nl-link-opt:last-child{border-bottom:none;}
.nl-link-opt:hover{background:#e8f0fe;color:#1a3a8a;}
.nl-add-row-tr{cursor:pointer;}
.nl-add-row-tr:hover td{background:#f0f7ff!important;color:#5080b0!important;}
</style>`;

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

function inject_form_theme(frm) {
    if (frm.$wrapper.find("#nl-form-theme").length) return;
    frm.$wrapper.find(".layout-main-section").prepend(`
<style id="nl-form-theme">
/* ── NL Quotation form — clean professional skin ─── */
.layout-main-section {
  background: #ffffff;
}
/* Section headers: white bg, left accent stripe, clean text */
.section-head, .section-head.collapsed {
  background: #ffffff !important;
  border: none !important;
  border-left: 3px solid #1a1a3e !important;
  border-radius: 0 !important;
  padding: 6px 12px !important;
  margin: 14px 0 8px !important;
  box-shadow: none !important;
}
.section-head .label-area {
  color: #1a1a3e !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: .6px !important;
  text-transform: uppercase !important;
}
.section-head .section-chevron { color: #8090b0 !important; }
/* Tabs: subtle style, active = brand navy */
.form-tabs-list .nav-item .nav-link {
  font-weight: 600;
  font-size: 12px;
  color: #6070a0;
  border-radius: 5px 5px 0 0;
  transition: background .12s, color .12s;
}
.form-tabs-list .nav-item .nav-link.active {
  background: #eef2ff !important;
  color: #3b5bdb !important;
  border-color: #c5d0f0 !important;
  border-bottom-color: #eef2ff !important;
}
.form-tabs-list .nav-item .nav-link:hover:not(.active) {
  background: #f0f2f8;
  color: #1a1a3e;
}
/* Inputs: clean with soft focus */
.control-label { color: #4a5a7a; font-size: 11px; font-weight: 600; }
.form-control { border-color: #dde2ee; border-radius: 5px; background: #fafbfd; }
.form-control:focus { border-color: #4a6aaa; box-shadow: 0 0 0 2px rgba(74,106,170,.12); background: #fff; }
/* Subtle row separator in child tables */
.grid-row { border-bottom: 1px solid #f0f2f8 !important; }
</style>`);
}

function render_top_button(frm) {
    frm.$wrapper.find("#nl-top-toggle-btn").remove();

    const on   = !!frm.doc.nl_mode;
    const proj = frm.doc.nl_project_name || "";
    const ref  = frm.doc.nl_ref_number   || "";
    const cust = frm.doc.customer_name   || "";

    let html;
    if (on) {

        const meta = [
            proj ? `<span style="color:#1a1a3e;font-weight:600;">${proj}</span>` : "",
            ref  ? `<span style="color:#6070a0;">REF ${ref}</span>` : "",
            cust ? `<span style="color:#6070a0;">${cust}</span>` : "",
        ].filter(Boolean).join(`<span style="color:#c0c8e0;margin:0 6px;">·</span>`);

        html = `
<div id="nl-top-toggle-btn" style="
    display:flex;align-items:center;gap:10px;
    background:#eef2ff;border-radius:7px;padding:9px 16px;margin-bottom:10px;
    border:1px solid #c5d0f0;border-left:3px solid #3b5bdb;
    box-shadow:0 2px 8px rgba(59,91,219,.12);
    position:sticky;top:0;z-index:100;">
  <span style="font-size:14px;line-height:1;">&#128202;</span>
  <span style="color:#3b5bdb;font-size:10px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;white-space:nowrap;">NL Workspace Active</span>
  <span style="color:#c0c8e0;margin:0 2px;">|</span>
  <span style="flex:1;font-size:11px;color:#3a4a6a;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${meta}</span>
  <button id="nl-top-excel-btn" style="
      background:#1a7a4a;color:#fff;border:none;border-radius:6px;
      padding:6px 16px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;
      box-shadow:0 2px 6px rgba(26,122,74,.35);">
    &#128190;&nbsp;Download Excel
  </button>
  <button id="nl-top-exit-btn" style="
      background:#fff;color:#5060a0;border:1px solid #c5d0f0;border-radius:5px;
      padding:5px 16px;font-size:10px;font-weight:600;cursor:pointer;white-space:nowrap;">
    &#10005;&nbsp;Exit
  </button>
</div>`;
    } else {

        html = `
<div id="nl-top-toggle-btn" style="
    display:flex;align-items:center;gap:14px;
    background:#fff;border-radius:8px;padding:12px 18px;margin-bottom:12px;
    border:1px solid #dde3f0;border-left:4px solid #3b5bdb;
    box-shadow:0 1px 6px rgba(59,91,219,.08);">
  <span style="font-size:22px;line-height:1;">&#128202;</span>
  <div style="flex:1;min-width:0;">
    <div style="color:#1a1a3e;font-size:12.5px;font-weight:800;letter-spacing:.3px;">NL Lighting View</div>
    <div style="color:#8090b0;font-size:10px;margin-top:2px;">Costing workspace — EXW → Landed → Markup → GM%</div>
  </div>
  <button id="nl-top-activate-btn" style="
      background:#3b5bdb;color:#fff;border:none;
      border-radius:6px;padding:8px 22px;font-size:11px;font-weight:700;
      cursor:pointer;white-space:nowrap;letter-spacing:.2px;
      box-shadow:0 2px 8px rgba(59,91,219,.3);transition:opacity .15s;">
    &#9654;&nbsp; Open Workspace
  </button>
</div>`;
    }

    frm.$wrapper.find(".layout-main-section").prepend(html);
}

function init_link_input(frm, row, $tr, $inp) {
    const doctype = $inp.data("linktype");
    const field   = $inp.data("field");
    let $drop = null;

    function close_drop() { if ($drop) { $drop.remove(); $drop = null; } }

    let _stimer = null;
    function do_search(txt) {
        clearTimeout(_stimer);
        _stimer = setTimeout(() => {
            const filter_arg = txt
                ? [["name", "like", "%" + txt + "%"]]
                : [];
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: doctype,
                    fields: ["name"],
                    filters: filter_arg,
                    limit_page_length: 12,
                    order_by: "name asc"
                },
                callback(r) {
                    close_drop();
                    const list = r.message || [];
                    if (!list.length) return;
                    $drop = $('<div class="nl-link-drop">');
                    list.forEach(item => {
                        const $opt = $(`<div class="nl-link-opt">${frappe.utils.escape_html(item.name)}</div>`);
                        $opt.on("mousedown", function(e) {
                            e.preventDefault();
                            $inp.val(item.name);
                            close_drop();
                            if (field === "item_code") {
                                frappe.call({
                                    method: "frappe.client.get",
                                    args: { doctype: "Item", name: item.name },
                                    callback(res) {
                                        if (!res.message) return;
                                        const it = res.message;

                                        if (it.item_name) row.item_name = it.item_name;

                                        const prod_val = it.nl_reference_number || it.item_name || "";
                                        if (prod_val) {
                                            const $prod = $tr.find('[data-field="nl_proposed_product"]');
                                            if ($prod.length && !$prod.val().trim()) {
                                                $prod.val(prod_val);
                                                row.nl_proposed_product = prod_val;
                                            }
                                        }

                                        const brand_val = it.brand || "";
                                        if (brand_val) {
                                            const $brand = $tr.find('[data-field="nl_proposed_brand"]');
                                            if ($brand.length && !$brand.val().trim()) {
                                                $brand.val(brand_val);
                                                row.nl_proposed_brand = brand_val;
                                            }
                                        }

                                        const $desc = $tr.find('[data-field="description"]');
                                        if ($desc.length && !$desc.val().trim()) {
                                            const tmp = document.createElement("div");
                                            tmp.innerHTML = it.description || "";
                                            $desc.val((tmp.textContent || tmp.innerText || "").trim());
                                        }
                                    }
                                });
                            }
                        });
                        $drop.append($opt);
                    });
                    const rect = $inp[0].getBoundingClientRect();
                    $drop.css({
                        position: "fixed",
                        top:  (rect.bottom + 2) + "px",
                        left: rect.left + "px",
                        "min-width": Math.max(rect.width, 200) + "px",
                        "z-index": 99999
                    });
                    $("body").append($drop);
                }
            });
        }, 100);
    }

    $inp.on("focus.nllink", function() { do_search($(this).val().trim()); });
    $inp.on("click.nllink",  function() { if (!$drop) do_search($(this).val().trim()); });
    $inp.on("input.nllink",  function() { do_search($(this).val().trim()); });
    $inp.on("blur.nllink",   () => setTimeout(close_drop, 250));
    $inp.on("keydown.nllink", function(e) {
        if (e.key === "Escape") { close_drop(); }
        if (e.key === "ArrowDown" && $drop) {
            $drop.find(".nl-link-opt").first().trigger("focus");
        }
    });
}

function enter_edit_mode(frm, row, $tr) {
    if ($tr.hasClass("nl-editing")) return;
    $tr.addClass("nl-editing");
    $tr.find("[data-field]").each(function() {
        const f  = $(this).data("field");
        if (f === "__actions") {
            $(this).html(
                `<button class="nl-save-inline" data-rowname="${row.name}" title="Save">&#10003;</button>` +
                `<button class="nl-cancel-inline" title="Cancel">&#10007;</button>`
            );
            return;
        }
        const ed = EDITABLE[f];
        if (!ed) return;
        const raw = row[f] !== undefined && row[f] !== null ? row[f] : "";
        let inp;
        if (ed.t === "area") {
            const tmp2 = document.createElement("div");
            tmp2.innerHTML = String(raw);
            const plain = (tmp2.textContent || tmp2.innerText || "").trim();
            inp = `<textarea class="nl-ie" data-field="${f}" style="width:${ed.w}px;">${plain}</textarea>`;
        } else if (ed.t === "sel") {
            const opts = ed.opts.map(o => `<option value="${o}"${String(raw)===o?" selected":""}>${o||"—"}</option>`).join("");
            inp = `<select class="nl-ie" data-field="${f}" style="width:${ed.w}px;">${opts}</select>`;
        } else if (ed.t === "link") {
            inp = `<input type="text" class="nl-ie nl-link-inp" data-field="${f}" data-linktype="${ed.options}" value="${String(raw).replace(/"/g,"&quot;")}" style="width:${ed.w}px;" autocomplete="off">`;
        } else {
            inp = `<input type="${ed.t==="num"?"number":"text"}" class="nl-ie" data-field="${f}" value="${String(raw).replace(/"/g,"&quot;")}" style="width:${ed.w}px;">`;
        }
        $(this).html(inp);
    });
    $tr.find(".nl-link-inp").each(function() { init_link_input(frm, row, $tr, $(this)); });
    $tr.find(".nl-ie").first().focus();
}

function collect_and_save(frm, row, $tr) {
    const values = {};
    $tr.find(".nl-ie").each(function() {
        const f = $(this).data("field");
        const v = $(this).val();
        values[f] = NUM_FIELDS.has(f) ? (parseFloat(v) || 0) : v;
    });

    const MANDATORY = {
        item_code:           "Item Code (TYPE)",
        nl_proposed_brand:   "Proposed Brand",
        nl_proposed_product: "Proposed Product",
    };
    const missing = Object.entries(MANDATORY)
        .filter(([f]) => !String(values[f] || "").trim())
        .map(([, lbl]) => `<b>${lbl}</b>`);
    if (missing.length) {
        frappe.msgprint({ title: "Required Fields", indicator: "red",
            message: `Please fill: ${missing.join(", ")}` });
        return;
    }

    if (!(values.qty > 0)) {
        frappe.msgprint({ title: "Invalid Quantity", indicator: "red",
            message: "Quantity must be greater than 0." });
        $tr.find('[data-field="qty"]').val(1).focus();
        return;
    }

    apply_row(frm, row, values);
}

function add_row_inline(frm) {
    if (frm.doc.docstatus !== 0) return;
    const nr = frappe.model.add_child(frm.doc, "Quotation Item", "items");
    const nums = (frm.doc.items||[]).map(r => parseInt(r.nl_is)||0).filter(n => n > 0);
    nr.nl_is           = nums.length ? String(Math.max(...nums) + 1) : "1";
    nr.nl_row_type     = "Main Item";
    nr.qty             = 1;
    nr.uom             = "Nos";
    nr.nl_markup       = flt(frm.doc.nl_default_markup)  || 1.5;
    nr.nl_ship_pct     = flt(frm.doc.nl_freight_pct)     || 10;
    nr.nl_ins_pct      = flt(frm.doc.nl_insurance_pct)   || 1;
    nr.nl_cus_pct      = flt(frm.doc.nl_customs_pct)     || 6;
    nr.nl_sam_pct      = flt(frm.doc.nl_samples_pct)     || 1;
    nr.nl_lc_pct       = flt(frm.doc.nl_lc_pct)          || 2;
    nr.nl_exw_currency = "USD";
    frm.dirty();
    render_workspace(frm);
    const $newTr = frm.$wrapper.find(`tr[data-rowname="${nr.name}"]`);
    if ($newTr.length) {
        enter_edit_mode(frm, nr, $newTr);
        $newTr[0].scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

const COLLAPSE_KEY = "nl_ws_col_collapse";
function get_collapsed() {
    try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || "{}"); } catch { return {}; }
}
function save_collapsed(obj) { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(obj)); }

let _colToGroup = [], _colStub = {}, _collapsedColspan = {};
let _ws_fullscreen = false;

function _do_collapse($ws, gi) {
    $ws.find(`[data-grp="${gi}"]`).not(".nl-grp-th").not(`[data-grp-stub="${gi}"]`).not("[data-no-collapse]").addClass("nl-grp-collapsed");
    $ws.find(`[data-grp-stub="${gi}"]`).addClass("nl-stub-active");
    $ws.find(`.nl-grp-th[data-grp="${gi}"]`).attr("colspan", _collapsedColspan[gi] || 1).addClass("nl-collapsed-hdr");
    $ws.find(`.nl-grp-th[data-grp="${gi}"] .nl-caret`).text("►");
}

function _do_expand($ws, gi) {
    $ws.find(`[data-grp="${gi}"]`).not(".nl-grp-th").removeClass("nl-grp-collapsed nl-stub-active");
    $ws.find(`.nl-grp-th[data-grp="${gi}"]`).attr("colspan", GROUPS[gi].n).removeClass("nl-collapsed-hdr");
    $ws.find(`.nl-grp-th[data-grp="${gi}"] .nl-caret`).text("▼");
}

function apply_collapse($ws) {
    const state = get_collapsed();
    GROUPS.forEach((g, gi) => { if (state[gi]) _do_collapse($ws, gi); });
}

function render_workspace(frm) {

    let $ws = frm.$wrapper.find("#nl-workspace-main");
    if (!$ws.length) {
        frm.$wrapper.find(".layout-main-section").append(
            '<div id="nl-workspace-main"></div>'
        );
        $ws = frm.$wrapper.find("#nl-workspace-main");
    }
    if (!frm.doc.nl_mode) { $ws.hide(); return; }
    $ws.show();

    const lines = frm.doc.items || [];
    let tot_exw = 0, tot_land = 0, tot_sell = 0, tot_qty = 0;
    lines.forEach(r => {
        if (r.nl_row_type === "Main Item") {
            tot_exw  += flt(r.nl_exworks_total_aed);
            tot_land += flt(r.nl_landed_total_aed);
            tot_sell += flt(r.nl_total_sell_aed);
        }
        tot_qty += flt(r.qty);
    });

    const proj = frm.doc.nl_project_name  || "&#x2014;";
    const ref  = frm.doc.nl_ref_number    || "&#x2014;";
    const date = frm.doc.nl_project_date  || frm.doc.transaction_date || "&#x2014;";
    const cust = frm.doc.customer_name    || "&#x2014;";

    let html = WS_CSS + `<div class="nl-ws" id="nl-ws-root">`;

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
</div>`;

    html += `<div class="nl-wrap"><table class="nl-t"><thead>`;

    _colToGroup = [];
    GROUPS.forEach((g, gi) => { for (let i = 0; i < g.n; i++) _colToGroup.push(gi); });

    _colStub = {};
    _colToGroup.forEach((gi, ci) => {
        if (gi in _colStub) return;
        if (COLS[ci][0] === "nl_is" || !GROUPS[gi].label) return;
        _colStub[gi] = ci;
    });

    _collapsedColspan = {};
    GROUPS.forEach((g, gi) => {
        let cnt = 0;
        _colToGroup.forEach((g2, ci) => {
            if (g2 !== gi) return;
            if (COLS[ci][0] === "nl_is" || _colStub[gi] === ci) cnt++;
        });
        _collapsedColspan[gi] = Math.max(cnt, 1);
    });

    html += `<tr class="nl-grp"><th class="rn"></th>`;
    GROUPS.forEach((g, gi) => {
        const grpCls  = g.label ? `nl-grp-th` : ``;
        const caret   = g.label ? `<span class="nl-caret">&#9660;</span>` : "";
        html += `<th colspan="${g.n}" class="${grpCls}" data-grp="${gi}" style="background:${g.bg};color:${g.fg};">${g.label}${caret}</th>`;
    });
    html += `</tr><tr class="nl-hdr"><th class="rn">#</th>`;
    COLS.forEach(([f, lbl, w], ci) => {
        const gi     = _colToGroup[ci];
        const cls    = f === "nl_is" ? " stk0" : "";
        const noC    = f === "nl_is" ? ` data-no-collapse` : "";
        const isStub = _colStub[gi] === ci;
        const stubA  = isStub ? ` data-grp-stub="${gi}"` : "";
        const inner  = (isStub && GROUPS[gi].label)
            ? `<span class="nl-col-lbl">${lbl}</span><span class="nl-stub-lbl">${GROUPS[gi].label}</span>`
            : `<span class="nl-col-lbl">${lbl}</span>`;
        html += `<th class="${cls}" data-grp="${gi}"${noC}${stubA} style="min-width:${w}px;width:${w}px;">${inner}</th>`;
    });
    html += `</tr></thead><tbody>`;

    lines.forEach((row, idx) => {
        const rt  = row.nl_row_type || "Main Item";
        const rs  = ROW_STYLE[rt] || ROW_STYLE["Main Item"];
        const ind = (row.nl_is || "").includes(".");
        const tips = fx_tip(row);

        html += `<tr data-rowname="${row.name}"><td class="rn">${idx + 1}</td>`;

        COLS.forEach(([f,,,align], ci) => {
            const gi     = _colToGroup[ci];
            const isStk  = f === "nl_is";
            const isDesc = f === "description";
            const isLand = ["nl_landed_unit_aed","nl_landed_total_aed"].includes(f);
            const isSell = ["nl_unit_sell_aed","nl_total_sell_aed"].includes(f);
            const isFX   = f === "nl_fx_rate";

            let cls = "";
            if (isStk)  cls += " stk0";
            if (isDesc) cls += " nl-desc-cell";
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

            const tip    = tips[f] ? ` title="${tips[f]}"` : "";
            const noC    = isStk ? ` data-no-collapse` : "";
            const isStub = !isStk && _colStub[gi] === ci;
            const stubA  = isStub ? ` data-grp-stub="${gi}"` : "";
            html += `<td class="${cls.trim()}" data-grp="${gi}" data-field="${f}"${noC}${stubA} style="${sty}"${tip}>${cell_val(row, f)}</td>`;
        });
        html += `</tr>`;
    });

    html += `<tr class="nl-tot"><td class="rn">&#931;</td>`;
    COLS.forEach(([f,,,align], ci) => {
        const gi     = _colToGroup[ci];
        const cls    = align === "r" ? " r" : align === "c" ? " c" : "";
        const isStub = _colStub[gi] === ci;
        const stubA  = isStub ? ` data-grp-stub="${gi}"` : "";
        let c = "";
        if (f === "nl_is")                   c = `<strong>TOTAL</strong>`;
        else if (f === "nl_exworks_total_aed") c = `<span class="tl">${fmt0(tot_exw)}</span>`;
        else if (f === "nl_landed_total_aed")  c = `<span class="tl">${fmt0(tot_land)}</span>`;
        else if (f === "nl_total_sell_aed")    c = `<span class="ts">${fmt0(tot_sell)}</span>`;
        else if (f === "qty")                  c = `<span class="ts">${fmt0(tot_qty)}</span>`;
        html += `<td class="${cls.trim()}" data-grp="${gi}"${stubA}>${c}</td>`;
    });
    html += `</tr>`;
    if (frm.doc.docstatus === 0) {
        html += `<tr class="nl-add-row-tr">
            <td class="rn" style="color:#b0bcd0;font-size:14px;">+</td>
            <td colspan="${COLS.length}" style="color:#b0bcd0;font-style:italic;font-size:10px;
                padding:7px 14px;border-top:2px dashed #d8e0ea;letter-spacing:.2px;">
                &#43;&nbsp;Click to add a row&hellip;
            </td>
        </tr>`;
    }
    html += `</tbody></table></div>`;

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

    html += `</div>`;
    $ws.html(html);
    apply_collapse($ws);
    if (_ws_fullscreen) {
        $ws.find("#nl-ws-root").addClass("nl-fs");
        $("body").addClass("nl-fs-active");
        $ws.find("#nl-fs-btn").html("&#8855; Exit Full Screen");
    }
    if (frm.doc.docstatus !== 0) {
        $ws.find("#nl-add-btn").hide();
        $ws.find(".nl-edit-btn").hide();
        $ws.find(".nl-popup-btn").hide();
        $ws.find(".nl-del-btn").hide();
    }
}

function setup_events(frm) {
    frm.$wrapper.off(".nl-ws");

    frm.$wrapper.on("click.nl-ws", "#nl-top-activate-btn", () => set_nl_mode(frm, true));
    frm.$wrapper.on("click.nl-ws", "#nl-top-exit-btn",     () => set_nl_mode(frm, false));

    function _excel_url() {
        const collapsed = get_collapsed();
        const hidden_gi = Object.keys(collapsed).filter(k => collapsed[k]).map(Number);
        const params = new URLSearchParams({ quotation: frm.doc.name });
        if (hidden_gi.length) params.set("hidden_groups", hidden_gi.join(","));
        return frappe.urllib.get_full_url(
            `/api/method/newline.newline.api.download_costing_excel?${params}`
        );
    }

    frm.$wrapper.on("click.nl-ws", "#nl-top-excel-btn", function() {
        if (!frm.doc.name || frm.doc.__islocal) {
            frappe.msgprint("Please save the quotation first before downloading Excel.");
            return;
        }
        window.location.href = _excel_url();
    });

    frm.$wrapper.on("click.nl-ws", "#nl-add-btn",  () => open_add_dialog(frm));

    frm.$wrapper.on("click.nl-ws", "#nl-excel-btn", function() {
        window.location.href = _excel_url();
    });

    frm.$wrapper.on("click.nl-ws", "#nl-fs-btn", function() {
        const ws  = frm.$wrapper.find("#nl-ws-root");
        const btn = $(this);
        if (ws.hasClass("nl-fs")) {
            ws.removeClass("nl-fs");
            $("body").removeClass("nl-fs-active");
            btn.html("&#9974; Expand");
            _ws_fullscreen = false;
        } else {
            ws.addClass("nl-fs");
            $("body").addClass("nl-fs-active");
            btn.html("&#8855; Exit Full Screen");
            _ws_fullscreen = true;
        }
    });

    frm.$wrapper.on("click.nl-ws", "#nl-fref-toggle", function() {
        const body = frm.$wrapper.find("#nl-fref-body");
        const arr  = frm.$wrapper.find("#nl-fref-arr");
        const open = body.is(":visible");
        body.slideToggle(150);
        arr.html(open ? "&#9658; Show" : "&#9660; Hide");
    });

    frm.$wrapper.on("click.nl-ws", ".nl-grp-th", function() {
        const gi  = $(this).data("grp");
        const $ws = frm.$wrapper.find("#nl-ws-root");
        const isCollapsed = $(this).hasClass("nl-collapsed-hdr");
        if (isCollapsed) {
            _do_expand($ws, gi);
            const state = get_collapsed(); state[gi] = false; save_collapsed(state);
        } else {
            _do_collapse($ws, gi);
            const state = get_collapsed(); state[gi] = true; save_collapsed(state);
        }
    });

    frm.$wrapper.on("click.nl-ws", ".nl-del-btn", function(e) {
        e.stopPropagation();
        if (frm.doc.docstatus !== 0) return;
        const rowname = $(this).data("rowname");
        const row     = (frm.doc.items||[]).find(r => r.name === rowname);
        const label   = row ? (row.nl_proposed_product || row.nl_is || rowname) : rowname;
        frappe.confirm(
            `Delete row <strong>${label}</strong>?`,
            () => {
                frappe.model.clear_doc("Quotation Item", rowname);
                frm.doc.items = (frm.doc.items||[]).filter(r => r.name !== rowname);
                frm.dirty();
                render_workspace(frm);
            }
        );
    });

    frm.$wrapper.on("click.nl-ws", ".nl-edit-btn", function(e) {
        e.stopPropagation();
        if (frm.doc.docstatus !== 0) return;
        const $tr = $(this).closest("tr");
        const row = (frm.doc.items||[]).find(r => r.name === $(this).data("rowname"));
        if (row) enter_edit_mode(frm, row, $tr);
    });
    frm.$wrapper.on("click.nl-ws", ".nl-popup-btn", function(e) {
        e.stopPropagation();
        const row = (frm.doc.items||[]).find(r => r.name === $(this).data("rowname"));
        if (row) open_row_dialog(frm, row);
    });
    frm.$wrapper.on("dblclick.nl-ws", "tr[data-rowname]", function() {
        if (frm.doc.docstatus !== 0) return;
        const $tr = $(this);
        const row = (frm.doc.items||[]).find(r => r.name === $tr.data("rowname"));
        if (row) enter_edit_mode(frm, row, $tr);
    });
    frm.$wrapper.on("click.nl-ws", ".nl-save-inline", function() {
        const rowname = $(this).data("rowname");
        const $tr     = $(this).closest("tr");
        const row     = (frm.doc.items||[]).find(r => r.name === rowname);
        if (row) collect_and_save(frm, row, $tr);
    });
    frm.$wrapper.on("click.nl-ws", ".nl-cancel-inline", function() {
        render_workspace(frm);
    });

    frm.$wrapper.on("click.nl-ws", ".nl-add-row-tr", function() {
        add_row_inline(frm);
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
        (frm.doc.items||[]).forEach(r => {
            if (GI_MAP[field]) r[GI_MAP[field]] = val;
        });
        calc_all(frm);
        render_workspace(frm);
    });
}

function set_nl_mode(frm, enable) {
    if (!enable) $("body").removeClass("nl-fs-active");
    frm.doc.nl_mode = enable ? 1 : 0;
    frm.set_value("ignore_pricing_rule", 1);
    const $formPage = frm.$wrapper.find(".form-page");
    const $alerts   = frm.$wrapper.closest(".page-body").find(".form-message, .page-form-message");
    if (enable) {
        calc_all(frm);
        $formPage.hide();
        $alerts.hide();
        render_workspace(frm);
    } else {
        frm.$wrapper.find("#nl-workspace-main").hide();
        $formPage.show();
        $alerts.show();
    }
    render_top_button(frm);
    frm.refresh_header();
}

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
    const is_draft = frm.doc.docstatus === 0;
    const d = new frappe.ui.Dialog({
        title: `${is_draft ? "Edit" : "View"} — ${row.nl_proposed_product || "Row " + (row.nl_is || "")}`,
        size: "large",
        fields: [
            { fieldtype:"Section Break", label:"Product Identity" },
            { fieldtype:"Data",   fieldname:"nl_is",              label:"IS #",          default: row.nl_is,              reqd:1 },
            { fieldtype:"Select", fieldname:"nl_row_type",        label:"Row Type",      default: row.nl_row_type||"Main Item", options:"Main Item\nAccessory\nDriver" },
            { fieldtype:"Data",   fieldname:"nl_product_package", label:"Package",       default: row.nl_product_package },
            { fieldtype:"Select", fieldname:"nl_specification",   label:"Specification", default: row.nl_specification, options:"\nSpecified\nEqually Approved\nApproved Vendor List\nAlternative" },
            { fieldtype:"Link",   fieldname:"item_code",          label:"Item Code",     default: row.item_code, options:"Item", reqd:1,
              onchange: function() {
                  const code = d.get_value("item_code");
                  if (!code) return;
                  frappe.db.get_doc("Item", code).then(item => {
                      const upd = {};
                      upd.item_name = item.item_name || "";
                      if (item.brand)                upd.nl_proposed_brand   = item.brand;
                      if (item.brand)                upd.nl_supplier_brand   = item.brand;
                      if (item.nl_reference_number)  upd.nl_proposed_product = item.nl_reference_number;
                      else if (item.item_name)        upd.nl_proposed_product = item.item_name;
                      if (item.description)          upd.description         = item.description;
                      if (item.nl_ex_works_price)    upd.nl_uexw_value       = item.nl_ex_works_price;
                      if (item.nl_purchase_currency) upd.nl_exw_currency     = item.nl_purchase_currency;
                      upd.nl_image = item.image || item.nl_image || "";
                      d.set_values(upd);
                  });
              }
            },
            { fieldtype:"Data",   fieldname:"item_name",          label:"Item Name",     default: row.item_name, read_only:1 },
            { fieldtype:"Data",   fieldname:"nl_location",        label:"Location",      default: row.nl_location },
            { fieldtype:"Column Break" },
            { fieldtype:"Data",   fieldname:"nl_proposed_brand",   label:"Proposed Brand",   default: row.nl_proposed_brand,   reqd:1 },
            { fieldtype:"Data",   fieldname:"nl_proposed_product", label:"Proposed Product", default: row.nl_proposed_product, reqd:1 },
            { fieldtype:"Text Editor", fieldname:"description",      label:"Description",      default: row.description },
            { fieldtype:"Section Break", label:"Pricing (EXW)" },
            { fieldtype:"Select",  fieldname:"nl_price_type",     label:"Price Type", default: row.nl_price_type, options:"\nAccurate\nEstimated" },
            { fieldtype:"Data",    fieldname:"nl_supplier_brand", label:"Sup. Brand", default: row.nl_supplier_brand },
            { fieldtype:"Currency",fieldname:"nl_uexw_value",     label:"U.EXW",      default: row.nl_uexw_value,  reqd:1 },
            { fieldtype:"Percent", fieldname:"nl_discount_pct",   label:"Discount %", default: row.nl_discount_pct },
            { fieldtype:"Select",  fieldname:"nl_exw_currency",   label:"Currency",   default: row.nl_exw_currency||"USD", options:"EUR\nUSD\nAED\nGBP" },
            { fieldtype:"Column Break" },
            { fieldtype:"Float",  fieldname:"nl_markup",          label:"Markup x",   default: row.nl_markup||1.5, precision:2 },
            { fieldtype:"Float",  fieldname:"qty",                label:"Qty",        default: row.qty||1, reqd:1 },
            { fieldtype:"Link",   fieldname:"uom",                label:"UOM",        default: row.uom||"Nos", options:"UOM" },
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
            if (!is_draft) { d.hide(); return; }
            apply_row(frm, row, values);
            d.hide();
        },
        secondary_action_label: "Delete Row",
        secondary_action() {
            if (!is_draft) { d.hide(); return; }
            frappe.confirm("Delete this row?", () => {
                frm.doc.items = (frm.doc.items||[]).filter(r=>r.name!==row.name);
                frm.dirty(); render_workspace(frm); d.hide();
            });
        },
    });
    d.show();
    if (!is_draft) d.$wrapper.find(".btn-primary, .btn-secondary").prop("disabled", true).css("opacity", ".5");
    d.$wrapper.find(".modal-dialog").css("max-width","820px");
}

function open_add_dialog(frm) {
    const nr   = frappe.model.add_child(frm.doc, "Quotation Item", "items");
    const nums = (frm.doc.items||[]).map(r=>parseInt(r.nl_is)||0).filter(n=>n>0);
    nr.nl_is       = nums.length ? String(Math.max(...nums) + 1) : "1";
    nr.nl_row_type = "Main Item";
    nr.uom         = "Nos";
    nr.nl_markup   = flt(frm.doc.nl_default_markup)  || 1.5;
    nr.nl_ship_pct = flt(frm.doc.nl_freight_pct)     || 10;
    nr.nl_ins_pct  = flt(frm.doc.nl_insurance_pct)   || 1;
    nr.nl_cus_pct  = flt(frm.doc.nl_customs_pct)     || 6;
    nr.nl_sam_pct  = flt(frm.doc.nl_samples_pct)     || 1;
    nr.nl_lc_pct   = flt(frm.doc.nl_lc_pct)          || 2;
    nr.nl_exw_currency = "USD";
    open_row_dialog(frm, nr);
}

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
        frm.set_value("ignore_pricing_rule", 1);
    },

    refresh(frm) {
        inject_form_theme(frm);

        frm.$wrapper.find('.form-tabs-list .nav-link').filter(function() {
            return $(this).text().trim() === 'Connections';
        }).closest('li').hide();
        setup_events(frm);
        render_top_button(frm);

        frm.set_df_property("nl_quotation_lines", "hidden", 1);
        const $alerts = frm.$wrapper.closest(".page-body").find(".form-message, .page-form-message");
        if (frm.doc.nl_mode) {
            frm.$wrapper.find(".form-page").hide();
            $alerts.hide();
            render_workspace(frm);
        } else {
            frm.$wrapper.find("#nl-workspace-main").hide();
            frm.$wrapper.find(".form-page").show();
            $alerts.show();
        }
    },

    nl_freight_pct(frm)   { (frm.doc.items||[]).forEach(r=>r.nl_ship_pct=flt(frm.doc.nl_freight_pct));   calc_all(frm); render_workspace(frm); },
    nl_insurance_pct(frm) { (frm.doc.items||[]).forEach(r=>r.nl_ins_pct =flt(frm.doc.nl_insurance_pct));  calc_all(frm); render_workspace(frm); },
    nl_customs_pct(frm)   { (frm.doc.items||[]).forEach(r=>r.nl_cus_pct =flt(frm.doc.nl_customs_pct));    calc_all(frm); render_workspace(frm); },
    nl_samples_pct(frm)   { (frm.doc.items||[]).forEach(r=>r.nl_sam_pct =flt(frm.doc.nl_samples_pct));    calc_all(frm); render_workspace(frm); },
    nl_lc_pct(frm)        { (frm.doc.items||[]).forEach(r=>r.nl_lc_pct  =flt(frm.doc.nl_lc_pct));         calc_all(frm); render_workspace(frm); },
    nl_default_markup(frm){ (frm.doc.items||[]).forEach(r=>r.nl_markup   =flt(frm.doc.nl_default_markup)); calc_all(frm); render_workspace(frm); },

    before_save(frm) {
        const $editingRow = frm.$wrapper.find("tr.nl-editing");
        if (!$editingRow.length) return;

        const rowname = $editingRow.attr("data-rowname");
        const row     = (frm.doc.items || []).find(r => r.name === rowname);
        if (!row) return;

        const values = {};
        $editingRow.find(".nl-ie").each(function() {
            const f = $(this).data("field");
            const v = $(this).val();
            values[f] = NUM_FIELDS.has(f) ? (parseFloat(v) || 0) : v;
        });

        const MANDATORY = {
            item_code:           "Item Code (TYPE)",
            nl_proposed_brand:   "Proposed Brand",
            nl_proposed_product: "Proposed Product",
        };
        const missing = Object.entries(MANDATORY)
            .filter(([f]) => !String(values[f] || "").trim())
            .map(([, lbl]) => `<b>${lbl}</b>`);
        if (missing.length) {
            frappe.msgprint({ title: "Required Fields", indicator: "red",
                message: `Row being edited is incomplete. Please fill: ${missing.join(", ")}` });
            frappe.validated = false;
            return;
        }

        if (!(values.qty > 0)) {
            frappe.msgprint({ title: "Invalid Quantity", indicator: "red",
                message: "Quantity must be greater than 0." });
            frappe.validated = false;
            return;
        }

        Object.assign(row, values);
        calc_row(frm, row);
    },
});

frappe.ui.form.on("Quotation Item", {
    item_code(frm, cdt, cdn) {
        const row = frappe.get_doc(cdt, cdn);
        if (!row.item_code) return;
        frappe.db.get_doc("Item", row.item_code).then(item => {
            frappe.model.set_value(cdt, cdn, {
                nl_proposed_brand:   item.brand               || "",
                nl_supplier_brand:   item.brand               || "",
                nl_proposed_product: item.nl_reference_number || item.item_name || "",
                nl_uexw_value:       item.nl_ex_works_price   || 0,
                nl_exw_currency:     item.nl_purchase_currency || "USD",
                nl_image:            item.image || item.nl_image || "",
                nl_row_type:         "Main Item",
                nl_markup:           flt(frm.doc.nl_default_markup) || 1.5,
                nl_ship_pct:         flt(frm.doc.nl_freight_pct)    || 10,
                nl_ins_pct:          flt(frm.doc.nl_insurance_pct)  || 1,
                nl_cus_pct:          flt(frm.doc.nl_customs_pct)    || 6,
                nl_sam_pct:          flt(frm.doc.nl_samples_pct)    || 1,
                nl_lc_pct:           flt(frm.doc.nl_lc_pct)         || 2,
                nl_exw_currency:     item.nl_purchase_currency || "USD",
            });
            calc_row(frm, row);
            render_workspace(frm);
        });
    },
    qty(frm, cdt, cdn) {
        const row = frappe.get_doc(cdt, cdn);
        calc_row(frm, row);
        render_workspace(frm);
    },
});

frappe.ui.form.on("NL Exchange Rate", {
    rate(frm)     { calc_all(frm); render_workspace(frm); },
    currency(frm) { calc_all(frm); render_workspace(frm); },
});
