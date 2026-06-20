app_name = "newline"
app_title = "Newline"
app_publisher = "Newline MEA"
app_description = "Lighting product data management for ERPNext"
app_email = "support@newlinemea.com"
app_license = "mit"

fixtures = [
	"Custom Field",
	{
		"dt": "Item Group",
		"filters": [["name", "in", [
			"Ground Recessed", "Spike Mounted", "Landscape", "Lighting",
			"Joinery Light", "Indoor Fixture", "Track System"
		]]]
	},
	{
		"dt": "Brand",
		"filters": [["name", "in", [
			"O/M", "XAL", "Unonovesette", "Acolyte", "LED Linear", "EWO",
			"Fibrepros", "FLOS", "VEXICA", "ATEA", "WE-EF", "Light Graphix",
			"Ledray", "DGA", "Lucent", "OSRAM", "Meanwell"
		]]]
	},
]

doctype_js = {
	"Item": "public/js/item.js",
	"Quotation": "public/js/quotation.js",
}

doc_events = {
	"Item": {
		"before_save": "newline.newline.item.build_description",
	},
	"Quotation": {
		"before_save": "newline.newline.hooks_quotation.before_save",
	},
}

after_install = "newline.newline.setup.create_print_formats"
