'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// PDF.js will be loaded from CDN
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

// PDF.js CDN version
const PDFJS_VERSION = '3.11.174';
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

let pdfjsLoaded = false;

// Types
export interface ParsedItem {
  sku: string;
  quantity: number;
  description?: string;
  isValid?: boolean;
  collectionName?: string;
}

export type OrderType = 'STOCKING' | 'PROJECT';

export interface OrderMetadata {
  orderDate?: string;
  salesOrderNumber?: string;
  customerNumber?: string;
  poNumber?: string; // Your Reference / PO
}

export interface ClassificationResult {
  type: OrderType;
  confidence: string;
  metrics: {
    uniqueSKUs: number;
    totalUnits: number;
    avgDepth: number;
  };
}

export interface ParsedOrder {
  filename: string;
  items: ParsedItem[];
  classification: ClassificationResult;
  metadata: OrderMetadata;
  userOverride?: OrderType;
}

interface OrderImporterProps {
  onImport: (order: ParsedOrder) => void;
  onCancel?: () => void;
}

// Heuristic Classification Logic
function classifyOrder(items: ParsedItem[]): ClassificationResult {
  // Calculate metrics
  const uniqueSKUs = new Set(items.map(i => i.sku)).size;
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const avgDepth = uniqueSKUs > 0 ? totalUnits / uniqueSKUs : 0;

  const metrics = { uniqueSKUs, totalUnits, avgDepth };

  // Classification rules - only STOCKING or PROJECT
  // PROJECT: Deep order - avg 4+ of same item
  if (avgDepth > 4.0) {
    return {
      type: 'PROJECT',
      confidence: 'High (Deep Quantity per SKU)',
      metrics,
    };
  }

  // STOCKING: Default for display orders
  // Wide variety with low depth = floor setup
  return {
    type: 'STOCKING',
    confidence: uniqueSKUs >= 3 && avgDepth < 2 ? 'High (Display Order)' : 'Moderate',
    metrics,
  };
}

// Extract metadata from PDF text
function extractMetadata(text: string): OrderMetadata {
  const metadata: OrderMetadata = {};

  // Sales Order Number (SO-XXXXXX)
  const soMatch = text.match(/\b(SO-\d{6})\b/i);
  if (soMatch) {
    metadata.salesOrderNumber = soMatch[1].toUpperCase();
  }

  // Customer Number (C00XXX or Customer Number - CXXXXX)
  const custMatch = text.match(/Customer\s*Number\s*[-–]?\s*([A-Z]?\d{3,6})/i) ||
                    text.match(/\b(C\d{5})\b/);
  if (custMatch) {
    metadata.customerNumber = custMatch[1].toUpperCase();
  }

  // Date - various formats
  // "March 21, 2025" or "21 March 2025" or "2025-03-21"
  const datePatterns = [
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
    /\b(\d{4})-(\d{2})-(\d{2})\b/,
  ];

  for (const pattern of datePatterns) {
    const dateMatch = text.match(pattern);
    if (dateMatch) {
      if (pattern === datePatterns[0]) {
        // "March 21, 2025"
        const months: Record<string, string> = {
          january: '01', february: '02', march: '03', april: '04',
          may: '05', june: '06', july: '07', august: '08',
          september: '09', october: '10', november: '11', december: '12'
        };
        const month = months[dateMatch[1].toLowerCase()];
        const day = dateMatch[2].padStart(2, '0');
        metadata.orderDate = `${dateMatch[3]}-${month}-${day}`;
      } else if (pattern === datePatterns[2]) {
        // "2025-03-21"
        metadata.orderDate = dateMatch[0];
      }
      break;
    }
  }

  // PO Number - from "External Document No." field
  // Lib&Co format: 5 digits + hyphen + letters (e.g., "65166-ADDITIONS")
  // Or just 5 digits (e.g., "65166")

  // First, look for the most specific pattern: 5 digits + hyphen + letters
  // This is unique to External Document No. and won't match SKUs or addresses
  const withSuffixMatch = text.match(/\b(\d{5}-[A-Z]{2,})\b/i);
  if (withSuffixMatch) {
    metadata.poNumber = withSuffixMatch[1];
  } else {
    // Fallback: Look for standalone 5-digit numbers
    // Must exclude: SO numbers, SKUs (XXXXX-XX), addresses
    const allFiveDigit = Array.from(text.matchAll(/\b(\d{5})\b/g));
    for (const match of allFiveDigit) {
      const num = match[1];
      const idx = match.index || 0;

      // Check what comes after this number
      const after = text.substring(idx + 5, idx + 10);

      // Skip if it's a SKU (followed by -XX or -XXX)
      if (after.match(/^-\d{2,3}\b/)) continue;

      // Skip if it's part of SO number
      if (text.substring(idx - 3, idx) === 'SO-') continue;

      // Skip if it's part of an address (followed by street name)
      if (after.match(/^\s+[A-Z]/i)) {
        const nextWord = text.substring(idx + 5, idx + 30).match(/^\s+(\w+)/);
        if (nextWord && ['CROYDON', 'DRIVE', 'STREET', 'AVE', 'ROAD'].some(w =>
          nextWord[1].toUpperCase().includes(w))) continue;
      }

      metadata.poNumber = num;
      break;
    }
  }

  return metadata;
}

