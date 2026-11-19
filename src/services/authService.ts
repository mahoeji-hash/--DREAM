import { supabase, isSupabaseConfigured, generateUuid, isValidUuid } from '../supabaseClient';
import { UserAccount, UserProfile, GradeType, UserRole } from '../types';
import { safeLocalStorageGet, safeLocalStorageSet } from './storageService';

const STORAGE_ACCOUNTS_KEY = 'puleo_dream_user_accounts_v3';

// 보안 관리자 인증을 위한 솔트 및 암호화 해시 (SHA-256)
const ADMIN_KEY_SALT = 'puleo_hwawon_super_admin_salt_923_2026';
const ADMIN_CODE_HASH = 'd2dbb63fe099012c082170a2c622690b081ff2b4c307cd75fa8320b3f1f2c523';

async function computeSha256Hex(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return '';
}

export async function verifyAdminSecretCode(inputCode: string): Promise<boolean> {
  if (!inputCode) return false;
  const clean = inputCode.trim();
  const hash = await computeSha256Hex(ADMIN_KEY_SALT + clean + ADMIN_KEY_SALT);
  return hash === ADMIN_CODE_HASH;
}

function normalizeRole(rawRole?: string | null): UserRole {
  if (rawRole === 'admin' || rawRole === 'teacher') return 'admin';
  return 'student';
}

