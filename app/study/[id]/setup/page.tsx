'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { findStudy, updateStudy } from '../../../../lib/storage';
import { LikertQuestion, SlideAsset, Study } from '../../../../lib/types';

type SlideField = 'valuePropositionSlides' | 'contextSlides';

const parseSelectedSlides = (value: string): number[] => {
  if (!value.trim()) return [];

  const numbers = new Set<number>();
  const tokens = value.split(',').map((token) => token.trim()).filter(Boolean);

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

const stringifySelectedSlides = (values: number[]): string => {
  if (values.length === 0) return '';
  const sorted = [...new Set(values)].filter((value) => value > 0).sort((a, b) => a - b);
  const ranges: string[] = [];

  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    if (current === end + 1) {
      end = current;
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = current;
      end = current;
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);

  return ranges.join(',');
};

const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const SetupPage = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [study, setStudy] = useState<Study | null>(null);
  const [valueProposition, setValueProposition] = useState('');
  const [conceptContext, setConceptContext] = useState('');
  const [question, setQuestion] = useState('');
  const [lowLabel, setLowLabel] = useState('Least important');
  const [highLabel, setHighLabel] = useState('Most important');
  const [newConceptValue, setNewConceptValue] = useState('');
  const [newReflectionQuestion, setNewReflectionQuestion] = useState('');
  const [newBenefit, setNewBenefit] = useState('');
  const [newLimitation, setNewLimitation] = useState('');
  const [singleSlideInput, setSingleSlideInput] = useState<Record<string, string>>({});
  const [rangeStartInput, setRangeStartInput] = useState<Record<string, string>>({});
  const [rangeEndInput, setRangeEndInput] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<SlideField | null>(null);

  useEffect(() => {
    const run = async () => {
      const found = await findStudy(params.id);
      if (!found) {
        setStudy(null);
        return;
      }
      setStudy(found);
      setValueProposition(found.valueProposition);
      setConceptContext(found.conceptContext);
    };
    run();
  }, [params.id]);

  const saveStudy = async (updated: Study) => {
    setSaving(true);
    await updateStudy(updated);
    setStudy(updated);
    setSaving(false);
  };

  const saveNarrative = async () => {
    if (!study) return;
    await saveStudy({
      ...study,
      valueProposition,
      conceptContext,
      updatedAt: new Date().toISOString(),
    });
    setError(null);
  };

  const addQuestion = async () => {
    if (!study) return;
    if (!question.trim()) {
      setError('Likert question text is required.');
      return;
    }
    if (!lowLabel.trim() || !highLabel.trim()) {
      setError('Both 1 and 5 scale labels are required.');
      return;
    }

    const nextQuestion: LikertQuestion = {
      id: createId(),
      prompt: question.trim(),
      lowLabel: lowLabel.trim(),
      highLabel: highLabel.trim(),
    };

    await saveStudy({
      ...study,
      cvtQuestions: [...study.cvtQuestions, nextQuestion],
      updatedAt: new Date().toISOString(),
    });
    setQuestion('');
    setLowLabel('Least important');
    setHighLabel('Most important');
    setError(null);
  };

  const addBenefit = async () => {
    if (!study) return;
    if (!newBenefit.trim()) {
      setError('Benefit text is required.');
      return;
    }
    await saveStudy({
      ...study,
      benefits: [...study.benefits, newBenefit.trim()],
      updatedAt: new Date().toISOString(),
    });
    setNewBenefit('');
    setError(null);
  };

  const addConceptValue = async () => {
    if (!study) return;
    if (!newConceptValue.trim()) {
      setError('Concept value text is required.');
      return;
    }
    await saveStudy({
      ...study,
      conceptValues: [...study.conceptValues, newConceptValue.trim()],
      updatedAt: new Date().toISOString(),
    });
    setNewConceptValue('');
    setError(null);
  };

  const addLimitation = async () => {
    if (!study) return;
    if (!newLimitation.trim()) {
      setError('Limitation text is required.');
      return;
    }
    await saveStudy({
      ...study,
      limitations: [...study.limitations, newLimitation.trim()],
      updatedAt: new Date().toISOString(),
    });
    setNewLimitation('');
    setError(null);
  };

  const addReflectionQuestion = async () => {
    if (!study) return;
    if (!newReflectionQuestion.trim()) {
      setError('Reflection question text is required.');
      return;
    }
    await saveStudy({
      ...study,
      valueReflectionQuestions: [...study.valueReflectionQuestions, newReflectionQuestion.trim()],
      updatedAt: new Date().toISOString(),
    });
    setNewReflectionQuestion('');
    setError(null);
  };

  const removeListItem = async (field: 'cvtQuestions' | 'conceptValues' | 'valueReflectionQuestions' | 'benefits' | 'limitations', index: number) => {
    if (!study) return;
    await saveStudy({
      ...study,
      [field]: study[field].filter((_, itemIndex) => itemIndex !== index),
      updatedAt: new Date().toISOString(),
    });
  };

  const uploadSlides = async (field: SlideField, event: ChangeEvent<HTMLInputElement>) => {
    if (!study) return;
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    try {
      setUploadingField(field);
      const uploadedAssets: SlideAsset[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        uploadedAssets.push((await response.json()) as SlideAsset);
      }

      await saveStudy({
        ...study,
        [field]: [...study[field], ...uploadedAssets],
        updatedAt: new Date().toISOString(),
      });
      setError(null);
    } catch {
      setError('Failed to upload slides. Use PPT, PPTX, or PDF files.');
    } finally {
      setUploadingField(null);
      event.target.value = '';
    }
  };

  const removeSlide = async (field: SlideField, assetId: string) => {
    if (!study) return;
    await saveStudy({
      ...study,
      [field]: study[field].filter((asset) => asset.id !== assetId),
      updatedAt: new Date().toISOString(),
    });
  };

  const updateSelectedSlides = async (field: SlideField, assetId: string, selectedSlides: string) => {
    if (!study) return;

    const normalized = selectedSlides.trim();
    if (normalized && !/^[0-9,\-\s]+$/.test(normalized)) {
      setError('Slide selection format is invalid. Use values like 1,2,5-8.');
      return;
    }

    await saveStudy({
      ...study,
      [field]: study[field].map((asset) => (asset.id === assetId ? { ...asset, selectedSlides: normalized } : asset)),
      updatedAt: new Date().toISOString(),
    });
    setError(null);
  };

  const addSingleSlide = async (field: SlideField, assetId: string) => {
    if (!study) return;
    const key = `${field}:${assetId}`;
    const value = Number(singleSlideInput[key]);
    if (!Number.isInteger(value) || value <= 0) {
      setError('Enter a valid positive slide number.');
      return;
    }

    const asset = study[field].find((item) => item.id === assetId);
    if (!asset) return;
    const next = stringifySelectedSlides([...parseSelectedSlides(asset.selectedSlides), value]);
    await updateSelectedSlides(field, assetId, next);
    setSingleSlideInput((prev) => ({ ...prev, [key]: '' }));
  };

  const addSlideRange = async (field: SlideField, assetId: string) => {
    if (!study) return;
    const key = `${field}:${assetId}`;
    const start = Number(rangeStartInput[key]);
    const end = Number(rangeEndInput[key]);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end <= 0) {
      setError('Enter valid positive numbers for slide range.');
      return;
    }

    const asset = study[field].find((item) => item.id === assetId);
    if (!asset) return;

    const low = Math.min(start, end);
    const high = Math.max(start, end);
    const rangeValues: number[] = [];
    for (let i = low; i <= high; i += 1) {
      rangeValues.push(i);
    }

    const next = stringifySelectedSlides([...parseSelectedSlides(asset.selectedSlides), ...rangeValues]);
    await updateSelectedSlides(field, assetId, next);
    setRangeStartInput((prev) => ({ ...prev, [key]: '' }));
    setRangeEndInput((prev) => ({ ...prev, [key]: '' }));
  };

  const removeSelectedSlideNumber = async (field: SlideField, assetId: string, slide: number) => {
    if (!study) return;
    const asset = study[field].find((item) => item.id === assetId);
    if (!asset) return;
    const next = stringifySelectedSlides(parseSelectedSlides(asset.selectedSlides).filter((value) => value !== slide));
    await updateSelectedSlides(field, assetId, next);
  };

  if (!study) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Study not found. Go back to home and select a valid study.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Concept value test setup</h2>
            <p className="mt-2 text-slate-600">Author the value proposition, concept context, Likert questions, and the lists participants will rank.</p>
          </div>
          {saving ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">Saving...</span> : null}
        </div>

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">Value proposition</h3>
                <button type="button" onClick={() => void saveNarrative()} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
                  Save text
                </button>
              </div>
              <textarea
                value={valueProposition}
                onChange={(event) => setValueProposition(event.target.value)}
                rows={6}
                placeholder="What is the core promise of this concept?"
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 focus:border-slate-500 focus:outline-none"
              />
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Supporting deck</p>
                    <p className="text-xs text-slate-500">Upload PowerPoint or PDF slides for the value proposition.</p>
                  </div>
                  <label className="cursor-pointer rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
                    {uploadingField === 'valuePropositionSlides' ? 'Uploading...' : 'Add slides'}
                    <input type="file" accept=".ppt,.pptx,.pdf" multiple className="hidden" onChange={(event) => void uploadSlides('valuePropositionSlides', event)} />
                  </label>
                </div>
                <div className="mt-4 space-y-2">
                  {study.valuePropositionSlides.length === 0 ? (
                    <p className="text-sm text-slate-500">No value proposition files uploaded yet.</p>
                  ) : (
                    study.valuePropositionSlides.map((asset) => (
                      <div key={asset.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                        {(() => {
                          const key = `valuePropositionSlides:${asset.id}`;
                          const selected = parseSelectedSlides(asset.selectedSlides);
                          return (
                            <>
                        <div className="flex items-center justify-between gap-3">
                          <a href={asset.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-800 hover:underline">
                            {asset.name}
                          </a>
                          <button type="button" onClick={() => void removeSlide('valuePropositionSlides', asset.id)} className="text-xs text-rose-600 hover:underline">
                            Remove
                          </button>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <input
                            defaultValue={asset.selectedSlides}
                            placeholder="Slides to use (e.g. 1,3,5-8). Leave blank for all."
                            onBlur={(event) => void updateSelectedSlides('valuePropositionSlides', asset.id, event.target.value)}
                            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-slate-500 focus:outline-none"
                          />
                          <span className="text-xs text-slate-500">Saves on blur</span>
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              value={singleSlideInput[key] ?? ''}
                              onChange={(event) => setSingleSlideInput((prev) => ({ ...prev, [key]: event.target.value }))}
                              placeholder="Slide #"
                              className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-slate-500 focus:outline-none"
                            />
                            <button type="button" onClick={() => void addSingleSlide('valuePropositionSlides', asset.id)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
                              Add slide
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              value={rangeStartInput[key] ?? ''}
                              onChange={(event) => setRangeStartInput((prev) => ({ ...prev, [key]: event.target.value }))}
                              placeholder="From"
                              className="w-20 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-slate-500 focus:outline-none"
                            />
                            <input
                              type="number"
                              min={1}
                              value={rangeEndInput[key] ?? ''}
                              onChange={(event) => setRangeEndInput((prev) => ({ ...prev, [key]: event.target.value }))}
                              placeholder="To"
                              className="w-20 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-slate-500 focus:outline-none"
                            />
                            <button type="button" onClick={() => void addSlideRange('valuePropositionSlides', asset.id)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
                              Add range
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selected.length === 0 ? (
                            <span className="text-xs text-slate-500">No specific slide selection. All slides will be used.</span>
                          ) : (
                            selected.map((slide) => (
                              <button
                                key={slide}
                                type="button"
                                onClick={() => void removeSelectedSlideNumber('valuePropositionSlides', asset.id, slide)}
                                className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                              >
                                {slide} x
                              </button>
                            ))
                          )}
                        </div>
                            </>
                          );
                        })()}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">Context around the concept</h3>
                <button type="button" onClick={() => void saveNarrative()} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
                  Save text
                </button>
              </div>
              <textarea
                value={conceptContext}
                onChange={(event) => setConceptContext(event.target.value)}
                rows={8}
                placeholder="What background should participants understand before evaluating the concept?"
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 focus:border-slate-500 focus:outline-none"
              />
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Context deck</p>
                    <p className="text-xs text-slate-500">Upload PowerPoint or PDF slides that explain the concept background.</p>
                  </div>
                  <label className="cursor-pointer rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
                    {uploadingField === 'contextSlides' ? 'Uploading...' : 'Add slides'}
                    <input type="file" accept=".ppt,.pptx,.pdf" multiple className="hidden" onChange={(event) => void uploadSlides('contextSlides', event)} />
                  </label>
                </div>
                <div className="mt-4 space-y-2">
                  {study.contextSlides.length === 0 ? (
                    <p className="text-sm text-slate-500">No context files uploaded yet.</p>
                  ) : (
                    study.contextSlides.map((asset) => (
                      <div key={asset.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                        {(() => {
                          const key = `contextSlides:${asset.id}`;
                          const selected = parseSelectedSlides(asset.selectedSlides);
                          return (
                            <>
                        <div className="flex items-center justify-between gap-3">
                          <a href={asset.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-800 hover:underline">
                            {asset.name}
                          </a>
                          <button type="button" onClick={() => void removeSlide('contextSlides', asset.id)} className="text-xs text-rose-600 hover:underline">
                            Remove
                          </button>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <input
                            defaultValue={asset.selectedSlides}
                            placeholder="Slides to use (e.g. 2-6). Leave blank for all."
                            onBlur={(event) => void updateSelectedSlides('contextSlides', asset.id, event.target.value)}
                            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-slate-500 focus:outline-none"
                          />
                          <span className="text-xs text-slate-500">Saves on blur</span>
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              value={singleSlideInput[key] ?? ''}
                              onChange={(event) => setSingleSlideInput((prev) => ({ ...prev, [key]: event.target.value }))}
                              placeholder="Slide #"
                              className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-slate-500 focus:outline-none"
                            />
                            <button type="button" onClick={() => void addSingleSlide('contextSlides', asset.id)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
                              Add slide
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              value={rangeStartInput[key] ?? ''}
                              onChange={(event) => setRangeStartInput((prev) => ({ ...prev, [key]: event.target.value }))}
                              placeholder="From"
                              className="w-20 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-slate-500 focus:outline-none"
                            />
                            <input
                              type="number"
                              min={1}
                              value={rangeEndInput[key] ?? ''}
                              onChange={(event) => setRangeEndInput((prev) => ({ ...prev, [key]: event.target.value }))}
                              placeholder="To"
                              className="w-20 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-slate-500 focus:outline-none"
                            />
                            <button type="button" onClick={() => void addSlideRange('contextSlides', asset.id)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
                              Add range
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selected.length === 0 ? (
                            <span className="text-xs text-slate-500">No specific slide selection. All slides will be used.</span>
                          ) : (
                            selected.map((slide) => (
                              <button
                                key={slide}
                                type="button"
                                onClick={() => void removeSelectedSlideNumber('contextSlides', asset.id, slide)}
                                className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                              >
                                {slide} x
                              </button>
                            ))
                          )}
                        </div>
                            </>
                          );
                        })()}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-50 p-4">
              <h3 className="text-lg font-semibold">Likert scale questions</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Add a 1-5 question"
                  className="min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-2 focus:border-slate-500 focus:outline-none sm:col-span-2"
                />
                <input
                  value={lowLabel}
                  onChange={(event) => setLowLabel(event.target.value)}
                  placeholder="1 means..."
                  className="min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-2 focus:border-slate-500 focus:outline-none"
                />
                <input
                  value={highLabel}
                  onChange={(event) => setHighLabel(event.target.value)}
                  placeholder="5 means..."
                  className="min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-2 focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div className="mt-2 flex justify-end">
                <button type="button" onClick={() => void addQuestion()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  Add
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {study.cvtQuestions.length === 0 ? (
                  <p className="text-sm text-slate-500">No Likert questions yet.</p>
                ) : (
                  study.cvtQuestions.map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                      <div>
                        <span className="text-sm text-slate-800">{item.prompt}</span>
                        <p className="text-xs text-slate-500">1 = {item.lowLabel} | 5 = {item.highLabel}</p>
                      </div>
                      <button type="button" onClick={() => void removeListItem('cvtQuestions', index)} className="text-xs text-rose-600 hover:underline">
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <h3 className="text-lg font-semibold">Benefits</h3>
              <div className="mt-3 flex gap-2">
                <input
                  value={newBenefit}
                  onChange={(event) => setNewBenefit(event.target.value)}
                  placeholder="Enter a concept benefit"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 focus:border-slate-500 focus:outline-none"
                />
                <button type="button" onClick={() => void addBenefit()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  Add
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {study.benefits.length === 0 ? (
                  <p className="text-sm text-slate-500">No benefits yet.</p>
                ) : (
                  study.benefits.map((item, index) => (
                    <div key={`${item}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                      <span className="text-sm text-slate-800">{item}</span>
                      <button type="button" onClick={() => void removeListItem('benefits', index)} className="text-xs text-rose-600 hover:underline">
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <h3 className="text-lg font-semibold">Our concept values</h3>
              <p className="mt-1 text-xs text-slate-600">These are shown side by side with participant values at the end of each session.</p>
              <div className="mt-3 flex gap-2">
                <input
                  value={newConceptValue}
                  onChange={(event) => setNewConceptValue(event.target.value)}
                  placeholder="Enter a concept value"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 focus:border-slate-500 focus:outline-none"
                />
                <button type="button" onClick={() => void addConceptValue()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  Add
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {study.conceptValues.length === 0 ? (
                  <p className="text-sm text-slate-500">No concept values yet.</p>
                ) : (
                  study.conceptValues.map((item, index) => (
                    <div key={`${item}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                      <span className="text-sm text-slate-800">{item}</span>
                      <button type="button" onClick={() => void removeListItem('conceptValues', index)} className="text-xs text-rose-600 hover:underline">
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <h3 className="text-lg font-semibold">Limitations</h3>
              <div className="mt-3 flex gap-2">
                <input
                  value={newLimitation}
                  onChange={(event) => setNewLimitation(event.target.value)}
                  placeholder="Enter a concept limitation"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 focus:border-slate-500 focus:outline-none"
                />
                <button type="button" onClick={() => void addLimitation()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  Add
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {study.limitations.length === 0 ? (
                  <p className="text-sm text-slate-500">No limitations yet.</p>
                ) : (
                  study.limitations.map((item, index) => (
                    <div key={`${item}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                      <span className="text-sm text-slate-800">{item}</span>
                      <button type="button" onClick={() => void removeListItem('limitations', index)} className="text-xs text-rose-600 hover:underline">
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <h3 className="text-lg font-semibold">End-of-session reflection questions</h3>
              <p className="mt-1 text-xs text-slate-600">These questions are shown during the values reflection step for each participant.</p>
              <div className="mt-3 flex gap-2">
                <input
                  value={newReflectionQuestion}
                  onChange={(event) => setNewReflectionQuestion(event.target.value)}
                  placeholder="Add a reflection question"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 focus:border-slate-500 focus:outline-none"
                />
                <button type="button" onClick={() => void addReflectionQuestion()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  Add
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {study.valueReflectionQuestions.length === 0 ? (
                  <p className="text-sm text-slate-500">No reflection questions yet.</p>
                ) : (
                  study.valueReflectionQuestions.map((item, index) => (
                    <div key={`${item}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                      <span className="text-sm text-slate-800">{item}</span>
                      <button type="button" onClick={() => void removeListItem('valueReflectionQuestions', index)} className="text-xs text-rose-600 hover:underline">
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.push(`/study/${study.id}/participant/new`)}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Start participant sessions
          </button>
        </div>
      </section>
    </div>
  );
};

export default SetupPage;
