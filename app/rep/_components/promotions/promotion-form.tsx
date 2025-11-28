'use client';

import * as React from 'react';
import { Promotion, PromotionTier } from '@/lib/promotions/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PromotionFormProps {
  promotion?: Promotion | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface TierFormData {
  threshold: string;
  discountPercent: string;
  tempId: string;
}

export function PromotionForm({ promotion, onSuccess, onCancel }: PromotionFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Basic fields
  const [name, setName] = React.useState(promotion?.name || '');
  const [vendor, setVendor] = React.useState(promotion?.vendor || 'lib-and-co');
  const [description, setDescription] = React.useState(promotion?.description || '');
  const [active, setActive] = React.useState(promotion?.active ?? false);
  const [startDate, setStartDate] = React.useState(promotion?.startDate?.split('T')[0] || '');
  const [endDate, setEndDate] = React.useState(promotion?.endDate?.split('T')[0] || '');

  // Customer-facing display fields
  const [summaryTitle, setSummaryTitle] = React.useState(promotion?.summaryTitle || '');
  const [summaryBody, setSummaryBody] = React.useState(promotion?.summaryBody || '');
  const [headlineBenefit, setHeadlineBenefit] = React.useState(promotion?.headlineBenefit || '');
  const [summaryBullets, setSummaryBullets] = React.useState<string[]>(
    promotion?.summaryBullets || ['']
  );
  const [pdfUrl, setPdfUrl] = React.useState(promotion?.pdfUrl || '');
  const [termsAndConditions, setTermsAndConditions] = React.useState(promotion?.termsAndConditions || '');

  // Quick upload fields
  const [uploadedPromotionUrl, setUploadedPromotionUrl] = React.useState(promotion?.uploadedPromotionUrl || '');
  const [uploadedPromotionType, setUploadedPromotionType] = React.useState<'pdf' | 'image'>(
    promotion?.uploadedPromotionType || 'pdf'
  );
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  // Section visibility
  const [showSkuTiers, setShowSkuTiers] = React.useState(
    !!promotion?.skuTiers && promotion.skuTiers.length > 0
  );
  const [showDollarTiers, setShowDollarTiers] = React.useState(
    !!promotion?.dollarTiers && promotion.dollarTiers.length > 0
  );

  // SKU Tiers
  const [skuTiers, setSkuTiers] = React.useState<TierFormData[]>(
    promotion?.skuTiers && promotion.skuTiers.length > 0
      ? promotion.skuTiers.map((t) => ({
          threshold: t.threshold.toString(),
          discountPercent: t.discountPercent.toString(),
          tempId: t.id,
        }))
      : [{ threshold: '', discountPercent: '', tempId: Math.random().toString() }]
  );

  // Dollar Tiers
  const [dollarTiers, setDollarTiers] = React.useState<TierFormData[]>(
    promotion?.dollarTiers && promotion.dollarTiers.length > 0
      ? promotion.dollarTiers.map((t) => ({
          threshold: t.threshold.toString(),
          discountPercent: t.discountPercent.toString(),
          tempId: t.id,
        }))
      : [{ threshold: '', discountPercent: '', tempId: Math.random().toString() }]
  );

  // Inventory Incentive
  const [inventoryEnabled, setInventoryEnabled] = React.useState(
    promotion?.inventoryIncentive.enabled ?? false
  );
  const [inventoryDisplayQty, setInventoryDisplayQty] = React.useState(
    promotion?.inventoryIncentive.displayQtyThreshold?.toString() || ''
  );
  const [inventoryDollar, setInventoryDollar] = React.useState(
    promotion?.inventoryIncentive.dollarThreshold?.toString() || ''
  );
  const [inventoryDiscount, setInventoryDiscount] = React.useState(
    promotion?.inventoryIncentive.backupDiscountPercent?.toString() || ''
  );

  // Threshold selection mode: 'quantity' | 'dollar' | 'either'
  const [thresholdMode, setThresholdMode] = React.useState<'quantity' | 'dollar' | 'either'>(() => {
    if (promotion?.inventoryIncentive.displayQtyThreshold && promotion?.inventoryIncentive.dollarThreshold) {
      return 'either';
    }
    if (promotion?.inventoryIncentive.displayQtyThreshold) {
      return 'quantity';
    }
    if (promotion?.inventoryIncentive.dollarThreshold) {
      return 'dollar';
    }
    return 'quantity';
  });

  // Portable Incentive
  const [portableEnabled, setPortableEnabled] = React.useState(
    promotion?.portableIncentive?.enabled ?? false
  );
  const [portableDiscount, setPortableDiscount] = React.useState(
    promotion?.portableIncentive?.discountPercent?.toString() || ''
  );
  const [portablePrefixes, setPortablePrefixes] = React.useState<string[]>(
    promotion?.portableIncentive?.skuPrefixes || ['']
  );

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setUploadedPromotionUrl(data.url);

      // Detect file type
      const fileType = file.type.toLowerCase();
      if (fileType.includes('pdf')) {
        setUploadedPromotionType('pdf');
      } else if (fileType.includes('image') || fileType.includes('jpeg') || fileType.includes('jpg') || fileType.includes('png')) {
        setUploadedPromotionType('image');
      }

      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      handleFileUpload(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Promotion name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse and validate SKU tiers (only if section is visible)
      const parsedSkuTiers = showSkuTiers
        ? skuTiers
            .filter((t) => t.threshold && t.discountPercent)
            .map((t) => ({
              threshold: parseInt(t.threshold),
              discountPercent: parseFloat(t.discountPercent),
            }))
            .sort((a, b) => a.threshold - b.threshold)
        : [];

      // Parse and validate dollar tiers (only if section is visible)
      const parsedDollarTiers = showDollarTiers
        ? dollarTiers
            .filter((t) => t.threshold && t.discountPercent)
            .map((t) => ({
              threshold: parseFloat(t.threshold),
              discountPercent: parseFloat(t.discountPercent),
            }))
            .sort((a, b) => a.threshold - b.threshold)
        : [];

      const payload = {
        name: name.trim(),
        vendor,
        description: description.trim() || undefined,
        active,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        skuTiers: parsedSkuTiers,
        dollarTiers: parsedDollarTiers,
        inventoryIncentive: {
          enabled: inventoryEnabled,
          displayQtyThreshold: inventoryEnabled && (thresholdMode === 'quantity' || thresholdMode === 'either') && inventoryDisplayQty
            ? parseInt(inventoryDisplayQty)
            : undefined,
          dollarThreshold: inventoryEnabled && (thresholdMode === 'dollar' || thresholdMode === 'either') && inventoryDollar
            ? parseFloat(inventoryDollar)
            : undefined,
          backupDiscountPercent: inventoryEnabled && inventoryDiscount ? parseFloat(inventoryDiscount) : 0,
        },
        portableIncentive: portableEnabled
          ? {
              enabled: true,
              discountPercent: portableDiscount ? parseFloat(portableDiscount) : 0,
              skuPrefixes: portablePrefixes.filter((p) => p.trim()),
            }
          : undefined,
        // Customer-facing display fields
        summaryTitle: summaryTitle.trim() || undefined,
        summaryBody: summaryBody.trim() || undefined,
        headlineBenefit: headlineBenefit.trim() || undefined,
        summaryBullets: summaryBullets.filter((b) => b.trim()).length > 0
          ? summaryBullets.filter((b) => b.trim())
          : undefined,
        pdfUrl: pdfUrl.trim() || undefined,
        termsAndConditions: termsAndConditions.trim() || undefined,
        // Quick upload fields
        uploadedPromotionUrl: uploadedPromotionUrl.trim() || undefined,
        uploadedPromotionType: uploadedPromotionUrl.trim() ? uploadedPromotionType : undefined,
      };

      const url = promotion
        ? `/api/rep/promotions/${promotion.id}`
        : '/api/rep/promotions';
      const method = promotion ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save promotion');
      }

      toast({
        title: 'Success',
        description: `Promotion ${promotion ? 'updated' : 'created'} successfully`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error saving promotion:', error);
      toast({
        title: 'Error',
        description: 'Failed to save promotion',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tier management functions
  const addSkuTier = () => {
    setSkuTiers([...skuTiers, { threshold: '', discountPercent: '', tempId: Math.random().toString() }]);
  };

  const removeSkuTier = (tempId: string) => {
    setSkuTiers(skuTiers.filter((t) => t.tempId !== tempId));
  };

  const updateSkuTier = (tempId: string, field: keyof TierFormData, value: string) => {
    setSkuTiers(
      skuTiers.map((t) => (t.tempId === tempId ? { ...t, [field]: value } : t))
    );
  };

  const addDollarTier = () => {
    setDollarTiers([...dollarTiers, { threshold: '', discountPercent: '', tempId: Math.random().toString() }]);
  };

  const removeDollarTier = (tempId: string) => {
    setDollarTiers(dollarTiers.filter((t) => t.tempId !== tempId));
  };

  const updateDollarTier = (tempId: string, field: keyof TierFormData, value: string) => {
    setDollarTiers(
      dollarTiers.map((t) => (t.tempId === tempId ? { ...t, [field]: value } : t))
    );
  };

  // Summary bullets management
  const addBullet = () => {
    setSummaryBullets([...summaryBullets, '']);
  };

  const removeBullet = (index: number) => {
    setSummaryBullets(summaryBullets.filter((_, i) => i !== index));
  };

  const updateBullet = (index: number, value: string) => {
    setSummaryBullets(summaryBullets.map((b, i) => (i === index ? value : b)));
  };

  // Portable prefix management
  const addPortablePrefix = () => {
    setPortablePrefixes([...portablePrefixes, '']);
  };

  const removePortablePrefix = (index: number) => {
    setPortablePrefixes(portablePrefixes.filter((_, i) => i !== index));
  };

  const updatePortablePrefix = (index: number, value: string) => {
    setPortablePrefixes(portablePrefixes.map((p, i) => (i === index ? value : p)));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            {promotion ? 'Edit Promotion' : 'Create Promotion'}
          </h2>
          <p className="text-sm text-muted-foreground">Configure discount tiers and incentives</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : promotion ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Promotion Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Spring 2024 Market Special"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor *</Label>
            <Select value={vendor} onValueChange={setVendor} required>
              <SelectTrigger id="vendor">
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lib-and-co">Lib & Co</SelectItem>
                <SelectItem value="savoy-house">Savoy House</SelectItem>
                <SelectItem value="hubbardton-forge">Hubbardton Forge</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This promotion will only apply to products from the selected vendor
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of the promotion"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch id="active" checked={active} onCheckedChange={setActive} />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date (Optional)</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Upload Section */}
      <Card className="border-2 border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Quick Upload (Optional)</span>
            <Badge className="bg-blue-600 text-white">Fast Track</Badge>
          </CardTitle>
          <CardDescription>
            Upload a vendor PDF or image file to display as-is. Perfect for getting promotions live quickly during market.
            You can add structured discount tiers below or come back later to enhance the promotion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="uploadFile">Upload Promotion File (PDF, JPEG, PNG)</Label>
            <Input
              id="uploadFile"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={isUploading}
              className="bg-white dark:bg-neutral-950"
            />
            <p className="text-xs text-muted-foreground">
              Upload a PDF or image file. This will be displayed full-screen to customers with a download option.
            </p>
          </div>

          {isUploading && (
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
              Uploading...
            </div>
          )}

          {uploadedPromotionUrl && (
            <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">
                    ✓ File uploaded successfully
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400 break-all">
                    {uploadedPromotionUrl}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Type: {uploadedPromotionType === 'pdf' ? 'PDF Document' : 'Image'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUploadedPromotionUrl('');
                    setUploadFile(null);
                  }}
                  className="flex-shrink-0"
                >
                  Remove
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="uploadedPromotionUrl">Or Paste URL</Label>
            <Input
              id="uploadedPromotionUrl"
              type="text"
              value={uploadedPromotionUrl}
              onChange={(e) => setUploadedPromotionUrl(e.target.value)}
              placeholder="https://example.com/promotion.pdf or /uploads/promotions/file.pdf"
              disabled={isUploading}
              className="bg-white dark:bg-neutral-950"
            />
            <p className="text-xs text-muted-foreground">
              Alternatively, provide a direct URL if the file is already hosted elsewhere
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Customer-Facing Display */}
      <Card>
        <CardHeader>
          <CardTitle>Customer-Facing Display</CardTitle>
          <CardDescription>
            Configure how this promotion appears to customers on the Promotions page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="summaryTitle">Summary Title</Label>
            <Input
              id="summaryTitle"
              value={summaryTitle}
              onChange={(e) => setSummaryTitle(e.target.value)}
              placeholder="e.g., Spring 2024 Market Savings Program (defaults to Promotion Name if empty)"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the promotion name
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summaryBody">Summary Body</Label>
            <Textarea
              id="summaryBody"
              value={summaryBody}
              onChange={(e) => setSummaryBody(e.target.value)}
              placeholder="Optional rich text description for the program summary card"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="headlineBenefit">Headline Benefit</Label>
            <Input
              id="headlineBenefit"
              value={headlineBenefit}
              onChange={(e) => setHeadlineBenefit(e.target.value)}
              placeholder="e.g., Up to 50% OFF Displays + 10% OFF Back Up & Stock Items"
            />
            <p className="text-xs text-muted-foreground">
              Main headline displayed prominently in the program summary. Leave empty for auto-generated headline.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Summary Bullet Points</Label>
            <p className="text-xs text-muted-foreground">
              Key points about this promotion (e.g., eligibility, terms, special conditions)
            </p>
            {summaryBullets.map((bullet, index) => (
              <div key={index} className="flex gap-2 items-start">
                <Input
                  value={bullet}
                  onChange={(e) => updateBullet(index, e.target.value)}
                  placeholder="e.g., Valid for qualifying orders finalized within the promotion period"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeBullet(index)}
                  disabled={summaryBullets.length === 1}
                  className="flex-shrink-0"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addBullet} size="sm">
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Bullet Point
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pdfUrl">Vendor PDF URL</Label>
            <Input
              id="pdfUrl"
              type="url"
              value={pdfUrl}
              onChange={(e) => setPdfUrl(e.target.value)}
              placeholder="https://example.com/vendor-promotion.pdf"
            />
            <p className="text-xs text-muted-foreground">
              Optional link to the official vendor PDF document
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="termsAndConditions">Terms & Conditions</Label>
            <Textarea
              id="termsAndConditions"
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              placeholder="Enter the full terms and conditions for this promotion..."
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Full legal terms and conditions that will be displayed in a dedicated section
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Discount Type Selection - Show when no tier type selected */}
      {!showSkuTiers && !showDollarTiers && (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="py-12">
            <div className="text-center space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Add Tier Discount
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose a tier-based discount type (SKU count or dollar amount)
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setShowSkuTiers(true)}
                  className="min-w-[200px]"
                >
                  <PlusIcon className="mr-2 h-5 w-5" />
                  Add SKU Discount
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setShowDollarTiers(true)}
                  className="min-w-[200px]"
                >
                  <PlusIcon className="mr-2 h-5 w-5" />
                  Add Dollar Discount
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Incentives - Always show add buttons for incentives not yet enabled */}
      {(!inventoryEnabled || !portableEnabled) && (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="py-8">
            <div className="text-center space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Additional Incentives
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add extra discounts for backup inventory or portable products
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                {!inventoryEnabled && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setInventoryEnabled(true)}
                    className="min-w-[200px]"
                  >
                    <PlusIcon className="mr-2 h-5 w-5" />
                    Add Inventory Incentive
                  </Button>
                )}
                {!portableEnabled && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setPortableEnabled(true)}
                    className="min-w-[200px]"
                  >
                    <PlusIcon className="mr-2 h-5 w-5" />
                    Add Portable Incentive
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SKU Count Tiers */}
      {showSkuTiers && (
        <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>SKU Count Tiers</CardTitle>
              <CardDescription>
                Apply discounts based on the number of unique SKUs selected for display
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowSkuTiers(false);
                setSkuTiers([{ threshold: '', discountPercent: '', tempId: Math.random().toString() }]);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {skuTiers.map((tier, index) => (
            <Card key={tier.tempId} className="border-border bg-muted/50">
              <CardContent className="p-4">
                <div className="flex gap-3 items-end">
                  <Badge variant="secondary" className="self-start mt-7">
                    Tier {index + 1}
                  </Badge>
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm font-medium">Number of SKUs</Label>
                    <Input
                      type="number"
                      min="1"
                      value={tier.threshold}
                      onChange={(e) => updateSkuTier(tier.tempId, 'threshold', e.target.value)}
                      placeholder="e.g., 5"
                      className="bg-white dark:bg-neutral-950"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm font-medium">Discount %</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={tier.discountPercent}
                      onChange={(e) => updateSkuTier(tier.tempId, 'discountPercent', e.target.value)}
                      placeholder="e.g., 30"
                      className="bg-white dark:bg-neutral-950"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeSkuTier(tier.tempId)}
                    disabled={skuTiers.length === 1}
                    className="flex-shrink-0"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button type="button" variant="outline" onClick={addSkuTier} className="w-full">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add SKU Tier
          </Button>
        </CardContent>
      </Card>
      )}

      {/* Dollar Amount Tiers */}
      {showDollarTiers && (
        <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Dollar Amount Tiers</CardTitle>
              <CardDescription>
                Apply discounts based on the total dollar value of display items
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowDollarTiers(false);
                setDollarTiers([{ threshold: '', discountPercent: '', tempId: Math.random().toString() }]);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {dollarTiers.map((tier, index) => (
            <Card key={tier.tempId} className="border-border bg-muted/50">
              <CardContent className="p-4">
                <div className="flex gap-3 items-end">
                  <Badge variant="secondary" className="self-start mt-7">
                    Tier {index + 1}
                  </Badge>
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm font-medium">Dollar Amount ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tier.threshold}
                      onChange={(e) => updateDollarTier(tier.tempId, 'threshold', e.target.value)}
                      placeholder="e.g., 5000"
                      className="bg-white dark:bg-neutral-950"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm font-medium">Discount %</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={tier.discountPercent}
                      onChange={(e) => updateDollarTier(tier.tempId, 'discountPercent', e.target.value)}
                      placeholder="e.g., 25"
                      className="bg-white dark:bg-neutral-950"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeDollarTier(tier.tempId)}
                    disabled={dollarTiers.length === 1}
                    className="flex-shrink-0"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button type="button" variant="outline" onClick={addDollarTier} className="w-full">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Dollar Tier
          </Button>
        </CardContent>
      </Card>
      )}

      {/* Inventory Incentive */}
      {inventoryEnabled && (
        <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Inventory Incentive Discount</CardTitle>
              <CardDescription>
                Additional discount on backup quantities when display thresholds are met
              </CardDescription>
            </div>
            <Switch checked={inventoryEnabled} onCheckedChange={setInventoryEnabled} />
          </div>
        </CardHeader>
        {inventoryEnabled && (
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="inventoryDiscount" className="text-sm font-medium">
                Inventory Incentive Discount % *
              </Label>
              <Input
                id="inventoryDiscount"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={inventoryDiscount}
                onChange={(e) => setInventoryDiscount(e.target.value)}
                placeholder="e.g., 10"
                required={inventoryEnabled}
              />
              <p className="text-xs text-muted-foreground">
                This discount applies to backup inventory quantities
              </p>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-medium">Qualification Method *</Label>
              <p className="text-xs text-muted-foreground">
                Choose how customers qualify for the inventory incentive discount
              </p>

              <div className="space-y-3">
                {/* Radio: Based on Quantity */}
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    id="threshold-quantity"
                    name="thresholdMode"
                    checked={thresholdMode === 'quantity'}
                    onChange={() => setThresholdMode('quantity')}
                    className="mt-1 h-4 w-4"
                  />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="threshold-quantity" className="cursor-pointer font-normal">
                      Based on Display Quantity
                    </Label>
                    {thresholdMode === 'quantity' && (
                      <div className="space-y-2 pl-1">
                        <Label htmlFor="inventoryDisplayQty" className="text-sm">
                          Minimum Display Quantity *
                        </Label>
                        <Input
                          id="inventoryDisplayQty"
                          type="number"
                          min="1"
                          value={inventoryDisplayQty}
                          onChange={(e) => setInventoryDisplayQty(e.target.value)}
                          placeholder="e.g., 10 units"
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Apply inventory discount when total display quantity reaches this amount
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Radio: Based on Dollar Amount */}
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    id="threshold-dollar"
                    name="thresholdMode"
                    checked={thresholdMode === 'dollar'}
                    onChange={() => setThresholdMode('dollar')}
                    className="mt-1 h-4 w-4"
                  />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="threshold-dollar" className="cursor-pointer font-normal">
                      Based on Dollar Amount
                    </Label>
                    {thresholdMode === 'dollar' && (
                      <div className="space-y-2 pl-1">
                        <Label htmlFor="inventoryDollar" className="text-sm">
                          Minimum Dollar Amount ($) *
                        </Label>
                        <Input
                          id="inventoryDollar"
                          type="number"
                          min="0"
                          step="0.01"
                          value={inventoryDollar}
                          onChange={(e) => setInventoryDollar(e.target.value)}
                          placeholder="e.g., $5,000"
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Apply inventory discount when total display value reaches this amount
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Radio: Either condition */}
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    id="threshold-either"
                    name="thresholdMode"
                    checked={thresholdMode === 'either'}
                    onChange={() => setThresholdMode('either')}
                    className="mt-1 h-4 w-4"
                  />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="threshold-either" className="cursor-pointer font-normal">
                      Either Quantity OR Dollar Amount
                    </Label>
                    {thresholdMode === 'either' && (
                      <div className="space-y-4 pl-1">
                        <div className="space-y-2">
                          <Label htmlFor="inventoryDisplayQtyEither" className="text-sm">
                            Minimum Display Quantity *
                          </Label>
                          <Input
                            id="inventoryDisplayQtyEither"
                            type="number"
                            min="1"
                            value={inventoryDisplayQty}
                            onChange={(e) => setInventoryDisplayQty(e.target.value)}
                            placeholder="e.g., 10 units"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inventoryDollarEither" className="text-sm">
                            Minimum Dollar Amount ($) *
                          </Label>
                          <Input
                            id="inventoryDollarEither"
                            type="number"
                            min="0"
                            step="0.01"
                            value={inventoryDollar}
                            onChange={(e) => setInventoryDollar(e.target.value)}
                            placeholder="e.g., $5,000"
                            required
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Apply inventory discount when either threshold is met
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      )}

      {/* Portable Products Incentive */}
      {portableEnabled && (
        <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Portable Products Incentive</CardTitle>
              <CardDescription>
                Flat discount on portable products (table and floor lamps) identified by SKU prefix
              </CardDescription>
            </div>
            <Switch checked={portableEnabled} onCheckedChange={setPortableEnabled} />
          </div>
        </CardHeader>
        {portableEnabled && (
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="portableDiscount" className="text-sm font-medium">
                Portable Discount % *
              </Label>
              <Input
                id="portableDiscount"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={portableDiscount}
                onChange={(e) => setPortableDiscount(e.target.value)}
                placeholder="e.g., 15"
                required={portableEnabled}
              />
              <p className="text-xs text-muted-foreground">
                Flat discount applied to all portable products (no display/backup split)
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">SKU Prefixes *</Label>
              <p className="text-xs text-muted-foreground">
                Products with SKUs starting with these prefixes will be treated as portables.
                Examples: &quot;11-CD&quot; for Savoy House, &quot;24&quot; and &quot;27&quot; for Hubbardton Forge floor/table lamps.
              </p>
              {portablePrefixes.map((prefix, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Input
                    value={prefix}
                    onChange={(e) => updatePortablePrefix(index, e.target.value)}
                    placeholder="e.g., 11-CD, 24, 27"
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removePortablePrefix(index)}
                    disabled={portablePrefixes.length === 1}
                    className="flex-shrink-0"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addPortablePrefix} size="sm">
                <PlusIcon className="mr-2 h-4 w-4" />
                Add SKU Prefix
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
      )}
    </form>
  );
}
