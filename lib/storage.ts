import { CompassStorage, LikertQuestion, SlideAsset, Study } from './types';

const DEFAULT_STORAGE: CompassStorage = {
  version: 1,
  studies: [],
};

const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeLikertQuestions = (rawQuestions: unknown): LikertQuestion[] => {
  if (!Array.isArray(rawQuestions)) {
    return [];
  }

  return rawQuestions
    .map((item): LikertQuestion | null => {
      if (typeof item === 'string') {
        return {
          id: createId(),
          prompt: item,
          lowLabel: 'Least important',
          highLabel: 'Most important',
        };
      }

      if (!item || typeof item !== 'object') {
        return null;
      }

      const candidate = item as {
        id?: unknown;
        prompt?: unknown;
        question?: unknown;
        lowLabel?: unknown;
        highLabel?: unknown;
      };

      const prompt = typeof candidate.prompt === 'string'
        ? candidate.prompt
        : (typeof candidate.question === 'string' ? candidate.question : '');

      if (!prompt) {
        return null;
      }

      return {
        id: typeof candidate.id === 'string' ? candidate.id : createId(),
        prompt,
        lowLabel: typeof candidate.lowLabel === 'string' && candidate.lowLabel.trim() ? candidate.lowLabel : 'Least important',
        highLabel: typeof candidate.highLabel === 'string' && candidate.highLabel.trim() ? candidate.highLabel : 'Most important',
      };
    })
    .filter((item): item is LikertQuestion => Boolean(item));
};

const normalizeSlideAssets = (rawAssets: unknown): SlideAsset[] => {
  if (!Array.isArray(rawAssets)) {
    return [];
  }

  return rawAssets
    .filter((item) => item && typeof item === 'object')
    .map((item: any) => ({
      id: typeof item.id === 'string' ? item.id : createId(),
      name: typeof item.name === 'string' ? item.name : 'Uploaded file',
      url: typeof item.url === 'string' ? item.url : '',
      mimeType: typeof item.mimeType === 'string' ? item.mimeType : 'application/octet-stream',
      size: typeof item.size === 'number' ? item.size : 0,
      selectedSlides: typeof item.selectedSlides === 'string' ? item.selectedSlides : '',
      uploadedAt: typeof item.uploadedAt === 'string' ? item.uploadedAt : new Date().toISOString(),
    }))
    .filter((item) => Boolean(item.url));
};

const normalizeStudy = (rawStudy: any): Study => {
  const conceptValues = Array.isArray(rawStudy?.conceptValues) ? rawStudy.conceptValues.filter((item: unknown) => typeof item === 'string') : [];
  const valueReflectionQuestions = Array.isArray(rawStudy?.valueReflectionQuestions)
    ? rawStudy.valueReflectionQuestions.filter((item: unknown) => typeof item === 'string')
    : [
        'How well do our concept values align with your concept values?',
        'Which values feel missing or underrepresented in our concept?',
        'What would you change to better match your values?',
      ];
  const benefits = Array.isArray(rawStudy?.benefits) ? rawStudy.benefits.filter((item: unknown) => typeof item === 'string') : [];
  const limitations = Array.isArray(rawStudy?.limitations) ? rawStudy.limitations.filter((item: unknown) => typeof item === 'string') : [];
  const cvtQuestions = normalizeLikertQuestions(rawStudy?.cvtQuestions);

  const studyBase: Study = {
    id: rawStudy?.id ?? createId(),
    name: typeof rawStudy?.name === 'string' ? rawStudy.name : 'Untitled Study',
    description: typeof rawStudy?.description === 'string' ? rawStudy.description : '',
    valueProposition: typeof rawStudy?.valueProposition === 'string' ? rawStudy.valueProposition : '',
    conceptContext: typeof rawStudy?.conceptContext === 'string' ? rawStudy.conceptContext : '',
    valuePropositionSlides: normalizeSlideAssets(rawStudy?.valuePropositionSlides),
    contextSlides: normalizeSlideAssets(rawStudy?.contextSlides),
    cvtQuestions,
    conceptValues,
    valueReflectionQuestions,
    benefits,
    limitations,
    participants: [],
    createdAt: rawStudy?.createdAt ?? new Date().toISOString(),
    updatedAt: rawStudy?.updatedAt ?? new Date().toISOString(),
  };

  studyBase.participants = Array.isArray(rawStudy?.participants)
    ? rawStudy.participants.map((participant: any) => {
        const legacyLikert = Array.isArray(participant?.cvtResponses) ? participant.cvtResponses : [];
        const existingLikert = Array.isArray(participant?.likertResponses) ? participant.likertResponses : [];
        const likertResponses = cvtQuestions.map((question: LikertQuestion, index: number) => {
          const existing = existingLikert.find((response: any) => response?.questionId === question.id)
            ?? existingLikert.find((response: any) => response?.question === question.prompt)
            ?? legacyLikert.find((response: any) => response?.question === question.prompt)
            ?? existingLikert[index]
            ?? legacyLikert[index];
          return {
            id: existing?.id ?? createId(),
            questionId: question.id,
            question: question.prompt,
            rating: typeof existing?.rating === 'number' ? existing.rating : 3,
          };
        });

        const legacyBenefits = Array.isArray(participant?.benefits)
          ? participant.benefits.map((item: any) => item?.title).filter((item: unknown) => typeof item === 'string')
          : [];
        const legacyLimitations = Array.isArray(participant?.limitations)
          ? participant.limitations.map((item: any) => item?.title).filter((item: unknown) => typeof item === 'string')
          : [];

        return {
          id: participant?.id ?? createId(),
          name: typeof participant?.name === 'string' ? participant.name : 'Unnamed participant',
          currentTool: typeof participant?.currentTool === 'string' ? participant.currentTool : '',
          participantConcept: typeof participant?.participantConcept === 'string' ? participant.participantConcept : '',
          participantValues: Array.isArray(participant?.participantValues)
            ? participant.participantValues.filter((item: unknown) => typeof item === 'string')
            : [],
          likertResponses,
          benefitRanking: Array.isArray(participant?.benefitRanking)
            ? participant.benefitRanking.filter((item: unknown) => typeof item === 'string')
            : (legacyBenefits.length > 0 ? legacyBenefits : benefits),
          limitationRanking: Array.isArray(participant?.limitationRanking)
            ? participant.limitationRanking.filter((item: unknown) => typeof item === 'string')
            : (legacyLimitations.length > 0 ? legacyLimitations : limitations),
          valueReflectionResponses: valueReflectionQuestions.map((prompt: string) => {
            const existing = Array.isArray(participant?.valueReflectionResponses)
              ? participant.valueReflectionResponses.find((item: any) => item?.prompt === prompt)
              : undefined;

            return {
              id: typeof existing?.id === 'string' ? existing.id : createId(),
              prompt,
              response: typeof existing?.response === 'string' ? existing.response : '',
            };
          }),
          createdAt: participant?.createdAt ?? new Date().toISOString(),
          updatedAt: participant?.updatedAt ?? participant?.createdAt ?? new Date().toISOString(),
        };
      })
    : [];

  return studyBase;
};

