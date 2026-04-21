'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createParticipantSession, Study } from '../../../../../lib/types';
import { findStudy, updateStudy } from '../../../../../lib/storage';

const ParticipantNewPage = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [study, setStudy] = useState<Study | null>(null);
  const [name, setName] = useState('');
  const [currentTool, setCurrentTool] = useState('Embr');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const found = await findStudy(params.id);
      setStudy(found ?? null);
    };
    run();
  }, [params.id]);

  const handleCreate = async () => {
    if (!study) {
      setError('Study not found.');
      return;
    }
    if (!name.trim()) {
      setError('Participant name is required.');
      return;
    }
    const participant = createParticipantSession(
      name.trim(),
      currentTool,
      study.cvtQuestions,
      study.benefits,
      study.limitations,
      study.valueReflectionQuestions,
    );
    const updatedStudy: Study = {
      ...study,
      participants: [...study.participants, participant],
      updatedAt: new Date().toISOString(),
    };
    await updateStudy(updatedStudy);
    router.push(`/study/${study.id}/participant/${participant.id}`);
  };

  if (!study) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Study not found. Return to home and select a valid study.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">New participant</h2>
        <p className="mt-2 text-slate-600">Create a participant session and capture the tool or workflow they use today.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Participant name</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 focus:border-slate-500 focus:outline-none"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter participant name"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Current tool/workflow</span>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 focus:border-slate-500 focus:outline-none"
              value={currentTool}
              onChange={(event) => setCurrentTool(event.target.value)}
            >
              <option value="Current workflow">Current workflow</option>
              <option value="Current workflow + spreadsheets">Current workflow + spreadsheets</option>
              <option value="Another internal tool">Another internal tool</option>
            </select>
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={handleCreate} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700">
            Start session
          </button>
          <button onClick={() => router.push(`/study/${study.id}`)} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Back to study
          </button>
        </div>
      </section>
    </div>
  );
};

export default ParticipantNewPage;
