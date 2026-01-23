'use client';

import { useState, useCallback, useEffect } from 'react';

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: GeolocationError | null;
  loading: boolean;
  permissionState: PermissionState | null;
}

export interface GeolocationError {
  code: number;
  message: string;
}

const STORAGE_KEY = 'glamphub_nearme_enabled';

const ERROR_MESSAGES: Record<number, string> = {
  1: 'Bạn đã từ chối quyền truy cập vị trí',
  2: 'Không thể xác định vị trí của bạn',
  3: 'Hết thời gian chờ xác định vị trí',
};

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    permissionState: null,
  });

  const [isEnabled, setIsEnabled] = useState(false);

  // Check if geolocation is supported
  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  // Check permission state on mount
  useEffect(() => {
    if (!isSupported) return;

    // Check if user previously enabled near me
    const savedEnabled = localStorage.getItem(STORAGE_KEY);
    if (savedEnabled === 'true') {
      setIsEnabled(true);
    }

    // Check current permission state
    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          setState((prev) => ({ ...prev, permissionState: result.state }));

          // Listen for permission changes
          result.onchange = () => {
            setState((prev) => ({ ...prev, permissionState: result.state }));
          };
        })
        .catch(() => {
          // Permissions API not supported, that's ok
        });
    }
  }, [isSupported]);

  // Auto-request location if previously enabled and permission granted
  useEffect(() => {
    if (isEnabled && state.permissionState === 'granted' && !state.latitude && !state.loading) {
      requestLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, state.permissionState]);

  // Request location from browser
  const requestLocation = useCallback(() => {
    if (!isSupported) {
      setState((prev) => ({
        ...prev,
        error: {
          code: 0,
          message: 'Trình duyệt không hỗ trợ định vị',
        },
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
          permissionState: 'granted',
        });
        setIsEnabled(true);
        localStorage.setItem(STORAGE_KEY, 'true');
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: {
            code: error.code,
            message: ERROR_MESSAGES[error.code] || 'Lỗi không xác định',
          },
          permissionState: error.code === 1 ? 'denied' : prev.permissionState,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  }, [isSupported]);

  // Clear location and disable
  const clearLocation = useCallback(() => {
    setState({
      latitude: null,
      longitude: null,
      accuracy: null,
      error: null,
      loading: false,
      permissionState: state.permissionState,
    });
    setIsEnabled(false);
    localStorage.removeItem(STORAGE_KEY);
  }, [state.permissionState]);

  // Toggle enable/disable
  const toggle = useCallback(() => {
    if (isEnabled) {
      clearLocation();
    } else {
      requestLocation();
    }
  }, [isEnabled, clearLocation, requestLocation]);

  return {
    ...state,
    isEnabled,
    isSupported,
    requestLocation,
    clearLocation,
    toggle,
  };
}
