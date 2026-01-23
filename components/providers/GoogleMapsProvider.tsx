"use client"

import { useJsApiLoader } from "@react-google-maps/api"
import { createContext, useContext, ReactNode } from "react"

const libraries: ("places" | "geometry")[] = ["places", "geometry"]

interface GoogleMapsContextType {
  isLoaded: boolean
  loadError: Error | undefined
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined,
})

export function useGoogleMaps() {
  const context = useContext(GoogleMapsContext)
  if (!context) {
    throw new Error("useGoogleMaps must be used within GoogleMapsProvider")
  }
  return context
}

interface GoogleMapsProviderProps {
  children: ReactNode
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  })

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}
