// src/app/flashcards/page.tsx - แก้ไขการตรวจสอบให้ถูกต้อง
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';

interface CardInput {
  term: string;
  definition: string;
}

export default function FlashcardsPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [cards, setCards] = useState<CardInput[]>([
    { term: '', definition: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const addCard = () => {
    setCards([...cards, { term: '', definition: '' }]);
  };

  const removeCard = (index: number) => {
    if (cards.length > 1) {
      setCards(cards.filter((_, i) => i !== index));
    }
  };

  const updateCard = (index: number, field: 'term' | 'definition', value: string) => {
    const newCards = [...cards];
    newCards[index][field] = value;
    setCards(newCards);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('📝 Form submitted with data:', {
      title: title,
      titleLength: title.trim().length,
      description,
      category,
      isPublic,
      cardsCount: cards.length,
      cards: cards,
    });

    // ตรวจสอบชื่อชุด
    if (!title || title.trim().length === 0) {
      alert('❌ กรุณากรอกชื่อชุดการ์ด');
      return;
    }

    // กรองการ์ดที่กรอกครบเท่านั้น
    const validCards = cards.filter((c) => {
      const hasTerm = c.term && c.term.trim().length > 0;
      const hasDef = c.definition && c.definition.trim().length > 0;
      return hasTerm && hasDef;
    });

    console.log('📊 Valid cards:', validCards.length);

    // ต้องมีการ์ดอย่างน้อย 1 ใบ
    if (validCards.length === 0) {
      alert('❌ กรุณาเพิ่มการ์ดอย่างน้อย 1 ใบ\n(ต้องกรอกทั้งคำศัพท์และคำตอบ)');
      return;
    }

    // ถ้าเป็น Public ต้องมีคำอธิบายและภาษา
    if (isPublic) {
      if (!description || description.trim().length === 0) {
        alert('❌ กรุณากรอกคำอธิบายสำหรับชุดการ์ดสาธารณะ');
        return;
      }
      if (!category || category.trim().length === 0) {
        alert('❌ กรุณาเลือกภาษาสำหรับชุดการ์ดสาธารณะ');
        return;
      }
    }

    setIsSubmitting(true);

    const token = localStorage.getItem('token');
    if (!token) {
      alert('❌ กรุณาเข้าสู่ระบบก่อน');
      router.push('/login');
      return;
    }

    try {
      console.log('🚀 Creating deck...');

      // สร้างชุดการ์ด
      const deckPayload = {
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        is_public: isPublic,
      };

      console.log('📦 Deck payload:', deckPayload);

      const deckResponse = await fetch('/api/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(deckPayload),
      });

      const deckData = await deckResponse.json();

      console.log('📥 Deck response:', {
        status: deckResponse.status,
        data: deckData,
      });

      if (!deckResponse.ok) {
        throw new Error(deckData.error || 'ไม่สามารถสร้างชุดการ์ดได้');
      }

      const deckId = deckData.deck.id;
      console.log('✅ Deck created with ID:', deckId);

      // เพิ่มการ์ดทีละใบ
      let successCount = 0;
      for (const card of validCards) {
        console.log('📝 Adding card:', card);

        const cardResponse = await fetch(`/api/decks/${deckId}/cards`, {
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

        if (cardResponse.ok) {
          successCount++;
        } else {
          const cardError = await cardResponse.json();
          console.error('❌ Failed to add card:', cardError);
        }
      }

      console.log(`✅ Added ${successCount}/${validCards.length} cards`);

      alert(`✅ สร้างชุดการ์ด "${title}" สำเร็จ!\n\nเพิ่มการ์ดทั้งหมด ${successCount} ใบ`);

      if (isPublic && deckData.deck.share_code) {
        const shareUrl = `${window.location.origin}/share/${deckData.deck.share_code}`;
        if (confirm(`🌐 ชุดการ์ดของคุณเป็นสาธารณะ\n\nลิงก์แชร์:\n${shareUrl}\n\nต้องการคัดลอกลิงก์หรือไม่?`)) {
          navigator.clipboard.writeText(shareUrl);
        }
      }

      router.push('/my-library');

    } catch (error: any) {
      console.error('❌ Error creating deck:', error);
      alert(`❌ ${error.message || 'เกิดข้อผิดพลาดในการสร้างชุดการ์ด'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      
      <div className="flex-1 ml-64">
        <div className="max-w-4xl mx-auto p-8">
          <h1 className="text-3xl font-bold text-[#7A3689] mb-8">
            Create a flash card
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* ชื่อชุดการ์ด */}
            <div>
              <label className="block text-sm font-medium text-[#7A3689] mb-2">
                ชื่อชุดการ์ด <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น คำศัพท์ภาษาอังกฤษ TOEIC"
                className="w-full px-4 py-3 bg-[#F0E4FF] border-2 border-transparent rounded-2xl text-[#7A3689] placeholder-[#7A3689] placeholder-opacity-40 focus:border-[#7A3689] focus:outline-none transition-colors"
                required
              />
            </div>

            {/* คำอธิบาย */}
            <div>
              <label className="block text-sm font-medium text-[#7A3689] mb-2">
                คำอธิบาย {isPublic && <span className="text-red-500">*</span>}
                {!isPublic && <span className="text-xs text-[#7A3689] text-opacity-60"> (ไม่บังคับ)</span>}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="อธิบายเกี่ยวกับชุดการ์ดนี้..."
                rows={3}
                className="w-full px-4 py-3 bg-[#F0E4FF] border-2 border-transparent rounded-2xl text-[#7A3689] placeholder-[#7A3689] placeholder-opacity-40 focus:border-[#7A3689] focus:outline-none resize-none transition-colors"
                required={isPublic}
              />
            </div>

            {/* ภาษา */}
            <div>
              <label className="block text-sm font-medium text-[#7A3689] mb-2">
                ภาษา {isPublic && <span className="text-red-500">*</span>}
                {!isPublic && <span className="text-xs text-[#7A3689] text-opacity-60"> (ไม่บังคับ)</span>}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-[#F0E4FF] border-2 border-transparent rounded-2xl text-[#7A3689] focus:border-[#7A3689] focus:outline-none transition-colors"
                required={isPublic}
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
                <span className="ml-2 text-xs font-normal text-[#7A3689] text-opacity-60">
                  (กรอกอย่างน้อย 1 ใบ)
                </span>
              </label>
              {cards.map((card, index) => (
                <div
                  key={index}
                  className="bg-[#F0E4FF] rounded-3xl p-6 relative hover:bg-[#E8DCFF] transition-colors"
                >
                  {cards.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCard(index)}
                      className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#7A3689] hover:bg-red-100 hover:text-red-600 transition-colors text-xl font-bold shadow-sm"
                      title="ลบการ์ดนี้"
                    >
                      ×
                    </button>
                  )}

                  <div className="space-y-4 pr-10">
                    <div>
                      <label className="block text-xs font-medium text-[#7A3689] mb-2">
                        คำศัพท์ {index + 1}
                      </label>
                      <input
                        type="text"
                        value={card.term}
                        onChange={(e) => updateCard(index, 'term', e.target.value)}
                        placeholder="กรอกคำศัพท์..."
                        className="w-full px-4 py-3 bg-white border-2 border-transparent rounded-2xl text-[#7A3689] placeholder-[#7A3689] placeholder-opacity-40 focus:border-[#7A3689] focus:outline-none transition-colors"
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
                        className="w-full px-4 py-3 bg-white border-2 border-transparent rounded-2xl text-[#7A3689] placeholder-[#7A3689] placeholder-opacity-40 focus:border-[#7A3689] focus:outline-none transition-colors"
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
              className="w-full py-4 bg-[#E3DAFF] text-[#7A3689] rounded-full font-medium hover:bg-[#7A3689] hover:text-white transition-all text-lg"
            >
              ➕ Add a card
            </button>

            {/* ปุ่ม Create */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-16 py-4 bg-[#7A3689] text-white rounded-full font-medium hover:bg-opacity-90 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg text-lg"
              >
                {isSubmitting ? '⏳ Creating...' : '✨ Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}