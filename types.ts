
export interface DiagnosisResult {
  cropName: string;
  symptoms: string[];
  signs: string[];
  isBiotic: boolean;
  confidence: number;
  diseaseName: string;
  deductionLogic: string;
  category: 'Disease' | 'Pest' | 'Nutrient' | 'Abiotic';
  lifecycle?: string;
  spreadMethod?: string;
  nutrientDetails?: {
    element: string;
    description: string;
  };
  pestDetails?: {
    pestName: string;
    characteristics: string[];
  };
  management: {
    cultural: string;
    biological?: string;
    chemical?: string;
    prevention: string[];
  };
  recommendations: {
    safe: string;
    effective: string;
    practical: string;
    locallyAvailable: string;
    ipmStrategy: string;
  };
  knowledgeBankLink: string;
}

export enum AppStep {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  RESULT = 'RESULT'
}

export interface Flashcard {
  id: string;
  front: string; // Text or Image Path
  back: string;  // Correct diagnosis/fact
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  iconName: string;
  lessons: {
    title: string;
    content: string;
    tip?: string;
  }[];
  flashcards: Flashcard[];
  quizzes: QuizQuestion[];
  localDataPath: string; // Placeholder for file fetching logic
}
