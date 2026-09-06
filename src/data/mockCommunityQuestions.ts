import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { CommunityQuestion } from '../types';

export const INITIAL_MOCK_QUESTIONS: CommunityQuestion[] = [];
export const INITIAL_QUESTIONS: CommunityQuestion[] = INITIAL_MOCK_QUESTIONS;
export const mockCommunityQuestions: CommunityQuestion[] = INITIAL_MOCK_QUESTIONS;

const STORAGE_KEY = 'puleo_community_questions_v3';

export function getStoredQuestions(): CommunityQuestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredQuestions(questions: CommunityQuestion[] | any): void {
  try {
    if (Array.isArray(questions)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
    }
  } catch (err) {
    console.error('Failed to save questions:', err);
  }
}

export async function fetchQuestionsFromDB(): Promise<CommunityQuestion[]> {
  try {
    if (!isSupabaseConfigured) return getStoredQuestions();

    const { data, error } = await supabase
      .from('qna_questions')
      .select('*')
      .order('id', { ascending: false });

    if (error || !Array.isArray(data)) return getStoredQuestions();
    return data as any;
  } catch {
    return getStoredQuestions();
  }
}

export async function saveTeacherAnswer(questionId: number | string, answerContent: string, answerImageUrl?: string) {
  try {
    if (isSupabaseConfigured) {
      await supabase
        .from('qna_questions')
        .update({
          answer_content: answerContent,
          answer_image_url: answerImageUrl || null,
          status: '답변완료',
        })
        .eq('id', questionId);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export default mockCommunityQuestions;

