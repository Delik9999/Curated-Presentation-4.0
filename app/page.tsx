import Link from 'next/link';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-10 px-6 py-24 text-center">
      <div className="space-y-6">
        <span className="inline-flex rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-soft">
          Curated Presentation Platform
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Elevate every customer walkthrough with curated, export-ready lighting selections.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-600">
          Start in the Rep Portal to capture Dallas market snapshots, or browse a customer presentation directly.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button asChild size="lg">
          <Link href="/rep">Open Rep Portal</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/customers/demo">View Demo Customer</Link>
        </Button>
      </div>
    </main>
  );
}
