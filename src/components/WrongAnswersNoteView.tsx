import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Check,
  Trash2,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Award,
  BookOpen,
  Search,
  FileCheck2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Maximize2,
  X,
  Layers,
  HelpCircle,
  Clock,
  Flame,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserProfile,
  QuizWrongAnswer,
  QuizAttemptRecord,
  SubjectType,
} from '../types';

interface WrongAnswersNoteViewProps {
  userProfile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onGoBack: () => void;
  onNavigateToSubject?: (subject: SubjectType, initialTab?: 'problems' | 'concepts' | 'facts' | 'unit_tests') => void;
}

export const WrongAnswersNoteView: React.FC<WrongAnswersNoteViewProps> = ({
  userProfile,
  onUpdateProfile,
  onGoBack,
  onNavigateToSubject,
}) => {
  const [filterSubject, setFilterSubject] = useState<'all' | 'math' | 'science'>('all');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'unreviewed' | 'reviewed'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  
  const [expandedWrongIds, setExpandedWrongIds] = useState<Set<string>>(new Set());
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [retestAnswers, setRetestAnswers] = useState<Record<string, number>>({});

  const wrongQuestions: QuizWrongAnswer[] = useMemo(() => {
    return userProfile.wrongQuizQuestions || [];
  }, [userProfile.wrongQuizQuestions]);

  const testAttempts: QuizAttemptRecord[] = useMemo(() => {
    return userProfile.quizAttempts || [];
  }, [userProfile.quizAttempts]);

  // Statistics
  const totalCount = wrongQuestions.length;
  const reviewedCount = wrongQuestions.filter((q) => q.isReviewed).length;
  const unreviewedCount = totalCount - reviewedCount;
  const reviewProgress = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 100;
  const mathCount = wrongQuestions.filter((q) => q.subject === 'math').length;
  const scienceCount = wrongQuestions.filter((q) => q.subject === 'science').length;

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    return wrongQuestions.filter((item) => {
      if (filterSubject !== 'all' && item.subject !== filterSubject) {
        return false;
      }
      if (reviewFilter === 'unreviewed' && item.isReviewed) {
        return false;
      }
      if (reviewFilter === 'reviewed' && !item.isReviewed) {
        return false;
      }
      if (selectedAttemptId && item.quizId !== selectedAttemptId) {
        return false;
      }
      if (searchKeyword.trim()) {
        const keyword = searchKeyword.toLowerCase();
        const matchText = (item.questionText || '').toLowerCase().includes(keyword);
        const matchTitle = (item.quizTitle || '').toLowerCase().includes(keyword);
        const matchUnit = (item.unitName || '').toLowerCase().includes(keyword);
        const matchExplanation = (item.explanation || '').toLowerCase().includes(keyword);
        const matchOptions = (item.options || []).some((opt) => opt.toLowerCase().includes(keyword));
        if (!matchText && !matchTitle && !matchUnit && !matchExplanation && !matchOptions) {
          return false;
        }
      }
      return true;
    });
  }, [wrongQuestions, filterSubject, reviewFilter, selectedAttemptId, searchKeyword]);

  // Toggle single item expanded state
  const toggleExpand = (id: string) => {
    setExpandedWrongIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle expand all
  const toggleExpandAll = () => {
    if (expandedWrongIds.size === filteredQuestions.length) {
      setExpandedWrongIds(new Set());
    } else {
      setExpandedWrongIds(new Set(filteredQuestions.map((q) => q.id)));
    }
  };

  const handleToggleReviewed = (wrongId: string) => {
    const updated = wrongQuestions.map((item) => {
      if (item.id === wrongId) {
        return { ...item, isReviewed: !item.isReviewed };
      }
      return item;
    });
    onUpdateProfile({ wrongQuizQuestions: updated });
  };

  const handleDeleteWrongAnswer = (wrongId: string) => {
    const updated = wrongQuestions.filter((item) => item.id !== wrongId);
    onUpdateProfile({ wrongQuizQuestions: updated });
  };

  const handleClearAllWrongAnswers = () => {
    onUpdateProfile({ wrongQuizQuestions: [] });
    setShowClearConfirm(false);
  };

  const handleSelectRetestOption = (wrongId: string, optionIdx: number) => {
    // If user already solved this retest correctly, lock it from changing!
    const targetQ = wrongQuestions.find((q) => q.id === wrongId);
    if (targetQ && retestAnswers[wrongId] === targetQ.correctIndex) {
      return; // Already correct, locked!
    }

    setRetestAnswers((prev) => ({
      ...prev,
      [wrongId]: optionIdx,
    }));
  };

  return (
    <div id="wrong-answers-note-view" className="min-h-screen bg-[#FDFBF7] text-slate-900 pb-24">
      {/* 1. TOP FULL-SCREEN HEADER & NAVIGATION */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b-2 border-rose-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              id="btn-back-to-home"
              type="button"
              onClick={onGoBack}
              className="p-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 active:scale-95 transition-all flex items-center gap-1.5 font-black text-xs sm:text-sm border border-rose-200"
              title="홈 화면으로 돌아가기"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">홈으로</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center text-xl shadow-md border-2 border-white shrink-0">
                📝
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-slate-900">
                    나만의 스마트 오답노트
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black border border-rose-200">
                    {userProfile.nickname} 님의 복습 보관함
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium hidden sm:block">
                  대단원 실전 TEST에서 틀렸던 모든 문항을 완벽히 마스터할 때까지 체계적으로 복습해요.
                </p>
              </div>
            </div>
          </div>

          {/* Top Right Quick Action Buttons */}
          <div className="flex items-center gap-2">
            {onNavigateToSubject && (
              <div className="hidden md:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onNavigateToSubject('math', 'unit_tests')}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black transition-all border border-blue-200"
                >
                  📐 수학 TEST
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToSubject('science', 'unit_tests')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black transition-all border border-emerald-200"
                >
                  🔬 과학 TEST
                </button>
              </div>
            )}

            {totalCount > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-black transition-all flex items-center gap-1 border border-slate-200"
                title="오답노트 전체 비우기"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">전체 비우기</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* STATS DASHBOARD BAR */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Wrong Answers */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border-2 border-rose-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold">기록된 오답 총계</span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm">
                📝
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
                {totalCount}
                <span className="text-sm font-bold text-slate-600 ml-1">문제</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-slate-500">
                <span className="text-blue-600">수학 {mathCount}</span>
                <span>·</span>
                <span className="text-emerald-600">과학 {scienceCount}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Review Completion Progress */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border-2 border-emerald-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold">복습 완수율</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                {reviewProgress}%
              </div>
              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                  style={{ width: `${reviewProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px] font-bold text-slate-400">
                <span>완료 {reviewedCount}문제</span>
                <span>미완료 {unreviewedCount}문제</span>
              </div>
            </div>
          </div>

          {/* Card 3: TEST Attempts & Frequency */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border-2 border-amber-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold">대단원 TEST 응시 이력</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight">
                {testAttempts.length}
                <span className="text-sm font-bold text-slate-600 ml-1">회차 완료</span>
              </div>
              <div className="mt-1 text-[11px] font-bold text-amber-800/80 truncate">
                {testAttempts.length > 0
                  ? `최근: ${testAttempts[0].quizTitle}`
                  : '실전 TEST를 응시해보세요!'}
              </div>
            </div>
          </div>

          {/* Card 4: Retest Mastery Counter */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border-2 border-blue-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold">실시간 다시 풀기 연습</span>
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                <RotateCcw className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight">
                {Object.keys(retestAnswers).length}
                <span className="text-sm font-bold text-slate-600 ml-1">문항 재도전</span>
              </div>
              <div className="mt-1 text-[11px] font-bold text-blue-800/80">
                정답 클릭 시 즉시 채점 피드백
              </div>
            </div>
          </div>
        </section>

        {/* TEST ATTEMPTS HISTORY ACCORDION (If user has taken tests) */}
        {testAttempts.length > 0 && (
          <section className="p-4 sm:p-5 bg-gradient-to-r from-orange-50/80 via-amber-50/60 to-rose-50/50 rounded-3xl border-2 border-amber-200 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-2xs text-xs">
                  🏆
                </div>
                <h3 className="text-sm sm:text-base font-black text-amber-950">
                  대단원 실전 TEST 응시 성적표 & 오답 필터링
                </h3>
              </div>
              {selectedAttemptId && (
                <button
                  type="button"
                  onClick={() => setSelectedAttemptId(null)}
                  className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-black rounded-xl transition-all shadow-2xs flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>시험 필터 해제 (전체 보기)</span>
                </button>
              )}
            </div>

            <p className="text-xs text-amber-800/90 font-medium">
              아래 응시 기록 카드를 클릭하면 해당 시험에서 틀렸던 오답 문항만 즉시 필터링하여 집중 복습할 수 있습니다.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              {testAttempts.map((att) => {
                const isSelected = selectedAttemptId === att.quizId;
                const isMath = att.subject === 'math';

                return (
                  <div
                    key={att.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedAttemptId(null);
                      } else {
                        setSelectedAttemptId(att.quizId);
                        setFilterSubject(att.subject);
                      }
                    }}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between text-xs space-y-2 ${
                      isSelected
                        ? 'bg-amber-100/90 border-amber-500 shadow-md ring-2 ring-amber-300 scale-[1.02]'
                        : 'bg-white border-amber-200/90 hover:border-amber-400 hover:shadow-xs'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                            isMath ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isMath ? '📐 공통수학' : '🔬 통합과학'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">{att.completedAt}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 line-clamp-1 text-xs">
                        {att.quizTitle}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-amber-100">
                      <span className="text-[11px] text-slate-500 font-bold">
                        틀린 문제: {att.wrongAnswers ? att.wrongAnswers.length : 0}개
                      </span>
                      <span
                        className={`font-black px-2 py-0.5 rounded-lg text-xs ${
                          att.percentage >= 80
                            ? 'bg-emerald-100 text-emerald-800'
                            : att.percentage >= 60
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {att.score}/{att.totalQuestions} ({att.percentage}점)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. TOOLBAR: SUBJECT FILTERS, REVIEW STATUS, SEARCH & VIEW MODE */}
        <section className="p-4 sm:p-5 bg-white rounded-3xl border-2 border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Subject Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setFilterSubject('all');
                  setSelectedAttemptId(null);
                }}
                className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all ${
                  filterSubject === 'all' && !selectedAttemptId
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                전체 과목 ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterSubject('math');
                  setSelectedAttemptId(null);
                }}
                className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all ${
                  filterSubject === 'math' && !selectedAttemptId
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                📐 공통수학 ({mathCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterSubject('science');
                  setSelectedAttemptId(null);
                }}
                className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all ${
                  filterSubject === 'science' && !selectedAttemptId
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                🔬 통합과학 ({scienceCount})
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {/* Review Status Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 mr-1">상태:</span>
              <button
                type="button"
                onClick={() => setReviewFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                  reviewFilter === 'all'
                    ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                전체보기
              </button>

              <button
                type="button"
                onClick={() => setReviewFilter('unreviewed')}
                className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                  reviewFilter === 'unreviewed'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>⏳ 미완료 오답만</span>
                <span className="text-[10px] opacity-80">({unreviewedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setReviewFilter('reviewed')}
                className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                  reviewFilter === 'reviewed'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>복습 완료된 문항</span>
                <span className="text-[10px] opacity-80">({reviewedCount})</span>
              </button>
            </div>

            {/* Search Input and Expand All Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="문제, 단원, 해설 키워드 검색..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all"
                />
                {searchKeyword && (
                  <button
                    type="button"
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {filteredQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={toggleExpandAll}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl whitespace-nowrap transition-all border border-slate-200"
                >
                  {expandedWrongIds.size === filteredQuestions.length ? '모두 접기' : '모두 펼치기'}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* 4. CONTENT DISPLAY AREA */}

        {/* EMPTY STATE */}
        {filteredQuestions.length === 0 ? (
          <div className="p-12 sm:p-16 text-center bg-white rounded-3xl border-2 border-dashed border-rose-200 shadow-xs space-y-4">
            <div className="w-20 h-20 bg-rose-50 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-inner border border-rose-200">
              🎉
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                {totalCount === 0
                  ? '기록된 오답 문제가 없습니다!'
                  : '조건에 일치하는 오답 문제가 없습니다.'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                {totalCount === 0
                  ? '공통수학 및 통합과학 교과서 마스터 메뉴에서 [대단원 실전 TEST]를 응시하면, 틀렸던 문제들이 이곳에 자동 정리되어 맞춤 복습을 도와드립니다.'
                  : '선택하신 과목 필터, 복습 상태 또는 검색어 조건을 변경해보세요.'}
              </p>
            </div>

            {onNavigateToSubject && totalCount === 0 && (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => onNavigateToSubject('math', 'unit_tests')}
                  className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-black transition-all shadow-md flex items-center gap-2"
                >
                  <span>📐 공통수학 TEST 응시하러 가기</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToSubject('science', 'unit_tests')}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-black transition-all shadow-md flex items-center gap-2"
                >
                  <span>🔬 통합과학 TEST 응시하러 가기</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ========================================================== */
          /* 4. LIST & ACCORDION VIEW (전체 오답 리스트) */
          /* ========================================================== */
          <div className="space-y-4">
            {filteredQuestions.map((item, idx) => {
              const isExpanded = expandedWrongIds.has(item.id);
              const isMath = item.subject === 'math';
              const retestChoice = retestAnswers[item.id];
              const hasRetested = retestChoice !== undefined;
              const isRetestCorrect = hasRetested && retestChoice === item.correctIndex;

              return (
                <div
                  key={item.id}
                  className={`rounded-3xl border-2 transition-all bg-white overflow-hidden shadow-xs ${
                    item.isReviewed
                      ? 'border-emerald-300 bg-emerald-50/10'
                      : isMath
                      ? 'border-blue-200 hover:border-blue-300'
                      : 'border-emerald-200 hover:border-emerald-300'
                  }`}
                >
                  {/* Card Header & Summary Bar */}
                  <div
                    onClick={() => toggleExpand(item.id)}
                    className="p-4 sm:p-5 cursor-pointer flex items-start justify-between gap-3 hover:bg-slate-50/70 transition-colors select-none"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-black ${
                            isMath ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isMath ? '📐 공통수학' : '🔬 통합과학'}
                        </span>
                        <span className="text-xs sm:text-sm font-black text-slate-800 truncate max-w-xs sm:max-w-md">
                          {item.quizTitle}
                        </span>
                        <span className="text-xs text-slate-400">· {item.date}</span>

                        {item.isReviewed ? (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>복습완료</span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                            ⏳ 복습필요
                          </span>
                        )}
                      </div>

                      <p className="text-sm sm:text-base font-black text-slate-900 line-clamp-2 leading-relaxed">
                        [Q{idx + 1}] {item.questionText}
                      </p>
                    </div>

                    {/* Right Quick Action Icons */}
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleReviewed(item.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all flex items-center gap-1 ${
                          item.isReviewed
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-500 hover:text-emerald-600'
                        }`}
                        title={item.isReviewed ? '복습 완료 취소' : '복습 완료 표시'}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{item.isReviewed ? '완료됨' : '복습완료'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWrongAnswer(item.id);
                        }}
                        className="p-1.5 sm:p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                        title="오답노트에서 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="p-1 text-slate-400">
                        <ChevronDown
                          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180 text-slate-800' : ''}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail Workspace */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 sm:px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/60 space-y-5"
                      >
                        {/* Question Diagram Image */}
                        {item.questionImage && (
                          <div className="rounded-2xl overflow-hidden border border-slate-200 max-w-md mx-auto bg-white p-2 shadow-xs">
                            <img
                              src={item.questionImage}
                              alt="문제 그림"
                              className="w-full h-auto object-contain cursor-pointer rounded-xl"
                              onClick={() => setZoomImage(item.questionImage!)}
                            />
                            <div className="text-center pt-1 text-[11px] text-slate-400 font-medium">
                              클릭하면 원본 크기로 확대됩니다.
                            </div>
                          </div>
                        )}

                        {/* Answer Comparison Box */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                          <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-900 space-y-1 shadow-2xs">
                            <span className="font-bold flex items-center gap-1.5 text-rose-700">
                              <span>❌</span> 내가 선택했던 오답:
                            </span>
                            <p className="font-black text-sm sm:text-base">
                              {item.userAnswerIndex !== undefined && item.options[item.userAnswerIndex]
                                ? `${item.userAnswerIndex + 1}번. ${item.options[item.userAnswerIndex]}`
                                : '미응답 (시간 초과 또는 미선택)'}
                            </p>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-900 space-y-1 shadow-2xs">
                            <span className="font-bold flex items-center gap-1.5 text-emerald-700">
                              <span>⭕</span> 실제 정답:
                            </span>
                            <p className="font-black text-sm sm:text-base">
                              {hasRetested ? (
                                `${item.correctIndex + 1}번. ${item.options[item.correctIndex]}`
                              ) : (
                                <span className="text-xs text-emerald-700 font-bold">
                                  🔒 아래에서 직접 풀어본 후 정답이 공개됩니다
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Interactive Retest / Options Section */}
                        <div className="space-y-2.5 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                              <RotateCcw className="w-4 h-4 text-blue-600" />
                              <span>다시 풀어보기 (선택지를 클릭해 직접 맞춰보세요)</span>
                            </span>
                            {hasRetested && (
                              <span
                                className={`text-xs font-black px-3 py-0.5 rounded-full ${
                                  isRetestCorrect
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                              >
                                {isRetestCorrect
                                  ? '🎉 정답을 맞췄습니다! 개념 완벽 이해 (답안 고정)'
                                  : '💡 오답입니다. 다른 보기를 눌러 다시 맞춰보세요'}
                              </span>
                            )}
                          </div>

                          <div className="space-y-2 pt-1">
                            {item.options.map((opt, optIdx) => {
                              const isCorrect = optIdx === item.correctIndex;
                              const isUserPick = optIdx === item.userAnswerIndex;
                              const isRetestPick = optIdx === retestChoice;

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  disabled={isRetestCorrect}
                                  onClick={() => handleSelectRetestOption(item.id, optIdx)}
                                  className={`w-full text-left p-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between border-2 transition-all ${
                                    isRetestPick
                                      ? isCorrect
                                        ? 'bg-emerald-100 text-emerald-950 border-emerald-500 ring-2 ring-emerald-300'
                                        : 'bg-rose-100 text-rose-950 border-rose-500 ring-2 ring-rose-300'
                                      : isCorrect && hasRetested
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : 'bg-slate-50/80 hover:bg-slate-100 text-slate-800 border-slate-200'
                                  } ${isRetestCorrect ? 'cursor-default' : ''}`}
                                >
                                  <span className="flex items-center gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-xs font-black shrink-0">
                                      {optIdx + 1}
                                    </span>
                                    <span>{opt}</span>
                                  </span>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {isCorrect && hasRetested && (
                                      <span className="text-[11px] font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                                        정답 ⭕
                                      </span>
                                    )}
                                    {isUserPick && (
                                      <span className="text-[11px] font-black text-rose-700 bg-white px-2 py-0.5 rounded-md border border-rose-200">
                                        시험 오답 ❌
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Detailed Commentary / Teacher Explanation */}
                        <div className="p-4 sm:p-5 bg-amber-50/90 rounded-2xl border-2 border-amber-200 text-xs sm:text-sm space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                            <span className="font-black text-amber-950 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-amber-600" />
                              <span>선생님의 정답 해설 & 핵심 풀이 과정</span>
                            </span>
                            <span className="text-xs text-amber-800 font-bold px-2 py-0.5 bg-amber-200/60 rounded-md">
                              오답 극복 포인트
                            </span>
                          </div>
                          <p className="text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                            {item.explanation}
                          </p>
                          {item.hint && (
                            <div className="pt-2 border-t border-amber-200/60 text-amber-950 text-xs font-bold flex items-center gap-1.5">
                              <span>💡 핵심 공식/개념:</span>
                              <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-amber-200">
                                {item.hint}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Student Attached Photos / Handwritten Solution */}
                        {item.userAttachedPhotos && item.userAttachedPhotos.length > 0 && (
                          <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                            <span className="text-xs font-bold text-slate-700 block">
                              📸 내가 시험 중 첨부했던 손글씨/풀이 사진 ({item.userAttachedPhotos.length}장)
                            </span>
                            <div className="flex items-center gap-2 overflow-x-auto py-1">
                              {item.userAttachedPhotos.map((photo, pIdx) => (
                                <div
                                  key={pIdx}
                                  onClick={() => setZoomImage(photo)}
                                  className="w-20 h-20 rounded-xl overflow-hidden border border-slate-300 relative group cursor-pointer shrink-0 bg-slate-100"
                                >
                                  <img
                                    src={photo}
                                    alt="내 풀이"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                    <Maximize2 className="w-4 h-4" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Bottom Quick Review Complete Action */}
                        <div className="pt-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleToggleReviewed(item.id)}
                            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black shadow-xs transition-all flex items-center gap-2 active:scale-95 ${
                              item.isReviewed
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              {item.isReviewed
                                ? '복습 완료됨 (클릭 시 취소)'
                                : '이 문제 완벽히 복습 완료하기'}
                            </span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Clear All Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border-2 border-rose-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="w-8 h-8" />
                <h4 className="text-base font-black text-slate-900">오답노트 전체 삭제</h4>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                오답노트에 기록된 모든 ({totalCount}개) 문제를 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleClearAllWrongAnswers}
                  className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  전체 삭제하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enlarged Photo Lightbox Modal */}
      <AnimatePresence>
        {zoomImage && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setZoomImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-2xl max-h-[85vh] bg-white rounded-3xl p-2 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={zoomImage}
                alt="확대 사진"
                className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
