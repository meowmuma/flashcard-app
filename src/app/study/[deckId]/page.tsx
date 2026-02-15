// src/app/study/[deckId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { Card, Deck, DeckDetailResponse, CardResult } from '../../types';

export default function StudyPage(): JSX.Element {
  const router = useRouter();
  const params = useParams();
  
  // แปลง deckId จาก string เป็น number
  // params มาจาก URL ซึ่งเป็น string เสมอ เราต้องแปลงเป็น number เพื่อใช้งาน
  const deckId: number = parseInt(params.deckId as string, 10);

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isFinished, setIsFinished] = useState<boolean>(false);
  
  // เก็บผลการตอบของแต่ละการ์ด
  // CardResult มี cardId และ isKnown เพื่อบอกว่ารู้หรือไม่รู้
  const [results, setResults] = useState<CardResult[]>([]);
  
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const token: string | null = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchDeckData();
  }, [deckId, router]);

  // ฟังก์ชันดึงข้อมูลชุดคำศัพท์และการ์ดทั้งหมด
  const fetchDeckData = async (): Promise<void> => {
    try {
      const token: string | null = localStorage.getItem('token');
      const response: Response = await fetch(`/api/decks/${deckId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // แปลง response เป็น JSON ก่อน (ใช้ any เพราะ error response อาจมีโครงสร้างต่างกัน)
      const json: any = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || 'ไม่สามารถโหลดข้อมูลได้');
      }

      // ยืนยันว่า json เป็น DeckDetailResponse เมื่อ response.ok
      const data: DeckDetailResponse = json as DeckDetailResponse;

      setDeck(data.deck);
      setCards(data.cards);
      
      // ถ้าไม่มีการ์ดเลย แสดงว่าชุดนี้ว่างเปล่า
      if (data.cards.length === 0) {
        setError('ชุดนี้ยังไม่มีคำศัพท์ กรุณาเพิ่มการ์ดก่อนเริ่มเรียน');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันพลิกการ์ด
  // เมื่อผู้ใช้คลิกที่การ์ดจะพลิกเพื่อดูคำตอบ
  const handleFlip = (): void => {
    setIsFlipped(!isFlipped);
  };

  // ฟังก์ชันเมื่อผู้ใช้ตอบว่ารู้คำนี้
  const handleKnown = (): void => {
    if (!cards[currentIndex]?.id) return;
    
    // บันทึกผลการตอบ
    setResults([...results, {
      cardId: cards[currentIndex].id!,
      isKnown: true,
    }]);
    
    moveToNext();
  };

  // ฟังก์ชันเมื่อผู้ใช้ตอบว่าไม่รู้คำนี้
  const handleUnknown = (): void => {
    if (!cards[currentIndex]?.id) return;
    
    setResults([...results, {
      cardId: cards[currentIndex].id!,
      isKnown: false,
    }]);
    
    moveToNext();
  };

  // ฟังก์ชันไปการ์ดถัดไป
  const moveToNext = (): void => {
    if (currentIndex < cards.length - 1) {
      // ยังมีการ์ดเหลืออยู่ ไปการ์ดต่อไป
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      // เป็นการ์ดสุดท้ายแล้ว แสดงหน้าสรุปผล
      setIsFinished(true);
    }
  };

  // ฟังก์ชันบันทึกผลการเรียนลง database
  const handleSaveProgress = async (): Promise<void> => {
    setIsSaving(true);
    
    try {
      const token: string | null = localStorage.getItem('token');
      const response: Response = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          deckId,
          results,
        }),
      });

      if (!response.ok) {
        const data: any = await response.json();
        throw new Error(data.error || 'ไม่สามารถบันทึกได้');
      }

      // บันทึกสำเร็จ กลับไปหน้าแรก
      router.push('/');
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // คำนวณคะแนนและสถิติ
  const knownCount: number = results.filter((r: CardResult) => r.isKnown).length;
  const unknownCount: number = results.filter((r: CardResult) => !r.isKnown).length;
  const totalAnswered: number = knownCount + unknownCount;
  const scorePercentage: number = totalAnswered > 0 
    ? Math.round((knownCount / totalAnswered) * 100)
    : 0;

  // ฟังก์ชันกำหนดสีตามคะแนน
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#48BB78'; // เขียว
    if (score >= 60) return '#4299E1'; // น้ำเงิน
    if (score >= 40) return '#ED8936'; // ส้ม
    return '#F56565'; // แดง
  };

  return (
    <div className="app-container">
      <Sidebar />
      
      <main className="main-content">
        <div className="fade-in-up max-w-4xl mx-auto">
          {isLoading && (
            <div className="text-center py-16">
              <div className="loading-spinner mx-auto mb-4"></div>
              <p style={{ color: 'var(--text-secondary)' }}>กำลังโหลดการ์ด...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6">
              {error}
              <div className="mt-4">
                <button
                  onClick={(): void => router.push('/')}
                  className="btn-primary"
                >
                  กลับหน้าแรก
                </button>
              </div>
            </div>
          )}

          {!isLoading && !error && cards.length > 0 && (
            <>
              {/* แสดงหน้าเรียนการ์ด */}
              {!isFinished ? (
                <>
                  {/* ส่วนหัวแสดงข้อมูลชุดและความคืบหน้า */}
                  <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                      📚 {deck?.title}
                    </h1>
                    <div className="flex items-center gap-4">
                      <span className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                        การ์ดที่ {currentIndex + 1} จาก {cards.length}
                      </span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-color)' }}>
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${((currentIndex + 1) / cards.length) * 100}%`,
                            backgroundColor: 'var(--primary-purple)',
                          }}
                        />
                      </div>
                      <span className="text-lg font-semibold" style={{ color: 'var(--primary-purple)' }}>
                        {Math.round(((currentIndex + 1) / cards.length) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* การ์ด Flashcard */}
                  <div 
                    className="flashcard-container mb-8"
                    onClick={handleFlip}
                  >
                    <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
                      {/* ด้านหน้าการ์ด - แสดงคำศัพท์ */}
                      <div className="flashcard-front">
                        <div className="flashcard-label">คำศัพท์</div>
                        <div className="flashcard-content">
                          {cards[currentIndex]?.term}
                        </div>
                        <div className="flashcard-hint">
                          คลิกเพื่อดูคำตอบ
                        </div>
                      </div>

                      {/* ด้านหลังการ์ด - แสดงคำแปล */}
                      <div className="flashcard-back">
                        <div className="flashcard-label">ความหมาย</div>
                        <div className="flashcard-content">
                          {cards[currentIndex]?.definition}
                        </div>
                        <div className="flashcard-hint">
                          คลิกเพื่อกลับด้าน
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ปุ่มตอบรู้หรือไม่รู้ */}
                  {isFlipped && (
                    <div className="flex gap-6 justify-center">
                      <button
                        onClick={(e): void => {
                          e.stopPropagation();
                          handleUnknown();
                        }}
                        className="px-8 py-4 rounded-xl font-bold text-lg border-2 hover:bg-red-50 transition-all"
                        style={{
                          borderColor: '#F56565',
                          color: '#F56565',
                        }}
                      >
                        ❌ ยังไม่รู้
                      </button>
                      
                      <button
                        onClick={(e): void => {
                          e.stopPropagation();
                          handleKnown();
                        }}
                        className="px-8 py-4 rounded-xl font-bold text-lg border-2 hover:bg-green-50 transition-all"
                        style={{
                          borderColor: '#48BB78',
                          color: '#48BB78',
                        }}
                      >
                        ✅ รู้แล้ว
                      </button>
                    </div>
                  )}

                  {/* คำแนะนำถ้ายังไม่ได้พลิกการ์ด */}
                  {!isFlipped && (
                    <div className="text-center">
                      <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                        💡 พลิกการ์ดเพื่อดูคำตอบก่อนตอบว่ารู้หรือไม่รู้
                      </p>
                    </div>
                  )}

                  {/* แสดงคะแนนปัจจุบัน */}
                  <div className="mt-8 flex justify-center gap-8">
                    <div className="text-center">
                      <div className="text-3xl font-bold" style={{ color: '#48BB78' }}>
                        {knownCount}
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>รู้แล้ว</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold" style={{ color: '#F56565' }}>
                        {unknownCount}
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>ยังไม่รู้</div>
                    </div>
                  </div>
                </>
              ) : (
                /* หน้าสรุปผลเมื่อเรียนจบ */
                <div className="text-center">
                  <div className="content-card max-w-2xl mx-auto">
                    <div className="text-6xl mb-6">
                      {scorePercentage >= 80 ? '🎉' : scorePercentage >= 60 ? '👍' : '💪'}
                    </div>
                    
                    <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                      เรียนจบแล้ว!
                    </h1>

                    <div className="mb-8">
                      <div 
                        className="text-6xl font-bold mb-2"
                        style={{ color: getScoreColor(scorePercentage) }}
                      >
                        {scorePercentage}%
                      </div>
                      <p className="text-xl" style={{ color: 'var(--text-secondary)' }}>
                        คะแนนของคุณ
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div className="p-6 rounded-xl" style={{ background: 'var(--background)' }}>
                        <div className="text-4xl font-bold mb-2" style={{ color: '#48BB78' }}>
                          {knownCount}
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>คำที่รู้</div>
                      </div>
                      
                      <div className="p-6 rounded-xl" style={{ background: 'var(--background)' }}>
                        <div className="text-4xl font-bold mb-2" style={{ color: '#F56565' }}>
                          {unknownCount}
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>คำที่ยังไม่รู้</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <button
                        onClick={handleSaveProgress}
                        disabled={isSaving}
                        className="w-full btn-primary py-4 text-lg disabled:opacity-50"
                      >
                        {isSaving ? '⏳ กำลังบันทึก...' : '💾 บันทึกผลและกลับหน้าแรก'}
                      </button>
                      
                      <button
                        onClick={(): void => {
                          setCurrentIndex(0);
                          setIsFlipped(false);
                          setIsFinished(false);
                          setResults([]);
                        }}
                        className="w-full px-6 py-4 rounded-xl border-2 hover:bg-gray-50 transition-all font-bold text-lg"
                        style={{ borderColor: 'var(--border-color)' }}
                      >
                        🔄 เรียนซ้ำอีกครั้ง
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}