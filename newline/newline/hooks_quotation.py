from collections import defaultdict

from frappe.utils import flt, today

_DEFAULT_RATES = {"EUR": 4.5, "USD": 3.8, "AED": 1.0, "GBP": 5.2}


def before_save(doc, method=None):
	# Prevent ERPNext's pricing-rule engine from overriding the rates we set below
	doc.ignore_pricing_rule = 1

	if not doc.nl_project_date:
		doc.nl_project_date = today()

	_migrate_nl_lines(doc)
	_ensure_exchange_rates(doc)
	_calculate_lines(doc)
	_rebuild_brand_summary(doc)
	_finalize_item_totals(doc)


def _migrate_nl_lines(doc):
	"""One-time auto-migration: copy old nl_quotation_lines rows into doc.items."""
	if doc.items:
		return
	old_lines = doc.get("nl_quotation_lines") or []
	if not old_lines:
		return
	for line in old_lines:
		doc.append("items", {
			"item_code":           line.get("nl_product_type") or "SERVICES",
			"item_name":           line.get("nl_proposed_product") or "",
			"description":         line.get("nl_proposed_description") or "",
			"qty":                 flt(line.get("nl_qty")) or 1,
			"uom":                 line.get("nl_uom") or "Nos",
			"nl_is":               line.get("nl_is"),
			"nl_row_type":         line.get("nl_row_type") or "Main Item",
			"nl_product_package":  line.get("nl_product_package"),
			"nl_specification":    line.get("nl_specification"),
			"nl_location":         line.get("nl_location"),
			"nl_image":            line.get("nl_image"),
			"nl_proposed_brand":   line.get("nl_proposed_brand"),
			"nl_proposed_product": line.get("nl_proposed_product"),
			"nl_price_type":       line.get("nl_price_type"),
			"nl_supplier_brand":   line.get("nl_supplier_brand"),
			"nl_uexw_value":       flt(line.get("nl_uexw_value")),
			"nl_discount_pct":     flt(line.get("nl_discount_pct")),
			"nl_exw_currency":     line.get("nl_exw_currency") or "USD",
			"nl_fx_rate":          flt(line.get("nl_fx_rate")),
			"nl_markup":           flt(line.get("nl_markup")) or 1.5,
			"nl_ship_pct":         flt(line.get("nl_ship_pct")),
			"nl_ins_pct":          flt(line.get("nl_ins_pct")),
			"nl_cus_pct":          flt(line.get("nl_cus_pct")),
			"nl_sam_pct":          flt(line.get("nl_sam_pct")),
			"nl_lc_pct":           flt(line.get("nl_lc_pct")),
			"nl_approval_risk":    line.get("nl_approval_risk"),
		})


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


# ── Line calculations (now on doc.items) ─────────────────────────────────────

def _calculate_lines(doc):
	for line in (doc.items or []):
		qty        = flt(line.qty)
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


# ── Push NL sell price into ERPNext's native rate/amount fields ───────────────

def _finalize_item_totals(doc):
	for item in (doc.items or []):
		item.rate   = flt(item.nl_unit_sell_aed)
		item.amount = flt(item.nl_total_sell_aed)
	# Recalculate ERPNext's grand_total, net_total etc. from the updated rates
	doc.run_method("calculate_taxes_and_totals")


# ── Brand summary (now from doc.items) ───────────────────────────────────────

def _rebuild_brand_summary(doc):
	data = defaultdict(lambda: {"exw": 0.0, "landed": 0.0, "sell": 0.0})

	for line in (doc.items or []):
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
