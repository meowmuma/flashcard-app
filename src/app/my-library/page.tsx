"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar"; // ดึง Sidebar มาใช้
import { Deck, DecksResponse } from "../types";

export default function MyLibraryPage(): JSX.Element {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchDecks();
  }, [router]);

  const fetchDecks = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/decks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: DecksResponse = await response.json();
      if (response.ok) setDecks(data.decks);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบชุด "${title}"?`)) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/decks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setDecks((prevDecks) => prevDecks.filter((d) => d.id !== id));
      } else {
        alert("ไม่สามารถลบข้อมูลได้");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  const handleEdit = (deck: Deck) => {
    localStorage.setItem("editingDeck", JSON.stringify({ deck, cards: [] }));
    router.push(`/create-deck?edit=${deck.id}`);
  };

  const filteredDecks = decks.filter((d) =>
    d.title.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-white font-sans text-gray-800">
      {/* 👈 แถบด้านซ้าย */}
      <Sidebar />

      {/* 👉 เนื้อหาด้านขวา */}
      <main className="flex-1 p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          
          {/* 🔍 Search Bar */}
          <div className="relative w-full">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-4 pl-14 pr-6 rounded-[25px] border-none outline-none bg-[#F8F6FA] text-gray-600 shadow-sm transition-all focus:ring-2 focus:ring-purple-200"
            />
          </div>

          {/* 📂 Header */}
          <div className="flex items-center gap-3">
            <span className="text-[32px]">📁</span>
            <h1 className="text-[32px] font-normal text-[#1A202C] tracking-wide">
              My Libary
            </h1>
          </div>

          {/* 📋 รายการ Deck */}
          <div className="flex flex-col gap-6">
            {isLoading ? (
              <p className="text-center text-gray-400 py-10">กำลังโหลดข้อมูล...</p>
            ) : filteredDecks.length === 0 ? (
              <div className="text-center py-20 text-gray-400 font-medium bg-[#FAFAFD] rounded-[15px] border border-gray-100 shadow-sm">
                ไม่พบข้อมูลชุดคำศัพท์
              </div>
            ) : (
              filteredDecks.map((deck) => (
                <div
                  key={deck.id}
                  className="bg-[#FAFAFD] rounded-[15px] p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col gap-5"
                >
                  {/* ข้อมูลชุดคำศัพท์ */}
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-bold text-[#1A202C]">
                      {deck.title}
                    </h3>
                    <div className="flex items-center gap-4 text-[13px] text-gray-500 font-medium">
                      <span>
                        จำนวนคำ {deck.card_count || 0}/5
                      </span>
                      <span className="flex items-center gap-1.5">
                        {deck.is_public ? (
                          <span className="text-blue-500">🌐</span>
                        ) : (
                          <span className="text-orange-400">🔒</span>
                        )}
                        {deck.is_public ? "Public" : "Private"}
                      </span>
                    </div>
                  </div>

                  {/* ปุ่มกด ซ้าย-ขวา */}
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex gap-4">
                      {/* ปุ่มแก้ไข สีดำ/เทาเข้ม */}
                      <button
                        onClick={() => handleEdit(deck)}
                        className="px-8 py-2.5 bg-[#333333] text-white rounded-[8px] text-[13px] font-medium hover:bg-black transition-all"
                      >
                        แก้ไข
                      </button>
                      {/* ปุ่มลบ สีแดง */}
                      <button
                        onClick={() => handleDelete(deck.id, deck.title)}
                        className="px-8 py-2.5 bg-[#CC3333] text-white rounded-[8px] text-[13px] font-medium hover:bg-red-800 transition-all"
                      >
                        ลบ
                      </button>
                    </div>

                    {/* ปุ่มเริ่ม สีเขียว */}
                    <button
                      onClick={() => router.push(`/study/${deck.id}`)}
                      className="px-10 py-2.5 bg-[#00A859] text-white rounded-[8px] text-[14px] font-medium shadow-sm hover:bg-[#008f4c] transition-all"
                    >
                      เริ่ม
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}