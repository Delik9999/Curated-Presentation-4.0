'use client';

// Import Workspace - Main component orchestrating the import flow

import React, { useState } from 'react';
import { Upload, FileJson, Settings, Eye, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button-modern';
import FileUploadStep from './file-upload-step';
import MappingConfigStep from './mapping-config-step';
import PreviewDiffStep from './preview-diff-step';
import CommitResultStep from './commit-result-step';
import type { VendorMapping, DetectedColumn, JSONShape } from '@/lib/imports/mapping-types';
import type { ImportPreview } from '@/lib/imports/diff-generator';
import type { CommitResult } from '@/lib/imports/commit-importer';

// Simple UUID generator for client-side
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

type Step = 'upload' | 'mapping' | 'preview' | 'commit' | 'result';

interface WorkflowState {
  step: Step;
  vendorCode: string;
  jsonData: any;
  shape?: JSONShape;
  columns?: DetectedColumn[];
  mapping?: VendorMapping;
  preview?: ImportPreview;
  commitResult?: CommitResult;
  vendorUpdate?: any; // For vendors with dedicated loaders
}

export default function ImportWorkspace() {
  const [state, setState] = useState<WorkflowState>({
    step: 'upload',
    vendorCode: '',
    jsonData: null,
  });

  const handleFileAnalyzed = (data: {
    vendorCode: string;
    jsonData: any;
    shape: JSONShape;
    columns: DetectedColumn[];
    vendorUpdate?: any;
  }) => {
    // If vendor has dedicated loader, skip mapping and go straight to preview
    if (data.vendorUpdate) {
      setState({
        ...state,
        step: 'preview',
        vendorCode: data.vendorCode,
        jsonData: data.jsonData,
        shape: data.shape,
        columns: data.columns,
        vendorUpdate: data.vendorUpdate,
      });
    } else {
      // No dedicated loader - proceed to mapping step
      setState({
        ...state,
        step: 'mapping',
        vendorCode: data.vendorCode,
        jsonData: data.jsonData,
        shape: data.shape,
        columns: data.columns,
      });
    }
  };

  const handleMappingConfigured = (mapping: VendorMapping) => {
    setState({
      ...state,
      step: 'preview',
      mapping,
    });
  };

  const handlePreviewGenerated = (preview: ImportPreview) => {
    setState({
      ...state,
      preview,
    });
  };

  const handleCommitRequested = async () => {
    setState({
      ...state,
      step: 'commit',
    });

    // If this is a vendor update (dedicated loader), use vendor-update API
    if (state.vendorUpdate) {
      try {
        const response = await fetch('/api/imports/vendor-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'commit',
            vendorCode: state.vendorCode,
            newData: state.jsonData,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to commit update');
        }

        const result = await response.json();

        handleCommitComplete({
          success: true,
          importId: generateUUID(),
          timestamp: new Date().toISOString(),
          summary: {
            productsAdded: 0, // Vendor updates don't track this granularly yet
            productsUpdated: 0,
            pricesUpdated: 0,
            productsDiscontinued: 0,
            errors: 0,
          },
          errors: [],
          message: result.message,
          details: { backupPath: result.backupPath },
        } as CommitResult);
      } catch (err) {
        console.error('Commit error:', err);
        handleCommitComplete({
          success: false,
          importId: generateUUID(),
          timestamp: new Date().toISOString(),
          summary: {
            productsAdded: 0,
            productsUpdated: 0,
            pricesUpdated: 0,
            productsDiscontinued: 0,
            errors: 1,
          },
          errors: [{ productId: 'system', error: err instanceof Error ? err.message : 'Failed to commit update' }],
        } as CommitResult);
      }
    } else {
      // Generic import - use generic import API
      // TODO: Implement generic import commit
    }
  };

  const handleCommitComplete = (result: CommitResult) => {
    setState({
      ...state,
      step: 'result',
      commitResult: result,
    });
  };

  const handleReset = () => {
    setState({
      step: 'upload',
      vendorCode: '',
      jsonData: null,
    });
  };

  const handleBack = () => {
    if (state.step === 'mapping') {
      setState({ ...state, step: 'upload' });
    } else if (state.step === 'preview') {
      setState({ ...state, step: 'mapping' });
    } else if (state.step === 'commit') {
      setState({ ...state, step: 'preview' });
    }
  };

  const steps = [
    { id: 'upload', label: 'Upload File', icon: Upload },
    { id: 'mapping', label: 'Configure Mapping', icon: Settings },
    { id: 'preview', label: 'Review Changes', icon: Eye },
    { id: 'commit', label: 'Commit Import', icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === state.step);

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isComplete = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const Icon = step.icon;

              return (
                <li key={step.id} className="relative flex-1">
                  {index !== 0 && (
                    <div
                      className={`absolute left-0 top-5 -ml-px h-0.5 w-full ${
                        isComplete ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      style={{ marginLeft: '-50%' }}
                    />
                  )}
                  <div className="relative flex flex-col items-center group">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                        isComplete
                          ? 'border-blue-600 bg-blue-600'
                          : isCurrent
                          ? 'border-blue-600 bg-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${
                          isComplete
                            ? 'text-white'
                            : isCurrent
                            ? 'text-blue-600'
                            : 'text-gray-400'
                        }`}
                      />
                    </span>
                    <span
                      className={`mt-2 text-sm font-medium ${
                        isCurrent ? 'text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {state.step === 'upload' && (
          <FileUploadStep onFileAnalyzed={handleFileAnalyzed} />
        )}

        {state.step === 'mapping' && state.shape && state.columns && (
          <MappingConfigStep
            vendorCode={state.vendorCode}
            shape={state.shape}
            columns={state.columns}
            jsonData={state.jsonData}
            onMappingConfigured={handleMappingConfigured}
            onBack={handleBack}
          />
        )}

        {state.step === 'preview' && (state.mapping || state.vendorUpdate) && (
          <PreviewDiffStep
            vendorCode={state.vendorCode}
            jsonData={state.jsonData}
            mapping={state.mapping}
            vendorUpdate={state.vendorUpdate}
            onPreviewGenerated={handlePreviewGenerated}
            onCommitRequested={handleCommitRequested}
            onBack={handleBack}
          />
        )}

        {state.step === 'commit' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">Committing import...</p>
          </div>
        )}

        {state.step === 'result' && state.commitResult && (
          <CommitResultStep result={state.commitResult} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}
