'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from './useAuth';

export function useWishlist() {
  const { user, isAuthenticated, isCustomer, loading: authLoading, refetch: refetchAuth } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

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
        // Extract item IDs from the wishlist items
        const itemIds = data.items?.map((item: { itemId: string }) => item.itemId) || [];
        setWishlistIds(itemIds);
      }
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    }
  }, [isAuthenticated, isCustomer]);

  // Only fetch wishlist once when auth is loaded
  useEffect(() => {
    if (!authLoading) {
      fetchWishlist();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, isCustomer]);

  // Check if item is in wishlist
  const isInWishlist = useCallback((itemId: string) => {
    return wishlistIds.includes(itemId);
  }, [wishlistIds]);

  // Add to wishlist
  const addToWishlist = useCallback(async (itemId: string) => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });

      if (response.ok) {
        setWishlistIds(prev => [...prev, itemId]);
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
  const removeFromWishlist = useCallback(async (itemId: string) => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/wishlist/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setWishlistIds(prev => prev.filter(id => id !== itemId));
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
  const toggleWishlist = useCallback((itemId: string) => {
    // If not authenticated, open login modal
    if (!isAuthenticated || !isCustomer) {
      setPendingItemId(itemId);
      setLoginModalOpen(true);
      return;
    }

    // Toggle based on current state
    if (isInWishlist(itemId)) {
      removeFromWishlist(itemId);
    } else {
      addToWishlist(itemId);
    }
  }, [isAuthenticated, isCustomer, isInWishlist, addToWishlist, removeFromWishlist]);

  // Handle successful login - add pending item to wishlist
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
        const itemIds = data.items?.map((item: { itemId: string }) => item.itemId) || [];
        setWishlistIds(itemIds);
      }
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    }

    // Add pending item if exists (directly call API, not relying on state)
    if (pendingItemId) {
      try {
        const response = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: pendingItemId }),
        });

        if (response.ok) {
          setWishlistIds(prev => [...prev, pendingItemId]);
          toast.success('Đã thêm vào danh sách yêu thích');
        }
      } catch (error) {
        console.error('Failed to add to wishlist:', error);
      }
      setPendingItemId(null);
    }
  }, [pendingItemId, refetchAuth]);

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
