import os

import frappe


def create_print_formats():
	pf_dir = os.path.join(os.path.dirname(__file__), "print_format")
	formats = [
		("NL Commercial Proposal",        "Quotation", "nl_commercial_proposal.html"),
		("NL Commercial Proposal Modern", "Quotation", "nl_commercial_proposal_modern.html"),
		("NL Costing Sheet",              "Quotation", "nl_costing_sheet.html"),
	]
	for name, doctype, filename in formats:
		html_path = os.path.join(pf_dir, filename)
		if not os.path.exists(html_path):
			continue
		with open(html_path) as f:
			html = f.read()

		if frappe.db.exists("Print Format", name):
			frappe.db.set_value("Print Format", name, "html", html)
		else:
			frappe.get_doc({
				"doctype":          "Print Format",
				"name":             name,
				"doc_type":         doctype,
				"html":             html,
				"custom_format":    1,
				"print_format_type": "Jinja",
				"module":           "Newline",
				"standard":         "No",
			}).insert(ignore_permissions=True)

	frappe.db.commit()
	print(f"Print formats installed: {[f[0] for f in formats]}")
