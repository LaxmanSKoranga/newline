frappe.ui.form.on("Item", {
	before_save: (frm) => build_auto_description(frm),
	nl_reference_number: (frm) => build_auto_description(frm),
	nl_wattage: (frm) => build_auto_description(frm),
	nl_lumen_output: (frm) => build_auto_description(frm),
	nl_cct: (frm) => build_auto_description(frm),
	nl_cri: (frm) => build_auto_description(frm),
	nl_ip_rating: (frm) => build_auto_description(frm),
	nl_beam_angle: (frm) => build_auto_description(frm),
	nl_dimensions: (frm) => build_auto_description(frm),
	nl_dimming_protocol: (frm) => build_auto_description(frm),
	nl_colour_finish: (frm) => build_auto_description(frm),
	brand: (frm) => build_auto_description(frm),
	item_name: (frm) => build_auto_description(frm),
	item_group: (frm) => build_auto_description(frm),
});

frappe.ui.form.on("NL Item Component", {
	component_type: (frm) => build_auto_description(frm),
	reference_code: (frm) => build_auto_description(frm),
	description: (frm) => build_auto_description(frm),
	nl_components_remove: (frm) => build_auto_description(frm),
});

function val(frm, fieldname) {
	const v = frm.doc[fieldname];
	return v !== undefined && v !== null && String(v).trim() !== "" && String(v).trim() !== "0"
		? String(v).trim()
		: null;
}

function build_auto_description(frm) {
	const d = frm.doc;
	const lines = [];

	const brand = val(frm, "brand");
	const ref   = val(frm, "nl_reference_number");
	const head  = [
		brand ? `<strong>${brand}</strong>` : null,
		ref   ? `REF: ${ref}`               : null,
	].filter(Boolean).join("&nbsp;&nbsp;|&nbsp;&nbsp;");
	if (head) lines.push(head);

	const name = val(frm, "item_name");
	if (name) lines.push(`<strong>${name}</strong>`);

	const spec_fields = [
		["W",      "nl_wattage"],
		["LM",     "nl_lumen_output"],
		["CCT",    "nl_cct"],
		["BEAM",   "nl_beam_angle"],
		["CRI",    "nl_cri"],
		["IP",     "nl_ip_rating"],
		["COLOUR", "nl_colour_finish"],
		["DIMMING","nl_dimming_protocol"],
	];
	const specs = spec_fields
		.map(([label, fn]) => {
			const v = val(frm, fn);
			return v ? `<strong>${label}:</strong> ${v}` : null;
		})
		.filter(Boolean)
		.join("&nbsp;&nbsp;|&nbsp;&nbsp;");
	if (specs) lines.push(specs);

	const dims = val(frm, "nl_dimensions");
	if (dims) lines.push(`<strong>DIM:</strong> ${dims}`);

	const rows = (d.nl_components || []).filter(r => r.component_type || r.reference_code);
	if (rows.length) {
		lines.push("<hr style='margin:6px 0;border-color:#ddd;'>");
		rows.forEach(r => {
			const comp_head = [
				r.component_type ? `<strong>${r.component_type}</strong>` : null,
				r.reference_code ? r.reference_code : null,
			].filter(Boolean).join(": ");
			if (comp_head) lines.push(comp_head);
			if (r.description) lines.push(r.description);
		});
	}

	frm.set_value("description", lines.join("<br>"));
}
