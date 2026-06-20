from collections import defaultdict

from frappe.utils import flt, today

_DEFAULT_RATES = {"EUR": 4.5, "USD": 3.8, "AED": 1.0, "GBP": 5.2}


def before_save(doc, method=None):
	if not doc.nl_project_date:
		doc.nl_project_date = today()
	_ensure_exchange_rates(doc)
	_calculate_lines(doc)
	_rebuild_brand_summary(doc)


# ── Exchange rates ────────────────────────────────────────────────────────────

def _ensure_exchange_rates(doc):
	existing = {r.currency for r in (doc.nl_exchange_rates or [])}
	for currency, rate in _DEFAULT_RATES.items():
		if currency not in existing:
			doc.append("nl_exchange_rates", {"currency": currency, "rate": rate})


def _get_fx(doc, currency):
	for r in (doc.nl_exchange_rates or []):
		if r.currency == currency:
			return flt(r.rate) or 1
	return _DEFAULT_RATES.get(currency, 1)


# ── Line calculations ─────────────────────────────────────────────────────────

def _calculate_lines(doc):
	for line in (doc.nl_quotation_lines or []):
		qty        = flt(line.nl_qty)
		uexw       = flt(line.nl_uexw_value)
		disc_pct   = flt(line.nl_discount_pct)
		fx         = flt(line.nl_fx_rate) or _get_fx(doc, line.nl_exw_currency or "USD")
		markup     = flt(line.nl_markup) or flt(doc.nl_default_markup) or 1.5
		ship_pct   = flt(line.nl_ship_pct) or flt(doc.nl_freight_pct)   or 10
		ins_pct    = flt(line.nl_ins_pct)  or flt(doc.nl_insurance_pct) or 1
		cus_pct    = flt(line.nl_cus_pct)  or flt(doc.nl_customs_pct)   or 6
		sam_pct    = flt(line.nl_sam_pct)  or flt(doc.nl_samples_pct)   or 1
		lc_pct     = flt(line.nl_lc_pct)   or flt(doc.nl_lc_pct)        or 2

		line.nl_fx_rate          = fx
		net_uexw                 = uexw * (1 - disc_pct / 100)
		line.nl_net_uexw         = net_uexw
		line.nl_tot_exw          = net_uexw * qty
		exw_unit_aed             = net_uexw * fx
		line.nl_exworks_unit_aed  = exw_unit_aed
		line.nl_exworks_total_aed = exw_unit_aed * qty

		ship = exw_unit_aed * ship_pct / 100
		ins  = exw_unit_aed * ins_pct  / 100
		cus  = exw_unit_aed * cus_pct  / 100
		sam  = exw_unit_aed * sam_pct  / 100
		lc   = exw_unit_aed * lc_pct   / 100

		line.nl_ship_unit_aed  = ship;  line.nl_ship_total_aed  = ship * qty
		line.nl_ins_unit_aed   = ins;   line.nl_ins_total_aed   = ins  * qty
		line.nl_cus_unit_aed   = cus;   line.nl_cus_total_aed   = cus  * qty
		line.nl_sam_unit_aed   = sam;   line.nl_sam_total_aed   = sam  * qty
		line.nl_lc_unit_aed    = lc;    line.nl_lc_total_aed    = lc   * qty

		landed                   = exw_unit_aed + ship + ins + cus + sam + lc
		line.nl_landed_unit_aed  = landed
		line.nl_landed_total_aed = landed * qty

		unit_sell                = round(landed * markup)
		line.nl_unit_sell_aed    = unit_sell
		line.nl_total_sell_aed   = unit_sell * qty
		line.nl_gm_pct           = ((unit_sell - landed) / unit_sell * 100) if unit_sell else 0


# ── Brand summary ─────────────────────────────────────────────────────────────

def _rebuild_brand_summary(doc):
	data = defaultdict(lambda: {"exw": 0.0, "landed": 0.0, "sell": 0.0})

	for line in (doc.nl_quotation_lines or []):
		if line.nl_row_type != "Main Item":
			continue
		brand = line.nl_supplier_brand or line.nl_proposed_brand or "Unknown"
		data[brand]["exw"]    += flt(line.nl_tot_exw)
		data[brand]["landed"] += flt(line.nl_landed_total_aed)
		data[brand]["sell"]   += flt(line.nl_total_sell_aed)

	grand_exw  = sum(v["exw"]    for v in data.values())
	grand_land = sum(v["landed"] for v in data.values())
	grand_sell = sum(v["sell"]   for v in data.values())

	doc.nl_brand_summary = []
	for brand, v in sorted(data.items()):
		exw  = v["exw"];   land = v["landed"];  sell = v["sell"]
		doc.append("nl_brand_summary", {
			"brand":       brand,
			"tot_exworks": exw,
			"pct_exworks": (exw  / grand_exw  * 100) if grand_exw  else 0,
			"tot_landed":  land,
			"pct_landed":  (land / grand_land * 100) if grand_land else 0,
			"profit":      sell - land,
			"pct_total":   (sell / grand_sell * 100) if grand_sell else 0,
			"tot_selling": sell,
		})
