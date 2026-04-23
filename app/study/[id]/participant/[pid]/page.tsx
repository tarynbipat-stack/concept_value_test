'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { findStudy, updateStudy } from '../../../../../lib/storage';
import { ParticipantSession, SlideAsset, Study } from '../../../../../lib/types';

const STEP_TITLES = [
  'Participant concept and values',
  'Value proposition',
  'Context',
  'Likert questions',
  'Benefits ranking',
  'Limitations ranking',
  'Values reflection',
] as const;

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const parseSelectedSlides = (value: string): number[] => {
  if (!value.trim()) return [];

  const numbers = new Set<number>();
  const tokens = value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

  tokens.forEach((token) => {
    if (token.includes('-')) {
      const [startRaw, endRaw] = token.split('-').map((part) => part.trim());
      const start = Number(startRaw);
      const end = Number(endRaw);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end <= 0) return;
      const low = Math.min(start, end);
      const high = Math.max(start, end);
      for (let i = low; i <= high; i += 1) {
        numbers.add(i);
      }
      return;
    }

    const single = Number(token);
    if (Number.isInteger(single) && single > 0) {
      numbers.add(single);
    }
  });

  return [...numbers].sort((a, b) => a - b);
};

const isPdfAsset = (asset: SlideAsset): boolean => {
  return asset.mimeType.toLowerCase().includes('pdf') || asset.name.toLowerCase().endsWith('.pdf');
};

const isPowerPointAsset = (asset: SlideAsset): boolean => {
  const name = asset.name.toLowerCase();
  const mime = asset.mimeType.toLowerCase();
  return (
    name.endsWith('.ppt') ||
    name.endsWith('.pptx') ||
    mime.includes('ms-powerpoint') ||
    mime.includes('presentationml.presentation')
  );
};

const resolveAbsoluteAssetUrl = (url: string): string => {
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window === 'undefined') return url;
  return new URL(url, window.location.origin).toString();
};

const buildPresentationUrl = (asset: SlideAsset, slideNumber: number): string => {
  const absoluteUrl = resolveAbsoluteAssetUrl(asset.url);
  if (isPdfAsset(asset)) {
    return `${absoluteUrl}#page=${Math.max(1, slideNumber)}&view=FitH&toolbar=0&navpanes=0`;
  }

  if (isPowerPointAsset(asset)) {
    const src = encodeURIComponent(absoluteUrl);
    return `https://view.officeapps.live.com/op/embed.aspx?src=${src}&wdSlideIndex=${Math.max(1, slideNumber)}`;
  }

  return absoluteUrl;
};

