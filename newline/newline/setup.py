import os

import frappe

OLD_FORMATS = [
    "NL Commercial Proposal",
    "NL Commercial Proposal Modern",
    "NL Costing Sheet",
]

NEW_FORMAT = ("NL Lighting — Commercial Proposal", "Quotation", "nl_commercial_proposal.html")


def create_print_formats():
    for old_name in OLD_FORMATS:
        if frappe.db.exists("Print Format", old_name):
            frappe.delete_doc("Print Format", old_name, ignore_permissions=True)

    name, doctype, filename = NEW_FORMAT
    pf_dir = os.path.join(os.path.dirname(__file__), "print_format")
    html_path = os.path.join(pf_dir, filename)

    with open(html_path) as f:
        html = f.read()

    if frappe.db.exists("Print Format", name):
        frappe.db.set_value("Print Format", name, "html", html)
    else:
        frappe.get_doc({
            "doctype":           "Print Format",
            "name":              name,
            "doc_type":          doctype,
            "html":              html,
            "custom_format":     1,
            "print_format_type": "Jinja",
            "module":            "Newline",
            "standard":          "No",
        }).insert(ignore_permissions=True)

    frappe.db.commit()
    print(f"Print format installed: {name}")
