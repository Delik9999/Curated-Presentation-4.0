'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const customerId = searchParams.get('customerId');
  const type = searchParams.get('type'); // 'admin' or undefined (customer)

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isAdminLogin = type === 'admin';

  useEffect(() => {
    setError('');
  }, [username, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn(
        isAdminLogin ? 'admin-credentials' : 'customer-credentials',
        {
          ...(isAdminLogin ? {} : { customerId }),
          username,
          password,
          redirect: false,
        }
      );

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
          <CardTitle className="text-2xl font-semibold">
            {isAdminLogin ? 'Rep Portal Login' : 'Customer Portal Login'}
          </CardTitle>
          <CardDescription>
            {isAdminLogin
              ? 'Sign in to access the rep dashboard'
              : 'Enter your credentials to access your curated presentation'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder={isAdminLogin ? 'rep' : 'star'}
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
              {isAdminLogin ? (
                <>
                  Need customer access?{' '}
                  <button
                    type="button"
                    onClick={() => router.push('/auth/signin')}
                    className="underline hover:text-foreground"
                  >
                    Customer login
                  </button>
                </>
              ) : (
                <>
                  Rep access?{' '}
                  <button
                    type="button"
                    onClick={() => router.push('/auth/signin?type=admin')}
                    className="underline hover:text-foreground"
                  >
                    Rep portal login
                  </button>
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted px-4 py-16">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-3 text-center">
            <CardTitle className="text-2xl font-semibold">Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
