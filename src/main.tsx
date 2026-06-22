/**
 * src/main.tsx
 * Entry point. Mounts <App /> into #root (defined in index.html).
 *
 * Assumes a `@/*` -> `src/*` path alias is configured in tsconfig.json /
 * vite.config.ts (per the blueprint, both are still on the missing-files
 * list — set the alias there when those land).
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    '[main.tsx] Could not find #root. Check that index.html has <div id="root"></div>.'
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
