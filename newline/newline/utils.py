import frappe
from newline.newline.item import build_description


def regen_all_descriptions():
	items = frappe.get_all("Item", filters={"nl_wattage": ["!=", ""]}, pluck="name")
	print(f"Regenerating {len(items)} items...")
	for name in items:
		doc = frappe.get_doc("Item", name)
		build_description(doc)
		doc.db_update()
	frappe.db.commit()
	print("Done.")

	# Preview one
	if items:
		doc = frappe.get_doc("Item", items[0])
		print(f"\nSample ({items[0]}):\n{doc.description}")
