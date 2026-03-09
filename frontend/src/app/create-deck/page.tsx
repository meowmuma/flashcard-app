// src/app/create-deck/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';

export default function CreateDeckPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [cards, setCards] = useState([
    { term: '', definition: '' },
    { term: '', definition: '' },
    { term: '', definition: '' },
  ]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ตรวจสอบการล็อกอิน
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  // รายการหมวดหมู่ที่ผู้ใช้สามารถเลือกได้
  const categories = [
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

  const handleAddCard = () => {
    // เพิ่มการ์ดใบใหม่เข้าไปในรายการ
    setCards([...cards, { term: '', definition: '' }]);
  };

  const handleRemoveCard = (index: number) => {
    // ลบการ์ดออกจากรายการ แต่ต้องเหลืออย่างน้อย 1 ใบ
    if (cards.length > 1) {
      const newCards = cards.filter((_, i) => i !== index);
      setCards(newCards);
    }
  };

  const handleCardChange = (index: number, field: 'term' | 'definition', value: string) => {
    // อัปเดตข้อมูลการ์ดที่ถูกแก้ไข
    const newCards = [...cards];
    newCards[index][field] = value;
    setCards(newCards);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // ตรวจสอบว่ากรอกข้อมูลครบหรือไม่
    if (!title.trim()) {
      setError('กรุณาใส่ชื่อชุดการ์ด');
      setIsLoading(false);
      return;
    }

    // กรองเอาแค่การ์ดที่มีข้อมูลครบทั้งคำศัพท์และความหมาย
    const validCards = cards.filter(
      card => card.term.trim() && card.definition.trim()
    );

    if (validCards.length === 0) {
      setError('กรุณาเพิ่มการ์ดอย่างน้อย 1 ใบ');
      setIsLoading(false);
      return;
    }

    // ถ้าเลือกเป็น public ต้องกรอก description
    if (isPublic && !description.trim()) {
      setError('กรุณาใส่คำอธิบายสำหรับชุดการ์ดสาธารณะ');
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      console.log('🚀 Creating deck...', {
        title,
        is_public: isPublic,
        cards_count: validCards.length,
      });

      const response = await fetch('/api/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          category: category || null,
          is_public: isPublic,
          cards: validCards,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Deck created successfully');
        
        // ถ้าเป็น public deck จะได้ share code มาด้วย
        if (data.deck.is_public && data.deck.share_code) {
          alert(
            `สร้างชุดการ์ดสำเร็จ!\n\n` +
            `รหัสแชร์: ${data.deck.share_code}\n` +
            `แชร์ให้เพื่อนได้ที่: ${window.location.origin}/share/${data.deck.share_code}`
          );
        }
        
        router.push('/');
      } else {
        setError(data.error || 'ไม่สามารถสร้างชุดการ์ดได้');
      }
    } catch (error: any) {
      console.error('❌ Error creating deck:', error);
      setError('เกิดข้อผิดพลาดในการสร้างชุดการ์ด');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex">
      <Sidebar />
      
      <div className="flex-1 p-8 ml-64">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              สร้างชุดการ์ดใหม่
            </h1>
            <p className="text-gray-600 mb-8">
              สร้างชุดคำศัพท์ของคุณเองเพื่อเริ่มการเรียนรู้
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* ชื่อชุดการ์ด */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ชื่อชุดการ์ด *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น คำศัพท์ภาษาอังกฤษ ม.1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* คำอธิบาย */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  คำอธิบาย {isPublic && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="อธิบายว่าชุดการ์ดนี้เกี่ยวกับอะไร มีเนื้อหาอะไรบ้าง"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-sm text-gray-500">
                  คำอธิบายจะช่วยให้คนอื่นเข้าใจเนื้อหาของชุดการ์ดคุณ
                </p>
              </div>

              {/* หมวดหมู่ */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  หมวดหมู่
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- เลือกหมวดหมู่ --</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* สถานะ Public/Private */}
              <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="mt-1 mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <label htmlFor="isPublic" className="font-semibold text-gray-700 cursor-pointer">
                      เผยแพร่เป็นชุดการ์ดสาธารณะ
                    </label>
                    <p className="mt-1 text-sm text-gray-600">
                      {isPublic ? (
                        <span className="text-green-600 font-medium">
                          ✓ ชุดนี้จะปรากฏในคลังสาธารณะ คนอื่นสามารถค้นหาและคัดลอกไปใช้ได้ 
                          คุณจะได้รับรหัสแชร์เพื่อส่งให้เพื่อน
                        </span>
                      ) : (
                        <span>
                          ชุดนี้จะเป็นส่วนตัว เฉพาะคุณเท่านั้นที่เห็นและใช้งานได้
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* รายการการ์ด */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    การ์ดทั้งหมด ({cards.length} ใบ)
                  </h2>
                  <button
                    type="button"
                    onClick={handleAddCard}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    + เพิ่มการ์ด
                  </button>
                </div>

                <div className="space-y-4">
                  {cards.map((card, index) => (
                    <div
                      key={index}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-gray-600">
                          การ์ดที่ {index + 1}
                        </span>
                        {cards.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCard(index)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            ลบการ์ดนี้
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            คำศัพท์
                          </label>
                          <input
                            type="text"
                            value={card.term}
                            onChange={(e) =>
                              handleCardChange(index, 'term', e.target.value)
                            }
                            placeholder="เช่น Apple"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ความหมาย
                          </label>
                          <input
                            type="text"
                            value={card.definition}
                            onChange={(e) =>
                              handleCardChange(index, 'definition', e.target.value)
                            }
                            placeholder="เช่น แอปเปิล, ผลไม้ชนิดหนึ่ง"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ปุ่มสร้างชุดการ์ด */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  disabled={isLoading}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'กำลังสร้าง...' : 'สร้างชุดการ์ด'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}