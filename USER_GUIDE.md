# Newline MEA — User Guide

**System:** ERPNext with Newline Lighting Module
**Prepared for:** Newline MEA Internal Team
**Purpose:** Step-by-step guide on how to use the Newline customizations for managing lighting products and creating costing quotations

---

> **How to use this guide:**
> Read through each section in order. Wherever you see a box like the one below, that is where a screenshot will be added.
>
> ```
> [ SCREENSHOT ]
> ```

---

## Table of Contents

1. [Overview — What Has Been Added](#1-overview)
2. [Item Master — Managing Lighting Products](#2-item-master)
   - [The Lighting Specs Tab](#21-the-lighting-specs-tab)
   - [Filling in the Spec Fields](#22-filling-in-the-spec-fields)
   - [Components Section](#23-components-section)
   - [Purchase & Pricing Section](#24-purchase--pricing-section)
   - [How the Description is Built Automatically](#25-how-the-description-is-built-automatically)
3. [Quotation — Creating a Lighting Costing Sheet](#3-quotation)
   - [The NL Lighting Quotation Tab](#31-the-nl-lighting-quotation-tab)
   - [Project Details](#32-project-details)
   - [Exchange Rates](#33-exchange-rates)
   - [Cost Parameters (Global Defaults)](#34-cost-parameters-global-defaults)
   - [Activating the NL Lighting View](#35-activating-the-nl-lighting-view)
   - [Understanding the Workspace](#36-understanding-the-workspace)
   - [Adding a Product Line](#37-adding-a-product-line)
   - [Editing or Deleting a Line](#38-editing-or-deleting-a-line)
   - [Row Types — Main Item, Driver, Accessory](#39-row-types)
   - [How the Costing Calculates](#310-how-the-costing-calculates)
   - [The Brand Summary](#311-the-brand-summary)
   - [Downloading the Excel Costing Sheet](#312-downloading-the-excel-costing-sheet)
4. [Print Formats — Sending to the Client](#4-print-formats)
   - [Commercial Proposal](#41-commercial-proposal)
5. [Quick Reference — All Formulas Explained Simply](#5-quick-reference)

---

## 1. Overview

The Newline app adds two main things on top of standard ERPNext:

**On the Item (Product) form:**
The system adds a full "Lighting Specs" section where you enter the technical details of each lighting fixture — wattage, lumens, CCT, CRI, IP rating, beam angle, dimming type, etc. Once you fill these in, the system automatically writes a neat, formatted description so you never have to type it manually.

**On the Quotation form:**
Instead of using the standard ERPNext line-item table, Newline adds its own Excel-style costing workspace. You enter the supplier's EXW (Ex-Works) price, select the currency, set your percentages for freight, customs, insurance, etc., and the system instantly calculates the landed cost and the selling price for every product. Everything is live — change one number and all the rows update immediately.

---

## 2. Item Master — Managing Lighting Products

The Item form in ERPNext is used to store every lighting product in your catalogue. The Newline customization adds a dedicated tab called **"Lighting Specs"** to this form.

---

### 2.1 The Lighting Specs Tab

When you open any Item, you will see a new tab at the top called **Lighting Specs**. Click on it to see all the lighting-related fields.

```
[ SCREENSHOT — Item form with the "Lighting Specs" tab highlighted/selected ]
```

This tab is divided into three sections:
- **Fixture Specs** — the technical performance data of the light
- **Components** — any separate parts that come with the fixture (driver, cable, etc.)
- **Purchase & Pricing** — the supplier's price and currency

---

### 2.2 Filling in the Spec Fields

Inside the **Fixture Specs** section, you will find the following fields on the left column:

| Field | What to enter | Example |
|---|---|---|
| **Wattage (W)** | Power consumption of the fixture | `50W`, `2x28W` |
| **Lumen Output (LM)** | Brightness in lumens | `4500lm` |
| **Colour Temperature (CCT)** | Warm / cool white in Kelvin | `3000K`, `4000K` |
| **CRI** | Colour Rendering Index (number only) | `90`, `95` |
| **IP Rating** | Dust and water protection level | `IP65`, `IP20` |
| **Beam Angle** | The spread of light in degrees | `36°`, `60x80°` |
| **Dimensions** | Physical size of the fitting | `L1200 x W75 x H80mm` |
| **Dimming Protocol** | How the light is dimmed | DALI / PWM / 0-10V / Non-DALI |
| **Colour / Finish** | Body colour or surface finish | `Matt White`, `Anodised Silver` |

On the right column:

| Field | What to enter |
|---|---|
| **Reference Number** | The manufacturer's product code / catalogue number |

```
[ SCREENSHOT — Fixture Specs section filled in with example product data ]
```

> **Tip:** You do not need to fill in every field. The description will only show the fields you have actually filled in. Leave a field blank and it simply won't appear in the description.

---

### 2.3 Components Section

Many lighting fixtures come with separate components — a driver, a power supply, a mounting cable, etc. The **Components** section lets you list all of these under the same item.

To add a component, click **Add Row** in the Components table and fill in:

| Field | What to enter |
|---|---|
| **Component Type** | Choose from: Accessory / Driver / Power Supply / Cable / Other |
| **Reference Code** | The part number of this specific component |
| **Description** | A short description of what it does |
| **Brand** | The brand/supplier of this component |
| **Purchase Currency** | The currency this component is priced in |
| **Ex-Works Price** | The supplier's price for this component |
| **Unit** | Nos (per piece) or Meter |

```
[ SCREENSHOT — Components table with one or two rows filled in (e.g. Driver + Cable) ]
```

> **Why add components?** When the description is auto-generated, it includes the components section below a dividing line. This makes it easy to see at a glance what is included with the fixture when you open the product in a quotation.

---

### 2.4 Purchase & Pricing Section

This section stores the supplier's base price for the fixture itself (not including components).

| Field | What to enter |
|---|---|
| **Purchase Currency** | The currency the supplier quotes in: AED / EUR / GBP / USD |
| **Ex-Works Price** | The EXW price from the supplier in the chosen currency |
| **Discount Multiplier** | If the supplier gives a standard discount, enter the multiplier here (default is 1, meaning no discount) |
| **CCT Multiplier** | Price adjustment factor for different colour temperatures |
| **DALI Multiplier** | Price adjustment factor if DALI dimming adds a surcharge |

```
[ SCREENSHOT — Purchase & Pricing section with fields filled in ]
```

> **Important:** The **Ex-Works Price** and **Purchase Currency** you enter here will automatically pre-fill into the quotation line when you link this item in a quotation. This saves time and avoids manual re-entry.

---

### 2.5 How the Description Is Built Automatically

You do not need to type the product description. Every time you save the Item, or every time you change any spec field, the system reads all the fields you have filled in and writes a formatted description automatically.

**What the auto-description looks like:**

```
FLOS  |  REF: 12345-ABC
SKYGARDEN RECESSED
W: 75W  |  LM: 6000lm  |  CCT: 3000K  |  BEAM: 36°  |  CRI: 90  |  IP: IP20
COLOUR: Matt White  |  DIMMING: DALI
DIM: Ø300 x H280mm
─────────────────────────────────────────
Driver: MEANWELL HLG-100H-24
  Dimmable LED Driver, 24VDC, 100W
```

```
[ SCREENSHOT — The Description field on the Item form showing the auto-generated text ]
```

```
[ SCREENSHOT — How that same description appears when the item is opened in a Quotation line ]
```

The description appears:
- In the Item form (in the standard Description field)
- In the Quotation line when you link this item
- In the printed Commercial Proposal sent to the client

---

## 3. Quotation — Creating a Lighting Costing Sheet

The Quotation in ERPNext is where you build your project pricing. The Newline module adds a complete costing workspace to this form — think of it as a built-in Excel sheet directly inside ERPNext.

To start, open **Selling → Quotation → New Quotation** (or open an existing one).

---

### 3.1 The NL Lighting Quotation Tab

At the top of the Quotation form, you will see a tab called **"NL Lighting Quotation"**. Click on it to access all the Newline fields.

```
[ SCREENSHOT — Quotation form with the "NL Lighting Quotation" tab visible and selected ]
```

This tab contains everything:
- Project details
- Exchange rates
- Global cost parameters
- The full costing workspace

---

### 3.2 Project Details

At the top of the NL tab, fill in the project information. This appears on all print formats and in the workspace header.

| Field | What to enter | Example |
|---|---|---|
| **Project Name** | The name of the project or development | `Dubai Hills Mall — Phase 2` |
| **Reference Number** | Your internal reference or the client's PO/RFQ number | `NL-2026-089` |
| **Attention** | The name of the person at the client you are addressing | `Mr. Ahmed Al Mansouri` |
| **Project Date** | The date of this quotation (auto-fills to today) | `24 June 2026` |

```
[ SCREENSHOT — Project Details section filled in ]
```

---

### 3.3 Exchange Rates

The system works in **AED (UAE Dirham)**. Because most lighting products are priced in foreign currencies (EUR, USD, GBP), you need to set the exchange rates so the system can convert everything.

The exchange rate table is on the right side of the Project Details section. It comes pre-filled with default rates:

| Currency | Default Rate |
|---|---|
| EUR | 4.50 |
| USD | 3.80 |
| AED | 1.00 |
| GBP | 5.20 |

To update a rate, simply click on the number and type the new rate.

```
[ SCREENSHOT — Exchange rates table with the four currencies and their rates ]
```

> **Important:** These rates apply to the entire quotation. If you change a rate, all lines using that currency will recalculate instantly.

---

### 3.4 Cost Parameters (Global Defaults)

Below the project details, there is a **Cost Parameters** section. These are the percentage-based costs that apply to every product line by default.

| Field | What it means | Default |
|---|---|---|
| **Freight %** | Cost of shipping from the factory to UAE | **10%** |
| **Insurance %** | Cargo insurance cost | **1%** |
| **Customs %** | UAE import duty | **6%** |
| **Samples %** | Allowance for product samples | **1%** |
| **Local Charges %** | Letter of Credit or local handling costs | **2%** |
| **Default Markup** | Your profit multiplier (1.5 = 50% margin) | **1.5×** |

```
[ SCREENSHOT — Cost Parameters section with all six fields visible ]
```

> **How these work:** These are the default values for all lines. When you add a product line, it inherits these percentages. You can override any percentage for a specific line without affecting the others.

---

### 3.5 Activating the NL Lighting View

Once you have filled in the project details and cost parameters, scroll down to the workspace area. You will see a prompt to activate the workspace.

```
[ SCREENSHOT — The "Activate NL Lighting View" button/placeholder shown in the form ]
```

Click **"Activate NL Lighting View"**. The form will switch to the full costing workspace.

Alternatively, there is a button at the top of the form labelled **"NL Lighting View"** — clicking this toggles between the NL workspace and the standard ERPNext view.

```
[ SCREENSHOT — The full NL workspace after activation, showing the empty table with column headers ]
```

---

### 3.6 Understanding the Workspace

The workspace looks like a spreadsheet. The columns are grouped by category, each group with its own colour header:

```
[ SCREENSHOT — Full workspace with the group headers visible (PROPOSED PRODUCT DETAILS / EXWORKS / FREIGHT / etc.) ]
```

Reading left to right:

| Group | Colour | What it shows |
|---|---|---|
| **Proposed Product Details** | Dark Navy | IS number, package, specification, location, brand, product, description |
| **EXWorks** | Dark Blue | Supplier price, discount, net price, currency, FX rate, price in AED |
| **Freight** | Dark Green | Freight % and freight cost in AED |
| **Insurance** | Dark Yellow | Insurance % and cost |
| **Customs** | Dark Red | Customs duty % and cost |
| **Samples** | Dark Purple | Samples allowance % and cost |
| **Letter of Credit** | Dark Teal | LC % and cost |
| **Landed AED** | Deep Blue | **Total landed cost per unit and in total** |
| **Selling** | Dark Green | Markup, Gross Margin %, selling price per unit and total |
| **QTY** | Dark Brown | Quantity and unit of measure |
| **Risk** | Dark Pink | Approval risk level |
| **Specifications** | Dark Orange | Alternative products (Alt 1, Alt 2) |

> **Tip:** Hover your mouse over any calculated cell (any cell in a coloured section). A tooltip will appear showing you the exact formula with the actual numbers — so you can always see how a value was arrived at.

```
[ SCREENSHOT — Hovering over a cell showing the formula tooltip, e.g. "LANDED = EXW 361.00 + FRT 36.10 + INS 3.61 + ... = 433.20" ]
```

---

### 3.7 Adding a Product Line

Click the **"+ Add Row"** button in the top bar of the workspace.

```
[ SCREENSHOT — The "+ Add Row" button in the workspace top bar ]
```

A dialog box will open. Fill in the details across four sections:

---

**Section 1 — Product Identity**

| Field | What to enter |
|---|---|
| **IS #** | The item sequence number (e.g. 1, 2, 3 for main items; 1.1 for a sub-item) |
| **Row Type** | Main Item / Driver / Accessory |
| **Package** | Package or product group name (e.g. "Office Downlight Package") |
| **Specification** | How this product is specified: Specified / Equally Approved / Approved Vendor List / Alternative |
| **Item Code** | Link to an existing Item in ERPNext — fills in brand, product, description, price automatically |
| **Location** | Where in the project this product goes (e.g. "Reception", "Level 3 Offices") |
| **Proposed Brand** | The brand name shown to the client |
| **Proposed Product** | The product code shown to the client |
| **Description** | The product description shown to the client |
| **Image** | Upload or link a product image |

```
[ SCREENSHOT — Add Row dialog, Section 1 (Product Identity) filled in ]
```

> **Shortcut:** If you select an **Item Code**, the system will automatically fill in the Brand, Product code, Description, EXW price, and Currency from the Item record. You only need to adjust what is different.

---

**Section 2 — Pricing (EXW)**

| Field | What to enter |
|---|---|
| **Price Type** | Accurate (confirmed price) or Estimated (budget price) |
| **Supplier Brand** | The actual supplier brand (may differ from proposed brand if an alternative is offered) |
| **U.EXW** | The unit Ex-Works price from the supplier |
| **Discount %** | Any discount given by the supplier (e.g. 10 means 10% off) |
| **Currency** | EUR / USD / AED / GBP |
| **Markup ×** | The markup multiplier for this specific line (leave blank to use the global default) |
| **Qty** | Quantity required |
| **UOM** | Unit of measure: Nos / Meter / Set |
| **Risk** | Approval risk: High / Medium / Low |

```
[ SCREENSHOT — Add Row dialog, Section 2 (Pricing) filled in ]
```

---

**Section 3 — Cost % Overrides**

This section lets you override the global freight, insurance, customs, samples, and LC percentages for this specific line. Leave a field at 0 to use the global default set in the Cost Parameters section.

```
[ SCREENSHOT — Section 3 showing cost % override fields (mostly at 0 = using global) ]
```

> **Example:** If a particular product ships by air instead of sea, you might set Freight% to 20% for just that line, while all other lines keep the default 10%.

---

**Section 4 — Alternatives**

If you want to propose alternative products alongside the main specified item, fill in the alternative brand and product here.

| Field | What to enter |
|---|---|
| **Alt 1 Brand / Product / Description** | First alternative option |
| **Alt 2 Brand / Product / Description** | Second alternative option |

```
[ SCREENSHOT — Section 4 showing two alternative products filled in ]
```

Click **"Save Row"** when done. The row appears in the workspace and all costs are calculated immediately.

---

### 3.8 Editing or Deleting a Line

To edit a row: **double-click on it** in the workspace table, or click the **pencil icon (✏)** in the row. The same dialog box will open with all the existing values.

```
[ SCREENSHOT — Pencil edit button visible in a row ]
```

To delete a row: open the edit dialog and click the **"Delete Row"** button at the bottom of the dialog. You will be asked to confirm.

```
[ SCREENSHOT — Edit dialog open with the "Delete Row" button visible ]
```

---

### 3.9 Row Types

Every line you add belongs to one of three row types. This controls how the row looks and how it is treated in summaries.

**Main Item** — The primary lighting fixture.
- White background
- Dark navy left border
- Included in the Brand Summary totals

```
[ SCREENSHOT — A Main Item row in the workspace ]
```

**Driver** — The power driver or ballast for the fixture.
- Light blue background
- Blue left border
- NOT included in Brand Summary totals (it's a component of the Main Item)

```
[ SCREENSHOT — A Driver row directly below a Main Item row ]
```

**Accessory** — Cables, mounting kits, connectors, or any additional items.
- Light grey background
- Grey left border
- NOT included in Brand Summary totals

```
[ SCREENSHOT — An Accessory row (e.g. ACC: Mounting Bracket) ]
```

> **Auto-detection:** The system tries to detect the row type from what you type in the Product field. If the product name starts with "DRIVER" it becomes a Driver row. If it starts with "ACC:" it becomes an Accessory. If the IS# has a decimal (e.g. 1.1, 1.2) it also becomes an Accessory. You can always override the type manually in the Row Type field.

---

### 3.10 How the Costing Calculates

Here is what happens step by step for every row, in plain English:

**Step 1 — Net EXW Price**
Take the supplier's price and subtract the supplier discount.
*Example: Price is €100, discount is 5% → Net EXW = €95*

**Step 2 — Convert to AED**
Multiply the net price by the exchange rate.
*Example: €95 × 4.50 = AED 427.50 per unit*

**Step 3 — Add Freight**
Multiply the AED price by the Freight %.
*Example: AED 427.50 × 10% = AED 42.75 freight*

**Step 4 — Add Insurance**
Multiply the AED price by the Insurance %.
*Example: AED 427.50 × 1% = AED 4.28*

**Step 5 — Add Customs**
Multiply the AED price by the Customs %.
*Example: AED 427.50 × 6% = AED 25.65*

**Step 6 — Add Samples**
Multiply the AED price by the Samples %.
*Example: AED 427.50 × 1% = AED 4.28*

**Step 7 — Add Local Charges (LC)**
Multiply the AED price by the LC %.
*Example: AED 427.50 × 2% = AED 8.55*

**Step 8 — Landed Cost**
Add all of the above together.
*Example: 427.50 + 42.75 + 4.28 + 25.65 + 4.28 + 8.55 = AED 513.00 landed per unit*

**Step 9 — Selling Price**
Multiply the landed cost by your markup, rounded to the nearest AED.
*Example: AED 513.00 × 1.5 = AED 770 selling price per unit*

**Step 10 — Gross Margin %**
Shows what percentage of the selling price is your profit.
*Example: (770 − 513) / 770 × 100 = **33.4%** gross margin*

The GM% cell is colour-coded so you can spot margin issues immediately:
- **Green** = 30% or above — healthy
- **Orange** = 20–29% — acceptable but watch it
- **Red** = below 20% — below target, review the pricing

```
[ SCREENSHOT — A row with a green GM%, a row with orange GM%, and a row with red GM% side by side ]
```

---

### 3.11 The Brand Summary

At the bottom of the workspace there is a **Brand Summary** table. This is automatically calculated and updated every time the workspace refreshes.

It shows, for each brand, the total EXW value, total landed cost, profit, and total selling price — plus each brand's percentage share of the overall project.

```
[ SCREENSHOT — Brand Summary table showing multiple brands with their totals and percentages ]
```

The top bar of the Brand Summary shows the overall project totals:
- **EXW Total** — total supplier cost in AED
- **Landed Total** — total landed cost
- **Sell Total** — total selling value
- **GM%** — overall gross margin for the project

This table is also saved inside the quotation (in the Brand Summary section of the NL tab) so it is visible even when the workspace is collapsed.

> **Note:** Only **Main Item** rows are counted in the brand summary. Drivers and Accessories are excluded because they are part of the main fixture cost.

---

### 3.12 Downloading the Excel Costing Sheet

Click the **"↓ Excel"** button in the workspace top bar.

```
[ SCREENSHOT — The Excel download button in the workspace toolbar ]
```

This downloads a file named `NL_Costing_<Quotation Number>.xlsx` which is a full Excel workbook with:
- All the same columns as the workspace (A through AS, 39 columns)
- All calculated cells use **real Excel formulas**, not hardcoded numbers — so you can still edit values in Excel and watch the numbers recalculate
- The same colour coding for landed cost (blue) and selling price (green) columns
- A Brand Summary block at the bottom of the sheet

```
[ SCREENSHOT — The downloaded Excel file open in Excel, showing the coloured column groups ]
```

```
[ SCREENSHOT — The Brand Summary section at the bottom of the Excel file ]
```

---

## 4. Print Formats — Sending to the Client

### 4.1 Commercial Proposal

When you are ready to send the quotation to the client, use the **NL Commercial Proposal** print format. This is a clean, professional A4 landscape document that shows only the client-facing information — no internal costing, no margins, no landed cost.

To print it: open the Quotation → click Print → select **"NL Commercial Proposal"** from the format list.

```
[ SCREENSHOT — The Print button on the Quotation and the format selection dropdown ]
```

The document includes:

- **Header** — Newline MEA company details on the left, "Commercial Proposal" title on the right
- **Client details** — Customer name, address, attention name, reference number, date
- **Project name** — shown with a navy accent bar
- **Product table** — showing for each line:
  - IS number, Package, Specification, Product Type/Location
  - Product image (if uploaded)
  - Brand and Product code (bold)
  - Full description
  - Quantity and UOM
  - Unit Sell Price (AED)
  - Total Sell Price (AED)
- **Grand Total box** — total quantity and total value in AED

```
[ SCREENSHOT — Full Commercial Proposal printout showing header, client details, and product table ]
```

```
[ SCREENSHOT — Close-up of the product table showing an image, brand, description, and sell price ]
```

```
[ SCREENSHOT — The Grand Total box at the bottom right of the proposal ]
```

> **What the client does NOT see:** The Commercial Proposal hides all internal costing data — no EXW price, no freight percentage, no landed cost, no markup, no gross margin. The client only sees the selling price.

---

## 5. Quick Reference — All Formulas Explained Simply

| What you see | How it is calculated |
|---|---|
| **Net EXW** | Supplier price minus the supplier discount |
| **EXW Unit AED** | Net EXW × exchange rate |
| **EXW Total AED** | EXW Unit AED × quantity |
| **Freight Unit AED** | EXW Unit AED × Freight % |
| **Insurance Unit AED** | EXW Unit AED × Insurance % |
| **Customs Unit AED** | EXW Unit AED × Customs % |
| **Samples Unit AED** | EXW Unit AED × Samples % |
| **LC Unit AED** | EXW Unit AED × LC % |
| **Landed Unit AED** | EXW + Freight + Insurance + Customs + Samples + LC |
| **Landed Total AED** | Landed Unit × Quantity |
| **Unit Sell AED** | Landed Unit × Markup (rounded to nearest AED) |
| **Total Sell AED** | Unit Sell × Quantity |
| **GM%** | (Unit Sell − Landed Unit) ÷ Unit Sell × 100 |

---

**Default Percentages (applied to all lines unless overridden per line):**

| Cost | Default % |
|---|---|
| Freight | 10% |
| Insurance | 1% |
| Customs | 6% |
| Samples | 1% |
| Local Charges | 2% |
| **Markup** | **1.5×** |

---

*End of User Guide — Newline MEA Lighting Module*
