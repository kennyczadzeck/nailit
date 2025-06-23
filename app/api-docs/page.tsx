'use client';
import React, { useEffect, useState } from 'react';

type RedocStandaloneProps = {
  spec: unknown;
  options?: {
    scrollYOffset?: number;
    hideDownloadButton?: boolean;
    disableSearch?: boolean;
    theme?: {
      colors?: {
        primary?: {
          main?: string;
        };
      };
      typography?: {
        fontSize?: string;
        fontFamily?: string;
      };
    };
  };
};

type RedocStandaloneComponent = React.ComponentType<RedocStandaloneProps>;

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<unknown>(null);
  const [RedocStandalone, setRedocStandalone] = useState<RedocStandaloneComponent | null>(null);

  useEffect(() => {
    const loadRedocAndSpec = async () => {
      try {
        // Load the OpenAPI spec
        const response = await fetch('/api/docs');
        const specData = await response.json();
        setSpec(specData);

        // Dynamically import Redoc standalone component
        const { RedocStandalone: RedocComponent } = await import('redoc');
        setRedocStandalone(() => RedocComponent as RedocStandaloneComponent);
      } catch (error) {
        console.error('Error loading API spec or Redoc:', error);
      }
    };

    loadRedocAndSpec();
  }, []);

  if (!spec || !RedocStandalone) {
    return <div style={{ padding: '20px' }}>Loading API Documentation...</div>;
  }

  return (
    <div>
      <RedocStandalone
        spec={spec}
        options={{
          scrollYOffset: 60,
          hideDownloadButton: false,
          disableSearch: false,
          theme: {
            colors: {
              primary: {
                main: '#34A853'
              }
            },
            typography: {
              fontSize: '14px',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif'
            }
          }
        }}
      />
    </div>
  );
} 