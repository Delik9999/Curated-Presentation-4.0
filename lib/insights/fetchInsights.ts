import type { CustomerInsights } from './types';

/**
 * Fetch customer insights data
 *
 * Returns real sales data with display status from insights API
 */
export async function fetchCustomerInsights(customerId: string): Promise<CustomerInsights | null> {
  try {
    const response = await fetch(`/api/insights?customerId=${encodeURIComponent(customerId)}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch insights: ${response.status}`);
    }

    const insights = await response.json();
    return insights as CustomerInsights;
  } catch (error) {
    console.error('Error fetching customer insights:', error);
    return null;
  }
}
