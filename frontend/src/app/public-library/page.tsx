// src/app/public-library/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { PublicDeckInfo } from '@/types';

export default function PublicLibraryPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<PublicDeckInfo[]>([]);
  const [filteredDecks, setFilteredDecks] = useState<PublicDeckInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const categories = [
    'ทั้งหมด',
    'ภาษาอังกฤษ',
    'ภาษาญี่ปุ่น',
    'ภาษาจีน',
    'ภาษาเกาหลี',
    'ภาษาฝรั่งเศส',
    'วิทยาศาสตร์',
    'คณิตศาสตร์',
    'ประวัติศาสตร์',
    'ภูมิศาสตร์',
    'คอมพิวเตอร์',
    'การแพทย์',
    'อื่นๆ',
  ];

  useEffect(() => {
    fetchPublicDecks();
  }, [sortBy]);

  useEffect(() => {
    filterDecks();
  }, [decks, searchQuery, selectedCategory]);

  const fetchPublicDecks = async () => {
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.append('sort', sortBy);

      const response = await fetch(`/api/public-decks?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Loaded ${data.decks.length} public decks`);
        setDecks(data.decks);
      } else {
        setError(data.error || 'ไม่สามารถโหลดชุดการ์ดสาธารณะได้');
      }
    } catch (error) {
      console.error('❌ Error fetching public decks:', error);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  const filterDecks = () => {
    let filtered = [...decks];

    // กรองตามคำค้น
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (deck) =>
          deck.title.toLowerCase().includes(query) ||
          (deck.description && deck.description.toLowerCase().includes(query))
      );
    }

    // กรองตามหมวดหมู่
    if (selectedCategory && selectedCategory !== 'ทั้งหมด') {
      filtered = filtered.filter((deck) => deck.category === selectedCategory);
    }

    setFilteredDecks(filtered);
  };

  const handleCopyDeck = async (deckId: number, deckTitle: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (confirm('กรุณาเข้าสู่ระบบก่อนคัดลอกชุดการ์ด\nต้องการไปหน้าเข้าสู่ระบบหรือไม่?')) {
        router.push('/login');
      }
      return;
    }

    if (!confirm(`คุณต้องการคัดลอกชุด "${deckTitle}" ไปยังคลังของคุณหรือไม่?`)) {
      return;
    }

    try {
      console.log(`📋 Copying deck ${deckId}...`);

      const response = await fetch(`/api/public-decks/${deckId}/copy`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        alert(`คัดลอกชุดการ์ด "${deckTitle}" สำเร็จ!\n\nคุณสามารถดูชุดนี้ได้ที่หน้า My Decks`);
        
        // อัปเดตจำนวนครั้งที่ถูกคัดลอก
        setDecks(
          decks.map((deck) =>
            deck.id === deckId
              ? { ...deck, times_copied: (deck.times_copied || 0) + 1 }
              : deck
          )
        );
      } else {
        alert(data.error || 'ไม่สามารถคัดลอกชุดการ์ดได้');
      }
    } catch (error) {
      console.error('❌ Error copying deck:', error);
      alert('เกิดข้อผิดพลาดในการคัดลอกชุดการ์ด');
    }
  };

  const handleShareDeck = (shareCode: string) => {
    const shareUrl = `${window.location.origin}/share/${shareCode}`;
    
    // คัดลอกลิงก์ไปที่ clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert(`คัดลอกลิงก์แชร์สำเร็จ!\n\n${shareUrl}\n\nนำลิงก์นี้ไปส่งให้เพื่อนได้เลย`);
    }).catch(() => {
      // ถ้าคัดลอกไม่ได้ ให้แสดงลิงก์ให้คัดลอกเอง
      prompt('คัดลอกลิงก์นี้:', shareUrl);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex">
      <Sidebar />
      
      <div className="flex-1 p-8 ml-64">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              📚 คลังชุดการ์ดสาธารณะ
            </h1>
            <p className="text-gray-600 text-lg">
              ค้นหาและคัดลอกชุดการ์ดจากผู้ใช้ท่านอื่น หรือแชร์ชุดของคุณให้คนอื่นได้เรียนรู้
            </p>
          </div>

          {/* ช่องค้นหาและตัวกรอง */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ค้นหา */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ค้นหา
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อหรือคำอธิบาย..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* หมวดหมู่ */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  หมวดหมู่
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat === 'ทั้งหมด' ? '' : cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* เรียงลำดับ */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  เรียงตาม
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="newest">ล่าสุด</option>
                  <option value="popular">ได้รับความนิยม</option>
                </select>
              </div>
            </div>
          </div>

          {/* แสดงผลลัพธ์ */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <p className="mt-4 text-gray-600">กำลังโหลดชุดการ์ด...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-700">{error}</p>
            </div>
          ) : filteredDecks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-md">
              <svg
                className="mx-auto h-24 w-24 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-gray-600 text-lg">
                {searchQuery || selectedCategory
                  ? 'ไม่พบชุดการ์ดที่ตรงกับเงื่อนไขที่ค้นหา'
                  : 'ยังไม่มีชุดการ์ดสาธารณะ'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-4">
                พบ {filteredDecks.length} ชุดการ์ด
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDecks.map((deck) => (
                  <div
                    key={deck.id}
                    className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    <div className="p-6">
                      {/* หมวดหมู่ */}
                      {deck.category && (
                        <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full mb-3">
                          {deck.category}
                        </span>
                      )}

                      {/* ชื่อชุด */}
                      <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                        {deck.title}
                      </h3>

                      {/* คำอธิบาย */}
                      {deck.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {deck.description}
                        </p>
                      )}

                      {/* ข้อมูลเพิ่มเติม */}
                      <div className="flex items-center text-sm text-gray-500 mb-4 space-x-4">
                        <span>📝 {deck.card_count} การ์ด</span>
                        <span>📋 {deck.times_copied || 0} คัดลอก</span>
                      </div>

                      {/* ผู้สร้าง */}
                      <p className="text-xs text-gray-500 mb-4">
                        โดย {deck.author_email}
                      </p>

                      {/* ปุ่มดำเนินการ */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopyDeck(deck.id, deck.title)}
                          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                        >
                          คัดลอก
                        </button>
                        {deck.share_code && (
                          <button
                            onClick={() => handleShareDeck(deck.share_code!)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                            title="คัดลอกลิงก์แชร์"
                          >
                            🔗
                          </button>
                        )}
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