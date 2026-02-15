// src/app/create-deck/page.tsx
'use client';

import { useState, useEffect, KeyboardEvent, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { Card } from '../types';

// Interface สำหรับการ์ดที่กำลังสร้าง
// เราใช้ Omit เพื่อนำ Card มาใช้แต่ไม่เอา id, deck_id และ created_at
// เพราะสิ่งเหล่านี้จะถูกสร้างโดย database เมื่อบันทึก
interface DraftCard {
  term: string;
  definition: string;
}

export default function CreateDeckPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ตรวจสอบว่ากำลังแก้ไขชุดที่มีอยู่หรือสร้างใหม่
  // ถ้า URL มี ?edit=123 แสดงว่ากำลังแก้ไข ถ้าไม่มีแสดงว่าสร้างใหม่
  const editDeckId: string | null = searchParams.get('edit');
  const isEditMode: boolean = editDeckId !== null;

  // State สำหรับชื่อชุดคำศัพท์
  const [deckTitle, setDeckTitle] = useState<string>('');
  
  // State สำหรับการ์ดทั้งหมดในชุด
  // เราเริ่มต้นด้วยการ์ดว่างสองใบเพื่อให้ผู้ใช้เห็นว่าต้องกรอกอะไร
  const [cards, setCards] = useState<DraftCard[]>([
    { term: '', definition: '' },
    { term: '', definition: '' },
  ]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // useEffect นี้จะทำงานเมื่อหน้าโหลดครั้งแรก
  // ถ้าอยู่ในโหมดแก้ไข เราจะดึงข้อมูลชุดเดิมมาแสดง
  useEffect(() => {
    const token: string | null = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    if (isEditMode) {
      loadEditingDeck();
    }
  }, [isEditMode, router]);

  // ฟังก์ชันโหลดข้อมูลชุดที่ต้องการแก้ไข
  // ข้อมูลจะถูกเก็บไว้ใน localStorage จากหน้าแรกที่คลิกปุ่มแก้ไข
  const loadEditingDeck = (): void => {
    setIsLoading(true);
    
    try {
      const savedData: string | null = localStorage.getItem('editingDeck');
      
      if (savedData) {
        // แปลง JSON string กลับเป็น object
        const deckData = JSON.parse(savedData);
        
        // ตั้งค่าชื่อชุดจากข้อมูลที่โหลดมา
        setDeckTitle(deckData.deck.title);
        
        // ถ้ามีการ์ดอยู่แล้ว ใช้การ์ดนั้น
        // ถ้าไม่มีการ์ด ให้เริ่มต้นด้วยการ์ดว่างสองใบ
        if (deckData.cards && deckData.cards.length > 0) {
          // แปลง Card objects จาก API เป็น DraftCard objects
          // โดยเลือกเอาแค่ term และ definition
          const draftCards: DraftCard[] = deckData.cards.map((card: Card) => ({
            term: card.term,
            definition: card.definition,
          }));
          setCards(draftCards);
        }
      }
    } catch (err) {
      console.error('Error loading deck data:', err);
      setError('ไม่สามารถโหลดข้อมูลชุดคำศัพท์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันอัปเดตการ์ดใบหนึ่งๆ เมื่อผู้ใช้พิมพ์
  // index คือตำแหน่งของการ์ดใน array
  // field คือว่ากำลังแก้ไข 'term' หรือ 'definition'
  // value คือค่าใหม่ที่ผู้ใช้พิมพ์
  const handleCardChange = (
    index: number,
    field: keyof DraftCard,
    value: string
  ): void => {
    // สร้าง array ใหม่โดย copy ทุกอย่างจาก array เดิม
    const newCards: DraftCard[] = [...cards];
    
    // อัปเดตแค่การ์ดที่ index ที่ระบุ
    newCards[index] = {
      ...newCards[index],
      [field]: value,
    };
    
    setCards(newCards);
  };

  // ฟังก์ชันเพิ่มการ์ดใหม่
  // เราจะเพิ่มการ์ดว่างใบหนึ่งเข้าไปท้าย array
  const handleAddCard = (): void => {
    setCards([...cards, { term: '', definition: '' }]);
  };

  // ฟังก์ชันลบการ์ด
  // ใช้ filter เพื่อสร้าง array ใหม่ที่ไม่มีการ์ดที่ index ที่ระบุ
  const handleRemoveCard = (index: number): void => {
    // ต้องมีการ์ดอย่างน้อยสองใบเสมอ
    // เราไม่ให้ลบถ้าเหลือน้อยกว่าสองใบ
    if (cards.length <= 2) {
      alert('ต้องมีอย่างน้อย 2 การ์ด');
      return;
    }
    
    setCards(cards.filter((_, i: number) => i !== index));
  };

  // ฟังก์ชันจัดการเมื่อกด Enter ในช่องกรอกข้อมูล
  // เราจะทำให้กด Enter แล้วเพิ่มการ์ดใหม่ได้เลยเพื่อความสะดวก
  const handleKeyPress = (
    e: KeyboardEvent<HTMLInputElement>,
    index: number
  ): void => {
    // ถ้ากด Enter และเป็นการ์ดสุดท้าย
    if (e.key === 'Enter' && index === cards.length - 1) {
      // ตรวจสอบว่าการ์ดปัจจุบันกรอกข้อมูลครบหรือยัง
      if (cards[index].term && cards[index].definition) {
        e.preventDefault(); // ป้องกันไม่ให้ form submit
        handleAddCard();
      }
    }
  };

  // ฟังก์ชันตรวจสอบความถูกต้องก่อนบันทึก
  // คืนค่า true ถ้าข้อมูลถูกต้อง false ถ้าไม่ถูกต้อง
  const validateForm = (): boolean => {
    // ตรวจสอบว่ากรอกชื่อชุดหรือยัง
    if (!deckTitle.trim()) {
      setError('กรุณากรอกชื่อชุดคำศัพท์');
      return false;
    }

    // กรองเฉพาะการ์ดที่กรอกข้อมูลครบทั้งสองช่อง
    const filledCards: DraftCard[] = cards.filter(
      (card: DraftCard) => card.term.trim() && card.definition.trim()
    );

    // ต้องมีการ์ดที่กรอกครบอย่างน้อย 1 ใบ
    if (filledCards.length === 0) {
      setError('กรุณากรอกข้อมูลการ์ดอย่างน้อย 1 ใบ');
      return false;
    }

    return true;
  };

  // ฟังก์ชันบันทึกชุดคำศัพท์
  const handleSave = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');

    // ตรวจสอบความถูกต้องก่อน
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const token: string | null = localStorage.getItem('token');
      
      // กรองเฉพาะการ์ดที่กรอกข้อมูลครบ
      // เราไม่ต้องการบันทึกการ์ดว่างๆ
      const filledCards: DraftCard[] = cards.filter(
        (card: DraftCard) => card.term.trim() && card.definition.trim()
      );

      // เตรียมข้อมูลที่จะส่งไปยัง API
      const requestBody = {
        title: deckTitle.trim(),
        cards: filledCards.map((card: DraftCard) => ({
          term: card.term.trim(),
          definition: card.definition.trim(),
        })),
      };

      // ถ้าเป็นโหมดแก้ไข ใช้ PUT method กับ URL ที่มี deck ID
      // ถ้าเป็นสร้างใหม่ ใช้ POST method กับ /api/decks
      const url: string = isEditMode 
        ? `/api/decks/${editDeckId}` 
        : '/api/decks';
      
      const method: string = isEditMode ? 'PUT' : 'POST';

      const response: Response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data: any = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ไม่สามารถบันทึกได้');
      }

      // ลบข้อมูลการแก้ไขออกจาก localStorage
      localStorage.removeItem('editingDeck');

      // แสดงข้อความสำเร็จและกลับหน้าแรก
      alert(
        isEditMode 
          ? 'แก้ไขชุดคำศัพท์สำเร็จ!' 
          : 'สร้างชุดคำศัพท์สำเร็จ!'
      );
      
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ฟังก์ชันยกเลิกการสร้าง/แก้ไข
  const handleCancel = (): void => {
    // ถามยืนยันก่อนยกเลิก เพราะข้อมูลที่กรอกจะหายไป
    const confirmed: boolean = confirm(
      'คุณต้องการยกเลิกใช่หรือไม่? ข้อมูลที่กรอกจะไม่ถูกบันทึก'
    );
    
    if (confirmed) {
      localStorage.removeItem('editingDeck');
      router.push('/');
    }
  };

  // นับจำนวนการ์ดที่กรอกข้อมูลครบแล้ว
  // เพื่อแสดงให้ผู้ใช้เห็นว่ามีการ์ดที่พร้อมบันทึกกี่ใบ
  const filledCardsCount: number = cards.filter(
    (card: DraftCard) => card.term.trim() && card.definition.trim()
  ).length;

  return (
    <div className="app-container">
      <Sidebar />
      
      <main className="main-content">
        <div className="fade-in-up max-w-4xl mx-auto">
          {/* ส่วนหัว */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              {isEditMode ? '✏️ แก้ไขชุดคำศัพท์' : '📝 สร้างชุดคำศัพท์ใหม่'}
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {isEditMode 
                ? 'แก้ไขข้อมูลชุดคำศัพท์และการ์ดของคุณ'
                : 'สร้างชุดคำศัพท์ของคุณเองเพื่อเริ่มการเรียนรู้'}
            </p>
          </div>

          {isLoading && (
            <div className="text-center py-16">
              <div className="loading-spinner mx-auto mb-4"></div>
              <p style={{ color: 'var(--text-secondary)' }}>กำลังโหลดข้อมูล...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6">
              <strong>⚠️ ข้อผิดพลาด:</strong> {error}
            </div>
          )}

          {!isLoading && (
            <form onSubmit={handleSave}>
              {/* ช่องกรอกชื่อชุดคำศัพท์ */}
              <div className="content-card mb-8">
                <label className="block text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                  ชื่อชุดคำศัพท์ <span style={{ color: '#F56565' }}>*</span>
                </label>
                <input
                  type="text"
                  value={deckTitle}
                  onChange={(e): void => setDeckTitle(e.target.value)}
                  placeholder="เช่น คำศัพท์ภาษาอังกฤษ ม.1"
                  required
                  className="w-full px-6 py-4 text-xl rounded-xl border-2 focus:outline-none transition-all"
                  style={{
                    borderColor: deckTitle ? 'var(--primary-purple)' : 'var(--border-color)',
                  }}
                />
              </div>

              {/* ส่วนแสดงการ์ดทั้งหมด */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    การ์ดคำศัพท์
                  </h2>
                  <div className="flex items-center gap-4">
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {filledCardsCount} การ์ดพร้อมบันทึก
                    </span>
                    <button
                      type="button"
                      onClick={handleAddCard}
                      className="btn-primary flex items-center gap-2"
                    >
                      <span className="text-xl">+</span>
                      <span>เพิ่มการ์ด</span>
                    </button>
                  </div>
                </div>

                {/* แสดงคำแนะนำการใช้งาน */}
                <div className="bg-blue-50 border-2 border-blue-200 px-6 py-4 rounded-xl mb-6">
                  <p className="text-blue-800">
                    💡 <strong>เคล็ดลับ:</strong> กด Enter ที่การ์ดสุดท้ายเพื่อเพิ่มการ์ดใหม่อัตโนมัติ
                  </p>
                </div>

                {/* วนลูปแสดงการ์ดทั้งหมด */}
                <div className="space-y-6">
                  {cards.map((card: DraftCard, index: number) => (
                    <div 
                      key={index} 
                      className="content-card relative"
                    >
                      {/* แสดงเลขลำดับการ์ด */}
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                          การ์ดที่ {index + 1}
                        </h3>
                        
                        {/* ปุ่มลบการ์ด แสดงเฉพาะเมื่อมีมากกว่า 2 ใบ */}
                        {cards.length > 2 && (
                          <button
                            type="button"
                            onClick={(): void => handleRemoveCard(index)}
                            className="px-4 py-2 rounded-lg border-2 hover:bg-red-50 transition-all"
                            style={{ borderColor: '#FEB2B2', color: '#E53E3E' }}
                            title="ลบการ์ดนี้"
                          >
                            🗑️ ลบ
                          </button>
                        )}
                      </div>

                      {/* Grid สำหรับคำศัพท์และความหมาย */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* ช่องกรอกคำศัพท์ */}
                        <div>
                          <label className="block font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                            คำศัพท์ <span style={{ color: '#F56565' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={card.term}
                            onChange={(e): void => 
                              handleCardChange(index, 'term', e.target.value)
                            }
                            onKeyPress={(e): void => handleKeyPress(e, index)}
                            placeholder="เช่น apple"
                            required
                            className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all"
                            style={{
                              borderColor: card.term 
                                ? 'var(--primary-purple)' 
                                : 'var(--border-color)',
                            }}
                          />
                        </div>

                        {/* ช่องกรอกความหมาย */}
                        <div>
                          <label className="block font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                            ความหมาย <span style={{ color: '#F56565' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={card.definition}
                            onChange={(e): void => 
                              handleCardChange(index, 'definition', e.target.value)
                            }
                            onKeyPress={(e): void => handleKeyPress(e, index)}
                            placeholder="เช่น แอปเปิล, ผลไม้ชนิดหนึ่ง"
                            required
                            className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all"
                            style={{
                              borderColor: card.definition 
                                ? 'var(--primary-purple)' 
                                : 'var(--border-color)',
                            }}
                          />
                        </div>
                      </div>

                      {/* แสดงสถานะว่าการ์ดนี้กรอกครบหรือยัง */}
                      {card.term && card.definition && (
                        <div className="mt-4 text-sm" style={{ color: '#48BB78' }}>
                          ✓ การ์ดนี้พร้อมบันทึก
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ปุ่มบันทึกและยกเลิก */}
              <div className="flex gap-6">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-6 py-4 rounded-xl border-2 hover:bg-gray-50 transition-all font-bold text-lg"
                  style={{ borderColor: 'var(--border-color)' }}
                  disabled={isSaving}
                >
                  ยกเลิก
                </button>
                
                <button
                  type="submit"
                  disabled={isSaving || filledCardsCount === 0}
                  className="flex-1 btn-primary py-4 text-lg disabled:opacity-50"
                >
                  {isSaving 
                    ? '⏳ กำลังบันทึก...' 
                    : isEditMode 
                      ? '💾 บันทึกการแก้ไข' 
                      : '✨ สร้างชุดคำศัพท์'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}