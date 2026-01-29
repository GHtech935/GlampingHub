"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminGlampingPage() {
  const router = useRouter();
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    if (redirected) return;

    const redirect = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user && data.user.type === 'staff') {
            const role = data.user.role;
            const glampingZoneIds = data.user.glampingZoneIds;

            // glamping_owner: redirect to their zone
            if (role === 'glamping_owner' && glampingZoneIds && glampingZoneIds.length > 0) {
              router.replace(`/admin/zones/${glampingZoneIds[0]}/dashboard`);
            } else {
              // admin/sale/operations/owner: redirect to all zones
              router.replace("/admin/zones/all/dashboard");
            }

            setRedirected(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        // Fallback
        router.replace("/admin/zones/all/dashboard");
      }
    };

    redirect();
  }, [router, redirected]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );
}
