# Vendor Setup Guide

Complete guide for setting up new vendors using the Product Import system.

## Overview

The Product Import system allows you to onboard new vendors by uploading their native JSON product files and mapping their fields to your canonical schema. No code changes required!

## Quick Start

1. Navigate to `/rep` and click the **Imports** tab
2. Follow the 4-step wizard to import vendor data

## Step-by-Step Process

### Step 1: Prepare Vendor Data

Ensure you have the vendor's product data in one of these JSON formats:

**Format A - Flat Object (keyed by SKU):**
```json
{
  "SKU-001": {
    "Product Name": "Modern Pendant Light",
    "Collection": "Urban Series",
    "MSRP": 299.00,
    "Status": "Active",
    "Width": "12 in",
    "Height": "18 in",
    "Finish": "Brushed Nickel"
  },
  "SKU-002": {
    "Product Name": "Wall Sconce",
    "Collection": "Urban Series",
    "MSRP": 189.00,
    ...
  }
}
```

**Format B - Array of Products:**
```json
[
  {
    "SKU": "SKU-001",
    "Product Name": "Modern Pendant Light",
    "Collection": "Urban Series",
    "MSRP": 299.00,
    ...
  },
  {
    "SKU": "SKU-002",
    "Product Name": "Wall Sconce",
    ...
  }
]
```

### Step 2: Upload & Analyze

1. Enter **Vendor Code** (e.g., `hubbardton-forge`, `tech-lighting`)
   - Use lowercase with hyphens
   - This becomes the unique identifier for this vendor

2. **Upload JSON File**
   - Drag & drop or click to browse
   - System auto-detects structure and analyzes columns

### Step 3: Configure Field Mapping

Map vendor columns to canonical fields:

**Required Mappings:**
- **SKU** - Unique product identifier
- **Name** - Product name/description
- **Collection** - Collection/series name
- **Price** - At least one price column (MSRP, Dealer, etc.)

**Optional Mappings:**
- **Status** - Active/Discontinued/Archived
- **Specs** - Additional product specifications (dimensions, finishes, etc.)

**Transforms:**
The system automatically applies smart transforms:
- **Number columns**: Removes commas, currency symbols → converts to number
- **Dimension columns**: Strips units (in, cm, mm, ft) → converts to number
- **Text columns**: Trims whitespace
- **Status columns**: Normalizes to active/discontinued/archived

### Step 4: Review Preview

The system generates a detailed diff showing:

- **New Products** (green) - Products being added
- **Updated Products** (blue) - Existing products with changes
- **Price Changes** (yellow) - Products with only price updates
- **Unchanged** (gray) - Products with no changes

**Review carefully before committing!**

### Step 5: Commit Import

Once satisfied with the preview:

1. Click **Commit Import**
2. System performs upsert (merge-only, never replaces existing data)
3. Generates audit trail with import ID
4. Shows summary of changes applied

## Import Behavior & Rules

### Upsert Logic (Merge-Only)

- **Existing products**: Updates only fields that changed
- **New products**: Adds to catalog
- **Never replaces**: Preserves existing media, selections, custom data
- **Price versioning**: Tracks price changes with effective dates

### Safety Toggles (Future Enhancement)

The system supports these safety options:

- **Prices Only** - Update prices, ignore other fields
- **Specs Only** - Update specifications, ignore prices
- **Don't Change Collections** - Prevent collection reassignments
- **Mark Missing as Discontinued** - Auto-discontinue products not in import
- **Tag New as Introductions** - Add "introduction" badge to new products

### Data Storage

Imported data is stored in:

- `/data/imports/products.json` - Normalized product catalog
- `/data/imports/mappings.json` - Saved vendor mappings (reusable)
- `/data/imports/audit/` - Complete import history and audit trail

## Vendor Mapping Examples

### Example 1: Lib & Co

```javascript
{
  vendorCode: "lib-and-co",
  shape: "flat",
  sku: { type: "flat_key" },  // SKU is the object key
  name: {
    type: "column",
    column: "Product Description"
  },
  collection: {
    type: "column",
    column: "Collection name"
  },
  prices: [
    {
      type: "column",
      column: "CAD MSRP",
      tier: "MSRP",
      currency: "CAD",
      transforms: [
        { type: "remove_commas" },
        { type: "number" }
      ]
    }
  ],
  specs: [
    { column: "Width", as: "width", transforms: [{ type: "strip_units" }, { type: "number" }] },
    { column: "Height", as: "height", transforms: [{ type: "strip_units" }, { type: "number" }] },
    { column: "Finish", as: "finish" }
  ]
}
```

### Example 2: Savoy House

