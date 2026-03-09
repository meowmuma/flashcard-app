// src/app/my-decks/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Link from 'next/link';

interface MyDeck {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  is_public: boolean;
  share_code?: string | null;
  times_copied: number;
  card_count: number;
  created_at: string;
  updated_at: string;
}

export default function MyDecksPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<MyDeck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyDecks();
  }, []);

  const fetchMyDecks = async () => {
    setIsLoading(true);
    setError('');

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('/api/decks', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Loaded ${data.decks.length} my decks`);
        setDecks(data.decks);
      } else {
        setError(data.error || 'ไม่สามารถโหลดชุดการ์ดได้');
      }
    } catch (error) {
      console.error('❌ Error fetching my decks:', error);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (deckId: number, deckTitle: string) => {
    if (!confirm(`ต้องการลบชุด "${deckTitle}" หรือไม่?\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/decks/${deckId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert('ลบชุดการ์ดสำเร็จ');
        setDecks(decks.filter((d) => d.id !== deckId));
      } else {
        const data = await response.json();
        alert(data.error || 'ไม่สามารถลบชุดการ์ดได้');
      }
    } catch (error) {
      console.error('❌ Error deleting deck:', error);
      alert('เกิดข้อผิดพลาดในการลบชุดการ์ด');
    }
  };

  const handleShare = (shareCode: string, title: string) => {
    const shareUrl = `${window.location.origin}/share/${shareCode}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert(`คัดลอกลิงก์แชร์สำเร็จ!\n\nชุด: ${title}\n\n${shareUrl}`);
    }).catch(() => {
      prompt('คัดลอกลิงก์นี้:', shareUrl);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 flex">
      <Sidebar />
      
      <div className="flex-1 p-8 ml-64">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-purple-800 mb-2">
                📚 การ์ดของฉัน
              </h1>
              <p className="text-purple-600 text-lg">
                จัดการชุดการ์ดที่คุณสร้างขึ้น
              </p>
            </div>
            <Link
              href="/create-deck"
              className="px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-all font-semibold shadow-lg hover:shadow-xl"
            >
              ➕ สร้างชุดใหม่
            </Link>
          </div>

          {/* แสดงผลลัพธ์ */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <p className="mt-4 text-purple-600">กำลังโหลดชุดการ์ด...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
              <p className="text-red-700">{error}</p>
            </div>
          ) : decks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-md border border-purple-100">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-purple-600 text-lg mb-4">
                คุณยังไม่มีชุดการ์ด
              </p>
              <Link
                href="/create-deck"
                className="inline-block px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-all font-semibold"
              >
                สร้างชุดแรกของคุณ
              </Link>
            </div>
          ) : (
            <>
              <p className="text-purple-600 mb-4">
                ทั้งหมด {decks.length} ชุดการ์ด
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {decks.map((deck) => (
                  <div
                    key={deck.id}
                    className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-purple-100"
                  >
                    <div className="p-6">
                      {/* Badge */}
                      <div className="flex items-center justify-between mb-3">
                        {deck.category && (
                          <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                            {deck.category}
                          </span>
                        )}
                        {deck.is_public ? (
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            สาธารณะ
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                            ส่วนตัว
                          </span>
                        )}
                      </div>

                      {/* ชื่อชุด */}
                      <h3 className="text-xl font-bold text-purple-800 mb-2 line-clamp-2">
                        {deck.title}
                      </h3>

                      {/* คำอธิบาย */}
                      {deck.description && (
                        <p className="text-purple-600 text-sm mb-4 line-clamp-2">
                          {deck.description}
                        </p>
                      )}

                      {/* ข้อมูลเพิ่มเติม */}
                      <div className="flex items-center text-sm text-purple-500 mb-4 space-x-4">
                        <span>📝 {deck.card_count} การ์ด</span>
                      </div>

                      {/* ปุ่มดำเนินการ */}
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <Link
                          href={`/study/${deck.id}`}
                          className="px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-all font-medium text-center shadow-md hover:shadow-lg"
                        >
                          📖 เรียน
                        </Link>
                        <Link
                          href={`/game/${deck.id}`}
                          className="px-4 py-2 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-all font-medium text-center shadow-md hover:shadow-lg"
                        >
                          🎮 เกม
                        </Link>
                      </div>

                      {/* ปุ่มจัดการ */}
                      <div className="grid grid-cols-2 gap-2">
                        {deck.is_public && deck.share_code && (
                          <button
                            onClick={() => handleShare(deck.share_code!, deck.title)}
                            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-all font-medium text-sm border border-purple-200"
                          >
                            🔗 แชร์
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(deck.id, deck.title)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all font-medium text-sm border border-red-200"
                        >
                          🗑️ ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}