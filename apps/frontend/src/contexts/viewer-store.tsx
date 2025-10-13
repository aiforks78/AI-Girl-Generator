"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Job } from '@/types/generation';
import { fetchStatus } from '@/lib/status-fetcher';

type ViewerState = {
  job: Job | null;
  open: boolean;
};

type ViewerContextType = {
  state: ViewerState;
  openViewer: (jobOrId: Job | number) => Promise<void>;
  closeViewer: () => void;
  setJob: (j: Job | null) => void;
};

const ViewerContext = createContext<ViewerContextType | null>(null);

export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ViewerState>({ job: null, open: false });

  const setJob = useCallback((j: Job | null) => setState(prev => ({ ...prev, job: j })), []);

  const openViewer = useCallback(async (jobOrId: Job | number) => {
    if (typeof jobOrId === 'number') {
      const res = await fetchStatus(jobOrId, 'viewer-store:open') as any;
      const j = res?.job || null;
      if (j) setState({ job: j, open: true });
      return;
    }
    setState({ job: jobOrId, open: true });
  }, []);

  const closeViewer = useCallback(() => setState({ job: null, open: false }), []);

  return (
    <ViewerContext.Provider value={{ state, openViewer, closeViewer, setJob }}>
      {children}
    </ViewerContext.Provider>
  );
}

export function useViewer() {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error('useViewer must be used within ViewerProvider');
  return ctx;
}

