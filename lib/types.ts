export type CardType = 'benefit' | 'limitation' | 'capability';

export type SlideAsset = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  selectedSlides: string;
  uploadedAt: string;
};

export type Card = {
  id: string;
  title: string;
  description: string;
  type: CardType;
  order: number;
};

export type Bucket = {
  id: string;
  title: string;
  order: number;
  description?: string;
};

export type LikertQuestion = {
  id: string;
  prompt: string;
  lowLabel: string;
  highLabel: string;
};

export type CVTResponse = {
  id: string;
  questionId: string;
  question: string;
  rating: number;
};

export type BehavioralDecision = {
  id: string;
  prompt: string;
  choice: string;
};

export type ValueReflectionResponse = {
  id: string;
  prompt: string;
  response: string;
};

export type ParticipantSession = {
  id: string;
  name: string;
  currentTool: string;
  participantConcept: string;
  participantValues: string[];
  likertResponses: CVTResponse[];
  benefitRanking: string[];
  limitationRanking: string[];
  valueReflectionResponses: ValueReflectionResponse[];
  createdAt: string;
  updatedAt: string;
};

export type Study = {
  id: string;
  name: string;
  description: string;
  valueProposition: string;
  conceptContext: string;
  valuePropositionSlides: SlideAsset[];
  contextSlides: SlideAsset[];
  cvtQuestions: LikertQuestion[];
  conceptValues: string[];
  valueReflectionQuestions: string[];
  benefits: string[];
  limitations: string[];
  participants: ParticipantSession[];
  createdAt: string;
  updatedAt: string;
};

export type CompassStorage = {
  version: 1;
  studies: Study[];
};

export const DEFAULT_BUCKETS: Bucket[] = [
  { id: 'bucket-core', title: 'Core', order: 0, description: 'Primary product fit or capability' },
  { id: 'bucket-support', title: 'Support', order: 1, description: 'Support areas, add-ons, or tooling' },
  { id: 'bucket-risk', title: 'Risk / Concern', order: 2, description: 'Potential issues or boundaries' },
];

const createIdBase = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const createStudy = (name: string, description = ''): Study => ({
  id: createIdBase(),
  name,
  description,
  valueProposition: '',
  conceptContext: '',
  valuePropositionSlides: [],
  contextSlides: [],
  cvtQuestions: [],
  conceptValues: [],
  valueReflectionQuestions: [
    'How well do our concept values align with your concept values?',
    'Which values feel missing or underrepresented in our concept?',
    'What would you change to better match your values?',
  ],
  benefits: [],
  limitations: [],
  participants: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const createParticipantSession = (
  name: string,
  currentTool: string,
  cvtQuestions: LikertQuestion[],
  studyBenefits: string[] = [],
  studyLimitations: string[] = [],
  valueReflectionQuestions: string[] = [
    'How well do our concept values align with your concept values?',
    'Which values feel missing or underrepresented in our concept?',
    'What would you change to better match your values?',
  ],
): ParticipantSession => ({
  id: createIdBase(),
  name,
  currentTool,
  participantConcept: '',
  participantValues: [],
  likertResponses: cvtQuestions.map((question) => ({
    id: createIdBase(),
    questionId: question.id,
    question: question.prompt,
    rating: 3,
  })),
  benefitRanking: [...studyBenefits],
  limitationRanking: [...studyLimitations],
  valueReflectionResponses: valueReflectionQuestions.map((prompt) => ({
    id: createIdBase(),
    prompt,
    response: '',
  })),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
