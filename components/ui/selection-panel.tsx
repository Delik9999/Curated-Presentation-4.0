'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, Trash2, Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/button-modern';
import { Badge } from '@/components/ui/badge-modern';
import { cn } from '@/lib/utils';

export interface SelectionItem {
  sku: string;
  name: string;
  collection: string;
  imageUrl?: string;
  quantity: number;
  unitPrice?: number;
  configuration?: {
    baseItemCode: string;
    variantSku?: string;
    options: Record<string, string>;
    productName: string;
  };
}

export interface SelectionPanelProps {
  items: SelectionItem[];
  customerId: string;
  title?: string; // Optional custom title (defaults to "My Selection")
  onUpdateQuantity: (sku: string, quantity: number) => void;
  onRemoveItem: (sku: string) => void;
  onClearAll: () => void;
  onSaveSelection: () => Promise<void>;
  onExport: (format: 'pdf' | 'csv' | 'xlsx') => void;
}

export function SelectionPanel({
  items,
  customerId,
  title = 'My Selection',
  onUpdateQuantity,
  onRemoveItem,
  onClearAll,
  onSaveSelection,
  onExport,
}: SelectionPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Remember panel state in localStorage
  React.useEffect(() => {
    const savedState = localStorage.getItem('selection-panel-open');
    if (savedState !== null) {
      setIsOpen(savedState === 'true');
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('selection-panel-open', String(isOpen));
  }, [isOpen]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSelection();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all items from your selection?')) {
      onClearAll();
    }
  };

  const increaseQuantity = (sku: string, currentQty: number) => {
    onUpdateQuantity(sku, currentQty + 1);
  };

  const decreaseQuantity = (sku: string, currentQty: number) => {
    if (currentQty > 1) {
      onUpdateQuantity(sku, currentQty - 1);
    } else {
      onRemoveItem(sku);
    }
  };

  return (
    <>
      {/* Trigger Button - Fixed position */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed right-0 top-1/2 -translate-y-1/2 z-40',
          'flex items-center gap-2 px-4 py-3 rounded-l-xl',
          'bg-blue-600 text-white shadow-lg',
          'hover:bg-blue-700 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          isOpen && 'pointer-events-none opacity-0'
        )}
        aria-label={`Open selection panel. ${items.length} items selected`}
      >
        <ShoppingBag className="h-5 w-5" />
        <span className="font-medium">{title}</span>
        {items.length > 0 && (
          <Badge
            variant="default"
            className="bg-white text-blue-600 hover:bg-white min-w-[24px] h-6 flex items-center justify-center font-bold"
          >
            {items.length}
          </Badge>
        )}
      </motion.button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col"
            role="dialog"
            aria-labelledby="panel-title"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <div>
                <h2
                  id="panel-title"
                  className="text-xl font-semibold text-neutral-900 dark:text-neutral-100"
                >
                  {title}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {items.length} {items.length === 1 ? 'item' : 'items'} ({totalItems} total units)
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                aria-label="Close selection panel"
              >
                <X className="h-5 w-5 text-neutral-500" />
              </button>
            </div>

            {/* Item List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                    <ShoppingBag className="h-8 w-8 text-neutral-400" />
                  </div>
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    Your selection is empty
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-[280px]">
                    Browse collections and click "Add to Selection" to build your lighting package
                  </p>
                </div>
              ) : (
                <ul role="list" className="space-y-4">
                  {items.map((item) => (
                    <motion.li
                      key={item.sku}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 100 }}
                      className="flex gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-gray-900"
                    >
                      {/* Thumbnail */}
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {item.name}
                        </h4>
                        <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 mt-1">
                          SKU: {item.sku}
                        </p>
                        {item.unitPrice && (
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                            ${item.unitPrice.toFixed(2)} × {item.quantity} =$
                            {(item.unitPrice * item.quantity).toFixed(2)}
                          </p>
                        )}

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => decreaseQuantity(item.sku, item.quantity)}
                            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                          </button>
                          <span className="text-sm font-medium tabular-nums min-w-[2ch] text-center text-neutral-900 dark:text-neutral-100">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => increaseQuantity(item.sku, item.quantity)}
                            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                          </button>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => onRemoveItem(item.sku)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors self-start"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer Actions */}
            {items.length > 0 && (
              <div className="border-t border-neutral-200 dark:border-neutral-800 px-6 py-4 space-y-3 bg-neutral-50 dark:bg-gray-800">
                {/* Total */}
                {totalValue > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      Estimated Total
                    </span>
                    <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                      ${totalValue.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Primary Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1"
                    size="default"
                    variant="default"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Selection'}
                  </Button>
                  <Button onClick={() => onExport('pdf')} variant="outline" size="default">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>

                {/* Secondary Actions */}
                <Button
                  onClick={handleClearAll}
                  variant="ghost"
                  size="sm"
                  className="w-full text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  Clear All Items
                </Button>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
