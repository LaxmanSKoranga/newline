import io

import frappe
from frappe.utils import flt
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import column_index_from_string, get_column_letter

# ── Column definitions (mirrors quotation.js COLS, __actions skipped) ─────────
# (col_letter, fieldname, label, width_px, is_formula)
_COLS = [
	("A",  "nl_is",                   "IS",            36,  False),
	("B",  "nl_product_package",      "PKG",           80,  False),
	("C",  "nl_specification",        "SPEC",          95,  False),
	("D",  "item_code",                "TYPE",          85,  False),
	("E",  "nl_location",             "LOCATION",      80,  False),
	("F",  "nl_proposed_brand",       "BRAND",         80,  False),
	("G",  "nl_proposed_product",     "PRODUCT",      105,  False),
	("H",  "nl_proposed_description", "DESCRIPTION",  190,  False),
	("I",  "nl_price_type",           "PRICE TYPE",    68,  False),
	("J",  "nl_supplier_brand",       "SUP.BRAND",     80,  False),
	("K",  "nl_uexw_value",           "U.EXW",         78,  False),
	("L",  "nl_discount_pct",         "DISC%",         50,  False),
	("M",  "nl_net_uexw",             "NET EXW",       78,  True),
	("N",  "nl_exw_currency",         "CUR",           36,  False),
	("O",  "nl_fx_rate",              "FX",            58,  False),
	("P",  "nl_exworks_unit_aed",     "UNIT AED",      82,  True),
	("Q",  "nl_exworks_total_aed",    "TOT AED",       82,  True),
	("R",  "nl_ship_pct",             "SHIP%",         40,  False),
	("S",  "nl_ship_unit_aed",        "UNIT",          72,  True),
	("T",  "nl_ship_total_aed",       "TOTAL",         72,  True),
	("U",  "nl_ins_pct",              "INS%",          40,  False),
	("V",  "nl_ins_unit_aed",         "UNIT",          72,  True),
	("W",  "nl_ins_total_aed",        "TOTAL",         72,  True),
	("X",  "nl_cus_pct",              "CUS%",          40,  False),
	("Y",  "nl_cus_unit_aed",         "UNIT",          72,  True),
	("Z",  "nl_cus_total_aed",        "TOTAL",         72,  True),
	("AA", "nl_sam_pct",              "SAM%",          40,  False),
	("AB", "nl_sam_unit_aed",         "UNIT",          72,  True),
	("AC", "nl_sam_total_aed",        "TOTAL",         72,  True),
	("AD", "nl_lc_pct",               "LC%",           40,  False),
	("AE", "nl_lc_unit_aed",          "UNIT",          72,  True),
	("AF", "nl_lc_total_aed",         "TOTAL",         72,  True),
	("AG", "nl_landed_unit_aed",      "UNIT AED",      84,  True),
	("AH", "nl_landed_total_aed",     "TOT AED",       84,  True),
	("AI", "nl_markup",               "MU",            42,  False),
	("AJ", "nl_unit_sell_aed",        "UNIT SELL",     84,  True),
	("AK", "nl_total_sell_aed",       "TOT SELL",      84,  True),
	("AL", "nl_gm_pct",               "GM%",           50,  True),
	("AM", "qty",                      "QTY",           48,  False),
	("AN", "uom",                      "UOM",           42,  False),
	("AO", "nl_approval_risk",        "RISK",          58,  False),
	("AP", "nl_alt1_brand",           "ALT1 BRAND",    75,  False),
	("AQ", "nl_alt1_product",         "ALT1 PRODUCT",  92,  False),
	("AR", "nl_alt2_brand",           "ALT2 BRAND",    75,  False),
	("AS", "nl_alt2_product",         "ALT2 PRODUCT",  92,  False),
]