function mapDbUserToAccount(row: any): UserAccount {
  const normalizedRole = normalizeRole(row.role);
  return {
    id: String(row.id),
    loginId: row.user_id || '',
    passwordHash: row.password || '',
    role: normalizedRole,
    nickname: row.name || row.user_id || '사용자',
    schoolName: row.school || '대구화원고등학교',
    grade: (row.grade as GradeType) || 'high_1',
    avatarSeed: normalizedRole === 'admin' ? 'admin_avatar' : 'student_avatar',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

// 로컬 스토리지에 캐시된 계정 목록 반환 (동기 함수)
export const getStoredAccounts = (): UserAccount[] => {
  const parsed = safeLocalStorageGet<UserAccount[]>(STORAGE_ACCOUNTS_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
};

export const saveAccountsToLocalStorage = (accounts: UserAccount[]): void => {
  if (!Array.isArray(accounts)) return;
  safeLocalStorageSet(STORAGE_ACCOUNTS_KEY, accounts);
};

// 전체 계정 목록 조회 (Supabase `users` 테이블)
export const fetchStoredAccountsFromDB = async (): Promise<UserAccount[]> => {
  try {
    if (!isSupabaseConfigured) {
      return getStoredAccounts();
    }
    const { data, error } = await supabase
      .from('users')
      .select('id, user_id, password, role, name, school, grade, created_at');

    if (error || !Array.isArray(data)) {
      return getStoredAccounts();
    }

    const accounts: UserAccount[] = data.map(mapDbUserToAccount);
    saveAccountsToLocalStorage(accounts);
    return accounts;
  } catch {
    return getStoredAccounts();
  }
};

// 계정 삭제 (Supabase `users` 테이블 + LocalStorage)
export const deleteAccountById = async (accountId: string): Promise<boolean> => {
  try {
    const local = getStoredAccounts();
    const filtered = local.filter((a) => a.id !== accountId && a.loginId !== accountId);
    saveAccountsToLocalStorage(filtered);

    if (isSupabaseConfigured) {
      if (isValidUuid(accountId)) {
        await supabase.from('users').delete().eq('id', accountId);
      } else {
        await supabase.from('users').delete().eq('user_id', accountId);
      }
    }

    return true;
  } catch {
    return false;
  }
};

// 회원가입 (Supabase `users` 테이블 저장 + LocalStorage 백업)
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
  const schoolNameClean = data.schoolName.trim() || '대구화원고등학교';

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
    const isKeyValid = await verifyAdminSecretCode(data.adminSecretKey || '');
    if (!isKeyValid) {
      return {
        success: false,
        error: '관리자 계정 가입을 위한 보안 인증 코드가 올바르지 않습니다.',
      };
    }
  }

  const newAccountId = generateUuid();
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

  if (isSupabaseConfigured) {
    try {
      // 1. Supabase `users` 테이블에서 아이디 중복 확인
      const { data: existing, error: checkError } = await supabase
        .from('users')
        .select('id, user_id')
        .ilike('user_id', loginIdClean)
        .maybeSingle();

      if (checkError) {
        const checkMsg = String(checkError.message || checkError.details || '');
        const isNetworkErr =
          checkMsg.toLowerCase().includes('fetch') ||
          (checkError as any).name === 'TypeError';

        if (!isNetworkErr) {
          console.warn('Supabase ID 중복 확인 경고:', checkError);
        }
      }

      if (existing) {
        return { success: false, error: '이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.' };
      }

      // 2. Supabase `users` 테이블에 신규 회원 저장
      const { data: insertedRows, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            id: newAccountId,
            user_id: loginIdClean,
            password: passwordClean,
            role: data.role,
            name: nicknameClean,
            school: schoolNameClean,
            grade: data.grade,
          },
        ])
        .select();

      if (insertError) {
        const insertMsg = String(insertError.message || insertError.details || '');
        const isNetworkErr =
          insertMsg.toLowerCase().includes('fetch') ||
          (insertError as any).name === 'TypeError';

        if (isNetworkErr) {
          const localAccounts = getStoredAccounts();
          saveAccountsToLocalStorage([
            ...localAccounts.filter((a) => a.loginId.toLowerCase() !== loginIdClean.toLowerCase()),
            createdAccount,
          ]);
          return { success: true, account: createdAccount };
        }

        if (insertError.code === '23505') {
          return { success: false, error: '이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.' };
        }

        console.warn('Supabase users insert 오류:', insertError);
        return {
          success: false,
          error: `Supabase 회원가입 저장 실패 (${insertError.code || 'ERROR'}): ${insertError.message}`,
        };
      }

      const savedAccount =
        Array.isArray(insertedRows) && insertedRows[0]
          ? mapDbUserToAccount(insertedRows[0])
          : createdAccount;

      const localAccounts = getStoredAccounts();
      saveAccountsToLocalStorage([
        ...localAccounts.filter((a) => a.loginId.toLowerCase() !== loginIdClean.toLowerCase()),
        savedAccount,
      ]);

      return { success: true, account: savedAccount };
    } catch (dbErr: any) {
      console.warn('Supabase 통신 예외(로컬 계정 등록 fallback):', dbErr);
      const localAccounts = getStoredAccounts();
      saveAccountsToLocalStorage([
        ...localAccounts.filter((a) => a.loginId.toLowerCase() !== loginIdClean.toLowerCase()),
        createdAccount,
      ]);
      return { success: true, account: createdAccount };
    }
  }

  // 오프라인/로컬 전용 모드
  const localAccounts = getStoredAccounts();
  const localExisting = localAccounts.find(
    (acc) => acc.loginId.toLowerCase() === loginIdClean.toLowerCase()
  );
  if (localExisting) {
    return { success: false, error: '이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.' };
  }
  saveAccountsToLocalStorage([...localAccounts, createdAccount]);
  return { success: true, account: createdAccount };
};

// 사용자 인증 (Supabase `users` 테이블 조회 + LocalStorage Fallback)
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
  let dbQueriedSuccessfully = false;

  // 1. Supabase `users` 테이블에서 조회 시도
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, user_id, password, role, name, school, grade, created_at')
        .ilike('user_id', loginIdClean)
        .maybeSingle();

      if (!error) {
        dbQueriedSuccessfully = true;
      }

      if (!error && data) {
        account = mapDbUserToAccount(data);
        // 로컬 캐시도 최신화
        const localAccounts = getStoredAccounts();
        saveAccountsToLocalStorage([
          ...localAccounts.filter((a) => a.loginId.toLowerCase() !== account!.loginId.toLowerCase()),
          account,
        ]);
      }
    } catch {
      // network error -> fallback to local cache below
    }
  }

  // 2. Supabase 통신 실패 시에만 로컬 스토리지 Fallback
  if (!account && !dbQueriedSuccessfully) {
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
        error: '해당 계정은 학생 계정입니다. [학생] 탭에서 로그인해주세요.',
      };
    }
    if (expectedRole === 'student' && account.role === 'admin') {
      return {
        success: false,
        error: '해당 계정은 관리자 계정입니다. [관리자] 탭에서 로그인해주세요.',
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
