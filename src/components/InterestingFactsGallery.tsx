import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  PlusCircle,
  Camera,
  Upload,
  Trash2,
  Heart,
  Maximize2,
  Minimize2,
  X,
  Play,
  Grid2X2,
  ListOrdered,
  Film,
  Image as ImageIcon,
  MessageSquareQuote,
  CheckCircle2,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';
import { InterestingFactItem, ComicCut, SubjectType, UserRole } from '../types';
import { compressImageFile } from '../services/imageService';

interface InterestingFactsGalleryProps {
  subject: SubjectType;
  userRole: UserRole;
  currentUserId?: string;
  facts: InterestingFactItem[];
  onAddNewFact: (fact: InterestingFactItem) => void;
  onDeleteFact: (factId: string) => void;
  onToggleLikeFact: (factId: string) => void;
}

const GRADIENT_PRESETS = [
  { label: '우주 코스믹 퍼플', value: 'from-purple-900 via-indigo-900 to-slate-950' },
  { label: '딥 오션 블루', value: 'from-blue-900 via-indigo-900 to-cyan-950' },
  { label: '에메랄드 바이오', value: 'from-emerald-900 via-teal-900 to-slate-950' },
  { label: '선셋 골든 앰버', value: 'from-amber-800 via-orange-900 to-slate-950' },
  { label: '루비 크림슨', value: 'from-rose-900 via-pink-950 to-slate-950' },
];

