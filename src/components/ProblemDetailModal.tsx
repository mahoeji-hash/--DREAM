import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  MessageSquarePlus,
  HelpCircle,
  Share2,
  Lightbulb,
  Image as ImageIcon,
  Maximize2,
  Trash2,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { ProblemItem, TextbookInfo, UserRole } from '../types';
import { ProblemDiagram } from './ProblemDiagram';

interface ProblemDetailModalProps {
  problem: ProblemItem;
  textbook?: TextbookInfo;
  isBookmarked: boolean;
  userRole?: UserRole;
  onToggleBookmark: (problemId: string) => void;
  onClose: () => void;
  onAskAIAboutProblem?: (problem: ProblemItem) => void;
  onDeleteProblem?: (problemId: string) => void;
  onUpdateProblem?: (updatedProblem: ProblemItem) => void;
}

export const ProblemDetailModal: React.FC<ProblemDetailModalProps> = ({
  problem,
  textbook,
  isBookmarked,
  userRole = 'student',
  onToggleBookmark,
  onClose,
  onAskAIAboutProblem,
  onDeleteProblem,
  onUpdateProblem,
}) => {
  const [isSolved, setIsSolved] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleCelebrateSolved = () => {
    setIsSolved(true);
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#3B82F6', '#10B981', '#EC4899'],
      });
    } catch (e) {
      console.log('Confetti triggered');
    }
  };

  return (
    <motion.div
      id="problem-detail-fullscreen-view"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-[#FFFDF9] flex flex-col w-full h-full overflow-hidden"
    >
      {/* Full-width Top Navigation Header */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 px-4 sm:px-8 py-3.5 text-white flex items-center justify-between relative shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs"
            title="목록으로 돌아가기"
          >
            <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <span className="hidden sm:inline">교과서 목록</span>
          </button>

          <div className="h-6 w-[1px] bg-white/30 hidden sm:block" />

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-white/25 text-xs font-black tracking-wide">
              {textbook?.name || (problem.subject === 'math' ? '수학 교과서' : '과학 교과서')}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-900/30 text-xs font-black">
              p.{problem.pageNumber}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white text-amber-800 text-xs font-black shadow-xs">
              {problem.problemNumber}
            </span>
            <h1 className="text-sm sm:text-base font-black text-white ml-1 truncate max-w-[200px] sm:max-w-md">
              {problem.unitName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {userRole === 'admin' && onDeleteProblem && (
            confirmDelete ? (
              <div className="flex items-center gap-1 bg-rose-600/90 text-white p-1 rounded-xl shadow-md animate-in fade-in">
                <span className="text-[11px] font-black px-1">삭제할까요?</span>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteProblem(problem.id);
                    onClose();
                  }}
                  className="px-2 py-0.5 bg-white text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-black shadow-xs"
                >
                  삭제
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-1.5 py-0.5 bg-rose-800/80 hover:bg-rose-800 text-white rounded-lg text-xs font-bold"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="p-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                title="관리자 권한으로 문제 삭제"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-xs font-bold hidden sm:inline">문제 삭제</span>
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => onToggleBookmark(problem.id)}
            className={`p-2 sm:px-3 sm:py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-black ${
              isBookmarked
                ? 'bg-amber-100 text-amber-800 shadow-sm'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            title="북마크 저장"
          >
            {isBookmarked ? <BookmarkCheck className="w-4 h-4 fill-amber-600 text-amber-600" /> : <Bookmark className="w-4 h-4" />}
            <span className="hidden sm:inline">{isBookmarked ? '북마크됨' : '북마크'}</span>
          </button>
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

      {/* Screen Body */}
      <div className="flex-1 overflow-y-auto w-full p-4 sm:p-6 sm:px-8">
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
          {/* Problem Statement Card */}
          <div className="p-5 sm:p-6 bg-white rounded-3xl border-2 border-amber-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                {problem.problemType} · 난이도 [{problem.difficulty}]
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {problem.coreConcepts.map((concept, idx) => (
                  <span key={idx} className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-bold">
                    #{concept}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-slate-800 text-base sm:text-xl font-bold leading-relaxed whitespace-pre-line">
              {problem.problemText}
            </p>

            {/* Problem Diagram if present */}
            {problem.diagramSvgType && (
              <ProblemDiagram type={problem.diagramSvgType} label={problem.diagramLabel} />
            )}
          </div>

          {/* Step-by-step Solution */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                정확하고 알기 쉬운 단계별 풀이
              </h3>
            </div>

            {/* Attached Problem / Solution Photo */}
              {problem.solutionImage && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                      선생님 풀이 / 판서 사진
                    </span>
                    <span className="text-[11px] text-slate-500">클릭하여 확대</span>
                  </div>
                  <div
                    onClick={() => setZoomImage(problem.solutionImage || null)}
                    className="group relative rounded-2xl overflow-hidden border-2 border-amber-300 bg-slate-900 p-2 cursor-pointer flex items-center justify-center hover:shadow-md transition-all"
                  >
                    <img
                      src={problem.solutionImage}
                      alt="풀이 첨부 사진"
                      className="max-h-64 w-auto object-contain rounded-xl transition-transform group-hover:scale-101"
                    />
                    <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-xs text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-lg opacity-90 group-hover:opacity-100">
                      <Maximize2 className="w-3.5 h-3.5" /> 크게 보기
                    </div>
                  </div>
                </div>
              )}

              {/* Step list */}
              <div className="space-y-3">
                {problem.solutionSteps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                        {step.stepNumber}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-800 mb-1">
                          {step.title}
                        </h4>
                        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                          {step.explanation}
                        </p>
                        {step.formulaOrKey && (
                          <div className="mt-2.5 p-2.5 bg-sky-50/80 rounded-xl border border-sky-200 text-blue-900 font-mono text-xs sm:text-sm font-bold tracking-tight">
                            {step.formulaOrKey}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Final Answer Card */}
              <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white shadow-md flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-200 tracking-wider uppercase">최종 정답</span>
                  <p className="text-lg sm:text-xl font-black mt-0.5">{problem.finalAnswer}</p>
                </div>
                <button
                  onClick={handleCelebrateSolved}
                  className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                    isSolved
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white text-blue-700 hover:bg-amber-100 hover:text-amber-900'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSolved ? '이해 완료! 🎉' : '이해했어요!'}
                </button>
              </div>

              {/* Dream Mascot Tip */}
              <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-300 flex items-start gap-3">
                <div className="text-2xl">🐶</div>
                <div>
                  <div className="text-xs font-black text-amber-800 tracking-wide mb-0.5 flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                    풀어 DREAM 마스코트의 꿀팁!
                  </div>
                  <p className="text-amber-900 text-sm font-medium leading-relaxed">
                    {problem.dreamTip}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Enlarged Photo Lightbox Modal */}
      <AnimatePresence>
        {zoomImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomImage(null)}
            className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] bg-slate-950 rounded-2xl overflow-hidden border border-white/20 flex flex-col items-center shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-colors shadow-md"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={zoomImage}
                alt="확대 이미지"
                className="max-w-full max-h-[80vh] object-contain p-2"
              />
              <div className="p-2.5 text-center text-xs text-white/70 font-medium bg-black/50 w-full">
                바깥 영역이나 닫기 버튼을 누르면 닫힙니다
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
export default ProblemDetailModal;