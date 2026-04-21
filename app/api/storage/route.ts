import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { CompassStorage } from '../../../lib/types';

const DEFAULT_STORAGE: CompassStorage = {
  version: 1,
  studies: [],
};

const parseStorage = (value: string): CompassStorage => {
  try {
    const parsed = JSON.parse(value) as CompassStorage;
    if (parsed.version === 1 && Array.isArray(parsed.studies)) {
      return parsed;
    }
    return DEFAULT_STORAGE;
  } catch {
    return DEFAULT_STORAGE;
  }
};

const getState = async (): Promise<CompassStorage> => {
  const row = await prisma.appState.findUnique({ where: { id: 1 } });
  if (!row) {
    await prisma.appState.create({
      data: {
        id: 1,
        storage: JSON.stringify(DEFAULT_STORAGE),
      },
    });
    return DEFAULT_STORAGE;
  }
  return parseStorage(row.storage);
};

export async function GET() {
  try {
    const storage = await getState();
    return NextResponse.json(storage);
  } catch {
    return NextResponse.json(
      { message: 'Failed to load storage.' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as CompassStorage;
    const nextStorage: CompassStorage =
      body?.version === 1 && Array.isArray(body.studies)
        ? body
        : DEFAULT_STORAGE;

    await prisma.appState.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        storage: JSON.stringify(nextStorage),
      },
      update: {
        storage: JSON.stringify(nextStorage),
      },
    });

    return NextResponse.json(nextStorage);
  } catch {
    return NextResponse.json(
      { message: 'Failed to save storage.' },
      { status: 500 },
    );
  }
}
