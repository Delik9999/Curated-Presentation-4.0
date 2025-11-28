import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyCustomerCredentials, verifyAdminCredentials } from './credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'customer-credentials',
      name: 'Customer Login',
      credentials: {
        customerId: { label: 'Customer ID', type: 'text' },
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.customerId || !credentials?.username || !credentials?.password) {
          return null;
        }

        const isValid = await verifyCustomerCredentials(
          credentials.customerId,
          credentials.username,
          credentials.password
        );

        if (isValid) {
          return {
            id: credentials.customerId,
            name: credentials.username,
            role: 'customer',
            customerId: credentials.customerId,
          };
        }

        return null;
      },
    }),
    CredentialsProvider({
      id: 'admin-credentials',
      name: 'Admin Login',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const isValid = await verifyAdminCredentials(credentials.username, credentials.password);

        if (isValid) {
          return {
            id: 'admin',
            name: credentials.username,
            role: 'admin',
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as Record<string, unknown>).role;
        token.customerId = (user as unknown as Record<string, unknown>).customerId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).role = token.role;
        (session.user as Record<string, unknown>).customerId = token.customerId;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || 'curated-presentation-secret-change-in-production',
};
