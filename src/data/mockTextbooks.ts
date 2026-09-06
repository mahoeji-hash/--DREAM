import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { TextbookInfo, ProblemItem } from '../types';
import {
  idbGet,
  idbSet,
  safeLocalStorageGet,
  safeLocalStorageSet,
  cleanLegacyStorageKeys,
} from '../services/storageService';

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

const PROBLEMS_STORAGE_KEY = 'puleo_dream_stored_problems_v9';

// Helper to sanitize problems for localStorage when quota is tight
function sanitizeProblemsForLocalStorage(problems: ProblemItem[]): ProblemItem[] {
  return problems.map((p) => {
    // If solutionImage is a massive base64 string (>30KB), strip it in localStorage copy
    // (the full image remains safely in IndexedDB and Supabase)
    if (p.solutionImage && p.solutionImage.startsWith('data:') && p.solutionImage.length > 30000) {
      const { solutionImage: _unused, ...rest } = p;
      return rest as ProblemItem;
    }
    return p;
  });
}

export const getStoredProblems = (): ProblemItem[] => {
  // Proactively clean legacy keys on first read
  cleanLegacyStorageKeys();
  const list = safeLocalStorageGet<ProblemItem[]>(PROBLEMS_STORAGE_KEY, []);
  return Array.isArray(list) ? list : [];
};

export const saveStoredProblems = (problems: ProblemItem[] | any): void => {
  if (!Array.isArray(problems)) return;

  // 1. Asynchronously persist full data (including full images) to IndexedDB with virtually unlimited storage
  idbSet(PROBLEMS_STORAGE_KEY, problems).catch(() => {});

  // 2. Persist to localStorage with multi-stage quota recovery and sanitization
  safeLocalStorageSet(
    PROBLEMS_STORAGE_KEY,
    problems,
    sanitizeProblemsForLocalStorage
  );
};

// Async hydration from IndexedDB on application boot
export async function hydrateProblemsFromIndexedDB(): Promise<ProblemItem[] | null> {
  try {
    const idbData = await idbGet<ProblemItem[]>(PROBLEMS_STORAGE_KEY);
    if (Array.isArray(idbData) && idbData.length > 0) {
      return idbData;
    }
  } catch {
    // Fall back to localStorage
  }
  return null;
}

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

