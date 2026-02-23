'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { DeckProgress, StudySession, ProgressResponse } from '../types';

export default function MyProgressPage(): JSX.Element {
  const router = useRouter();

  const [deckProgress, setDeckProgress] = useState<DeckProgress[]>([]);
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalCards: 0,
    knownCards: 0,
    unknownCards: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchProgress();
  }, [router]);

  const fetchProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/progress', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json: any = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || 'ไม่สามารถโหลดข้อมูลได้');
      }

      const data: ProgressResponse = json;

      setDeckProgress(data.deckProgress);
      setRecentSessions(data.recentSessions || []);
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

  const calculateProgress = (deck: DeckProgress) => {
    if (deck.total_cards === 0) return 0;
    return Math.round((deck.known_cards / deck.total_cards) * 100);
  };

  const overallProgress =
    totalStats.totalCards > 0
      ? Math.round(
          (totalStats.knownCards / totalStats.totalCards) * 100
        )
      : 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 flex justify-center px-6 py-12">
        <div className="w-full max-w-xl space-y-10">

          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-gray-900">
              Progress
            </h1>
            <p className="text-sm text-gray-400">
              ติดตามความคืบหน้าการเรียนรู้
            </p>
          </div>

          {isLoading && (
            <div className="text-sm text-gray-400">
              กำลังโหลด...
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500">
              {error}
            </div>
          )}

          {!isLoading && !error && (
            <>
              {/* Overall */}
              <section className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Overall
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {overallProgress}%
                  </span>
                </div>

                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-900 transition-all duration-500"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 text-center text-sm pt-2">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {totalStats.totalCards}
                    </div>
                    <div className="text-gray-400">
                      ทั้งหมด
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {totalStats.knownCards}
                    </div>
                    <div className="text-gray-400">
                      จำได้
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {totalStats.unknownCards}
                    </div>
                    <div className="text-gray-400">
                      ยังไม่จำ
                    </div>
                  </div>
                </div>
              </section>

              {/* Decks */}
              <section className="space-y-4">
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Decks
                </h2>

                {deckProgress.length === 0 ? (
                  <div className="text-sm text-gray-400">
                    ยังไม่มีข้อมูล
                  </div>
                ) : (
                  deckProgress.map((deck) => {
                    const progress = calculateProgress(deck);

                    return (
                      <div
                        key={deck.deck_id}
                        onClick={() =>
                          router.push(`/study/${deck.deck_id}`)
                        }
                        className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition cursor-pointer space-y-3"
                      >
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-900">
                            {deck.title}
                          </span>
                          <span className="text-gray-400">
                            {progress}%
                          </span>
                        </div>

                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-900 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </section>

              {/* Recent */}
              {recentSessions.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    Recent
                  </h2>

                  <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                    {recentSessions.map((session) => {
                      const totalAnswered =
                        session.known_count +
                        session.unknown_count;

                      const successRate =
                        totalAnswered > 0
                          ? Math.round(
                              (session.known_count /
                                totalAnswered) *
                                100
                            )
                          : 0;

                      return (
                        <div
                          key={session.id}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-gray-800">
                            {session.deck_title}
                          </span>
                          <span className="text-gray-400">
                            {successRate}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}