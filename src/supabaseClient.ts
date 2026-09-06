import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Provide a valid dummy endpoint if environment variables are not yet provided
export const supabaseUrl = (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('http')) 
  ? rawUrl 
  : 'https://placeholder-project.supabase.co';

export const supabaseAnonKey = (rawKey && typeof rawKey === 'string' && rawKey.length > 10) 
  ? rawKey 
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder_token';

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  typeof rawUrl === 'string' &&
  rawUrl.startsWith('http') &&
  !rawUrl.includes('placeholder')
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface SupabaseDiagnosticResult {
  isConfigured: boolean;
  url: string;
  keyMasked: string;
  status: 'checking' | 'connected' | 'error';
  message: string;
  details?: string;
  tableStatus?: {
    userAccounts: boolean;
    communityQuestions: boolean;
    textbookProblems: boolean;
  };
}

export async function testSupabaseConnection(): Promise<SupabaseDiagnosticResult> {
  const masked = rawKey.length > 8 
    ? `${rawKey.slice(0, 6)}...${rawKey.slice(-4)}` 
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
    // 5초 타임아웃으로 빠른 테스트
    const timeoutPromise = new Promise<{ timeout: true }>((_, reject) =>
      setTimeout(() => reject(new Error('네트워크 연결 시간 초과 (5초). URL 도메인을 확인해주세요.')), 5000)
    );

    const queryPromise = (async () => {
      // 1. 단일 연결 테스트 (user_accounts 조회)
      const { error: err1 } = await supabase.from('user_accounts').select('id').limit(1);
      if (err1 && (err1.message?.toLowerCase().includes('fetch') || err1.message?.toLowerCase().includes('failed to fetch'))) {
        return { err1, err2: null, err3: null };
      }
      // 2. community_questions 확인
      const { error: err2 } = await supabase.from('community_questions').select('id').limit(1);
      // 3. textbook_problems 확인
      const { error: err3 } = await supabase.from('textbook_problems').select('id').limit(1);

      return { err1, err2, err3 };
    })();

    const result = await Promise.race([queryPromise, timeoutPromise]) as {
      err1: any;
      err2: any;
      err3: any;
    };

    const isFetchError = (msg?: string) =>
      Boolean(msg && (msg.toLowerCase().includes('fetch failed') || msg.toLowerCase().includes('failed to fetch')));

    if (result.err1 && isFetchError(result.err1.message)) {
      return {
        isConfigured: true,
        url: supabaseUrl,
        keyMasked: masked,
        status: 'error',
        message: '서버 주소 연결 실패 (도메인을 찾을 수 없음 또는 오타)',
        details: `${supabaseUrl} 주소로 접속할 수 없습니다. Supabase 대시보드 [Project Settings] -> [API]의 'Project URL'을 복사하여 환경변수에 등록해주세요.`,
      };
    }

    if (result.err1 && (result.err1.code === 'PGRST204' || result.err1.message?.includes('relation "public.user_accounts" does not exist'))) {
      return {
        isConfigured: true,
        url: supabaseUrl,
        keyMasked: masked,
        status: 'error',
        message: 'Supabase 연결은 되었으나 테이블이 생성되지 않았습니다.',
        details: 'SQL Editor에서 제공해 드린 통합 테이블 생성 SQL을 실행해주세요.',
      };
    }

    if (result.err1 && (result.err1.code === '42501' || result.err1.message?.includes('permission denied'))) {
      return {
        isConfigured: true,
        url: supabaseUrl,
        keyMasked: masked,
        status: 'error',
        message: 'RLS(행 단위 보안) 권한 오류: 테이블 읽기/쓰기가 차단되었습니다.',
        details: 'SQL Editor에서 RLS 정책 생성 스크립트를 실행해주세요.',
      };
    }

    return {
      isConfigured: true,
      url: supabaseUrl,
      keyMasked: masked,
      status: 'connected',
      message: 'Supabase 클라우드 데이터베이스에 정상적으로 연결되었습니다!',
      tableStatus: {
        userAccounts: !result.err1,
        communityQuestions: !result.err2,
        textbookProblems: !result.err3,
      },
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      url: supabaseUrl,
      keyMasked: masked,
      status: 'error',
      message: '연결 실패: ' + (err.message || '알 수 없는 네트워크 오류'),
      details: 'URL 주소의 오타 또는 Supabase 프로젝트 일시중지(Paused) 상태를 확인해주세요.',
    };
  }
}



