// src/app/my-library/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { Deck, DecksResponse } from '../types';

export default function MyLibraryPage(): JSX.Element {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const token: string | null = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchDecks();
  }, [router]);

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

      const data: DecksResponse = json as DecksResponse;
      setDecks(data.decks);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDeck = async (deckId: number, deckTitle: string): Promise<void> => {
    const confirmed: boolean = confirm(
      `คุณต้องการลบชุด "${deckTitle}" ใช่หรือไม่?`
    );
    
    if (!confirmed) return;

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
        throw new Error(data.error || 'ไม่สามารถลบได้');
      }

      setDecks(decks.filter((deck: Deck) => deck.id !== deckId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredDecks: Deck[] = decks.filter((deck: Deck) =>
    deck.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // คำนวณสถิติรวม
  const totalDecks: number = decks.length;
  const totalCards: number = decks.reduce((sum: number, deck: Deck) => 
    sum + (deck.card_count || 0), 0
  );

  return (
    <div className="app-container">
      <Sidebar />
      
      <main className="main-content">
        <div className="fade-in-up">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              📚 My Library
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              จัดการชุดคำศัพท์ทั้งหมดของคุณที่นี่
            </p>
          </div>

          {/* แสดงสถิติรวม */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="content-card text-center">
              <div className="text-5xl mb-3">📇</div>
              <div className="text-4xl font-bold mb-2" style={{ color: 'var(--primary-purple)' }}>
                {totalDecks}
              </div>
              <div className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                ชุดคำศัพท์ทั้งหมด
              </div>
            </div>

            <div className="content-card text-center">
              <div className="text-5xl mb-3">🎴</div>
              <div className="text-4xl font-bold mb-2" style={{ color: 'var(--accent-teal)' }}>
                {totalCards}
              </div>
              <div className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                การ์ดคำศัพท์ทั้งหมด
              </div>
            </div>
          </div>

          {/* ช่องค้นหา */}
          <div className="mb-8">
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

          {isLoading && (
            <div className="text-center py-16">
              <div className="loading-spinner mx-auto mb-4"></div>
              <p style={{ color: 'var(--text-secondary)' }}>กำลังโหลด...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6">
              {error}
            </div>
          )}

          {!isLoading && !error && (
            <>
              {filteredDecks.length === 0 ? (
                <div className="text-center py-16 content-card">
                  <div className="text-6xl mb-4">📭</div>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {searchTerm ? 'ไม่พบผลการค้นหา' : 'คลังของคุณว่างเปล่า'}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {searchTerm 
                      ? `ไม่พบชุดคำศัพท์ที่มีคำว่า "${searchTerm}"`
                      : 'เริ่มสร้างชุดคำศัพท์แรกของคุณเลย'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-lg font-semibold mb-6" style={{ color: 'var(--text-secondary)' }}>
                    แสดง {filteredDecks.length} จาก {totalDecks} ชุด
                  </p>

                  {filteredDecks.map((deck: Deck) => (
                    <div key={deck.id} className="content-card">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                            {deck.title}
                          </h3>
                          <div className="flex gap-4 flex-wrap mb-3">
                            <span className="stat-badge">
                              📝 {deck.card_count || 0} คำ
                            </span>
                            <span className="stat-badge">
                              📅 สร้างเมื่อ {new Date(deck.created_at).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-3 ml-4">
                          <button
                            onClick={(): void => router.push(`/study/${deck.id}`)}
                            className="btn-success"
                          >
                            เริ่มเรียน
                          </button>
                          <button
                            onClick={(): void => { handleDeleteDeck(deck.id, deck.title); }}
                            className="px-4 py-2 rounded-lg border-2 hover:bg-red-50 transition-all"
                            style={{ borderColor: '#FEB2B2', color: '#E53E3E' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}