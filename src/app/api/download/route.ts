import { NextResponse } from 'next/server';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';
import https from 'https';
import os from 'os';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const format = searchParams.get('format') || 'bestvideo+bestaudio/best';

    if (!url) {
        return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    // Determinar la ruta de yt-dlp según el sistema operativo
    const isWindows = os.platform() === 'win32';
    const youtubedlPath = path.resolve(isWindows ? 'node_modules/youtube-dl-exec/bin/yt-dlp.exe' : '/tmp/yt-dlp');
    
    // Verificar si yt-dlp ya está en el sistema (solo para Linux)
    if (!isWindows && !fs.existsSync(youtubedlPath)) {
        console.log("Descargando yt-dlp...");

        // Descargar yt-dlp en la carpeta temporal
        const file = fs.createWriteStream(youtubedlPath);
        await new Promise((resolve, reject) => {
            https.get('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp', (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    fs.chmodSync(youtubedlPath, '755'); // Hacer el archivo ejecutable
                    resolve(true);
                });
            }).on('error', (err) => {
                fs.unlinkSync(youtubedlPath);
                reject(err);
            });
        });
    }

    try {
        // Obtener metadatos del video
        const infoArgs = [url, '--dump-json'];
        const infoProcess = spawn(youtubedlPath, infoArgs);

        let metadata = '';
        infoProcess.stdout.on('data', (chunk) => {
            metadata += chunk.toString();
        });

        await new Promise((resolve, reject) => {
            infoProcess.on('close', resolve);
            infoProcess.on('error', reject);
        });

        const videoInfo = JSON.parse(metadata);
        const title = videoInfo.title || 'video';
        const fileName = `${title}.${format === 'bestaudio' ? 'mp3' : 'mp4'}`;

        // Descargar video
        const downloadArgs = [
            url,
            '-f', format,
            '-o', '-',
            '--no-check-certificate',
            '--prefer-free-formats'
        ];

        const downloadProcess = spawn(youtubedlPath, downloadArgs);
        const stream = downloadProcess.stdout;

        return new NextResponse(
            new ReadableStream({
                start(controller) {
                    stream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
                    stream.on('end', () => controller.close());
                    stream.on('error', (error: Error) => controller.error(error));
                }
            }), {
                headers: {
                    'Content-Type': format === 'bestaudio' ? 'audio/mpeg' : 'video/mp4',
                    'Content-Disposition': `attachment; filename="${fileName}"`,
                },
            }
        );
    } catch (error) {
        console.error('Error al procesar la descarga:', error);
        return NextResponse.json({ error: 'Error al procesar la descarga' }, { status: 500 });
    }
}
