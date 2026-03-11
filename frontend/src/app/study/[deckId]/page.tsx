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

  const knownCountRef = useRef(0);
  const learningCountRef = useRef(0);
  const [knownCount, setKnownCount] = useState(0);
  const [learningCount, setLearningCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const cardsRef = useRef<Card[]>([]);
  const currentIndexRef = useRef(0);

  const [startTime] = useState(Date.now());

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
        alert(data.error || 'Failed to load deck');
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching deck:', error);
      alert('An error occurred while loading data');
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
          current_card_index: nextIndex,
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
    } catch (error) {
      console.error('Error saving completed session:', error);
    }
  };

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

  const moveToNext = (known: number, learning: number) => {
    setIsFlipped(false);

    setTimeout(() => {
      const idx = currentIndexRef.current;
      const total = cardsRef.current.length;

      if (idx < total - 1) {
        const nextIndex = idx + 1;
        setCurrentIndex(nextIndex);
        currentIndexRef.current = nextIndex;

        saveProgress(nextIndex, known, learning);
        setIsAnimating(false);
      } else {
        finishSession(known, learning);
      }
    }, 400); 
  };

  const finishSession = async (finalKnown: number, finalLearning: number) => {
    await saveCompletedSession(finalKnown, finalLearning);

    const searchParams = new URLSearchParams({
      title: deck?.title || 'Unknown Deck',
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
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, isAnimating]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center animate-pulse">
            <div className="inline-block rounded-full h-16 w-16 border-4 border-[#F0E4FF] border-t-[#B388EB] animate-spin mb-4"></div>
            <p className="text-[#B388EB] font-bold text-lg tracking-wide">กำลังโหลดการ์ด...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!deck || cards.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center bg-white rounded-[2rem] p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-2 border-[#F0E4FF]">
            <div className="text-7xl mb-6">📭</div>
            <p className="text-[#7A3689] text-2xl font-bold mb-2">Oops! No cards in this deck.</p>
            <p className="text-gray-400 mb-8">Let's go back and add some in your library.</p>
            <button
              onClick={() => router.push('/my-library')}
              className="px-8 py-3 bg-gradient-to-r from-[#B388EB] to-[#9D5CB5] text-white rounded-full font-bold hover:shadow-lg hover:-translate-y-1 transition-all"
            >
              Back to Library 📚
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex">
      <Sidebar />

      <div className="flex-1 ml-64 p-8 flex flex-col justify-center">
        <div className="max-w-3xl mx-auto w-full">
          
          {/* Header & Stats */}
          <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-[#B388EB] font-bold text-sm tracking-widest uppercase mb-1"> Flash cards</p>
              <h1 className="text-4xl font-extrabold text-[#4A4A4A]">{deck.title}</h1>
            </div>

            {/* ✅ กลับมาใช้ แคปซูลแสดงสถานะ แบบมินิมอลดั้งเดิม */}
            <div className="inline-flex items-center gap-4 bg-gray-50 px-5 py-2.5 rounded-full border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 text-[10px] font-bold">✓</span>
                </div>
                <span className="text-green-600 font-bold ml-1">{knownCount}</span>
              </div>
              
              <div className="w-[1px] h-4 bg-gray-300"></div> {/* เส้นคั่นตรงกลาง */}

              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-orange-600 text-[10px] font-bold">✕</span>
                </div>
                <span className="text-orange-600 font-bold ml-1">{learningCount}</span>
              </div>
            </div>
          </div>

          {/* Flashcard Area */}
          <div className="relative flex flex-col items-center">
            <div
              onClick={handleFlip}
              className={`card-container ${isFlipped ? 'flipped' : ''} w-full`}
              style={{ perspective: '1200px' }}
            >
              <div className="card-inner">
                {/* Front */}
                <div className="card-face card-front bg-[#F4ECFF] group">
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-5xl md:text-6xl font-semibold text-[#1F2937] text-center group-hover:scale-105 transition-transform duration-300">
                      {currentCard.term}
                    </div>
                  </div>
                  <div className="w-full bg-white bg-opacity-60 py-4 text-center text-[#4B5563] text-sm font-medium">
                    Click or press Spacebar to flip
                  </div>
                </div>

                {/* Back */}
                <div className="card-face card-back bg-[#F4ECFF]">
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-4xl md:text-5xl font-semibold text-[#1F2937] text-center">
                      {currentCard.definition}
                    </div>
                  </div>
                  <div className="w-full bg-white bg-opacity-60 py-4 text-center text-[#4B5563] text-sm font-medium">
                    Click or press Spacebar to flip
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex justify-center w-full">
              <div className="inline-flex items-center justify-center gap-8 bg-[#FAEEFF] px-8 py-3 rounded-full">
                
                {/* ปุ่ม Unknown */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleStillLearning(); }}
                  disabled={isAnimating}
                  className="flex items-center gap-2 transition-all duration-300 opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <span className="text-[#E53E3E] text-2xl font-light leading-none">✕</span>
                  <span className="text-[#2B6CB0] font-medium text-lg">Unknown</span>
                </button>

                {/* ตัวเลขข้อ */}
                <div className="text-[#2B6CB0] font-medium text-lg min-w-[3rem] text-center">
                  {currentIndex + 1} / {cards.length}
                </div>

                {/* ปุ่ม Known */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleKnow(); }}
                  disabled={isAnimating}
                  className="flex items-center gap-2 transition-all duration-300 opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <span className="text-[#38A169] text-2xl font-light leading-none">✓</span>
                  <span className="text-[#2B6CB0] font-medium text-lg">Known</span>
                </button>

              </div>
            </div>

          </div>

          {/* Progress Bar */}
          <div className="mt-12">
            <div className="w-full h-3 bg-[#F4EAFC] rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-[#B388EB] to-[#7A3689] rounded-full transition-all duration-700 ease-out relative"
                style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
              >
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-white opacity-20" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)' , backgroundSize: '1rem 1rem'}}></div>
              </div>
            </div>
            <p className="text-center text-[#B388EB] text-sm mt-3 font-semibold">
              Keep it up! Progress {Math.round(((currentIndex + 1) / cards.length) * 100)}%
            </p>
          </div>
          
        </div>
      </div>

      <style jsx>{`
        .card-container {
          height: 420px;
          cursor: pointer;
        }
        .card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); 
          transform-style: preserve-3d;
        }
        .card-container.flipped .card-inner {
          transform: rotateY(180deg);
        }
        .card-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          border-radius: 2rem;
          overflow: hidden;
        }
        .card-back {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}