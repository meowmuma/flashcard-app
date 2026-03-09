// src/app/share/[shareCode]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PublicDeckInfo, Card } from '@/app/types';

export default function SharePage() {
  const router = useRouter();
  const params = useParams();
  const shareCode = params.shareCode as string;

  const [deck, setDeck] = useState<PublicDeckInfo & { cards?: Card[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    if (shareCode) {
      fetchSharedDeck();
    }
  }, [shareCode]);

  const fetchSharedDeck = async () => {
    setIsLoading(true);
    setError('');

    try {
      console.log(`🔍 Fetching deck with share code: ${shareCode}`);

      const response = await fetch(`/api/public-decks/share/${shareCode}`);
      const data = await response.json();

      if (response.ok) {
        console.log('✅ Deck loaded:', data.deck.title);
        setDeck(data.deck);
      } else {
        setError(data.error || 'ไม่พบชุดการ์ดนี้');
      }
    } catch (error) {
      console.error('❌ Error fetching shared deck:', error);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyDeck = async () => {
    // ตรวจสอบว่าผู้ใช้ล็อกอินหรือยัง
    const token = localStorage.getItem('token');
    if (!token) {
      if (confirm('กรุณาเข้าสู่ระบบก่อนคัดลอกชุดการ์ด\nต้องการไปหน้าเข้าสู่ระบบหรือไม่?')) {
        // เก็บ URL ปัจจุบันไว้เพื่อกลับมาหลังจากล็อกอิน
        localStorage.setItem('returnUrl', window.location.pathname);
        router.push('/login');
      }
      return;
    }

    if (!deck) return;

    setIsCopying(true);

    try {
      console.log(`📋 Copying deck ${deck.id}...`);

      const response = await fetch(`/api/public-decks/${deck.id}/copy`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          `คัดลอกชุดการ์ด "${deck.title}" สำเร็จ!\n\n` +
          `คุณสามารถเริ่มเรียนได้ที่หน้า My Decks`
        );
        router.push('/');
      } else {
        if (data.existing_deck_id) {
          // ถ้าเคยคัดลอกไปแล้ว ให้ไปที่ชุดนั้นเลย
          if (confirm(`คุณเคยคัดลอกชุดนี้ไปแล้ว\nต้องการไปยังชุดการ์ดที่คัดลอกไว้หรือไม่?`)) {
            router.push(`/study/${data.existing_deck_id}`);
          }
        } else {
          alert(data.error || 'ไม่สามารถคัดลอกชุดการ์ดได้');
        }
      }
    } catch (error) {
      console.error('❌ Error copying deck:', error);
      alert('เกิดข้อผิดพลาดในการคัดลอกชุดการ์ด');
    } finally {
      setIsCopying(false);
    }
  };

  const handleShareAgain = () => {
    const shareUrl = window.location.href;
    
    // คัดลอกลิงก์ไปที่ clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert(`คัดลอกลิงก์สำเร็จ!\n\n${shareUrl}\n\nนำลิงก์นี้ไปส่งให้เพื่อนได้เลย`);
    }).catch(() => {
      prompt('คัดลอกลิงก์นี้:', shareUrl);
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-gray-700 text-lg">กำลังโหลดชุดการ์ด...</p>
        </div>
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">ไม่พบชุดการ์ด</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/public-library')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            ไปยังคลังสาธารณะ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Card แสดงข้อมูลชุด */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                {deck.category && (
                  <span className="inline-block px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm font-semibold mb-3">
                    {deck.category}
                  </span>
                )}
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{deck.title}</h1>
                <p className="text-blue-100 text-sm">
                  โดย {deck.author_email}
                </p>
              </div>
            </div>

            {deck.description && (
              <p className="text-white text-opacity-90 text-lg leading-relaxed">
                {deck.description}
              </p>
            )}

            <div className="flex items-center space-x-6 mt-6 text-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
                <span>{deck.card_count} การ์ด</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                </svg>
                <span>{deck.times_copied || 0} คนคัดลอก</span>
              </div>
            </div>
          </div>

          {/* ปุ่มดำเนินการ */}
          <div className="p-6 bg-gray-50 border-b">
            <div className="flex gap-3">
              <button
                onClick={handleCopyDeck}
                disabled={isCopying}
                className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {isCopying ? 'กำลังคัดลอก...' : '📋 คัดลอกชุดนี้ไปใช้'}
              </button>
              <button
                onClick={handleShareAgain}
                className="px-6 py-4 bg-white text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-semibold border-2 border-gray-300"
                title="แชร์ลิงก์นี้ต่อ"
              >
                🔗
              </button>
            </div>
            <p className="text-center text-sm text-gray-600 mt-3">
              คัดลอกชุดนี้เพื่อเริ่มเรียนรู้ หรือกดปุ่มแชร์เพื่อส่งต่อให้เพื่อน
            </p>
          </div>

          {/* แสดงการ์ดตัวอย่าง */}
          {deck.cards && deck.cards.length > 0 && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                ตัวอย่างการ์ด ({deck.cards.length} ใบ)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {deck.cards.map((card, index) => (
                  <div
                    key={card.id}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500">
                        การ์ดที่ {index + 1}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">คำศัพท์</p>
                        <p className="font-semibold text-gray-800">{card.term}</p>
                      </div>
                      <div className="border-t pt-2">
                        <p className="text-xs text-gray-500 mb-1">ความหมาย</p>
                        <p className="text-gray-700">{card.definition}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ปุ่มกลับ */}
        <div className="text-center">
          <button
            onClick={() => router.push('/public-library')}
            className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium shadow-md"
          >
            ← กลับไปยังคลังสาธารณะ
          </button>
        </div>
      </div>
    </div>
  );
}