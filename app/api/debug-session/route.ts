import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '../../lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('Debug session check:', {
      session,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    });

    if (session?.user?.id) {
      // Check if this user ID exists in database
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          accounts: true,
          projects: true
        }
      });

      return NextResponse.json({
        session,
        dbUser,
        userExistsInDb: !!dbUser,
        message: dbUser ? 'User found in database' : 'User NOT found in database - this is the problem!'
      });
    }

    return NextResponse.json({
      session,
      dbUser: null,
      userExistsInDb: false,
      message: 'No session found'
    });

  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json({ error: 'Failed to check session' }, { status: 500 });
  }
}