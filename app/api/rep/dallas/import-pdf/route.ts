import { NextResponse } from 'next/server';
import { loadCatalog } from '@/lib/catalog/loadCatalog';
import { extractText } from 'unpdf';

interface ParsedItem {
  sku: string;
  name: string;
  qty: number;
  unitList: number;
  collection?: string;
}

interface ParseResult {
  ok: ParsedItem[];
  unknown: { sku: string; qty: number }[];
  duplicate: { sku: string }[];
  totalLines: number;
  submitDate?: string;
  vendor?: string;
}

// Common SKU patterns for lighting products
const SKU_PATTERNS = [
  // Lib & Co patterns
  /\b(\d{5}-\d{2,3})\b/g,           // 12180-041, 10134-01

  // Savoy House patterns
  /\b(\d-\d{4}-\d{1,2}-\d{1,3})\b/g,   // 1-6682-15-89, 1-7712-10-195
  /\b(\d-\d{4}-\d{1,2}-[A-Z]{2,3})\b/g, // 8-1627-4-BK, 8-2988-3-BK
  /\b(M\d{5,6}[A-Z]{2,6})\b/g,         // M80079MBKNB, M100114MBKNB (Meridian)

  // Hubbardton Forge patterns
  /\b([A-Z]{2,3}\d{4,5}[A-Z]?)\b/g, // HF2345A, SV12345
  /\b(\d{4,5}[A-Z]{1,3}\d{0,2})\b/g, // 1234AB, 12345A01
];

// Extract quantity from nearby text
function extractQuantity(text: string, skuPosition: number): number {
  // Look for qty patterns near the SKU
  const surroundingText = text.slice(Math.max(0, skuPosition - 50), skuPosition + 100);

  // Common patterns: "Qty: 2", "x2", "× 2", "2 ea", just a number after SKU
  const qtyPatterns = [
    /qty[:\s]*(\d+)/i,
    /quantity[:\s]*(\d+)/i,
    /×\s*(\d+)/,
    /x\s*(\d+)/i,
    /(\d+)\s*(?:ea|pcs?|units?)/i,
    /\s+(\d+)\s*$/,  // Number at end of line
  ];

  for (const pattern of qtyPatterns) {
    const match = surroundingText.match(pattern);
    if (match) {
      const qty = parseInt(match[1], 10);
      if (qty > 0 && qty < 1000) { // Reasonable quantity range
        return qty;
      }
    }
  }

  return 1; // Default quantity
}

// Extract submit date from PDF text
function extractSubmitDate(text: string): string | undefined {
  // Common date patterns in order PDFs
  const datePatterns = [
    // "Date: MM/DD/YYYY" or "Submit Date: MM/DD/YYYY"
    /(?:submit\s*)?date[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    // "Submitted: MM/DD/YYYY"
    /submitted[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    // "Order Date: MM/DD/YYYY"
    /order\s*date[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    // "Created: MM/DD/YYYY"
    /created[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    // Month DD, YYYY format (e.g., "January 15, 2025")
    /(?:submit\s*)?date[:\s]+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
    // Just "Month YYYY" format (e.g., "June 2024")
    /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
    // ISO format YYYY-MM-DD
    /(?:submit\s*)?date[:\s]+(\d{4}-\d{2}-\d{2})/i,
    // MM/DD/YYYY anywhere in document
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/,
    // MM/DD/YY format
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2})(?!\d)/,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return undefined;
}

// Extract vendor name from PDF text
function extractVendor(text: string): string | undefined {
  // Known vendor patterns
  const vendorPatterns = [
    // Savoy House
    /(Savoy\s*House(?:\s*Lighting)?)/i,
    // Lib & Co
    /(Lib\s*&\s*Co)/i,
    // Hubbardton Forge
    /(Hubbardton\s*Forge)/i,
    // Maxim Lighting
    /(Maxim\s*Lighting)/i,
    // ET2 Lighting
    /(ET2\s*(?:Lighting)?)/i,
    // Meridian
    /(Meridian\s*(?:Lighting)?)/i,
  ];

  for (const pattern of vendorPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return undefined;
}

async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  const { text } = await extractText(buffer);
  // unpdf returns an array of strings (one per page), join them
  return Array.isArray(text) ? text.join('\n') : text;
}

function parseSkusFromText(text: string): Map<string, number> {
  const skuQtyMap = new Map<string, number>();

  // Try each pattern
  for (const pattern of SKU_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);

    while ((match = regex.exec(text)) !== null) {
      const sku = match[1].toUpperCase();

      // Skip if already found
      if (skuQtyMap.has(sku)) continue;

      const qty = extractQuantity(text, match.index);
      skuQtyMap.set(sku, qty);
    }
  }

  return skuQtyMap;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF files are accepted.' },
        { status: 400 }
      );
    }

    // Load catalog for validation
    const catalog = await loadCatalog();
    const catalogMap = new Map(
      catalog.map((item) => [item.sku.toUpperCase(), item])
    );

    // Extract text from PDF
    const buffer = await file.arrayBuffer();
    const text = await extractTextFromPDF(buffer);

    // Parse SKUs from text
    const parsedSkus = parseSkusFromText(text);

    // Extract submit date and vendor
    const submitDate = extractSubmitDate(text);
    const vendor = extractVendor(text);

    // Validate against catalog
    const result: ParseResult = {
      ok: [],
      unknown: [],
      duplicate: [],
      totalLines: parsedSkus.size,
      submitDate,
      vendor,
    };

    const seen = new Set<string>();

    for (const [sku, qty] of Array.from(parsedSkus)) {
      if (seen.has(sku)) {
        result.duplicate.push({ sku });
        continue;
      }
      seen.add(sku);

      const catalogItem = catalogMap.get(sku);
      if (catalogItem) {
        result.ok.push({
          sku: catalogItem.sku,
          name: catalogItem.name,
          qty,
          unitList: catalogItem.list || 0,
          collection: catalogItem.collectionName,
        });
      } else {
        result.unknown.push({ sku, qty });
      }
    }

    // Sort by collection, then by SKU
    result.ok.sort((a, b) => {
      if (a.collection && b.collection) {
        const collectionCompare = a.collection.localeCompare(b.collection);
        if (collectionCompare !== 0) return collectionCompare;
      }
      return a.sku.localeCompare(b.sku);
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('PDF import error:', error);
    return NextResponse.json(
      { error: 'Failed to parse PDF' },
      { status: 500 }
    );
  }
}
