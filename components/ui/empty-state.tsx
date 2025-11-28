'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button-modern';
import {
  MagnifyingGlassIcon,
  FileTextIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckCircledIcon,
  Cross2Icon,
} from '@radix-ui/react-icons';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: 'default' | 'search' | 'error' | 'success';
}

const variantIcons = {
  default: <FileTextIcon className="h-12 w-12 text-neutral-400" />,
  search: <MagnifyingGlassIcon className="h-12 w-12 text-neutral-400" />,
  error: <ExclamationTriangleIcon className="h-12 w-12 text-error" />,
  success: <CheckCircledIcon className="h-12 w-12 text-success" />,
};

const variantBackgrounds = {
  default: 'bg-neutral-100',
  search: 'bg-neutral-100',
  error: 'bg-error/10',
  success: 'bg-success/10',
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = 'default',
}: EmptyStateProps) {
  const displayIcon = icon || variantIcons[variant];
  const bgColor = variantBackgrounds[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {/* Icon container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className={cn(
          'mb-6 rounded-full p-6 flex items-center justify-center',
          bgColor
        )}
      >
        {displayIcon}
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="text-lg font-semibold text-neutral-900 mb-2"
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="text-sm text-neutral-500 max-w-md mb-6"
        >
          {description}
        </motion.p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="flex items-center gap-3"
        >
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline">
              {secondaryAction.label}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// Preset empty state variants for common scenarios

export function NoResultsFound({
  searchQuery,
  onClearSearch,
  className,
}: {
  searchQuery?: string;
  onClearSearch?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      variant="search"
      title="No results found"
      description={
        searchQuery
          ? `We couldn't find any results for "${searchQuery}". Try adjusting your search terms.`
          : 'No items match your current filters.'
      }
      action={
        onClearSearch
          ? {
              label: 'Clear search',
              onClick: onClearSearch,
              variant: 'outline',
            }
          : undefined
      }
      className={className}
    />
  );
}

export function NoDataYet({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={<PlusIcon className="h-12 w-12 text-neutral-400" />}
      title={title}
      description={description}
      action={
        actionLabel && onAction
          ? {
              label: actionLabel,
              onClick: onAction,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading this content. Please try again.',
  onRetry,
  onDismiss,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      variant="error"
      title={title}
      description={description}
      action={
        onRetry
          ? {
              label: 'Try again',
              onClick: onRetry,
            }
          : undefined
      }
      secondaryAction={
        onDismiss
          ? {
              label: 'Dismiss',
              onClick: onDismiss,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function SuccessState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      variant="success"
      title={title}
      description={description}
      action={
        actionLabel && onAction
          ? {
              label: actionLabel,
              onClick: onAction,
            }
          : undefined
      }
      className={className}
    />
  );
}

// Mini empty state for smaller contexts (like tables, lists)
export function MiniEmptyState({
  icon,
  message,
  className,
}: {
  icon?: React.ReactNode;
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-8 px-4 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-3 text-neutral-400">
          {icon}
        </div>
      )}
      <p className="text-sm text-neutral-500">{message}</p>
    </div>
  );
}
