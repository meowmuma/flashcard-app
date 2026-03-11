'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function SharePage() {
  const router = useRouter();
  const params = useParams();
  const shareCode = params.shareCode as string;

  useEffect(() => {
    if (shareCode) {
      fetchAndRedirect();
    }
  }, [shareCode]);

  const fetchAndRedirect = async () => {
    try {
      const response = await fetch(`/api/public-decks/share/${shareCode}`);
      const data = await response.json();

      if (response.ok && data.deck) {
        // redirect ไปหน้า study โดยตรงเลย
        router.replace(`/study/${data.deck.id}`);
      } else {
        router.replace('/');
      }
    } catch {
      router.replace('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#F0E4FF] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-[#E3DAFF] border-t-[#7A3689] mb-4"></div>
        <p className="text-[#7A3689] text-lg font-medium">กำลังโหลดชุดการ์ด...</p>
      </div>
    </div>
  );
}