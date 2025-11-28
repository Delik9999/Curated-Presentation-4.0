// API endpoint for uploading and processing vendor data

import { NextRequest, NextResponse } from 'next/server';
import { VendorMapping } from '@/lib/imports/mapping-types';
import { detectJSONShape, extractRows, analyzeColumns } from '@/lib/imports/shape-detector';
import { normalizeVendorData } from '@/lib/imports/normalizer';
import { generateImportPreview, applyFilters, SafetyToggles } from '@/lib/imports/diff-generator';
import { commitImport } from '@/lib/imports/commit-importer';

// POST - Process upload with different actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'analyze':
        return handleAnalyze(body);
      case 'preview':
        return handlePreview(body);
      case 'commit':
        return handleCommit(body);
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Import API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Analyze uploaded JSON file and suggest mappings
async function handleAnalyze(body: any) {
  const { jsonData } = body;

  if (!jsonData) {
    return NextResponse.json(
      { error: 'jsonData is required' },
      { status: 400 }
    );
  }

  try {
    // Detect shape
    const shape = detectJSONShape(jsonData);

    // Extract rows for analysis
    const rows = extractRows(jsonData, shape);
    const rawRows = rows.map((r) => r.row);

    // Analyze columns
    const columns = analyzeColumns(rawRows, 100); // Sample first 100 rows

    return NextResponse.json({
      shape,
      totalRows: rows.length,
      columns,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to analyze JSON: ' + (error instanceof Error ? error.message : error) },
      { status: 400 }
    );
  }
}

// Generate preview using mapping
async function handlePreview(body: any) {
  const {
    jsonData,
    mapping,
    vendorCode,
    effectiveFrom,
    safetyToggles,
  }: {
    jsonData: any;
    mapping: VendorMapping;
    vendorCode: string;
    effectiveFrom?: string;
    safetyToggles?: SafetyToggles;
  } = body;

  if (!jsonData || !mapping || !vendorCode) {
    return NextResponse.json(
      { error: 'jsonData, mapping, and vendorCode are required' },
      { status: 400 }
    );
  }

  try {
    // Normalize vendor data using mapping
    const normalized = normalizeVendorData(jsonData, {
      vendorCode,
      mapping,
      effectiveFrom,
    });

    // Generate preview
    let preview = generateImportPreview(normalized, {
      vendorCode,
      effectiveFrom,
      markMissingAsDiscontinued: safetyToggles?.markMissingAsDiscontinued,
    });

    // Apply safety filters
    if (safetyToggles) {
      preview = applyFilters(preview, safetyToggles);
    }

    return NextResponse.json({ preview });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate preview: ' + (error instanceof Error ? error.message : error) },
      { status: 400 }
    );
  }
}

// Commit the import
async function handleCommit(body: any) {
  const {
    jsonData,
    mapping,
    vendorCode,
    effectiveFrom,
    safetyToggles,
    importedBy,
    notes,
  }: {
    jsonData: any;
    mapping: VendorMapping;
    vendorCode: string;
    effectiveFrom: string;
    safetyToggles: SafetyToggles;
    importedBy: string;
    notes?: string;
  } = body;

  if (!jsonData || !mapping || !vendorCode || !effectiveFrom || !importedBy) {
    return NextResponse.json(
      { error: 'jsonData, mapping, vendorCode, effectiveFrom, and importedBy are required' },
      { status: 400 }
    );
  }

  try {
    // Normalize vendor data using mapping
    const normalized = normalizeVendorData(jsonData, {
      vendorCode,
      mapping,
      effectiveFrom,
      introductionsTag: safetyToggles?.tagNewAsIntroductions ? 'introduction' : undefined,
    });

    // Generate preview
    let preview = generateImportPreview(normalized, {
      vendorCode,
      effectiveFrom,
      markMissingAsDiscontinued: safetyToggles?.markMissingAsDiscontinued,
    });

    // Apply safety filters
    preview = applyFilters(preview, safetyToggles);

    // Commit the import
    const result = await commitImport(preview, {
      vendorCode,
      effectiveFrom,
      safetyToggles,
      importedBy,
      notes,
    });

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to commit import: ' + (error instanceof Error ? error.message : error) },
      { status: 500 }
    );
  }
}
