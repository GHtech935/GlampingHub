'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Loader2, Trash2, MapPin, ArrowRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { useAuth } from '@/hooks/useAuth';
import { useWishlist } from '@/hooks/useWishlist';
import { useClientLocale } from '@/components/providers/ClientI18nProvider';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { getLocalizedText, type MultilingualText } from '@/lib/i18n-utils';

interface WishlistItem {
  wishlistId: string;
  addedAt: string;
  itemId: string;
  itemName: MultilingualText | string;
  itemSummary: MultilingualText | string | null;
  inventoryQuantity: number;
  zoneId: string;
  zoneName: MultilingualText | string;
  imageUrl: string | null;
  basePrice: number | null;
}

export default function WishlistPage() {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated, isCustomer } = useAuth();
  const { removeFromWishlist, refetch } = useWishlist();
  const { locale } = useClientLocale();
  const t = useTranslations('wishlist');
  const tCommon = useTranslations('common');

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !isCustomer) {
        router.push('/login?returnUrl=/wishlist');
        return;
      }
      fetchWishlist();
    }
  }, [authLoading, isAuthenticated, isCustomer, router]);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/wishlist');
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (itemId: string) => {
    setRemovingIds(prev => new Set([...prev, itemId]));
    await removeFromWishlist(itemId);
    setItems(prev => prev.filter(item => item.itemId !== itemId));
    setRemovingIds(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
    refetch();
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <Container className="py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Heart className="h-8 w-8 text-primary fill-primary" />
          <h1 className="text-3xl font-bold">{t('title')}</h1>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          /* Empty state */
          <div className="border rounded-lg p-12 text-center bg-white">
            <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('empty')}</h2>
            <p className="text-muted-foreground mb-6">
              {t('emptyDescription')}
            </p>
            <Button onClick={() => router.push('/glamping/search')}>
              {t('exploreNow')}
            </Button>
          </div>
        ) : (
          /* Wishlist grid */
          <>
            <p className="text-muted-foreground mb-4">
              {items.length} {t('items')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => {
                const itemName = typeof item.itemName === 'string'
                  ? item.itemName
                  : getLocalizedText(item.itemName, locale as 'vi' | 'en');

                const zoneName = typeof item.zoneName === 'string'
                  ? item.zoneName
                  : getLocalizedText(item.zoneName, locale as 'vi' | 'en');

                const itemSummary = item.itemSummary
                  ? (typeof item.itemSummary === 'string'
                    ? item.itemSummary
                    : getLocalizedText(item.itemSummary, locale as 'vi' | 'en'))
                  : '';

                const isRemoving = removingIds.has(item.itemId);

                return (
                  <Card key={item.wishlistId} className="overflow-hidden hover:shadow-md transition-shadow">
                    {/* Image */}
                    <div className="relative aspect-[4/3] bg-gray-100">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={itemName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <MapPin className="h-12 w-12" />
                        </div>
                      )}
                      {/* Remove button */}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => handleRemove(item.itemId)}
                        disabled={isRemoving}
                      >
                        {isRemoving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <CardContent className="p-4">
                      {/* Zone name */}
                      <p className="text-sm text-muted-foreground mb-1">{zoneName}</p>

                      {/* Item name */}
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1">{itemName}</h3>

                      {/* Summary */}
                      {itemSummary && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {itemSummary}
                        </p>
                      )}

                      {/* Price and action */}
                      <div className="flex items-center justify-between mt-auto">
                        <div>
                          {item.basePrice !== null && (
                            <p className="font-bold text-primary">
                              {formatCurrency(item.basePrice)}
                              <span className="text-sm font-normal text-muted-foreground">
                                {tCommon('perNight')}
                              </span>
                            </p>
                          )}
                        </div>
                        <Button asChild variant="outline" size="sm" className="gap-1">
                          <Link href={`/glamping/zones/${item.zoneId}/items/${item.itemId}`}>
                            {tCommon('viewDetails')}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Container>
  );
}
