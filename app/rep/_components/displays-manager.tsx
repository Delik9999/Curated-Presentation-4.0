'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Trash2, Edit2, Search, Package, FileUp, Check, X, MessageSquare, ClipboardCheck, Camera, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Customer } from '@/lib/customers/loadCustomers';
import type { DisplayItem, CreateDisplayInput, AuditUpdate, AuditSummary, AuditSession, AuditPhoto, AuditType } from '@/lib/displays/types';
import type { ParsedOrder } from '@/components/product/order-importer';

type ViewMode = 'table' | 'audit';
type AuditStatus = 'unverified' | 'confirmed' | 'missing';

// Dynamic import with SSR disabled to avoid pdfjs-dist webpack issues
const OrderImporter = dynamic(
  () => import('@/components/product/order-importer').then(mod => mod.OrderImporter),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }
);

interface DisplaysManagerProps {
  customers: Customer[];
}

type SkuSuggestion = {
  sku: string;
  collectionName: string;
  name: string;
};

export default function DisplaysManager({ customers }: DisplaysManagerProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [displays, setDisplays] = useState<DisplayItem[]>([]);
  const [auditSessions, setAuditSessions] = useState<AuditSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DisplayItem | null>(null);
  const [showImporter, setShowImporter] = useState(false);

  // Audit mode state
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [auditChanges, setAuditChanges] = useState<Map<string, AuditUpdate>>(new Map());
  const [showNoteModal, setShowNoteModal] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [auditSummary, setAuditSummary] = useState<AuditSummary | null>(null);
  const [showAuditComplete, setShowAuditComplete] = useState(false);

  // Audit photos state
  const [auditPhotos, setAuditPhotos] = useState<AuditPhoto[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Historical audit photos viewer
  const [viewingAuditPhotos, setViewingAuditPhotos] = useState<AuditPhoto[] | null>(null);
  const [historicalLightboxIndex, setHistoricalLightboxIndex] = useState<number | null>(null);

  // Edit audit state
  const [editingAudit, setEditingAudit] = useState<AuditSession | null>(null);
  const [editAuditPhotos, setEditAuditPhotos] = useState<AuditPhoto[]>([]);
  const [editAuditItems, setEditAuditItems] = useState<Map<string, 'ACTIVE' | 'MISSING'>>(new Map());
  const [editAuditType, setEditAuditType] = useState<AuditType>('in-person');
  const editPhotoInputRef = useRef<HTMLInputElement>(null);

  // Audit type selection state
  const [showAuditTypeModal, setShowAuditTypeModal] = useState(false);
  const [selectedAuditType, setSelectedAuditType] = useState<AuditType>('in-person');

  // SKU autocomplete state
  const [skuSuggestions, setSkuSuggestions] = useState<SkuSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Form state for adding/editing
  const [formData, setFormData] = useState<CreateDisplayInput>({
    customerId: '',
    sku: '',
    collectionName: '',
    installedAt: new Date().toISOString().split('T')[0],
    faces: 1,
    location: '',
    notes: '',
  });

  // Fetch displays for selected customer
  useEffect(() => {
    if (selectedCustomerId) {
      fetchDisplays();
    } else {
      setDisplays([]);
    }
  }, [selectedCustomerId]);

  // Debounced SKU search
  useEffect(() => {
    if (formData.sku.length < 2) {
      setSkuSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/catalog/skus?q=${encodeURIComponent(formData.sku)}`);
        const data = await response.json();
        setSkuSuggestions(data);
        setShowSuggestions(data.length > 0);
        setSelectedSuggestionIndex(-1);
      } catch (error) {
        console.error('Error fetching SKU suggestions:', error);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [formData.sku]);

  const fetchDisplays = async () => {
    if (!selectedCustomerId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/displays?customerId=${selectedCustomerId}`);
      const data = await response.json();
      setDisplays(data.items || []);
      setAuditSessions(data.auditSessions || []);
    } catch (error) {
      console.error('Error fetching displays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDisplay = async () => {
    if (!formData.customerId || !formData.sku || !formData.collectionName) {
      alert('Please fill in required fields: Customer, SKU, and Collection');
      return;
    }

    try {
      const response = await fetch('/api/displays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsAddDialogOpen(false);
        resetForm();
        fetchDisplays();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding display:', error);
      alert('Failed to add display');
    }
  };

  const handleUpdateDisplay = async () => {
    if (!editingItem) return;

    try {
      const response = await fetch('/api/displays', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          ...formData,
        }),
      });

      if (response.ok) {
        setEditingItem(null);
        resetForm();
        fetchDisplays();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating display:', error);
      alert('Failed to update display');
    }
  };

  const handleDeleteDisplay = async (id: string) => {
    if (!confirm('Are you sure you want to delete this display item?')) return;

    try {
      const response = await fetch(`/api/displays?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchDisplays();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting display:', error);
      alert('Failed to delete display');
    }
  };

  const handleDeleteAudit = async (auditId: string) => {
    if (!confirm('Are you sure you want to delete this audit? This will not restore missing items.')) return;

    try {
      const response = await fetch(`/api/displays?auditId=${auditId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchDisplays();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting audit:', error);
      alert('Failed to delete audit');
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: selectedCustomerId,
      sku: '',
      collectionName: '',
      installedAt: new Date().toISOString().split('T')[0],
      faces: 1,
      location: '',
      notes: '',
    });
    setSkuSuggestions([]);
    setShowSuggestions(false);
  };

  const openEditDialog = (item: DisplayItem) => {
    setEditingItem(item);
    setFormData({
      customerId: item.customerId,
      sku: item.sku,
      collectionName: item.collectionName,
      installedAt: item.installedAt.split('T')[0],
      faces: item.faces || 1,
      location: item.location || '',
      notes: item.notes || '',
    });
  };

  const openAddDialog = () => {
    resetForm();
    setFormData(prev => ({ ...prev, customerId: selectedCustomerId }));
    setIsAddDialogOpen(true);
  };

  // Handle imported order from PDF
  const handleOrderImport = async (order: ParsedOrder) => {
    if (!selectedCustomerId) return;

    setShowImporter(false);
    setLoading(true);

    try {
      // Build notes with order info for grouping
      const orderInfo = [
        order.metadata.salesOrderNumber,
        order.metadata.poNumber,
      ].filter(Boolean).join(' | ');

      // Use order date from PDF, or today if not available
      const orderDate = order.metadata.orderDate || new Date().toISOString().split('T')[0];

      // Add each item from the imported order as a display
      for (const item of order.items) {
        // Look up collection name for each SKU
        let collectionName = 'Unknown';
        try {
          const response = await fetch(`/api/catalog/skus?q=${encodeURIComponent(item.sku)}`);
          const suggestions = await response.json();
          if (suggestions.length > 0) {
            const match = suggestions.find((s: SkuSuggestion) => s.sku === item.sku);
            if (match) {
              collectionName = match.collectionName;
            }
          }
        } catch {
          // Use default if lookup fails
        }

        // Create display entry
        await fetch('/api/displays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: selectedCustomerId,
            sku: item.sku,
            collectionName,
            installedAt: orderDate,
            faces: item.quantity,
            location: orderInfo, // Use location field for SO# grouping
            notes: order.classification.type,
          }),
        });
      }

      // Refresh displays list
      await fetchDisplays();
    } catch (error) {
      console.error('Error importing order:', error);
      alert('Failed to import some items');
    } finally {
      setLoading(false);
    }
  };

  const selectSuggestion = (suggestion: SkuSuggestion) => {
    setFormData(prev => ({
      ...prev,
      sku: suggestion.sku,
      collectionName: suggestion.collectionName,
    }));
    setShowSuggestions(false);
    setSkuSuggestions([]);
  };

  // Audit mode handlers
  const getAuditStatus = (item: DisplayItem): AuditStatus => {
    const change = auditChanges.get(item.id);
    if (change) {
      return change.action === 'CONFIRM' ? 'confirmed' : change.action === 'MISSING' ? 'missing' : 'unverified';
    }
    return 'unverified';
  };

  const handleAuditAction = (id: string, action: 'CONFIRM' | 'MISSING') => {
    setAuditChanges(prev => {
      const next = new Map(prev);
      const existing = next.get(id);

      // Toggle off if clicking the same action
      if (existing?.action === action) {
        next.delete(id);
      } else {
        next.set(id, { id, action, notes: existing?.notes });
      }
      return next;
    });
  };

  const handleAddNote = (id: string) => {
    const existing = auditChanges.get(id);
    setNoteText(existing?.notes || displays.find(d => d.id === id)?.notes || '');
    setShowNoteModal(id);
  };

  const saveNote = () => {
    if (!showNoteModal) return;
    setAuditChanges(prev => {
      const next = new Map(prev);
      const existing = next.get(showNoteModal);
      next.set(showNoteModal, {
        id: showNoteModal,
        action: existing?.action || 'NOTE',
        notes: noteText
      });
      return next;
    });
    setShowNoteModal(null);
    setNoteText('');
  };

  const enterAuditMode = () => {
    // Show audit type selection modal first
    setShowAuditTypeModal(true);
    setSelectedAuditType('in-person');
  };

  const startAuditWithType = (auditType: AuditType) => {
    setShowAuditTypeModal(false);
    setSelectedAuditType(auditType);
    setViewMode('audit');
    setAuditChanges(new Map());
    setAuditSummary(null);
    setShowAuditComplete(false);
    setAuditPhotos([]);
  };

  const exitAuditMode = () => {
    setViewMode('table');
    setAuditChanges(new Map());
    setShowAuditComplete(false);
    setAuditPhotos([]);
  };

  // Photo upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('customerId', selectedCustomerId);

        const response = await fetch('/api/upload/audit-photos', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setAuditPhotos(prev => [...prev, {
            url: data.url,
            filename: data.filename,
            capturedAt: data.capturedAt
          }]);
        } else {
          const error = await response.json();
          console.error('Photo upload failed:', error);
        }
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (index: number) => {
    setAuditPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Edit audit handlers
  const openEditAudit = (audit: AuditSession) => {
    setEditingAudit(audit);
    setEditAuditPhotos(audit.photos || []);
    setEditAuditType(audit.auditType || 'in-person');

    // Build map of item statuses at the time of this audit
    // Only include items that were actually verified during THIS audit
    const auditDate = audit.completedAt.split('T')[0];
    const itemStatuses = new Map<string, 'ACTIVE' | 'MISSING'>();

    displays.forEach(item => {
      // Only include items that were verified on this specific audit date
      if (item.lastVerifiedAt === auditDate) {
        // This item was touched in this audit
        itemStatuses.set(item.id, item.status === 'MISSING' ? 'MISSING' : 'ACTIVE');
      }
      // Items not verified in this audit are NOT added to the map
      // They will appear as "unverified" in the edit UI
    });

    setEditAuditItems(itemStatuses);
  };

  const toggleEditAuditItem = (id: string) => {
    setEditAuditItems(prev => {
      const next = new Map(prev);
      const current = next.get(id);

      if (current === undefined) {
        // Item was unverified, now marking as ACTIVE (confirmed)
        next.set(id, 'ACTIVE');
      } else if (current === 'ACTIVE') {
        // Was confirmed, now marking as MISSING
        next.set(id, 'MISSING');
      } else {
        // Was missing, now removing (back to unverified)
        next.delete(id);
      }
      return next;
    });
  };

  const handleEditPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('customerId', selectedCustomerId);

        const response = await fetch('/api/upload/audit-photos', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setEditAuditPhotos(prev => [...prev, {
            url: data.url,
            filename: data.filename,
            capturedAt: data.capturedAt
          }]);
        }
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
    } finally {
      setUploadingPhoto(false);
      if (editPhotoInputRef.current) {
        editPhotoInputRef.current.value = '';
      }
    }
  };

  const removeEditPhoto = (index: number) => {
    setEditAuditPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const saveEditAudit = async () => {
    if (!editingAudit) return;

    try {
      // Build item updates from the editAuditItems map
      const itemUpdates = Array.from(editAuditItems.entries()).map(([id, status]) => ({
        id,
        status,
      }));

      const response = await fetch('/api/displays', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId: editingAudit.id,
          photos: editAuditPhotos,
          itemUpdates,
          auditType: editAuditType,
        }),
      });

      if (response.ok) {
        setEditingAudit(null);
        setEditAuditPhotos([]);
        setEditAuditItems(new Map());
        setEditAuditType('in-person');
        await fetchDisplays();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving audit:', error);
      alert('Failed to save audit');
    }
  };

  const finishAudit = async () => {
    if (auditChanges.size === 0 && auditPhotos.length === 0) {
      exitAuditMode();
      return;
    }

    try {
      const response = await fetch('/api/displays', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          updates: Array.from(auditChanges.values()),
          photos: auditPhotos,
          auditType: selectedAuditType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAuditSummary(data.summary);
        setShowAuditComplete(true);
        await fetchDisplays();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error finishing audit:', error);
      alert('Failed to save audit');
    }
  };

  // Get audit progress
  const auditableItems = displays.filter(d => d.status !== 'MISSING');
  const confirmedCount = Array.from(auditChanges.values()).filter(c => c.action === 'CONFIRM').length;
  const missingCount = Array.from(auditChanges.values()).filter(c => c.action === 'MISSING').length;
  const auditProgress = confirmedCount + missingCount;

  const handleSkuKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || skuSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev < skuSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      selectSuggestion(skuSuggestions[selectedSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Filter customers by search
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected customer name
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);



  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Display Management</h1>
        <p className="text-sm text-muted-foreground">
          Track what products are on display in each customer's showroom
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Selection Panel */}
        <div className="border rounded-lg p-4">
          <h2 className="font-medium mb-2">Select Customer</h2>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border rounded bg-background"
            />
          </div>

          {/* Customer List */}
          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => setSelectedCustomerId(customer.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                  selectedCustomerId === customer.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="font-medium">{customer.name}</div>
                {customer.city && (
                  <div className="text-xs opacity-70">{customer.city}, {customer.region}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Displays Panel */}
        <div className="lg:col-span-2 border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-medium">
                {selectedCustomer ? selectedCustomer.name : 'Select a Customer'}
              </h2>
              {selectedCustomer && (
                <p className="text-xs text-muted-foreground">
                  {displays.length} items
                </p>
              )}
            </div>
            {selectedCustomerId && (
              <div className="flex items-center gap-2">
                {viewMode === 'table' ? (
                  <>
                    <button
                      onClick={enterAuditMode}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-muted"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      Start Audit
                    </button>
                    <button
                      onClick={() => setShowImporter(true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-muted"
                    >
                      <FileUp className="h-4 w-4" />
                      Import PDF
                    </button>
                    <button
                      onClick={openAddDialog}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </>
                ) : null}
              </div>
            )}
          </div>

          {!selectedCustomerId ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Select a customer to manage displays
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
            </div>
          ) : displays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">No displays recorded</p>
              <button
                onClick={openAddDialog}
                className="text-sm text-primary hover:underline"
              >
                Add first display
              </button>
            </div>
          ) : viewMode === 'audit' ? (
            /* Rapid Audit Mode - Gallery Style */
            <div className="relative pb-20">
              {/* Hidden file input for photo capture */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />

              {/* Photo thumbnails strip */}
              {auditPhotos.length > 0 && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {auditPhotos.length} photo{auditPhotos.length !== 1 ? 's' : ''} captured
                    </span>
                    <button
                      onClick={() => setShowPhotoGallery(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {auditPhotos.map((photo, index) => (
                      <div key={index} className="relative flex-shrink-0 group">
                        <img
                          src={photo.url}
                          alt={`Audit photo ${index + 1}`}
                          className="h-16 w-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setLightboxIndex(index)}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removePhoto(index);
                          }}
                          className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Previously Missing Items - keep an eye out */}
              {(() => {
                const previouslyMissing = displays.filter(d => d.status === 'MISSING');
                if (previouslyMissing.length === 0) return null;

                return (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-3">
                      Previously Missing - Keep an eye out
                    </h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {previouslyMissing.map((item) => {
                        const status = getAuditStatus(item);

                        return (
                          <div
                            key={item.id}
                            className="group cursor-pointer select-none"
                            onClick={() => handleAuditAction(item.id, 'CONFIRM')}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              handleAuditAction(item.id, 'MISSING');
                            }}
                          >
                            <div className={`aspect-square bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden mb-1 transition-all duration-200 ${
                              status === 'confirmed'
                                ? 'ring-4 ring-green-500 dark:ring-green-400'
                                : status === 'missing'
                                ? 'ring-2 ring-amber-500/50 dark:ring-amber-500/30'
                                : 'ring-2 ring-amber-500/50 dark:ring-amber-500/30 hover:ring-primary/50'
                            }`}>
                              <div className="relative w-full h-full">
                                <img
                                  src={`https://libandco.com/cdn/shop/files/${item.sku}.jpg`}
                                  alt={item.sku}
                                  className={`w-full h-full object-cover transition-all duration-200 ${
                                    status === 'confirmed' ? '' : 'opacity-60'
                                  }`}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder-product.png';
                                  }}
                                />
                                {/* Status Overlay */}
                                {status === 'confirmed' && (
                                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                    <div className="bg-green-500 text-white rounded-full p-1.5">
                                      <Check className="h-4 w-4" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className={`font-mono text-xs truncate ${
                              status === 'confirmed'
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}>{item.sku}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Gallery Audit Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {auditableItems.map((item) => {
                  const status = getAuditStatus(item);

                  return (
                    <div
                      key={item.id}
                      className="group cursor-pointer select-none"
                      onClick={() => handleAuditAction(item.id, 'CONFIRM')}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        handleAuditAction(item.id, 'MISSING');
                      }}
                    >
                      <div
                        className={`aspect-square rounded-lg overflow-hidden mb-2 transition-all duration-200 ${
                          status === 'confirmed'
                            ? 'ring-4 ring-green-500 dark:ring-green-400'
                            : status === 'missing'
                            ? 'ring-4 ring-red-500/50 dark:ring-red-500/30'
                            : 'ring-1 ring-black/5 dark:ring-white/10 hover:ring-2 hover:ring-primary/50'
                        }`}
                      >
                        <div className="relative w-full h-full">
                          <img
                            src={`https://libandco.com/cdn/shop/files/${item.sku}.jpg`}
                            alt={item.sku}
                            className={`w-full h-full object-cover transition-all duration-200 ${
                              status === 'missing' ? 'grayscale opacity-50' : ''
                            } ${status === 'unverified' ? 'group-hover:scale-105' : ''}`}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-product.png';
                            }}
                          />
                          {/* Status Overlay */}
                          {status === 'confirmed' && (
                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                              <div className="bg-green-500 text-white rounded-full p-2">
                                <Check className="h-5 w-5" />
                              </div>
                            </div>
                          )}
                          {status === 'missing' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-red-500 text-white rounded-full p-2">
                                <X className="h-5 w-5" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{item.collectionName}</p>
                      <p className={`font-mono text-xs font-medium truncate ${
                        status === 'missing' ? 'text-red-600 dark:text-red-400' : ''
                      }`}>{item.sku}</p>
                    </div>
                  );
                })}
              </div>

              {/* Floating Progress Island */}
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
                <div className="bg-gray-900 dark:bg-gray-800 text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-3">
                  <span className="text-sm">
                    <span className="font-medium">{auditProgress}</span>/{auditableItems.length} verified
                  </span>
                  <div className="w-px h-4 bg-gray-600" />
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-white" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    {auditPhotos.length > 0 && (
                      <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                        {auditPhotos.length}
                      </span>
                    )}
                  </button>
                  <div className="w-px h-4 bg-gray-600" />
                  <button
                    onClick={exitAuditMode}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={finishAudit}
                    className="text-sm font-medium text-green-400 hover:text-green-300 transition-colors"
                  >
                    Finish Audit
                  </button>
                </div>
              </div>

              {/* Quick Add FAB */}
              <button
                onClick={() => {
                  resetForm();
                  setFormData(prev => ({
                    ...prev,
                    customerId: selectedCustomerId,
                    installedAt: new Date().toISOString().split('T')[0],
                  }));
                  setIsAddDialogOpen(true);
                }}
                className="fixed bottom-20 right-6 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Found Item
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Display Inventory - from most recent audit */}
              {(() => {
                // Get the most recent audit
                const sortedAudits = [...auditSessions].sort(
                  (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
                );
                const latestAudit = sortedAudits[0];
                const latestAuditDate = latestAudit?.completedAt.split('T')[0];

                // Get items verified in the latest audit
                const onDisplayItems = latestAudit
                  ? displays.filter(d => d.lastVerifiedAt === latestAuditDate && d.status === 'ACTIVE')
                  : [];
                const missingItems = displays.filter(d => d.status === 'MISSING');

                return (
                  <>
                    {/* Current Inventory Section */}
                    {latestAudit && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-medium">Current Display Inventory</h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>
                                Last audited {new Date(latestAudit.completedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                              {latestAudit.auditType && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  latestAudit.auditType === 'in-person'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                }`}>
                                  {latestAudit.auditType === 'in-person' ? 'In-Person' : 'Dealer Report'}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-green-600 dark:text-green-400">
                              {onDisplayItems.length} on display
                            </span>
                            {missingItems.length > 0 && (
                              <span className="text-red-600 dark:text-red-400">
                                {missingItems.length} missing
                              </span>
                            )}
                            {latestAudit.photos && latestAudit.photos.length > 0 && (
                              <button
                                onClick={() => setViewingAuditPhotos(latestAudit.photos || [])}
                                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <Camera className="h-3.5 w-3.5" />
                                {latestAudit.photos.length} photo{latestAudit.photos.length !== 1 ? 's' : ''}
                              </button>
                            )}
                            <button
                              onClick={() => openEditAudit(latestAudit)}
                              className="p-1 text-muted-foreground hover:text-primary"
                              title="Edit audit (add photos)"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAudit(latestAudit.id)}
                              className="p-1 text-muted-foreground hover:text-destructive"
                              title="Delete audit"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Audit Photos - displayed inline */}
                        {latestAudit.photos && latestAudit.photos.length > 0 && (
                          <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Photos from this audit
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {latestAudit.photos.map((photo, index) => (
                                <div key={index} className="relative flex-shrink-0 group">
                                  <img
                                    src={photo.url}
                                    alt={`Audit photo ${index + 1}`}
                                    className="h-20 w-20 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => {
                                      setViewingAuditPhotos(latestAudit.photos || []);
                                      setHistoricalLightboxIndex(index);
                                    }}
                                  />
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 rounded-b">
                                    {new Date(photo.capturedAt).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Premium Display Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
                          {/* On-Display Items */}
                          {onDisplayItems.map((item) => (
                            <div key={item.id} className="group">
                              <div className="aspect-square bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden mb-2 ring-1 ring-black/5 dark:ring-white/10">
                                <img
                                  src={`https://libandco.com/cdn/shop/files/${item.sku}.jpg`}
                                  alt={item.sku}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder-product.png';
                                  }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{item.collectionName}</p>
                              <p className="font-mono text-xs font-medium truncate">{item.sku}</p>
                            </div>
                          ))}

                          {/* Missing Items - Ghost Effect */}
                          {missingItems.map((item) => (
                            <div key={item.id} className="group">
                              <div className="aspect-square bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden mb-2 ring-2 ring-red-500/50 dark:ring-red-500/30">
                                <img
                                  src={`https://libandco.com/cdn/shop/files/${item.sku}.jpg`}
                                  alt={item.sku}
                                  className="w-full h-full object-cover grayscale opacity-50"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder-product.png';
                                  }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{item.collectionName}</p>
                              <p className="font-mono text-xs font-medium truncate text-red-600 dark:text-red-400">{item.sku}</p>
                            </div>
                          ))}
                        </div>

                        {/* Floating Island Action Bar - Missing Items */}
                        {missingItems.length > 0 && (
                          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
                            <div className="bg-gray-900 dark:bg-gray-800 text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-3">
                              <span className="text-sm">
                                <span className="font-medium">{missingItems.length}</span> missing
                              </span>
                              <div className="w-px h-4 bg-gray-600" />
                              <button className="text-sm font-medium hover:text-red-400 transition-colors">
                                Draft Restock Order
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Display Orders Section */}
                    <div>
                      <h3 className="font-medium mb-3">Display Orders</h3>
                      {(() => {
                        // Group displays by order (location field contains SO#)
                        const byOrder = displays.reduce((acc, d) => {
                          const orderKey = d.location || 'Other';
                          if (!acc[orderKey]) acc[orderKey] = [];
                          acc[orderKey].push(d);
                          return acc;
                        }, {} as Record<string, typeof displays>);

                        // Sort orders by date (most recent first)
                        const sortedOrders = Object.entries(byOrder).sort((a, b) => {
                          const dateA = a[1][0]?.installedAt || '';
                          const dateB = b[1][0]?.installedAt || '';
                          return new Date(dateB).getTime() - new Date(dateA).getTime();
                        });

                        return sortedOrders.map(([orderKey, orderItems], index) => {
                          const orderDate = orderItems[0]?.installedAt;
                          const orderType = orderItems[0]?.notes || '';
                          const isDisplay = orderType === 'STOCKING' || orderType === '';

                          // Parse SO# and PO# from orderKey
                          const parts = orderKey.split(' | ');
                          const soNumber = parts[0] || '';
                          const poNumber = parts[1] || '';

                          return (
                            <div key={`order-${orderKey}-${index}`} className="mb-4">
                              {/* Order header */}
                              {orderKey !== 'Other' && orderKey !== '—' && (
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    isDisplay
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                  }`}>
                                    {isDisplay ? 'Display' : 'Project'}
                                  </span>
                                  <span className="text-sm font-medium">
                                    {soNumber}
                                    {poNumber && <span className="text-muted-foreground"> • PO: {poNumber}</span>}
                                  </span>
                                  {orderDate && (
                                    <span className="text-xs text-muted-foreground ml-auto">
                                      {new Date(orderDate).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                      })}
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    ({orderItems.length} items)
                                  </span>
                                </div>
                              )}
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b text-left text-muted-foreground">
                                    <th className="pb-2 font-medium">Status</th>
                                    <th className="pb-2 font-medium">SKU</th>
                                    <th className="pb-2 font-medium">Collection</th>
                                    <th className="pb-2 font-medium">Qty</th>
                                    <th className="pb-2 text-right font-medium">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {orderItems.map((displayItem) => {
                                    // Determine display status
                                    const isOnDisplay = displayItem.lastVerifiedAt === latestAuditDate && displayItem.status === 'ACTIVE';
                                    const isMissing = displayItem.status === 'MISSING';

                                    return (
                                      <tr key={displayItem.id} className="border-b border-muted">
                                        <td className="py-2">
                                          {isOnDisplay ? (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded">
                                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                              On Display
                                            </span>
                                          ) : isMissing ? (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded">
                                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                              Missing
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded">
                                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                              Unverified
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 font-mono">{displayItem.sku}</td>
                                        <td className="py-2">{displayItem.collectionName}</td>
                                        <td className="py-2">{displayItem.faces || 1}</td>
                                        <td className="py-2 text-right">
                                          <button
                                            onClick={() => openEditDialog(displayItem)}
                                            className="p-1 hover:text-primary"
                                          >
                                            <Edit2 className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteDisplay(displayItem.id)}
                                            className="p-1 hover:text-destructive ml-1"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Add Display Modal */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-4 w-full max-w-md mx-4">
            <h3 className="font-medium mb-1">Add Display Item</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {selectedCustomer?.name}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">SKU *</label>
                <div className="relative">
                  <input
                    id="sku"
                    type="text"
                    placeholder="Start typing SKU..."
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    onKeyDown={handleSkuKeyDown}
                    onFocus={() => skuSuggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full px-2 py-1.5 text-sm border rounded bg-background"
                    autoComplete="off"
                  />
                  {showSuggestions && skuSuggestions.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute z-50 w-full mt-1 bg-background border rounded shadow-lg max-h-48 overflow-y-auto"
                    >
                      {skuSuggestions.map((suggestion, index) => (
                        <button
                          key={suggestion.sku}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectSuggestion(suggestion);
                          }}
                          className={`w-full text-left px-2 py-1.5 text-sm hover:bg-muted ${
                            index === selectedSuggestionIndex ? 'bg-muted' : ''
                          }`}
                        >
                          <div className="font-mono font-medium">{suggestion.sku}</div>
                          <div className="text-xs text-muted-foreground">
                            {suggestion.collectionName}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Type to search, use arrow keys to select
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Collection *</label>
                <input
                  type="text"
                  placeholder="Auto-filled from SKU"
                  value={formData.collectionName}
                  onChange={(e) => setFormData({ ...formData, collectionName: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border rounded bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Installed</label>
                  <input
                    type="date"
                    value={formData.installedAt}
                    onChange={(e) => setFormData({ ...formData, installedAt: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border rounded bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground" title="Number of display positions this product occupies">
                    Faces
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.faces}
                    onChange={(e) => setFormData({ ...formData, faces: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1.5 text-sm border rounded bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Display positions
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Location</label>
                <input
                  type="text"
                  placeholder="Front window"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border rounded bg-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notes</label>
                <textarea
                  placeholder="Optional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm border rounded bg-background resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setIsAddDialogOpen(false)}
                className="px-3 py-1.5 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDisplay}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Display Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-4 w-full max-w-md mx-4">
            <h3 className="font-medium mb-4">Edit Display Item</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">SKU *</label>
                <div className="relative">
                  <input
                    id="edit-sku"
                    type="text"
                    placeholder="Start typing SKU..."
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    onKeyDown={handleSkuKeyDown}
                    onFocus={() => skuSuggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full px-2 py-1.5 text-sm border rounded bg-background"
                    autoComplete="off"
                  />
                  {showSuggestions && skuSuggestions.length > 0 && (
                    <div
                      className="absolute z-50 w-full mt-1 bg-background border rounded shadow-lg max-h-48 overflow-y-auto"
                    >
                      {skuSuggestions.map((suggestion, index) => (
                        <button
                          key={suggestion.sku}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectSuggestion(suggestion);
                          }}
                          className={`w-full text-left px-2 py-1.5 text-sm hover:bg-muted ${
                            index === selectedSuggestionIndex ? 'bg-muted' : ''
                          }`}
                        >
                          <div className="font-mono font-medium">{suggestion.sku}</div>
                          <div className="text-xs text-muted-foreground">
                            {suggestion.collectionName}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Collection *</label>
                <input
                  type="text"
                  value={formData.collectionName}
                  onChange={(e) => setFormData({ ...formData, collectionName: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border rounded bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Installed</label>
                  <input
                    type="date"
                    value={formData.installedAt}
                    onChange={(e) => setFormData({ ...formData, installedAt: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border rounded bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Faces</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.faces}
                    onChange={(e) => setFormData({ ...formData, faces: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1.5 text-sm border rounded bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Display positions
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border rounded bg-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm border rounded bg-background resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateDisplay}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Order Importer Modal */}
      {showImporter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg w-full max-w-md mx-4">
            <div className="p-4 border-b">
              <h3 className="font-medium">Import Order PDF</h3>
              <p className="text-xs text-muted-foreground">
                {selectedCustomer?.name}
              </p>
            </div>
            <div className="p-4">
              <OrderImporter
                onImport={handleOrderImport}
                onCancel={() => setShowImporter(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-4 w-full max-w-md mx-4">
            <h3 className="font-medium mb-3">Add Note</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Wrong finish, moved to back room, etc."
              rows={3}
              className="w-full px-3 py-2 text-sm border rounded bg-background resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowNoteModal(null);
                  setNoteText('');
                }}
                className="px-3 py-1.5 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={saveNote}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Complete Summary Modal */}
      {showAuditComplete && auditSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-4 w-full max-w-md mx-4">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
                <ClipboardCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-medium">Audit Complete</h3>
              <p className="text-xs text-muted-foreground">
                {selectedCustomer?.name}
              </p>
            </div>

            <div className="space-y-2 py-3 border-y mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Items</span>
                <span className="font-medium">{auditSummary.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600 dark:text-green-400">Confirmed</span>
                <span className="font-medium text-green-600 dark:text-green-400">{auditSummary.verified}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-600 dark:text-red-400">Missing</span>
                <span className="font-medium text-red-600 dark:text-red-400">{auditSummary.missing}</span>
              </div>
              {auditSummary.unverified > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Unverified</span>
                  <span className="font-medium">{auditSummary.unverified}</span>
                </div>
              )}
              {auditPhotos.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600 dark:text-blue-400">Photos</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{auditPhotos.length}</span>
                </div>
              )}
            </div>

            {auditSummary.missing > 0 && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded text-sm">
                <p className="text-amber-800 dark:text-amber-400">
                  You flagged {auditSummary.missing} item{auditSummary.missing !== 1 ? 's' : ''} as missing.
                </p>
              </div>
            )}

            {auditPhotos.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">Photos captured:</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {auditPhotos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo.url}
                      alt={`Audit photo ${index + 1}`}
                      className="h-12 w-12 object-cover rounded flex-shrink-0"
                    />
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={exitAuditMode}
              className="w-full px-3 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Photo Gallery Modal */}
      {showPhotoGallery && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-medium">Audit Photos ({auditPhotos.length})</h3>
              <button
                onClick={() => setShowPhotoGallery(false)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
              {auditPhotos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No photos captured yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {auditPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo.url}
                        alt={`Audit photo ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          setShowPhotoGallery(false);
                          setLightboxIndex(index);
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removePhoto(index);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 rounded-b-lg">
                        {new Date(photo.capturedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
              >
                {uploadingPhoto ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                Add Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {lightboxIndex !== null && auditPhotos[lightboxIndex] && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60]"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Previous button */}
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex - 1);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors bg-black/30 rounded-full"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {/* Next button */}
          {lightboxIndex < auditPhotos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex + 1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors bg-black/30 rounded-full"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          {/* Main image */}
          <div
            className="max-w-[90vw] max-h-[80vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={auditPhotos[lightboxIndex].url}
              alt={`Audit photo ${lightboxIndex + 1}`}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />

            {/* Photo info */}
            <div className="mt-4 text-center text-white">
              <p className="text-sm font-medium">
                Photo {lightboxIndex + 1} of {auditPhotos.length}
              </p>
              <p className="text-xs text-white/70 mt-1">
                {new Date(auditPhotos[lightboxIndex].capturedAt).toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>

            {/* Thumbnail strip */}
            {auditPhotos.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto max-w-full pb-2">
                {auditPhotos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => setLightboxIndex(index)}
                    className={`flex-shrink-0 rounded overflow-hidden transition-all ${
                      index === lightboxIndex
                        ? 'ring-2 ring-white scale-110'
                        : 'opacity-50 hover:opacity-80'
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={`Thumbnail ${index + 1}`}
                      className="h-12 w-12 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historical Audit Photos Modal */}
      {viewingAuditPhotos && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-medium">Audit Photos ({viewingAuditPhotos.length})</h3>
              <button
                onClick={() => setViewingAuditPhotos(null)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
              {viewingAuditPhotos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No photos in this audit</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {viewingAuditPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo.url}
                        alt={`Audit photo ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setHistoricalLightboxIndex(index)}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 rounded-b-lg">
                        {new Date(photo.capturedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Historical Audit Photo Lightbox */}
      {historicalLightboxIndex !== null && viewingAuditPhotos && viewingAuditPhotos[historicalLightboxIndex] && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60]"
          onClick={() => setHistoricalLightboxIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setHistoricalLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Previous button */}
          {historicalLightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setHistoricalLightboxIndex(historicalLightboxIndex - 1);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors bg-black/30 rounded-full"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {/* Next button */}
          {historicalLightboxIndex < viewingAuditPhotos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setHistoricalLightboxIndex(historicalLightboxIndex + 1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors bg-black/30 rounded-full"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          {/* Main image */}
          <div
            className="max-w-[90vw] max-h-[80vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={viewingAuditPhotos[historicalLightboxIndex].url}
              alt={`Audit photo ${historicalLightboxIndex + 1}`}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />

            {/* Photo info */}
            <div className="mt-4 text-center text-white">
              <p className="text-sm font-medium">
                Photo {historicalLightboxIndex + 1} of {viewingAuditPhotos.length}
              </p>
              <p className="text-xs text-white/70 mt-1">
                {new Date(viewingAuditPhotos[historicalLightboxIndex].capturedAt).toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>

            {/* Thumbnail strip */}
            {viewingAuditPhotos.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto max-w-full pb-2">
                {viewingAuditPhotos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => setHistoricalLightboxIndex(index)}
                    className={`flex-shrink-0 rounded overflow-hidden transition-all ${
                      index === historicalLightboxIndex
                        ? 'ring-2 ring-white scale-110'
                        : 'opacity-50 hover:opacity-80'
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={`Thumbnail ${index + 1}`}
                      className="h-12 w-12 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Audit Modal */}
      {editingAudit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-medium">Edit Audit</h3>
              <p className="text-xs text-muted-foreground">
                {new Date(editingAudit.completedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Hidden file input */}
              <input
                ref={editPhotoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleEditPhotoUpload}
                className="hidden"
              />

              {/* Audit Type Selection */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Audit Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditAuditType('in-person')}
                    className={`flex-1 p-2 border rounded-lg text-sm transition-all ${
                      editAuditType === 'in-person'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium">In-Person</div>
                    <p className="text-xs text-muted-foreground">Physical visit</p>
                  </button>
                  <button
                    onClick={() => setEditAuditType('report')}
                    className={`flex-1 p-2 border rounded-lg text-sm transition-all ${
                      editAuditType === 'report'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium">Dealer Report</div>
                    <p className="text-xs text-muted-foreground">From dealer</p>
                  </button>
                </div>
              </div>

              {/* Items section - clickable grid */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Items</label>
                  <div className="text-xs text-muted-foreground">
                    Click to cycle: <span className="text-muted-foreground">Gray</span> → <span className="text-green-600">Green</span> → <span className="text-red-600">Red</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {displays.map((item) => {
                    const status = editAuditItems.get(item.id); // undefined = unverified, ACTIVE = confirmed, MISSING = missing
                    const isActive = status === 'ACTIVE';
                    const isMissing = status === 'MISSING';
                    const isUnverified = status === undefined;

                    return (
                      <div
                        key={item.id}
                        className="cursor-pointer select-none"
                        onClick={() => toggleEditAuditItem(item.id)}
                      >
                        <div className={`aspect-square rounded-lg overflow-hidden mb-1 transition-all duration-200 ${
                          isActive
                            ? 'ring-2 ring-green-500'
                            : isMissing
                            ? 'ring-2 ring-red-500'
                            : 'ring-1 ring-muted-foreground/30'
                        }`}>
                          <div className="relative w-full h-full">
                            <img
                              src={`https://libandco.com/cdn/shop/files/${item.sku}.jpg`}
                              alt={item.sku}
                              className={`w-full h-full object-cover transition-all duration-200 ${
                                isMissing ? 'grayscale opacity-50' : ''
                              } ${isUnverified ? 'opacity-40' : ''}`}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-product.png';
                              }}
                            />
                            {/* Status Overlay */}
                            {isActive && (
                              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                <div className="bg-green-500 text-white rounded-full p-1">
                                  <Check className="h-3 w-3" />
                                </div>
                              </div>
                            )}
                            {isMissing && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-red-500 text-white rounded-full p-1">
                                  <X className="h-3 w-3" />
                                </div>
                              </div>
                            )}
                            {/* No overlay for unverified - just dimmed */}
                          </div>
                        </div>
                        <p className={`font-mono text-[10px] truncate ${
                          isMissing ? 'text-red-600 dark:text-red-400' : ''
                        } ${isUnverified ? 'text-muted-foreground' : ''}`}>{item.sku}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Summary counts */}
                <div className="mt-3 flex gap-4 text-xs">
                  <span className="text-green-600 dark:text-green-400">
                    {Array.from(editAuditItems.values()).filter(s => s === 'ACTIVE').length} on display
                  </span>
                  <span className="text-red-600 dark:text-red-400">
                    {Array.from(editAuditItems.values()).filter(s => s === 'MISSING').length} missing
                  </span>
                  <span className="text-muted-foreground">
                    {displays.length - editAuditItems.size} unverified
                  </span>
                </div>
              </div>

              {/* Photos section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Photos</label>
                  <button
                    onClick={() => editPhotoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
                    ) : (
                      <Camera className="h-3 w-3" />
                    )}
                    Add Photos
                  </button>
                </div>

                {editAuditPhotos.length === 0 ? (
                  <div className="text-center py-4 border-2 border-dashed rounded-lg">
                    <ImageIcon className="h-6 w-6 mx-auto mb-1 text-muted-foreground opacity-50" />
                    <p className="text-xs text-muted-foreground">No photos yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {editAuditPhotos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo.url}
                          alt={`Photo ${index + 1}`}
                          className="w-full aspect-square object-cover rounded"
                        />
                        <button
                          onClick={() => removeEditPhoto(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditingAudit(null);
                  setEditAuditPhotos([]);
                  setEditAuditItems(new Map());
                }}
                className="px-3 py-1.5 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={saveEditAudit}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Type Selection Modal */}
      {showAuditTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-4 w-full max-w-sm mx-4">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                <ClipboardCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium">Start Display Audit</h3>
              <p className="text-xs text-muted-foreground mt-1">
                What type of audit is this?
              </p>
            </div>

            <div className="space-y-2 mb-4">
              <button
                onClick={() => startAuditWithType('in-person')}
                className={`w-full p-3 border rounded-lg text-left transition-all ${
                  selectedAuditType === 'in-person'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="font-medium text-sm">In-Person Audit</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You are physically visiting the showroom
                </p>
              </button>

              <button
                onClick={() => startAuditWithType('report')}
                className={`w-full p-3 border rounded-lg text-left transition-all ${
                  selectedAuditType === 'report'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="font-medium text-sm">Dealer Report</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Based on report provided by the dealer
                </p>
              </button>
            </div>

            <button
              onClick={() => setShowAuditTypeModal(false)}
              className="w-full px-3 py-1.5 text-sm border rounded hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
