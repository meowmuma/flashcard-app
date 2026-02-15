// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './components/Sidebar';
import { Deck, DecksResponse, SortOption } from './types';

export default function HomePage(): JSX.Element {
  const router = useRouter();
  
  // State สำหรับเก็บชุดคำศัพท์ทั้งหมด
  // เรากำหนดให้เป็น Deck[] ซึ่งหมายความว่าเป็น array ของ Deck objects
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // SortOption เป็น type ที่เรากำหนดไว้ใน types/index.ts
  // มันจะจำกัดค่าที่เป็นไปได้เป็นเพียง 'updated', 'title', หรือ 'cards' เท่านั้น
  const [sortBy, setSortBy] = useState<SortOption>('updated');

  // useEffect จะทำงานเมื่อ component ถูก mount ครั้งแรก
  // เราใช้มันเพื่อตรวจสอบการล็อกอินและโหลดข้อมูล
  useEffect(() => {
    const token: string | null = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchDecks();
  }, [router]);

  // ฟังก์ชันนี้จะดึงข้อมูลชุดคำศัพท์ทั้งหมดจาก API
  // เรากำหนด return type เป็น Promise<void> เพราะเป็น async function ที่ไม่คืนค่า
  const fetchDecks = async (): Promise<void> => {
    try {
      const token: string | null = localStorage.getItem('token');
      const response: Response = await fetch('/api/decks', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // แปลง response เป็น JSON ก่อน (ใช้ any เพราะ error response อาจมีโครงสร้างต่างกัน)
      const json: any = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || 'ไม่สามารถโหลดข้อมูลได้');
      }

      // ยืนยันว่า json เป็น DecksResponse เมื่อ response.ok
      const data: DecksResponse = json as DecksResponse;
      setDecks(data.decks);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันลบชุดคำศัพท์
  // parameter ทุกตัวมี type ที่ชัดเจน deckId เป็น number และ deckTitle เป็น string
  const handleDeleteDeck = async (deckId: number, deckTitle: string): Promise<void> => {
    // confirm() จะคืนค่า boolean เมื่อผู้ใช้ตอบ
    const confirmed: boolean = confirm(
      `คุณต้องการลบชุด "${deckTitle}" ใช่หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้`
    );
    
    if (!confirmed) {
      return;
    }

    try {
      const token: string | null = localStorage.getItem('token');
      const response: Response = await fetch(`/api/decks/${deckId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data: any = await response.json();
        throw new Error(data.error || 'ไม่สามารถลบชุดคำศัพท์ได้');
      }

      // filter() จะคืน array ใหม่ที่ไม่รวมชุดที่ถูกลบ
      // TypeScript รู้ว่า decks เป็น Deck[] ดังนั้น deck แต่ละตัวก็เป็น Deck
      setDecks(decks.filter((deck: Deck) => deck.id !== deckId));
      
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ฟังก์ชันไปหน้าแก้ไข
  // เราโหลดข้อมูลชุดมาก่อน แล้วเก็บไว้ใน localStorage เพื่อให้หน้าแก้ไขใช้งาน
  const handleEditDeck = async (deckId: number): Promise<void> => {
    try {
      const token: string | null = localStorage.getItem('token');
      const response: Response = await fetch(`/api/decks/${deckId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data: any = await response.json();
      if (response.ok) {
        // แปลง object เป็น JSON string เพื่อเก็บใน localStorage
        localStorage.setItem('editingDeck', JSON.stringify(data));
        router.push(`/create-deck?edit=${deckId}`);
      }
    } catch (err: any) {
      alert('ไม่สามารถโหลดข้อมูลสำหรับแก้ไขได้');
    }
  };

  // ฟังก์ชันกรองและเรียงลำดับชุดคำศัพท์
  // return type คือ Deck[] เพราะเราคืน array ของ Deck objects
  const getFilteredAndSortedDecks = (): Deck[] => {
    // กรองตามคำค้นหา
    // toLowerCase() ทำให้การค้นหาไม่สนใจตัวพิมพ์เล็กใหญ่
    let filtered: Deck[] = decks.filter((deck: Deck) =>
      deck.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // เรียงลำดับตามเกณฑ์ที่เลือก
    switch (sortBy) {
      case 'title':
        // เรียงตามชื่อ A-Z โดยใช้ localeCompare สำหรับภาษาไทย
        filtered.sort((a: Deck, b: Deck) => 
          a.title.localeCompare(b.title, 'th')
        );
        break;
      case 'cards':
        // เรียงตามจำนวนการ์ด มากไปน้อย
        // เราใช้ || 0 เพื่อจัดการกับกรณีที่ card_count เป็น undefined
        filtered.sort((a: Deck, b: Deck) => 
          (b.card_count || 0) - (a.card_count || 0)
        );
        break;
      case 'updated':
      default:
        // เรียงตามวันที่อัปเดต ล่าสุดก่อน
        filtered.sort((a: Deck, b: Deck) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        break;
    }

    return filtered;
  };

  const filteredDecks: Deck[] = getFilteredAndSortedDecks();

  return (
    <div className="app-container">
      <Sidebar />
      
      <main className="main-content">
        <div className="fade-in-up">
          {/* ส่วนหัวพร้อมปุ่มสร้างชุดใหม่ */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                🏠 หน้าแรก
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                ยินดีต้อนรับกลับมา! เลือกชุดคำศัพท์เพื่อเริ่มเรียนรู้
              </p>
            </div>

            <button
              onClick={(): void => {
                localStorage.removeItem('editingDeck');
                router.push('/create-deck');
              }}
              className="btn-primary flex items-center gap-2 text-lg"
            >
              <span className="text-2xl">+</span>
              <span>Create</span>
            </button>
          </div>

          {/* ส่วนค้นหาและเรียงลำดับ */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="🔍 ค้นหาชุดคำศัพท์..."
                value={searchTerm}
                onChange={(e): void => setSearchTerm(e.target.value)}
                className="w-full px-6 py-4 rounded-xl border-2 focus:outline-none transition-all text-lg"
                style={{
                  borderColor: searchTerm ? 'var(--primary-purple)' : 'var(--border-color)',
                  background: 'white'
                }}
              />
            </div>
            
            <div>
              <select
                value={sortBy}
                onChange={(e): void => setSortBy(e.target.value as SortOption)}
                className="w-full px-6 py-4 rounded-xl border-2 focus:outline-none transition-all text-lg cursor-pointer"
                style={{
                  borderColor: 'var(--border-color)',
                  background: 'white'
                }}
              >
                <option value="updated">เรียงตามวันที่อัปเดต</option>
                <option value="title">เรียงตามชื่อ A-Z</option>
                <option value="cards">เรียงตามจำนวนคำ</option>
              </select>
            </div>
          </div>

          {/* แสดงสถานะการโหลด */}
          {isLoading && (
            <div className="text-center py-16">
              <div className="loading-spinner mx-auto mb-4"></div>
              <p style={{ color: 'var(--text-secondary)' }}>กำลังโหลดชุดคำศัพท์ของคุณ...</p>
            </div>
          )}

          {/* แสดง error ถ้ามี */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6">
              <strong>เกิดข้อผิดพลาด:</strong> {error}
            </div>
          )}

          {/* แสดงรายการชุดคำศัพท์ */}
          {!isLoading && !error && (
            <>
              {filteredDecks.length === 0 ? (
                <div className="text-center py-16 content-card">
                  <div className="text-6xl mb-4">
                    {searchTerm ? '🔍' : '📚'}
                  </div>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {searchTerm ? 'ไม่พบผลการค้นหา' : 'ยังไม่มีชุดคำศัพท์'}
                  </h2>
                  <p className="mb-6 text-lg" style={{ color: 'var(--text-secondary)' }}>
                    {searchTerm 
                      ? `ไม่พบชุดคำศัพท์ที่มีคำว่า "${searchTerm}"` 
                      : 'เริ่มต้นสร้างชุดคำศัพท์แรกของคุณเพื่อเริ่มการเรียนรู้'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={(): void => router.push('/create-deck')}
                      className="btn-primary text-lg"
                    >
                      + สร้างชุดคำศัพท์แรก
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <p className="text-lg font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {searchTerm 
                        ? `พบ ${filteredDecks.length} ชุดจากการค้นหา "${searchTerm}"`
                        : `ทั้งหมด ${filteredDecks.length} ชุดคำศัพท์`}
                    </p>
                  </div>

                  {/* Grid แสดงการ์ดแต่ละชุด */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDecks.map((deck: Deck) => (
                      <div key={deck.id} className="deck-card">
                        <div className="mb-4">
                          <h3 className="deck-card-title">{deck.title}</h3>
                          <p className="deck-card-meta">
                            ผู้สร้าง: {(localStorage.getItem('userEmail') || '').split('@')[0]}
                          </p>
                          <p className="deck-card-meta">
                            อัปเดต: {new Date(deck.updated_at).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                          <span className="deck-card-count">
                            {deck.card_count || 0} คำ
                          </span>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={(): void => router.push(`/study/${deck.id}`)}
                            className="flex-1 btn-success"
                          >
                            เริ่ม
                          </button>
                          <button
                            onClick={(): void => { handleEditDeck(deck.id); }}
                            className="px-4 py-2 rounded-lg border-2 hover:bg-yellow-50 transition-all"
                            style={{ borderColor: 'var(--border-color)' }}
                            title="แก้ไข"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(): void => { handleDeleteDeck(deck.id, deck.title); }}
                            className="px-4 py-2 rounded-lg border-2 hover:bg-red-50 transition-all"
                            style={{ borderColor: '#FEB2B2', color: '#E53E3E' }}
                            title="ลบ"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}