_GROUPS = [
	("A",  "J",  "PROPOSED PRODUCT DETAILS", "1A1A3E"),
	("K",  "Q",  "EXWORKS",                  "1E3A5F"),
	("R",  "T",  "FREIGHT",                  "1A4731"),
	("U",  "W",  "INSURANCE",                "3D3416"),
	("X",  "Z",  "CUSTOMS",                  "4A1E1E"),
	("AA", "AC", "SAMPLES",                  "2D1A4A"),
	("AD", "AF", "LETTER OF CREDIT",         "1A3A3A"),
	("AG", "AH", "LANDED AED",               "0A2A4A"),
	("AI", "AL", "SELLING",                  "1A3D1A"),
	("AM", "AN", "QTY",                      "3D2000"),
	("AO", "AO", "RISK",                     "3D1A2A"),
	("AP", "AS", "SPECIFICATIONS",           "5C1A00"),
]

_LAST_COL  = "AS"
_LANDED    = {"AG", "AH"}
_SELL      = {"AJ", "AK"}
_FX        = {"O"}
_ROW_BG    = {"Main Item": "FFFFFF", "Driver": "EEF4FF", "Accessory": "F8F8F8"}
_PCT_COLS  = {"nl_discount_pct","nl_ship_pct","nl_ins_pct","nl_cus_pct","nl_sam_pct","nl_lc_pct"}
_CCY_COLS  = {
	"nl_uexw_value","nl_net_uexw","nl_tot_exw",
	"nl_exworks_unit_aed","nl_exworks_total_aed",
	"nl_ship_unit_aed","nl_ship_total_aed",
	"nl_ins_unit_aed","nl_ins_total_aed",
	"nl_cus_unit_aed","nl_cus_total_aed",
	"nl_sam_unit_aed","nl_sam_total_aed",
	"nl_lc_unit_aed","nl_lc_total_aed",
	"nl_landed_unit_aed","nl_landed_total_aed",
	"nl_unit_sell_aed","nl_total_sell_aed",
}

# ── Style helpers ─────────────────────────────────────────────────────────────

def _fill(hex6):
	return PatternFill(fgColor=hex6.lstrip("#"), fill_type="solid")

def _font(bold=False, color="000000", size=9):
	return Font(bold=bold, color=color.lstrip("#"), size=size)

def _thin():
	s = Side(style="thin", color="D0D0D0")
	return Border(left=s, right=s, top=s, bottom=s)

def _left_accent(color_hex):
	s = Side(style="thin", color="D0D0D0")
	return Border(
		left=Side(style="thick", color=color_hex),
		right=s, top=s, bottom=s,
	)

def _align(h="left", wrap=False):
	return Alignment(horizontal=h, vertical="center", wrap_text=wrap)


# ── Formula map ───────────────────────────────────────────────────────────────

def _formula(field, r):
	return {
		"nl_net_uexw":          f"=K{r}*(1-L{r}/100)",
		"nl_exworks_unit_aed":  f"=M{r}*O{r}",
		"nl_exworks_total_aed": f"=P{r}*AM{r}",
		"nl_ship_unit_aed":     f"=P{r}*R{r}/100",
		"nl_ship_total_aed":    f"=S{r}*AM{r}",
		"nl_ins_unit_aed":      f"=P{r}*U{r}/100",
		"nl_ins_total_aed":     f"=V{r}*AM{r}",
		"nl_cus_unit_aed":      f"=P{r}*X{r}/100",
		"nl_cus_total_aed":     f"=Y{r}*AM{r}",
		"nl_sam_unit_aed":      f"=P{r}*AA{r}/100",
		"nl_sam_total_aed":     f"=AB{r}*AM{r}",
		"nl_lc_unit_aed":       f"=P{r}*AD{r}/100",
		"nl_lc_total_aed":      f"=AE{r}*AM{r}",
		"nl_landed_unit_aed":   f"=P{r}+S{r}+V{r}+Y{r}+AB{r}+AE{r}",
		"nl_landed_total_aed":  f"=AG{r}*AM{r}",
		"nl_unit_sell_aed":     f"=ROUND(AG{r}*AI{r},0)",
		"nl_total_sell_aed":    f"=AJ{r}*AM{r}",
		"nl_gm_pct":            f"=IF(AJ{r}>0,(AJ{r}-AG{r})/AJ{r}*100,0)",
	}.get(field, "")


