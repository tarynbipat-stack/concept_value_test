import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { SlideAsset } from '../../../lib/types';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.ppt', '.pptx', '.pdf']);

const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '-');

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const uploaded = formData.get('file');

    if (!(uploaded instanceof File)) {
      return NextResponse.json({ message: 'No file uploaded.' }, { status: 400 });
    }

    if (uploaded.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: 'File is too large.' }, { status: 400 });
    }

    const extension = path.extname(uploaded.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json({ message: 'Only PPT, PPTX, and PDF files are supported.' }, { status: 400 });
    }

    const bytes = Buffer.from(await uploaded.arrayBuffer());
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fileName = `${id}-${sanitizeName(uploaded.name)}`;
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(uploadsDir, fileName);

    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(filePath, bytes);

    const asset: SlideAsset = {
      id,
      name: uploaded.name,
      url: `/uploads/${fileName}`,
      mimeType: uploaded.type || 'application/octet-stream',
      size: uploaded.size,
      selectedSlides: '',
      uploadedAt: new Date().toISOString(),
    };

    return NextResponse.json(asset);
  } catch {
    return NextResponse.json({ message: 'Failed to upload file.' }, { status: 500 });
  }
}
