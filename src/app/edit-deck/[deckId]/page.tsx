// src/app/edit-deck/[deckId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';

interface Card {
  id?: number;
  term: string;
  definition: string;
  isNew?: boolean;
}

interface Deck {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  is_public: boolean;
  user_id: number;
}

export default function EditDeckPage({ params }: { params: { deckId: string } }) {
  const router = useRouter();
  const deckId = parseInt(params.deckId);

  const [deck, setDeck] = useState<Deck | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [deletedCardIds, setDeletedCardIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const languages = [
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
    fetchDeckData();
  }, []);

  const fetchDeckData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch(`/api/decks/${deckId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok) {
        const deckData = data.deck;
        setDeck(deckData);
        setTitle(deckData.title);
        setDescription(deckData.description || '');
        setCategory(deckData.category || '');
        setIsPublic(deckData.is_public);
        setCards(data.cards || []);
      } else {
        alert(data.error || 'ไม่สามารถโหลดข้อมูลชุดการ์ดได้');
        router.push('/my-library');
      }
    } catch (error) {
      console.error('Error fetching deck:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      router.push('/my-library');
    } finally {
      setIsLoading(false);
    }
  };

  const addCard = () => {
    setCards([...cards, { term: '', definition: '', isNew: true }]);
  };

  const removeCard = (index: number) => {
    const card = cards[index];
    
    if (card.id && !card.isNew) {
      setDeletedCardIds([...deletedCardIds, card.id]);
    }
    
    setCards(cards.filter((_, i) => i !== index));
  };

  const updateCard = (index: number, field: 'term' | 'definition', value: string) => {
    const newCards = [...cards];
    newCards[index][field] = value;
    setCards(newCards);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('กรุณากรอกหัวข้อ');
      return;
    }

    const validCards = cards.filter((c) => {
      const hasTerm = c.term.trim().length > 0;
      const hasDef = c.definition.trim().length > 0;
      return hasTerm && hasDef;
    });

    if (validCards.length === 0) {
      alert('กรุณามีการ์ดอย่างน้อย 1 ใบ');
      return;
    }

    if (isPublic) {
      if (!description.trim()) {
        alert('กรุณากรอกคำอธิบายสำหรับชุดการ์ดสาธารณะ');
        return;
      }
      if (!category) {
        alert('กรุณาเลือกภาษาสำหรับชุดการ์ดสาธารณะ');
        return;
      }
    }

    setIsSaving(true);

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      // อัพเดตข้อมูลชุดการ์ด
      const deckResponse = await fetch(`/api/decks/${deckId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          category: category || null,
          is_public: isPublic,
        }),
      });

      if (!deckResponse.ok) {
        const deckError = await deckResponse.json();
        throw new Error(deckError.error || 'ไม่สามารถอัพเดตชุดการ์ดได้');
      }

      // ลบการ์ดที่ถูกเลือกลบ
      for (const cardId of deletedCardIds) {
        await fetch(`/api/decks/${deckId}/cards/${cardId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // อัพเดตและเพิ่มการ์ด
      for (const card of validCards) {
        if (card.isNew || !card.id) {
          // เพิ่มการ์ดใหม่
          await fetch(`/api/decks/${deckId}/cards`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              term: card.term.trim(),
              definition: card.definition.trim(),
            }),
          });
        } else {
          // อัพเดตการ์ดเก่า
          await fetch(`/api/decks/${deckId}/cards/${card.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              term: card.term.trim(),
              definition: card.definition.trim(),
            }),
          });
        }
      }

      alert('บันทึกการเปลี่ยนแปลงสำเร็จ!');
      router.push('/my-library');

    } catch (error: any) {
      console.error('Error saving deck:', error);
      alert(error.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-[#E3DAFF] border-t-[#7A3689]"></div>
            <p className="mt-4 text-[#7A3689]">กำลังโหลด...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      
      <div className="flex-1 ml-64">
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-[#7A3689]">
              Edit Flash Card
            </h1>
            <button
              onClick={() => router.push('/my-library')}
              className="px-6 py-2 bg-[#F0E4FF] text-[#7A3689] rounded-full hover:bg-[#E3DAFF] transition-all font-medium"
            >
              ← Cancel
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Private/Public Toggle */}
            <div className="bg-[#F0E4FF] rounded-3xl p-2 inline-flex">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`px-8 py-3 rounded-full font-medium transition-all ${
                  !isPublic
                    ? 'bg-white text-[#7A3689] shadow-md'
                    : 'bg-transparent text-[#7A3689] text-opacity-70'
                }`}
              >
                🔒 Private
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`px-8 py-3 rounded-full font-medium transition-all ${
                  isPublic
                    ? 'bg-white text-[#7A3689] shadow-md'
                    : 'bg-transparent text-[#7A3689] text-opacity-70'
                }`}
              >
                🌐 Public
              </button>
            </div>

            {/* หัวข้อ */}
            <div>
              <label className="block text-sm font-medium text-[#7A3689] mb-2">
                หัวข้อ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="กรอกชื่อชุดการ์ด..."
                className="w-full px-4 py-3 bg-[#F0E4FF] border-none rounded-2xl text-[#7A3689] placeholder-[#7A3689] placeholder-opacity-40 focus:ring-2 focus:ring-[#7A3689] focus:outline-none"
              />
            </div>

            {/* คำอธิบาย */}
            <div>
              <label className="block text-sm font-medium text-[#7A3689] mb-2">
                คำอธิบาย {isPublic && <span className="text-red-500">*</span>}
                {!isPublic && <span className="text-xs text-opacity-60"> (ไม่บังคับ)</span>}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="อธิบายเกี่ยวกับชุดการ์ดนี้..."
                rows={3}
                className="w-full px-4 py-3 bg-[#F0E4FF] border-none rounded-2xl text-[#7A3689] placeholder-[#7A3689] placeholder-opacity-40 focus:ring-2 focus:ring-[#7A3689] focus:outline-none resize-none"
              />
            </div>

            {/* ภาษา */}
            <div>
              <label className="block text-sm font-medium text-[#7A3689] mb-2">
                ภาษา {isPublic && <span className="text-red-500">*</span>}
                {!isPublic && <span className="text-xs text-opacity-60"> (ไม่บังคับ)</span>}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-[#F0E4FF] border-none rounded-2xl text-[#7A3689] focus:ring-2 focus:ring-[#7A3689] focus:outline-none"
              >
                <option value="">เลือกภาษา</option>
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            {/* การ์ด */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-[#7A3689]">
                การ์ด <span className="text-red-500">*</span>
                <span className="ml-2 text-xs font-normal text-opacity-60">
                  ({cards.length} ใบ)
                </span>
              </label>
              {cards.map((card, index) => (
                <div
                  key={card.id || `new-${index}`}
                  className="bg-[#F0E4FF] rounded-3xl p-6 relative"
                >
                  <button
                    type="button"
                    onClick={() => removeCard(index)}
                    className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#7A3689] hover:bg-red-100 hover:text-red-600 transition-colors text-xl font-bold"
                  >
                    ×
                  </button>

                  <div className="space-y-4 pr-8">
                    <div>
                      <label className="block text-xs font-medium text-[#7A3689] mb-2">
                        คำศัพท์
                      </label>
                      <input
                        type="text"
                        value={card.term}
                        onChange={(e) => updateCard(index, 'term', e.target.value)}
                        placeholder="กรอกคำศัพท์..."
                        className="w-full px-4 py-3 bg-white border-none rounded-2xl text-[#7A3689] placeholder-[#7A3689] placeholder-opacity-40 focus:ring-2 focus:ring-[#7A3689] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#7A3689] mb-2">
                        คำตอบ
                      </label>
                      <input
                        type="text"
                        value={card.definition}
                        onChange={(e) => updateCard(index, 'definition', e.target.value)}
                        placeholder="กรอกคำตอบ..."
                        className="w-full px-4 py-3 bg-white border-none rounded-2xl text-[#7A3689] placeholder-[#7A3689] placeholder-opacity-40 focus:ring-2 focus:ring-[#7A3689] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ปุ่ม Add a card */}
            <button
              type="button"
              onClick={addCard}
              className="w-full py-3 bg-[#E3DAFF] text-[#7A3689] rounded-full font-medium hover:bg-[#7A3689] hover:text-white transition-all"
            >
              ➕ Add a card
            </button>

            {/* ปุ่ม Save */}
            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/my-library')}
                className="px-8 py-3 bg-[#F0E4FF] text-[#7A3689] rounded-full font-medium hover:bg-[#E3DAFF] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-12 py-3 bg-[#7A3689] text-white rounded-full font-medium hover:bg-opacity-90 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}