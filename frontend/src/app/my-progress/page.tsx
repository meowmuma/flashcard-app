// src/app/my-progress/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';

interface ProgressData {
  id: number;
  deck_id: number;
  deck_title: string;
  session_type: 'study' | 'match';
  total_cards: number;
  known_cards: number;
  unknown_cards: number;
  current_card_index?: number;
  accuracy_percentage?: number;
  time_spent_seconds?: number;
  completed_at?: string;
  updated_at?: string;
  best_time_seconds?: number;
  attempts_count?: number;
  data_type: 'progress' | 'history';
}

export default function MyProgressPage() {
  const router = useRouter();
  const [allData, setAllData] = useState<ProgressData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'flashcards' | 'match'>('flashcards');

  useEffect(() => { fetchAllProgress(); }, []);

  const fetchAllProgress = async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    try {
      const res = await fetch('/api/all-progress', { headers: { Authorization: `Bearer ${token}` } });
      const result = await res.json();
      if (res.ok) setAllData(result.data || []);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  };

  // ✅ FIX: match → /game/[id] ไม่ใช่ /match/[id]
  const goToGame = (deckId: number, sessionType: 'study' | 'match') => {
    router.push(sessionType === 'match' ? `/game/${deckId}` : `/study/${deckId}`);
  };

  const handleRestart = async (deckId: number, sessionType: 'study' | 'match') => {
    const name = sessionType === 'match' ? 'เกม Match' : 'การเรียน Flashcard';
    if (!confirm(`ต้องการเริ่ม${name}ใหม่หรือไม่?\nความคืบหน้าเดิมจะถูกลบ`)) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`/api/study-progress?deck_id=${deckId}&session_type=${sessionType}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      goToGame(deckId, sessionType);
    } catch { alert('เกิดข้อผิดพลาด'); }
  };

  // แปลง seconds (decimal เช่น 9.6) → "9.6 วินาที" หรือ "1:05.2"
  const fmtSec = (val?: number) => {
    if (val == null) return '--';
    const sec = parseFloat(String(val));
    const min = Math.floor(sec / 60);
    const s   = sec % 60;
    if (min > 0) return `${min}:${Math.floor(s).toString().padStart(2,'0')}.${Math.floor((s%1)*10)}`;
    return `${sec.toFixed(1)} วินาที`;
  };

  // แปลง UTC timestamp → relative time
  const fmtDate = (dateStr?: string) => {
    if (!dateStr) return 'ไม่ทราบ';
    const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    const diff = Date.now() - d.getTime();
    if (diff < 0) return 'เมื่อสักครู่';
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1)  return 'เมื่อสักครู่';
    if (mins < 60) return `${mins} นาทีที่แล้ว`;
    if (hrs  < 24) return `${hrs} ชั่วโมงที่แล้ว`;
    if (days < 7)  return `${days} วันที่แล้ว`;
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const flashInProgress = allData.filter(d => d.data_type === 'progress' && d.session_type === 'study');
  const flashCompleted  = allData.filter(d => d.data_type === 'history'  && d.session_type === 'study');
  const matchInProgress = allData.filter(d => d.data_type === 'progress' && d.session_type === 'match');
  const matchCompleted  = allData.filter(d => d.data_type === 'history'  && d.session_type === 'match');

  // ── Section Header ──
  const SectionHeader = ({ emoji, label, count }: { emoji: string; label: string; count: number }) => (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-2xl">{emoji}</span>
      <h2 className="text-xl font-bold text-[#7A3689]">{label} ({count})</h2>
    </div>
  );

  // ── Flashcard กำลังเรียน ──
  const FlashProgressCard = ({ item }: { item: ProgressData }) => {
    const done = item.current_card_index || 0;
    const pct  = item.total_cards > 0 ? Math.round((done / item.total_cards) * 100) : 0;
    return (
      <div className="bg-white border-2 border-[#E3DAFF] rounded-2xl p-6 hover:shadow-md transition-all">
        <h3 className="text-lg font-bold text-[#7A3689] mb-2">{item.deck_title}</h3>
        <div className="flex flex-wrap gap-3 text-sm text-[#7A3689]/70 mb-4">
          <span>📋 {item.total_cards} การ์ด</span>
          <span>✅ รู้ {item.known_cards} คำ</span>
          <span>❌ ยังไม่รู้ {item.unknown_cards} คำ</span>
          <span>🕐 {fmtDate(item.updated_at)}</span>
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-sm font-medium text-[#7A3689] mb-1">
            <span>ความคืบหน้า: {done}/{item.total_cards}</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full h-2.5 bg-[#F0E4FF] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#7A3689] to-[#9D5CB5] rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => goToGame(item.deck_id, 'study')}
            className="flex-1 py-3 bg-gradient-to-r from-[#7A3689] to-[#9D5CB5] text-white rounded-xl font-medium hover:shadow-lg transition-all">
            ▶️ ทำต่อ
          </button>
          <button onClick={() => handleRestart(item.deck_id, 'study')}
            className="px-5 py-3 bg-[#F0E4FF] text-[#7A3689] rounded-xl font-medium hover:bg-[#E3DAFF] transition-all">
            🔄 เริ่มใหม่
          </button>
        </div>
      </div>
    );
  };

  // ── Flashcard เสร็จสิ้น ──
  const FlashCompletedCard = ({ item }: { item: ProgressData }) => {
    const acc = item.accuracy_percentage || 0;
    const color = acc >= 80 ? 'text-green-600' : acc >= 60 ? 'text-orange-500' : 'text-red-500';
    const bar   = acc >= 80 ? 'from-green-400 to-green-500' : acc >= 60 ? 'from-orange-400 to-orange-500' : 'from-red-400 to-red-500';
    return (
      <div className="bg-white border-2 border-green-100 rounded-2xl p-6 hover:shadow-md transition-all">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-lg font-bold text-[#7A3689]">{item.deck_title}</h3>
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">✓ เสร็จสิ้น</span>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-[#7A3689]/70 mb-3">
          <span>📋 {item.total_cards} การ์ด</span>
          <span>✅ รู้ {item.known_cards} คำ</span>
          <span>❌ ไม่รู้ {item.unknown_cards} คำ</span>
          <span className={`font-semibold ${color}`}>🎯 {acc}%</span>
          {item.time_spent_seconds && <span>⏱️ {fmtSec(item.time_spent_seconds)}</span>}
        </div>
        <p className="text-xs text-[#7A3689]/40 mb-4">🕐 เสร็จเมื่อ {fmtDate(item.completed_at)}</p>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div className={`h-full bg-gradient-to-r ${bar} rounded-full transition-all`} style={{ width: `${acc}%` }} />
        </div>
        <button onClick={() => goToGame(item.deck_id, 'study')}
          className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:shadow-lg transition-all">
          📖 ทบทวนอีกครั้ง
        </button>
      </div>
    );
  };

  // ── Match กำลังจับคู่ ──
  const MatchProgressCard = ({ item }: { item: ProgressData }) => {
    const done = item.current_card_index || 0;
    const pct  = item.total_cards > 0 ? Math.round((done / item.total_cards) * 100) : 0;
    return (
      <div className="bg-white border-2 border-[#E3DAFF] rounded-2xl p-6 hover:shadow-md transition-all">
        <h3 className="text-lg font-bold text-[#7A3689] mb-2">{item.deck_title}</h3>
        <div className="flex flex-wrap gap-3 text-sm text-[#7A3689]/70 mb-4">
          <span>🎯 จับคู่แล้ว {done}/{item.total_cards} คู่</span>
          <span>🕐 {fmtDate(item.updated_at)}</span>
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-sm font-medium text-[#7A3689] mb-1">
            <span>ความคืบหน้า: {done}/{item.total_cards}</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full h-2.5 bg-[#F0E4FF] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#7A3689] to-[#9D5CB5] rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => goToGame(item.deck_id, 'match')}
            className="flex-1 py-3 bg-gradient-to-r from-[#7A3689] to-[#9D5CB5] text-white rounded-xl font-medium hover:shadow-lg transition-all">
            ▶️ เล่นต่อ
          </button>
          <button onClick={() => handleRestart(item.deck_id, 'match')}
            className="px-5 py-3 bg-[#F0E4FF] text-[#7A3689] rounded-xl font-medium hover:bg-[#E3DAFF] transition-all">
            🔄 เริ่มใหม่
          </button>
        </div>
      </div>
    );
  };

  // ── Match เสร็จสิ้น — สถิติดีสุด + เวลาล่าสุด ──
  const MatchCompletedCard = ({ item }: { item: ProgressData }) => {
    const isBest = item.best_time_seconds != null
      && item.time_spent_seconds != null
      && item.time_spent_seconds <= item.best_time_seconds;
    return (
      <div className="bg-white border-2 border-[#E3DAFF] rounded-2xl p-6 hover:shadow-md transition-all">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-lg font-bold text-[#7A3689]">{item.deck_title}</h3>
              <span className="px-2 py-0.5 bg-[#F0E4FF] text-[#7A3689] rounded-full text-xs font-medium">✓ เสร็จสิ้น</span>
            </div>
            {/* ✅ แสดงจำนวนคำ */}
            <p className="text-sm text-[#7A3689]/70 mb-1">🎯 {item.total_cards} คู่</p>
            <p className="text-xs text-[#7A3689]/40">🕐 เล่นเมื่อ {fmtDate(item.completed_at)}</p>
          </div>

          {/* ✅ สถิติดีสุด + เวลาล่าสุด */}
          <div className="flex gap-5 ml-4 text-right shrink-0">
            {item.best_time_seconds != null && (
              <div>
                <p className="text-xs text-[#7A3689]/50 mb-0.5">🏆 สถิติดีสุด</p>
                <p className="text-2xl font-bold text-[#7A3689]">{fmtSec(item.best_time_seconds)}</p>
              </div>
            )}
            {item.time_spent_seconds != null && (
              <div>
                <p className="text-xs text-[#7A3689]/50 mb-0.5">⏱️ เวลาล่าสุด</p>
                <p className={`text-2xl font-bold ${isBest ? 'text-green-600' : 'text-[#9D5CB5]'}`}>
                  {fmtSec(item.time_spent_seconds)}
                </p>
                {isBest && <p className="text-xs text-green-500">🎉 สถิติใหม่!</p>}
              </div>
            )}
          </div>
        </div>

        <button onClick={() => goToGame(item.deck_id, 'match')}
          className="w-full py-3 bg-gradient-to-r from-[#7A3689] to-[#9D5CB5] text-white rounded-xl font-medium hover:shadow-lg transition-all">
          🎮 เล่นอีกครั้ง
        </button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-14 w-14 border-4 border-[#E3DAFF] border-t-[#7A3689]" />
            <p className="mt-4 text-[#7A3689] font-medium">กำลังโหลด...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-[#7A3689] mb-8">My Progress</h1>

          {/* Summary */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'ทั้งหมด',   value: allData.length,                                   bg: 'bg-blue-50   border-blue-200',   text: 'text-blue-700'   },
              { label: 'Flashcards', value: flashInProgress.length + flashCompleted.length,   bg: 'bg-purple-50 border-purple-200', text: 'text-[#7A3689]'  },
              { label: 'Match',      value: matchInProgress.length + matchCompleted.length,   bg: 'bg-pink-50   border-pink-200',   text: 'text-pink-700'   },
              { label: 'เสร็จสิ้น', value: flashCompleted.length + matchCompleted.length,    bg: 'bg-green-50  border-green-200',  text: 'text-green-700'  },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border-2 rounded-2xl p-5 text-center`}>
                <p className={`text-sm font-medium mb-1 ${s.text}`}>{s.label}</p>
                <p className={`text-3xl font-bold ${s.text}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-3 mb-8">
            {(['flashcards', 'match'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 rounded-2xl font-bold text-base transition-all ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-[#7A3689] to-[#9D5CB5] text-white shadow-lg scale-[1.01]'
                    : 'bg-[#F0E4FF] text-[#7A3689] hover:bg-[#E3DAFF]'
                }`}>
                {tab === 'flashcards'
                  ? `📚 Flashcards (${flashInProgress.length + flashCompleted.length})`
                  : `🎮 Match Game (${matchInProgress.length + matchCompleted.length})`}
              </button>
            ))}
          </div>

          {/* ── Flashcards Tab ── */}
          {activeTab === 'flashcards' && (
            <div className="space-y-10">
              {flashInProgress.length > 0 && (
                <section>
                  <SectionHeader emoji="⏳" label="กำลังเรียน" count={flashInProgress.length} />
                  <div className="space-y-4">{flashInProgress.map(i => <FlashProgressCard key={i.id} item={i} />)}</div>
                </section>
              )}
              {flashCompleted.length > 0 && (
                <section>
                  <SectionHeader emoji="✅" label="เสร็จสิ้นแล้ว" count={flashCompleted.length} />
                  <div className="space-y-4">{flashCompleted.map(i => <FlashCompletedCard key={i.id} item={i} />)}</div>
                </section>
              )}
              {flashInProgress.length === 0 && flashCompleted.length === 0 && (
                <div className="text-center py-20 bg-[#F0E4FF] rounded-3xl">
                  <div className="text-6xl mb-3">📚</div>
                  <p className="text-lg font-bold text-[#7A3689]">ยังไม่มีประวัติ Flashcards</p>
                  <p className="text-[#7A3689]/60 mt-1">เริ่มเรียนชุดการ์ดเพื่อบันทึกความคืบหน้า</p>
                </div>
              )}
            </div>
          )}

          {/* ── Match Tab ── */}
          {activeTab === 'match' && (
            <div className="space-y-10">
              {/* ✅ ส่วน "กำลังจับคู่" */}
              {matchInProgress.length > 0 && (
                <section>
                  <SectionHeader emoji="⏳" label="กำลังจับคู่" count={matchInProgress.length} />
                  <div className="space-y-4">{matchInProgress.map(i => <MatchProgressCard key={i.id} item={i} />)}</div>
                </section>
              )}
              {matchCompleted.length > 0 && (
                <section>
                  <SectionHeader emoji="✅" label="เสร็จสิ้นแล้ว" count={matchCompleted.length} />
                  <div className="space-y-4">{matchCompleted.map(i => <MatchCompletedCard key={i.id} item={i} />)}</div>
                </section>
              )}
              {matchInProgress.length === 0 && matchCompleted.length === 0 && (
                <div className="text-center py-20 bg-[#F0E4FF] rounded-3xl">
                  <div className="text-6xl mb-3">🎮</div>
                  <p className="text-lg font-bold text-[#7A3689]">ยังไม่มีประวัติ Match Game</p>
                  <p className="text-[#7A3689]/60 mt-1">เล่นเกมเพื่อบันทึกสถิติ</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}