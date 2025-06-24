'use client';
import React, { useEffect, useState } from 'react';

interface Parameter {
  name: string;
  required?: boolean;
  description?: string;
  schema?: {
    type?: string;
    format?: string;
    enum?: string[];
  };
  in?: string; // 'query', 'path', 'header', etc.
}

interface RequestBodyProperty {
  type?: string;
  format?: string;
  description?: string;
  enum?: string[];
  items?: {
    type?: string;
    properties?: Record<string, RequestBodyProperty>;
  };
  properties?: Record<string, RequestBodyProperty>;
}

interface RequestBodySchema {
  type?: string;
  required?: string[];
  properties?: Record<string, RequestBodyProperty>;
}

interface RequestBody {
  required?: boolean;
  content?: {
    'application/json'?: {
      schema?: RequestBodySchema;
    };
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
  requestBody?: RequestBody;
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
  requestBodyParams?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
}

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());

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

  const parseRequestBodyParams = (requestBody?: RequestBody): Parameter[] => {
    if (!requestBody?.content?.['application/json']?.schema?.properties) {
      return [];
    }

    const schema = requestBody.content['application/json'].schema;
    const required = schema.required || [];
    const properties = schema.properties;

    if (!properties) {
      return [];
    }

    return Object.entries(properties).map(([name, prop]) => ({
      name,
      required: required.includes(name),
      description: prop.description,
      schema: {
        type: prop.type,
        format: prop.format,
        enum: prop.enum
      },
      in: 'body'
    }));
  };

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
            parameters: details.parameters || [],
            requestBodyParams: parseRequestBodyParams(details.requestBody),
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

  const toggleEndpoint = (endpointId: string) => {
    const newExpanded = new Set(expandedEndpoints);
    if (newExpanded.has(endpointId)) {
      newExpanded.delete(endpointId);
    } else {
      newExpanded.add(endpointId);
    }
    setExpandedEndpoints(newExpanded);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getParameterTypeDisplay = (param: Parameter): string => {
    if (param.schema?.enum) {
      return `enum: ${param.schema.enum.join(' | ')}`;
    }
    
    let type = param.schema?.type || 'string';
    if (param.schema?.format) {
      type += ` (${param.schema.format})`;
    }
    
    return type;
  };

  const getParameterLocation = (param: Parameter): string => {
    switch (param.in) {
      case 'query': return 'Query Parameter';
      case 'path': return 'Path Parameter';
      case 'header': return 'Header Parameter';
      case 'body': return 'Request Body';
      default: return 'Parameter';
    }
  };

  const getResponseType = (code: string): string => {
    const numCode = parseInt(code);
    if (numCode >= 200 && numCode < 300) return 'success';
    if (numCode >= 300 && numCode < 400) return 'redirect';
    if (numCode >= 400 && numCode < 500) return 'error';
    if (numCode >= 500) return 'error';
    return 'info';
  };

  const getResponseCodeColor = (type: string): string => {
    switch (type) {
      case 'success': return '#34a853';
      case 'error': return '#dc2626';
      case 'redirect': return '#d97706';
      case 'info': return '#2563eb';
      default: return '#6b7280';
    }
  };

  const renderParameter = (param: Parameter) => (
    <div key={param.name} style={{
      background: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '16px',
      borderLeft: '4px solid #e1e5e9',
      border: '1px solid #e1e5e9'
    }}>
      <div style={{ marginBottom: '16px' }}>
        <code style={{
          background: '#263238',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '1rem',
          fontFamily: 'Monaco, Menlo, monospace',
          fontWeight: '600',
          marginBottom: '12px',
          display: 'inline-block'
        }}>
          {param.name}
        </code>
        
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '32px',
          marginBottom: '8px',
          padding: '12px 0'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minWidth: '120px'
          }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#637381',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Required
            </span>
            <span style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: param.required ? '#c62828' : '#2e7d32'
            }}>
              {param.required ? 'Yes' : 'No'}
            </span>
          </div>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minWidth: '120px'
          }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#637381',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Type
            </span>
            <span style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#1565c0',
              fontFamily: 'Monaco, Menlo, monospace',
              background: '#f0f7ff',
              padding: '2px 8px',
              borderRadius: '4px'
            }}>
              {getParameterTypeDisplay(param)}
            </span>
          </div>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minWidth: '120px'
          }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#637381',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Location
            </span>
            <span style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#7b1fa2'
            }}>
              {getParameterLocation(param)}
            </span>
          </div>
        </div>
        
        {param.description && (
          <p style={{
            color: '#637381',
            margin: '8px 0 0 0',
            fontSize: '0.875rem',
            lineHeight: '1.5'
          }}>
            {param.description}
          </p>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '1.125rem',
        color: '#637381'
      }}>
        Loading API Documentation...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '1.125rem',
        color: '#d32f2f'
      }}>
        Error: {error}
      </div>
    );
  }

  if (!spec) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '1.125rem',
        color: '#d32f2f'
      }}>
        No API specification found
      </div>
    );
  }

  const endpointsByTag = parseEndpoints(spec);

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#fafafa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Sidebar Navigation */}
      <div style={{
        width: '300px',
        background: 'white',
        borderRight: '1px solid #e1e5e9',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto',
        zIndex: 100
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e1e5e9',
          background: '#263238',
          color: 'white'
        }}>
          <h1 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            margin: '0 0 8px 0'
          }}>
            {spec.info.title}
          </h1>
          <span style={{
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            display: 'inline-block'
          }}>
            v{spec.info.version}
          </span>
        </div>
        
        {Object.entries(endpointsByTag).map(([tag, endpoints]) => (
          <div key={tag} style={{
            padding: '16px 0',
            borderBottom: '1px solid #f1f1f1'
          }}>
            <div style={{
              padding: '8px 24px',
              fontWeight: '600',
              color: '#263238',
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {tag}
            </div>
            {endpoints.map((endpoint, index) => {
              const endpointId = `${endpoint.path}-${endpoint.method}-${index}`;
              return (
                <div
                  key={endpointId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 24px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderLeft: '3px solid transparent'
                  }}
                  onClick={() => scrollToSection(endpointId)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f5f5f5';
                    e.currentTarget.style.borderLeftColor = '#34a853';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '50px',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textAlign: 'center',
                    color: 'white',
                    marginRight: '12px',
                    backgroundColor: getMethodColor(endpoint.method)
                  }}>
                    {endpoint.method}
                  </span>
                  <span style={{
                    fontFamily: 'Monaco, Menlo, monospace',
                    fontSize: '0.875rem',
                    color: '#263238'
                  }}>
                    {endpoint.path}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        marginLeft: '300px',
        padding: '40px',
        maxWidth: 'calc(100vw - 300px)'
      }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '300',
            color: '#263238',
            margin: '0 0 16px 0'
          }}>
            {spec.info.title}
          </h1>
          <span style={{
            background: '#34a853',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '16px',
            fontSize: '0.875rem',
            fontWeight: '500',
            display: 'inline-block',
            marginBottom: '16px'
          }}>
            v{spec.info.version}
          </span>
          {spec.info.description && (
            <p style={{
              color: '#637381',
              fontSize: '1.125rem',
              lineHeight: '1.6'
            }}>
              {spec.info.description}
            </p>
          )}
        </div>

        {Object.entries(endpointsByTag).map(([tag, endpoints]) => (
          <div key={tag} style={{ marginBottom: '60px' }}>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: '400',
              color: '#263238',
              marginBottom: '32px',
              paddingBottom: '16px',
              borderBottom: '2px solid #e1e5e9'
            }} id={tag}>
              {tag}
            </h2>
            
            {endpoints.map((endpoint, index) => {
              const endpointId = `${endpoint.path}-${endpoint.method}-${index}`;
              const isExpanded = expandedEndpoints.has(endpointId);
              const allParams = [...(endpoint.parameters || []), ...(endpoint.requestBodyParams || [])];
              
              return (
                <div key={endpointId} id={endpointId} style={{
                  background: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  marginBottom: '24px',
                  overflow: 'hidden',
                  border: '1px solid #e1e5e9'
                }}>
                  <div
                    style={{
                      padding: '20px 24px',
                      background: '#fafbfc',
                      borderBottom: '1px solid #e1e5e9',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'background-color 0.2s ease'
                    }}
                    onClick={() => toggleEndpoint(endpointId)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f5f6f7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fafbfc';
                    }}
                  >
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontWeight: '600',
                      fontSize: '0.75rem',
                      color: 'white',
                      minWidth: '70px',
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      backgroundColor: getMethodColor(endpoint.method)
                    }}>
                      {endpoint.method}
                    </span>
                    <code style={{
                      fontFamily: 'Monaco, Menlo, monospace',
                      fontWeight: '500',
                      color: '#263238',
                      fontSize: '1rem'
                    }}>
                      {endpoint.path}
                    </code>
                    <span style={{
                      color: '#637381',
                      marginLeft: 'auto',
                      fontSize: '0.875rem'
                    }}>
                      {endpoint.summary}
                    </span>
                    <span style={{
                      marginLeft: '12px',
                      transition: 'transform 0.2s ease',
                      color: '#637381',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}>
                      ▼
                    </span>
                  </div>
                  
                  {isExpanded && (
                    <div style={{
                      padding: '24px',
                      borderTop: '1px solid #f1f1f1'
                    }}>
                      {endpoint.description && (
                        <p style={{
                          color: '#263238',
                          marginBottom: '24px',
                          fontSize: '1rem',
                          lineHeight: '1.6'
                        }}>
                          {endpoint.description}
                        </p>
                      )}
                      
                      {allParams.length > 0 && (
                        <div style={{
                          marginBottom: '32px',
                          width: '100%',
                          maxWidth: '100%',
                          overflow: 'hidden'
                        }}>
                          <h4 style={{
                            fontWeight: '600',
                            color: '#263238',
                            marginBottom: '16px',
                            fontSize: '1.125rem'
                          }}>
                            Parameters
                          </h4>
                          {allParams.map(renderParameter)}
                        </div>
                      )}
                      
                      <div style={{
                        marginBottom: '32px',
                        width: '100%',
                        maxWidth: '100%',
                        overflow: 'hidden'
                      }}>
                        <h4 style={{
                          fontWeight: '600',
                          color: '#263238',
                          marginBottom: '16px',
                          fontSize: '1.125rem'
                        }}>
                          Responses
                        </h4>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          {Object.entries(endpoint.responses).map(([code, response]: [string, Response]) => {
                            const responseType = getResponseType(code);
                            return (
                              <div key={code} style={{
                                background: responseType === 'error' ? '#fef2f2' : '#f8f9fa',
                                padding: '12px 16px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                minHeight: '40px',
                                maxHeight: '60px',
                                overflow: 'hidden',
                                border: '1px solid #e1e5e9',
                                borderLeft: `4px solid ${getResponseCodeColor(responseType)}`
                              }}>
                                <div style={{
                                  fontWeight: '600',
                                  fontFamily: 'Monaco, Menlo, monospace',
                                  color: 'white',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  display: 'inline-block',
                                  marginRight: '12px',
                                  flexShrink: 0,
                                  minWidth: '50px',
                                  textAlign: 'center',
                                  backgroundColor: getResponseCodeColor(responseType)
                                }}>
                                  {code}
                                </div>
                                <div style={{
                                  color: '#637381',
                                  display: 'inline',
                                  flex: 1
                                }}>
                                  {response.description || 'No description provided'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
} 