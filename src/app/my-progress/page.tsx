// src/app/my-progress/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { DeckProgress, StudySession, ProgressResponse } from '../types';

export default function MyProgressPage(): JSX.Element {
  const router = useRouter();
  
  // State สำหรับเก็บข้อมูลความคืบหน้าของแต่ละชุด
  // DeckProgress เป็น interface ที่มีข้อมูลว่าแต่ละชุดมีการ์ดกี่ใบ รู้กี่ใบ ไม่รู้กี่ใบ
  const [deckProgress, setDeckProgress] = useState<DeckProgress[]>([]);
  
  // State สำหรับเก็บประวัติการเรียนล่าสุด
  // StudySession จะบอกเราว่าเรียนชุดไหน เมื่อไหร่ และผลเป็นอย่างไร
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  
  // State สำหรับสถิติรวมทั้งหมด
  const [totalStats, setTotalStats] = useState<{
    totalCards: number;
    knownCards: number;
    unknownCards: number;
  }>({
    totalCards: 0,
    knownCards: 0,
    unknownCards: 0,
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const token: string | null = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchProgress();
  }, [router]);

  // ฟังก์ชันดึงข้อมูลความคืบหน้าทั้งหมดจาก API
  // API จะส่งกลับมาทั้งความคืบหน้าของแต่ละชุดและประวัติการเรียน
  const fetchProgress = async (): Promise<void> => {
    try {
      const token: string | null = localStorage.getItem('token');
      const response: Response = await fetch('/api/progress', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // แปลง response เป็น JSON ก่อน (ใช้ any เพราะ error response อาจมีโครงสร้างต่างกัน)
      const json: any = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || 'ไม่สามารถโหลดข้อมูลได้');
      }

      // ยืนยันว่า json เป็น ProgressResponse เมื่อ response.ok
      const data: ProgressResponse = json as ProgressResponse;

      // เก็บข้อมูลที่ได้ลง state ต่างๆ
      setDeckProgress(data.deckProgress);
      setRecentSessions(data.recentSessions || []);
      
      // เก็บสถิติรวม ถ้าไม่มีให้ใช้ค่า 0
      setTotalStats({
        totalCards: data.totalCards || 0,
        knownCards: data.knownCards || 0,
        unknownCards: data.unknownCards || 0,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันคำนวณเปอร์เซ็นต์ความสำเร็จของแต่ละชุด
  // เราคำนวณจากจำนวนคำที่รู้เทียบกับคำทั้งหมด
  const calculateProgress = (deck: DeckProgress): number => {
    if (deck.total_cards === 0) return 0;
    return Math.round((deck.known_cards / deck.total_cards) * 100);
  };

  // ฟังก์ชันกำหนดสีของ progress bar ตามเปอร์เซ็นต์
  // เปอร์เซ็นต์สูงจะได้สีเขียว เปอร์เซ็นต์ต่ำจะได้สีแดง
  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return '#48BB78'; // เขียว - เก่งมาก
    if (percentage >= 50) return '#4299E1'; // น้ำเงิน - ปานกลาง
    if (percentage >= 20) return '#ED8936'; // ส้ม - ต้องทบทวน
    return '#F56565'; // แดง - เริ่มต้นเรียน
  };

  // คำนวณเปอร์เซ็นต์รวมทั้งหมด
  const overallProgress: number = totalStats.totalCards > 0
    ? Math.round((totalStats.knownCards / totalStats.totalCards) * 100)
    : 0;

  return (
    <div className="app-container">
      <Sidebar />
      
      <main className="main-content">
        <div className="fade-in-up">
          {/* ส่วนหัว */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              📊 My Progress
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              ติดตามความคืบหน้าการเรียนรู้ของคุณ
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
              {error}
            </div>
          )}

          {!isLoading && !error && (
            <>
              {/* ส่วนแสดงสถิติรวม */}
              <div className="content-card mb-8">
                <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                  📈 ภาพรวมการเรียนรู้
                </h2>
                
                {/* Progress bar แสดงความคืบหน้ารวม */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      ความคืบหน้าโดยรวม
                    </span>
                    <span className="text-2xl font-bold" style={{ color: getProgressColor(overallProgress) }}>
                      {overallProgress}%
                    </span>
                  </div>
                  <div 
                    className="w-full h-6 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--border-color)' }}
                  >
                    <div
                      className="h-full transition-all duration-500 ease-out rounded-full"
                      style={{
                        width: `${overallProgress}%`,
                        backgroundColor: getProgressColor(overallProgress),
                      }}
                    />
                  </div>
                </div>

                {/* แสดงสถิติแบบตัวเลข */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 rounded-xl" style={{ background: 'var(--background)' }}>
                    <div className="text-4xl mb-2">📚</div>
                    <div className="text-3xl font-bold mb-2" style={{ color: 'var(--primary-purple)' }}>
                      {totalStats.totalCards}
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>คำศัพท์ทั้งหมด</div>
                  </div>

                  <div className="text-center p-6 rounded-xl" style={{ background: 'var(--background)' }}>
                    <div className="text-4xl mb-2">✅</div>
                    <div className="text-3xl font-bold mb-2" style={{ color: '#48BB78' }}>
                      {totalStats.knownCards}
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>คำที่จำได้</div>
                  </div>

                  <div className="text-center p-6 rounded-xl" style={{ background: 'var(--background)' }}>
                    <div className="text-4xl mb-2">❓</div>
                    <div className="text-3xl font-bold mb-2" style={{ color: '#F56565' }}>
                      {totalStats.unknownCards}
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>คำที่ยังไม่จำ</div>
                  </div>
                </div>
              </div>

              {/* ส่วนแสดงความคืบหน้าแต่ละชุด */}
              <div className="content-card mb-8">
                <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                  📖 ความคืบหน้าแต่ละชุด
                </h2>

                {deckProgress.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                      ยังไม่มีข้อมูลการเรียน เริ่มเรียนชุดแรกของคุณเลย!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {deckProgress.map((deck: DeckProgress) => {
                      const progress: number = calculateProgress(deck);
                      return (
                        <div 
                          key={deck.deck_id} 
                          className="p-6 rounded-xl border-2 hover:shadow-lg transition-all cursor-pointer"
                          style={{ borderColor: 'var(--border-color)' }}
                          onClick={(): void => router.push(`/study/${deck.deck_id}`)}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                                {deck.title}
                              </h3>
                              {deck.last_studied && (
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                  เรียนล่าสุด: {new Date(deck.last_studied).toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-3xl font-bold mb-1" style={{ color: getProgressColor(progress) }}>
                                {progress}%
                              </div>
                              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {deck.known_cards}/{deck.total_cards} คำ
                              </div>
                            </div>
                          </div>

                          {/* Progress bar ของแต่ละชุด */}
                          <div 
                            className="w-full h-4 rounded-full overflow-hidden mb-4"
                            style={{ backgroundColor: 'var(--border-color)' }}
                          >
                            <div
                              className="h-full transition-all duration-500"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: getProgressColor(progress),
                              }}
                            />
                          </div>

                          {/* แสดงรายละเอียดจำนวนคำ */}
                          <div className="flex gap-4 text-sm">
                            <span style={{ color: '#48BB78' }}>
                              ✅ รู้แล้ว: {deck.known_cards}
                            </span>
                            <span style={{ color: '#F56565' }}>
                              ❓ ยังไม่รู้: {deck.unknown_cards}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ส่วนแสดงประวัติการเรียนล่าสุด */}
              {recentSessions.length > 0 && (
                <div className="content-card">
                  <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                    🕒 ประวัติการเรียนล่าสุด
                  </h2>
                  
                  <div className="space-y-4">
                    {recentSessions.map((session: StudySession) => {
                      const totalAnswered: number = session.known_count + session.unknown_count;
                      const successRate: number = totalAnswered > 0
                        ? Math.round((session.known_count / totalAnswered) * 100)
                        : 0;

                      return (
                        <div 
                          key={session.id}
                          className="p-5 rounded-xl border-2 hover:bg-gray-50 transition-all"
                          style={{ borderColor: 'var(--border-color)' }}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
                                {session.deck_title}
                              </h4>
                              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                                {new Date(session.completed_at).toLocaleDateString('th-TH', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                              <div className="flex gap-4 text-sm">
                                <span style={{ color: '#48BB78' }}>
                                  ✅ {session.known_count} คำ
                                </span>
                                <span style={{ color: '#F56565' }}>
                                  ❌ {session.unknown_count} คำ
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div 
                                className="text-3xl font-bold"
                                style={{ color: getProgressColor(successRate) }}
                              >
                                {successRate}%
                              </div>
                              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                อัตราความสำเร็จ
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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