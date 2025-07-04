import { NextResponse } from 'next/server';
import { BUILD_INFO } from '@/app/lib/build-info';

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns application health status and database connectivity
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 database:
 *                   type: string
 *                   enum: ["connected", "disconnected"]
 *       500:
 *         description: Service is unhealthy
 */
export async function GET() {
  try {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'nailit',
      build: {
        commitHash: BUILD_INFO.commitHash,
        buildTime: BUILD_INFO.buildTime,
        environment: BUILD_INFO.environment,
        nodeEnv: BUILD_INFO.nodeEnv,
        hasGoogleMapsKey: BUILD_INFO.hasGoogleMapsKey,
        googleMapsKeyLength: BUILD_INFO.googleMapsKeyLength,
        publicEnvVars: BUILD_INFO.publicEnvVars,
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
} 