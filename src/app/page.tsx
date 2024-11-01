//page.tsx
'use client';
import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  type Format = 'video' | 'audio'; // Define el tipo
  const [format, setFormat] = useState<Format>('video');
  // Mapa de formatos
  const formatMap = {
    video: 'bestvideo+bestaudio/best', // Para video
    audio: 'bestaudio' // Para audio
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Usamos el formato mapeado
      const response = await fetch(`/api/download?url=${encodeURIComponent(url)}&format=${formatMap[format]}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `download.${format === 'audio' ? 'mp3' : 'mp4'}`;
        link.click();
        URL.revokeObjectURL(downloadUrl);
      } else {
        alert('Error al descargar el archivo. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error en la descarga:', error);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1>Descarga de videos</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Ingresa la URL del video"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="p-2 border border-gray-300 rounded bg-slate-200 dark:bg-gray-700 dark:text-white"
          />
          <div className="flex gap-4">
            <label>
              <input
                type="radio"
                value="video"
                checked={format === 'video'}
                onChange={() => setFormat('video')}
              />
              Video
            </label>
            <label>
              <input
                type="radio"
                value="audio"
                checked={format === 'audio'}
                onChange={() => setFormat('audio')}
              />
              Audio
            </label>
          </div>
          <button type="submit" className="p-2 bg-blue-500 text-white rounded">
            Descargar
          </button>
        </form>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href=""
        >
          Foo
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href=""
        >
          →
        </a>
      </footer>
    </div>
  );
}
