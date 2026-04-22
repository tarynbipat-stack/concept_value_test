import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { SlideAsset } from '../../../lib/types';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.ppt', '.pptx', '.pdf']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '-');

export async function POST(request: Request) {
  try {
    if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { message: 'BLOB_READ_WRITE_TOKEN is missing in Vercel environment variables.' },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const uploaded = formData.get('file');

    if (!(uploaded instanceof File)) {
      return NextResponse.json({ message: 'No file uploaded.' }, { status: 400 });
    }

    if (uploaded.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: 'File is too large. Maximum size is 25MB.' }, { status: 400 });
    }

    const extension = path.extname(uploaded.name.trim()).toLowerCase();
    const mimeType = uploaded.type.toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension) && !ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json({ message: 'Only PPT, PPTX, and PDF files are supported.' }, { status: 400 });
    }

    const bytes = Buffer.from(await uploaded.arrayBuffer());
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fileName = `${id}-${sanitizeName(uploaded.name)}`;

    let url: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`uploads/${fileName}`, bytes, {
        access: 'public',
        contentType: uploaded.type || undefined,
        addRandomSuffix: false,
      });
      url = blob.url;
    } else {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      const filePath = path.join(uploadsDir, fileName);
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(filePath, bytes);
      url = `/uploads/${fileName}`;
    }

    const asset: SlideAsset = {
      id,
      name: uploaded.name,
      url,
      mimeType: uploaded.type || 'application/octet-stream',
      size: uploaded.size,
      selectedSlides: '',
      uploadedAt: new Date().toISOString(),
    };

    return NextResponse.json(asset);
  } catch (error) {
    if (error instanceof Error && /EROFS|EACCES/i.test(error.message)) {
      return NextResponse.json(
        { message: 'Upload storage is not configured for this environment. Configure Vercel Blob and set BLOB_READ_WRITE_TOKEN.' },
        { status: 500 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ message: `Failed to upload file: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: 'Failed to upload file.' }, { status: 500 });
  }
}
