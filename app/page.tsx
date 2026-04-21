'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createStudy, Study } from '../lib/types';
import { addStudy, deleteStudy, loadStudies } from '../lib/storage';

const HomePage = () => {
  const [studies, setStudies] = useState<Study[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const loaded = await loadStudies();
      setStudies(loaded);
    };
    run();
  }, []);

  const handleDeleteStudy = async (id: string) => {
    if (!window.confirm('Delete this study and all its participant data? This cannot be undone.')) return;
    const next = await deleteStudy(id);
    setStudies(next);
  };

  const handleAddStudy = async () => {
    if (!name.trim()) {
      setError('Study name is required.');
      return;
    }
    const study = createStudy(name.trim(), description.trim());
    const next = await addStudy(study);
    setStudies(next);
    setName('');
    setDescription('');
    setError(null);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold">Compass Studies</h1>
          <p className="mt-2 text-slate-600">Create concept value tests, run participant sessions, and synthesize responses across studies.</p>

          <div className="mt-6">
            <div className="space-y-4 rounded-2xl bg-slate-50 p-4">
              <label className="block text-sm font-medium text-slate-700">Study name</label>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 focus:border-slate-500 focus:outline-none"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Example: Embr adoption study"
              />
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <textarea
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 focus:border-slate-500 focus:outline-none"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Optional study purpose or scope"
              />
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              <button
                type="button"
                onClick={handleAddStudy}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                New Study
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Your studies</h2>
            <button
              type="button"
              onClick={async () => setStudies(await loadStudies())}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {studies.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">No studies yet. Start by creating one.</div>
            ) : (
              studies.map((study) => (
                <article key={study.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-slate-900">{study.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{study.description || 'No description yet.'}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm">
                    <Link href={`/study/${study.id}/setup`} className="rounded-2xl bg-slate-900 px-3 py-2 text-white hover:bg-slate-700">
                      Setup
                    </Link>
                    <Link href={`/study/${study.id}/participant/new`} className="rounded-2xl border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">
                      New participant
                    </Link>
                    <Link href={`/study/${study.id}/synthesis`} className="rounded-2xl border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">
                      Synthesis
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleDeleteStudy(study.id)}
                      className="rounded-2xl border border-rose-200 px-3 py-2 text-rose-600 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default HomePage;
