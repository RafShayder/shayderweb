import { NextResponse } from 'next/server';
import path from 'path';
import { spawn } from 'child_process';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const format = searchParams.get('format') || 'bestvideo+bestaudio/best';

    if (!url) {
        return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    try {
        // Primero obtenemos los metadatos del video
        const infoArgs = [
            url,
            '--dump-json' // Este flag nos permite obtener la información en formato JSON
        ];

        // Nueva ruta al ejecutable en la carpeta `bin`
        const youtubedlPath = path.resolve('bin/yt-dlp.exe');
        const infoProcess = spawn(youtubedlPath, infoArgs);

        let metadata: string = '';

        // Recopilar los metadatos del stdout
        infoProcess.stdout.on('data', (chunk) => {
            metadata += chunk.toString();
        });

        // Esperar a que el proceso termine
        await new Promise((resolve, reject) => {
            infoProcess.on('close', resolve);
            infoProcess.on('error', reject);
        });

        // Parsear los metadatos obtenidos
        const videoInfo = JSON.parse(metadata);
        const title = videoInfo.title || 'video';
        const fileName = `${title}.${format === 'bestaudio' ? 'mp3' : 'mp4'}`;

        // Opciones para ejecutar yt-dlp y descargar el video
        const downloadArgs = [
            url,
            '-f', format,
            '-o', '-',
            '--no-check-certificate',
            '--prefer-free-formats'
        ];

        const downloadProcess = spawn(youtubedlPath, downloadArgs);
        const stream = downloadProcess.stdout;

        // Crear un ReadableStream para enviar los datos al frontend
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
