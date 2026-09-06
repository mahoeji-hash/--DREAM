import React from 'react';
import { User, Sparkles, Star, ShieldCheck, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { UserRole } from '../types';

interface PuleoDreamHeaderProps {
  onOpenProfile: () => void;
  onGoHome?: () => void;
  onLogout?: () => void;
  isHome?: boolean;
  userRole?: UserRole;
}

export const PuleoDreamHeader: React.FC<PuleoDreamHeaderProps> = ({
  onOpenProfile,
  onGoHome,
  onLogout,
  isHome = true,
  userRole = 'student',
}) => {
  return (
    <div id="puleo-dream-header" className="w-full pt-4 pb-2 px-4 flex flex-col items-center relative select-none">
      {/* Top Bar with Profile Button & Status */}
      <div className="w-full max-w-md flex justify-between items-center mb-1">
        {/* Back to Home if not on home screen */}
        {!isHome && onGoHome ? (
          <button
            id="btn-back-home"
            onClick={onGoHome}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/90 shadow-sm border border-amber-200/80 text-amber-900 text-sm font-bold hover:bg-amber-50 active:scale-95 transition-all"
          >
            <span>🏠</span>
            <span>홈으로</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 text-amber-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {userRole === 'admin' ? (
              <span className="font-bold text-amber-900 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-600" />
                <span>관리자(선생님) 모드</span>
              </span>
            ) : (
              <span>실시간 우리 반 학습 중</span>
            )}
          </div>
        )}

        {/* Profile Avatar & Role Button */}
        <div className="flex items-center gap-1.5">
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-full bg-white/80 hover:bg-rose-50 border border-slate-200 text-slate-500 hover:text-rose-600 text-xs font-bold transition-all shadow-xs"
              title="로그아웃 / 계정 변경"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          <button
            id="btn-user-profile"
            onClick={onOpenProfile}
            className={`h-10 px-2.5 rounded-full bg-white border-2 shadow-md flex items-center gap-1.5 hover:shadow-lg active:scale-95 transition-all relative group ${
              userRole === 'admin'
                ? 'border-amber-400 text-amber-700 hover:border-amber-500'
                : 'border-sky-300 text-slate-600 hover:text-sky-600 hover:border-sky-400'
            }`}
            title="내 프로필 및 보관함"
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
              userRole === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-sky-50 text-sky-600'
            }`}>
              {userRole === 'admin' ? '👑' : <User className="w-4 h-4 text-sky-600" />}
            </div>
            <span className="text-xs font-black hidden sm:inline">
              {userRole === 'admin' ? '관리자' : '내정보'}
            </span>
            <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full ${
              userRole === 'admin' ? 'bg-orange-500' : 'bg-amber-400'
            }`}></span>
          </button>
        </div>
      </div>

      {/* 3D Clay Logo Visual: "풀어 DREAM" */}
      <motion.div
        id="puleo-dream-logo-container"
        onClick={onGoHome}
        className={`flex flex-col items-center cursor-pointer transition-transform ${
          isHome ? 'my-2 scale-100' : 'my-1 scale-95'
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Cute Roof & Sprout Emblem */}
        <div className="flex flex-col items-center mb-1">
          <div className="flex items-center justify-center text-emerald-500 text-base animate-bounce">
            🌱
          </div>
          <div className="flex items-center justify-center">
            <svg width="54" height="24" viewBox="0 0 68 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
              <path
                d="M34 4L6 28C4.5 29.5 5.5 32 7.5 32H60.5C62.5 32 63.5 29.5 62 28L34 4Z"
                fill="#1E40AF"
              />
              <path
                d="M34 6L8 28H60L34 6Z"
                fill="#2563EB"
              />
              <circle cx="34" cy="18" r="3.5" fill="#FEF08A" />
            </svg>
          </div>
        </div>

        {/* Main Logo Card Badge */}
        <div className="relative px-6 sm:px-9 py-3 bg-white/95 backdrop-blur-sm rounded-[28px] border-[3px] border-white shadow-[0_10px_25px_rgba(37,99,235,0.12),0_4px_10px_rgba(245,158,11,0.08)] flex flex-col items-center justify-center z-10">
          {/* Subtle Decorative Stars */}
          <div className="absolute -top-2 -left-2 text-amber-400">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400 drop-shadow-xs animate-pulse" />
          </div>
          <div className="absolute -top-1.5 -right-2 text-amber-400">
            <Star className="w-4 h-4 fill-amber-300 text-amber-300 drop-shadow-xs" />
          </div>

          {/* Typography: "풀어" + "DREAM" with spacious gap, distinct fonts, and zero collision */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 my-0.5 select-none whitespace-nowrap">
            <span className="text-3xl sm:text-4xl text-blue-600 font-logo-kr tracking-wide leading-none pt-0.5">
              풀어
            </span>
            <span className="px-3.5 py-1 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-logo-en font-black text-xl sm:text-2xl tracking-widest leading-none shadow-md shadow-blue-500/25">
              DREAM
            </span>
          </div>

          <div className="mt-2 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50/90 border border-blue-200/60 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
            <p className="text-[11px] sm:text-xs text-blue-900 font-bold tracking-tight">
              수학 · 과학 교과서 풀이 & 맞춤 질문 해결소
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
export default PuleoDreamHeader;
