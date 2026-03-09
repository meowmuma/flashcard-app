// src/app/study/[deckId]/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';

interface Card {
  id: number;
  term: string;
  definition: string;
}

interface Deck {
  id: number;
  title: string;
  description?: string;
  card_count?: number;
}

export default function StudyPage({ params }: { params: { deckId: string } }) {
  const router = useRouter();
  const deckId = parseInt(params.deckId);

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // ✅ FIX: ใช้ ref เพื่อให้ finishSession อ่านค่าล่าสุดได้เสมอ (หลีกเลี่ยงปัญหา stale closure)
  const knownCountRef = useRef(0);
  const learningCountRef = useRef(0);
  const [knownCount, setKnownCount] = useState(0);
  const [learningCount, setLearningCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // ✅ FIX: ใช้ ref เก็บ cards และ currentIndex เพื่อให้ saveProgress อ่านค่าล่าสุดได้
  const cardsRef = useRef<Card[]>([]);
  const currentIndexRef = useRef(0);

  const [startTime] = useState(Date.now());

  // sync ref กับ state เสมอ
  useEffect(() => {
    knownCountRef.current = knownCount;
  }, [knownCount]);

  useEffect(() => {
    learningCountRef.current = learningCount;
  }, [learningCount]);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    fetchDeckAndCards();
  }, []);

  const fetchDeckAndCards = async () => {
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
        setDeck(data.deck);
        const shuffled = [...data.cards].sort(() => Math.random() - 0.5);
        setCards(shuffled);
        cardsRef.current = shuffled;
        await tryLoadProgress(shuffled);
      } else {
        alert(data.error || 'ไม่สามารถโหลดชุดการ์ดได้');
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching deck:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const tryLoadProgress = async (loadedCards: Card[]) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(
        `/api/study-progress?deck_id=${deckId}&session_type=study`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await response.json();

      if (response.ok && data.progress) {
        const progress = data.progress;
        const hasRealProgress =
          progress.current_card_index > 0 ||
          progress.known_cards > 0 ||
          progress.unknown_cards > 0;

        if (hasRealProgress) {
          const orderedCards = progress.card_order
            ? JSON.parse(progress.card_order)
                .map((cardId: number) => loadedCards.find((c) => c.id === cardId))
                .filter(Boolean)
            : loadedCards;

          setCards(orderedCards as Card[]);
          cardsRef.current = orderedCards as Card[];

          // ✅ FIX: โหลด index ที่บันทึกไว้ตรงๆ (เราบันทึก nextIndex แล้ว)
          setCurrentIndex(progress.current_card_index);
          currentIndexRef.current = progress.current_card_index;

          setKnownCount(progress.known_cards);
          knownCountRef.current = progress.known_cards;

          setLearningCount(progress.unknown_cards);
          learningCountRef.current = progress.unknown_cards;
        } else {
          await deleteProgress();
        }
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const deleteProgress = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`/api/study-progress?deck_id=${deckId}&session_type=study`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Error deleting progress:', error);
    }
  };

  // ✅ FIX: รับ nextIndex เป็น param เพื่อบันทึกตำแหน่งที่ถูกต้อง
  const saveProgress = async (nextIndex: number, known: number, learning: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await fetch('/api/study-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deck_id: deckId,
          session_type: 'study',
          current_card_index: nextIndex,          // ✅ บันทึก index ถัดไปที่จะเรียน
          total_cards: cardsRef.current.length,
          known_cards: known,
          unknown_cards: learning,
          card_order: JSON.stringify(cardsRef.current.map((c) => c.id)),
          is_completed: false,
        }),
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  // ✅ FIX: รับค่า finalKnown/finalLearning โดยตรง ไม่อ่านจาก state (หลีกเลี่ยง stale closure)
  const saveCompletedSession = async (finalKnown: number, finalLearning: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const totalCards = cardsRef.current.length;

    try {
      await fetch('/api/study-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deck_id: deckId,
          session_type: 'study',
          current_card_index: totalCards,
          total_cards: totalCards,
          known_cards: finalKnown,
          unknown_cards: finalLearning,
          card_order: JSON.stringify(cardsRef.current.map((c) => c.id)),
          is_completed: true,
          time_spent_seconds: timeSpent,
        }),
      });
      console.log(`✅ Session completed: ${finalKnown}/${totalCards} known`);
    } catch (error) {
      console.error('Error saving completed session:', error);
    }
  };

  // ✅ FIX: คำนวณค่าใหม่ก่อน แล้วส่งค่าใหม่ไปทุกฟังก์ชัน (ไม่พึ่ง state update)
  const handleStillLearning = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    const newLearning = learningCountRef.current + 1;
    setLearningCount(newLearning);
    learningCountRef.current = newLearning;

    moveToNext(knownCountRef.current, newLearning);
  };

  const handleKnow = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    const newKnown = knownCountRef.current + 1;
    setKnownCount(newKnown);
    knownCountRef.current = newKnown;

    moveToNext(newKnown, learningCountRef.current);
  };

  // ✅ FIX: รับ known/learning ปัจจุบันมาเลย ไม่อ่านจาก state
  const moveToNext = (known: number, learning: number) => {
    setIsFlipped(false);

    setTimeout(() => {
      const idx = currentIndexRef.current;
      const total = cardsRef.current.length;

      if (idx < total - 1) {
        const nextIndex = idx + 1;
        setCurrentIndex(nextIndex);
        currentIndexRef.current = nextIndex;

        // ✅ FIX: บันทึก nextIndex (ตำแหน่งถัดไป) ไม่ใช่ currentIndex
        saveProgress(nextIndex, known, learning);
        setIsAnimating(false);
      } else {
        // การ์ดหมดแล้ว → จบ session
        finishSession(known, learning);
      }
    }, 300);
  };

  // ✅ FIX: รับค่าตรงๆ ไม่อ่านจาก state เพื่อป้องกัน stale closure
  const finishSession = async (finalKnown: number, finalLearning: number) => {
    // ✅ FIX: บันทึกครั้งเดียวตอนจบ ไม่บันทึกซ้ำ
    await saveCompletedSession(finalKnown, finalLearning);

    const searchParams = new URLSearchParams({
      title: deck?.title || 'ไม่ทราบชื่อชุด',
      total: cardsRef.current.length.toString(),
      known: finalKnown.toString(),
      unknown: finalLearning.toString(),
    });

    router.push(`/study/${deckId}/summary?${searchParams.toString()}`);
  };

  const handleFlip = () => {
    if (isAnimating) return;
    setIsFlipped(!isFlipped);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isAnimating) return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === '1' && isFlipped) {
        handleStillLearning();
      } else if (e.key === '2' && isFlipped) {
        handleKnow();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, isAnimating]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-[#E3DAFF] border-t-[#7A3689]"></div>
            <p className="mt-4 text-[#7A3689] font-medium">กำลังโหลด...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!deck || cards.length === 0) {
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center bg-[#F0E4FF] rounded-3xl p-12 shadow-lg">
            <div className="text-6xl mb-6">📭</div>
            <p className="text-[#7A3689] text-xl font-medium">ชุดนี้ยังไม่มีการ์ด</p>
            <button
              onClick={() => router.push('/my-library')}
              className="mt-6 px-8 py-3 bg-[#7A3689] text-white rounded-full hover:bg-opacity-90 transition-all"
            >
              กลับไปห้องสมุด
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />

      <div className="flex-1 ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-[#7A3689]">Flashcards</h1>
                <p className="text-[#7A3689] text-opacity-70 mt-1">{deck.title}</p>
              </div>
              <div className="text-2xl font-bold text-[#7A3689]">
                {currentIndex + 1} / {cards.length}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white text-xl">
                    ✓
                  </div>
                  <span className="text-green-700 font-medium">รู้แล้ว</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{knownCount}</span>
              </div>

              <div className="flex-1 bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    ×
                  </div>
                  <span className="text-orange-700 font-medium">กำลังเรียนรู้</span>
                </div>
                <span className="text-2xl font-bold text-orange-600">{learningCount}</span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div
              onClick={handleFlip}
              className={`card-container ${isFlipped ? 'flipped' : ''}`}
              style={{ perspective: '1000px' }}
            >
              <div className="card-inner">
                <div className="card-face card-front">
                  <div className="text-5xl font-bold text-[#7A3689] mb-8">
                    {currentCard.term}
                  </div>
                  <div className="text-sm text-[#7A3689] text-opacity-60">
                    คลิกเพื่อดูคำตอบ
                  </div>
                </div>

                <div className="card-face card-back">
                  <div className="text-4xl font-medium text-[#7A3689]">
                    {currentCard.definition}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isFlipped && !isAnimating && (
            <div className="grid grid-cols-2 gap-6 animate-fadeIn">
              <button
                onClick={handleStillLearning}
                className="group relative overflow-hidden bg-gradient-to-br from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white rounded-3xl p-8 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-5xl font-bold group-hover:scale-110 transition-transform">
                    ×
                  </div>
                  <span className="text-xl font-bold">ยังไม่รู้</span>
                  <span className="text-sm opacity-80">กด 1</span>
                </div>
              </button>

              <button
                onClick={handleKnow}
                className="group relative overflow-hidden bg-gradient-to-br from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white rounded-3xl p-8 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-5xl group-hover:scale-110 transition-transform">
                    ✓
                  </div>
                  <span className="text-xl font-bold">รู้แล้ว</span>
                  <span className="text-sm opacity-80">กด 2</span>
                </div>
              </button>
            </div>
          )}

          <div className="mt-8">
            <div className="w-full h-2 bg-[#F0E4FF] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#7A3689] to-[#9D5CB5] transition-all duration-500"
                style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .card-container {
          width: 100%;
          min-height: 400px;
          cursor: pointer;
        }
        .card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 400px;
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }
        .card-container.flipped .card-inner {
          transform: rotateY(180deg);
        }
        .card-face {
          position: absolute;
          width: 100%;
          min-height: 400px;
          backface-visibility: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          background: white;
          border: 4px solid #e3daff;
          border-radius: 2rem;
          transition: all 0.3s;
        }
        .card-face:hover {
          border-color: #7a3689;
          box-shadow: 0 10px 40px rgba(122, 54, 137, 0.1);
        }
        .card-back {
          transform: rotateY(180deg);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}