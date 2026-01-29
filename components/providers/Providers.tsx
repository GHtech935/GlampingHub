"use client"

import { ReactNode } from "react"
import ToastProvider from "./ToastProvider"
import { GoogleMapsProvider } from "./GoogleMapsProvider"
import { GlampingCartProvider } from "./GlampingCartProvider"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <GoogleMapsProvider>
      <GlampingCartProvider>
        {children}
        <ToastProvider />
      </GlampingCartProvider>
    </GoogleMapsProvider>
  )
}
