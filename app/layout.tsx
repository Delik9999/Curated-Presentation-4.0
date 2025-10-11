import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

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
      <body className={`${inter.className} min-h-screen antialiased bg-background`}> 
        <Providers>
          <div className="min-h-screen bg-gradient-to-b from-white via-white to-muted">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
