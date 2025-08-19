"use client";
import { useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/run', { method: 'POST' });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setResult(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h1 className="text-xl font-semibold">Tag 14 · Kapitel 6</h1>
        <p className="text-gray-600 mt-1">Personenzentrierung</p>
        <div className="mt-4">
          <a href="/tag-14-kapitel-6" className="inline-block bg-sky-600 text-white px-4 py-2 rounded-lg">Zur Übung: Tag 14 · Kapitel 6 · Personenzentrierung</a>
        </div>
      </div>
    </main>
  );
}
