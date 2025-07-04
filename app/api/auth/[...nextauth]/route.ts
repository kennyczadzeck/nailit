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
    async session({ session, token }) {
      // For JWT sessions, get user ID from token
      if (token && session?.user) {
        session.user.id = token.sub!;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // On first sign in, look up the database user ID using the OAuth account
      if (user) {
        // user.id is the database user ID when using Prisma adapter
        token.sub = user.id;
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