// Dynamically load PDF.js from CDN
async function loadPdfJs(): Promise<void> {
  if (pdfjsLoaded && window.pdfjsLib) return;

  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.pdfjsLib) {
      pdfjsLoaded = true;
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;
      resolve();
      return;
    }

    // Load PDF.js from CDN
    const script = document.createElement('script');
    script.src = `${PDFJS_CDN}/pdf.min.js`;
    script.async = true;

    script.onload = () => {
      pdfjsLoaded = true;
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;
      resolve();
    };

    script.onerror = () => {
      reject(new Error('Failed to load PDF.js from CDN'));
    };

    document.head.appendChild(script);
  });
}

// Extract text from PDF
async function extractTextFromPDF(file: File): Promise<string> {
  await loadPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

// Parse SKUs and quantities from text
function parseOrderItems(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const seen = new Set<string>();

  // Lib&Co SKU format: 5 digits, dash, 2-3 digits (e.g., 10131-01, 10176-031)
  // PDF text often lacks clear line breaks, so we find all SKUs first

  // Find all Lib&Co format SKUs in the text
  const skuPattern = /\b(\d{4,5}-\d{2,3})\b/g;
  const skuMatches: { sku: string; index: number }[] = [];

  let match;
  while ((match = skuPattern.exec(text)) !== null) {
    skuMatches.push({ sku: match[1], index: match.index });
  }

  // For each SKU, try to find its quantity
  for (let i = 0; i < skuMatches.length; i++) {
    const { sku, index } = skuMatches[i];

    if (seen.has(sku)) continue;
    seen.add(sku);

    // Look at text between this SKU and the next SKU (or end of text)
    const endIndex = i < skuMatches.length - 1
      ? skuMatches[i + 1].index
      : text.length;

    const segment = text.substring(index + sku.length, endIndex);

    // Lib&Co specific quantity parsing
    // Format: SKU Description QTY UNIT_PRICE AMOUNT
    // QTY is always followed by BOTH unit price AND amount (two decimal numbers)
    // Example: "10131-01 Ragusa, Large LED... 1 141.00 70.50"
    // Key: QTY must be followed by TWO prices to distinguish from "2 Light Pendant"

    let quantity = 1;

    // Look for pattern: digit(s) followed by TWO decimal numbers (unit price + amount)
    // This prevents matching "2 Light" or "2 Tier" in descriptions
    // Match: qty + price + price (all three in sequence)
    const qtyPriceAmtMatch = segment.match(/\s(\d{1,2})\s+(\d{1,3}(?:,\d{3})*\.\d{2})\s+(\d{1,3}(?:,\d{3})*\.\d{2})\b/);
    if (qtyPriceAmtMatch) {
      quantity = parseInt(qtyPriceAmtMatch[1], 10);
    }

    items.push({ sku, quantity });
  }

  // Fallback: If no Lib&Co SKUs found, try other patterns
  if (items.length === 0) {
    const fallbackPattern = /\b([A-Z]{2,}[0-9]+-[A-Z0-9]+)\b/gi;
    while ((match = fallbackPattern.exec(text)) !== null) {
      const sku = match[1].toUpperCase();
      if (!seen.has(sku)) {
        seen.add(sku);
        items.push({ sku, quantity: 1 });
      }
    }
  }

  return items;
}

type ImportState = 'idle' | 'processing' | 'review' | 'error';

export function OrderImporter({ onImport, onCancel }: OrderImporterProps) {
  const [state, setState] = useState<ImportState>('idle');
  const [parsedOrder, setParsedOrder] = useState<ParsedOrder | null>(null);
  const [selectedType, setSelectedType] = useState<OrderType>('STOCKING');
  const [error, setError] = useState<string | null>(null);

  // SKU editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingSku, setEditingSku] = useState<string>('');
  const [validating, setValidating] = useState(false);

  // Start editing an unmatched SKU
  const startEditSku = (index: number, currentSku: string) => {
    setEditingIndex(index);
    setEditingSku(currentSku);
  };

  // Cancel SKU editing
  const cancelEditSku = () => {
    setEditingIndex(null);
    setEditingSku('');
  };

  // Validate and save edited SKU
  const saveEditedSku = async () => {
    if (!parsedOrder || editingIndex === null || !editingSku.trim()) return;

    setValidating(true);
    try {
      // Validate the new SKU against the catalog
      const response = await fetch(`/api/catalog/skus?q=${encodeURIComponent(editingSku.trim())}`);
      const suggestions = await response.json();
      const match = suggestions.find((s: { sku: string; collectionName: string }) =>
        s.sku.toUpperCase() === editingSku.trim().toUpperCase()
      );

      // Update the item in the parsed order
      const updatedItems = [...parsedOrder.items];
      updatedItems[editingIndex] = {
        ...updatedItems[editingIndex],
        sku: editingSku.trim(),
        isValid: !!match,
        collectionName: match?.collectionName,
      };

      setParsedOrder({
        ...parsedOrder,
        items: updatedItems,
      });

      // Clear editing state
      setEditingIndex(null);
      setEditingSku('');
    } catch (error) {
      console.error('Error validating SKU:', error);
    } finally {
      setValidating(false);
    }
  };

  // Handle Enter key in SKU edit input
  const handleSkuKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditedSku();
    } else if (e.key === 'Escape') {
      cancelEditSku();
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file');
      setState('error');
      return;
    }

    setState('processing');
    setError(null);

    try {
      // Extract text from PDF
      const text = await extractTextFromPDF(file);

      // Parse items
      const items = parseOrderItems(text);

      if (items.length === 0) {
        setError('No SKUs found in document. Please check the PDF format.');
        setState('error');
        return;
      }

      // Validate SKUs against database
      const validatedItems: ParsedItem[] = [];
      for (const item of items) {
        try {
          const response = await fetch(`/api/catalog/skus?q=${encodeURIComponent(item.sku)}`);
          const suggestions = await response.json();
          const match = suggestions.find((s: { sku: string; collectionName: string }) =>
            s.sku.toUpperCase() === item.sku.toUpperCase()
          );

          validatedItems.push({
            ...item,
            isValid: !!match,
            collectionName: match?.collectionName,
          });
        } catch {
          validatedItems.push({ ...item, isValid: false });
        }
      }

      // Classify the order
      const classification = classifyOrder(validatedItems);

      // Extract metadata (date, SO#, customer#, PO#)
      const metadata = extractMetadata(text);

      const order: ParsedOrder = {
        filename: file.name,
        items: validatedItems,
        classification,
        metadata,
      };

      setParsedOrder(order);
      setSelectedType(classification.type);
      setState('review');
    } catch (err) {
      console.error('PDF parsing error:', err);
      setError('Failed to parse PDF. Please try a different file.');
      setState('error');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  const handleConfirm = () => {
    if (!parsedOrder) return;

    const finalOrder: ParsedOrder = {
      ...parsedOrder,
      userOverride: selectedType !== parsedOrder.classification.type ? selectedType : undefined,
    };

    // Update classification if user overrode
    if (finalOrder.userOverride) {
      finalOrder.classification = {
        ...finalOrder.classification,
        type: selectedType,
        confidence: 'User Override',
      };
    }

    onImport(finalOrder);

    // Reset state
    setState('idle');
    setParsedOrder(null);
  };

  const handleReset = () => {
    setState('idle');
    setParsedOrder(null);
    setError(null);
  };

  // Get helper text for selected type
  const getTypeHelperText = (type: OrderType): string => {
    switch (type) {
      case 'PROJECT':
        return 'Revenue only. Will NOT affect Retail Trend line.';
      case 'STOCKING':
        return 'Display order. Will boost Retail Trend line (floor setup).';
    }
  };

  // Render based on state
  if (state === 'idle' || state === 'error') {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              flex flex-col items-center justify-center p-8 rounded-lg cursor-pointer
              transition-colors
              ${isDragActive
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300'
                : 'hover:bg-muted/50'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="text-4xl mb-3">📄</div>
            <p className="text-sm font-medium text-center">
              {isDragActive
                ? 'Drop the PDF here...'
                : 'Drop Sales Order PDF here'
              }
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              or click to browse
            </p>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (state === 'processing') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4" />
            <p className="text-sm font-medium">Analyzing Order Intent...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Extracting SKUs and quantities
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Review state
  if (state === 'review' && parsedOrder) {
    const { classification, items, filename, metadata } = parsedOrder;

    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          {/* Header with metadata */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {metadata.salesOrderNumber || filename}
              </p>
              <p className="text-xs text-muted-foreground">
                Found {items.length} items ({classification.metrics.totalUnits} units)
              </p>
            </div>
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Change file
            </button>
          </div>

          {/* Order Metadata */}
          {(metadata.orderDate || metadata.customerNumber || metadata.poNumber) && (
            <div className="text-xs space-y-1 p-2 bg-muted/30 rounded">
              {metadata.orderDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">
                    {new Date(metadata.orderDate).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </span>
                </div>
              )}
              {metadata.customerNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-mono font-medium">{metadata.customerNumber}</span>
                </div>
              )}
              {metadata.poNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PO/Ref:</span>
                  <span className="font-medium">{metadata.poNumber}</span>
                </div>
              )}
            </div>
          )}

          {/* Items Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Items to Import
              </p>
              {items.some(i => i.isValid === false) && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  {items.filter(i => i.isValid === false).length} not found - click to edit
                </span>
              )}
            </div>
            <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1.5">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between text-xs gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {item.isValid === true && (
                      <span className="text-green-500 flex-shrink-0" title="Found in catalog">✓</span>
                    )}
                    {item.isValid === false && editingIndex !== idx && (
                      <span className="text-amber-500 flex-shrink-0" title="Click to edit SKU">⚠</span>
                    )}
                    {editingIndex === idx && (
                      <span className="text-blue-500 flex-shrink-0">✎</span>
                    )}
                    <div className="min-w-0 flex-1">
                      {editingIndex === idx ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingSku}
                            onChange={(e) => setEditingSku(e.target.value)}
                            onKeyDown={handleSkuKeyDown}
                            className="font-mono text-xs px-1.5 py-0.5 border rounded w-24 bg-background focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Enter SKU"
                            autoFocus
                            disabled={validating}
                          />
                          <button
                            onClick={saveEditedSku}
                            disabled={validating || !editingSku.trim()}
                            className="text-green-600 hover:text-green-700 disabled:opacity-50 px-1"
                            title="Save"
                          >
                            {validating ? '...' : '✓'}
                          </button>
                          <button
                            onClick={cancelEditSku}
                            disabled={validating}
                            className="text-red-500 hover:text-red-600 disabled:opacity-50 px-1"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <span
                            className={`font-mono ${
                              item.isValid === false
                                ? 'text-amber-600 dark:text-amber-400 cursor-pointer hover:underline'
                                : ''
                            }`}
                            onClick={() => item.isValid === false && startEditSku(idx, item.sku)}
                            title={item.isValid === false ? 'Click to edit SKU' : undefined}
                          >
                            {item.sku}
                          </span>
                          {item.collectionName && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {item.collectionName}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-muted-foreground flex-shrink-0">× {item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
              <span>{items.length} SKUs</span>
              <span>{items.reduce((sum, i) => sum + i.quantity, 0)} total units</span>
            </div>
          </div>

          {/* Type Selection - Only STOCKING and PROJECT */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Order Type
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedType('STOCKING')}
                className={`
                  px-3 py-2 rounded text-sm font-medium transition-all
                  ${selectedType === 'STOCKING'
                    ? 'bg-blue-500 text-white'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }
                `}
              >
                📦 Display
              </button>
              <button
                onClick={() => setSelectedType('PROJECT')}
                className={`
                  px-3 py-2 rounded text-sm font-medium transition-all
                  ${selectedType === 'PROJECT'
                    ? 'bg-purple-500 text-white'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }
                `}
              >
                🏗️ Project
              </button>
            </div>
          </div>

          {/* Helper Text */}
          <div className={`
            text-xs p-2 rounded
            ${selectedType === 'PROJECT'
              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
            }
          `}>
            {getTypeHelperText(selectedType)}
          </div>

          {/* Confidence indicator */}
          {selectedType === classification.type && (
            <p className="text-xs text-muted-foreground">
              Auto-detected: {classification.confidence}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleConfirm}
              className="flex-1"
            >
              Import Order
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
