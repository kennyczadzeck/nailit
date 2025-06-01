import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

export async function GET() {
  // Determine environment based on DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL || '';
  const environment = databaseUrl.includes('misty-frog') ? 'production' :
                     databaseUrl.includes('raspy-sound') ? 'staging' : 
                     databaseUrl.includes('still-paper') ? 'development' : 'unknown';

  // Determine Neon branch ID
  const branchId = databaseUrl.includes('misty-frog') ? 'br-yellow-mouse-a5c2gnvp' :
                   databaseUrl.includes('raspy-sound') ? 'br-lively-brook-a5wck55u' :
                   databaseUrl.includes('still-paper') ? 'br-late-wildflower-a5s97ll8' : 'unknown';

  try {
    const healthChecks = await Promise.allSettled([
      // Basic database connectivity
      prisma.user.findFirst().then(() => ({ service: 'database', status: 'healthy' })),
      
      // Schema validation - test enum types exist
      prisma.project.findFirst().then(() => ({ service: 'schema_enums', status: 'healthy' })),
      
      // Team member relation validation
      prisma.teamMember.findFirst().then(() => ({ service: 'relations', status: 'healthy' })),
    ])

    const results = healthChecks.map((check, index) => {
      if (check.status === 'fulfilled') {
        return check.value
      } else {
        const services = ['database', 'schema_enums', 'relations']
        return {
          service: services[index],
          status: 'unhealthy',
          error: check.reason?.message || 'Unknown error'
        }
      }
    })

    const allHealthy = results.every(result => result.status === 'healthy')

    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'degraded',
      environment: environment,
      nodeEnv: process.env.NODE_ENV,
      database: {
        environment: environment,
        branchId: branchId,
        connected: !!process.env.DATABASE_URL,
        hasDirectUrl: !!process.env.DIRECT_URL
      },
      auth: {
        nextauthUrl: process.env.NEXTAUTH_URL,
        hasSecret: !!process.env.NEXTAUTH_SECRET,
        hasGoogleClient: !!process.env.GOOGLE_CLIENT_ID
      },
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
      checks: results
    }, { 
      status: allHealthy ? 200 : 503 
    })

  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json({
      status: 'unhealthy',
      environment: environment,
      nodeEnv: process.env.NODE_ENV,
      database: {
        environment: environment,
        branchId: branchId,
        connected: !!process.env.DATABASE_URL,
        hasDirectUrl: !!process.env.DIRECT_URL
      },
      auth: {
        nextauthUrl: process.env.NEXTAUTH_URL,
        hasSecret: !!process.env.NEXTAUTH_SECRET,
        hasGoogleClient: !!process.env.GOOGLE_CLIENT_ID
      },
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
} 