```javascript
{
  vendorCode: "savoy-house",
  shape: "array",
  sku: {
    type: "column",
    column: "Item Number"
  },
  name: {
    type: "column",
    column: "Product Name"
  },
  collection: {
    type: "column",
    column: "Theme"
  },
  status: {
    type: "column",
    column: "Status",
    enumMap: {
      "A": "active",
      "D": "discontinued",
      "X": "archived"
    }
  },
  prices: [
    {
      type: "column",
      column: "List Price",
      tier: "MSRP",
      currency: "USD"
    }
  ]
}
```

## Reusing Mappings

Mappings are automatically saved and can be reused:

1. Navigate to **Imports** tab
2. Upload new file from same vendor
3. System detects matching vendor code
4. Click "Load Last Used Mapping" (future feature)
5. Review and adjust if needed

## Best Practices

### Data Quality

- **Validate JSON** - Ensure valid JSON before uploading
- **Consistent column names** - Vendor should use same field names each time
- **Complete data** - All required fields should have values
- **Test with sample** - Start with small subset to validate mapping

### Vendor Codes

- Use **lowercase with hyphens**: `hubbardton-forge`, `tech-lighting`
- Be **consistent** - Same code for all imports from this vendor
- Make it **meaningful** - Easy to identify vendor

### Pricing Strategy

- Map **all price tiers** (MSRP, Dealer, Contractor, etc.)
- Specify correct **currency** (USD, CAD, EUR)
- Use **effective dates** for price updates

### Collections

- Ensure **collection names** are consistent
- Use vendor's **canonical collection names**
- Collections auto-slugify for URLs (e.g., "Urban Series" → "urban-series")

## Troubleshooting

### Import Fails

**Problem**: "Failed to analyze file"
- **Solution**: Validate JSON syntax (use JSONLint.com)

**Problem**: "SKU mapping is required"
- **Solution**: Ensure SKU column is mapped correctly

**Problem**: "No products found"
- **Solution**: Check JSON structure matches expected format

### Mapping Issues

**Problem**: Prices show as $0
- **Solution**: Add `remove_commas` and `number` transforms

**Problem**: Dimensions incorrect
- **Solution**: Add `strip_units` transform to remove "in", "cm", etc.

**Problem**: Collection names don't match
- **Solution**: Verify collection column name is correct

### Data Issues

**Problem**: Products missing after import
- **Solution**: Check preview diff - they may be unchanged

**Problem**: Duplicate products
- **Solution**: Ensure SKU is unique identifier

## Next Steps After Import

Once vendor data is imported:

1. **Create Promotions** - Go to Promotion tab to configure offerings
2. **Assign to Customers** - Add vendor to customer's authorized vendors
3. **Add Collection Media** - Upload hero images/videos for collections
4. **Set Up Pricing** - Configure dealer-specific pricing if needed
5. **Test Customer View** - View as customer to verify presentation

## Advanced Features

### Transform Types

- `trim` - Remove leading/trailing whitespace
- `uppercase` - Convert to UPPERCASE
- `lowercase` - Convert to lowercase
- `number` - Parse as number (removes commas, $, etc.)
- `strip_units` - Remove units like "in", "cm", "mm"
- `remove_commas` - Remove commas from numbers
- `regex` - Custom regex find/replace

### Status Mapping

Auto-normalizes these values:
- **Active**: "active", "a", "1", "true", "yes" → `active`
- **Discontinued**: "discontinued", "d", "disc", "inactive", "0" → `discontinued`
- **Archived**: "archived", "archive", "arch" → `archived`

### Price Versioning

Each price change creates a versioned record:
```javascript
{
  tier: "MSRP",
  currency: "USD",
  amount: 299.00,
  effective_from: "2025-01-15",
  effective_to: null  // Current price
}
```

## Support

For issues or questions:
- Review audit logs in `/data/imports/audit/`
- Check import history for error details
- Verify mapping configuration in `/data/imports/mappings.json`

## Example Workflow

**Scenario**: Adding new vendor "Modern Lux"

1. Receive `modern-lux-products.json` from vendor
2. Navigate to `/rep` → **Imports** tab
3. Enter vendor code: `modern-lux`
4. Upload file
5. System detects array format, 250 products
6. Map columns:
   - SKU → "ItemCode"
   - Name → "ProductName"
   - Collection → "Series"
   - Price (MSRP, USD) → "RetailPrice"
7. Review preview: 250 new products, 0 updates
8. Commit import
9. Navigate to **Promotion** tab
10. Create new promotion for Modern Lux collections
11. Assign to customers
12. Done!

---

**The Product Import system makes vendor onboarding fast, safe, and repeatable!**
