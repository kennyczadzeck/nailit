import { NextAuthOptions } from "next-auth"
import NextAuth from "next-auth/next"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "../../../lib/prisma"

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow sign in for test accounts and development
      if (process.env.NODE_ENV === 'development') {
        // For test accounts, ensure they can always sign in
        if (user.email === 'nailit.test.homeowner@gmail.com' || 
            user.email === 'nailit.test.contractor@gmail.com') {
          return true;
        }
      }
      return true;
    },
    async session({ session, token }) {
      // For JWT sessions, get user ID from token
      if (token && session?.user) {
        session.user.id = token.sub!;
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      // On first sign in, look up or link the database user
      if (user && account) {
        // Check if there's an existing user with this email (for test users)
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: { accounts: true }
        });
        
        if (existingUser && existingUser.accounts.length === 0) {
          // This is likely a test user created by E2E tests - link the account
          try {
            await prisma.account.upsert({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId
                }
              },
              update: {
                access_token: account.access_token,
                expires_at: account.expires_at,
                refresh_token: account.refresh_token,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
              create: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                expires_at: account.expires_at,
                refresh_token: account.refresh_token,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              }
            });
            
            console.log(`✅ Linked existing user ${existingUser.email} to OAuth account`);
            token.sub = existingUser.id;
          } catch (error) {
            console.error('Error linking existing user to OAuth account:', error);
          }
        } else {
          // Normal flow - user.id is the database user ID when using Prisma adapter
          token.sub = user.id;
        }
      } else if (account && !token.sub) {
        // If for some reason we don't have the user ID, look it up from the database
        try {
          const dbUser = await prisma.user.findFirst({
            where: {
              accounts: {
                some: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId
                }
              }
            }
          });
          if (dbUser) {
            token.sub = dbUser.id;
          }
        } catch (error) {
          console.error('Error finding user in JWT callback:', error);
        }
      }
      return token;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt", // Use JWT for better serverless compatibility
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST } 