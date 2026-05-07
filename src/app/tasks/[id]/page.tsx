"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OldTaskDetailPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/customer/dashboard"); }, [router]);
  return null;
}
