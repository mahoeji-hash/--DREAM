import React, { useState, useRef, useEffect } from 'react';
import { useModalHistory } from '../utils/navigationHistory';
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
  Home,
  Pencil,
  Camera,
  Upload,
  PlayCircle,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { ProblemItem, TextbookInfo, UserRole } from '../types';
import { getCurriculumForSubject } from '../data/curriculumData';
import { uploadImageFileToBucket } from '../services/imageService';
import { ProblemDiagram } from './ProblemDiagram';
import { VideoLectureEmbed } from './VideoLectureEmbed';

interface ProblemDetailModalProps {
  problem: ProblemItem;
  textbook?: TextbookInfo;
  isBookmarked: boolean;
  userRole?: UserRole;
  onToggleBookmark: (problemId: string) => void;
  onClose: () => void;
  onGoHome?: () => void;
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
  onGoHome,
  onAskAIAboutProblem,
  onDeleteProblem,
  onUpdateProblem,
}) => {
  const [isSolved, setIsSolved] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editToast, setEditToast] = useState<string | null>(null);

  const curriculumChapters = getCurriculumForSubject(problem.subject);

  const findChapterAndSubUnit = (prob: ProblemItem) => {
    const ch =
      curriculumChapters.find(
        (c) =>
          c.fullName === prob.chapter ||
          c.chapterNumber === prob.unitNumber ||
          c.chapterName === prob.chapter ||
          (prob.chapter && c.fullName.includes(prob.chapter))
      ) || curriculumChapters[0];
    const su =
      (prob.subUnitId &&
        (ch.grandAssessment.id === prob.subUnitId
          ? ch.grandAssessment
          : ch.subUnits.find((s) => s.id === prob.subUnitId))) ||
      [ch.grandAssessment, ...ch.subUnits].find(
        (s) => s.title === prob.unitName || (prob.unitName && s.title.includes(prob.unitName))
      ) ||
      ch.subUnits[0] ||
      ch.grandAssessment;
    return { ch, su };
  };

  const initialMatch = findChapterAndSubUnit(problem);
  const [editChapterId, setEditChapterId] = useState(initialMatch.ch.id);
  const [editSubUnitId, setEditSubUnitId] = useState(initialMatch.su.id);
  const [editProblemType, setEditProblemType] = useState<ProblemItem['problemType']>(problem.problemType || '중단원 마무리');
  const [editDifficulty, setEditDifficulty] = useState<ProblemItem['difficulty']>(problem.difficulty || '보통');
  const [editPageNumber, setEditPageNumber] = useState(String(problem.pageNumber || 1));
  const [editProblemNumber, setEditProblemNumber] = useState(problem.problemNumber || '');
  const [editProblemImage, setEditProblemImage] = useState<string | null>(problem.problemImage || null);
  const [editSolutionImage, setEditSolutionImage] = useState<string | null>(problem.solutionImage || null);
  const [editVideoUrl, setEditVideoUrl] = useState(problem.videoUrl || '');
  const [editFinalAnswer, setEditFinalAnswer] = useState(problem.finalAnswer || '');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const editProbFileRef = useRef<HTMLInputElement>(null);
  const editProbCameraRef = useRef<HTMLInputElement>(null);
  const editSolFileRef = useRef<HTMLInputElement>(null);
  const editSolCameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const matched = findChapterAndSubUnit(problem);
    setEditChapterId(matched.ch.id);
    setEditSubUnitId(matched.su.id);
    setEditProblemType(problem.problemType || '중단원 마무리');
    setEditDifficulty(problem.difficulty || '보통');
    setEditPageNumber(String(problem.pageNumber || 1));
    setEditProblemNumber(problem.problemNumber || '');
    setEditProblemImage(problem.problemImage || null);
    setEditSolutionImage(problem.solutionImage || null);
    setEditVideoUrl(problem.videoUrl || '');
    setEditFinalAnswer(problem.finalAnswer || '');
    setIsEditing(false);
    setConfirmDelete(false);
  }, [problem.id]);

  useModalHistory(!!zoomImage, () => setZoomImage(null), 'problem-image-zoom');
  useModalHistory(isEditing, () => setIsEditing(false), 'problem-edit-mode');

  const handleOpenEdit = () => {
    if (userRole !== 'admin' || !onUpdateProblem) return;
    const matched = findChapterAndSubUnit(problem);
    setEditChapterId(matched.ch.id);
    setEditSubUnitId(matched.su.id);
    setEditProblemType(problem.problemType || '중단원 마무리');
    setEditDifficulty(problem.difficulty || '보통');
    setEditPageNumber(String(problem.pageNumber || 1));
    setEditProblemNumber(problem.problemNumber || '');
    setEditProblemImage(problem.problemImage || null);
    setEditSolutionImage(problem.solutionImage || null);
    setEditVideoUrl(problem.videoUrl || '');
    setEditFinalAnswer(problem.finalAnswer || '');
    setConfirmDelete(false);
    setIsEditing(true);
  };

  const handleUploadEditImage = async (file: File, target: 'problem' | 'solution') => {
    setIsUploadingImage(true);
    setEditToast(target === 'problem' ? '문제 사진을 업로드 중...' : '풀이 사진을 업로드 중...');
    try {
      const res = await uploadImageFileToBucket(file, target === 'problem' ? 'problems' : 'solutions');
      if (res.url) {
        if (target === 'problem') setEditProblemImage(res.url);
        else setEditSolutionImage(res.url);
        setEditToast(res.uploadedToStorage ? '사진이 업로드되었습니다!' : '사진이 준비되었습니다.');
      } else {
        setEditToast('사진 업로드에 실패했습니다.');
      }
    } finally {
      setIsUploadingImage(false);
      setTimeout(() => setEditToast(null), 2500);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin' || !onUpdateProblem) return;
    if (!editFinalAnswer.trim()) {
      setEditToast('최종 정답(답칸)을 입력해주세요.');
      setTimeout(() => setEditToast(null), 3000);
      return;
    }

    const targetCh = curriculumChapters.find((c) => c.id === editChapterId) || curriculumChapters[0];
    const targetSu =
      (targetCh.grandAssessment.id === editSubUnitId
        ? targetCh.grandAssessment
        : targetCh.subUnits.find((s) => s.id === editSubUnitId)) ||
      targetCh.subUnits[0] ||
      targetCh.grandAssessment;

    const updated: ProblemItem = {
      ...problem,
      chapter: targetCh.fullName,
      unitNumber: targetCh.chapterNumber,
      unitName: targetSu.title,
      subUnitId: targetSu.id,
      unitCode: targetSu.unitCode,
      pageNumber: parseInt(editPageNumber, 10) || 1,
      problemNumber: editProblemNumber.trim() || problem.problemNumber,
      problemType: editProblemType,
      difficulty: editDifficulty,
      problemImage: editProblemImage || undefined,
      solutionImage: editSolutionImage || undefined,
      videoUrl: editVideoUrl.trim() || undefined,
      finalAnswer: editFinalAnswer.trim(),
      coreConcepts: [targetSu.title, editProblemType],
    };

    onUpdateProblem(updated);
    setIsEditing(false);
    setEditToast('문제가 성공적으로 수정되었습니다!');
    setTimeout(() => setEditToast(null), 3000);
  };

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
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs cursor-pointer touch-manipulation select-none"
            title="교과서 목록으로 돌아가기"
          >
            <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <span className="hidden sm:inline">교과서 목록</span>
          </button>

          {onGoHome && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoHome();
              }}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-amber-700/30 hover:bg-amber-800/40 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs border border-white/20 cursor-pointer touch-manipulation select-none"
              title="홈 화면으로 바로가기"
            >
              <Home className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-100" />
              <span>홈으로</span>
            </button>
          )}

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
          {userRole === 'admin' && onUpdateProblem && (
            isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/25 hover:bg-white/35 text-white transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                title="수정 취소"
              >
                <X className="w-4 h-4" />
                <span className="text-xs font-bold hidden sm:inline">수정 취소</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenEdit}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-700 text-white transition-all active:scale-95 flex items-center gap-1 shadow-sm border border-white/20"
                title="관리자 권한으로 문제 수정"
              >
                <Pencil className="w-4 h-4" />
                <span className="text-xs font-bold hidden sm:inline">문제 수정</span>
              </button>
            )
          )}
          {userRole === 'admin' && onDeleteProblem && !isEditing && (
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
          {editToast && (
            <div className="px-4 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs sm:text-sm font-black text-center shadow-md">
              {editToast}
            </div>
          )}

          {isEditing && userRole === 'admin' ? (
            <form onSubmit={handleSaveEdit} className="space-y-4 bg-white p-5 sm:p-7 rounded-3xl border-2 border-blue-300 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base sm:text-lg font-black text-blue-950 flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-blue-600" />
                  <span>교과서 문제 &amp; 풀이 수정 (관리자 전용)</span>
                </h2>
              </div>

              {/* Chapter & SubUnit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">대단원</label>
                  <select
                    value={editChapterId}
                    onChange={(e) => {
                      const chId = e.target.value;
                      setEditChapterId(chId);
                      const ch = curriculumChapters.find((c) => c.id === chId) || curriculumChapters[0];
                      const firstSu = ch.subUnits[0] || ch.grandAssessment;
                      setEditSubUnitId(firstSu.id);
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-amber-200 text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {curriculumChapters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.chapterNumber}단원: {ch.chapterName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">중단원 / 대단원 평가</label>
                  {(() => {
                    const ch = curriculumChapters.find((c) => c.id === editChapterId) || curriculumChapters[0];
                    return (
                      <select
                        value={editSubUnitId}
                        onChange={(e) => setEditSubUnitId(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-amber-200 text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        {ch.subUnits.map((su) => (
                          <option key={su.id} value={su.id}>
                            [중단원] {su.title}
                          </option>
                        ))}
                        <option value={ch.grandAssessment.id}>
                          [대단원] {ch.grandAssessment.title}
                        </option>
                      </select>
                    );
                  })()}
                </div>
              </div>

              {/* Type, Difficulty, Page, Problem Number */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">문제 분류</label>
                  <select
                    value={editProblemType}
                    onChange={(e) => setEditProblemType(e.target.value as ProblemItem['problemType'])}
                    className="w-full px-2.5 py-2 bg-white rounded-xl border border-amber-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="중단원 마무리">중단원 마무리</option>
                    <option value="대단원 평가">대단원 평가</option>
                    <option value="발전/심화 문제">발전/심화 문제</option>
                    <option value="개념 예제">개념 예제</option>
                    <option value="확인 문제">확인 문제</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">난이도</label>
                  <select
                    value={editDifficulty}
                    onChange={(e) => setEditDifficulty(e.target.value as ProblemItem['difficulty'])}
                    className="w-full px-2.5 py-2 bg-white rounded-xl border border-amber-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="쉬움">🟢 쉬움</option>
                    <option value="보통">🟡 보통</option>
                    <option value="도전">🟠 도전</option>
                    <option value="심화">🔴 심화</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">교과서 쪽수</label>
                  <input
                    type="number"
                    value={editPageNumber}
                    onChange={(e) => setEditPageNumber(e.target.value)}
                    required
                    className="w-full px-2.5 py-2 bg-white rounded-xl border border-amber-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">문제 번호</label>
                  <input
                    type="text"
                    value={editProblemNumber}
                    onChange={(e) => setEditProblemNumber(e.target.value)}
                    required
                    className="w-full px-2.5 py-2 bg-white rounded-xl border border-amber-200 text-xs font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              {/* Problem Photo */}
              <div className="p-4 bg-blue-50/70 rounded-2xl border-2 border-blue-200 space-y-2">
                <label className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>교과서 문제 사진</span>
                </label>
                {editProblemImage ? (
                  <div className="relative rounded-2xl border-2 border-blue-300 bg-slate-900 p-2 flex flex-col items-center">
                    <img src={editProblemImage} alt="문제 사진" className="max-h-52 rounded-xl object-contain" />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => editProbFileRef.current?.click()}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" /> 사진 교체
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditProblemImage(null)}
                        className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> 사진 삭제
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => editProbCameraRef.current?.click()}
                      className="py-2.5 px-3 bg-white hover:bg-blue-100 border border-blue-300 rounded-xl text-xs font-bold text-blue-900 flex items-center justify-center gap-1.5"
                    >
                      <Camera className="w-4 h-4 text-blue-600" />
                      <span>문제 촬영</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => editProbFileRef.current?.click()}
                      className="py-2.5 px-3 bg-white hover:bg-blue-100 border border-blue-300 rounded-xl text-xs font-bold text-blue-900 flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-4 h-4 text-blue-600" />
                      <span>문제 파일 찾기</span>
                    </button>
                  </div>
                )}
                <input
                  ref={editProbFileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadEditImage(f, 'problem');
                  }}
                  className="hidden"
                />
                <input
                  ref={editProbCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadEditImage(f, 'problem');
                  }}
                  className="hidden"
                />
              </div>

              {/* Solution Photo */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border-2 border-emerald-200 space-y-2">
                <label className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>선생님 풀이 / 판서 사진</span>
                </label>
                {editSolutionImage ? (
                  <div className="relative rounded-2xl border-2 border-emerald-300 bg-slate-900 p-2 flex flex-col items-center">
                    <img src={editSolutionImage} alt="풀이 사진" className="max-h-52 rounded-xl object-contain" />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => editSolFileRef.current?.click()}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" /> 사진 교체
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditSolutionImage(null)}
                        className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> 사진 삭제
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => editSolCameraRef.current?.click()}
                      className="py-2.5 px-3 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-center gap-1.5"
                    >
                      <Camera className="w-4 h-4 text-emerald-600" />
                      <span>풀이 촬영</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => editSolFileRef.current?.click()}
                      className="py-2.5 px-3 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>풀이 파일 찾기</span>
                    </button>
                  </div>
                )}
                <input
                  ref={editSolFileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadEditImage(f, 'solution');
                  }}
                  className="hidden"
                />
                <input
                  ref={editSolCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadEditImage(f, 'solution');
                  }}
                  className="hidden"
                />
              </div>

              {/* Video URL */}
              <div className="p-4 bg-amber-50/70 rounded-2xl border-2 border-amber-200 space-y-2">
                <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <PlayCircle className="w-4 h-4 text-rose-500" />
                  <span>인강 / 해설 동영상 강의 링크 (선택)</span>
                </label>
                <input
                  type="text"
                  placeholder="유튜브 해설 영상 링크 등"
                  value={editVideoUrl}
                  onChange={(e) => setEditVideoUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-amber-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                {editVideoUrl.trim() && (
                  <VideoLectureEmbed videoUrl={editVideoUrl} title="인강 해설 동영상 미리보기" />
                )}
              </div>

              {/* Final Answer */}
              <div className="p-4 bg-white rounded-2xl border-2 border-blue-300 space-y-1.5">
                <label className="text-xs font-black text-blue-950 flex items-center gap-1">
                  <span>최종 정답 (답칸)</span>
                  <span className="text-[10px] text-amber-700 font-black">* 필수</span>
                </label>
                <input
                  type="text"
                  value={editFinalAnswer}
                  onChange={(e) => setEditFinalAnswer(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-blue-50/50 rounded-xl border-2 border-blue-400 text-xs sm:text-sm font-black text-blue-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Edit Form Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isUploadingImage}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md active:scale-95 flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  <span>{isUploadingImage ? '업로드 중...' : '수정 내용 저장'}</span>
                </button>
              </div>
            </form>
          ) : (
            <>
          {/* Problem Statement Card (Photo / Text) */}
          <div className="p-5 sm:p-6 bg-white rounded-3xl border-2 border-amber-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                {problem.problemType} · 난이도 [{problem.difficulty}]
              </span>
              {problem.coreConcepts && problem.coreConcepts.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {problem.coreConcepts.map((concept, idx) => (
                    <span key={idx} className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-bold">
                      #{concept}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Problem Photo Attachment (Top Priority) */}
            {problem.problemImage ? (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1 text-blue-700 font-black">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    교과서 문제 사진
                  </span>
                  <span className="text-[11px] text-slate-500">클릭하여 확대</span>
                </div>
                <div
                  onClick={() => setZoomImage(problem.problemImage || null)}
                  className="group relative rounded-2xl overflow-hidden border-2 border-blue-200 bg-slate-900 p-2 cursor-pointer flex items-center justify-center hover:shadow-md transition-all"
                >
                  <img
                    src={problem.problemImage}
                    alt="교과서 문제 사진"
                    className="max-h-80 w-auto object-contain rounded-xl transition-transform group-hover:scale-101"
                  />
                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-xs text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-lg opacity-90 group-hover:opacity-100">
                    <Maximize2 className="w-3.5 h-3.5" /> 크게 보기
                  </div>
                </div>
              </div>
            ) : null}

            {/* Problem text fallback if present */}
            {problem.problemText ? (
              <p className="text-slate-800 text-base sm:text-lg font-bold leading-relaxed whitespace-pre-line">
                {problem.problemText}
              </p>
            ) : null}

            {/* Problem Diagram if present */}
            {problem.diagramSvgType && (
              <ProblemDiagram type={problem.diagramSvgType} label={problem.diagramLabel} />
            )}
          </div>

          {/* Solution & Video Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                해설 풀이 &amp; 인강 동영상
              </h3>
            </div>

            {/* 1. Video Lecture / Ingang Embed (if registered) */}
            {problem.videoUrl && (
              <VideoLectureEmbed
                videoUrl={problem.videoUrl}
                title={`${problem.problemNumber} 선생님 인강 해설`}
              />
            )}

            {/* 2. Solution Photo (선생님 풀이 사진) */}
            {problem.solutionImage ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1 text-emerald-700 font-black">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    선생님 풀이 / 판서 사진
                  </span>
                  <span className="text-[11px] text-slate-500">클릭하여 확대</span>
                </div>
                <div
                  onClick={() => setZoomImage(problem.solutionImage || null)}
                  className="group relative rounded-2xl overflow-hidden border-2 border-emerald-300 bg-slate-900 p-2 cursor-pointer flex items-center justify-center hover:shadow-md transition-all"
                >
                  <img
                    src={problem.solutionImage}
                    alt="풀이 첨부 사진"
                    className="max-h-80 w-auto object-contain rounded-xl transition-transform group-hover:scale-101"
                  />
                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-xs text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-lg opacity-90 group-hover:opacity-100">
                    <Maximize2 className="w-3.5 h-3.5" /> 크게 보기
                  </div>
                </div>
              </div>
            ) : null}

            {/* Fallback legacy text solution ONLY if neither solution photo nor video exists */}
            {!problem.solutionImage && !problem.videoUrl && problem.solutionSteps && problem.solutionSteps.length > 0 && (
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. Final Answer Card (답칸 그대로 유지) */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl text-white shadow-md flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-blue-200 tracking-wider uppercase">최종 정답 (답칸)</span>
                <p className="text-lg sm:text-2xl font-black mt-0.5 tracking-tight">{problem.finalAnswer}</p>
              </div>
              <button
                type="button"
                onClick={handleCelebrateSolved}
                className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 shrink-0 ${
                  isSolved
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white text-blue-700 hover:bg-amber-100 hover:text-amber-900'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSolved ? '이해 완료! 🎉' : '이해했어요!'}</span>
              </button>
            </div>
          </div>
            </>
          )}
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