'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CustomerSignInPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const customerId = params.customerId as string;
  const callbackUrl = searchParams.get('callbackUrl') || `/customers/${customerId}`;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setError('');
  }, [username, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('customer-credentials', {
        customerId,
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid username or password');
        setIsLoading(false);
      } else if (result?.ok) {
        // Force a hard navigation to ensure middleware picks up the session
        window.location.href = callbackUrl;
      } else {
        setError('Login failed. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-2xl font-semibold">Customer Portal Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your curated presentation
          </CardDescription>
          <p className="text-sm text-muted-foreground font-mono">
            Customer: {customerId}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Rep access?{' '}
              <button
                type="button"
                onClick={() => router.push('/auth/signin?type=admin')}
                className="underline hover:text-foreground"
              >
                Rep portal login
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
