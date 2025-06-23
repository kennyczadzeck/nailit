import { NextRequest, NextResponse } from 'next/server';
import { createSwaggerSpec } from 'next-swagger-doc';

export async function GET(req: NextRequest) {
  const spec = createSwaggerSpec({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'NailIt API',
        version: '1.0.0',
        description: 'API documentation for NailIt',
      },
    },
    apiFolder: 'app/api',
  });
  
  return NextResponse.json(spec);
} 