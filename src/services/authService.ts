import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { UserAccount, UserProfile, GradeType } from '../types';

const STORAGE_ACCOUNTS_KEY = 'puleo_dream_user_accounts_v3';

export const ADMIN_CREATION_SECRET_KEY = 'dream2026';

// 로컬 스토리지에 캐시된 계정 목록 반환 (동기 함수)
export const getStoredAccounts = (): UserAccount[] => {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveAccountsToLocalStorage = (accounts: UserAccount[]): void => {
  try {
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save accounts to storage:', err);
  }
};

// 전체 계정 목록 조회 (비동기 DB)
export const fetchStoredAccountsFromDB = async (): Promise<UserAccount[]> => {
  try {
    if (!isSupabaseConfigured) {
      return getStoredAccounts();
    }
    const { data, error } = await supabase.from('user_accounts').select('*');
    if (error || !Array.isArray(data)) return getStoredAccounts();

    const accounts: UserAccount[] = data.map((acc) => ({
      id: acc.id,
      loginId: acc.login_id,
      passwordHash: acc.password_hash,
      role: acc.role,
      nickname: acc.nickname,
      schoolName: acc.school_name,
      grade: acc.grade,
      avatarSeed: acc.avatar_seed,
      createdAt: acc.created_at,
    }));
    saveAccountsToLocalStorage(accounts);
    return accounts;
  } catch {
    return getStoredAccounts();
  }
};

// 계정 삭제
export const deleteAccountById = async (accountId: string): Promise<boolean> => {
  try {
    const local = getStoredAccounts();
    const filtered = local.filter((a) => a.id !== accountId && a.loginId !== accountId);
    saveAccountsToLocalStorage(filtered);

    if (isSupabaseConfigured) {
      await supabase
        .from('user_accounts')
        .delete()
        .or(`id.eq.${accountId},login_id.eq.${accountId}`);
    }

    return true;
  } catch {
    return false;
  }
};

// 회원가입 (Supabase DB 저장 + LocalStorage 백업)
export const registerAccount = async (data: {
  loginId: string;
  password: string;
  role: 'student' | 'admin';
  nickname: string;
  schoolName: string;
  grade: GradeType;
  adminSecretKey?: string;
}): Promise<{ success: boolean; error?: string; account?: UserAccount }> => {
  const loginIdClean = data.loginId.trim();
  const passwordClean = data.password.trim();
  const nicknameClean = data.nickname.trim();
  const schoolNameClean = data.schoolName.trim() || '우리학교';

  if (!loginIdClean || loginIdClean.length < 3) {
    return { success: false, error: '아이디는 최소 3글자 이상이어야 합니다.' };
  }

  if (!passwordClean || passwordClean.length < 4) {
    return { success: false, error: '비밀번호는 최소 4글자 이상이어야 합니다.' };
  }

  if (!nicknameClean) {
    return { success: false, error: '사용할 닉네임(또는 성함)을 입력해주세요.' };
  }

  if (data.role === 'admin') {
    if (!data.adminSecretKey || data.adminSecretKey.trim() !== ADMIN_CREATION_SECRET_KEY) {
      return {
        success: false,
        error: '관리자 계정 가입을 위한 보안 인증 코드가 올바르지 않습니다.',
      };
    }
  }

  const localAccounts = getStoredAccounts();
  const localExisting = localAccounts.find(
    (acc) => acc.loginId.toLowerCase() === loginIdClean.toLowerCase()
  );
  if (localExisting) {
    return { success: false, error: '이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.' };
  }

  const newAccountId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const createdAccount: UserAccount = {
    id: newAccountId,
    loginId: loginIdClean,
    passwordHash: passwordClean,
    role: data.role,
    nickname: nicknameClean,
    schoolName: schoolNameClean,
    grade: data.grade,
    avatarSeed: data.role === 'admin' ? 'admin_avatar' : 'student_avatar',
    createdAt: new Date().toISOString(),
  };

  // 로컬 스토리지 선반영
  saveAccountsToLocalStorage([...localAccounts, createdAccount]);

  // Supabase 연동 시 DB 저장
  if (isSupabaseConfigured) {
    try {
      const { data: existing, error: checkError } = await supabase
        .from('user_accounts')
        .select('id')
        .ilike('login_id', loginIdClean)
        .maybeSingle();

      if (checkError) {
        console.error('Supabase ID 중복 확인 실패:', checkError);
        // 네트워크 에러나 연결 실패 시
        if (checkError.message?.includes('fetch failed')) {
          return {
            success: false,
            error: 'Supabase 서버 연결 실패: 설정된 Project URL을 인터넷에서 찾을 수 없습니다. (Settings 환경변수 URL 오타 확인 필요)',
          };
        }
      }

      if (existing) {
        return { success: false, error: '이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.' };
      }

      const { error: insertError } = await supabase.from('user_accounts').insert([
        {
          id: newAccountId,
          login_id: loginIdClean,
          password_hash: passwordClean,
          role: data.role,
          nickname: nicknameClean,
          school_name: schoolNameClean,
          grade: data.grade,
          avatar_seed: createdAccount.avatarSeed,
        },
      ]);

      if (insertError) {
        console.error('Supabase insert failed:', insertError);
        return {
          success: false,
          error: `Supabase DB 저장 실패 (${insertError.code || 'ERROR'}): ${insertError.message}. SQL 테이블 생성 및 RLS 정책을 확인해주세요.`,
        };
      }
    } catch (dbErr: any) {
      console.error('Supabase insert exception:', dbErr);
      return {
        success: false,
        error: `Supabase 연결 오류: ${dbErr?.message || '네트워크 접속 실패'}. URL 확인이 필요합니다.`,
      };
    }
  }

  return { success: true, account: createdAccount };
};

// 사용자 인증 (Supabase DB 조회 + LocalStorage Fallback)
export const authenticateUser = async (
  loginId: string,
  password: string,
  expectedRole: 'student' | 'admin'
): Promise<{ success: boolean; error?: string; userProfile?: UserProfile }> => {
  const loginIdClean = loginId.trim();
  const passwordClean = password.trim();

  if (!loginIdClean || !passwordClean) {
    return { success: false, error: '아이디와 비밀번호를 모두 입력해주세요.' };
  }

  let account: UserAccount | undefined;

  // 1. Supabase에서 조회 시도
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('user_accounts')
        .select('*')
        .ilike('login_id', loginIdClean)
        .maybeSingle();

      if (!error && data) {
        account = {
          id: data.id,
          loginId: data.login_id,
          passwordHash: data.password_hash,
          role: data.role,
          nickname: data.nickname,
          schoolName: data.school_name,
          grade: data.grade,
          avatarSeed: data.avatar_seed,
          createdAt: data.created_at,
        };
      }
    } catch {
      // ignore
    }
  }

  // 2. 로컬 스토리지 Fallback
  if (!account) {
    const localAccounts = getStoredAccounts();
    account = localAccounts.find(
      (a) => a.loginId.toLowerCase() === loginIdClean.toLowerCase()
    );
  }

  if (!account) {
    return {
      success: false,
      error: '존재하지 않는 아이디입니다. [회원가입]을 먼저 진행해주세요.',
    };
  }

  if (account.passwordHash !== passwordClean) {
    return {
      success: false,
      error: '비밀번호가 일치하지 않습니다. 다시 확인해주세요.',
    };
  }

  if (account.role !== expectedRole) {
    if (expectedRole === 'admin' && account.role === 'student') {
      return {
        success: false,
        error: '해당 계정은 학생 계정입니다. [학생 / 일반 회원] 탭에서 로그인해주세요.',
      };
    }
    if (expectedRole === 'student' && account.role === 'admin') {
      return {
        success: false,
        error: '해당 계정은 선생님 계정입니다. [선생님 / 관리자] 탭에서 로그인해주세요.',
      };
    }
  }

  const profile: UserProfile = {
    id: account.id,
    loginId: account.loginId,
    role: account.role,
    nickname: account.nickname,
    schoolName: account.schoolName,
    grade: account.grade,
    avatarSeed: account.avatarSeed,
    solvedCount: account.role === 'admin' ? 48 : 0,
    helpedCount: account.role === 'admin' ? 32 : 0,
    bookmarkedProblemIds: [],
    historyQuestions: [],
    quizAttempts: [],
    wrongQuizQuestions: [],
  };

  return { success: true, userProfile: profile };
};
