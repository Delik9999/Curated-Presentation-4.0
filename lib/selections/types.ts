export type SelectionStatus = 'snapshot' | 'working' | 'archived';
export type SelectionSource = 'manual' | 'dallas';

export type SelectionItem = {
  sku: string;
  name: string;
  qty: number;
  unitList: number;
  programDisc?: number;
  netUnit: number;
  extendedNet: number;
  notes?: string;
  tags?: string[];
};

export type Selection = {
  id: string;
  customerId: string;
  name: string;
  status: SelectionStatus;
  source: SelectionSource;
  sourceEventId?: string;
  sourceYear?: number;
  marketMonth?: 'January' | 'June';
  isPublished: boolean;
  isVisibleToCustomer?: boolean;
  version: number;
  items: SelectionItem[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
