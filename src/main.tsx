import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ClerkProvider } from '@clerk/react'

import './index.css'
import App from './App.tsx'
import { ToasterProvider } from '@/provider/toast-provider.tsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const root = createRoot(document.getElementById('root')!)

root.render(
  <StrictMode>
    {PUBLISHABLE_KEY ? (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <App />
        <ToasterProvider />
      </ClerkProvider>
    ) : (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-6 py-12">
        <div className="max-w-lg text-center">
          <h1 className="text-3xl font-semibold mb-4">Missing Clerk Publishable Key</h1>
          <p className="text-sm leading-7 text-slate-300">
            Set <code className="rounded bg-slate-800 px-1 py-0.5">VITE_CLERK_PUBLISHABLE_KEY</code> in your environment or <code className="rounded bg-slate-800 px-1 py-0.5">.env</code> file and restart the dev server.
          </p>
        </div>
      </div>
    )}
  </StrictMode>,
)
