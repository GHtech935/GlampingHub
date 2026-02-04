"use client"

import { ReactNode } from "react"
import ToastProvider from "./ToastProvider"
import { GoogleMapsProvider } from "./GoogleMapsProvider"
import { GlampingCartProvider } from "./GlampingCartProvider"
import { AuthProvider } from "@/contexts/AuthContext"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <GoogleMapsProvider>
        <GlampingCartProvider>
          {children}
          <ToastProvider />
        </GlampingCartProvider>
      </GoogleMapsProvider>
    </AuthProvider>
  )
}
