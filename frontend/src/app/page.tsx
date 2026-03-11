// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './components/Sidebar';
import Link from 'next/link';

interface DeckInfo {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  is_public: boolean;
  share_code?: string | null;
  card_count: number;
  author_email: string;
  is_owner?: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const [decks, setDecks] = useState<DeckInfo[]>([]);
  const [filteredDecks, setFilteredDecks] = useState<DeckInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [isLoading, setIsLoading] = useState(true);

  const languages = [
    'ทั้งหมด',
    'ภาษาอังกฤษ',
    'ภาษาญี่ปุ่น',
    'ภาษาจีน',
    'ภาษาเกาหลี',
    'ภาษาฝรั่งเศส',
    'ภาษาไทย',
    'ภาษาสเปน',
    'ภาษาเยอรมัน',
  ];

  useEffect(() => {
    fetchPublicDecks();
  }, [sortBy]);

  useEffect(() => {
    filterDecks();
  }, [decks, searchQuery, selectedLanguage]);

  const fetchPublicDecks = async () => {
    setIsLoading(true);

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('sort', sortBy);

      const response = await fetch(`/api/public-decks?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok) {
        setDecks(data.decks);
      }
    } catch (error) {
      console.error('Error fetching decks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterDecks = () => {
    let filtered = [...decks];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (deck) =>
          deck.title.toLowerCase().includes(query) ||
          (deck.description && deck.description.toLowerCase().includes(query))
      );
    }

    if (selectedLanguage && selectedLanguage !== 'ทั้งหมด') {
      filtered = filtered.filter((deck) => deck.category === selectedLanguage);
    }

    setFilteredDecks(filtered);
  };

  const handleShare = (shareCode: string, title: string) => {
    const shareUrl = `${window.location.origin}/share/${shareCode}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert(`คัดลอกลิงก์แชร์สำเร็จ!\n\nชุด: ${title}\n\nลิงก์: ${shareUrl}\n\nส่งลิงก์นี้ให้เพื่อนเพื่อเชิญชวนเข้ามาเรียนรู้`);
    }).catch(() => {
      prompt('คัดลอกลิงก์นี้:', shareUrl);
    });
  };

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      
      <div className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#7A3689] mb-2">
              Explore Flash Cards
            </h1>
            <p className="text-[#7A3689] text-opacity-70">
              ค้นพบชุดการ์ดจากผู้ใช้ทั่วโลก เริ่มเรียนรู้ได้ทันที
            </p>
          </div>

          <div className="bg-[#F0E4FF] rounded-3xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search flash cards..."
                  className="w-full px-4 py-3 bg-white border-none rounded-2xl text-[#7A3689] placeholder-[#7A3689] placeholder-opacity-40 focus:ring-2 focus:ring-[#7A3689] focus:outline-none"
                />
              </div>

              <div>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-none rounded-2xl text-[#7A3689] focus:ring-2 focus:ring-[#7A3689] focus:outline-none"
                >
                  {languages.map((lang) => (
                    <option key={lang} value={lang === 'ทั้งหมด' ? '' : lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-none rounded-2xl text-[#7A3689] focus:ring-2 focus:ring-[#7A3689] focus:outline-none"
                >
                  <option value="newest">ล่าสุด</option>
                  <option value="popular">ได้รับความนิยม</option>
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-[#E3DAFF] border-t-[#7A3689]"></div>
              <p className="mt-4 text-[#7A3689]">กำลังโหลด...</p>
            </div>
          ) : filteredDecks.length === 0 ? (
            <div className="text-center py-20 bg-[#F0E4FF] rounded-3xl">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-[#7A3689] text-lg">
                {searchQuery || selectedLanguage
                  ? 'ไม่พบชุดการ์ดที่ตรงกับเงื่อนไข'
                  : 'ยังไม่มีชุดการ์ดสาธารณะ'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-[#7A3689] text-opacity-70 mb-6">
                พบ {filteredDecks.length} ชุดการ์ด
              </p>

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
                      {deck.is_owner && (
                        <span className="px-3 py-1 bg-[#7A3689] text-white rounded-full text-xs font-medium">
                          ของฉัน
                        </span>
                      )}
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
                      <span>👤 {deck.author_email.split('@')[0]}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        href={`/study/${deck.id}`}
                        className="px-4 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-all font-medium text-center text-sm"
                      >
                        📖 Study
                      </Link>
                      <Link
                        href={`/game/${deck.id}`}
                        className="px-4 py-3 bg-[#7A3689] text-white rounded-full hover:bg-opacity-90 transition-all font-medium text-center text-sm"
                      >
                        🎯 Match
                      </Link>
                    </div>

                    {deck.share_code && (
                      <button
                        onClick={() => handleShare(deck.share_code!, deck.title)}
                        className="w-full mt-3 px-4 py-3 bg-white text-[#7A3689] rounded-full hover:bg-[#E3DAFF] transition-all font-medium text-sm"
                      >
                        🔗 Share
                      </button>
                    )}
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