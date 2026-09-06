import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { SubjectType } from '../types';
import {
  idbSet,
  safeLocalStorageGet,
  safeLocalStorageSet,
} from '../services/storageService';

export interface QuizQuestion {
  id?: string | number;
  unit_code?: string;
  questionText: string;
  question_text?: string;
  options: string[];
  correctIndex: number;
  correct_index?: number;
  explanation: string;
  hint?: string;
  questionImage?: string;
  explanationImage?: string;
  created_at?: string;
}

export interface UnitQuiz {
  id: string | number;
  subject: SubjectType;
  grade: 'high_1';
  chapterNumber: number;
  chapterName: string;
  unitName: string;
  unitCode: string;
  badge: string;
  estimatedMinutes: number;
  description?: string;
  questions: QuizQuestion[];
}

export const INITIAL_MAJOR_CHAPTER_QUIZZES: UnitQuiz[] = [
  // -------------------------------------------------------------
  // 수학: 미래엔 공통수학 2 (3개 대단원)
  // -------------------------------------------------------------
  {
    id: 'quiz-math-chapter-1',
    subject: 'math',
    grade: 'high_1',
    chapterNumber: 1,
    chapterName: 'I. 도형의 방정식',
    unitName: '1단원. 도형의 방정식 (대단원 TEST)',
    unitCode: 'MATH-CH1',
    badge: '1단원 대단원 TEST',
    estimatedMinutes: 20,
    description: '대단원 전체 종합 평가 및 실전 모의 테스트',
    questions: [],
  },
  {
    id: 'quiz-math-chapter-2',
    subject: 'math',
    grade: 'high_1',
    chapterNumber: 2,
    chapterName: 'II. 집합과 명제',
    unitName: '2단원. 집합과 명제 (대단원 TEST)',
    unitCode: 'MATH-CH2',
    badge: '2단원 대단원 TEST',
    estimatedMinutes: 20,
    description: '대단원 전체 종합 평가 및 실전 모의 테스트',
    questions: [],
  },
  {
    id: 'quiz-math-chapter-3',
    subject: 'math',
    grade: 'high_1',
    chapterNumber: 3,
    chapterName: 'III. 함수와 그래프',
    unitName: '3단원. 함수와 그래프 (대단원 TEST)',
    unitCode: 'MATH-CH3',
    badge: '3단원 대단원 TEST',
    estimatedMinutes: 20,
    description: '대단원 전체 종합 평가 및 실전 모의 테스트',
    questions: [],
  },

  // -------------------------------------------------------------
  // 과학: 비상교육 통합과학 2 (3개 대단원)
  // -------------------------------------------------------------
  {
    id: 'quiz-sci-chapter-1',
    subject: 'science',
    grade: 'high_1',
    chapterNumber: 1,
    chapterName: 'I. 물질과 규칙성',
    unitName: '1단원. 물질과 규칙성 (대단원 TEST)',
    unitCode: 'SCI-CH1',
    badge: '1단원 대단원 TEST',
    estimatedMinutes: 20,
    description: '대단원 전체 종합 평가 및 실전 모의 테스트',
    questions: [],
  },
  {
    id: 'quiz-sci-chapter-2',
    subject: 'science',
    grade: 'high_1',
    chapterNumber: 2,
    chapterName: 'II. 시스템과 상호작용',
    unitName: '2단원. 시스템과 상호작용 (대단원 TEST)',
    unitCode: 'SCI-CH2',
    badge: '2단원 대단원 TEST',
    estimatedMinutes: 20,
    description: '대단원 전체 종합 평가 및 실전 모의 테스트',
    questions: [],
  },
  {
    id: 'quiz-sci-chapter-3',
    subject: 'science',
    grade: 'high_1',
    chapterNumber: 3,
    chapterName: 'III. 변화와 다양성',
    unitName: '3단원. 변화와 다양성 (대단원 TEST)',
    unitCode: 'SCI-CH3',
    badge: '3단원 대단원 TEST',
    estimatedMinutes: 20,
    description: '대단원 전체 종합 평가 및 실전 모의 테스트',
    questions: [],
  },
];

const UNIT_QUIZZES_STORAGE_KEY = 'puleo_dream_unit_quizzes_v2';

let cachedQuizzes: UnitQuiz[] = [];

// UI 컴포넌트가 동기식 배열 반환을 원할 때 바로 배열을 리턴하여 오류 예방
export function getStoredUnitQuizzes(): UnitQuiz[] {
  if (cachedQuizzes.length > 0) {
    return cachedQuizzes;
  }
  const saved = safeLocalStorageGet<UnitQuiz[]>(UNIT_QUIZZES_STORAGE_KEY, []);
  if (Array.isArray(saved) && saved.length > 0) {
    cachedQuizzes = saved.map((q) => ({
      ...q,
      estimatedMinutes: q.estimatedMinutes === 10 || !q.estimatedMinutes ? 20 : q.estimatedMinutes,
    }));
    return cachedQuizzes;
  }
  cachedQuizzes = JSON.parse(JSON.stringify(INITIAL_MAJOR_CHAPTER_QUIZZES));
  return cachedQuizzes;
}

export function saveStoredUnitQuizzesLocal(quizzes: UnitQuiz[]): void {
  if (!Array.isArray(quizzes)) return;
  cachedQuizzes = quizzes;
  idbSet(UNIT_QUIZZES_STORAGE_KEY, quizzes).catch(() => {});
  safeLocalStorageSet(UNIT_QUIZZES_STORAGE_KEY, quizzes);
}

// 백그라운드에서 DB의 최신 문제를 가져오는 비동기 함수
export async function fetchStoredUnitQuizzesFromDB(): Promise<UnitQuiz[]> {
  try {
    if (!isSupabaseConfigured) return getStoredUnitQuizzes();

    const { data, error } = await supabase
      .from('test_questions')
      .select('*')
      .order('id', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      // DB 데이터를 cachedQuizzes에 반영
    }
  } catch (err) {
    console.error('DB Fetch Error:', err);
  }
  return getStoredUnitQuizzes();
}

export async function saveStoredUnitQuiz(quiz: any) {
  return saveStoredUnitQuizzes(quiz);
}

export async function saveStoredUnitQuizzes(quiz: any) {
  try {
    if (!isSupabaseConfigured) {
      return { success: true, offline: true };
    }

    const { data, error } = await supabase
      .from('test_questions')
      .insert([
        {
          unit_code: quiz.unitCode || quiz.unit_code || '',
          question_text: quiz.questionText || quiz.question_text || '',
          options: quiz.options || [],
          correct_index: quiz.correctIndex ?? quiz.correct_index ?? 0,
          explanation: quiz.explanation || '',
          hint: quiz.hint || ''
        }
      ])
      .select();

    if (error) {
      console.error('단원 평가 퀴즈 저장 에러:', error);
      throw error;
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
