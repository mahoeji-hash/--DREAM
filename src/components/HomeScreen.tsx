import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, ShieldCheck, MessageSquare } from 'lucide-react';
import { PuleoDreamHeader } from './PuleoDreamHeader';
import { UserRole } from '../types';
import mascotImg from '../assets/images/puleo_study_mascot_1788101354871.jpg';
import teacherGradingMascotImg from '../assets/images/puleo_study_mascot_1788101354871.jpg';

interface HomeScreenProps {
  onSelectMath: () => void;
  onSelectScience: () => void;
  onSelectWrongAnswers: () => void;
  onSelectAskQuestion?: () => void;
  onSelectQnA: () => void;
  onOpenProfile: () => void;
  onLogout?: () => void;
  userRole?: UserRole;
  solvedCount: number;
  waitingQuestionsCount?: number;
  wrongQuestionsCount?: number;
  unreviewedWrongCount?: number;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectMath,
  onSelectScience,
  onSelectWrongAnswers,
  onSelectAskQuestion,
  onSelectQnA,
  onOpenProfile,
  onLogout,
  userRole = 'student',
  solvedCount,
  waitingQuestionsCount = 0,
  wrongQuestionsCount = 0,
  unreviewedWrongCount = 0,
}) => {
  return (
    <div id="home-screen-container" className="w-full max-w-md mx-auto px-3 sm:px-4 pb-8 flex flex-col items-center justify-between min-h-[92vh] select-none">
      {/* 1. Header with Profile & 3D Clay "풀어 DREAM" Logo */}
      <PuleoDreamHeader
        onOpenProfile={onOpenProfile}
        onLogout={onLogout}
        userRole={userRole}
        isHome={true}
      />

      {/* 2. Main Clay Action Buttons */}
      <div id="home-action-buttons-group" className="w-full space-y-3 my-2">
        {/* BUTTON 1: 수학 마스터 하기! */}
        <motion.button
          id="btn-math-master"
          onClick={onSelectMath}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3.5 px-4 sm:px-5 rounded-[26px] bg-white border-[3px] border-[#3B82F6] shadow-[0_8px_20px_rgba(59,130,246,0.18),0_2px_6px_rgba(0,0,0,0.04)] flex items-center justify-between group transition-all relative overflow-hidden"
        >
          {/* Subtle Clay Highlight Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-400 via-sky-300 to-blue-500 opacity-90" />

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500 text-white flex items-center justify-center text-xl shadow-md border-2 border-white group-hover:rotate-6 transition-transform">
              📐
            </div>
            <div className="text-left">
              <span className="text-[11px] font-bold text-blue-600 tracking-wide uppercase block">
                미래엔 공통수학 2
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                수학 마스터하기!
              </h2>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-xs">
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </motion.button>

        {/* BUTTON 2: 과학 마스터 하기! */}
        <motion.button
          id="btn-science-master"
          onClick={onSelectScience}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3.5 px-4 sm:px-5 rounded-[26px] bg-white border-[3px] border-[#10B981] shadow-[0_8px_20px_rgba(16,185,129,0.18),0_2px_6px_rgba(0,0,0,0.04)] flex items-center justify-between group transition-all relative overflow-hidden"
        >
          {/* Subtle Clay Highlight Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 opacity-90" />

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xl shadow-md border-2 border-white group-hover:rotate-6 transition-transform">
              🔬
            </div>
            <div className="text-left">
              <span className="text-[11px] font-bold text-emerald-600 tracking-wide uppercase block">
                비상교육 통합과학 2
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                과학 마스터하기!
              </h2>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-xs">
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </motion.button>

        {/* BUTTON 3: 나만의 스마트 오답노트 */}
        <motion.button
          id="btn-wrong-answers-note"
          onClick={onSelectWrongAnswers}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3.5 px-4 sm:px-5 rounded-[26px] bg-white border-[3px] border-[#F43F5E] shadow-[0_8px_20px_rgba(244,63,94,0.18),0_2px_6px_rgba(0,0,0,0.04)] flex items-center justify-between group transition-all relative overflow-hidden"
        >
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-400 via-pink-400 to-amber-400 opacity-90" />

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center text-xl shadow-md border-2 border-white group-hover:rotate-6 transition-transform relative">
              📝
              {unreviewedWrongCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-600 text-white font-black text-[9px] rounded-full border border-white animate-pulse">
                  {unreviewedWrongCount}
                </span>
              )}
            </div>
            <div className="text-left">
              <span className="text-[11px] font-bold text-rose-600 tracking-wide uppercase flex items-center gap-1">
                <span>중단원 &amp; 대단원 TEST 틀린 문제 복습</span>
                {wrongQuestionsCount > 0 && (
                  <span className="text-[10px] bg-rose-100 text-rose-800 font-black px-1.5 py-0.2 rounded-md">
                    총 {wrongQuestionsCount}문제
                  </span>
                )}
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>나만의 오답노트</span>
                {unreviewedWrongCount > 0 ? (
                  <span className="text-[11px] px-2 py-0.5 bg-rose-100 text-rose-800 font-black rounded-full border border-rose-200">
                    복습 대기 {unreviewedWrongCount}
                  </span>
                ) : wrongQuestionsCount > 0 ? (
                  <span className="text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black rounded-full border border-emerald-200">
                    전체 복습 완료
                  </span>
                ) : null}
              </h2>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors shadow-xs">
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </motion.button>

        {/* BUTTON 4: 학생 Q&A 질문 & 답변 게시판 */}
        <motion.button
          id="btn-community-qna"
          onClick={onSelectQnA}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-3.5 px-4 sm:px-5 rounded-[26px] bg-white border-[3px] shadow-[0_8px_20px_rgba(217,119,6,0.18),0_2px_6px_rgba(0,0,0,0.04)] flex items-center justify-between group transition-all relative overflow-hidden ${
            userRole === 'admin'
              ? 'border-amber-400 bg-gradient-to-r from-amber-50/80 to-yellow-50/80'
              : 'border-indigo-400 bg-gradient-to-r from-indigo-50/40 to-blue-50/40'
          }`}
        >
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-indigo-400 to-purple-400" />

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center text-xl shadow-md border-2 border-white group-hover:rotate-6 transition-transform relative">
              📚
              {waitingQuestionsCount > 0 && userRole === 'admin' && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-500 text-white font-black text-[9px] rounded-full border border-white animate-bounce">
                  {waitingQuestionsCount}
                </span>
              )}
            </div>
            <div className="text-left">
              <span className="text-[11px] font-bold text-amber-700 tracking-wide uppercase flex items-center gap-1">
                {userRole === 'admin' ? (
                  <>
                    <ShieldCheck className="w-3 h-3 text-amber-600" />
                    <span>선생님 맞춤 답변 대기 ({waitingQuestionsCount}건)</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-3 h-3 text-indigo-600" />
                    <span>우리 학교 Q&A 질문 게시판</span>
                  </>
                )}
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>질문 &amp; 맞춤 답변</span>
                {userRole === 'admin' && (
                  <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-full shadow-2xs">
                    답변 달기
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-xs">
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </motion.button>
      </div>

      {/* 3. Clay Mascot Studying at Desk */}
      <div id="mascot-study-section" className="w-full mt-2 flex flex-col items-center relative">
        {/* Mascot Image Card */}
        <div className="w-32 sm:w-36 aspect-square rounded-3xl overflow-hidden border-4 border-white shadow-[0_12px_28px_rgba(0,0,0,0.1)] bg-amber-100/50 p-0.5 relative group">
          <img
            src={userRole === 'admin' ? teacherGradingMascotImg : mascotImg}
            alt={userRole === 'admin' ? '풀어 DREAM 마스코트' : '풀어 DREAM 마스코트'}
            className="w-full h-full object-cover rounded-[20px] group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-400/90 text-[10px] font-black text-amber-950 shadow-xs backdrop-blur-xs">
            {userRole === 'admin' ? '관리자 모드' : '학습 모드'}
          </div>
        </div>
      </div>
    </div>
  );
};
export default HomeScreen;