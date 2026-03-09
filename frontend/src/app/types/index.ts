// src/app/types/index.ts

export interface User {
  id: number;
  name?: string;
  username?: string;
  email: string;
  created_at?: string;
}

export interface Deck {
  id: number;
  user_id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  is_public: boolean;
  share_code?: string | null;
  times_copied?: number;
  original_deck_id?: number | null;
  original_author_id?: number | null;
  created_at: string;
  updated_at: string;
  card_count?: number;
}

export interface Card {
  id?: number;
  deck_id?: number;
  term: string;
  definition: string;
  position?: number;
  created_at?: string;
}

export interface MatchingCard {
  id: string;
  content: string;
  type: 'term' | 'definition';
  pairId: number;
  isMatched: boolean;
  isSelected: boolean;
}

export interface PublicDeckInfo {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  is_public: boolean;
  share_code?: string | null;
  times_copied: number;
  card_count: number;
  author_email: string;
  is_owner?: boolean;
}

export interface DeckProgress {
  deck_id: number;
  title: string;
  total_cards: number;
  known_cards: number;
  unknown_cards: number;
  last_studied?: string;
}

export interface StudySession {
  id: number;
  user_id: number;
  deck_id: number;
  deck_title?: string;
  known_count: number;
  unknown_count: number;
  completed_at: string;
}

export type CardResult = {
  cardId: number;
  isKnown: boolean;
};

export interface AuthResponse {
  user: User;
  token: string;
}

export interface DecksResponse {
  decks: Deck[];
}

export interface DeckDetailResponse {
  deck: Deck;
  cards: Card[];
}

export interface ProgressResponse {
  deckProgress: DeckProgress[];
  recentSessions?: StudySession[];
  totalCards?: number;
  knownCards?: number;
  unknownCards?: number;
}

export interface DeckCardProps {
  deck: Deck;
  onDelete: (deckId: number, deckTitle: string) => void | Promise<void>;
  onEdit: (deckId: number) => void | Promise<void>;
  showActions?: boolean;
}

export interface FlashCardProps {
  card: Card;
  onKnown: (cardId: number) => void;
  onUnknown: (cardId: number) => void;
  showButtons?: boolean;
}

export type SortOption = 'updated' | 'title' | 'cards';
export type FilterOption = 'all' | 'completed' | 'in-progress' | 'not-started';
