import { createClient } from '@supabase/supabase-js';

// Default Supabase project configuration provided for 풀어 DREAM
const DEFAULT_SUPABASE_URL = 'https://pxucdmbdigykrwnpnvpq.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_4O_ZnLPfkqnHoCzfQHv5oA_R7nhEkzM';

function normalizeSupabaseUrl(rawUrl: string): string {
  return rawUrl
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

// Read Supabase environment variables from Vite or Next.js prefix, falling back to configured project
const rawEnvUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  DEFAULT_SUPABASE_URL
).trim();

const envUrl = normalizeSupabaseUrl(rawEnvUrl);

const envKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_ANON_KEY
).trim();

export const isSupabaseConfigured = Boolean(
  envUrl &&
  envKey &&
  typeof envUrl === 'string' &&
  envUrl.startsWith('http') &&
  !envUrl.includes('placeholder') &&
  envKey.length > 8
);

export const supabaseUrl = isSupabaseConfigured
  ? envUrl
  : 'https://placeholder-project.supabase.co';

export const supabaseAnonKey = isSupabaseConfigured
  ? envKey
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder_token';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const SUPABASE_IMAGES_BUCKET = 'images';

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isValidUuid(value?: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

export interface SupabaseDiagnosticResult {
  isConfigured: boolean;
  url: string;
  keyMasked: string;
  status: 'checking' | 'connected' | 'error';
  message: string;
  details?: string;
  tableStatus?: {
    users: boolean;
    textbookProblems: boolean;
    questions: boolean;
    answers: boolean;
    imagesBucket: boolean;
  };
}

export async function testSupabaseConnection(): Promise<SupabaseDiagnosticResult> {
  const masked = envKey.length > 8
    ? `${envKey.slice(0, 8)}...${envKey.slice(-4)}`
    : '(키 없음)';

  if (!isSupabaseConfigured) {
    return {
      isConfigured: false,
      url: supabaseUrl,
      keyMasked: masked,
      status: 'error',
      message: 'Supabase URL 또는 API 키 환경변수가 설정되지 않았습니다.',
      details: 'VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 확인해주세요.',
    };
  }

  try {
    const timeoutPromise = new Promise<{ timeout: true }>((_, reject) =>
      setTimeout(() => reject(new Error('네트워크 연결 시간 초과 (5초). URL 도메인을 확인해주세요.')), 5000)
    );

    const queryPromise = (async () => {
      const [resUsers, resProblems, resQuestions, resAnswers, resImages] = await Promise.all([
        supabase.from('users').select('id').limit(1),
        supabase.from('textbook_problems').select('id').limit(1),
        supabase.from('questions').select('id').limit(1),
        supabase.from('answers').select('id').limit(1),
        supabase.storage.from(SUPABASE_IMAGES_BUCKET).list('', { limit: 1 }),
      ]);

      return {
        errUsers: resUsers.error,
        errProblems: resProblems.error,
        errQuestions: resQuestions.error,
        errAnswers: resAnswers.error,
        errImages: resImages.error,
      };
    })();

    const result = (await Promise.race([queryPromise, timeoutPromise])) as {
      errUsers: any;
      errProblems: any;
      errQuestions: any;
      errAnswers: any;
      errImages: any;
    };

    const isFetchError = (msg?: string) =>
      Boolean(msg && (msg.toLowerCase().includes('fetch failed') || msg.toLowerCase().includes('failed to fetch')));

    if (result.errUsers && isFetchError(result.errUsers.message)) {
      return {
        isConfigured: true,
        url: supabaseUrl,
        keyMasked: masked,
        status: 'error',
        message: '서버 주소 연결 실패 (도메인을 찾을 수 없음 또는 네트워크 오류)',
        details: `${supabaseUrl} 주소로 접속할 수 없습니다.`,
      };
    }

    const firstPermErr = [result.errUsers, result.errProblems, result.errQuestions, result.errAnswers].find(
      (e) => e && (e.code === '42501' || e.message?.toLowerCase().includes('permission denied'))
    );
    if (firstPermErr) {
      return {
        isConfigured: true,
        url: supabaseUrl,
        keyMasked: masked,
        status: 'error',
        message: 'RLS(행 단위 보안) 권한 오류: 테이블 읽기/쓰기 정책을 확인해주세요.',
        details: firstPermErr.message,
      };
    }

    const tableStatus = {
      users: !result.errUsers,
      textbookProblems: !result.errProblems,
      questions: !result.errQuestions,
      answers: !result.errAnswers,
      imagesBucket: !result.errImages,
    };

    const allTablesOk =
      tableStatus.users &&
      tableStatus.textbookProblems &&
      tableStatus.questions &&
      tableStatus.answers;

    if (!allTablesOk) {
      const missing: string[] = [];
      if (!tableStatus.users) missing.push('users');
      if (!tableStatus.textbookProblems) missing.push('textbook_problems');
      if (!tableStatus.questions) missing.push('questions');
      if (!tableStatus.answers) missing.push('answers');

      return {
        isConfigured: true,
        url: supabaseUrl,
        keyMasked: masked,
        status: 'error',
        message: `일부 테이블(${missing.join(', ')}) 접근에 실패했습니다.`,
        details: '테이블 이름 및 RLS 정책을 확인해주세요.',
        tableStatus,
      };
    }

    return {
      isConfigured: true,
      url: supabaseUrl,
      keyMasked: masked,
      status: 'connected',
      message: 'Supabase 클라우드 DB(users, textbook_problems, questions, answers) 및 Storage(images)와 정상 연결되었습니다!',
      tableStatus,
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      url: supabaseUrl,
      keyMasked: masked,
      status: 'error',
      message: '연결 실패: ' + (err.message || '알 수 없는 네트워크 오류'),
      details: 'URL 주소 또는 Supabase 프로젝트 상태를 확인해주세요.',
    };
  }
}