def _num_fmt(field):
	if field in _CCY_COLS:      return "#,##0.00"
	if field in _PCT_COLS:      return "0.0"
	if field == "nl_gm_pct":   return "0.0"
	if field == "nl_fx_rate":  return "0.0000"
	if field == "nl_markup":   return "0.00"
	if field == "qty":         return "#,##0.##"
	return "@"


# ── Workbook builder ──────────────────────────────────────────────────────────

def _build_workbook(doc):
	wb = Workbook()
	ws = wb.active
	ws.title = "Costing Sheet"

	# Row 1 — title
	ws.merge_cells(f"A1:{_LAST_COL}1")
	c = ws["A1"]
	c.value     = "NEWLINE MEA  —  INTERNAL COSTING SHEET"
	c.fill      = _fill("1A1A3E")
	c.font      = Font(bold=True, color="FFFFFF", size=14)
	c.alignment = _align("center")
	ws.row_dimensions[1].height = 28

	# Row 2 — project info + exchange rates
	proj = doc.nl_project_name  or ""
	ref  = doc.nl_ref_number    or doc.name
	date = str(doc.nl_project_date or doc.transaction_date or "")
	cust = doc.customer_name    or ""
	ws.merge_cells("A2:J2")
	c = ws["A2"]
	c.value     = f"PROJECT: {proj}   |   REF: {ref}   |   CUSTOMER: {cust}   |   DATE: {date}"
	c.font      = Font(bold=True, size=9, color="1A1A3E")
	c.alignment = _align("left")
	c.fill      = _fill("E8EAF0")
	ws["K2"].value = "EXCHANGE RATES:"
	ws["K2"].font  = Font(bold=True, size=8)
	for i, xr in enumerate(doc.nl_exchange_rates or []):
		lc = get_column_letter(column_index_from_string("L") + i * 2)
		lv = get_column_letter(column_index_from_string("L") + i * 2 + 1)
		ws[f"{lc}2"].value = xr.currency
		ws[f"{lc}2"].font  = Font(bold=True, size=8)
		ws[f"{lv}2"].value = flt(xr.rate)
		ws[f"{lv}2"].number_format = "0.0000"
		ws[f"{lv}2"].font  = Font(size=8)
	ws.row_dimensions[2].height = 18

	# Row 3 — group headers
	for c1, c2, label, color in _GROUPS:
		ws.merge_cells(f"{c1}3:{c2}3") if c1 != c2 else None
		cell = ws[f"{c1}3"]
		cell.value     = label
		cell.fill      = _fill(color)
		cell.font      = Font(bold=True, color="FFFFFF", size=8)
		cell.alignment = _align("center")
	ws.row_dimensions[3].height = 20

	# Row 4 — column headers
	for col_l, field, label, width_px, _ in _COLS:
		cell = ws[f"{col_l}4"]
		cell.value     = label
		cell.fill      = _fill("263547")
		cell.font      = Font(bold=True, color="B8C8E0", size=8)
		cell.alignment = _align("center")
		ws.column_dimensions[col_l].width = max(width_px / 7.0, 4.5)
	ws.row_dimensions[4].height = 18

	ws.freeze_panes = "A5"

	# Data rows
	DATA_START = 5
	lines = doc.items or []

	for idx, line in enumerate(lines):
		r  = DATA_START + idx
		rt = line.nl_row_type or "Main Item"
		bg = _ROW_BG.get(rt, "FFFFFF")
		ws.row_dimensions[r].height = 16

		for col_l, field, _lbl, _w, is_formula in _COLS:
			cell = ws[f"{col_l}{r}"]

			# value / formula
			if is_formula:
				cell.value = _formula(field, r)
			else:
				val = getattr(line, field, None)
				cell.value = val if val is not None else ""

			cell.number_format = _num_fmt(field)

			# background tint
			if col_l in _LANDED:   cell.fill = _fill("E8F0FA")
			elif col_l in _SELL:   cell.fill = _fill("E8F5E9")
			elif col_l in _FX:     cell.fill = _fill("FFFFF0")
			else:                  cell.fill = _fill(bg)

			# font
			if col_l in _LANDED:
				cell.font = Font(bold=True, size=9, color="0A2A4A")
			elif col_l in _SELL:
				cell.font = Font(bold=True, size=9, color="1A3D1A")
			elif field == "nl_gm_pct":
				gm = flt(getattr(line, "nl_gm_pct", 0))
				fc = "27AE60" if gm >= 30 else "E67E22" if gm >= 20 else "C0392B"
				cell.font = Font(bold=True, size=9, color=fc)
			elif field == "nl_proposed_brand":
				cell.font = Font(bold=True, size=9, color="1A1A3E" if rt != "Accessory" else "555555")
			else:
				cell.font = Font(size=9, color="1A1A3E" if rt != "Accessory" else "555555")

			# alignment
			if field in ("nl_is","nl_price_type","nl_exw_currency","uom","nl_approval_risk"):
				cell.alignment = _align("center")
			elif _num_fmt(field) != "@":
				cell.alignment = _align("right")
			else:
				cell.alignment = _align("left", wrap=field == "description")

			# border — IS col gets left accent
			if col_l == "A":
				accent = "1A1A3E" if rt == "Main Item" else "4A7AB5" if rt == "Driver" else "AAAAAA"
				cell.border = _left_accent(accent)
			else:
				cell.border = _thin()

	# Totals row
	N     = DATA_START + len(lines) - 1
	tot_r = N + 1
	ws.row_dimensions[tot_r].height = 18
	tot_fill = _fill("111828")

	for col_l, field, _lbl, _w, _ in _COLS:
		cell = ws[f"{col_l}{tot_r}"]
		cell.fill      = tot_fill
		cell.font      = Font(bold=True, color="FFFFFF", size=9)
		cell.alignment = _align("right")
		cell.border    = Border(
			left=Side(style="thin", color="FFFFFF"),
			right=Side(style="thin", color="FFFFFF"),
			top=Side(style="medium", color="FFFFFF"),
			bottom=Side(style="medium", color="FFFFFF"),
		)
		if field == "nl_is":
			cell.value = "TOTAL"; cell.alignment = _align("left")
		elif field == "nl_exworks_total_aed":
			cell.value = f"=SUM(Q{DATA_START}:Q{N})"; cell.number_format = "#,##0"; cell.font = Font(bold=True, color="7BB8F5", size=9)
		elif field == "nl_landed_total_aed":
			cell.value = f"=SUM(AH{DATA_START}:AH{N})"; cell.number_format = "#,##0"; cell.font = Font(bold=True, color="7BB8F5", size=9)
		elif field == "nl_total_sell_aed":
			cell.value = f"=SUM(AK{DATA_START}:AK{N})"; cell.number_format = "#,##0"; cell.font = Font(bold=True, color="7CF59D", size=9)
		elif field == "qty":
			cell.value = f"=SUM(AM{DATA_START}:AM{N})"; cell.number_format = "#,##0"

	# Brand Summary
	brands = {}
	for line in lines:
		if line.nl_row_type != "Main Item":
			continue
		b = line.nl_supplier_brand or line.nl_proposed_brand or "Unknown"
		if b not in brands:
			brands[b] = {"exw": 0.0, "land": 0.0, "sell": 0.0}
		brands[b]["exw"]  += flt(line.nl_exworks_total_aed)
		brands[b]["land"] += flt(line.nl_landed_total_aed)
		brands[b]["sell"] += flt(line.nl_total_sell_aed)

	if brands:
		bs = tot_r + 2
		ws.merge_cells(f"A{bs}:H{bs}")
		c = ws[f"A{bs}"]
		c.value = "BRAND SUMMARY"; c.fill = _fill("1A1A3E")
		c.font = Font(bold=True, color="FFFFFF", size=11)
		c.alignment = _align("left")
		ws.row_dimensions[bs].height = 22

		hr = bs + 1
		ws.row_dimensions[hr].height = 16
		bs_hdrs = [("A","BRAND"),("B","EXW TOTAL"),("C","% EXW"),
		           ("D","LANDED"),("E","% LND"),("F","PROFIT"),
		           ("G","SELL TOTAL"),("H","% SELL")]
		for ltr, lbl in bs_hdrs:
			c = ws[f"{ltr}{hr}"]
			c.value = lbl; c.fill = _fill("263547")
			c.font = Font(bold=True, color="B8C8E0", size=8)
			c.alignment = _align("center")

		ge = sum(v["exw"]  for v in brands.values())
		gl = sum(v["land"] for v in brands.values())
		gs = sum(v["sell"] for v in brands.values())

		dr = hr + 1
		for b, d in sorted(brands.items()):
			ws.row_dimensions[dr].height = 15
			for ltr, _ in bs_hdrs:
				ws[f"{ltr}{dr}"].fill   = _fill("FFFFFF")
				ws[f"{ltr}{dr}"].border = _thin()
				ws[f"{ltr}{dr}"].font   = Font(size=9)
				ws[f"{ltr}{dr}"].alignment = _align("right")

			profit = d["sell"] - d["land"]
			ws[f"A{dr}"].value = b; ws[f"A{dr}"].font = Font(bold=True, size=9); ws[f"A{dr}"].alignment = _align("left")
			ws[f"B{dr}"].value = d["exw"];   ws[f"B{dr}"].number_format = "#,##0.00"
			ws[f"C{dr}"].value = (d["exw"]/ge*100) if ge else 0; ws[f"C{dr}"].number_format = "0.0"
			ws[f"D{dr}"].value = d["land"];  ws[f"D{dr}"].number_format = "#,##0.00"
			ws[f"E{dr}"].value = (d["land"]/gl*100) if gl else 0; ws[f"E{dr}"].number_format = "0.0"
			ws[f"F{dr}"].value = profit;     ws[f"F{dr}"].number_format = "#,##0.00"; ws[f"F{dr}"].font = Font(bold=True, size=9, color="27AE60")
			ws[f"G{dr}"].value = d["sell"];  ws[f"G{dr}"].number_format = "#,##0"; ws[f"G{dr}"].font = Font(bold=True, size=9)
			ws[f"H{dr}"].value = (d["sell"]/gs*100) if gs else 0; ws[f"H{dr}"].number_format = "0.0"
			dr += 1

		# totals
		ws.row_dimensions[dr].height = 16
		bdr = Border(top=Side(style="medium", color="263547"),
		             bottom=Side(style="thin", color="D0D0D0"),
		             left=Side(style="thin", color="D0D0D0"),
		             right=Side(style="thin", color="D0D0D0"))
		for ltr, _ in bs_hdrs:
			ws[f"{ltr}{dr}"].fill = _fill("F0F4FF"); ws[f"{ltr}{dr}"].border = bdr
			ws[f"{ltr}{dr}"].font = Font(bold=True, size=9); ws[f"{ltr}{dr}"].alignment = _align("right")
		ws[f"A{dr}"].value = "TOTAL"; ws[f"A{dr}"].alignment = _align("left")
		ws[f"B{dr}"].value = ge;      ws[f"B{dr}"].number_format = "#,##0.00"
		ws[f"C{dr}"].value = 100;     ws[f"C{dr}"].number_format = "0.0"
		ws[f"D{dr}"].value = gl;      ws[f"D{dr}"].number_format = "#,##0.00"
		ws[f"E{dr}"].value = 100;     ws[f"E{dr}"].number_format = "0.0"
		ws[f"F{dr}"].value = gs - gl; ws[f"F{dr}"].number_format = "#,##0.00"; ws[f"F{dr}"].font = Font(bold=True, size=9, color="27AE60")
		ws[f"G{dr}"].value = gs;      ws[f"G{dr}"].number_format = "#,##0"
		ws[f"H{dr}"].value = 100;     ws[f"H{dr}"].number_format = "0.0"

	ws.sheet_view.showGridLines = True
	return wb


# ── Public API ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def download_costing_excel(quotation):
	doc = frappe.get_doc("Quotation", quotation)
	frappe.has_permission("Quotation", doc=doc, throw=True)
	wb  = _build_workbook(doc)
	buf = io.BytesIO()
	wb.save(buf)
	frappe.response["filename"]    = f"NL_Costing_{doc.name}.xlsx"
	frappe.response["filecontent"] = buf.getvalue()
	frappe.response["type"]        = "download"
