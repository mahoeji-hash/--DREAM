import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  XCircle,
  Award,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Clock,
  BookOpen,
  X,
  ChevronRight,
  Lightbulb,
  Camera,
  Upload,
  Image as ImageIcon,
  Trash2,
  Maximize2,
  PenTool,
  PlusCircle,
} from 'lucide-react';
import { UnitQuiz, QuizQuestion } from '../data/mockUnitTests';
import { QuizAttemptRecord, QuizWrongAnswer } from '../types';

const CIRCLED_NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

interface UnitTestModalProps {
  quiz: UnitQuiz;
  userRole?: 'student' | 'admin';
  onClose: () => void;
  onCompleteQuiz?: (score: number, total: number, attempt?: QuizAttemptRecord) => void;
  onDeleteQuestion?: (quizId: string, questionId: string) => void;
  onOpenAddQuestion?: (quizId: string) => void;
}

export const UnitTestModal: React.FC<UnitTestModalProps> = ({
  quiz,
  userRole = 'student',
  onClose,
  onCompleteQuiz,
  onDeleteQuestion,
  onOpenAddQuestion,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Active Countdown Timer (Admin Configured Minutes)
  const initialSeconds = (quiz.estimatedMinutes ?? 10) * 60;
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
  const [isTimeUp, setIsTimeUp] = useState(false);

  // Student attached solution photos (indexed by question index)
  const [attachedPhotos, setAttachedPhotos] = useState<Record<number, string[]>>({});
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // In-app deletion confirmation & toast notification (large prominent modal dialog)
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; num: number; text: string } | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const totalQ = quiz.questions?.length || 0;
  const currentQ = totalQ > 0 && currentIndex < totalQ ? quiz.questions[currentIndex] : null;
  const isLast = totalQ > 0 && currentIndex === totalQ - 1;

  // Ensure currentIndex stays within bounds if a question gets deleted
  useEffect(() => {
    if (totalQ > 0 && currentIndex >= totalQ) {
      setCurrentIndex(Math.max(0, totalQ - 1));
    }
  }, [totalQ, currentIndex]);

  const calculateScore = () => {
    let correctCount = 0;
    quiz.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        correctCount += 1;
      }
    });
    return correctCount;
  };

  const buildAttemptRecord = (answers: Record<number, number>): QuizAttemptRecord => {
    const wrongAnswers: QuizWrongAnswer[] = [];
    quiz.questions.forEach((q, idx) => {
      const userChoice = answers[idx];
      if (userChoice !== q.correctIndex) {
        wrongAnswers.push({
          id: `wrong-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          quizId: quiz.id,
          quizTitle: quiz.chapterName || quiz.badge,
          unitName: quiz.unitName,
          subject: quiz.subject,
          questionId: q.id,
          questionText: q.questionText,
          options: q.options,
          userAnswerIndex: userChoice,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          hint: q.hint,
          questionImage: q.questionImage,
          explanationImage: q.explanationImage,
          userAttachedPhotos: attachedPhotos[idx] || [],
          date: new Date().toISOString(),
          isReviewed: false,
        });
      }
    });

    const correctScore = quiz.questions.length - wrongAnswers.length;
    const pct = quiz.questions.length > 0 ? Math.round((correctScore / quiz.questions.length) * 100) : 0;

    return {
      id: `attempt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      quizId: quiz.id,
      quizTitle: quiz.chapterName || quiz.badge,
      unitName: quiz.unitName,
      subject: quiz.subject,
      score: correctScore,
      totalQuestions: quiz.questions.length,
      percentage: pct,
      completedAt: new Date().toISOString(),
      wrongAnswers,
    };
  };

  // Timer Tick Effect
  useEffect(() => {
    if (isSubmitted || totalQ === 0 || quiz.estimatedMinutes <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimeUp(true);
          setIsSubmitted(true);
          const score = calculateScore();
          const attempt = buildAttemptRecord(selectedAnswers);
          if (onCompleteQuiz) {
            onCompleteQuiz(score, totalQ, attempt);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted, totalQ, quiz.estimatedMinutes, selectedAnswers, attachedPhotos]);

  const handleSelectOption = (optIdx: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optIdx,
    }));
  };

  const handleNext = () => {
    setShowHint(false);
    if (!isLast) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setShowHint(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Photo Attachment Handlers
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        const photoData = ev.target.result;
        setAttachedPhotos((prev) => {
          const currentList = prev[currentIndex] || [];
          return {
            ...prev,
            [currentIndex]: [...currentList, photoData],
          };
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = (photoIdx: number) => {
    setAttachedPhotos((prev) => {
      const currentList = prev[currentIndex] || [];
      const updated = currentList.filter((_, idx) => idx !== photoIdx);
      return {
        ...prev,
        [currentIndex]: updated,
      };
    });
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    const score = calculateScore();
    const attempt = buildAttemptRecord(selectedAnswers);
    if (onCompleteQuiz) {
      onCompleteQuiz(score, totalQ, attempt);
    }
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setAttachedPhotos({});
    setIsSubmitted(false);
    setIsTimeUp(false);
    setSecondsLeft((quiz.estimatedMinutes ?? 10) * 60);
    setCurrentIndex(0);
    setShowHint(false);
  };

  const score = calculateScore();
  const percentage = totalQ > 0 ? Math.round((score / totalQ) * 100) : 0;

  const isMath = quiz.subject === 'math';
  const themeColor = isMath ? 'text-blue-600' : 'text-emerald-600';
  const themeBg = isMath ? 'bg-blue-600' : 'bg-emerald-600';
  const themeBorder = isMath ? 'border-blue-300' : 'border-emerald-300';
  const themeLightBg = isMath ? 'bg-blue-50' : 'bg-emerald-50';

  const currentPhotos = attachedPhotos[currentIndex] || [];

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isUrgent = quiz.estimatedMinutes > 0 && secondsLeft <= 120;

  return (
    <motion.div
      id="unit-test-fullscreen-view"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-[#FBF9F5] flex flex-col w-full h-full overflow-hidden"
    >
      {/* Hidden File / Camera Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoFileUpload}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoFileUpload}
      />

      {/* Top Exam Navigation Bar */}
      <div
        className={`px-4 sm:px-8 py-3.5 text-white flex items-center justify-between shadow-md shrink-0 ${
          isMath
            ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500'
            : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs"
            title="시험 나가기"
          >
            <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <span className="hidden sm:inline">시험 나가기</span>
          </button>

          <div className="h-6 w-[1px] bg-white/30 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/25 text-xs font-black tracking-wide uppercase">
              {quiz.badge}
            </span>
            <span className="text-xs text-white/90 font-bold hidden md:inline">
              {quiz.chapterName}
            </span>
            <h1 className="text-sm sm:text-base font-black text-white ml-0.5">
              {quiz.unitName} 실전 TEST
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!isSubmitted && totalQ > 0 && quiz.estimatedMinutes > 0 && (
            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-inner ${
                isUrgent
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-black/25 text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{timeFormatted}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Toast Notice Banner */}
      {toastNotice && (
        <div className="bg-emerald-600 text-white text-xs font-black py-2 px-4 text-center animate-in fade-in flex items-center justify-center gap-2 shadow-inner shrink-0">
          <span>✓</span>
          <span>{toastNotice}</span>
        </div>
      )}

      {/* Test Body */}
      <div className="flex-1 overflow-y-auto w-full p-4 sm:p-6 sm:px-8">
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
          {totalQ === 0 ? (
            <div className="py-16 text-center space-y-4 bg-white rounded-3xl p-8 border-2 border-slate-200 shadow-sm">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center text-3xl">
                📝
              </div>
              <h3 className="text-lg font-black text-slate-800">
                아직 등록된 TEST 문제가 없습니다.
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                선생님(관리자) 모드에서 <strong>'+ 문제 출제하기'</strong> 버튼을 눌러 이 대단원에 새로운 문제를 직접 출제할 수 있습니다.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs sm:text-sm font-black shadow-md transition-all"
              >
                교과서 화면으로 돌아가기
              </button>
            </div>
          ) : !isSubmitted ? (
            <>
              {/* Question Progress Bar & Stepper */}
              <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs font-black text-slate-700 flex-wrap gap-2">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    진행률: <strong className={`${themeColor} text-sm`}>{currentIndex + 1}</strong> / {totalQ}번 문항
                  </span>
                  <span className="text-slate-400">
                    답안 제출율: {Object.keys(selectedAnswers).length} / {totalQ} 완료
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full transition-all duration-300 ${themeBg}`}
                    style={{ width: `${((currentIndex + 1) / totalQ) * 100}%` }}
                  />
                </div>

                {/* Quick Question Stepper Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-none">
                  {quiz.questions.map((q, idx) => {
                    const isAnswered = selectedAnswers[idx] !== undefined;
                    const isCurrent = idx === currentIndex;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-8 h-8 rounded-xl text-xs font-black transition-all flex items-center justify-center shrink-0 border ${
                          isCurrent
                            ? `${themeBg} text-white border-transparent shadow-sm scale-105`
                            : isAnswered
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Question Box */}
              {currentQ ? (
                <div className="p-4 sm:p-5 bg-white rounded-2xl border-2 border-amber-100 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black text-white ${themeBg}`}>
                        Q{currentIndex + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-500">실전 객관식 문제</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {currentPhotos.length > 0 && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <Camera className="w-3 h-3 text-emerald-600" />
                          <span>풀이 사진 {currentPhotos.length}장</span>
                        </span>
                      )}

                      {/* Admin Quick Actions on this test question */}
                      {userRole === 'admin' && (
                        <div className="flex items-center gap-1.5 bg-amber-50 p-1 rounded-xl border border-amber-200">
                          {onOpenAddQuestion && (
                            <button
                              type="button"
                              onClick={() => onOpenAddQuestion(quiz.id)}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-2xs"
                              title="새 문제 출제하기"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>문항 추가</span>
                            </button>
                          )}
                          {onDeleteQuestion && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmTarget({ id: currentQ.id, num: currentIndex + 1, text: currentQ.questionText })}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold border border-rose-200 flex items-center gap-1 transition-all"
                              title="이 문항 삭제하기"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>문항 삭제 (선생님)</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Problem Question Image / Diagram (if attached by teacher) */}
                  {currentQ.questionImage && (
                    <div className="relative rounded-xl overflow-hidden border-2 border-amber-200 bg-slate-50 max-h-48 group">
                      <img
                        src={currentQ.questionImage}
                        alt="문제 그림/도형"
                        className="w-full h-auto max-h-48 object-contain cursor-pointer"
                        onClick={() => setZoomImage(currentQ.questionImage || null)}
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setZoomImage(currentQ.questionImage || null)}
                        className="absolute bottom-2 right-2 p-1.5 bg-black/60 text-white rounded-lg text-xs font-bold flex items-center gap-1 opacity-90 hover:opacity-100"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>크게 보기</span>
                      </button>
                    </div>
                  )}

                  <p className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed whitespace-pre-line">
                    {currentQ.questionText}
                  </p>

                  {/* Hint toggle */}
                  {currentQ.hint && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowHint(!showHint)}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200"
                      >
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                        <span>{showHint ? '힌트 접기' : '💡 문제 풀이 힌트 보기'}</span>
                      </button>
                      {showHint && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2 p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium"
                        >
                          {currentQ.hint}
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border-2 border-dashed border-amber-200 space-y-3">
                  <span className="text-3xl block">📭</span>
                  <p className="text-sm font-bold text-slate-700">이 TEST에 등록된 문제가 없습니다.</p>
                  {userRole === 'admin' && onOpenAddQuestion && (
                    <button
                      type="button"
                      onClick={() => onOpenAddQuestion(quiz.id)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 mx-auto"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>새 문제 출제하기</span>
                    </button>
                  )}
                </div>
              )}

              {/* Options */}
              {currentQ && (
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    보기 중 정답을 선택해주세요:
                  </label>
                  {currentQ.options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[currentIndex] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(optIdx)}
                        className={`w-full p-3.5 rounded-2xl text-left font-bold text-xs sm:text-sm flex items-center justify-between border-2 transition-all active:scale-[0.99] ${
                          isSelected
                            ? `${themeLightBg} ${themeBorder} shadow-sm scale-[1.01]`
                            : 'bg-white border-slate-200 hover:border-amber-300 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center border shrink-0 ${
                              isSelected
                                ? `${themeBg} text-white border-transparent`
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {CIRCLED_NUMBERS[optIdx] || optIdx + 1}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {isSelected && <CheckCircle2 className={`w-5 h-5 ${themeColor}`} />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Photo & Solution Scratchpad Attachment Section */}
              <div className="p-3.5 bg-amber-50/70 rounded-2xl border-2 border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-700" />
                    <span className="text-xs font-black text-amber-950">
                      내 풀이 사진 첨부
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-800 font-semibold">
                    (선택 사항 · 오답노트 보관용)
                  </span>
                </div>

                {/* Upload Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="py-2 px-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition-all active:scale-95"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-600" />
                    <span>카메라 촬영</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2 px-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition-all active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-600" />
                    <span>사진 앨범</span>
                  </button>
                </div>

                {/* Attached Photo Thumbnails */}
                {currentPhotos.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        첨부된 풀이 이미지 ({currentPhotos.length}장):
                      </span>
                      <span className="text-[10px] text-amber-800 font-semibold">
                        클릭 시 1:1 원본 확대
                      </span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {currentPhotos.map((photoUrl, pIdx) => (
                        <div
                          key={pIdx}
                          className="relative w-20 h-20 aspect-square rounded-2xl overflow-hidden border-2 border-amber-300 shrink-0 bg-white group shadow-2xs flex items-center justify-center p-1"
                        >
                          <img
                            src={photoUrl}
                            alt={`첨부 사진 ${pIdx + 1}`}
                            className="w-full h-full object-contain cursor-pointer"
                            onClick={() => setZoomImage(photoUrl)}
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(pIdx)}
                            className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-xs transition-transform active:scale-95"
                            title="사진 삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setZoomImage(photoUrl)}
                            className="absolute bottom-1 right-1 p-1 bg-black/70 text-white rounded-full hover:bg-black/90 transition-transform active:scale-95"
                            title="확대"
                          >
                            <Maximize2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-800/70 text-center py-1">
                    문제를 풀며 작성한 연습장 노트나 풀이 과정을 사진으로 찍어 남겨두면 나중에 다시 검토할 수 있습니다.
                  </p>
                )}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  이전 문제
                </button>

                {isLast ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={Object.keys(selectedAnswers).length < totalQ}
                    className={`px-5 py-2.5 rounded-xl text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5 ${
                      Object.keys(selectedAnswers).length < totalQ
                        ? 'bg-slate-400 opacity-60 cursor-not-allowed'
                        : `${themeBg} hover:opacity-90`
                    }`}
                  >
                    <span>채점 및 결과 보기</span>
                    <Sparkles className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5 ${themeBg} hover:opacity-90`}
                  >
                    <span>다음 문제</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </>
          ) : (
            /* ========================================================== */
            /* RESULT & REVIEW SCREEN */
            /* ========================================================== */
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5"
            >
              {/* Time Up Alert Banner */}
              {isTimeUp && (
                <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 text-xs font-bold flex items-center gap-2.5 shadow-sm animate-bounce">
                  <span className="text-xl">⏰</span>
                  <div>
                    <p className="font-black text-rose-900">
                      설정된 시험 시간({quiz.estimatedMinutes}분)이 종료되었습니다!
                    </p>
                    <p className="text-[11px] text-rose-700 font-medium">
                      작성된 답안을 바탕으로 자동 채점되었습니다.
                    </p>
                  </div>
                </div>
              )}

              {/* Score Header Card */}
              <div
                className={`p-6 rounded-3xl text-center space-y-2 border-2 ${
                  percentage >= 80
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-blue-50 border-blue-200 text-slate-900'
                }`}
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-white shadow-md flex items-center justify-center text-3xl">
                  {percentage === 100 ? '👑' : percentage >= 60 ? '🎉' : '💪'}
                </div>
                <h3 className="text-xl font-black">
                  {percentage === 100
                    ? '단원 마스터 완벽 달성!'
                    : percentage >= 60
                    ? '좋은 성적으로 통과했어요!'
                    : '다시 한번 복습해볼까요?'}
                </h3>
                <div className="flex items-center justify-center gap-2 text-2xl font-black">
                  <span className={themeColor}>{score}개 맞음</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-slate-700">{totalQ}문제 ({percentage}점)</span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  {percentage >= 80
                    ? '해당 단원의 핵심 개념을 완벽하게 이해하고 있습니다.'
                    : '틀린 문제의 해설과 개념을 꼼꼼하게 확인해보세요!'}
                </p>
              </div>

              {/* Question Review List */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase">
                  <span>📝</span> 문항별 상세 해설 및 오답 체크
                </h4>

                {quiz.questions.map((q, idx) => {
                  const userAns = selectedAnswers[idx];
                  const isCorrect = userAns === q.correctIndex;
                  const qPhotos = attachedPhotos[idx] || [];

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border-2 space-y-3 ${
                        isCorrect
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-rose-50/50 border-rose-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center text-white shrink-0 ${
                              isCorrect ? 'bg-emerald-600' : 'bg-rose-500'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800 line-clamp-2">
                            {q.questionText}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              isCorrect
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isCorrect ? '정답 ⭕' : '오답 ❌'}
                          </span>
                          {userRole === 'admin' && onDeleteQuestion && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmTarget({ id: q.id, num: idx + 1, text: q.questionText })}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 flex items-center gap-1 transition-all"
                              title="선생님 권한으로 문항 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>삭제</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Question Diagram / Image if present */}
                      {q.questionImage && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-white max-h-36">
                          <img
                            src={q.questionImage}
                            alt="문제 도판"
                            className="w-full h-36 object-contain cursor-pointer"
                            onClick={() => setZoomImage(q.questionImage || null)}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      {/* Student's Attached Solution Photos in Review Screen */}
                      {qPhotos.length > 0 && (
                        <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200 space-y-1.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900">
                            <Camera className="w-3.5 h-3.5 text-amber-600" />
                            <span>내가 첨부한 풀이 사진 ({qPhotos.length}장)</span>
                          </div>
                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {qPhotos.map((pUrl, pIdx) => (
                              <div
                                key={pIdx}
                                className="relative w-16 h-16 aspect-square rounded-xl overflow-hidden border-2 border-amber-300 shrink-0 cursor-pointer shadow-2xs group bg-white flex items-center justify-center p-1"
                                onClick={() => setZoomImage(pUrl)}
                              >
                                <img
                                  src={pUrl}
                                  alt={`내 풀이 ${pIdx + 1}`}
                                  className="w-full h-full object-contain"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition-opacity">
                                  확대
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-xs space-y-1.5 bg-white p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>
                            내가 고른 답:{' '}
                            <strong>
                              {userAns !== undefined
                                ? `${CIRCLED_NUMBERS[userAns] || userAns + 1}번 (${q.options[userAns]})`
                                : '선택 안함'}
                            </strong>
                          </span>
                          <span className="text-emerald-700 font-black">
                            정답: {CIRCLED_NUMBERS[q.correctIndex] || q.correctIndex + 1}번 ({q.options[q.correctIndex]})
                          </span>
                        </div>

                        {/* Explanation Image if present */}
                        {q.explanationImage && (
                          <div className="pt-2">
                            <img
                              src={q.explanationImage}
                              alt="해설 풀이 도판"
                              className="w-full max-h-40 object-contain rounded-lg border border-slate-200 cursor-pointer"
                              onClick={() => setZoomImage(q.explanationImage || null)}
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        <div className="mt-2 pt-2 border-t border-slate-100 text-slate-700 whitespace-pre-line leading-relaxed">
                          <strong className="text-slate-900 block mb-0.5">💡 문제 풀이 및 해설:</strong>
                          {q.explanation}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Retry & Finish Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>다시 풀기</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={`flex-1 py-3 rounded-2xl text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 transition-all ${themeBg} hover:opacity-90`}
                >
                  <span>TEST 완료하기</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Full Image Zoom Lightbox Modal */}
      <AnimatePresence>
        {zoomImage && (
          <div
            className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setZoomImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="absolute top-3 right-3 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full shadow-md"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={zoomImage}
                alt="확대 이미지"
                className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Prominent Large Question Deletion Confirmation Modal Dialog */}
      <AnimatePresence>
        {deleteConfirmTarget && (
          <div
            className="fixed inset-0 z-80 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeleteConfirmTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-rose-200 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-rose-500 text-white p-5 sm:p-6 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                    <Trash2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">선생님 권한 — 문항 영구 삭제</h3>
                    <p className="text-xs text-rose-100 font-medium">Q{deleteConfirmTarget.num}번 문제를 완전히 삭제합니다</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTarget(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 flex items-start gap-3">
                  <span className="text-2xl shrink-0">⚠️</span>
                  <div className="text-xs sm:text-sm text-rose-900 leading-relaxed font-bold">
                    <p className="font-black text-rose-950">정말로 이 문제를 대단원 TEST에서 삭제하시겠습니까?</p>
                    <p className="text-rose-600 font-semibold mt-1">
                      삭제된 문제는 즉시 시험 목록에서 완전히 제거되며 복구할 수 없습니다.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded-lg text-xs font-bold">
                      삭제 대상: Q{deleteConfirmTarget.num}번
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">미리보기</span>
                  </label>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 font-medium max-h-36 overflow-y-auto leading-relaxed whitespace-pre-wrap shadow-inner">
                    {deleteConfirmTarget.text}
                  </div>
                </div>

                {/* Big Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmTarget(null)}
                    className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-black transition-all active:scale-98"
                  >
                    취소하기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteQuestion && deleteConfirmTarget) {
                        onDeleteQuestion(quiz.id, deleteConfirmTarget.id);
                        setToastNotice(`Q${deleteConfirmTarget.num}번 문항이 완전히 삭제되었습니다.`);
                        setTimeout(() => setToastNotice(null), 3000);
                        setDeleteConfirmTarget(null);
                      }
                    }}
                    className="py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-black shadow-lg shadow-rose-200 transition-all active:scale-98 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>영구 삭제 확인</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
export default UnitTestModal;
