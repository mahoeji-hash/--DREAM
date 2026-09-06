import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { TextbookInfo, ProblemItem } from '../types';

export const TEXTBOOKS: TextbookInfo[] = [
  // Math Textbook: 미래엔 공통수학 2
  {
    id: 'tb-math-mr-h2',
    name: '미래엔 공통수학 2',
    publisher: '미래엔',
    subject: 'math',
    grade: 'high_1',
    category: '교과서',
    color: '#2563EB',
    badgeText: '공통수학 2 (미래엔)',
    totalChapters: 3,
  },

  // Science Textbook: 비상교육 통합과학 2
  {
    id: 'tb-sci-bs-h2',
    name: '비상교육 통합과학 2',
    publisher: '비상교육',
    subject: 'science',
    grade: 'high_1',
    category: '교과서',
    color: '#10B981',
    badgeText: '통합과학 2 (비상교육)',
    totalChapters: 3,
  },
];

export const INITIAL_CURRICULUM_PROBLEMS: ProblemItem[] = [];

const PROBLEMS_STORAGE_KEY = 'puleo_dream_stored_problems_v8';

export const getStoredProblems = (): ProblemItem[] => {
  try {
    const raw = localStorage.getItem(PROBLEMS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveStoredProblems = (problems: ProblemItem[] | any): void => {
  try {
    if (Array.isArray(problems)) {
      localStorage.setItem(PROBLEMS_STORAGE_KEY, JSON.stringify(problems));
    }
  } catch (err) {
    console.error('Failed to save problems to storage:', err);
  }
};

export async function fetchProblemsFromDB(): Promise<ProblemItem[]> {
  try {
    if (!isSupabaseConfigured) return getStoredProblems();

    const { data, error } = await supabase
      .from('textbook_problems')
      .select('*')
      .order('id', { ascending: false });

    if (error || !Array.isArray(data)) return getStoredProblems();
    return data as any;
  } catch {
    return getStoredProblems();
  }
}
