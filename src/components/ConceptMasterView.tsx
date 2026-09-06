import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Sparkles,
  Lightbulb,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Trash2,
  Heart,
  HelpCircle,
  FlaskConical,
  Atom,
  Flame,
  Globe,
  Layers,
  Award,
  Zap,
  Tag,
  Share2,
  Check,
  Eye,
  X,
  Upload,
  Camera,
  Compass
} from 'lucide-react';
import { ConceptItem, ConceptKeyPoint, ConceptQuickCheck, SubjectType, UserRole } from '../types';
import { ChapterGroup, SubUnitItem, getCurriculumForSubject } from '../data/curriculumData';

interface ConceptMasterViewProps {
  subject: SubjectType;
  userRole: UserRole;
  currentUserId?: string;
  concepts: ConceptItem[];
  onAddNewConcept: (concept: ConceptItem) => void;
  onDeleteConcept: (conceptId: string) => void;
  onToggleLikeConcept: (conceptId: string) => void;
}

export const ConceptMasterView: React.FC<ConceptMasterViewProps> = ({
  subject,
  userRole,
  currentUserId = 'user_account_default',
  concepts,
  onAddNewConcept,
  onDeleteConcept,
  onToggleLikeConcept,
}) => {
  // Navigation & Filter states
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedSubUnitId, setSelectedSubUnitId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedConceptId, setExpandedConceptId] = useState<string | null>(null);
  
  // Interactive Flashcards revealed state (conceptId-qIndex -> boolean)
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});

  // Admin New Concept Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [conceptToDelete, setConceptToDelete] = useState<ConceptItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Admin Form State
  const [formChapterId, setFormChapterId] = useState('');
  const [formSubUnitId, setFormSubUnitId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formBadge, setFormBadge] = useState('내신 빈출 핵심 ★★★');
  const [formKeyPoints, setFormKeyPoints] = useState<ConceptKeyPoint[]>([
    { title: '1. 핵심 개념 정의', description: '', formulaOrReaction: '', importantNote: '' },
    { title: '2. 심화 원리 및 현상', description: '', formulaOrReaction: '', importantNote: '' },
  ]);
  const [formFormulasInput, setFormFormulasInput] = useState('');
  const [formTeacherTipsInput, setFormTeacherTipsInput] = useState('');
  const [formTagsInput, setFormTagsInput] = useState('');
  const [formQuickChecks, setFormQuickChecks] = useState<ConceptQuickCheck[]>([
    { question: '', answer: '', explanation: '' }
  ]);
  const [formDiagramImage, setFormDiagramImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const curriculum = useMemo(() => getCurriculumForSubject(subject), [subject]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // Toggle flashcard answer
  const toggleRevealAnswer = (key: string) => {
    setRevealedAnswers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter concepts
  const filteredConcepts = useMemo(() => {
    return concepts.filter((item) => {
      if (item.subject !== subject) return false;
      if (selectedChapterId && item.chapterId !== selectedChapterId) return false;
      if (selectedSubUnitId && item.subUnitId !== selectedSubUnitId) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const inTitle = item.title.toLowerCase().includes(query);
        const inSummary = item.summary.toLowerCase().includes(query);
        const inTags = item.tags.some((t) => t.toLowerCase().includes(query));
        const inKeyPoints = item.keyPoints.some(
          (kp) =>
            kp.title.toLowerCase().includes(query) ||
            kp.description.toLowerCase().includes(query) ||
            (kp.formulaOrReaction && kp.formulaOrReaction.toLowerCase().includes(query))
        );
        if (!inTitle && !inSummary && !inTags && !inKeyPoints) return false;
      }
      return true;
    });
  }, [concepts, subject, selectedChapterId, selectedSubUnitId, searchQuery]);

  // Set default chapter/subunit in form when curriculum changes
  useEffect(() => {
    if (curriculum.length > 0 && !formChapterId) {
      setFormChapterId(curriculum[0].id);
      if (curriculum[0].subUnits.length > 0) {
        setFormSubUnitId(curriculum[0].subUnits[0].id);
      }
    }
  }, [curriculum, formChapterId]);

  const handleAddKeyPointField = () => {
    if (formKeyPoints.length >= 6) {
      showToast('핵심 포인트는 최대 6개까지 작성할 수 있습니다.');
      return;
    }
    const nextNum = formKeyPoints.length + 1;
    setFormKeyPoints((prev) => [
      ...prev,
      { title: `${nextNum}. 추가 핵심 내용`, description: '', formulaOrReaction: '', importantNote: '' }
    ]);
  };

  const handleRemoveKeyPointField = (idx: number) => {
    if (formKeyPoints.length <= 1) {
      showToast('최소 1개 이상의 핵심 포인트가 필요합니다.');
      return;
    }
    setFormKeyPoints((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddQuickCheckField = () => {
    if (formQuickChecks.length >= 5) {
      showToast('확인 퀴즈는 최대 5개까지 등록할 수 있습니다.');
      return;
    }
    setFormQuickChecks((prev) => [...prev, { question: '', answer: '', explanation: '' }]);
  };

  const handleRemoveQuickCheckField = (idx: number) => {
    setFormQuickChecks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDiagramFileRead = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setFormDiagramImage(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitNewConcept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('개념 제목을 입력해주세요.');
      return;
    }

    const currentCh = curriculum.find((c) => c.id === formChapterId) || curriculum[0];
    const currentSub = currentCh?.subUnits.find((s) => s.id === formSubUnitId) || currentCh?.subUnits[0];

    const tags = formTagsInput
      .split(/[\s,]+/)
      .map((t) => (t.startsWith('#') ? t : `#${t}`))
      .filter((t) => t.length > 1);

    const validKeyPoints = formKeyPoints
      .filter((kp) => kp.title.trim() || kp.description.trim())
      .map((kp) => ({
        title: kp.title.trim() || '핵심 원리',
        description: kp.description.trim(),
        formulaOrReaction: kp.formulaOrReaction?.trim() || undefined,
        importantNote: kp.importantNote?.trim() || undefined,
      }));

    const formulas = formFormulasInput
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const tips = formTeacherTipsInput
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const validChecks = formQuickChecks
      .filter((qc) => qc.question.trim() && qc.answer.trim())
      .map((qc) => ({
        question: qc.question.trim(),
        answer: qc.answer.trim(),
        explanation: qc.explanation.trim() || qc.answer.trim(),
      }));

    const newConcept: ConceptItem = {
      id: `concept-${Date.now()}`,
      subject,
      chapterId: formChapterId || currentCh.id,
      chapterName: currentCh.fullName,
      subUnitId: formSubUnitId || (currentSub?.id || 'unit-default'),
      subUnitTitle: currentSub?.title || currentCh.chapterName,
      title: formTitle.trim(),
      summary: formSummary.trim() || formTitle.trim(),
      badge: formBadge.trim() || '내신 핵심',
      keyPoints: validKeyPoints.length > 0 ? validKeyPoints : [
        { title: '1. 핵심 개념', description: formSummary.trim() }
      ],
      formulasAndReactions: formulas.length > 0 ? formulas : undefined,
      teacherTips: tips.length > 0 ? tips : ['💡 교과서 필수 예제와 연결하여 기본 개념을 꼼꼼하게 다져보세요!'],
      quickChecks: validChecks.length > 0 ? validChecks : undefined,
      diagramImageUrl: formDiagramImage || undefined,
      tags: tags.length > 0 ? tags : [subject === 'science' ? '#통합과학' : '#공통수학', '#핵심개념'],
      authorName: userRole === 'admin' ? '선생님 공식 핵심노트' : '개념 정리',
      createdAt: new Date().toISOString().split('T')[0],
      likes: 0,
    };

    onAddNewConcept(newConcept);
    setShowAddModal(false);
    showToast('새 핵심 개념 노트가 성공적으로 등록되었습니다! 📚');

    // Reset Form
    setFormTitle('');
    setFormSummary('');
    setFormKeyPoints([
      { title: '1. 핵심 개념 정의', description: '', formulaOrReaction: '', importantNote: '' },
      { title: '2. 심화 원리 및 현상', description: '', formulaOrReaction: '', importantNote: '' },
    ]);
    setFormFormulasInput('');
    setFormTeacherTipsInput('');
    setFormTagsInput('');
    setFormDiagramImage(null);
    setFormQuickChecks([{ question: '', answer: '', explanation: '' }]);
  };

  const handleConfirmDelete = () => {
    if (!conceptToDelete) return;
    const deletedTitle = conceptToDelete.title;
    onDeleteConcept(conceptToDelete.id);
    if (expandedConceptId === conceptToDelete.id) {
      setExpandedConceptId(null);
    }
    setConceptToDelete(null);
    showToast(`'${deletedTitle}' 개념 노트가 삭제되었습니다.`);
  };

  return (
    <div id="concept-master-view-section" className="space-y-5">
      {/* 1. Header Banner */}
      <div className={`p-4 sm:p-5 rounded-3xl text-white shadow-md flex items-center justify-between ${
        subject === 'science'
          ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700'
          : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-700'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-white/20 text-[10px] font-black rounded-full uppercase tracking-wider backdrop-blur-xs flex items-center gap-1">
              <FlaskConical className="w-3 h-3" />
              {subject === 'science' ? 'SCIENCE CONCEPT MASTER' : 'MATH CONCEPT MASTER'}
            </span>
            <span className="text-[11px] font-black text-amber-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
              2022 개정 교과서 단원별 핵심 개념 총정리
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black tracking-tight">
            {subject === 'science'
              ? '비상교육 통합과학 2 핵심 개념 & 법칙·화학반응식 완벽 정리'
              : '미래엔 공통수학 2 핵심 개념 & 공식·정리 완벽 마스터'}
          </h3>
          <p className="text-xs text-white/90 font-medium">
            단원별 핵심 원리, 공식, 화학 반응식, 선생님 빈출 꿀팁, 그리고 인터랙티브 확인 퀴즈(💡)로 개념을 완벽 정복하세요!
          </p>
        </div>

        {userRole === 'admin' ? (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2.5 bg-white text-emerald-950 font-black text-xs rounded-2xl shadow-lg hover:bg-emerald-50 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 ml-2"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>개념 노트 등록</span>
          </button>
        ) : (
          <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center text-2xl shadow-inner shrink-0 ml-2">
            💡
          </div>
        )}
      </div>

      {/* Toast Notice */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white text-xs sm:text-sm font-black py-2.5 px-4 rounded-2xl text-center shadow-md animate-in fade-in flex items-center justify-center gap-2">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. Unit Filter Navigation & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        {/* Chapter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setSelectedChapterId(null);
              setSelectedSubUnitId(null);
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-black shrink-0 transition-all ${
              selectedChapterId === null
                ? 'bg-slate-900 text-white shadow-md scale-102'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            전체 단원 ({concepts.filter((c) => c.subject === subject).length})
          </button>

          {curriculum.map((chapter) => {
            const isSelected = selectedChapterId === chapter.id;
            const count = concepts.filter((c) => c.subject === subject && c.chapterId === chapter.id).length;
            return (
              <button
                key={chapter.id}
                type="button"
                onClick={() => {
                  setSelectedChapterId(chapter.id);
                  setSelectedSubUnitId(null);
                }}
                className={`px-4 py-2 rounded-2xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? subject === 'science'
                      ? 'bg-emerald-600 text-white shadow-md scale-102'
                      : 'bg-blue-600 text-white shadow-md scale-102'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{chapter.fullName}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub-Units Pills if a chapter is selected */}
        {selectedChapterId && (
          <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1 scrollbar-none border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSelectedSubUnitId(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedSubUnitId === null
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              대단원 전체
            </button>
            {curriculum
              .find((c) => c.id === selectedChapterId)
              ?.subUnits.map((subUnit) => {
                const isSubSelected = selectedSubUnitId === subUnit.id;
                return (
                  <button
                    key={subUnit.id}
                    type="button"
                    onClick={() => setSelectedSubUnitId(subUnit.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1 ${
                      isSubSelected
                        ? subject === 'science'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs'
                          : 'bg-blue-100 text-blue-900 border border-blue-300 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <span>{subUnit.title}</span>
                  </button>
                );
              })}
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              subject === 'science'
                ? '개념 키워드 검색 (예: 엘니뇨, 산화 환원, 중화 반응, BTB, 수소 연료 전지, 그래핀, 초전도체...)'
                : '개념 키워드 검색 (예: 점과 직선 거리, 원의 접선, 내분점, 명제, 유리함수...)'
            }
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Concept Cards List */}
      {filteredConcepts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-emerald-200 space-y-3">
          <span className="text-4xl block animate-bounce">💡</span>
          <p className="text-sm font-bold text-slate-800">
            조건에 맞는 개념 설명 노트를 찾을 수 없습니다.
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            단원 필터를 변경하거나 검색어를 비워보세요. 선생님 권한으로 새로운 개념 카드를 등록할 수도 있습니다.
          </p>
          {userRole === 'admin' && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95"
            >
              + 새 개념 카드 등록하기
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredConcepts.map((concept, index) => {
            const isExpanded = expandedConceptId === concept.id;
            const isLiked = !!(currentUserId && concept.likedUserIds?.includes(currentUserId));

            return (
              <motion.div
                key={concept.id}
                layout
                className={`bg-white rounded-3xl border transition-all overflow-hidden shadow-sm hover:shadow-md ${
                  isExpanded ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200'
                }`}
              >
                {/* Header Strip */}
                <div
                  onClick={() => setExpandedConceptId(isExpanded ? null : concept.id)}
                  className="p-4 sm:p-5 cursor-pointer select-none bg-gradient-to-r from-slate-50 via-white to-slate-50 hover:bg-slate-100/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-black text-[11px] border border-emerald-200">
                        {concept.subUnitTitle}
                      </span>
                      {concept.badge && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 font-black text-[11px] border border-rose-200 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
                          {concept.badge}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-medium">
                        {concept.chapterName}
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-black flex items-center justify-center text-xs shadow-xs shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base sm:text-lg font-black text-slate-900 leading-snug tracking-tight">
                          {concept.title}
                        </h4>
                        <p className="text-xs sm:text-sm font-medium text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                          {concept.summary}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Chevron */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLikeConcept(concept.id);
                        }}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                          isLiked
                            ? 'bg-rose-500 text-white shadow-xs font-black'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                        title={isLiked ? '좋아요 취소' : '도움이 되었어요'}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-white text-white' : 'text-rose-400'}`} />
                        <span>{concept.likes || 0}</span>
                      </button>

                      {userRole === 'admin' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConceptToDelete(concept);
                          }}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all"
                          title="개념 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all ${
                        isExpanded
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      <span>{isExpanded ? '접기' : '상세 개념 열기'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed Concept Notes */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-slate-200 p-4 sm:p-6 bg-gradient-to-b from-slate-50/50 to-white space-y-6"
                    >
                      {/* Diagram Image if available */}
                      {concept.diagramImageUrl && (
                        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white p-2 shadow-xs">
                          <img
                            src={concept.diagramImageUrl}
                            alt={concept.title}
                            className="max-h-[360px] w-auto mx-auto object-contain rounded-xl"
                          />
                        </div>
                      )}

                      {/* 1. Core Key Points Breakdown */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <h5 className="text-sm font-black text-slate-900">
                            단계별 핵심 원리 및 상세 해설
                          </h5>
                        </div>

                        <div className="grid grid-cols-1 gap-3.5">
                          {concept.keyPoints.map((point, kpIdx) => (
                            <div
                              key={kpIdx}
                              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5"
                            >
                              <div className="flex items-center justify-between">
                                <h6 className="text-xs sm:text-sm font-black text-emerald-950 flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                  <span>{point.title}</span>
                                </h6>
                              </div>

                              <p className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap break-keep">
                                {point.description}
                              </p>

                              {/* Formula or Reaction callout */}
                              {point.formulaOrReaction && (
                                <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 font-mono text-xs sm:text-sm font-bold text-emerald-950 flex items-start gap-2">
                                  <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-black uppercase shrink-0 mt-0.5">
                                    공식 / 반응식
                                  </span>
                                  <span className="whitespace-pre-wrap">{point.formulaOrReaction}</span>
                                </div>
                              )}

                              {/* Important Note callout */}
                              {point.importantNote && (
                                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs font-semibold text-amber-950 flex items-start gap-2">
                                  <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-[10px] font-black shrink-0 mt-0.5">
                                    체크 포인트
                                  </span>
                                  <span>{point.importantNote}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 2. Key Formulas & Reactions Summary Box */}
                      {concept.formulasAndReactions && concept.formulasAndReactions.length > 0 && (
                        <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white shadow-md space-y-3">
                          <div className="flex items-center gap-2 border-b border-white/15 pb-2">
                            <Zap className="w-4 h-4 text-amber-400" />
                            <h5 className="text-xs sm:text-sm font-black text-amber-300">
                              시험 직전 30초! 핵심 공식 &amp; 화학 반응식 총정리
                            </h5>
                          </div>

                          <div className="space-y-2">
                            {concept.formulasAndReactions.map((formula, fIdx) => (
                              <div
                                key={fIdx}
                                className="p-2.5 rounded-xl bg-white/10 border border-white/10 font-mono text-xs sm:text-sm font-bold text-white flex items-start gap-2"
                              >
                                <span className="text-amber-400 font-black shrink-0">#{fIdx + 1}</span>
                                <span className="break-keep">{formula}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. Teacher's Pro Tips & Exam Traps */}
                      {concept.teacherTips && concept.teacherTips.length > 0 && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-200/90 text-amber-950 space-y-2.5">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-orange-600 fill-orange-500" />
                            <h5 className="text-xs sm:text-sm font-black text-amber-900">
                              선생님의 빈출 꿀팁 &amp; 오답 함정 탈출 비법
                            </h5>
                          </div>

                          <div className="space-y-2">
                            {concept.teacherTips.map((tip, tIdx) => (
                              <div
                                key={tIdx}
                                className="p-3 bg-white/90 rounded-xl border border-amber-200 text-xs sm:text-sm font-medium text-slate-800 leading-relaxed break-keep"
                              >
                                {tip}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 4. Interactive Quick Check Flashcards */}
                      {concept.quickChecks && concept.quickChecks.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <HelpCircle className="w-4 h-4 text-emerald-600" />
                              <h5 className="text-xs sm:text-sm font-black text-slate-900">
                                개념 즉시 점검 퀴즈 ({concept.quickChecks.length}문항)
                              </h5>
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">
                              카드를 클릭하여 정답을 확인하세요!
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {concept.quickChecks.map((qc, qcIdx) => {
                              const key = `${concept.id}-qc-${qcIdx}`;
                              const isRevealed = !!revealedAnswers[key];

                              return (
                                <div
                                  key={qcIdx}
                                  onClick={() => toggleRevealAnswer(key)}
                                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between space-y-3 ${
                                    isRevealed
                                      ? 'bg-emerald-50/90 border-emerald-300 shadow-sm'
                                      : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md font-black text-[10px]">
                                        Q{qcIdx + 1}
                                      </span>
                                      <span className="text-[11px] font-bold text-emerald-700">
                                        {isRevealed ? '정답 숨기기 ▲' : '정답 확인하기 ▼'}
                                      </span>
                                    </div>
                                    <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug break-keep">
                                      {qc.question}
                                    </p>
                                  </div>

                                  {isRevealed ? (
                                    <motion.div
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1.5 text-xs"
                                    >
                                      <div className="flex items-center gap-1.5 text-emerald-800 font-black">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>정답: {qc.answer}</span>
                                      </div>
                                      <p className="text-slate-600 leading-relaxed font-medium">
                                        {qc.explanation}
                                      </p>
                                    </motion.div>
                                  ) : (
                                    <div className="py-2 text-center text-xs font-bold text-slate-400 bg-slate-100/70 rounded-xl border border-dashed border-slate-300">
                                      🔍 클릭하면 정답과 친절한 해설이 나타납니다
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Tags & Meta info */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                          {concept.tags.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-[11px]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2">
                          <span>{concept.authorName}</span>
                          <span>•</span>
                          <span>{concept.createdAt}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADMIN: NEW CONCEPT CREATION MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAddModal && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-white/20">
                    <PlusCircle className="w-5 h-5 text-white" />
                  </span>
                  <div>
                    <h4 className="text-base sm:text-lg font-black">
                      새 {subject === 'science' ? '과학' : '수학'} 핵심 개념 노트 등록
                    </h4>
                    <p className="text-xs text-emerald-100 font-medium">
                      학생들이 언제든지 복습할 수 있도록 단원별 필수 개념과 꿀팁을 등록하세요.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmitNewConcept} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
                {/* Chapter & Subunit Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">대단원 선택 *</label>
                    <select
                      value={formChapterId}
                      onChange={(e) => {
                        setFormChapterId(e.target.value);
                        const ch = curriculum.find((c) => c.id === e.target.value);
                        if (ch && ch.subUnits.length > 0) {
                          setFormSubUnitId(ch.subUnits[0].id);
                        }
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      {curriculum.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {ch.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">중단원(세부 주제) *</label>
                    <select
                      value={formSubUnitId}
                      onChange={(e) => setFormSubUnitId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      {curriculum
                        .find((c) => c.id === formChapterId)
                        ?.subUnits.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.title}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Concept Title & Badge */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">개념 제목 *</label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder={
                        subject === 'science'
                          ? '예: 산과 염기의 성질 및 중화 반응 총정리'
                          : '예: 점과 직선 사이의 거리 공식 완벽 정리'
                      }
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">배지 (난이도/중요도)</label>
                    <input
                      type="text"
                      value={formBadge}
                      onChange={(e) => setFormBadge(e.target.value)}
                      placeholder="예: 내신 빈출 1순위 ★★★"
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">한 줄 핵심 요약</label>
                  <textarea
                    rows={2}
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    placeholder="해당 개념의 핵심 의미와 필수 이해 포인트를 1~2문장으로 요약해주세요."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Key Points */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                      <span>단계별 핵심 포인트 ({formKeyPoints.length}개)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddKeyPointField}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> + 포인트 추가
                    </button>
                  </div>

                  {formKeyPoints.map((kp, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={kp.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormKeyPoints((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], title: val };
                              return next;
                            });
                          }}
                          placeholder={`포인트 ${idx + 1} 소제목`}
                          className="flex-1 p-2 rounded-lg border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                        />
                        {formKeyPoints.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyPointField(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <textarea
                        rows={3}
                        value={kp.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormKeyPoints((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], description: val };
                            return next;
                          });
                        }}
                        placeholder="상세 설명 내용을 줄바꿈을 포함하여 자유롭게 작성하세요."
                        className="w-full p-2 rounded-lg border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={kp.formulaOrReaction || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormKeyPoints((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], formulaOrReaction: val };
                              return next;
                            });
                          }}
                          placeholder="수식 / 화학반응식 (선택)"
                          className="p-2 rounded-lg border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          value={kp.importantNote || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormKeyPoints((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], importantNote: val };
                              return next;
                            });
                          }}
                          placeholder="체크 포인트 / 주의사항 (선택)"
                          className="p-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Formulas & Teacher Tips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      핵심 공식 / 화학 반응식 (줄 단위 입력)
                    </label>
                    <textarea
                      rows={3}
                      value={formFormulasInput}
                      onChange={(e) => setFormFormulasInput(e.target.value)}
                      placeholder="2Mg + O₂ → 2MgO&#10;H⁺ + OH⁻ → H₂O"
                      className="w-full p-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      선생님 빈출 꿀팁 / 함정 (줄 단위 입력)
                    </label>
                    <textarea
                      rows={3}
                      value={formTeacherTipsInput}
                      onChange={(e) => setFormTeacherTipsInput(e.target.value)}
                      placeholder="💡 BTB 용액은 산성(노랑), 중성(초록), 염기성(파랑) 순서입니다."
                      className="w-full p-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Interactive Flashcards */}
                <div className="space-y-3 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>확인 퀴즈 플래시카드 ({formQuickChecks.length}문항)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddQuickCheckField}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> + 퀴즈 추가
                    </button>
                  </div>

                  {formQuickChecks.map((qc, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded">
                          Q{idx + 1}
                        </span>
                        {formQuickChecks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuickCheckField(idx)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={qc.question}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormQuickChecks((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], question: val };
                            return next;
                          });
                        }}
                        placeholder="질문 (예: 엘니뇨 발생 시 동태평양의 수온과 강수량 변화는?)"
                        className="w-full p-2 rounded-lg border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={qc.answer}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormQuickChecks((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], answer: val };
                              return next;
                            });
                          }}
                          placeholder="정답 (예: 수온 상승, 강수량 증가)"
                          className="p-2 rounded-lg border border-slate-200 text-xs font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          value={qc.explanation}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormQuickChecks((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], explanation: val };
                              return next;
                            });
                          }}
                          placeholder="간략한 해설"
                          className="p-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tags & Image Attachment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">해시태그 (공백/쉼표로 구분)</label>
                    <input
                      type="text"
                      value={formTagsInput}
                      onChange={(e) => setFormTagsInput(e.target.value)}
                      placeholder="#산화환원 #중화반응 #BTB"
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">개념 도식/그림 첨부 (선택)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleDiagramFileRead(file);
                        }}
                      />
                      <input
                        type="file"
                        ref={cameraInputRef}
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleDiagramFileRead(file);
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" /> 갤러리 업로드
                      </button>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" /> 사진 촬영
                      </button>
                    </div>

                    {formDiagramImage && (
                      <div className="relative mt-2 p-1 border rounded-xl bg-slate-50 flex items-center justify-between">
                        <span className="text-[11px] text-emerald-700 font-bold px-2">✓ 이미지 첨부됨</span>
                        <button
                          type="button"
                          onClick={() => setFormDiagramImage(null)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg text-xs"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all active:scale-95"
                  >
                    개념 노트 등록 완료
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {conceptToDelete && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setConceptToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-900">개념 노트를 삭제할까요?</h4>
                <p className="text-xs text-slate-500 break-keep">
                  '{conceptToDelete.title}' 노트를 삭제하면 학생들이 더 이상 열람할 수 없습니다.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConceptToDelete(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md"
                >
                  삭제하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
