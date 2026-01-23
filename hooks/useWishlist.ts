'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from './useAuth';

export function useWishlist() {
  const { user, isAuthenticated, isCustomer, loading: authLoading, refetch: refetchAuth } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [pendingCampsiteId, setPendingCampsiteId] = useState<string | null>(null);

  // Fetch wishlist when user is authenticated
  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated || !isCustomer) {
      setWishlistIds([]);
      return;
    }

    try {
      const response = await fetch('/api/wishlist');
      if (response.ok) {
        const data = await response.json();
        setWishlistIds(data.campsiteIds || []);
      }
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    }
  }, [isAuthenticated, isCustomer]);

  useEffect(() => {
    if (!authLoading) {
      fetchWishlist();
    }
  }, [authLoading, fetchWishlist]);

  // Check if campsite is in wishlist
  const isInWishlist = useCallback((campsiteId: string) => {
    return wishlistIds.includes(campsiteId);
  }, [wishlistIds]);

  // Add to wishlist
  const addToWishlist = useCallback(async (campsiteId: string) => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campsiteId }),
      });

      if (response.ok) {
        setWishlistIds(prev => [...prev, campsiteId]);
        toast.success('Đã thêm vào danh sách yêu thích');
      } else {
        throw new Error('Failed to add');
      }
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      toast.error('Không thể thêm vào danh sách yêu thích');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Remove from wishlist
  const removeFromWishlist = useCallback(async (campsiteId: string) => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/wishlist/${campsiteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setWishlistIds(prev => prev.filter(id => id !== campsiteId));
        toast.success('Đã xóa khỏi danh sách yêu thích');
      } else {
        throw new Error('Failed to remove');
      }
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      toast.error('Không thể xóa khỏi danh sách yêu thích');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Toggle wishlist - main function to use
  const toggleWishlist = useCallback((campsiteId: string) => {
    // If not authenticated, open login modal
    if (!isAuthenticated || !isCustomer) {
      setPendingCampsiteId(campsiteId);
      setLoginModalOpen(true);
      return;
    }

    // Toggle based on current state
    if (isInWishlist(campsiteId)) {
      removeFromWishlist(campsiteId);
    } else {
      addToWishlist(campsiteId);
    }
  }, [isAuthenticated, isCustomer, isInWishlist, addToWishlist, removeFromWishlist]);

  // Handle successful login - add pending campsite to wishlist
  const handleLoginSuccess = useCallback(async () => {
    setLoginModalOpen(false);

    // Refetch auth state first to update isAuthenticated
    await refetchAuth();

    // Small delay to let React update state
    await new Promise(resolve => setTimeout(resolve, 100));

    // Fetch wishlist with fresh auth state
    try {
      const response = await fetch('/api/wishlist');
      if (response.ok) {
        const data = await response.json();
        setWishlistIds(data.campsiteIds || []);
      }
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    }

    // Add pending campsite if exists (directly call API, not relying on state)
    if (pendingCampsiteId) {
      try {
        const response = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campsiteId: pendingCampsiteId }),
        });

        if (response.ok) {
          setWishlistIds(prev => [...prev, pendingCampsiteId]);
          toast.success('Đã thêm vào danh sách yêu thích');
        }
      } catch (error) {
        console.error('Failed to add to wishlist:', error);
      }
      setPendingCampsiteId(null);
    }
  }, [pendingCampsiteId, refetchAuth]);

  return {
    wishlistIds,
    isInWishlist,
    toggleWishlist,
    addToWishlist,
    removeFromWishlist,
    loading,
    loginModalOpen,
    setLoginModalOpen,
    handleLoginSuccess,
    refetch: fetchWishlist,
  };
}
