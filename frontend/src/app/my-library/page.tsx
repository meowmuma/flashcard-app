// src/app/my-library/page.tsx - ปรับปรุงใหม่
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
}

export default function MyLibraryPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<MyDeck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');
  const [filteredDecks, setFilteredDecks] = useState<MyDeck[]>([]);

  useEffect(() => {
    fetchMyDecks();
  }, []);

  useEffect(() => {
    if (filter === 'all') {
      setFilteredDecks(decks);
    } else if (filter === 'public') {
      setFilteredDecks(decks.filter((d) => d.is_public));
    } else {
      setFilteredDecks(decks.filter((d) => !d.is_public));
    }
  }, [filter, decks]);

  const fetchMyDecks = async () => {
    setIsLoading(true);

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
        setDecks(data.decks);
      }
    } catch (error) {
      console.error('Error fetching my decks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (deckId: number, deckTitle: string) => {
    if (!confirm(`ต้องการลบชุด "${deckTitle}" หรือไม่?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) {
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
      console.error('Error deleting deck:', error);
      alert('เกิดข้อผิดพลาดในการลบชุดการ์ด');
    }
  };

  const handleShare = (shareCode: string, title: string) => {
    const shareUrl = `${window.location.origin}/share/${shareCode}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert(`คัดลอกลิงก์แชร์สำเร็จ!\n\nชุด: ${title}\n\nลิงก์: ${shareUrl}`);
    }).catch(() => {
      prompt('คัดลอกลิงก์นี้:', shareUrl);
    });
  };

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      
      <div className="flex-1 ml-64">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#7A3689] mb-2">
                My Library
              </h1>
              <p className="text-[#7A3689] text-opacity-70">
                จัดการชุดการ์ดที่คุณสร้างขึ้น
              </p>
            </div>
            <Link
              href="/flashcards"
              className="px-6 py-3 bg-[#7A3689] text-white rounded-full hover:bg-opacity-90 transition-all font-medium shadow-lg"
            >
              ➕ Create New
            </Link>
          </div>

          <div className="flex space-x-2 mb-8">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                filter === 'all'
                  ? 'bg-[#7A3689] text-white shadow-md'
                  : 'bg-[#F0E4FF] text-[#7A3689]'
              }`}
            >
              All ({decks.length})
            </button>
            <button
              onClick={() => setFilter('public')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                filter === 'public'
                  ? 'bg-[#7A3689] text-white shadow-md'
                  : 'bg-[#F0E4FF] text-[#7A3689]'
              }`}
            >
              Public ({decks.filter((d) => d.is_public).length})
            </button>
            <button
              onClick={() => setFilter('private')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                filter === 'private'
                  ? 'bg-[#7A3689] text-white shadow-md'
                  : 'bg-[#F0E4FF] text-[#7A3689]'
              }`}
            >
              Private ({decks.filter((d) => !d.is_public).length})
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-[#E3DAFF] border-t-[#7A3689]"></div>
              <p className="mt-4 text-[#7A3689]">กำลังโหลด...</p>
            </div>
          ) : filteredDecks.length === 0 ? (
            <div className="text-center py-20 bg-[#F0E4FF] rounded-3xl">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-[#7A3689] text-lg mb-4">
                {filter === 'all'
                  ? 'คุณยังไม่มีชุดการ์ด'
                  : filter === 'public'
                  ? 'คุณยังไม่มีชุดการ์ดสาธารณะ'
                  : 'คุณยังไม่มีชุดการ์ดส่วนตัว'}
              </p>
              <Link
                href="/flashcards"
                className="inline-block px-6 py-3 bg-[#7A3689] text-white rounded-full hover:bg-opacity-90 transition-all font-medium"
              >
                สร้างชุดแรกของคุณ
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDecks.map((deck) => (
                <div
                  key={deck.id}
                  className="bg-[#F0E4FF] rounded-3xl p-6 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    {deck.category && (
                      <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-[#7A3689]">
                        {deck.category}
                      </span>
                    )}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        deck.is_public
                          ? 'bg-[#7A3689] text-white'
                          : 'bg-white text-[#7A3689]'
                      }`}
                    >
                      {deck.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-[#7A3689] mb-2 line-clamp-2">
                    {deck.title}
                  </h3>

                  {deck.description && (
                    <p className="text-[#7A3689] text-opacity-70 text-sm mb-4 line-clamp-2">
                      {deck.description}
                    </p>
                  )}

                  <div className="flex items-center text-sm text-[#7A3689] text-opacity-60 mb-4 space-x-4">
                    <span>📝 {deck.card_count} cards</span>
                  </div>

                  {/* ปุ่มหลัก 4 ปุ่ม */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <Link
                      href={`/study/${deck.id}`}
                      className="px-4 py-3 bg-[#7A3689] text-white rounded-full hover:bg-opacity-90 transition-all font-medium text-center text-sm"
                    >
                      📖 Study
                    </Link>
                    <Link
                      href={`/game/${deck.id}`}
                      className="px-4 py-3 bg-[#7A3689] text-white rounded-full hover:bg-opacity-90 transition-all font-medium text-center text-sm"
                    >
                      🎯 Match
                    </Link>
                    <Link
                      href={`/edit-deck/${deck.id}`}
                      className="px-4 py-3 bg-white text-[#7A3689] rounded-full hover:bg-[#E3DAFF] transition-all font-medium text-center text-sm border border-[#E3DAFF]"
                    >
                      ✏️ Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(deck.id, deck.title)}
                      className="px-4 py-3 bg-white text-red-600 rounded-full hover:bg-red-50 transition-all font-medium text-sm border border-red-200"
                    >
                      🗑️ Delete
                    </button>
                  </div>

                  {/* ปุ่มแชร์ (ถ้ามี) */}
                  {deck.is_public && deck.share_code && (
                    <button
                      onClick={() => handleShare(deck.share_code!, deck.title)}
                      className="w-full px-4 py-3 bg-white text-[#7A3689] rounded-full hover:bg-[#E3DAFF] transition-all font-medium text-sm border border-[#E3DAFF]"
                    >
                      🔗 Share Link
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}