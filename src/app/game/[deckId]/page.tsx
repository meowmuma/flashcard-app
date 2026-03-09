// src/app/game/[deckId]/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Deck, Card, MatchingCard } from '@/types';

export default function MatchingGamePage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.deckId;
  const deckId = rawId ? parseInt(rawId as string) : NaN;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [gameCards, setGameCards] = useState<MatchingCard[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  // bestTimeSec = decimal seconds เช่น 5.8
  const [bestTimeSec, setBestTimeSec] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNewBest, setIsNewBest] = useState(false);
  // lastTimeSec = decimal seconds ของรอบที่เพิ่งจบ
  const [lastTimeSec, setLastTimeSec] = useState<number | null>(null);

  const gameCardsRef  = useRef<MatchingCard[]>([]);
  const matchedRef    = useRef(0);
  const startTimeRef  = useRef<number | null>(null);
  const cardsRef      = useRef<Card[]>([]);
  const isFinishedRef = useRef(false);
  const deckIdRef     = useRef(deckId);

  useEffect(() => { gameCardsRef.current = gameCards; }, [gameCards]);
  useEffect(() => { matchedRef.current = matchedPairs; }, [matchedPairs]);
  useEffect(() => { cardsRef.current = cards; }, [cards]);
  useEffect(() => { deckIdRef.current = deckId; }, [deckId]);

  const saveMidGame = useCallback(() => {
    if (isFinishedRef.current || !startTimeRef.current) return;
    const matched = matchedRef.current;
    const total   = gameCardsRef.current.length / 2;
    if (matched === 0 || total === 0) return;
    const token = localStorage.getItem('token');
    if (!token || isNaN(deckIdRef.current)) return;
    fetch('/api/study-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        deck_id: deckIdRef.current, session_type: 'match',
        current_card_index: matched, total_cards: total,
        known_cards: matched, unknown_cards: total - matched, is_completed: false,
      }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!deckId || isNaN(deckId)) return;
    fetchDeckAndBestTime();
    return () => { saveMidGame(); };
  }, [deckId]);

  // timer — อัพเดตทุก 100ms
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime && !endTime) {
      interval = setInterval(() => setCurrentTime(Date.now() - startTime), 100);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [startTime, endTime]);

  const fetchDeckAndBestTime = async () => {
    setIsLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    try {
      const deckRes = await fetch(`/api/decks/${deckId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!deckRes.ok) throw new Error('ไม่พบชุดการ์ดนี้');
      const deckData = await deckRes.json();
      if (deckData.cards.length < 3) throw new Error('ชุดการ์ดต้องมีอย่างน้อย 3 ใบ');
      setDeck(deckData.deck);
      setCards(deckData.cards);
      cardsRef.current = deckData.cards;
      setTimeout(() => startGame(deckData.cards), 100);

      const bestRes = await fetch(`/api/game/best-time?deck_id=${deckId}&game_type=matching`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (bestRes.ok) {
        const bestData = await bestRes.json();
        if (bestData.best_time?.best_time_seconds != null) {
          setBestTimeSec(parseFloat(bestData.best_time.best_time_seconds));
        }
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = (sourceCards: Card[] = cardsRef.current) => {
    const numCards = Math.min(6, sourceCards.length);
    const picked = [...sourceCards].sort(() => Math.random() - 0.5).slice(0, numCards);
    const matchingCards: MatchingCard[] = [];
    picked.forEach((card, index) => {
      matchingCards.push({ id: `term-${card.id}`, content: card.term, type: 'term', pairId: index, x: 0, y: 0, matched: false, selected: false });
      matchingCards.push({ id: `def-${card.id}`, content: card.definition, type: 'definition', pairId: index, x: 0, y: 0, matched: false, selected: false });
    });
    const shuffled = matchingCards.sort(() => Math.random() - 0.5);
    shuffled.forEach((card, i) => { card.x = i % 4; card.y = Math.floor(i / 4); });

    const now = Date.now();
    gameCardsRef.current = shuffled;
    matchedRef.current = 0;
    startTimeRef.current = now;
    isFinishedRef.current = false;

    setGameCards(shuffled);
    setMatchedPairs(0);
    setStartTime(now);
    setEndTime(null);
    setCurrentTime(0);
    setIsNewBest(false);
    setLastTimeSec(null);
  };

  const handleCardClick = (cardId: string) => {
    if (endTime) return;
    const card = gameCardsRef.current.find(c => c.id === cardId);
    if (!card || card.matched || card.selected) return;
    const currentSel = gameCardsRef.current.filter(c => c.selected && !c.matched).map(c => c.id);
    if (currentSel.length >= 2) return;
    const newSelected = [...currentSel, cardId];
    const updated = gameCardsRef.current.map(c => c.id === cardId ? { ...c, selected: true } : c);
    gameCardsRef.current = updated;
    setGameCards([...updated]);
    if (newSelected.length === 2) checkMatch(newSelected, updated);
  };

  const checkMatch = (selected: string[], currentCards: MatchingCard[]) => {
    const [a, b] = selected;
    const cardA = currentCards.find(c => c.id === a);
    const cardB = currentCards.find(c => c.id === b);
    if (!cardA || !cardB) return;
    if (cardA.pairId === cardB.pairId) {
      const updated = currentCards.map(c => selected.includes(c.id) ? { ...c, matched: true, selected: false } : c);
      gameCardsRef.current = updated;
      setGameCards([...updated]);
      const newMatched = matchedRef.current + 1;
      matchedRef.current = newMatched;
      setMatchedPairs(newMatched);
      if (newMatched === updated.length / 2) setTimeout(() => finishGame(), 0);
    } else {
      setTimeout(() => {
        const reverted = gameCardsRef.current.map(c => selected.includes(c.id) ? { ...c, selected: false } : c);
        gameCardsRef.current = reverted;
        setGameCards([...reverted]);
      }, 1000);
    }
  };

  const finishGame = async () => {
  const start = startTimeRef.current;

  if (!start) {
    console.error('No start time recorded');
    return;
  }

  isFinishedRef.current = true;

  const finishTime = Date.now();
  const elapsedMs = finishTime - start;

  // ปัดเวลาให้เหลือ 1 ตำแหน่งทศนิยม เช่น 9624ms → 9.6s
  const elapsedSec = Math.round(elapsedMs / 100) / 10;

  console.log(`🏁 Game finished! Time: ${elapsedSec}s (${elapsedMs}ms)`);

  setLastTimeSec(elapsedSec);

  const token = localStorage.getItem('token');

  if (!token) {
    setEndTime(finishTime);
    return;
  }

  try {

    // บันทึกลง study_history
    console.log('💾 Saving to study_history...');

    await fetch('/api/study-progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        deck_id: deckId,
        session_type: 'match',

        current_card_index: gameCardsRef.current.length / 2,
        total_cards: gameCardsRef.current.length / 2,

        known_cards: gameCardsRef.current.length / 2,
        unknown_cards: 0,

        is_completed: true,
        time_spent_seconds: elapsedSec
      })
    });

    // บันทึกสถิติ Best Time
    console.log('💾 Saving best time...');

    const res = await fetch('/api/game/best-time', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        deck_id: deckId,
        game_type: 'matching',
        time_seconds: elapsedSec
      })
    });

    if (!res.ok) {
      throw new Error('Failed to save best time');
    }

    const data = await res.json();

    console.log('✅ Best time response:', data);

    if (data.success && data.best_time_seconds != null) {

      setIsNewBest(data.is_new_best);

      setBestTimeSec(parseFloat(data.best_time_seconds));

      setLastTimeSec(parseFloat(data.last_time_seconds));

      if (data.is_new_best) {
        console.log(`🏆 New best time: ${data.best_time_seconds}s`);
      } else {
        console.log(`📊 Current best: ${data.best_time_seconds}s, This time: ${data.last_time_seconds}s`);
      }
    }

    } catch (err) {
      console.error('❌ Error saving game result:', err);
    }

    // ตั้ง endTime หลังสุด เพื่อให้ dialog แสดง
    setEndTime(finishTime);
  };

  // แปลง ms elapsed → "5.8" หรือ "1:05.2"
  const fmtElapsed = (ms: number): string => {
    const sec = ms / 1000;
    const min = Math.floor(sec / 60);
    const s   = sec % 60;
    if (min > 0) return `${min}:${Math.floor(s).toString().padStart(2, '0')}.${Math.floor((s % 1) * 10)}`;
    return (Math.round(sec * 10) / 10).toFixed(1);
  };

  // แปลง decimal seconds → "5.8" หรือ "1:05.2"
  const fmtSec = (sec: number): string => {
    const min = Math.floor(sec / 60);
    const s   = sec % 60;
    if (min > 0) return `${min}:${Math.floor(s).toString().padStart(2, '0')}.${Math.floor((s % 1) * 10)}`;
    return sec.toFixed(1);
  };

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-[#7A3689] mb-4" />
        <p className="text-gray-700 text-lg">กำลังโหลด...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">เกิดข้อผิดพลาด</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <button onClick={() => router.push('/')} className="px-6 py-3 bg-[#7A3689] text-white rounded-xl hover:bg-[#9D5CB5] font-medium">
          กลับหน้าแรก
        </button>
      </div>
    </div>
  );

  const totalPairs = gameCards.length / 2;
  const elapsed = endTime ? endTime - (startTimeRef.current || 0) : currentTime;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-6xl mx-auto">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <button onClick={() => { saveMidGame(); router.push('/'); }}
              className="text-[#7A3689] hover:text-[#9D5CB5] font-medium mb-1 flex items-center gap-1 text-sm">
              ← กลับหน้าแรก
            </button>
            <h1 className="text-2xl font-bold text-gray-800">{deck?.title}</h1>
            <p className="text-gray-600">จับคู่: {matchedPairs} / {totalPairs}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">เวลา</p>
            {/* แสดง elapsed ms แบบ live ระหว่างเล่น */}
            <p className="text-4xl font-bold text-[#7A3689]">{fmtElapsed(elapsed)}</p>
            {bestTimeSec != null && !endTime && (
              <p className="text-sm text-gray-500 mt-1">🏆 สถิติ: {fmtSec(bestTimeSec)}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {gameCards.map(card => (
            <button key={card.id} onClick={() => handleCardClick(card.id)} disabled={card.matched}
              className={`aspect-square p-4 rounded-xl font-semibold text-lg shadow-lg transition-all duration-300 transform
                ${card.matched ? 'bg-green-400 text-white scale-95 opacity-50 cursor-not-allowed'
                  : card.selected ? 'bg-[#7A3689] text-white scale-105 shadow-2xl'
                  : 'bg-white text-gray-800 hover:scale-105 hover:shadow-xl cursor-pointer'}
                flex items-center justify-center text-center`}>
              <span className="line-clamp-3">{card.content}</span>
            </button>
          ))}
        </div>

        {endTime && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
              <div className="text-6xl mb-4">{isNewBest ? '🏆' : '🎉'}</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-1">
                {isNewBest ? 'สถิติใหม่!' : 'เยี่ยมมาก!'}
              </h2>

              <div className="my-5">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">เวลาที่ทำได้</p>
                <p className="text-5xl font-bold text-[#7A3689]">
                  {lastTimeSec != null ? fmtSec(lastTimeSec) : fmtElapsed(elapsed)}
                </p>
              </div>

              {bestTimeSec != null && (
                <div className={`rounded-xl p-4 mb-6 ${isNewBest
                  ? 'bg-yellow-50 border-2 border-yellow-300'
                  : 'bg-[#F0E4FF] border-2 border-[#E3DAFF]'}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className={`text-xs mb-1 ${isNewBest ? 'text-yellow-700' : 'text-[#7A3689]/60'}`}>
                        🏆 สถิติดีสุด
                      </p>
                      <p className={`text-3xl font-bold ${isNewBest ? 'text-yellow-700' : 'text-[#7A3689]'}`}>
                        {fmtSec(bestTimeSec)}
                      </p>
                    </div>
                    {isNewBest && (
                      <div className="text-right">
                        <span className="text-3xl">🎊</span>
                        <p className="text-sm text-yellow-700 font-semibold mt-1">ดีที่สุด!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <button onClick={() => startGame(cardsRef.current)}
                  className="w-full px-8 py-4 bg-[#7A3689] text-white rounded-xl hover:bg-[#9D5CB5] font-bold text-lg shadow-lg transition-all">
                  🔄 เล่นอีกครั้ง
                </button>
                <button onClick={() => router.push('/')}
                  className="w-full px-8 py-4 bg-white text-gray-700 rounded-xl hover:bg-gray-100 font-medium border-2 border-gray-200 transition-all">
                  กลับหน้าแรก
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}