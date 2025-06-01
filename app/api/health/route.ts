import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

export async function GET() {
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
      timestamp: new Date().toISOString(),
      checks: results,
      environment: process.env.NODE_ENV || 'unknown'
    }, { 
      status: allHealthy ? 200 : 503 
    })

  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV || 'unknown'
    }, { status: 503 })
  }
} 