const migrateToV1 = (raw: any): CompassStorage => {
  if (raw?.version === 1 && Array.isArray(raw.studies)) {
    return {
      version: 1,
      studies: raw.studies.map((study: any) => normalizeStudy(study)),
    };
  }

  if (Array.isArray(raw)) {
    return {
      version: 1,
      studies: raw,
    };
  }

  return DEFAULT_STORAGE;
};

const safeParse = (value: string | null): CompassStorage => {
  if (!value) {
    return DEFAULT_STORAGE;
  }

  try {
    const parsed = JSON.parse(value);
    return migrateToV1(parsed);
  } catch {
    return DEFAULT_STORAGE;
  }
};

const getRawStorage = async (): Promise<CompassStorage> => {
  if (typeof window === 'undefined') {
    return DEFAULT_STORAGE;
  }

  const response = await fetch('/api/storage', {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Unable to load storage');
  }

  const data = (await response.json()) as CompassStorage;
  return migrateToV1(data);
};

const setRawStorage = async (storage: CompassStorage): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  const response = await fetch('/api/storage', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(storage),
  });

  if (!response.ok) {
    throw new Error('Unable to save storage');
  }
};

export const loadStorage = async (): Promise<CompassStorage> => getRawStorage();

export const saveStorage = async (storage: CompassStorage): Promise<void> => setRawStorage(storage);

export const loadStudies = async (): Promise<Study[]> => (await loadStorage()).studies;

export const saveStudies = async (studies: Study[]): Promise<void> => {
  await saveStorage({ version: 1, studies });
};

export const findStudy = async (id: string): Promise<Study | undefined> => {
  return (await loadStudies()).find((study) => study.id === id);
};

export const updateStudy = async (updatedStudy: Study): Promise<Study[]> => {
  const studies = await loadStudies();
  const next = studies.map((study) => (study.id === updatedStudy.id ? updatedStudy : study));
  await saveStudies(next);
  return next;
};

export const addStudy = async (study: Study): Promise<Study[]> => {
  const studies = await loadStudies();
  const next = [...studies, study];
  await saveStudies(next);
  return next;
};

export const deleteStudy = async (id: string): Promise<Study[]> => {
  const studies = await loadStudies();
  const next = studies.filter((study) => study.id !== id);
  await saveStudies(next);
  return next;
};

export const deleteParticipant = async (studyId: string, participantId: string): Promise<Study | undefined> => {
  const studies = await loadStudies();
  const study = studies.find((s) => s.id === studyId);
  if (!study) return undefined;
  const updated: Study = {
    ...study,
    participants: study.participants.filter((p) => p.id !== participantId),
    updatedAt: new Date().toISOString(),
  };
  await saveStudies(studies.map((s) => (s.id === studyId ? updated : s)));
  return updated;
};

export const importStorageJson = async (jsonData: string): Promise<CompassStorage> => {
  const parsed = JSON.parse(jsonData);
  const migrated = migrateToV1(parsed);
  await saveStorage(migrated);
  return migrated;
};

export const exportStorageJson = (studies: Study[]): string => {
  return JSON.stringify({ version: 1, studies }, null, 2);
};

export const clearStorage = async (): Promise<void> => {
  await saveStorage(DEFAULT_STORAGE);
};