export const InterestingFactsGallery: React.FC<InterestingFactsGalleryProps> = ({
  subject,
  userRole,
  currentUserId = 'user_account_default',
  facts,
  onAddNewFact,
  onDeleteFact,
  onToggleLikeFact,
}) => {
  const [selectedFactId, setSelectedFactId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [factToDelete, setFactToDelete] = useState<InterestingFactItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Comic View Mode in Detail Modal: 'single' (한 컷씩 크게 보기) | 'grid' (2x2 격자) | 'scroll' (세로 웹툰)
  const [comicViewMode, setComicViewMode] = useState<'single' | 'grid' | 'scroll'>('single');
  const [currentCutIndex, setCurrentCutIndex] = useState<number>(0);

  // Interactive Fullscreen Zoom Lightbox State
  const [zoomLightbox, setZoomLightbox] = useState<{
    imageUrl: string;
    title: string;
    caption?: string;
    cutNumber?: number;
    totalCuts?: number;
    cutsList?: ComicCut[];
    activeCutIndex?: number;
  } | null>(null);

  const [zoomScale, setZoomScale] = useState<number>(1);
  const [showCaptionInZoom, setShowCaptionInZoom] = useState<boolean>(true);

  // Reset zoom scale when opening or changing image
  const openZoomForCut = (
    cuts: ComicCut[],
    index: number,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const cut = cuts[index];
    if (!cut) return;
    setZoomScale(1);
    setZoomLightbox({
      imageUrl: cut.imageUrl || '',
      title: cut.title || `${cut.cutNumber || index + 1}컷 이야기`,
      caption: cut.caption,
      cutNumber: cut.cutNumber || index + 1,
      totalCuts: cuts.length,
      cutsList: cuts,
      activeCutIndex: index,
    });
  };

  const openZoomForSingleImage = (imageUrl: string, title: string, caption?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoomScale(1);
    setZoomLightbox({
      imageUrl,
      title,
      caption,
    });
  };

  // Keyboard navigation for zoom lightbox and slide viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (zoomLightbox) {
        if (e.key === 'Escape') {
          setZoomLightbox(null);
        } else if (e.key === 'ArrowLeft' && zoomLightbox.cutsList && zoomLightbox.activeCutIndex !== undefined && zoomLightbox.activeCutIndex > 0) {
          openZoomForCut(zoomLightbox.cutsList, zoomLightbox.activeCutIndex - 1);
        } else if (e.key === 'ArrowRight' && zoomLightbox.cutsList && zoomLightbox.activeCutIndex !== undefined && zoomLightbox.activeCutIndex < zoomLightbox.cutsList.length - 1) {
          openZoomForCut(zoomLightbox.cutsList, zoomLightbox.activeCutIndex + 1);
        } else if (e.key === '+' || e.key === '=') {
          setZoomScale((prev) => Math.min(3.5, prev + 0.25));
        } else if (e.key === '-') {
          setZoomScale((prev) => Math.max(0.75, prev - 0.25));
        } else if (e.key === '0') {
          setZoomScale(1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomLightbox]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const handleConfirmDelete = () => {
    if (!factToDelete) return;
    const deletedTitle = factToDelete.title;
    onDeleteFact(factToDelete.id);
    if (selectedFactId === factToDelete.id) {
      setSelectedFactId(null);
    }
    setFactToDelete(null);
    showToast(`'${deletedTitle}' 포스터가 성공적으로 삭제되었습니다.`);
  };

  // Derive selected fact from current facts array
  const selectedFact = facts.find((f) => f.id === selectedFactId) || null;

  // New Fact Form State (Admin)
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState(subject === 'math' ? '자연과 수학' : '미시세계의 비밀');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [bgGradient, setBgGradient] = useState(
    subject === 'math'
      ? 'from-blue-900 via-indigo-900 to-cyan-950'
      : 'from-emerald-900 via-teal-900 to-slate-950'
  );

  // 4-cut comic state in admin form
  const [activeCutTab, setActiveCutTab] = useState<number>(0);
  const [comicCutsForm, setComicCutsForm] = useState<ComicCut[]>([
    { id: 'c1', cutNumber: 1, title: '1컷: 도입 및 문제 제기', caption: '', imageUrl: undefined },
    { id: 'c2', cutNumber: 2, title: '2컷: 핵심 원리의 발견', caption: '', imageUrl: undefined },
    { id: 'c3', cutNumber: 3, title: '3컷: 자연/일상 속 구체적 현상', caption: '', imageUrl: undefined },
    { id: 'c4', cutNumber: 4, title: '4컷: 놀라운 결론 및 적용', caption: '', imageUrl: undefined },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const cutFileInputRef = useRef<HTMLInputElement>(null);
  const cutCameraInputRef = useRef<HTMLInputElement>(null);

  const handleMainImageFileRead = async (file: File) => {
    const compressed = await compressImageFile(file);
    if (compressed) {
      setPosterImage(compressed);
    }
  };

  const handleCutImageFileRead = async (file: File, cutIndex: number) => {
    const compressed = await compressImageFile(file);
    if (compressed) {
      setComicCutsForm((prev) => {
        const next = [...prev];
        next[cutIndex] = { ...next[cutIndex], imageUrl: compressed };
        return next;
      });
    }
  };

  const handleAddCut = () => {
    if (comicCutsForm.length >= 8) {
      showToast('컷은 최대 8개까지 추가할 수 있습니다.');
      return;
    }
    const newCutNum = comicCutsForm.length + 1;
    setComicCutsForm((prev) => [
      ...prev,
      {
        id: `cut-temp-${Date.now()}-${newCutNum}`,
        cutNumber: newCutNum,
        title: `${newCutNum}컷: 추가 이야기`,
        caption: '',
        imageUrl: undefined,
      },
    ]);
    setActiveCutTab(comicCutsForm.length);
  };

  const handleRemoveCut = (indexToRemove: number) => {
    if (comicCutsForm.length <= 1) {
      showToast('최소 1개의 컷은 유지되어야 합니다.');
      return;
    }
    setComicCutsForm((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove).map((cut, idx) => ({
        ...cut,
        cutNumber: idx + 1,
      }));
      return next;
    });
    setActiveCutTab((prev) => Math.max(0, prev >= indexToRemove ? prev - 1 : prev));
  };

  const subjectFacts = facts.filter((f) => f.subject === subject);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(/[\s,]+/)
      .map((t) => (t.startsWith('#') ? t : `#${t}`))
      .filter((t) => t.length > 1);

    const validCuts: ComicCut[] = comicCutsForm.map((c, idx) => ({
      id: `cut-${Date.now()}-${idx + 1}`,
      cutNumber: idx + 1,
      title: c.title?.trim() || `${idx + 1}컷 이야기`,
      caption: c.caption?.trim() || (idx === 0 ? content.trim() : ''),
      imageUrl: c.imageUrl,
    }));

    const finalContent =
      content.trim() ||
      validCuts
        .map((c) => c.caption)
        .filter(Boolean)
        .join('\n\n') ||
      title.trim();

    const newFact: InterestingFactItem = {
      id: `fact-${Date.now()}`,
      subject,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      category: category.trim() || (subject === 'math' ? '수학 이야기' : '과학 이야기'),
      content: finalContent,
      posterImage: posterImage || undefined,
      comicCuts: validCuts.length > 0 ? validCuts : undefined,
      authorName: '선생님 공식 포스터',
      createdAt: new Date().toISOString().split('T')[0],
      tags: tags.length > 0 ? tags : [subject === 'math' ? '#수학상식' : '#과학상식', '#4컷만화'],
      likes: 0,
      bgGradient,
    };

    onAddNewFact(newFact);
    setShowAddModal(false);
    showToast('새 4컷 만화 포스터가 성공적으로 등록되었습니다! 🎬');

    setTitle('');
    setSubtitle('');
    setContent('');
    setTagsInput('');
    setPosterImage(null);
    setComicCutsForm([
      { id: 'c1', cutNumber: 1, title: '1컷: 도입 및 문제 제기', caption: '', imageUrl: undefined },
      { id: 'c2', cutNumber: 2, title: '2컷: 핵심 원리의 발견', caption: '', imageUrl: undefined },
      { id: 'c3', cutNumber: 3, title: '3컷: 자연/일상 속 구체적 현상', caption: '', imageUrl: undefined },
      { id: 'c4', cutNumber: 4, title: '4컷: 놀라운 결론 및 적용', caption: '', imageUrl: undefined },
    ]);
  };

  return (
    <div id="interesting-facts-gallery-section" className="space-y-4">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 rounded-3xl text-white shadow-md flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-0.5 bg-white/20 text-[10px] font-black rounded-full uppercase tracking-wider backdrop-blur-xs flex items-center gap-1">
              <Film className="w-3 h-3" />
              {subject === 'math' ? 'MATH 4-CUT COMIC' : 'SCIENCE 4-CUT COMIC'}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black tracking-tight">
            {subject === 'math'
              ? '4컷 만화로 만나는 수학 이야기'
              : '4컷 만화로 만나는 과학 이야기'}
          </h3>
          <p className="text-xs text-rose-100 font-medium">
            4컷 만화 뷰어와 그림 확대경으로 생생하게 볼 수 있습니다.
          </p>
        </div>

        {userRole === 'admin' ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2.5 bg-white text-rose-900 font-black text-xs rounded-2xl shadow-lg hover:bg-rose-50 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 ml-2"
          >
            <PlusCircle className="w-4 h-4 text-rose-600" />
            <span>4컷 포스터 등록</span>
          </button>
        ) : (
          <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center text-2xl shadow-inner shrink-0 ml-2">
            🎬
          </div>
        )}
      </div>

      {/* YouTube-Thumbnail-Style Poster Grid */}
      {subjectFacts.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-3xl border-2 border-dashed border-rose-200 space-y-3">
          <span className="text-3xl block">🎬</span>
          <p className="text-sm font-bold text-slate-800">
            등록된 4컷 만화 포스터가 없습니다.
          </p>
          {userRole === 'admin' ? (
            <div className="space-y-2 max-w-sm mx-auto">
              <p className="text-xs text-slate-500">
                선생님 권한으로 새로운 4컷 만화 포스터를 등록해보세요.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95"
              >
                포스터 등록하기
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              새로운 4컷 만화 포스터가 곧 업데이트될 예정입니다.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {subjectFacts.map((fact) => {
            const isLikedByMe = !!(currentUserId && fact.likedUserIds?.includes(currentUserId));
            const cutCount = fact.comicCuts?.length || 4;

            return (
              <motion.div
                key={fact.id}
                whileHover={{ y: -4 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between cursor-pointer group select-none"
                onClick={() => {
                  setSelectedFactId(fact.id);
                  setCurrentCutIndex(0);
                }}
              >
                {/* 1. TOP YOUTUBE-STYLE THUMBNAIL (16:9 RATIO) - IMAGE FIRST */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-950 group/thumb">
                  {fact.posterImage ? (
                    <img
                      src={fact.posterImage}
                      alt={fact.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${
                        fact.bgGradient || 'from-slate-900 via-indigo-900 to-slate-950'
                      } flex flex-col justify-between p-4 relative overflow-hidden`}
                    >
                      <div className="flex items-center justify-between z-10">
                        <span className="px-2.5 py-1 rounded-lg bg-black/40 text-amber-300 text-[10px] font-black tracking-wider uppercase backdrop-blur-xs">
                          {fact.category}
                        </span>
                        <span className="text-2xl opacity-80">
                          {subject === 'math' ? '📐' : '🔬'}
                        </span>
                      </div>
                      <div className="z-10">
                        <h4 className="text-base sm:text-lg font-black text-white line-clamp-2 leading-tight drop-shadow-md">
                          {fact.title}
                        </h4>
                      </div>
                    </div>
                  )}

                  {/* Dark subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

                  {/* Category Pill */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-black text-white border border-white/20 shadow-xs">
                      {fact.category}
                    </span>
                  </div>

                  {/* Admin Delete Button */}
                  {userRole === 'admin' && (
                    <div className="absolute top-3 right-3 z-20">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFactToDelete(fact);
                        }}
                        className="px-2 py-1 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white font-black text-[10px] shadow-md transition-all flex items-center gap-1 active:scale-95 backdrop-blur-xs"
                        title="관리자 권한으로 포스터 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>삭제</span>
                      </button>
                    </div>
                  )}

                  {/* Center Play Button Overlay on Hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/30 backdrop-blur-2xs pointer-events-none">
                    <div className="w-13 h-13 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Bottom Badges */}
                  <div className="absolute bottom-2.5 left-3 right-3 z-10 flex items-center justify-between">
                    <span className="text-[11px] font-black text-white/90 drop-shadow-md flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-amber-300" />
                      클릭하여 4컷 만화 열기
                    </span>

                    <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-black text-[10px] tracking-wide flex items-center gap-1 shadow-md">
                      <span>🎬 {cutCount}컷 만화</span>
                    </span>
                  </div>
                </div>

                {/* 2. BOTTOM INFO SECTION */}
                <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-3 bg-white">
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0 mt-0.5">
                        {subject === 'math' ? '∑' : '⚛'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-black text-slate-900 leading-snug group-hover:text-rose-600 transition-colors line-clamp-2 break-keep">
                          {fact.title}
                        </h4>

                        {fact.subtitle && (
                          <p className="text-xs font-semibold text-slate-500 line-clamp-1 break-keep mt-0.5">
                            {fact.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium pt-1 pl-11">
                      <span className="font-bold text-slate-600">{fact.authorName}</span>
                      <span>•</span>
                      <span>{fact.createdAt}</span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1 flex-wrap">
                      {fact.tags?.slice(0, 3).map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLikeFact(fact.id);
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-95 ${
                        isLikedByMe
                          ? 'bg-rose-500 text-white shadow-xs font-black'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                      title={isLikedByMe ? '좋아요 취소' : '1계정당 1회 좋아요'}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isLikedByMe ? 'text-white fill-white' : 'text-rose-400'
                        }`}
                      />
                      <span>{fact.likes}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* FACT & 4-CUT COMIC FULLSCREEN EXHIBITION VIEW (YOUTUBE & 4-PANEL STORYBOARD) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedFact && (
          <motion.div
            id="facts-poster-fullscreen-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col w-full h-full overflow-hidden"
          >
            {/* Top Navigation Header Bar */}
            <div className="px-4 sm:px-8 py-3.5 border-b border-white/15 flex items-center justify-between bg-black/60 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFactId(null)}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs"
                  title="갤러리로 돌아가기"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  <span className="hidden sm:inline">갤러리로 돌아가기</span>
                </button>

                <div className="h-6 w-[1px] bg-white/20 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-black flex items-center gap-1 shadow-xs">
                    <Film className="w-3.5 h-3.5" /> 4컷 만화 포스터
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-amber-300 text-xs font-bold hidden sm:inline">
                    {selectedFact.category}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {userRole === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setFactToDelete(selectedFact)}
                    className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-black border border-rose-400/40 text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                    title="포스터 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden md:inline">포스터 삭제</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedFactId(null)}
                  className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors active:scale-95"
                  title="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* View Body */}
            <div className="flex-1 overflow-y-auto w-full p-4 sm:p-6 sm:px-8">
              <div className="max-w-5xl mx-auto space-y-6 pb-16">
                {/* 1. Main Title & Subtitle */}
                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-black leading-snug tracking-tight text-white break-keep">
                    {selectedFact.title}
                  </h3>
                  {selectedFact.subtitle && (
                    <p className="text-sm sm:text-base font-bold text-amber-300 break-keep">
                      {selectedFact.subtitle}
                    </p>
                  )}
                  <div className="text-xs text-slate-400 font-medium flex items-center gap-2 pt-1">
                    <span>{selectedFact.authorName}</span>
                    <span>•</span>
                    <span>{selectedFact.createdAt}</span>
                  </div>
                </div>

                {/* 2. Top YouTube Thumbnail Header Image */}
                {selectedFact.posterImage && (
                  <div
                    onClick={(e) =>
                      openZoomForSingleImage(
                        selectedFact.posterImage || '',
                        selectedFact.title,
                        selectedFact.subtitle || selectedFact.content,
                        e
                      )
                    }
                    className="relative rounded-2xl overflow-hidden border-2 border-white/20 bg-black cursor-pointer group shadow-lg"
                  >
                    <img
                      src={selectedFact.posterImage}
                      alt={selectedFact.title}
                      className="w-full aspect-video object-cover mx-auto group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/75 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs border border-white/20 group-hover:bg-red-600 transition-colors">
                      <ZoomIn className="w-4 h-4" /> 썸네일 전체화면 확대 🔍
                    </div>
                  </div>
                )}

                {/* 3. 4-CUT COMIC STORYBOARD SECTION */}
                <div className="space-y-4 bg-slate-950/80 p-4 sm:p-6 rounded-3xl border border-white/15">
                  {/* Mode Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🎞️</span>
                      <div>
                        <h4 className="text-base font-black text-amber-300">
                          네컷 만화 스토리보드
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium">
                          그림을 클릭하면 고화질 대형 돋보기 뷰어로 시원하게 확대됩니다!
                        </p>
                      </div>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setComicViewMode('single')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                          comicViewMode === 'single'
                            ? 'bg-amber-400 text-slate-950 shadow-md'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>한 컷씩 크게 보기</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setComicViewMode('grid')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                          comicViewMode === 'grid'
                            ? 'bg-amber-400 text-slate-950 shadow-md'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        <Grid2X2 className="w-3.5 h-3.5" />
                        <span>2x2 격자</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setComicViewMode('scroll')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                          comicViewMode === 'scroll'
                            ? 'bg-amber-400 text-slate-950 shadow-md'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                        <span>세로 스크롤</span>
                      </button>
                    </div>
                  </div>

                  {/* MODE 1: SINGLE CUT LARGE SLIDE VIEWER (한 컷씩 시원하게 크게 보기) */}
                  {comicViewMode === 'single' && selectedFact.comicCuts && selectedFact.comicCuts.length > 0 && (
                    <div className="space-y-4">
                      {/* Step Indicator Tabs */}
                      <div className="flex items-center justify-between gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/10 overflow-x-auto">
                        {selectedFact.comicCuts.map((cut, idx) => (
                          <button
                            key={cut.id || idx}
                            type="button"
                            onClick={() => setCurrentCutIndex(idx)}
                            className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                              currentCutIndex === idx
                                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-lg scale-102'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span>{cut.cutNumber || idx + 1}컷</span>
                          </button>
                        ))}
                      </div>

                      {/* Active Large Cut Panel */}
                      {(() => {
                        const activeCut = selectedFact.comicCuts[currentCutIndex] || selectedFact.comicCuts[0];
                        return (
                          <div className="bg-white rounded-3xl overflow-hidden border-4 border-amber-400 shadow-2xl flex flex-col">
                            {/* Cut Header */}
                            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 bg-white text-orange-600 rounded-lg font-black text-xs shadow-xs">
                                  {activeCut.cutNumber || currentCutIndex + 1} / {selectedFact.comicCuts.length}컷
                                </span>
                                <span className="font-black text-sm sm:text-base tracking-tight">
                                  {activeCut.title || `${currentCutIndex + 1}컷 이야기`}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) =>
                                  openZoomForCut(selectedFact.comicCuts || [], currentCutIndex, e)
                                }
                                className="px-3 py-1.5 bg-black/40 hover:bg-black/70 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span>화면 가득 확대 🔍</span>
                              </button>
                            </div>

                            {/* Large Image Frame with Interactive Cursor */}
                            <div
                              onClick={(e) =>
                                openZoomForCut(selectedFact.comicCuts || [], currentCutIndex, e)
                              }
                              className="relative min-h-[260px] sm:min-h-[380px] max-h-[460px] w-full bg-slate-950 flex items-center justify-center cursor-zoom-in group overflow-hidden"
                            >
                              {activeCut.imageUrl ? (
                                <>
                                  <img
                                    src={activeCut.imageUrl}
                                    alt={activeCut.title || `컷 ${currentCutIndex + 1}`}
                                    className="w-full h-full object-contain p-2 sm:p-4 transition-transform duration-300 group-hover:scale-102"
                                  />
                                  <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/80 text-white text-xs font-bold backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-lg group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                                    <ZoomIn className="w-4 h-4" />
                                    <span>클릭하여 초고화질 확대경 열기</span>
                                  </div>
                                </>
                              ) : (
                                <div className="p-8 text-center space-y-2">
                                  <span className="text-4xl block">🎨</span>
                                  <p className="text-sm text-slate-400 font-bold">
                                    {activeCut.title || `${currentCutIndex + 1}컷 이미지`}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Caption Underneath */}
                            <div className="p-4 sm:p-6 bg-gradient-to-b from-amber-50 to-orange-50 border-t-2 border-amber-200 text-slate-900 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
                                  <MessageSquareQuote className="w-4 h-4 text-orange-600" />
                                  <span>{activeCut.cutNumber || currentCutIndex + 1}컷 핵심 설명</span>
                                </span>

                                <span className="text-[11px] text-slate-500 font-bold">
                                  {currentCutIndex + 1} / {selectedFact.comicCuts.length} 단계
                                </span>
                              </div>

                              <p className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed whitespace-pre-wrap break-keep">
                                {activeCut.caption || '설명이 등록되어 있습니다.'}
                              </p>

                              {/* Prev / Next Cut Navigation Buttons */}
                              <div className="pt-3 border-t border-amber-200/80 flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  disabled={currentCutIndex <= 0}
                                  onClick={() => setCurrentCutIndex((prev) => Math.max(0, prev - 1))}
                                  className="px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-950 font-black text-xs disabled:opacity-30 disabled:pointer-events-none hover:bg-amber-100 transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                  <span>이전 컷</span>
                                </button>

                                <span className="text-xs font-black text-amber-800">
                                  {currentCutIndex + 1} / {selectedFact.comicCuts.length}
                                </span>

                                <button
                                  type="button"
                                  disabled={currentCutIndex >= selectedFact.comicCuts.length - 1}
                                  onClick={() =>
                                    setCurrentCutIndex((prev) =>
                                      Math.min(selectedFact.comicCuts!.length - 1, prev + 1)
                                    )
                                  }
                                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs disabled:opacity-30 disabled:pointer-events-none hover:from-orange-600 hover:to-amber-600 transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                                >
                                  <span>다음 컷</span>
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* MODE 2 & 3: GRID 2x2 OR VERTICAL SCROLL */}
                  {comicViewMode !== 'single' && selectedFact.comicCuts && selectedFact.comicCuts.length > 0 && (
                    <div
                      className={
                        comicViewMode === 'grid'
                          ? 'grid grid-cols-1 sm:grid-cols-2 gap-4'
                          : 'space-y-6'
                      }
                    >
                      {selectedFact.comicCuts.map((cut, idx) => (
                        <div
                          key={cut.id || idx}
                          className="bg-white rounded-2xl overflow-hidden border-2 border-amber-300/80 shadow-lg flex flex-col justify-between"
                        >
                          {/* Cut Header */}
                          <div className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
                            <span className="font-black text-xs sm:text-sm tracking-tight flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-white text-orange-600 rounded-md font-black text-[11px]">
                                {cut.cutNumber || idx + 1}컷
                              </span>
                              <span>{cut.title || `${idx + 1}컷 이야기`}</span>
                            </span>
                            {cut.imageUrl && (
                              <button
                                type="button"
                                onClick={(e) =>
                                  openZoomForCut(selectedFact.comicCuts || [], idx, e)
                                }
                                className="px-2 py-1 bg-black/30 hover:bg-black/60 rounded-lg text-[11px] font-black text-white flex items-center gap-1 transition-all"
                              >
                                <Maximize2 className="w-3 h-3" /> 크게 보기
                              </button>
                            )}
                          </div>

                          {/* Cut Image Frame */}
                          <div
                            onClick={(e) =>
                              openZoomForCut(selectedFact.comicCuts || [], idx, e)
                            }
                            className={`relative ${
                              comicViewMode === 'scroll'
                                ? 'min-h-[260px] sm:min-h-[340px]'
                                : 'aspect-[4/3] min-h-[200px]'
                            } w-full bg-slate-950 flex items-center justify-center overflow-hidden cursor-zoom-in group`}
                          >
                            {cut.imageUrl ? (
                              <>
                                <img
                                  src={cut.imageUrl}
                                  alt={cut.title || `컷 ${idx + 1}`}
                                  className="w-full h-full object-contain p-2 group-hover:scale-104 transition-transform duration-300"
                                />
                                <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 text-white text-[11px] font-bold border border-white/20 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors flex items-center gap-1">
                                  <ZoomIn className="w-3.5 h-3.5" /> 클릭 시 확대
                                </div>
                              </>
                            ) : (
                              <div className="p-6 text-center space-y-2">
                                <span className="text-3xl block">🎨</span>
                                <p className="text-xs text-slate-400 font-bold">
                                  {cut.title || `${idx + 1}컷 만화 이미지`}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Cut Description (그 밑에 설명) */}
                          <div className="p-3.5 sm:p-4 bg-gradient-to-b from-amber-50 to-orange-50/70 border-t-2 border-amber-200 text-slate-900 flex-1 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1 text-[11px] font-black text-amber-800">
                                <MessageSquareQuote className="w-3.5 h-3.5 text-orange-600" />
                                <span>{cut.cutNumber || idx + 1}컷 핵심 설명</span>
                              </div>
                              <p className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap break-keep">
                                {cut.caption || '설명이 등록되어 있습니다.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fallback if no cuts */}
                  {(!selectedFact.comicCuts || selectedFact.comicCuts.length === 0) && (
                    <div className="p-4 rounded-2xl bg-white/10 text-slate-100 text-sm leading-relaxed font-medium whitespace-pre-wrap break-keep">
                      {selectedFact.content}
                    </div>
                  )}
                </div>

                {/* 4. Overall Deep Dive & Notes */}
                {selectedFact.content && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-slate-100 space-y-2">
                    <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      선생님의 추가 심화 탐구 해설
                    </h4>
                    <p className="text-xs sm:text-sm leading-relaxed font-medium whitespace-pre-wrap break-keep">
                      {selectedFact.content}
                    </p>
                  </div>
                )}

                {/* Tags */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedFact.tags?.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-xl bg-white/15 text-white text-xs font-bold"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/15 bg-black/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {(() => {
                    const isSelectedFactLiked = !!(
                      currentUserId && selectedFact.likedUserIds?.includes(currentUserId)
                    );
                    return (
                      <button
                        type="button"
                        onClick={() => onToggleLikeFact(selectedFact.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all ${
                          isSelectedFactLiked
                            ? 'bg-rose-500 hover:bg-rose-600 text-white ring-2 ring-rose-300 font-black'
                            : 'bg-white/20 hover:bg-white/30 text-white'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isSelectedFactLiked
                              ? 'fill-white text-white'
                              : 'text-rose-300 fill-rose-300/40'
                          }`}
                        />
                        <span>
                          {isSelectedFactLiked ? '좋아요 취소' : '좋아요'} ({selectedFact.likes})
                        </span>
                      </button>
                    );
                  })()}
                  <span className="text-[10px] text-white/60 font-semibold hidden sm:inline">
                    1계정당 1회
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {userRole === 'admin' && (
                    <button
                      type="button"
                      onClick={() => setFactToDelete(selectedFact)}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black border border-rose-400/40 text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>포스터 삭제</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedFactId(null)}
                    className="px-5 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-95 text-white font-black text-xs sm:text-sm transition-all"
                  >
                    갤러리로 돌아가기
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* FULLSCREEN INTERACTIVE IMAGE ZOOM LIGHTBOX (초고화질 돋보기 & 컷 넘김) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {zoomLightbox && (
          <div
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col justify-between p-3 sm:p-6 select-none animate-fadeIn"
            onClick={() => setZoomLightbox(null)}
          >
            {/* Top Toolbar */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between gap-3 bg-slate-900/90 border border-white/20 p-3 sm:px-5 rounded-2xl backdrop-blur-md shadow-2xl z-10"
            >
              <div className="flex items-center gap-2 min-w-0">
                {zoomLightbox.cutNumber && (
                  <span className="px-2.5 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-lg shrink-0 shadow-sm">
                    {zoomLightbox.cutNumber} / {zoomLightbox.totalCuts}컷
                  </span>
                )}
                <h4 className="text-sm sm:text-base font-black text-white truncate max-w-xs sm:max-w-md">
                  {zoomLightbox.title}
                </h4>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.max(0.75, prev - 0.25))}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-colors"
                  title="축소 (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <span className="px-2 py-1 text-xs font-black text-amber-300 min-w-[50px] text-center bg-black/50 rounded-lg">
                  {Math.round(zoomScale * 100)}%
                </span>

                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.min(3.5, prev + 0.25))}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-colors"
                  title="확대 (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-colors"
                  title="원래 크기 (100%)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {zoomLightbox.caption && (
                  <button
                    type="button"
                    onClick={() => setShowCaptionInZoom((prev) => !prev)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors hidden sm:flex items-center gap-1 ${
                      showCaptionInZoom ? 'bg-amber-400 text-slate-950' : 'bg-white/10 text-white'
                    }`}
                  >
                    <MessageSquareQuote className="w-3.5 h-3.5" />
                    <span>설명 {showCaptionInZoom ? '숨기기' : '보기'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setZoomLightbox(null)}
                  className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white ml-2 shadow-md transition-colors"
                  title="닫기 (ESC)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Middle Main Canvas Area */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative flex-1 flex items-center justify-center my-2 sm:my-4 overflow-hidden"
            >
              {/* Previous Cut Button on Image */}
              {zoomLightbox.cutsList &&
                zoomLightbox.activeCutIndex !== undefined &&
                zoomLightbox.activeCutIndex > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      openZoomForCut(
                        zoomLightbox.cutsList!,
                        zoomLightbox.activeCutIndex! - 1
                      )
                    }
                    className="absolute left-2 sm:left-6 z-20 w-12 h-12 rounded-full bg-black/70 hover:bg-amber-500 hover:text-slate-950 text-white border border-white/20 flex items-center justify-center shadow-2xl transition-all"
                    title="이전 컷 보기 (←)"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}

              {/* Next Cut Button on Image */}
              {zoomLightbox.cutsList &&
                zoomLightbox.activeCutIndex !== undefined &&
                zoomLightbox.activeCutIndex < zoomLightbox.cutsList.length - 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      openZoomForCut(
                        zoomLightbox.cutsList!,
                        zoomLightbox.activeCutIndex! + 1
                      )
                    }
                    className="absolute right-2 sm:right-6 z-20 w-12 h-12 rounded-full bg-black/70 hover:bg-amber-500 hover:text-slate-950 text-white border border-white/20 flex items-center justify-center shadow-2xl transition-all"
                    title="다음 컷 보기 (→)"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}

              {/* Scalable High-Res Image Container */}
              <div
                className="w-full h-full flex items-center justify-center overflow-auto p-2"
                onDoubleClick={() => setZoomScale((prev) => (prev > 1.2 ? 1 : 2))}
              >
                <img
                  src={zoomLightbox.imageUrl}
                  alt={zoomLightbox.title}
                  style={{
                    transform: `scale(${zoomScale})`,
                    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  className="max-w-[95vw] max-h-[75vh] w-auto h-auto object-contain rounded-xl shadow-2xl select-none"
                />
              </div>
            </div>

            {/* Bottom Caption & Navigation Bar */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900/95 border border-white/20 p-3 sm:p-4 rounded-2xl backdrop-blur-md shadow-2xl z-10 space-y-2 max-w-3xl mx-auto w-full"
            >
              {showCaptionInZoom && zoomLightbox.caption && (
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-1 text-[11px] font-black text-amber-400">
                    <MessageSquareQuote className="w-3.5 h-3.5" />
                    <span>{zoomLightbox.cutNumber ? `${zoomLightbox.cutNumber}컷 핵심 설명` : '상세 설명'}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white leading-relaxed whitespace-pre-wrap break-keep">
                    {zoomLightbox.caption}
                  </p>
                </div>
              )}

              {/* Step Navigation Dots for 4 cuts */}
              {zoomLightbox.cutsList && (
                <div className="flex items-center justify-center gap-2 pt-1 border-t border-white/10">
                  {zoomLightbox.cutsList.map((cut, idx) => (
                    <button
                      key={cut.id || idx}
                      type="button"
                      onClick={() => openZoomForCut(zoomLightbox.cutsList!, idx)}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                        zoomLightbox.activeCutIndex === idx
                          ? 'bg-amber-400 text-slate-950 scale-105 shadow-md'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {cut.cutNumber || idx + 1}컷
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ADMIN 4-CUT POSTER REGISTRATION MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAddModal && userRole === 'admin' && (
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#FFFDF9] rounded-3xl shadow-2xl border-4 border-amber-300 overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 p-4 text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎬</span>
                  <div>
                    <h3 className="text-base font-black">
                      4컷 만화 &amp; 썸네일 포스터 제작 (선생님 전용)
                    </h3>
                    <p className="text-[11px] text-rose-100 font-medium">
                      유튜브 썸네일 대표 이미지와 4컷 만화(컷별 이미지 + 설명)를 등록합니다.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4">
                {/* 1. YouTube Cover Thumbnail */}
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-rose-600" />
                      <span>유튜브 스타일 대표 썸네일 (16:9 커버 이미지)</span>
                    </label>
                    <span className="text-[10px] text-amber-700 font-bold">권장 비율 16:9</span>
                  </div>

                  {posterImage ? (
                    <div className="relative aspect-video rounded-xl border-2 border-rose-300 bg-slate-950 overflow-hidden flex items-center justify-center">
                      <img
                        src={posterImage}
                        alt="대표 썸네일 미리보기"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPosterImage(null)}
                        className="absolute top-2 right-2 px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> 삭제
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex-1 py-2.5 px-3 bg-white hover:bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-900 flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                      >
                        <Camera className="w-4 h-4 text-rose-600" />
                        <span>카메라로 촬영</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                      >
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span>썸네일 파일 선택</span>
                      </button>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleMainImageFileRead(file);
                    }}
                    className="hidden"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleMainImageFileRead(file);
                    }}
                    className="hidden"
                  />
                </div>

                {/* 2. Basic Info */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      포스터 제목 *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={
                        subject === 'math'
                          ? '예: 피보나치 수열과 해바라기 씨앗의 황금비'
                          : '예: 원자 속 99.99%가 빈 공간이라면?'
                      }
                      className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        부제목 (선택)
                      </label>
                      <input
                        type="text"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder="예: 자연 속에 숨겨진 마법의 비율"
                        className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        카테고리 *
                      </label>
                      <input
                        type="text"
                        required
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="예: 일상 속 과학, 자연과 수학"
                        className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. 4-CUT COMIC PANELS EDITOR */}
                <div className="p-3.5 sm:p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border-2 border-orange-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Film className="w-4 h-4 text-orange-600" />
                      <h4 className="text-xs font-black text-orange-950">
                        네컷 만화 컷별 이미지 및 설명 입력
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleAddCut}
                        className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white font-black text-[10px] rounded-lg shadow-2xs transition-all"
                      >
                        + 컷 추가
                      </button>
                    </div>
                  </div>

                  {/* Cut Tab Selector */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {comicCutsForm.map((cut, idx) => (
                      <button
                        key={cut.id}
                        type="button"
                        onClick={() => setActiveCutTab(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1 ${
                          activeCutTab === idx
                            ? 'bg-orange-600 text-white shadow-xs scale-102'
                            : 'bg-white text-orange-900 border border-orange-200 hover:bg-orange-100/60'
                        }`}
                      >
                        <span>{idx + 1}컷</span>
                        {cut.imageUrl && <CheckCircle2 className="w-3 h-3 text-emerald-300" />}
                      </button>
                    ))}
                  </div>

                  {/* Active Cut Form */}
                  {comicCutsForm[activeCutTab] && (
                    <div className="bg-white p-3.5 rounded-2xl border border-orange-200 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-orange-950">
                          {activeCutTab + 1}컷 설정
                        </span>
                        {comicCutsForm.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCut(activeCutTab)}
                            className="text-[10px] text-rose-600 hover:underline font-bold flex items-center gap-0.5"
                          >
                            <Trash2 className="w-3 h-3" /> 이 컷 삭제
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          {activeCutTab + 1}컷 소제목
                        </label>
                        <input
                          type="text"
                          value={comicCutsForm[activeCutTab].title || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setComicCutsForm((prev) => {
                              const next = [...prev];
                              next[activeCutTab] = { ...next[activeCutTab], title: val };
                              return next;
                            });
                          }}
                          placeholder={`예: ${activeCutTab + 1}컷 이야기 제목`}
                          className="w-full px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                      </div>

                      {/* Cut Image */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          {activeCutTab + 1}컷 이미지 첨부
                        </label>
                        {comicCutsForm[activeCutTab].imageUrl ? (
                          <div className="relative aspect-[4/3] max-h-44 rounded-xl border-2 border-orange-300 bg-slate-900 overflow-hidden flex items-center justify-center">
                            <img
                              src={comicCutsForm[activeCutTab].imageUrl}
                              alt={`${activeCutTab + 1}컷 이미지`}
                              className="w-full h-full object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setComicCutsForm((prev) => {
                                  const next = [...prev];
                                  next[activeCutTab] = { ...next[activeCutTab], imageUrl: undefined };
                                  return next;
                                });
                              }}
                              className="absolute top-2 right-2 px-2 py-0.5 bg-rose-600 text-white rounded-md text-[10px] font-bold shadow-md"
                            >
                              삭제
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => cutCameraInputRef.current?.click()}
                              className="flex-1 py-2 px-3 bg-orange-50 hover:bg-orange-100 border border-orange-300 rounded-xl text-[11px] font-bold text-orange-900 flex items-center justify-center gap-1.5 transition-all"
                            >
                              <Camera className="w-3.5 h-3.5 text-orange-600" />
                              <span>카메라 촬영</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => cutFileInputRef.current?.click()}
                              className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-all"
                            >
                              <Upload className="w-3.5 h-3.5 text-slate-500" />
                              <span>그림 파일 선택</span>
                            </button>
                          </div>
                        )}

                        <input
                          ref={cutFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleCutImageFileRead(file, activeCutTab);
                          }}
                          className="hidden"
                        />
                        <input
                          ref={cutCameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleCutImageFileRead(file, activeCutTab);
                          }}
                          className="hidden"
                        />
                      </div>

                      {/* Cut Caption */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          {activeCutTab + 1}컷 하단 설명 *
                        </label>
                        <textarea
                          rows={3}
                          value={comicCutsForm[activeCutTab].caption || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setComicCutsForm((prev) => {
                              const next = [...prev];
                              next[activeCutTab] = { ...next[activeCutTab], caption: val };
                              return next;
                            });
                          }}
                          placeholder={`그림 아래에 들어갈 ${activeCutTab + 1}컷 설명을 자세히 입력해주세요.`}
                          className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Overall Deep Dive Explanation */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    종합 심화 해설 및 마무리 노트 (선택)
                  </label>
                  <textarea
                    rows={3}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="4컷 만화 전체를 아우르는 추가 심화 공식, 역사적 배경 등을 입력하세요."
                    className="w-full p-2.5 bg-white rounded-xl border border-amber-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    태그 (띄어쓰기 또는 쉼표 구분)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="#피보나치 #황금비 #자연의규칙"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                {/* Theme Gradient */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    포스터 카드 배경 테마 선택
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {GRADIENT_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setBgGradient(p.value)}
                        className={`p-2 rounded-xl text-[11px] font-bold text-white text-center bg-gradient-to-r ${p.value} border-2 transition-all ${
                          bgGradient === p.value
                            ? 'border-amber-400 ring-2 ring-amber-300 shadow-md scale-102'
                            : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-700 hover:to-amber-600 text-white font-black text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>4컷 만화 포스터 등록 완료</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ADMIN DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {factToDelete && (
          <div className="fixed inset-0 z-[90] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border-4 border-rose-200 text-slate-800 space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    포스터를 삭제하시겠습니까?
                  </h3>
                  <span className="text-xs text-rose-600 font-bold">
                    선생님(관리자) 전용 삭제 기능
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                  삭제 대상 포스터
                </span>
                <p className="text-sm font-black text-slate-800 leading-snug break-keep">
                  {factToDelete.title}
                </p>
                {factToDelete.subtitle && (
                  <p className="text-xs font-semibold text-slate-500 break-keep">
                    {factToDelete.subtitle}
                  </p>
                )}
              </div>

              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                삭제된 포스터는 갤러리 목록에서 즉시 제거되며, 복구할 수 없습니다. 계속 진행하시겠습니까?
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFactToDelete(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  취소하기
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>네, 삭제합니다</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-[110] px-4 py-3 bg-slate-900/95 text-white rounded-2xl shadow-xl border border-white/20 text-xs font-bold flex items-center gap-2 backdrop-blur-md"
          >
            <span className="text-emerald-400 text-base">✓</span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default InterestingFactsGallery;