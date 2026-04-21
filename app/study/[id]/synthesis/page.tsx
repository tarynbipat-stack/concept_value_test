'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { findStudy } from '../../../../lib/storage';
import { Study } from '../../../../lib/types';

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
};

const pct = (value: number, total: number) => {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
};

const normalizeValue = (value: string) => value.trim().toLowerCase();

const SynthesisPage = () => {
  const params = useParams<{ id: string }>();
  const [study, setStudy] = useState<Study | null>(null);

  useEffect(() => {
    const run = async () => {
      const found = await findStudy(params.id);
      setStudy(found ?? null);
    };
    run();
  }, [params.id]);

  const participantCount = study?.participants.length ?? 0;

  const likertSummary = useMemo(() => {
    if (!study) return [];
    return study.cvtQuestions.map((question) => {
      const ratings = study.participants
        .map((participant) => {
          const match = participant.likertResponses.find((response) => response.questionId === question.id)
            ?? participant.likertResponses.find((response) => response.question === question.prompt);
          return match?.rating;
        })
        .filter((rating): rating is number => typeof rating === 'number');
      const counts = [1, 2, 3, 4, 5].map((score) => ({
        score,
        count: ratings.filter((rating) => rating === score).length,
      }));
      return {
        question: question.prompt,
        lowLabel: question.lowLabel,
        highLabel: question.highLabel,
        average: average(ratings),
        counts,
        total: ratings.length,
      };
    });
  }, [study]);

  const benefitRankingSummary = useMemo(() => {
    if (!study) return [];
    return study.benefits
      .map((benefit) => {
        const positions = study.participants
          .map((participant) => participant.benefitRanking.indexOf(benefit))
          .filter((position) => position >= 0)
          .map((position) => position + 1);
        return {
          item: benefit,
          averageRank: average(positions),
          topChoiceCount: positions.filter((position) => position === 1).length,
          coverage: positions.length,
        };
      })
      .sort((left, right) => left.averageRank - right.averageRank);
  }, [study]);

  const limitationRankingSummary = useMemo(() => {
    if (!study) return [];
    return study.limitations
      .map((limitation) => {
        const positions = study.participants
          .map((participant) => participant.limitationRanking.indexOf(limitation))
          .filter((position) => position >= 0)
          .map((position) => position + 1);
        return {
          item: limitation,
          averageRank: average(positions),
          topChoiceCount: positions.filter((position) => position === 1).length,
          coverage: positions.length,
        };
      })
      .sort((left, right) => left.averageRank - right.averageRank);
  }, [study]);

  const overallLikertAverage = useMemo(() => {
    const scores = likertSummary.flatMap((item) => {
      const expanded: number[] = [];
      item.counts.forEach((count) => {
        for (let i = 0; i < count.count; i += 1) {
          expanded.push(count.score);
        }
      });
      return expanded;
    });
    return average(scores);
  }, [likertSummary]);

  const strongestBenefit = benefitRankingSummary[0]?.item ?? 'N/A';

  const participantValueSummary = useMemo(() => {
    if (!study) return [];

    const tally = new Map<string, { label: string; count: number; participants: string[] }>();

    study.participants.forEach((participant) => {
      const seenByParticipant = new Set<string>();
      participant.participantValues.forEach((value) => {
        const normalized = normalizeValue(value);
        if (!normalized || seenByParticipant.has(normalized)) return;
        seenByParticipant.add(normalized);

        const existing = tally.get(normalized);
        if (existing) {
          existing.count += 1;
          existing.participants.push(participant.name);
        } else {
          tally.set(normalized, {
            label: value.trim(),
            count: 1,
            participants: [participant.name],
          });
        }
      });
    });

    return [...tally.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
  }, [study]);

  const conceptValueCoverage = useMemo(() => {
    if (!study) return [];

    return study.conceptValues.map((value) => {
      const normalized = normalizeValue(value);
      const matches = study.participants
        .filter((participant) => participant.participantValues.some((item) => normalizeValue(item) === normalized))
        .map((participant) => participant.name);

      return {
        value,
        count: matches.length,
        participants: matches,
      };
    });
  }, [study]);

  const reflectionSummary = useMemo(() => {
    if (!study) return [];

    const grouped = new Map<string, Array<{ participant: string; response: string }>>();

    study.participants.forEach((participant) => {
      participant.valueReflectionResponses.forEach((item) => {
        const response = item.response.trim();
        if (!response) return;
        const existing = grouped.get(item.prompt) ?? [];
        existing.push({ participant: participant.name, response });
        grouped.set(item.prompt, existing);
      });
    });

    return [...grouped.entries()].map(([prompt, responses]) => ({
      prompt,
      responses,
    }));
  }, [study]);

  const markdown = useMemo(() => {
    if (!study) return '';

    const likertLines = likertSummary
      .map((item) => `- ${item.question}: avg ${item.average.toFixed(2)} (n=${item.total}) | 1=${item.lowLabel}, 5=${item.highLabel}`)
      .join('\n');
    const benefitLines = benefitRankingSummary
      .map((item) => `- ${item.item}: avg rank ${item.averageRank.toFixed(2)}, top choice ${item.topChoiceCount}`)
      .join('\n');
    const limitationLines = limitationRankingSummary
      .map((item) => `- ${item.item}: avg rank ${item.averageRank.toFixed(2)}, top choice ${item.topChoiceCount}`)
      .join('\n');
    const participantValueLines = participantValueSummary
      .map((item) => `- ${item.label}: mentioned by ${item.count} participant(s)`) 
      .join('\n');
    const conceptCoverageLines = conceptValueCoverage
      .map((item) => `- ${item.value}: matched by ${item.count} participant(s)`) 
      .join('\n');
    const reflectionLines = reflectionSummary
      .map((item) => {
        const answers = item.responses
          .map((response) => `  - ${response.participant}: ${response.response}`)
          .join('\n');
        return `- ${item.prompt}\n${answers}`;
      })
      .join('\n');

    return `# Study Summary: ${study.name}\n\n${study.description || 'No description provided.'}\n\n## Snapshot\n- Participants: ${participantCount}\n- Overall Likert average: ${overallLikertAverage.toFixed(2)}\n- Most prioritized benefit: ${strongestBenefit}\n\n## Likert scores\n${likertLines}\n\n## Benefit ranking\n${benefitLines}\n\n## Limitation ranking\n${limitationLines}\n\n## Participant values\n${participantValueLines || '- No participant values captured yet.'}\n\n## Concept value coverage\n${conceptCoverageLines || '- No concept values configured.'}\n\n## Values reflection answers\n${reflectionLines || '- No reflection responses recorded yet.'}\n`;
  }, [benefitRankingSummary, conceptValueCoverage, limitationRankingSummary, likertSummary, overallLikertAverage, participantCount, participantValueSummary, reflectionSummary, strongestBenefit, study]);

  if (!study) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Study not found. Return to the home page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Synthesis</h2>
            <p className="mt-2 text-slate-600">Tight summary of participant signal across scores and rankings.</p>
          </div>
          <Link href={`/study/${study.id}/participant/new`} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700">
            Add participant
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Participants</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{participantCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Overall Likert Avg</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{overallLikertAverage.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Most Prioritized Benefit</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{strongestBenefit}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-1">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Likert distribution</h3>
          <div className="mt-4 space-y-4">
            {likertSummary.length === 0 ? (
              <p className="text-sm text-slate-500">No Likert questions configured yet.</p>
            ) : (
              likertSummary.map((item) => (
                <div key={item.question} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">{item.question}</p>
                  <p className="mt-1 text-xs text-slate-500">1 = {item.lowLabel} | 5 = {item.highLabel}</p>
                  <p className="mt-1 text-xs text-slate-600">Avg {item.average.toFixed(2)} | n={item.total}</p>
                  <div className="mt-3 space-y-2">
                    {item.counts.map((count) => (
                      <div key={count.score} className="flex items-center gap-2 text-xs text-slate-700">
                        <span className="w-6">{count.score}</span>
                        <div className="h-2 flex-1 rounded-full bg-slate-200">
                          <div className="h-2 rounded-full bg-slate-900" style={{ width: `${pct(count.count, item.total)}%` }} />
                        </div>
                        <span className="w-10 text-right">{count.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Benefits ranking</h3>
          <div className="mt-4 space-y-3">
            {benefitRankingSummary.length === 0 ? (
              <p className="text-sm text-slate-500">No benefits configured yet.</p>
            ) : (
              benefitRankingSummary.map((item) => (
                <div key={item.item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-800">{item.item}</span>
                    <span className="text-xs text-slate-600">Avg rank {item.averageRank.toFixed(2)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-slate-900" style={{ width: `${pct(item.topChoiceCount, participantCount)}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Top choice by {item.topChoiceCount} participants</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Limitations ranking</h3>
          <div className="mt-4 space-y-3">
            {limitationRankingSummary.length === 0 ? (
              <p className="text-sm text-slate-500">No limitations configured yet.</p>
            ) : (
              limitationRankingSummary.map((item) => (
                <div key={item.item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-800">{item.item}</span>
                    <span className="text-xs text-slate-600">Avg rank {item.averageRank.toFixed(2)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-slate-900" style={{ width: `${pct(item.topChoiceCount, participantCount)}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Top choice by {item.topChoiceCount} participants</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Top participant values</h3>
          <div className="mt-4 space-y-3">
            {participantValueSummary.length === 0 ? (
              <p className="text-sm text-slate-500">No participant values captured yet.</p>
            ) : (
              participantValueSummary.slice(0, 12).map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-900">{item.label}</span>
                    <span className="text-xs text-slate-600">{item.count} participant(s)</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{item.participants.join(', ')}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Concept value coverage</h3>
          <div className="mt-4 space-y-3">
            {conceptValueCoverage.length === 0 ? (
              <p className="text-sm text-slate-500">No concept values configured yet.</p>
            ) : (
              conceptValueCoverage.map((item) => (
                <div key={item.value} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-900">{item.value}</span>
                    <span className="text-xs text-slate-600">Matched by {item.count}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-slate-900" style={{ width: `${pct(item.count, participantCount)}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{item.participants.length > 0 ? item.participants.join(', ') : 'No direct matches yet'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Values reflection answers</h3>
        <div className="mt-4 space-y-5">
          {reflectionSummary.length === 0 ? (
            <p className="text-sm text-slate-500">No reflection responses recorded yet.</p>
          ) : (
            reflectionSummary.map((item) => (
              <div key={item.prompt} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{item.prompt}</p>
                <div className="mt-3 space-y-2">
                  {item.responses.map((response, index) => (
                    <div key={`${item.prompt}-${response.participant}-${index}`} className="rounded-xl bg-white px-3 py-2">
                      <p className="text-xs font-medium text-slate-600">{response.participant}</p>
                      <p className="mt-1 text-sm text-slate-800">{response.response}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Markdown study summary</h3>
        <pre className="mt-4 overflow-x-auto rounded-3xl bg-white p-4 text-sm text-slate-900">{markdown}</pre>
      </section>
    </div>
  );
};

export default SynthesisPage;
