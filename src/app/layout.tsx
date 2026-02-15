// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JAMMAN - Flashcard Learning App',
  description: 'เรียนรู้คำศัพท์ด้วย Flashcard อย่างมีประสิทธิภาพ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}