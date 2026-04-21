'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { deleteParticipant, findStudy } from '../../../../lib/storage';
import { ParticipantSession, Study } from '../../../../lib/types';

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
};

const completionPercent = (participant: ParticipantSession) => {
  const checks = [
    participant.participantConcept.trim().length > 0,
    participant.participantValues.length > 0,
    participant.likertResponses.length > 0,
    participant.benefitRanking.length > 0,
    participant.limitationRanking.length > 0,
    participant.valueReflectionResponses.some((item) => item.response.trim().length > 0),
  ];

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
};

const ParticipantsPage = () => {
  const params = useParams<{ id: string }>();
  const [study, setStudy] = useState<Study | null>(null);

  useEffect(() => {
    const run = async () => {
      const found = await findStudy(params.id);
      setStudy(found ?? null);
    };
    run();
  }, [params.id]);

  const participants = study?.participants ?? [];

  const handleDeleteParticipant = async (participantId: string) => {
    if (!study) return;
    if (!window.confirm('Delete this participant and all their responses? This cannot be undone.')) return;
    const updated = await deleteParticipant(study.id, participantId);
    if (updated) setStudy(updated);
  };

  const overallAvgLikert = useMemo(() => {
    const allRatings = participants.flatMap((participant) => participant.likertResponses.map((item) => item.rating));
    return average(allRatings);
  }, [participants]);

  if (!study) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Study not found. Return to home and select a valid study.</p>
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Participant responses</h2>
            <p className="mt-2 text-slate-600">Review every participant response and open any session to edit details.</p>
          </div>
          <Link href={`/study/${study.id}/participant/new`} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700">
            Add participant
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Participants</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{participants.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Overall Likert Avg</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{overallAvgLikert.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Sessions with Reflection</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {participants.filter((participant) => participant.valueReflectionResponses.some((item) => item.response.trim())).length}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        {participants.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-slate-600">No participants yet. Add one to start capturing responses.</p>
          </div>
        ) : (
          participants.map((participant) => {
            const avgLikert = average(participant.likertResponses.map((item) => item.rating));
            const reflectedCount = participant.valueReflectionResponses.filter((item) => item.response.trim()).length;

            return (
              <details key={participant.id} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" open>
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{participant.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">Current tool/workflow: {participant.currentTool || 'Not specified'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">Completion {completionPercent(participant)}%</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">Likert avg {avgLikert.toFixed(2)}</span>
                      <Link href={`/study/${study.id}/participant/${participant.id}`} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
                        Edit responses
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleDeleteParticipant(participant.id)}
                        className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </summary>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-sm font-semibold text-slate-900">Participant concept</h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                      {participant.participantConcept.trim() || 'No concept summary captured yet.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-sm font-semibold text-slate-900">Participant values</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {participant.participantValues.length === 0 ? (
                        <p className="text-sm text-slate-600">No participant values captured yet.</p>
                      ) : (
                        participant.participantValues.map((value, index) => (
                          <span key={`${participant.id}-value-${index}`} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700">
                            {value}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-sm font-semibold text-slate-900">Likert responses</h4>
                    <div className="mt-2 space-y-2">
                      {participant.likertResponses.length === 0 ? (
                        <p className="text-sm text-slate-600">No Likert responses yet.</p>
                      ) : (
                        participant.likertResponses.map((response) => (
                          <div key={response.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <p className="text-xs text-slate-700">{response.question}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-900">Score: {response.rating}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-sm font-semibold text-slate-900">Rankings</h4>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-slate-700">Benefits</p>
                        <ol className="mt-1 list-decimal pl-4 text-xs text-slate-700">
                          {participant.benefitRanking.length === 0 ? <li>None</li> : participant.benefitRanking.map((item) => <li key={`${participant.id}-benefit-${item}`}>{item}</li>)}
                        </ol>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-700">Limitations</p>
                        <ol className="mt-1 list-decimal pl-4 text-xs text-slate-700">
                          {participant.limitationRanking.length === 0 ? <li>None</li> : participant.limitationRanking.map((item) => <li key={`${participant.id}-limitation-${item}`}>{item}</li>)}
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-sm font-semibold text-slate-900">Values reflection answers ({reflectedCount}/{participant.valueReflectionResponses.length})</h4>
                  <div className="mt-2 space-y-2">
                    {participant.valueReflectionResponses.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-xs font-medium text-slate-700">{item.prompt}</p>
                        <p className="mt-1 text-sm text-slate-800">{item.response.trim() || 'No response yet.'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            );
          })
        )}
      </section>
    </main>
  );
};

export default ParticipantsPage;
