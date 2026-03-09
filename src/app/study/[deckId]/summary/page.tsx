// src/app/study/[deckId]/summary/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import Link from 'next/link';

export default function StudySummaryPage({ params }: { params: { deckId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = params.deckId;

  // ดึงข้อมูลจาก URL parameters ที่ส่งมาจากหน้าเรียน
  const [deckTitle, setDeckTitle] = useState('');
  const [totalCards, setTotalCards] = useState(0);
  const [knownCards, setKnownCards] = useState(0);
  const [unknownCards, setUnknownCards] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [animatedAccuracy, setAnimatedAccuracy] = useState(0);

  useEffect(() => {
    // ดึงข้อมูลจาก URL parameters
    const title = searchParams.get('title') || 'ไม่ทราบชื่อชุด';
    const total = parseInt(searchParams.get('total') || '0');
    const known = parseInt(searchParams.get('known') || '0');
    const unknown = parseInt(searchParams.get('unknown') || '0');

    setDeckTitle(title);
    setTotalCards(total);
    setKnownCards(known);
    setUnknownCards(unknown);

    // คำนวณเปอร์เซ็นต์ความแม่นยำ
    const accuracyPercent = total > 0 ? Math.round((known / total) * 100) : 0;
    setAccuracy(accuracyPercent);

    // บันทึกประวัติการเรียนลงฐานข้อมูล
    saveStudyHistory(parseInt(deckId), total, known, unknown);

    // Animate เปอร์เซ็นต์จาก 0 ไปยังค่าจริง
    let currentPercent = 0;
    const targetPercent = accuracyPercent;
    const increment = targetPercent / 50; // แบ่งเป็น 50 steps

    const interval = setInterval(() => {
      currentPercent += increment;
      if (currentPercent >= targetPercent) {
        currentPercent = targetPercent;
        clearInterval(interval);
      }
      setAnimatedAccuracy(Math.round(currentPercent));
    }, 20); // อัพเดททุก 20ms

    return () => clearInterval(interval);
  }, [searchParams, deckId]);

  const saveStudyHistory = async (
    deckId: number,
    total: number,
    known: number,
    unknown: number
  ) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await fetch('/api/study-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deck_id: deckId,
          total_cards: total,
          known_cards: known,
          unknown_cards: unknown,
        }),
      });
    } catch (error) {
      console.error('Error saving study history:', error);
    }
  };

  // คำนวณมุมสำหรับวงกลม SVG (360 องศา = 100%)
  const circumference = 2 * Math.PI * 80; // รัศมี 80
  const progressOffset = circumference - (animatedAccuracy / 100) * circumference;

  // กำหนดสีตามเปอร์เซ็นต์
  const getColorByAccuracy = (percent: number) => {
    if (percent >= 80) return '#10B981'; // สีเขียว
    if (percent >= 60) return '#F59E0B'; // สีส้ม
    return '#EF4444'; // สีแดง
  };

  const getMessage = (percent: number) => {
    if (percent >= 90) return 'ยอดเยี่ยม! 🎉';
    if (percent >= 80) return 'ดีมาก! 🌟';
    if (percent >= 70) return 'ดี! 👍';
    if (percent >= 60) return 'พอใช้ 💪';
    return 'ลองอีกครั้งนะ 📚';
  };

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />
      
      <div className="flex-1 ml-64 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-[#7A3689] mb-4">
              เรียนจบแล้ว! 🎓
            </h1>
            <p className="text-xl text-[#7A3689] text-opacity-70">
              {deckTitle}
            </p>
          </div>

          {/* วงกลมแสดงเปอร์เซ็นต์ */}
          <div className="flex justify-center mb-12">
            <div className="relative">
              <svg width="240" height="240" className="transform -rotate-90">
                {/* วงกลมพื้นหลัง */}
                <circle
                  cx="120"
                  cy="120"
                  r="80"
                  stroke="#E3DAFF"
                  strokeWidth="20"
                  fill="none"
                />
                {/* วงกลมความคืบหน้า */}
                <circle
                  cx="120"
                  cy="120"
                  r="80"
                  stroke={getColorByAccuracy(accuracy)}
                  strokeWidth="20"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={progressOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              {/* ตัวเลขเปอร์เซ็นต์ตรงกลาง */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl font-bold text-[#7A3689] mb-2">
                    {animatedAccuracy}%
                  </div>
                  <div className="text-lg font-medium" style={{ color: getColorByAccuracy(accuracy) }}>
                    {getMessage(accuracy)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* สถิติรายละเอียด */}
          <div className="grid grid-cols-3 gap-6 mb-12">
            <div className="bg-[#F0E4FF] rounded-3xl p-6 text-center">
              <div className="text-4xl mb-2">📝</div>
              <div className="text-3xl font-bold text-[#7A3689] mb-1">
                {totalCards}
              </div>
              <div className="text-sm text-[#7A3689] text-opacity-70">
                การ์ดทั้งหมด
              </div>
            </div>

            <div className="bg-[#F0E4FF] rounded-3xl p-6 text-center">
              <div className="text-4xl mb-2">✅</div>
              <div className="text-3xl font-bold text-green-600 mb-1">
                {knownCards}
              </div>
              <div className="text-sm text-[#7A3689] text-opacity-70">
                รู้แล้ว
              </div>
            </div>

            <div className="bg-[#F0E4FF] rounded-3xl p-6 text-center">
              <div className="text-4xl mb-2">❌</div>
              <div className="text-3xl font-bold text-red-600 mb-1">
                {unknownCards}
              </div>
              <div className="text-sm text-[#7A3689] text-opacity-70">
                ยังไม่รู้
              </div>
            </div>
          </div>

          {/* ปุ่มดำเนินการ */}
          <div className="grid grid-cols-3 gap-4">
            <Link
              href={`/study/${deckId}`}
              className="px-6 py-4 bg-[#7A3689] text-white rounded-full hover:bg-opacity-90 transition-all font-medium text-center"
            >
              🔄 เรียนอีกครั้ง
            </Link>
            <Link
              href={`/game/${deckId}`}
              className="px-6 py-4 bg-black text-white rounded-full hover:bg-gray-800 transition-all font-medium text-center"
            >
              🎮 เล่นเกม
            </Link>
            <Link
              href="/"
              className="px-6 py-4 bg-[#F0E4FF] text-[#7A3689] rounded-full hover:bg-[#E3DAFF] transition-all font-medium text-center"
            >
              🏠 กลับไปยังHome
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}