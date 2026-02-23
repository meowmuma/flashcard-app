'use client';

import { useState, useEffect, KeyboardEvent, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../components/Sidebar';

interface DraftCard {
  term: string;
  definition: string;
}

export default function CreateDeckPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const editDeckId: string | null = searchParams.get('edit');
  const isEditMode: boolean = editDeckId !== null;

  const [deckTitle, setDeckTitle] = useState<string>('');
  const [cards, setCards] = useState<DraftCard[]>([
    { term: '', definition: '' },
    { term: '', definition: '' },
  ]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    // ⭐️ ถ้าเป็นโหมดแก้ไข ให้ยิง API ไปขอข้อมูลจาก Database เลย
    if (isEditMode && editDeckId) {
      fetchDeckData(editDeckId, token);
    }
  }, [isEditMode, editDeckId, router]);

  // 🛠️ ฟังก์ชันดึงข้อมูลจาก Database ตรงๆ
  const fetchDeckData = async (id: string, token: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/decks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('ไม่สามารถโหลดข้อมูลชุดคำศัพท์ได้');
      
      const data = await response.json();
      
      // 1. ดึงชื่อชุดคำศัพท์มาจาก data.deck
      if (data.deck) setDeckTitle(data.deck.title);

      // 2. ดึงคำศัพท์ทั้งหมดมาจาก data.cards (ที่ Backend คุณส่งมา)
      if (data.cards && data.cards.length > 0) {
        const dbCards = data.cards.map((c: any) => ({
          term: c.term || '',
          definition: c.definition || ''
        }));
        setCards(dbCards);
      }
    } catch (err: any) {
      console.error(err);
      setError('ไม่สามารถดึงคำศัพท์เก่ามาได้ กรุณาลองใหม่');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardChange = (index: number, field: keyof DraftCard, value: string): void => {
    const newCards = [...cards];
    newCards[index] = { ...newCards[index], [field]: value };
    setCards(newCards);
  };

  const handleAddCard = (): void => {
    setCards([...cards, { term: '', definition: '' }]);
  };

  const handleRemoveCard = (index: number): void => {
    if (cards.length <= 2) {
      alert('ต้องมีอย่างน้อย 2 การ์ด');
      return;
    }
    setCards(cards.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>, index: number): void => {
    if (e.key === 'Enter' && index === cards.length - 1) {
      if (cards[index].term && cards[index].definition) {
        e.preventDefault();
        handleAddCard();
      }
    }
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!deckTitle.trim() || cards.filter(c => c.term && c.definition).length === 0) {
      setError('กรุณากรอกชื่อชุดและข้อมูลการ์ดอย่างน้อย 1 ใบ');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const filledCards = cards.filter(c => c.term.trim() && c.definition.trim());
      const url = isEditMode ? `/api/decks/${editDeckId}` : '/api/decks';
      
      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: deckTitle.trim(),
          cards: filledCards,
        }),
      });

      if (!response.ok) throw new Error('ไม่สามารถบันทึกได้');
      
      alert(isEditMode ? 'แก้ไขสำเร็จ!' : 'สร้างสำเร็จ!');
      router.push('/my-library');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-gray-800">
      <Sidebar />
      <main className="flex-1 p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          
          <div className="flex items-center gap-4">
            <span className="text-[32px]">📝</span>
            <div className="flex flex-col">
              <h1 className="text-[32px] font-normal text-[#1A202C] tracking-wide">
                {isEditMode ? 'แก้ไขชุดคำศัพท์' : 'สร้างชุดคำศัพท์ใหม่'}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {isEditMode ? 'แก้ไขข้อมูลชุดคำศัพท์ของคุณ' : 'สร้างชุดคำศัพท์ของคุณเองเพื่อเริ่มการเรียนรู้'}
              </p>
            </div>
          </div>

          {isLoading && isEditMode ? (
            <div className="text-center py-20 text-purple-600 font-bold">
              กำลังดึงข้อมูลคำศัพท์เดิมของคุณ... ⏳
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-8 mt-2">
              
              {error && (
                <div className="bg-red-50 text-red-500 p-4 rounded-[15px] text-sm font-medium border border-red-100">
                  {error}
                </div>
              )}

              <div className="bg-[#FAFAFD] p-8 rounded-[25px] border border-gray-100 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
                <label className="block text-[15px] font-bold mb-3 text-gray-700">ชื่อชุดคำศัพท์ <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={deckTitle}
                  onChange={(e) => setDeckTitle(e.target.value)}
                  placeholder="เช่น คำศัพท์ภาษาอังกฤษพื้นฐาน"
                  className="w-full px-5 py-4 rounded-[15px] border-none bg-white shadow-sm focus:ring-2 focus:ring-purple-200 outline-none transition-all text-[15px]"
                />
              </div>

              <div className="flex justify-between items-center px-2">
                <h2 className="text-[20px] font-bold text-gray-700">รายการคำศัพท์</h2>
                <button 
                  type="button" 
                  onClick={handleAddCard} 
                  className="px-6 py-2.5 bg-[#EBE0FC] text-[#4C1D95] rounded-[15px] font-bold text-sm shadow-[0px_2px_4px_rgba(0,0,0,0.08)] hover:bg-[#D5BCF2] transition-all"
                >
                  + เพิ่มการ์ดใหม่
                </button>
              </div>

              <div className="space-y-5">
                {cards.map((card, index) => (
                  <div key={index} className="bg-[#FAFAFD] p-6 rounded-[20px] border border-gray-100 shadow-[0px_1px_3px_rgba(0,0,0,0.05)] relative group">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-gray-400 text-sm">การ์ดที่ {index + 1}</span>
                      {cards.length > 2 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveCard(index)} 
                          className="text-red-400 hover:text-red-600 font-bold text-sm"
                        >
                          ลบ
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-bold text-gray-500">คำศัพท์</label>
                        <input
                          type="text"
                          value={card.term}
                          onChange={(e) => handleCardChange(index, 'term', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, index)}
                          className="w-full px-4 py-3 rounded-[12px] border-none bg-white shadow-sm focus:ring-2 focus:ring-purple-200 outline-none transition-all text-[14px]"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-bold text-gray-500">ความหมาย</label>
                        <input
                          type="text"
                          value={card.definition}
                          onChange={(e) => handleCardChange(index, 'definition', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, index)}
                          className="w-full px-4 py-3 rounded-[12px] border-none bg-white shadow-sm focus:ring-2 focus:ring-purple-200 outline-none transition-all text-[14px]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-4 pb-10">
                <button 
                  type="button" 
                  onClick={() => router.push('/my-library')} 
                  className="flex-1 py-4 rounded-[15px] border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all text-[15px]"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving} 
                  className="flex-1 py-4 bg-[#6B21A8] text-white rounded-[15px] font-bold shadow-md hover:bg-[#581C87] transition-all disabled:opacity-50 text-[15px]"
                >
                  {isSaving ? 'กำลังบันทึก...' : isEditMode ? 'บันทึกการแก้ไข' : 'สร้างชุดคำศัพท์'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}