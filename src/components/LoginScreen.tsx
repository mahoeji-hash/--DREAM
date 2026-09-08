import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  User,
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Lock,
  UserPlus,
  LogIn,
  Star,
  Eye,
  EyeOff,
  Loader2,
  Database,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { GradeType, UserProfile, UserRole } from '../types';
import { registerAccount, authenticateUser } from '../services/authService';
import { testSupabaseConnection, SupabaseDiagnosticResult, supabaseUrl, isSupabaseConfigured } from '../supabaseClient';
import mascotImg from '../assets/images/puleo_study_mascot_1788101354871.jpg';

interface LoginScreenProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [isLoading, setIsLoading] = useState(false);

  // Login form fields
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign up form fields
  const [signupId, setSignupId] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
  const [signupNickname, setSignupNickname] = useState('');
  const [signupSchool, setSignupSchool] = useState('대구화원고등학교');
  const [signupGrade, setSignupGrade] = useState<GradeType>('high_1');
  const [adminSecretKey, setAdminSecretKey] = useState('');
  const [showAdminSecretKey, setShowAdminSecretKey] = useState(false);

  // Status feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Supabase Cloud Diagnostic
  const [diagResult, setDiagResult] = useState<SupabaseDiagnosticResult | null>(null);
  const [isTestingDB, setIsTestingDB] = useState(false);
  const [showDiagDetails, setShowDiagDetails] = useState(false);

  const runDBTest = async () => {
    setIsTestingDB(true);
    try {
      const res = await testSupabaseConnection();
      setDiagResult(res);
    } catch {
      setDiagResult({
        isConfigured: false,
        url: supabaseUrl,
        keyMasked: '',
        status: 'error',
        message: '연결 확인 중 오류가 발생했습니다.',
      });
    } finally {
      setIsTestingDB(false);
    }
  };

  useEffect(() => {
    runDBTest();
  }, []);

  const handleSwitchMode = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSwitchRole = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Handle Login Submission (Async DB)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await authenticateUser(loginId, loginPassword, selectedRole);
      if (!result.success || !result.userProfile) {
        setErrorMessage(result.error || '로그인에 실패했습니다.');
        return;
      }

      onLoginSuccess(result.userProfile);
    } catch {
      setErrorMessage('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Signup Submission (Async DB)
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (signupPassword !== signupPasswordConfirm) {
      setErrorMessage('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);

    try {
      const regResult = await registerAccount({
        loginId: signupId,
        password: signupPassword,
        role: selectedRole,
        nickname: signupNickname,
        schoolName: signupSchool,
        grade: signupGrade,
        adminSecretKey: selectedRole === 'admin' ? adminSecretKey : undefined,
      });

      if (!regResult.success) {
        setErrorMessage(regResult.error || '회원가입에 실패했습니다.');
        setIsLoading(false);
        return;
      }

      setSuccessMessage('🎉 회원가입이 완료되었습니다! 로그인 처리 중...');

      // Auto login after successful signup
      const autoAuth = await authenticateUser(signupId, signupPassword, selectedRole);
      if (autoAuth.success && autoAuth.userProfile) {
        onLoginSuccess(autoAuth.userProfile);
      } else {
        setLoginId(signupId);
        setLoginPassword(signupPassword);
        setAuthMode('login');
        setSuccessMessage(null);
      }
    } catch {
      setErrorMessage('회원가입 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="login-screen-container"
      className="min-h-screen w-full flex flex-col items-center justify-center p-3 sm:p-6 select-none bg-[#F8F5EE] bg-[radial-gradient(#E8DFCA_1px,transparent_1px)] [background-size:24px_24px]"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md bg-[#FFFDF9] rounded-[32px] shadow-[0_16px_40px_rgba(245,158,11,0.15),0_4px_12px_rgba(0,0,0,0.05)] border-[3px] border-amber-200 overflow-hidden flex flex-col"
      >
        {/* Top Header */}
        <div className="bg-gradient-to-b from-amber-400 via-amber-300 to-yellow-200/90 p-5 text-center relative overflow-hidden border-b-2 border-amber-200">
          <div className="absolute top-2 left-3 text-amber-100 opacity-60">
            <Star className="w-6 h-6 fill-amber-300 text-amber-300 animate-pulse" />
          </div>
          <div className="absolute top-3 right-4 text-amber-100 opacity-60">
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>

          <div className="flex flex-col items-center mb-1">
            <span className="text-lg animate-bounce">🌱</span>
            <svg width="48" height="22" viewBox="0 0 68 34" fill="none" className="drop-shadow-xs">
              <path d="M34 4L6 28C4.5 29.5 5.5 32 7.5 32H60.5C62.5 32 63.5 29.5 62 28L34 4Z" fill="#1E40AF" />
              <path d="M34 6L8 28H60L34 6Z" fill="#2563EB" />
              <circle cx="34" cy="18" r="3.5" fill="#FEF08A" />
            </svg>
          </div>

          <div className="flex items-center justify-center gap-3 my-1 select-none whitespace-nowrap">
            <span className="text-2xl sm:text-3xl text-blue-600 font-logo-kr tracking-wide leading-none pt-0.5">
              풀어
            </span>
            <span className="px-3 py-0.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-logo-en font-black text-lg sm:text-xl tracking-widest leading-none shadow-md shadow-blue-500/25">
              DREAM
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-blue-900/90 font-bold mt-1.5 tracking-tight">
            수학 · 과학 교과서 맞춤 풀이 & 질문 도우미
          </p>
        </div>

        {/* Mascot Greeting */}
        <div className="px-5 py-3 flex items-center gap-3 bg-amber-50/50 border-b border-amber-100">
          <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-amber-300 shadow-sm bg-white shrink-0">
            <img src={mascotImg} alt="풀어드림 마스코트" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="text-xs leading-snug text-slate-700 flex-1">
            <span className="font-black text-amber-900 block">
              {authMode === 'login' ? '🔑 아이디와 비밀번호로 로그인하세요' : '✨ 새로운 계정을 만들어보세요!'}
            </span>
            <span className="text-slate-500 font-medium text-[11px]">
              {authMode === 'login'
                ? '가입된 계정 정보를 입력하여 학습을 시작하세요.'
                : '가입 후 교과서 맞춤 풀이와 질문을 이용할 수 있습니다.'}
            </span>
          </div>
        </div>

        {/* Supabase Cloud Connection Diagnostic Indicator */}
        <div className="px-5 pt-2.5">
          <div
            className={`p-2.5 rounded-2xl border text-xs transition-all ${
              diagResult?.status === 'connected'
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : diagResult?.status === 'checking' || isTestingDB
                ? 'bg-sky-50/80 border-sky-200 text-sky-900'
                : 'bg-rose-50/90 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Database className={`w-4 h-4 shrink-0 ${
                  diagResult?.status === 'connected'
                    ? 'text-emerald-600'
                    : isTestingDB
                    ? 'text-sky-600 animate-spin'
                    : 'text-rose-600'
                }`} />
                <span className="font-bold truncate text-[11px] sm:text-xs">
                  {isTestingDB
                    ? 'Supabase DB 연결 상태 확인 중...'
                    : diagResult?.status === 'connected'
                    ? '클라우드 DB 정상 연동 (Supabase)'
                    : '클라우드 DB 연결 확인 필요'}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={runDBTest}
                  disabled={isTestingDB}
                  title="연결 다시 확인"
                  className="p-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-black/5 active:scale-95 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingDB ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiagDetails(!showDiagDetails)}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-black/5 hover:bg-black/10 flex items-center gap-0.5 text-slate-700 transition-all"
                >
                  <span>{showDiagDetails ? '접기' : '진단 안내'}</span>
                  {showDiagDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Diagnostic Details Accordion */}
            {showDiagDetails && (
              <div className="mt-2 pt-2 border-t border-black/10 text-[11px] space-y-2">
                <div>
                  <span className="font-bold text-slate-700">현재 설정된 Project URL:</span>
                  <p className="font-mono text-[10px] bg-white/80 p-1.5 rounded-lg border border-slate-200 break-all select-all mt-0.5 text-slate-800">
                    {supabaseUrl}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-slate-700">진단 결과:</span>
                  <p className="mt-0.5 text-slate-700 leading-relaxed">
                    {diagResult?.message || '상태를 확인하는 중입니다.'}
                  </p>
                  {diagResult?.details && (
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {diagResult.details}
                    </p>
                  )}
                </div>

                {diagResult?.status !== 'connected' && (
                  <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
                    <p className="font-bold flex items-center gap-1 text-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      데이터가 DB에 저장되지 않는 핵심 이유:
                    </p>
                    <ol className="list-decimal list-inside space-y-0.5 text-[10.5px] text-amber-950 pl-0.5">
                      <li>현재 URL 도메인이 인터넷 DNS에서 조회되지 않습니다 (오타 또는 프로젝트 미생성/Paused).</li>
                      <li>Supabase 대시보드 <strong>Project Settings → Data API</strong>의 <strong>Project URL</strong> 주소를 확인해주세요.</li>
                      <li>AI Studio 상단 ⚙️ Settings에 올바른 URL을 등록하면 즉시 클라우드에 영구 저장됩니다.</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Login / Sign Up Main Switch Tabs */}
        <div className="px-5 pt-3">
          <div className="grid grid-cols-2 p-1 bg-amber-100/60 rounded-2xl border border-amber-200/80">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleSwitchMode('login')}
              className={`py-2 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all ${
                authMode === 'login'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-amber-800/70 hover:text-amber-900'
              }`}
            >
              <LogIn className="w-4 h-4 text-blue-600" />
              <span>로그인</span>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleSwitchMode('signup')}
              className={`py-2 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all ${
                authMode === 'signup'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-amber-800/70 hover:text-amber-900'
              }`}
            >
              <UserPlus className="w-4 h-4 text-amber-600" />
              <span>회원가입</span>
            </button>
          </div>
        </div>

        {/* Role Selection Tabs */}
        <div className="px-5 pt-3">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleSwitchRole('student')}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                selectedRole === 'student'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>학생</span>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleSwitchRole('admin')}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                selectedRole === 'admin'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>관리자</span>
            </button>
          </div>
        </div>

        {/* Forms Container */}
        <div className="p-5 pt-3 space-y-3.5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* 1. LOGIN FORM */}
            {authMode === 'login' ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                onSubmit={handleLoginSubmit}
                className="space-y-3"
              >
                {selectedRole === 'admin' && (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-bold text-[11px]">
                      등록된 관리자 전용 아이디로 로그인해주세요.
                    </span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>아이디 (ID)</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="가입한 아이디를 입력하세요"
                    className="w-full px-3.5 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                      <span>비밀번호 (Password)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPassword ? '숨기기' : '보기'}</span>
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isLoading}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full px-3.5 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3.5 px-4 text-white font-black text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all mt-3 ${
                    selectedRole === 'admin'
                      ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>{selectedRole === 'admin' ? '관리자로 로그인하기' : '학생으로 로그인하기'}</span>
                </button>

                <div className="text-center pt-2">
                  <span className="text-xs text-slate-500">아직 회원이 아니신가요? </span>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('signup')}
                    className="text-xs font-black text-blue-600 hover:underline"
                  >
                    지금 회원가입하기
                  </button>
                </div>
              </motion.form>
            ) : (
              /* 2. SIGNUP FORM */
              <motion.form
                key="signup-form"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                onSubmit={handleSignupSubmit}
                className="space-y-3"
              >
                {selectedRole === 'admin' && (
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 text-amber-900 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-black text-amber-800">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>관리자 회원가입 전용 보안 인증</span>
                    </div>
                    <p className="text-[11px] text-amber-700">
                      관리자 계정 가입은 허가된 관리자 전용 비밀 인증코드가 있어야만 가능합니다.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      아이디
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isLoading}
                      value={signupId}
                      onChange={(e) => setSignupId(e.target.value)}
                      placeholder="3자 이상"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      닉네임 / 성함
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isLoading}
                      value={signupNickname}
                      onChange={(e) => setSignupNickname(e.target.value)}
                      placeholder={selectedRole === 'admin' ? '예: 박선생님' : '예: 열공이'}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      비밀번호
                    </label>
                    <input
                      type="password"
                      required
                      disabled={isLoading}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="4자 이상"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      비밀번호 확인
                    </label>
                    <input
                      type="password"
                      required
                      disabled={isLoading}
                      value={signupPasswordConfirm}
                      onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                      placeholder="동일하게 입력"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    학교 / 소속
                  </label>
                  <input
                    type="text"
                    disabled={isLoading}
                    value={signupSchool}
                    onChange={(e) => setSignupSchool(e.target.value)}
                    placeholder="예: 대구화원고등학교"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                {selectedRole === 'student' && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      학년
                    </label>
                    <select
                      disabled={isLoading}
                      value={signupGrade}
                      onChange={(e) => setSignupGrade(e.target.value as GradeType)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="middle_3">중학교 3학년</option>
                      <option value="high_1">고등학교 1학년</option>
                      <option value="high_2_3">고등학교 2·3학년</option>
                    </select>
                  </div>
                )}

                {selectedRole === 'admin' && (
                  <div className="p-3 bg-amber-50/90 rounded-2xl border border-amber-300/90 space-y-1.5">
                    <label className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      <span>관리자 전용 비밀 인증코드</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminSecretKey ? 'text' : 'password'}
                        required
                        disabled={isLoading}
                        value={adminSecretKey}
                        onChange={(e) => setAdminSecretKey(e.target.value)}
                        placeholder="발급받은 관리자 비밀 인증코드를 입력하세요"
                        className="w-full px-3 py-2 pr-9 bg-white rounded-xl border-2 border-amber-400 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminSecretKey(!showAdminSecretKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-600 focus:outline-none"
                        tabIndex={-1}
                      >
                        {showAdminSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-800/80 font-medium">
                      * 관리자 가입은 전용 보안 암호화 코드가 필요하며, 인가되지 않은 가입은 엄격히 차단됩니다.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3.5 px-4 text-white font-black text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all mt-3 ${
                    selectedRole === 'admin'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>{selectedRole === 'admin' ? '관리자 계정 생성하기' : '학생 회원가입 완료하기'}</span>
                </button>

                <div className="text-center pt-2">
                  <span className="text-xs text-slate-500">이미 계정이 있으신가요? </span>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('login')}
                    className="text-xs font-black text-blue-600 hover:underline"
                  >
                    로그인하기
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-3 bg-amber-50/80 border-t border-amber-100 flex flex-col items-center gap-1 text-center">
          <p className="text-[11px] text-slate-400 font-semibold">
            풀어 DREAM · 우리 학교 수학·과학 학습 지원 시스템
          </p>
        </div>
      </motion.div>
    </div>
  );
};
export default LoginScreen;