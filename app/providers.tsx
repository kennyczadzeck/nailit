'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { ProjectProvider } from './components/ProjectContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ProjectProvider>
        {children}
      </ProjectProvider>
    </SessionProvider>
  );
} 