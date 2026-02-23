'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './components/Sidebar'; // ดึง Sidebar ที่ทำไว้มาใช้
import { Deck, DecksResponse } from './types';

export default function HomePage(): JSX.Element {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchDecks();
  }, [router]);

  const fetchDecks = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/decks', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data: DecksResponse = await response.json();
      if (response.ok) setDecks(data.decks);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบชุดคำศัพท์นี้?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/decks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) fetchDecks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (deck: Deck) => {
    localStorage.setItem('editingDeck', JSON.stringify({ deck, cards: [] }));
    router.push(`/create-deck?edit=${deck.id}`);
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-gray-800">
      
      {/* 👈 เรียกใช้ Sidebar จาก Component (โค้ดจะได้ไม่ซ้ำซ้อน) */}
      <Sidebar />

      {/* 👉 เนื้อหาด้านขวา */}
      <main className="flex-1 p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">
          
          {/* 🔍 Search Bar */}
          <div className="relative w-full">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              type="text" 
              placeholder="ค้นหาชุดคำศัพท์..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full py-4 pl-14 pr-6 rounded-[25px] border-none outline-none bg-[#F8F6FA] text-gray-500 shadow-sm transition-all focus:ring-2 focus:ring-purple-200" 
            />
          </div>

          {/* ➕ Create Deck Button */}
          <div className="flex justify-end">
            <button 
              onClick={() => router.push('/create-deck')} 
              className="px-8 py-3 bg-[#6B4A9C] text-white rounded-[20px] font-bold shadow-sm hover:bg-[#583984] transition-all"
            >
              + Create Deck
            </button>
          </div>

          {/* 📋 รายการ Deck */}
          <div className="flex flex-col gap-6">
            {!isLoading && decks.length === 0 ? (
               <div className="text-center py-20 text-gray-400 font-medium bg-[#FAFAFD] rounded-[15px] border border-gray-100 shadow-sm">
                 ไม่พบข้อมูลชุดคำศัพท์
               </div>
            ) : (
              decks.filter(d => d.title.toLowerCase().includes(searchTerm.toLowerCase())).map((deck) => (
                <div 
                  key={deck.id} 
                  className="bg-[#FAFAFD] rounded-[20px] p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)] border border-gray-100 relative"
                >
                  
                  {/* ปุ่มวงกลม มุมขวาบน (แก้ไข / ลบ) */}
                  <div className="absolute top-6 right-6 flex gap-3">
                    <button 
                      onClick={() => handleEdit(deck)} 
                      className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-orange-400 hover:bg-orange-50 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleDelete(deck.id)} 
                      className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div className="pr-24">
                    <h3 className="text-xl font-bold text-[#1A202C] mb-2">{deck.title}</h3>
                    <div className="flex gap-6 text-[13px] text-gray-500 font-medium mb-4">                 
                      <span>จำนวน: {deck.card_count || 0} คำ</span>
                    </div>
                    <button 
                      onClick={() => router.push(`/study/${deck.id}`)} 
                      className="px-8 py-2.5 bg-[#00A859] text-white rounded-[12px] text-sm font-bold shadow-sm hover:bg-[#008f4c] transition-all"
                    >
                      เริ่ม
                    </button>
                  </div>

                </div>
              ))
            )}
          </div>

        </div>
      </main>
    </div>
  );
}