'use client';

import { Button } from '@/components/ui/button-modern';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card-modern';
import { Badge } from '@/components/ui/badge-modern';
import { Input } from '@/components/ui/input-modern';
import { ShoppingCart, ExternalLink, Mail } from 'lucide-react';

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="mx-auto max-w-6xl space-y-12 px-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-neutral-900">Design System</h1>
          <p className="text-lg text-neutral-600">
            Modern component library with Framer Motion animations
          </p>
        </div>

        {/* Buttons */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-neutral-900">Buttons</h2>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary">Primary Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="accent">Accent Button</Button>
              <Button variant="destructive">Destructive</Button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="md">Medium</Button>
              <Button variant="primary" size="lg">Large</Button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" icon={<ShoppingCart className="h-4 w-4" />}>
                With Icon
              </Button>
              <Button variant="secondary" loading>
                Loading
              </Button>
              <Button variant="outline" disabled>
                Disabled
              </Button>
            </div>
          </div>
        </section>

        {/* Cards */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-neutral-900">Cards</h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>Customer Name</CardTitle>
                  <Badge variant="success">Active</Badge>
                </div>
                <CardDescription>
                  Seattle, Washington
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-4">
                <p className="text-sm text-neutral-600">
                  Last order: January 2024
                </p>
              </CardContent>
              <CardFooter className="gap-3">
                <Button variant="secondary" size="sm" icon={<ShoppingCart className="h-4 w-4" />}>
                  Dallas Orders
                </Button>
                <Button variant="ghost" size="sm" icon={<ExternalLink className="h-4 w-4" />}>
                  View Site
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>Another Customer</CardTitle>
                  <Badge variant="warning">Pending</Badge>
                </div>
                <CardDescription>
                  Portland, Oregon
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-4">
                <p className="text-sm text-neutral-600">
                  Last order: December 2023
                </p>
              </CardContent>
              <CardFooter className="gap-3">
                <Button variant="secondary" size="sm" icon={<ShoppingCart className="h-4 w-4" />}>
                  Dallas Orders
                </Button>
                <Button variant="ghost" size="sm" icon={<ExternalLink className="h-4 w-4" />}>
                  View Site
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>Test Customer</CardTitle>
                  <Badge variant="secondary">Inactive</Badge>
                </div>
                <CardDescription>
                  San Francisco, California
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-4">
                <p className="text-sm text-neutral-600">
                  Last order: June 2023
                </p>
              </CardContent>
              <CardFooter className="gap-3">
                <Button variant="secondary" size="sm" icon={<ShoppingCart className="h-4 w-4" />}>
                  Dallas Orders
                </Button>
                <Button variant="ghost" size="sm" icon={<ExternalLink className="h-4 w-4" />}>
                  View Site
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Badges */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-neutral-900">Badges</h2>

          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="accent">Accent</Badge>
          </div>
        </section>

        {/* Inputs */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-neutral-900">Inputs</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              helperText="We'll never share your email with anyone else."
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
            />
            <Input
              label="Error Example"
              type="text"
              placeholder="This field has an error"
              error
              helperText="This field is required"
            />
            <Input
              label="Disabled"
              type="text"
              placeholder="This field is disabled"
              disabled
            />
          </div>
        </section>

        {/* Color Palette */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-neutral-900">Color Palette</h2>

          <div className="space-y-8">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-600">
                Primary (Blue)
              </h3>
              <div className="grid grid-cols-10 gap-2">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                  <div key={shade} className="space-y-1">
                    <div className={`h-16 w-full rounded-lg bg-primary-${shade} shadow`} />
                    <p className="text-xs text-neutral-600">{shade}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-600">
                Accent (Amber)
              </h3>
              <div className="grid grid-cols-10 gap-2">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                  <div key={shade} className="space-y-1">
                    <div className={`h-16 w-full rounded-lg bg-accent-${shade} shadow`} />
                    <p className="text-xs text-neutral-600">{shade}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-600">
                Neutral
              </h3>
              <div className="grid grid-cols-10 gap-2">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                  <div key={shade} className="space-y-1">
                    <div className={`h-16 w-full rounded-lg bg-neutral-${shade} shadow`} />
                    <p className="text-xs text-neutral-600">{shade}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-neutral-900">Typography</h2>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-neutral-500">text-4xl</p>
              <h1 className="text-4xl font-bold text-neutral-900">The quick brown fox</h1>
            </div>
            <div>
              <p className="text-xs text-neutral-500">text-3xl</p>
              <h2 className="text-3xl font-bold text-neutral-900">The quick brown fox</h2>
            </div>
            <div>
              <p className="text-xs text-neutral-500">text-2xl</p>
              <h3 className="text-2xl font-semibold text-neutral-900">The quick brown fox</h3>
            </div>
            <div>
              <p className="text-xs text-neutral-500">text-xl</p>
              <h4 className="text-xl font-semibold text-neutral-900">The quick brown fox</h4>
            </div>
            <div>
              <p className="text-xs text-neutral-500">text-base</p>
              <p className="text-base text-neutral-700">The quick brown fox jumps over the lazy dog</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">text-sm</p>
              <p className="text-sm text-neutral-600">The quick brown fox jumps over the lazy dog</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">text-xs</p>
              <p className="text-xs text-neutral-500">The quick brown fox jumps over the lazy dog</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