const SlideList = ({
  assets,
  emptyLabel,
  presentationMode,
}: {
  assets: SlideAsset[];
  emptyLabel: string;
  presentationMode?: boolean;
}) => {
  const [activeAssetId, setActiveAssetId] = useState<string | null>(assets[0]?.id ?? null);
  const [manualSlide, setManualSlide] = useState(1);

  useEffect(() => {
    if (assets.length === 0) {
      setActiveAssetId(null);
      return;
    }

    const stillExists = assets.some((asset) => asset.id === activeAssetId);
    if (!stillExists) {
      setActiveAssetId(assets[0].id);
    }
  }, [activeAssetId, assets]);

  const activeAsset = useMemo(() => assets.find((asset) => asset.id === activeAssetId) ?? assets[0] ?? null, [activeAssetId, assets]);
  const selectedSlides = activeAsset ? parseSelectedSlides(activeAsset.selectedSlides) : [];
  const selectedIndex = selectedSlides.indexOf(manualSlide);
  const hasSelectedRange = selectedSlides.length > 0;

  useEffect(() => {
    if (!activeAsset) return;
    if (selectedSlides.length > 0) {
      setManualSlide(selectedSlides[0]);
      return;
    }
    setManualSlide(1);
  }, [activeAsset?.id]);

  if (assets.length === 0) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${activeAsset?.id === asset.id ? 'border-slate-400 bg-white' : 'border-slate-200 bg-slate-50'}`}
          >
            <div>
              <span className="text-sm font-medium text-slate-800">{asset.name}</span>
              <p className="text-xs text-slate-500">Using slides: {asset.selectedSlides || 'All slides'}</p>
            </div>
            <div className="flex items-center gap-2">
              {presentationMode ? (
                <button
                  type="button"
                  onClick={() => setActiveAssetId(asset.id)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Present in app
                </button>
              ) : null}
              <a
                href={asset.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Open file
              </a>
              <span className="text-xs text-slate-500">{formatFileSize(asset.size)}</span>
            </div>
          </div>
        ))}
      </div>

      {presentationMode && activeAsset ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Presentation viewer</p>
              <p className="text-xs text-slate-500">
                {hasSelectedRange
                  ? `Showing selected slide range: ${activeAsset.selectedSlides}`
                  : 'No range selected. Showing from slide 1.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {hasSelectedRange ? (
                <>
                  <button
                    type="button"
                    disabled={selectedIndex <= 0}
                    onClick={() => {
                      if (selectedIndex > 0) {
                        setManualSlide(selectedSlides[selectedIndex - 1]);
                      }
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous selected
                  </button>
                  <button
                    type="button"
                    disabled={selectedIndex === -1 || selectedIndex >= selectedSlides.length - 1}
                    onClick={() => {
                      if (selectedIndex >= 0 && selectedIndex < selectedSlides.length - 1) {
                        setManualSlide(selectedSlides[selectedIndex + 1]);
                      }
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next selected
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={manualSlide <= 1}
                    onClick={() => setManualSlide((value) => Math.max(1, value - 1))}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualSlide((value) => value + 1)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    Next
                  </button>
                </>
              )}
            </div>
          </div>

          <iframe
            key={`${activeAsset.id}-${manualSlide}`}
            title={`Presentation viewer for ${activeAsset.name}`}
            src={buildPresentationUrl(activeAsset, manualSlide)}
            className="h-[68vh] w-full rounded-xl border border-slate-200"
          />
          {isPowerPointAsset(activeAsset) ? (
            <p className="mt-2 text-xs text-slate-500">
              PowerPoint files are embedded with Office Web Viewer. In local development, use deployed URLs for reliable viewing.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const SortableRankingItem = ({ id, label, position }: { id: string; label: string; position: number }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
        {position}
      </span>
      <span className="text-sm text-slate-800">{label}</span>
    </div>
  );
};

const SessionPage = () => {
  const params = useParams<{ id: string; pid: string }>();
  const searchParams = useSearchParams();
  const presentationMode = searchParams.get('mode') === 'presentation';
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [study, setStudy] = useState<Study | null>(null);
  const [participant, setParticipant] = useState<ParticipantSession | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [newParticipantValue, setNewParticipantValue] = useState('');

  useEffect(() => {
    const run = async () => {
      const loadedStudy = await findStudy(params.id);
      if (!loadedStudy) {
        setStudy(null);
        setParticipant(null);
        return;
      }
      setStudy(loadedStudy);
      setParticipant(loadedStudy.participants.find((item) => item.id === params.pid) ?? null);
    };
    run();
  }, [params.id, params.pid]);

  const saveParticipant = async (nextParticipant: ParticipantSession) => {
    if (!study) return;
    const nextStudy: Study = {
      ...study,
      participants: study.participants.map((item) => (item.id === nextParticipant.id ? nextParticipant : item)),
      updatedAt: new Date().toISOString(),
    };
    await updateStudy(nextStudy);
    setStudy(nextStudy);
    setParticipant(nextParticipant);
    setMessage('Saved');
    window.setTimeout(() => setMessage(null), 1200);
  };

  const updateLikert = (responseId: string, rating: number) => {
    if (!participant) return;
    void saveParticipant({
      ...participant,
      likertResponses: participant.likertResponses.map((response) =>
        response.id === responseId ? { ...response, rating } : response,
      ),
      updatedAt: new Date().toISOString(),
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    if (!participant) return;
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith('benefit:') && overId.startsWith('benefit:')) {
      const items = [...participant.benefitRanking];
      const oldIndex = items.indexOf(activeId.slice(8));
      const newIndex = items.indexOf(overId.slice(8));
      if (oldIndex === -1 || newIndex === -1) return;
      void saveParticipant({
        ...participant,
        benefitRanking: arrayMove(items, oldIndex, newIndex),
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    if (activeId.startsWith('limitation:') && overId.startsWith('limitation:')) {
      const items = [...participant.limitationRanking];
      const oldIndex = items.indexOf(activeId.slice(11));
      const newIndex = items.indexOf(overId.slice(11));
      if (oldIndex === -1 || newIndex === -1) return;
      void saveParticipant({
        ...participant,
        limitationRanking: arrayMove(items, oldIndex, newIndex),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const updateParticipantConcept = (value: string) => {
    if (!participant) return;
    void saveParticipant({
      ...participant,
      participantConcept: value,
      updatedAt: new Date().toISOString(),
    });
  };

  const addParticipantValue = () => {
    if (!participant) return;
    if (!newParticipantValue.trim()) return;
    void saveParticipant({
      ...participant,
      participantValues: [...participant.participantValues, newParticipantValue.trim()],
      updatedAt: new Date().toISOString(),
    });
    setNewParticipantValue('');
  };

  const removeParticipantValue = (index: number) => {
    if (!participant) return;
    void saveParticipant({
      ...participant,
      participantValues: participant.participantValues.filter((_, itemIndex) => itemIndex !== index),
      updatedAt: new Date().toISOString(),
    });
  };

  const updateReflectionResponse = (responseId: string, responseText: string) => {
    if (!participant) return;
    void saveParticipant({
      ...participant,
      valueReflectionResponses: participant.valueReflectionResponses.map((item) =>
        item.id === responseId ? { ...item, response: responseText } : item,
      ),
      updatedAt: new Date().toISOString(),
    });
  };

  const stepContent = useMemo(() => {
    if (!study || !participant) return null;

    const questionMetaById = new Map(study.cvtQuestions.map((item) => [item.id, item]));
    const benefitNumberByLabel = new Map(study.benefits.map((item, index) => [item, index + 1]));
    const limitationNumberByLabel = new Map(study.limitations.map((item, index) => [item, index + 1]));

    switch (currentStep) {
      case 0:
        return (
          <section className="space-y-5">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Step 1</p>
              <h3 className="mt-2 text-2xl font-semibold">Participant concept and values</h3>
              <p className="mt-2 text-sm text-slate-600">Capture what the participant is trying to build and which values matter before introducing your concept.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <label className="text-sm font-medium text-slate-800">Participant concept summary</label>
              <textarea
                value={participant.participantConcept}
                onChange={(event) => updateParticipantConcept(event.target.value)}
                rows={5}
                placeholder="Summarize the participant's concept in their own words"
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold">Participant values list</h4>
              <div className="mt-3 flex gap-2">
                <input
                  value={newParticipantValue}
                  onChange={(event) => setNewParticipantValue(event.target.value)}
                  placeholder="Add a value as they speak"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 focus:border-slate-500 focus:outline-none"
                />
                <button type="button" onClick={addParticipantValue} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  Add
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {participant.participantValues.length === 0 ? (
                  <p className="text-sm text-slate-500">No participant values captured yet.</p>
                ) : (
                  participant.participantValues.map((value, index) => (
                    <div key={`${value}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <span className="text-sm text-slate-800">{value}</span>
                      <button type="button" onClick={() => removeParticipantValue(index)} className="text-xs text-rose-600 hover:underline">
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        );
      case 1:
        return (
          <section className="space-y-5">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Step 2</p>
              <h3 className="mt-2 text-2xl font-semibold">Value proposition</h3>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="whitespace-pre-wrap text-base leading-7 text-slate-800">{study.valueProposition || 'No value proposition added yet.'}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold">Slides</h4>
              <div className="mt-4">
                <SlideList assets={study.valuePropositionSlides} emptyLabel="No value proposition deck uploaded yet." presentationMode={presentationMode} />
              </div>
            </div>
          </section>
        );
      case 2:
        return (
          <section className="space-y-5">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Step 3</p>
              <h3 className="mt-2 text-2xl font-semibold">Context around the concept</h3>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="whitespace-pre-wrap text-base leading-7 text-slate-800">{study.conceptContext || 'No concept context added yet.'}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold">Slides</h4>
              <div className="mt-4">
                <SlideList assets={study.contextSlides} emptyLabel="No context deck uploaded yet." presentationMode={presentationMode} />
              </div>
            </div>
          </section>
        );
      case 3:
        return (
          <section className="space-y-5">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Step 4</p>
              <h3 className="mt-2 text-2xl font-semibold">Likert questions</h3>
              <p className="mt-2 text-sm text-slate-600">Select a score from 1 to 5 for each statement using the configured scale labels.</p>
            </div>
            <div className="space-y-4">
              {participant.likertResponses.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm text-slate-500">No Likert questions have been configured for this study yet.</div>
              ) : (
                participant.likertResponses.map((response) => {
                  const questionMeta = questionMetaById.get(response.questionId);
                  const lowLabel = questionMeta?.lowLabel ?? 'Least important';
                  const highLabel = questionMeta?.highLabel ?? 'Most important';

                  return (
                  <div key={response.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-base font-medium text-slate-900">{response.question}</p>
                    <p className="mt-1 text-xs text-slate-600">1 = {lowLabel} | 5 = {highLabel}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => updateLikert(response.id, score)}
                          className={`h-11 w-11 rounded-full text-sm font-semibold ${response.rating === score ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                );
                })
              )}
            </div>
          </section>
        );
      case 4:
        return (
          <section className="space-y-5">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Step 5</p>
              <h3 className="mt-2 text-2xl font-semibold">Stack rank the benefits</h3>
              <p className="mt-2 text-sm text-slate-600">Drag to order from most important at the top to least important at the bottom.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              {participant.benefitRanking.length === 0 ? (
                <p className="text-sm text-slate-500">No benefits have been configured for this study yet.</p>
              ) : (
                <SortableContext items={participant.benefitRanking.map((item) => `benefit:${item}`)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {participant.benefitRanking.map((item, index) => (
                      <SortableRankingItem
                        key={`benefit:${item}`}
                        id={`benefit:${item}`}
                        label={item}
                        position={benefitNumberByLabel.get(item) ?? index + 1}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </div>
          </section>
        );
      case 5:
        return (
          <section className="space-y-5">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Step 6</p>
              <h3 className="mt-2 text-2xl font-semibold">Stack rank the limitations</h3>
              <p className="mt-2 text-sm text-slate-600">Drag to order from most important at the top to least important at the bottom.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              {participant.limitationRanking.length === 0 ? (
                <p className="text-sm text-slate-500">No limitations have been configured for this study yet.</p>
              ) : (
                <SortableContext items={participant.limitationRanking.map((item) => `limitation:${item}`)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {participant.limitationRanking.map((item, index) => (
                      <SortableRankingItem
                        key={`limitation:${item}`}
                        id={`limitation:${item}`}
                        label={item}
                        position={limitationNumberByLabel.get(item) ?? index + 1}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </div>
          </section>
        );
      case 6:
        return (
          <section className="space-y-5">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Step 7</p>
              <h3 className="mt-2 text-2xl font-semibold">Values reflection</h3>
              <p className="mt-2 text-sm text-slate-600">Review values side by side, then ask reflection questions.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="text-lg font-semibold">Participant values</h4>
                <div className="mt-3 space-y-2">
                  {participant.participantValues.length === 0 ? (
                    <p className="text-sm text-slate-500">No participant values were captured.</p>
                  ) : (
                    participant.participantValues.map((value, index) => (
                      <div key={`${value}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                        {value}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="text-lg font-semibold">Our concept values</h4>
                <div className="mt-3 space-y-2">
                  {study.conceptValues.length === 0 ? (
                    <p className="text-sm text-slate-500">No concept values configured in setup.</p>
                  ) : (
                    study.conceptValues.map((value, index) => (
                      <div key={`${value}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                        {value}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold">Reflection questions</h4>
              <div className="mt-4 space-y-4">
                {participant.valueReflectionResponses.map((item) => (
                  <label key={item.id} className="block space-y-2">
                    <span className="text-sm font-medium text-slate-800">{item.prompt}</span>
                    <textarea
                      value={item.response}
                      onChange={(event) => updateReflectionResponse(item.id, event.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 focus:border-slate-500 focus:outline-none"
                    />
                  </label>
                ))}
              </div>
            </div>
          </section>
        );
      default:
        return null;
    }
  }, [currentStep, newParticipantValue, participant, presentationMode, study]);

  if (!study || !participant) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Session not found. Return to the study and create a valid participant session.</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className={`space-y-8 ${presentationMode ? 'mx-auto max-w-5xl' : ''}`}>
        <section className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${presentationMode ? 'p-8' : ''}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Participant session</p>
              <h2 className={`mt-2 font-semibold ${presentationMode ? 'text-4xl' : 'text-2xl'}`}>{participant.name}</h2>
              <p className="mt-1 text-sm text-slate-600">Current workflow/tool: {participant.currentTool || 'Not specified'}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={presentationMode ? `/study/${study.id}/participant/${participant.id}` : `/study/${study.id}/participant/${participant.id}?mode=presentation`}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                {presentationMode ? 'Exit presentation' : 'Presentation mode'}
              </Link>
              {message ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">{message}</span> : null}
            </div>
          </div>
        </section>

        <section className={`grid gap-6 ${presentationMode ? 'xl:grid-cols-1' : 'xl:grid-cols-[260px_1fr]'}`}>
          {!presentationMode ? (
            <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Interview flow</p>
            <div className="mt-4 space-y-2">
              {STEP_TITLES.map((title, index) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => setCurrentStep(index)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm ${currentStep === index ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${currentStep === index ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-700'}`}>
                    {index + 1}
                  </span>
                  <span>{title}</span>
                </button>
              ))}
            </div>
            </aside>
          ) : null}

          <div className="space-y-6">
            {stepContent}

            <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <button
                type="button"
                onClick={() => setCurrentStep((value) => Math.max(0, value - 1))}
                disabled={currentStep === 0}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>
              {presentationMode ? (
                <div className="flex flex-wrap justify-center gap-2">
                  {STEP_TITLES.map((title, index) => (
                    <button
                      key={title}
                      type="button"
                      onClick={() => setCurrentStep(index)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${currentStep === index ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              ) : null}
              {currentStep < STEP_TITLES.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((value) => Math.min(STEP_TITLES.length - 1, value + 1))}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Next
                </button>
              ) : (
                <a href={`/study/${study.id}/synthesis`} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  View synthesis
                </a>
              )}
            </div>
          </div>
        </section>
      </div>
    </DndContext>
  );
};

export default SessionPage;
