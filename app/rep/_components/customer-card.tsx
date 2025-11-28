'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ExternalLink, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button-modern';
import { Badge } from '@/components/ui/badge-modern';
import { cn } from '@/lib/utils';
import type { Customer } from '@/lib/customers/loadCustomers';

interface CustomerCardProps {
  customer: Customer;
  index?: number;
}

export function CustomerCard({ customer, index = 0 }: CustomerCardProps) {
  const location = [customer.city, customer.region].filter(Boolean).join(', ');
  const isActive = !customer.name.startsWith('!!'); // Test customers start with !!

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-white p-6 transition-all"
    >
      {/* Gradient accent on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/0 to-accent-500/0 opacity-0 transition-opacity group-hover:opacity-5" />

      {/* Content */}
      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <h3 className="text-lg font-semibold text-foreground">
              {customer.name}
            </h3>
            {location && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{location}</span>
              </div>
            )}
          </div>

          {/* Status badge */}
          <Badge variant={isActive ? 'success' : 'secondary'}>
            {isActive ? 'Active' : 'Test'}
          </Badge>
        </div>

        {/* Customer ID */}
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">ID:</span>
          <code className="text-xs font-mono text-foreground">{customer.id}</code>
        </div>

        {/* Action button */}
        <div className="pt-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<ExternalLink className="h-4 w-4" />}
            className="w-full"
            asChild
          >
            <Link href={`/customers/${customer.slug ?? customer.id}?tab=collections`}>
              View Presentation
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
