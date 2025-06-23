'use client';
import React, { useEffect, useState } from 'react';

interface Parameter {
  name: string;
  required?: boolean;
  description?: string;
  schema?: {
    type?: string;
  };
}

interface Response {
  description?: string;
}

interface MethodDetails {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: unknown;
  responses?: Record<string, Response>;
}

interface OpenAPISpec {
  info: {
    title: string;
    version: string;
    description: string;
  };
  paths: Record<string, Record<string, MethodDetails>>;
  tags?: Array<{ name: string; description?: string }>;
}

interface EndpointInfo {
  path: string;
  method: string;
  summary: string;
  description: string;
  tags: string[];
  parameters?: Parameter[];
  requestBody?: unknown;
  responses: Record<string, Response>;
}

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSpec = async () => {
      try {
        const response = await fetch('/api/docs');
        if (!response.ok) {
          throw new Error('Failed to load API specification');
        }
        const specData = await response.json();
        setSpec(specData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadSpec();
  }, []);

  const parseEndpoints = (spec: OpenAPISpec): Record<string, EndpointInfo[]> => {
    const endpointsByTag: Record<string, EndpointInfo[]> = {};
    
    Object.entries(spec.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, details]) => {
        if (typeof details === 'object' && details !== null) {
          const endpoint: EndpointInfo = {
            path,
            method: method.toUpperCase(),
            summary: details.summary || '',
            description: details.description || '',
            tags: details.tags || ['Other'],
            parameters: details.parameters,
            requestBody: details.requestBody,
            responses: details.responses || {}
          };
          
          endpoint.tags.forEach(tag => {
            if (!endpointsByTag[tag]) {
              endpointsByTag[tag] = [];
            }
            endpointsByTag[tag].push(endpoint);
          });
        }
      });
    });
    
    return endpointsByTag;
  };

  const getMethodColor = (method: string): string => {
    switch (method) {
      case 'GET': return '#2563eb';
      case 'POST': return '#059669';
      case 'PUT': return '#d97706';
      case 'PATCH': return '#7c3aed';
      case 'DELETE': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const renderParameter = (param: Parameter) => (
    <div key={param.name} className="parameter">
      <code>{param.name}</code>
      <span className={`required ${param.required ? 'required-true' : 'required-false'}`}>
        {param.required ? 'required' : 'optional'}
      </span>
      <span className="param-type">{param.schema?.type || 'string'}</span>
      {param.description && <p>{param.description}</p>}
    </div>
  );

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading API Documentation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="container">
        <div className="error">No API specification found</div>
      </div>
    );
  }

  const endpointsByTag = parseEndpoints(spec);

  return (
    <div className="container">
      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: ui-sans-serif, system-ui, sans-serif;
          line-height: 1.6;
        }
        .header {
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .title {
          font-size: 2.5rem;
          font-weight: bold;
          color: #1f2937;
          margin: 0 0 10px 0;
        }
        .version {
          display: inline-block;
          background: #34a853;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .description {
          color: #6b7280;
          margin-top: 10px;
        }
        .section {
          margin-bottom: 40px;
        }
        .section-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 20px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        .endpoint {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 20px;
          overflow: hidden;
        }
        .endpoint-header {
          padding: 16px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .method {
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.75rem;
          color: white;
          min-width: 60px;
          text-align: center;
        }
        .path {
          font-family: 'Courier New', monospace;
          font-weight: 500;
          color: #1f2937;
        }
        .summary {
          color: #6b7280;
          margin-left: auto;
        }
        .endpoint-body {
          padding: 16px;
        }
        .description-text {
          color: #4b5563;
          margin-bottom: 16px;
        }
        .subsection {
          margin-bottom: 16px;
        }
        .subsection-title {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }
        .parameter {
          background: #f3f4f6;
          padding: 8px 12px;
          border-radius: 4px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .parameter code {
          background: #e5e7eb;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.875rem;
        }
        .required {
          font-size: 0.75rem;
          padding: 2px 6px;
          border-radius: 3px;
          font-weight: 500;
        }
        .required-true {
          background: #fecaca;
          color: #991b1b;
        }
        .required-false {
          background: #d1fae5;
          color: #065f46;
        }
        .param-type {
          color: #6b7280;
          font-size: 0.875rem;
        }
        .response {
          background: #f9fafb;
          padding: 8px 12px;
          border-radius: 4px;
          margin-bottom: 8px;
        }
        .response-code {
          font-weight: 600;
          color: #1f2937;
        }
        .loading, .error {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }
        .error {
          color: #dc2626;
        }
      `}</style>

      <div className="header">
        <h1 className="title">{spec.info.title}</h1>
        <span className="version">v{spec.info.version}</span>
        {spec.info.description && (
          <p className="description">{spec.info.description}</p>
        )}
      </div>

      {Object.entries(endpointsByTag).map(([tag, endpoints]) => (
        <div key={tag} className="section">
          <h2 className="section-title">{tag}</h2>
          
          {endpoints.map((endpoint, index) => (
            <div key={`${endpoint.path}-${endpoint.method}-${index}`} className="endpoint">
              <div className="endpoint-header">
                <span 
                  className="method" 
                  style={{ backgroundColor: getMethodColor(endpoint.method) }}
                >
                  {endpoint.method}
                </span>
                <code className="path">{endpoint.path}</code>
                <span className="summary">{endpoint.summary}</span>
              </div>
              
              <div className="endpoint-body">
                {endpoint.description && (
                  <p className="description-text">{endpoint.description}</p>
                )}
                
                {endpoint.parameters && endpoint.parameters.length > 0 && (
                  <div className="subsection">
                    <h4 className="subsection-title">Parameters</h4>
                    {endpoint.parameters.map(renderParameter)}
                  </div>
                )}
                
                <div className="subsection">
                  <h4 className="subsection-title">Responses</h4>
                  {Object.entries(endpoint.responses).map(([code, response]: [string, Response]) => (
                    <div key={code} className="response">
                      <span className="response-code">{code}</span>
                      {response.description && <span> - {response.description}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
} 