// Product Import Page

import { Metadata } from 'next';
import ImportWorkspace from './_components/import-workspace';

export const metadata: Metadata = {
  title: 'Product Import | Rep Portal',
  description: 'Import vendor product data with flexible mapping',
};

export default function ImportsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Product Import</h1>
          <p className="mt-2 text-sm text-gray-600">
            Upload vendor-native JSON files and map them to your product catalog
          </p>
        </div>

        <ImportWorkspace />
      </div>
    </div>
  );
}
