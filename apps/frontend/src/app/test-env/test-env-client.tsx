'use client';

export default function TestEnvClient() {
  const serverEnv = {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
    NEXT_PUBLIC_ASSET_BASE: process.env.NEXT_PUBLIC_ASSET_BASE,
    NEXT_PUBLIC_R2_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL,
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Environment Variables Test</h1>
      <h2>Server Side (SSR)</h2>
      <pre>{JSON.stringify(serverEnv, null, 2)}</pre>

      <h2>Client Side (Hydrated)</h2>
      <pre>{JSON.stringify({
        NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
        NEXT_PUBLIC_ASSET_BASE: process.env.NEXT_PUBLIC_ASSET_BASE,
        NEXT_PUBLIC_R2_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL,
      }, null, 2)}</pre>

      <h2>Runtime Check</h2>
      <pre>{`typeof process: ${typeof process}
process?.env?.NEXT_PUBLIC_ASSET_BASE: ${process?.env?.NEXT_PUBLIC_ASSET_BASE || 'undefined'}`}</pre>
    </div>
  );
}
