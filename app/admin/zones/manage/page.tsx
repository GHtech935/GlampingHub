"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ZonesManagePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to all zones dashboard
    router.push("/admin/zones/all/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );
}
