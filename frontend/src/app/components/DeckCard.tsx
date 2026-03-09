// src/components/DeckCard.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Deck } from '../types';

// Interface สำหรับ props ของ DeckCard
// เรากำหนดว่า callback functions รับ parameter อะไรและคืนค่าแบบไหน
interface DeckCardProps {
  deck: Deck;
  onDelete: (deckId: number, deckTitle: string) => void | Promise<void>;
  onEdit: (deckId: number) => void | Promise<void>;
  showActions?: boolean; // optional prop - ถ้าไม่ส่งมาจะเป็น undefined
}

export default function DeckCard({ 
  deck, 
  onDelete, 
  onEdit,
  showActions = true // default value ถ้าไม่ได้ส่งมา
}: DeckCardProps): JSX.Element {
  const router = useRouter();

  // ฟังก์ชันไปหน้า study
  // กำหนด return type เป็น void เพราะไม่คืนค่าอะไร
  const handleStudy = (): void => {
    router.push(`/study/${deck.id}`);
  };

  // ฟังก์ชันจัดรูปแบบวันที่
  // รับ Date string และคืน string ที่จัดรูปแบบแล้ว
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // ดึง username จาก localStorage
  const getUserName = (): string => {
    const email: string = localStorage.getItem('userEmail') || '';
    return email.split('@')[0] || 'Unknown';
  };

  return (
    <div className="deck-card">
      <div className="mb-4">
        <h3 className="deck-card-title">{deck.title}</h3>
        <p className="deck-card-meta">
          ผู้สร้าง: {getUserName()}
        </p>
        <p className="deck-card-meta">
          อัปเดต: {formatDate(deck.updated_at)}
        </p>
        <span className="deck-card-count">
          {deck.card_count || 0} คำ
        </span>
      </div>

      {showActions && (
        <div className="flex gap-3">
          <button
            onClick={handleStudy}
            className="flex-1 btn-success"
          >
            เริ่ม
          </button>
          <button
            onClick={() => onEdit(deck.id)}
            className="px-4 py-2 rounded-lg border-2 hover:bg-yellow-50 transition-all"
            style={{ borderColor: 'var(--border-color)' }}
            title="แก้ไข"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(deck.id, deck.title)}
            className="px-4 py-2 rounded-lg border-2 hover:bg-red-50 transition-all"
            style={{ borderColor: '#FEB2B2', color: '#E53E3E' }}
            title="ลบ"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}