import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { CommunityQuestion } from '../types';
import {
  idbSet,
  safeLocalStorageGet,
  safeLocalStorageSet,
} from '../services/storageService';

export const INITIAL_MOCK_QUESTIONS: CommunityQuestion[] = [];
export const INITIAL_QUESTIONS: CommunityQuestion[] = INITIAL_MOCK_QUESTIONS;
export const mockCommunityQuestions: CommunityQuestion[] = INITIAL_MOCK_QUESTIONS;

const STORAGE_KEY = 'puleo_community_questions_v3';

export function getStoredQuestions(): CommunityQuestion[] {
  const list = safeLocalStorageGet<CommunityQuestion[]>(STORAGE_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function saveStoredQuestions(questions: CommunityQuestion[] | any): void {
  if (!Array.isArray(questions)) return;

  idbSet(STORAGE_KEY, questions).catch(() => {});

  safeLocalStorageSet(STORAGE_KEY, questions, (qs) => {
    return qs.map((q: any) => {
      if (q.imageUrl && q.imageUrl.startsWith('data:') && q.imageUrl.length > 30000) {
        const { imageUrl: _unused, ...rest } = q;
        return rest as CommunityQuestion;
      }
      return q;
    });
  });
}


export async function fetchQuestionsFromDB(): Promise<CommunityQuestion[]> {
  try {
    if (!isSupabaseConfigured) return getStoredQuestions();

    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) return getStoredQuestions();
    return data as any;
  } catch {
    return getStoredQuestions();
  }
}

export async function saveTeacherAnswer(questionId: string, answerContent: string, answerImageUrl?: string) {
  try {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('answers')
        .insert({
          question_id: questionId,
          teacher_name: '선생님',
          summary: answerContent,
          solution_image_url: answerImageUrl || null,
        });
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export default mockCommunityQuestions;

