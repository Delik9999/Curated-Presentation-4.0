import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'Curated Presentation',
  description: 'Premium lighting selections curated for every customer.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-background text-foreground">
      <body className="min-h-screen font-sans antialiased bg-background">
        <Providers>
          <div className="fixed top-4 right-4 z-50">
            <ThemeToggle />
          </div>
          <div className="min-h-screen bg-gradient-to-b from-white via-white to-muted dark:from-background dark:via-background dark:to-muted">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
