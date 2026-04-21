'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { findStudy, updateStudy } from '../../../lib/storage';
import { Study } from '../../../lib/types';

const StudyHome = () => {
  const params = useParams<{ id: string }>();
  const [study, setStudy] = useState<Study | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      const found = await findStudy(params.id);
      setStudy(found ?? null);
    };
    run();
  }, [params.id]);

  const saveName = async () => {
    if (!study || !nameInput.trim()) return;
    setSaving(true);
    const updated: Study = { ...study, name: nameInput.trim(), updatedAt: new Date().toISOString() };
    await updateStudy(updated);
    setStudy(updated);
    setEditingName(false);
    setSaving(false);
  };

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {study ? (
          <>
            <div className="flex items-center gap-3">
              {editingName ? (
                <>
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void saveName(); if (e.key === 'Escape') setEditingName(false); }}
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-2xl font-semibold focus:border-slate-500 focus:outline-none"
                    autoFocus
                  />
                  <button type="button" onClick={() => void saveName()} disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setEditingName(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-semibold">{study.name}</h2>
                  <button
                    type="button"
                    onClick={() => { setNameInput(study.name); setEditingName(true); }}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                  >
                    Rename
                  </button>
                </>
              )}
            </div>
            <p className="mt-2 text-slate-600">{study.description || 'No description has been added yet.'}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <Link href={`/study/${study.id}/setup`} className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-700">
                Continue setup
              </Link>
              <Link href={`/study/${study.id}/participant/new`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 hover:bg-slate-50">
                Add participant
              </Link>
              <Link href={`/study/${study.id}/participants`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 hover:bg-slate-50">
                Review participants
              </Link>
              <Link href={`/study/${study.id}/synthesis`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 hover:bg-slate-50">
                View synthesis
              </Link>
            </div>
          </>
        ) : (
          <p className="text-slate-600">Study not found. Return to the home page and select a valid study.</p>
        )}
      </section>
    </main>
  );
};

export default StudyHome;
