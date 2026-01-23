"use client"

import { ReactNode } from "react"
import ToastProvider from "./ToastProvider"
import { GoogleMapsProvider } from "./GoogleMapsProvider"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <GoogleMapsProvider>
      {children}
      <ToastProvider />
    </GoogleMapsProvider>
  )
}
