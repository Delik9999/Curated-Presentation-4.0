import { ActivityEventType, SelectionChangeType } from './types';

/**
 * Tracking logger utility for client-side tracking
 */

let currentSessionId: string | null = null;

/**
 * Initialize a tracking session
 */
export async function initSession(customerId: string): Promise<string> {
  try {
    const response = await fetch('/api/tracking/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        customerId,
        ipAddress: undefined, // Could be captured server-side
        userAgent: navigator.userAgent,
      }),
    });

    const data = await response.json();
    currentSessionId = data.session.id;
    return currentSessionId || '';
  } catch (error) {
    console.error('Failed to initialize tracking session:', error);
    return '';
  }
}

/**
 * End the current tracking session
 */
export async function endSession(): Promise<void> {
  if (!currentSessionId) return;

  try {
    await fetch('/api/tracking/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'end',
        sessionId: currentSessionId,
      }),
    });

    currentSessionId = null;
  } catch (error) {
    console.error('Failed to end tracking session:', error);
  }
}

/**
 * Update last activity timestamp for the current session
 */
export async function updateActivity(): Promise<void> {
  if (!currentSessionId) return;

  try {
    await fetch('/api/tracking/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update-activity',
        sessionId: currentSessionId,
      }),
    });
  } catch (error) {
    console.error('Failed to update session activity:', error);
  }
}

/**
 * Log an activity event
 */
export async function logActivity(
  customerId: string,
  type: ActivityEventType,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  if (!currentSessionId) {
    console.warn('No active session. Call initSession first.');
    return;
  }

  try {
    await fetch('/api/tracking/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        sessionId: currentSessionId,
        type,
        metadata,
      }),
    });

    // Also update last activity timestamp
    updateActivity();
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

/**
 * Log a selection change
 */
export async function logSelectionChange(
  customerId: string,
  selectionId: string,
  changeType: SelectionChangeType,
  changes: Record<string, unknown> = {},
  userId?: string,
  userName?: string,
  userRole?: 'customer' | 'rep'
): Promise<void> {
  try {
    await fetch('/api/tracking/selection-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        selectionId,
        changeType,
        userId,
        userName,
        userRole,
        changes,
      }),
    });
  } catch (error) {
    console.error('Failed to log selection change:', error);
  }
}

/**
 * Convenience methods for common activity types
 */

export function trackPageView(customerId: string, pagePath: string) {
  return logActivity(customerId, 'page_view', { pagePath });
}

export function trackSearch(customerId: string, searchQuery: string, vendor?: string) {
  return logActivity(customerId, 'search', { searchQuery, vendor });
}

export function trackCollectionOpened(customerId: string, collectionName: string, vendor?: string) {
  return logActivity(customerId, 'collection_opened', { collectionName, vendor });
}

export function trackCollectionClosed(customerId: string, collectionName: string, vendor?: string) {
  return logActivity(customerId, 'collection_closed', { collectionName, vendor });
}

export function trackProductViewed(customerId: string, productSku: string, productName: string, vendor?: string) {
  return logActivity(customerId, 'product_viewed', { productSku, productName, vendor });
}

export function trackTabChanged(customerId: string, tabName: string) {
  return logActivity(customerId, 'tab_changed', { tabName });
}

export function trackSelectionExported(
  customerId: string,
  selectionId: string,
  selectionName: string,
  exportFormat: 'csv' | 'json' | 'pdf'
) {
  return logActivity(customerId, 'selection_exported', {
    selectionId,
    selectionName,
    exportFormat,
  });
}

export function trackPresentationOpened(customerId: string, vendor?: string) {
  return logActivity(customerId, 'presentation_opened', { vendor });
}

export function trackPresentationDownloaded(customerId: string, vendor?: string, format?: string) {
  return logActivity(customerId, 'presentation_downloaded', { vendor, format });
}

/**
 * Get the current session ID
 */
export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

/**
 * Set up automatic session cleanup on page unload
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (currentSessionId) {
      // Use sendBeacon for reliable delivery even if page is closing
      navigator.sendBeacon(
        '/api/tracking/session',
        JSON.stringify({
          action: 'end',
          sessionId: currentSessionId,
        })
      );
    }
  });

  // Update activity on user interaction
  let activityTimeout: NodeJS.Timeout;
  const throttledUpdateActivity = () => {
    clearTimeout(activityTimeout);
    activityTimeout = setTimeout(() => {
      updateActivity();
    }, 30000); // Update every 30 seconds of activity
  };

  window.addEventListener('mousemove', throttledUpdateActivity);
  window.addEventListener('keydown', throttledUpdateActivity);
  window.addEventListener('click', throttledUpdateActivity);
  window.addEventListener('scroll', throttledUpdateActivity);
}
