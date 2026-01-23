"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminGlampingPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to "All Zones" dashboard
    router.replace("/admin/zones/all/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );
}
