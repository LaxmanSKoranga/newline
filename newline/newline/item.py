def build_description(doc, method=None):
	def val(fieldname):
		v = doc.get(fieldname)
		if v is None:
			return None
		s = str(v).strip()
		return s if s and s != "0" else None

	lines = []

	# ── Line 1: Brand | REF ───────────────────────────────────────────────
	brand = val("brand")
	ref   = val("nl_reference_number")
	head  = "&nbsp;&nbsp;|&nbsp;&nbsp;".join(filter(None, [
		f"<strong>{brand}</strong>" if brand else None,
		f"REF: {ref}" if ref else None,
	]))
	if head:
		lines.append(head)

	# ── Line 2: Item name ─────────────────────────────────────────────────
	name = val("item_name")
	if name:
		lines.append(f"<strong>{name}</strong>")

	# ── Line 3: Spec strip ────────────────────────────────────────────────
	spec_fields = [
		("W",       "nl_wattage"),
		("LM",      "nl_lumen_output"),
		("CCT",     "nl_cct"),
		("BEAM",    "nl_beam_angle"),
		("CRI",     "nl_cri"),
		("IP",      "nl_ip_rating"),
		("COLOUR",  "nl_colour_finish"),
		("DIMMING", "nl_dimming_protocol"),
	]
	specs = "&nbsp;&nbsp;|&nbsp;&nbsp;".join(
		f"<strong>{label}:</strong> {val(fn)}"
		for label, fn in spec_fields
		if val(fn)
	)
	if specs:
		lines.append(specs)

	# ── Line 4: Dimensions ────────────────────────────────────────────────
	dims = val("nl_dimensions")
	if dims:
		lines.append(f"<strong>DIM:</strong> {dims}")

	# ── Components ────────────────────────────────────────────────────────
	components = [r for r in (doc.nl_components or []) if r.component_type or r.reference_code]
	if components:
		lines.append("<hr style='margin:6px 0;border-color:#ddd;'>")
		for r in components:
			parts = filter(None, [
				f"<strong>{r.component_type}</strong>" if r.component_type else None,
				r.reference_code or None,
			])
			comp_head = ": ".join(parts)
			if comp_head:
				lines.append(comp_head)
			if r.description:
				lines.append(r.description)

	doc.description = "<br>".join(lines)
