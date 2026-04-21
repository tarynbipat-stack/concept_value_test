"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { findStudy } from '../../../lib/storage';

const StudyLayout = ({ children }: { children: React.ReactNode }) => {
  const params = useParams<{ id: string }>();
  const [studyName, setStudyName] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      const found = await findStudy(params.id);
      setStudyName(found?.name ?? 'Untitled Study');
    };
    run();
  }, [params.id]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Study workspace</p>
              <h1 className="mt-2 text-3xl font-semibold">{studyName || 'Loading study...'}</h1>
            </div>
            <nav className="flex flex-wrap gap-2">
              <Link href="/" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                Home
              </Link>
              <Link href={`/study/${params.id}/setup`} className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
                Setup
              </Link>
              <Link href={`/study/${params.id}/participant/new`} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                New participant
              </Link>
              <Link href={`/study/${params.id}/participants`} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Participants
              </Link>
              <Link href={`/study/${params.id}/synthesis`} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Synthesis
              </Link>
            </nav>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

export default StudyLayout;
