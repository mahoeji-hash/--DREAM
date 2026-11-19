import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useModalHistory } from '../utils/navigationHistory';
import { 
  Search, BookOpen, ChevronRight, Filter, Sparkles, PlusCircle, 
  CheckCircle, CheckCircle2, Bookmark, ArrowLeft, Home, Trash2, ShieldCheck, Award, 
  FileQuestion, Camera, Upload, Image as ImageIcon, Maximize2, X, 
  Layers, ChevronDown, Check, PlayCircle, BookMarked, Compass,
  Clock, Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SubjectType, GradeType, TextbookInfo, ProblemItem, SolutionStep, UserRole, ConceptItem } from '../types';
import { getCurriculumForSubject, ChapterGroup, SubUnitItem } from '../data/curriculumData';
import { compressImageFile, uploadImageFileToBucket } from '../services/imageService';
import { generateUuid } from '../supabaseClient';
import { safeLocalStorageGet, safeLocalStorageSet } from '../services/storageService';
import { VideoLectureEmbed } from './VideoLectureEmbed';

const CIRCLED_NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

export interface BatchProblemDraft {
  tempId: string;
  problemNumber: string;
  pageNumber: string;
  difficulty: '쉬움' | '보통' | '도전' | '심화';
  problemType: '중단원 마무리' | '대단원 평가' | '개념 예제' | '확인 문제' | '발전/심화 문제';
  problemText?: string;
  problemImage?: string | null;
  solutionImage?: string | null;
  videoUrl?: string;
  finalAnswer: string;
}

interface TextbookMasterViewProps {
  subject: SubjectType;
  textbooks: TextbookInfo[];
  problems: ProblemItem[];
  bookmarkedProblemIds: string[];
  userRole?: UserRole;
  currentUserId?: string;
  concepts?: ConceptItem[];
  initialTab?: 'problems' | 'concepts';
  onSelectProblem: (problem: ProblemItem) => void;
  onGoBack: () => void;
  onAddNewProblem: (newProblem: ProblemItem) => void;
  onAddNewProblems?: (newProblems: ProblemItem[]) => void;
  onUpdateProblem?: (updatedProblem: ProblemItem) => void;
  onDeleteProblem?: (problemId: string) => void;
  onAddNewConcept?: (concept: ConceptItem) => void;
  onDeleteConcept?: (conceptId: string) => void;
  onToggleLikeConcept?: (conceptId: string) => void;
}

export const TextbookMasterView: React.FC<TextbookMasterViewProps> = ({
  subject,
  textbooks,
  problems,
  bookmarkedProblemIds,
  userRole = 'student',
  currentUserId,
  concepts = [],
  initialTab,
  onSelectProblem,
  onGoBack,
  onAddNewProblem,
  onAddNewProblems,
  onUpdateProblem,
  onDeleteProblem,
  onAddNewConcept,
  onDeleteConcept,
  onToggleLikeConcept,
}) => {
  const [selectedTextbookId, setSelectedTextbookId] = useState<string | null>(() => {
    return safeLocalStorageGet<string | null>(`puleo_${subject}_selected_textbook_id`, null);
  });
  
  // Navigation & Dropdown Selection State
  const [isUnitSelectorOpen, setIsUnitSelectorOpen] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(() => {
    return safeLocalStorageGet<string | null>(`puleo_${subject}_selected_chapter_id`, null);
  });
  const [selectedSubUnitId, setSelectedSubUnitId] = useState<string | null>(() => {
    return safeLocalStorageGet<string | null>(`puleo_${subject}_selected_subunit_id`, null);
  });
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | '중단원 마무리' | '대단원 평가'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Tab: Problems only (핵심 개념 설명 탭 제거됨)
  const [activeTab, setActiveTab] = useState<'problems' | 'concepts'>('problems');

  useEffect(() => {
    safeLocalStorageSet(`puleo_${subject}_selected_textbook_id`, selectedTextbookId);
  }, [subject, selectedTextbookId]);

  useEffect(() => {
    safeLocalStorageSet(`puleo_${subject}_selected_chapter_id`, selectedChapterId);
  }, [subject, selectedChapterId]);

  useEffect(() => {
    safeLocalStorageSet(`puleo_${subject}_selected_subunit_id`, selectedSubUnitId);
  }, [subject, selectedSubUnitId]);

  useEffect(() => {
    safeLocalStorageSet(`puleo_${subject}_active_tab`, 'problems');
  }, [subject, activeTab]);

  useEffect(() => {
    if (activeTab !== 'problems') {
      setActiveTab('problems');
    }
  }, [activeTab]);

  // Problem registration / editing modal (Admin only)
  const [showAddProblemModal, setShowAddProblemModal] = useState(false);
  const [addProblemModalMode, setAddProblemModalMode] = useState<'single' | 'batch'>('single');
  const [editingProblem, setEditingProblem] = useState<ProblemItem | null>(null);

  // Deletion confirmation targets for large prominent modal dialogs
  const [deleteProblemTarget, setDeleteProblemTarget] = useState<{ id: string; title: string; pageNumber: number; problemNumber: string; text?: string } | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [continuousAdd, setContinuousAdd] = useState(true);
  const [recentlyAddedCount, setRecentlyAddedCount] = useState(0);
  const [successToastMessage, setSuccessToastMessage] = useState<string | null>(null);

  // Modal targeted Chapter & SubUnit
  const [modalChapterId, setModalChapterId] = useState<string>('');
  const [modalSubUnitId, setModalSubUnitId] = useState<string>('');

  // Single problem fields
  const [newProbType, setNewProbType] = useState<'중단원 마무리' | '대단원 평가' | '개념 예제' | '확인 문제' | '발전/심화 문제'>('중단원 마무리');
  const [newProbDifficulty, setNewProbDifficulty] = useState<'쉬움' | '보통' | '도전' | '심화'>('보통');
  const [newPageNum, setNewPageNum] = useState('');
  const [newProbNum, setNewProbNum] = useState('');
  const [newProblemImage, setNewProblemImage] = useState<string | null>(null);
  const [newSolutionImage, setNewSolutionImage] = useState<string | null>(null);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newFinalAns, setNewFinalAns] = useState('');
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Synchronize zoom lightbox and admin modals with browser Back button
  useModalHistory(!!zoomImage, () => setZoomImage(null), 'tb-zoom-image');
  useModalHistory(showAddProblemModal, () => setShowAddProblemModal(false), 'tb-add-problem');

  // Batch multi-problem fields
  const [batchDrafts, setBatchDrafts] = useState<BatchProblemDraft[]>([]);

  const selectorRef = useRef<HTMLDivElement>(null);

  // Single mode photo refs
  const problemFileInputRef = useRef<HTMLInputElement>(null);
  const problemCameraInputRef = useRef<HTMLInputElement>(null);
  const solutionFileInputRef = useRef<HTMLInputElement>(null);
  const solutionCameraInputRef = useRef<HTMLInputElement>(null);

  // Batch mode photo refs
  const batchImageInputRef = useRef<HTMLInputElement>(null);
  const batchCameraInputRef = useRef<HTMLInputElement>(null);
  const [activeBatchDraftIdForImage, setActiveBatchDraftIdForImage] = useState<string | null>(null);
  const [activeBatchTargetType, setActiveBatchTargetType] = useState<'problem' | 'solution'>('problem');

  // Curriculum structure for this subject
  const curriculumChapters = useMemo(() => {
    return getCurriculumForSubject(subject);
  }, [subject]);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsUnitSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleProblemImageFileRead = async (file: File) => {
    setToastNotice('문제 사진을 Supabase에 업로드 중...');
    const res = await uploadImageFileToBucket(file, 'problems');
    if (res.url) {
      setNewProblemImage(res.url);
      setToastNotice(res.uploadedToStorage ? '문제 사진이 업로드되었습니다!' : '문제 사진이 준비되었습니다.');
      setTimeout(() => setToastNotice(null), 2500);
    } else {
      setToastNotice(null);
    }
  };

  const handleSolutionImageFileRead = async (file: File) => {
    setToastNotice('풀이 사진을 Supabase에 업로드 중...');
    const res = await uploadImageFileToBucket(file, 'solutions');
    if (res.url) {
      setNewSolutionImage(res.url);
      setToastNotice(res.uploadedToStorage ? '풀이 사진이 업로드되었습니다!' : '풀이 사진이 준비되었습니다.');
      setTimeout(() => setToastNotice(null), 2500);
    } else {
      setToastNotice(null);
    }
  };

  // Filtered textbooks for this subject
  const subjectTextbooks = useMemo(() => {
    return textbooks.filter((tb) => tb.subject === subject);
  }, [textbooks, subject]);

  // Active Textbook
  const activeTextbook = useMemo(() => {
    if (selectedTextbookId) {
      return textbooks.find((tb) => tb.id === selectedTextbookId) || subjectTextbooks[0];
    }
    return subjectTextbooks[0];
  }, [selectedTextbookId, textbooks, subjectTextbooks]);

  // Current active chapter object
  const activeChapterObj = useMemo(() => {
    if (!selectedChapterId) return null;
    return curriculumChapters.find((ch) => ch.id === selectedChapterId) || null;
  }, [curriculumChapters, selectedChapterId]);

  // Current active subunit object
  const activeSubUnitObj = useMemo(() => {
    if (!activeChapterObj || !selectedSubUnitId) return null;
    if (activeChapterObj.grandAssessment.id === selectedSubUnitId) {
      return activeChapterObj.grandAssessment;
    }
    return activeChapterObj.subUnits.find((su) => su.id === selectedSubUnitId) || null;
  }, [activeChapterObj, selectedSubUnitId]);

  // Helper to accurately count problems for any subunit
  const getSubUnitCount = (ch: ChapterGroup, su: SubUnitItem) => {
    return problems.filter((prob) => {
      if (prob.subject !== subject) return false;
      if (activeTextbook && prob.textbookId !== activeTextbook.id) return false;
      if (prob.subUnitId && prob.subUnitId === su.id) return true;
      if (prob.unitCode && prob.unitCode === su.unitCode) return true;

      const matchesChapter =
        (prob.chapter && (prob.chapter.includes(ch.chapterName) || prob.chapter.includes(`${ch.chapterNumber}`))) ||
        prob.unitNumber === ch.chapterNumber;
      if (!matchesChapter) return false;

      if (su.category === '대단원 평가') {
        return (
          prob.problemType === '발전/심화 문제' ||
          prob.unitName.includes('대단원') ||
          prob.problemNumber.includes('대단원')
        );
      } else {
        const cleanTitle = su.title.replace(/^\d+\.\s*/, '');
        return prob.unitName.includes(cleanTitle) || prob.unitName.includes(su.title);
      }
    }).length;
  };

  // Filtered problems according to selected Chapter / Sub-Unit / Search Query with sequential sort
  const filteredProblems = useMemo(() => {
    const list = problems.filter((prob) => {
      if (prob.subject !== subject) return false;
      if (activeTextbook && prob.textbookId !== activeTextbook.id) return false;

      // Filter by Chapter
      if (activeChapterObj) {
        const matchesChapter = 
          (prob.chapter && (prob.chapter.includes(activeChapterObj.chapterName) || prob.chapter.includes(`${activeChapterObj.chapterNumber}`))) ||
          prob.unitNumber === activeChapterObj.chapterNumber;
        if (!matchesChapter) return false;
      }

      // Filter by Sub-Unit
      if (activeSubUnitObj) {
        if (prob.subUnitId && prob.subUnitId === activeSubUnitObj.id) {
          // Direct match by ID
        } else if (prob.unitCode && prob.unitCode === activeSubUnitObj.unitCode) {
          // Direct match by unit code
        } else if (activeSubUnitObj.category === '대단원 평가') {
          const isGrand = prob.problemType === '발전/심화 문제' || 
                          prob.unitName.includes('대단원') || 
                          prob.problemNumber.includes('대단원');
          if (!isGrand) return false;
        } else {
          // 중단원 마무리
          const cleanTitle = activeSubUnitObj.title.replace(/^\d+\.\s*/, '');
          const matchesSub = prob.unitName.includes(cleanTitle) || prob.unitName.includes(activeSubUnitObj.title);
          if (!matchesSub) return false;
        }
      }

      // Filter by Category Type pill (if selected)
      if (selectedCategoryFilter === '중단원 마무리') {
        if (prob.problemType !== '중단원 마무리' && !prob.problemNumber.includes('중단원')) return false;
      } else if (selectedCategoryFilter === '대단원 평가') {
        if (!prob.problemNumber.includes('대단원') && !prob.unitName.includes('대단원') && prob.problemType !== '발전/심화 문제') return false;
      }

      // Search query string
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPage = `p.${prob.pageNumber}`.includes(q) || `${prob.pageNumber}`.includes(q);
        const matchesNum = (prob.problemNumber || '').toLowerCase().includes(q);
        const matchesText = (prob.problemText || '').toLowerCase().includes(q);
        const matchesUnit = (prob.unitName || '').toLowerCase().includes(q);
        const matchesConcepts = prob.coreConcepts?.some((c) => c.toLowerCase().includes(q)) || false;
        return matchesPage || matchesNum || matchesText || matchesUnit || matchesConcepts;
      }

      return true;
    });

    // Sequential sort: Page ascending, then Problem Number natural sort (01번, 02번, 03번...)
    return list.sort((a, b) => {
      if (a.pageNumber !== b.pageNumber) {
        return a.pageNumber - b.pageNumber;
      }
      return a.problemNumber.localeCompare(b.problemNumber, undefined, { numeric: true });
    });
  }, [problems, subject, activeTextbook, activeChapterObj, activeSubUnitObj, selectedCategoryFilter, searchQuery]);

  // Select Unit & Close Dropdown
  const handleSelectSubUnit = (chapter: ChapterGroup, subUnit: SubUnitItem) => {
    setSelectedChapterId(chapter.id);
    setSelectedSubUnitId(subUnit.id);
    setSelectedCategoryFilter(subUnit.category === '대단원 평가' ? '대단원 평가' : '중단원 마무리');
    setIsUnitSelectorOpen(false);
    setSearchQuery('');
  };

  const handleSelectWholeChapter = (chapter: ChapterGroup) => {
    setSelectedChapterId(chapter.id);
    setSelectedSubUnitId(null);
    setSelectedCategoryFilter('all');
    setIsUnitSelectorOpen(false);
    setSearchQuery('');
  };

  const handleResetUnitFilter = () => {
    setSelectedChapterId(null);
    setSelectedSubUnitId(null);
    setSelectedCategoryFilter('all');
    setSearchQuery('');
  };

  // Open problem registration modal pre-configured for a specific chapter/subunit
  const handleOpenAddProblemModal = (
    targetChapterId?: string,
    targetSubUnitId?: string,
    mode: 'single' | 'batch' = 'single'
  ) => {
    setEditingProblem(null);
    const chId = targetChapterId || selectedChapterId || curriculumChapters[0]?.id || '';
    const targetChapter = curriculumChapters.find((c) => c.id === chId) || curriculumChapters[0];
    const suId =
      targetSubUnitId ||
      selectedSubUnitId ||
      targetChapter?.subUnits[0]?.id ||
      '';
    const targetSubUnit =
      targetChapter?.grandAssessment.id === suId
        ? targetChapter.grandAssessment
        : targetChapter?.subUnits.find((s) => s.id === suId) || targetChapter?.subUnits[0];

    setModalChapterId(chId);
    setModalSubUnitId(suId);
    setAddProblemModalMode(mode);
    setRecentlyAddedCount(0);
    setSuccessToastMessage(null);

    // Compute existing count in that subunit to auto-suggest next problem number
    let existingCount = 0;
    if (targetChapter && targetSubUnit) {
      existingCount = getSubUnitCount(targetChapter, targetSubUnit);
    }
    const nextNum = existingCount + 1;
    const formattedNum = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;

    if (targetSubUnit?.category === '대단원 평가') {
      setNewProbType('대단원 평가');
      setNewProbNum(`대단원 평가 ${formattedNum}번`);
    } else {
      setNewProbType('중단원 마무리');
      setNewProbNum(`중단원 마무리 ${formattedNum}번`);
    }

    setNewProbDifficulty('보통');
    setNewProblemImage(null);
    setNewSolutionImage(null);
    setNewVideoUrl('');
    setNewFinalAns('');

    // Try extracting page number from page range (e.g., "p.39 ~ p.58")
    if (targetSubUnit?.pageRange) {
      const match = targetSubUnit.pageRange.match(/\d+/);
      if (match) {
        setNewPageNum(match[0]);
      }
    }

    // Initialize Batch drafts
    const initialBatch: BatchProblemDraft[] = [
      {
        tempId: `draft-${Date.now()}-1`,
        problemNumber: `0${nextNum}번`,
        pageNumber: newPageNum || (targetSubUnit?.pageRange?.match(/\d+/)?.[0] ?? '40'),
        difficulty: '보통',
        problemType: targetSubUnit?.category === '대단원 평가' ? '대단원 평가' : '중단원 마무리',
        problemImage: null,
        solutionImage: null,
        videoUrl: '',
        finalAnswer: '',
      },
      {
        tempId: `draft-${Date.now()}-2`,
        problemNumber: `0${nextNum + 1}번`,
        pageNumber: newPageNum || (targetSubUnit?.pageRange?.match(/\d+/)?.[0] ?? '40'),
        difficulty: '보통',
        problemType: targetSubUnit?.category === '대단원 평가' ? '대단원 평가' : '중단원 마무리',
        problemImage: null,
        solutionImage: null,
        videoUrl: '',
        finalAnswer: '',
      },
    ];
    setBatchDrafts(initialBatch);

    setShowAddProblemModal(true);
  };

  // Open edit modal for an existing textbook problem (Admin only)
  const handleOpenEditProblemModal = (prob: ProblemItem) => {
    if (userRole !== 'admin') return;

    const matchedChapter =
      curriculumChapters.find(
        (ch) =>
          ch.fullName === prob.chapter ||
          ch.chapterNumber === prob.unitNumber ||
          ch.chapterName === prob.chapter ||
          (prob.chapter && ch.fullName.includes(prob.chapter))
      ) || curriculumChapters[0];

    const matchedSubUnit =
      (prob.subUnitId &&
        (matchedChapter.grandAssessment.id === prob.subUnitId
          ? matchedChapter.grandAssessment
          : matchedChapter.subUnits.find((s) => s.id === prob.subUnitId))) ||
      [matchedChapter.grandAssessment, ...matchedChapter.subUnits].find(
        (s) => s.title === prob.unitName || (prob.unitName && s.title.includes(prob.unitName))
      ) ||
      matchedChapter.subUnits[0] ||
      matchedChapter.grandAssessment;

    setEditingProblem(prob);
    setAddProblemModalMode('single');
    setModalChapterId(matchedChapter.id);
    setModalSubUnitId(matchedSubUnit.id);
    setNewProbType(prob.problemType || '중단원 마무리');
    setNewProbDifficulty(prob.difficulty || '보통');
    setNewPageNum(String(prob.pageNumber || 1));
    setNewProbNum(prob.problemNumber || '');
    setNewProblemImage(prob.problemImage || null);
    setNewSolutionImage(prob.solutionImage || null);
    setNewVideoUrl(prob.videoUrl || '');
    setNewFinalAns(prob.finalAnswer || '');
    setRecentlyAddedCount(0);
    setSuccessToastMessage(null);
    setShowAddProblemModal(true);
  };

  // Helper to add a new card in batch mode
  const handleAddBatchDraftRow = () => {
    const nextIdx = batchDrafts.length + 1;
    const formattedNum = nextIdx < 10 ? `0${nextIdx}번` : `${nextIdx}번`;
    const lastPage = batchDrafts[batchDrafts.length - 1]?.pageNumber || '40';
    setBatchDrafts((prev) => [
      ...prev,
      {
        tempId: `draft-${Date.now()}-${Math.random()}`,
        problemNumber: formattedNum,
        pageNumber: lastPage,
        difficulty: '보통',
        problemType: newProbType,
        problemImage: null,
        solutionImage: null,
        videoUrl: '',
        finalAnswer: '',
      },
    ]);
  };

  const handleRemoveBatchDraftRow = (tempId: string) => {
    if (batchDrafts.length <= 1) {
      alert('최소 1개 이상의 문제 카드는 유지되어야 합니다.');
      return;
    }
    setBatchDrafts((prev) => prev.filter((d) => d.tempId !== tempId));
  };

  const handleUpdateBatchDraftField = (tempId: string, field: keyof BatchProblemDraft, value: any) => {
    setBatchDrafts((prev) =>
      prev.map((d) => (d.tempId === tempId ? { ...d, [field]: value } : d))
    );
  };

  const handleBatchImageFileRead = async (file: File) => {
    if (!activeBatchDraftIdForImage) return;
    const folder = activeBatchTargetType === 'problem' ? 'problems' : 'solutions';
    setToastNotice('사진을 Supabase에 업로드 중...');
    const res = await uploadImageFileToBucket(file, folder);
    if (res.url) {
      if (activeBatchTargetType === 'problem') {
        handleUpdateBatchDraftField(activeBatchDraftIdForImage, 'problemImage', res.url);
      } else {
        handleUpdateBatchDraftField(activeBatchDraftIdForImage, 'solutionImage', res.url);
      }
      setToastNotice(res.uploadedToStorage ? '사진이 업로드되었습니다!' : '사진이 준비되었습니다.');
      setTimeout(() => setToastNotice(null), 2500);
    } else {
      setToastNotice(null);
    }
  };

  // Single / Continuous Problem Creation
  const handleCreateProblemSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin') {
      alert('교과서 문제 및 풀이 등록은 관리자(선생님)만 가능합니다.');
      return;
    }

    const targetChapter = curriculumChapters.find((c) => c.id === modalChapterId) || curriculumChapters[0];
    const targetSubUnit =
      targetChapter?.grandAssessment.id === modalSubUnitId
        ? targetChapter.grandAssessment
        : targetChapter?.subUnits.find((s) => s.id === modalSubUnitId) || targetChapter?.subUnits[0];

    if (!newFinalAns.trim()) {
      alert('최종 정답(답칸)을 입력해주세요.');
      return;
    }

    const probNumStr = newProbNum.trim() || '문제 1번';

    if (editingProblem) {
      if (!onUpdateProblem) return;
      const updated: ProblemItem = {
        ...editingProblem,
        chapter: targetChapter.fullName,
        unitNumber: targetChapter.chapterNumber,
        unitName: targetSubUnit.title,
        subUnitId: targetSubUnit.id,
        unitCode: targetSubUnit.unitCode,
        pageNumber: parseInt(newPageNum, 10) || 1,
        problemNumber: probNumStr,
        problemType: newProbType,
        difficulty: newProbDifficulty,
        problemImage: newProblemImage || undefined,
        solutionImage: newSolutionImage || undefined,
        videoUrl: newVideoUrl.trim() || undefined,
        finalAnswer: newFinalAns.trim(),
        coreConcepts: [targetSubUnit.title, newProbType],
      };
      onUpdateProblem(updated);
      setShowAddProblemModal(false);
      setEditingProblem(null);
      setToastNotice(`[${probNumStr}] 문제가 성공적으로 수정되었습니다!`);
      setTimeout(() => setToastNotice(null), 3000);
      return;
    }

    const created: ProblemItem = {
      id: generateUuid(),
      textbookId: activeTextbook?.id || (subject === 'math' ? 'tb-math-mr-h2' : 'tb-sci-bs-h2'),
      subject: subject,
      grade: 'high_1',
      chapter: targetChapter.fullName,
      unitNumber: targetChapter.chapterNumber,
      unitName: targetSubUnit.title,
      subUnitId: targetSubUnit.id,
      unitCode: targetSubUnit.unitCode,
      pageNumber: parseInt(newPageNum, 10) || 1,
      problemNumber: probNumStr,
      problemType: newProbType,
      difficulty: newProbDifficulty,
      problemText: '',
      problemImage: newProblemImage || undefined,
      solutionImage: newSolutionImage || undefined,
      videoUrl: newVideoUrl.trim() || undefined,
      solutionSteps: [],
      finalAnswer: newFinalAns.trim(),
      coreConcepts: [targetSubUnit.title, newProbType],
      dreamTip: '',
      peerTips: [],
      studentSolutions: [],
      views: 1,
      likes: 0,
    };

    onAddNewProblem(created);

    if (continuousAdd) {
      // Keep modal open and advance problem number for rapid entry!
      setRecentlyAddedCount((prev) => prev + 1);
      setSuccessToastMessage(`✅ [${probNumStr}] 등록 완료! 다음 문제를 계속 입력하세요.`);
      setTimeout(() => setSuccessToastMessage(null), 4000);

      // Auto-increment problem number (e.g. 01번 -> 02번)
      const numMatch = probNumStr.match(/\d+/);
      if (numMatch) {
        const nextInt = parseInt(numMatch[0], 10) + 1;
        const formatted = nextInt < 10 ? `0${nextInt}번` : `${nextInt}번`;
        setNewProbNum(formatted);
      } else {
        setNewProbNum(`${probNumStr} (다음)`);
      }

      // Clear photos, video url, and answer for next problem, while keeping unit & page intact
      setNewProblemImage(null);
      setNewSolutionImage(null);
      setNewVideoUrl('');
      setNewFinalAns('');
    } else {
      setShowAddProblemModal(false);
      setToastNotice(`새 교과서 문제 [${probNumStr}]가 성공적으로 등록되었습니다!`);
      setTimeout(() => setToastNotice(null), 3000);
    }
  };

  // Batch Multi-Problem Submission
  const handleCreateProblemBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin') {
      alert('교과서 문제 및 풀이 등록은 관리자(선생님)만 가능합니다.');
      return;
    }

    const targetChapter = curriculumChapters.find((c) => c.id === modalChapterId) || curriculumChapters[0];
    const targetSubUnit =
      targetChapter?.grandAssessment.id === modalSubUnitId
        ? targetChapter.grandAssessment
        : targetChapter?.subUnits.find((s) => s.id === modalSubUnitId) || targetChapter?.subUnits[0];

    // Filter valid drafts (must have final answer)
    const validDrafts = batchDrafts.filter((d) => d.finalAnswer.trim());
    if (validDrafts.length === 0) {
      alert('등록할 문제의 [최종 정답(답칸)]을 최소 1문제 이상 입력해주세요.');
      return;
    }

    const newProblemsToSave: ProblemItem[] = validDrafts.map((draft, idx) => ({
      id: generateUuid(),
      textbookId: activeTextbook?.id || (subject === 'math' ? 'tb-math-mr-h2' : 'tb-sci-bs-h2'),
      subject: subject,
      grade: 'high_1',
      chapter: targetChapter.fullName,
      unitNumber: targetChapter.chapterNumber,
      unitName: targetSubUnit.title,
      subUnitId: targetSubUnit.id,
      unitCode: targetSubUnit.unitCode,
      pageNumber: parseInt(draft.pageNumber, 10) || 1,
      problemNumber: draft.problemNumber.trim() || `문제 ${idx + 1}번`,
      problemType: draft.problemType,
      difficulty: draft.difficulty,
      problemText: '',
      problemImage: draft.problemImage || undefined,
      solutionImage: draft.solutionImage || undefined,
      videoUrl: draft.videoUrl?.trim() || undefined,
      solutionSteps: [],
      finalAnswer: draft.finalAnswer.trim(),
      coreConcepts: [targetSubUnit.title, draft.problemType],
      dreamTip: '',
      peerTips: [],
      studentSolutions: [],
      views: 1,
      likes: 0,
    }));

    if (onAddNewProblems) {
      onAddNewProblems(newProblemsToSave);
    } else {
      newProblemsToSave.forEach((prob) => onAddNewProblem(prob));
    }

    setShowAddProblemModal(false);
    alert(`🎉 [${targetSubUnit.title}] 단원에 총 ${newProblemsToSave.length}개 문제가 성공적으로 일괄 등록되었습니다!`);
  };

  const themeBorder = subject === 'math' ? 'border-blue-500' : 'border-emerald-500';
  const themeBgLight = subject === 'math' ? 'bg-blue-50' : 'bg-emerald-50';
  const themeBadge = subject === 'math' ? 'bg-blue-600' : 'bg-emerald-600';

  return (
    <div id="textbook-master-container" className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-5 space-y-4 sm:space-y-5">
      {/* Top Navigation Bar (Sticky so it stays visible while scrolling) */}
      <div className="sticky top-0 z-30 bg-[#F8F5EE]/95 backdrop-blur-md pt-2 pb-3 border-b border-amber-200/90 flex flex-wrap items-center justify-between gap-2.5">
        <button
          id="btn-back-to-home"
          type="button"
          onClick={onGoBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border-2 border-amber-300 hover:border-amber-500 hover:bg-amber-50/90 text-slate-800 text-xs sm:text-sm font-black shadow-sm transition-all active:scale-95 cursor-pointer touch-manipulation select-none"
          title="홈 화면으로 돌아가기"
        >
          <Home className="w-4 h-4 text-amber-600 shrink-0" />
          <span>홈으로 돌아가기</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {userRole === 'admin' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                id="btn-admin-add-problem-top"
                type="button"
                onClick={() => handleOpenAddProblemModal(undefined, undefined, 'single')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-md transition-all active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5 text-white" />
                <span>+ 문제 단일/연속 등록</span>
              </button>
              <button
                id="btn-admin-add-batch-top"
                type="button"
                onClick={() => handleOpenAddProblemModal(undefined, undefined, 'batch')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition-all active:scale-95"
              >
                <Layers className="w-3.5 h-3.5 text-white" />
                <span>⚡ 여러 문제 일괄 등록</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border-2 border-amber-200 shadow-2xs">
            <span className="text-xs font-bold text-slate-500">과목:</span>
            <span className={`text-xs font-black px-2.5 py-0.5 rounded-xl ${themeBadge} text-white shadow-2xs`}>
              {subject === 'math' ? '수학 (미래엔 공통수학 2)' : '과학 (비상교육 통합과학 2)'}
            </span>
          </div>
        </div>
      </div>

      {/* Toast Notice Banner */}
      {toastNotice && (
        <div className="bg-emerald-600 text-white text-xs sm:text-sm font-black py-2.5 px-4 rounded-2xl text-center shadow-md animate-in fade-in flex items-center justify-center gap-2">
          <span>✓</span>
          <span>{toastNotice}</span>
        </div>
      )}

      {/* Main Tab Navigator (Clean, Spacious, Beautiful Segmented Control) */}
      <div className="bg-amber-100/80 p-1.5 sm:p-2 rounded-3xl border-2 border-amber-200 shadow-inner flex flex-col sm:flex-row gap-1.5 sm:gap-2">
        <button
          id="tab-btn-problems"
          type="button"
          onClick={() => setActiveTab('problems')}
          className={`flex-1 py-3 px-3 sm:px-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all relative ${
            subject === 'science'
              ? 'bg-white text-emerald-950 border-2 border-emerald-500 shadow-md scale-[1.01]'
              : 'bg-white text-blue-900 border-2 border-blue-400 shadow-md scale-[1.01]'
          }`}
        >
          <BookOpen className={`w-4 h-4 shrink-0 ${subject === 'science' ? 'text-emerald-600' : 'text-blue-600'}`} />
          <span className="tracking-tight whitespace-nowrap">교과서 문제 풀이</span>
        </button>
      </div>

      {/* ========================================================== */}
      {/* TAB 1: 교과서 문제 & 풀이 보기 */}
      {/* ========================================================== */}
      {activeTab === 'problems' && (
        <div className="space-y-4">
          {/* Grade & Textbook Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-3xl shadow-md flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-black tracking-wide uppercase">
                  {subject === 'math' ? '미래엔 교과서' : '비상교육 교과서'}
                </span>
                <span className="text-xs text-blue-100 font-semibold">
                  고등학교 1학년
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                {subject === 'math' ? '미래엔 공통수학 2' : '비상교육 통합과학 2'}
              </h2>
              <p className="text-xs text-blue-100 font-medium">
                {subject === 'math'
                  ? '도형의 방정식 · 집합과 명제 · 함수와 그래프 풀이'
                  : '물질과 규칙성 · 시스템과 상호작용 · 변화와 다양성 풀이'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center text-3xl shadow-inner shrink-0 ml-2">
              {subject === 'math' ? '📐' : '🔬'}
            </div>
          </div>

          {/* ========================================================== */}
          {/* SMART SEARCH & UNIT SELECTOR DROPDOWN */}
          {/* ========================================================== */}
          <div ref={selectorRef} className="relative z-30 space-y-2">
            <label className="text-xs font-black text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-600" />
                <span>단원 및 문제 바로가기</span>
              </span>
              <span className="text-[11px] text-blue-600 font-bold">
                단원 선택
              </span>
            </label>

            {/* The Search Bar / Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                id="btn-unit-selector-trigger"
                onClick={() => setIsUnitSelectorOpen((prev) => !prev)}
                className={`w-full py-3.5 pl-11 pr-10 bg-white rounded-2xl border-2 text-left text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center justify-between ${
                  isUnitSelectorOpen 
                    ? 'border-blue-500 ring-4 ring-blue-100 shadow-md' 
                    : activeSubUnitObj || activeChapterObj 
                      ? 'border-blue-400 bg-blue-50/40 text-blue-950' 
                      : 'border-amber-200 hover:border-blue-300 text-slate-800'
                }`}
              >
                {/* Left Search/Magnifier Icon */}
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </div>

                <div className="flex-1 pr-2 min-w-0">
                  {activeSubUnitObj && activeChapterObj ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 bg-blue-600 text-white font-black text-[10px] rounded-md shrink-0">
                        {activeChapterObj.chapterName}
                      </span>
                      <span className="font-black text-slate-900 break-keep">
                        {activeSubUnitObj.title}
                      </span>
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
                        {activeSubUnitObj.badge}
                      </span>
                    </div>
                  ) : activeChapterObj ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 bg-blue-600 text-white font-black text-[10px] rounded-md shrink-0">
                        선택됨
                      </span>
                      <span className="font-black text-slate-900 break-keep">
                        {activeChapterObj.fullName} (전체)
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 font-medium break-keep">
                      🔍 돋보기를 눌러 몇 단원(중단원 마무리/대단원 평가)을 풀지 선택하세요!
                    </span>
                  )}
                </div>

                {/* Right Arrow Indicator */}
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isUnitSelectorOpen ? 'rotate-180 text-blue-600' : ''}`} />
                </div>
              </button>
            </div>

            {/* Dropdown Selection Menu Panel */}
            <AnimatePresence>
              {isUnitSelectorOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.99 }}
                  transition={{ duration: 0.18 }}
                  className="absolute left-0 right-0 top-full mt-1.5 bg-[#FFFDF9] rounded-3xl border-2 border-blue-400 shadow-2xl overflow-hidden z-50 p-3 sm:p-4 space-y-3"
                >
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black">
                        1
                      </span>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">
                        공부할 대단원 & 중단원 마무리 / 대단원 평가를 선택하세요
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResetUnitFilter()}
                      className="text-[11px] font-bold text-slate-500 hover:text-rose-600 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-rose-50 transition-colors"
                    >
                      전체 단원 보기 (초기화)
                    </button>
                  </div>

                  {/* Chapter List with Direct Subunit Actions */}
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {curriculumChapters.map((ch) => {
                      const isChActive = activeChapterObj?.id === ch.id;
                      return (
                        <div
                          key={ch.id}
                          className={`rounded-2xl border-2 overflow-hidden transition-all ${
                            isChActive
                              ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                              : 'border-amber-200 bg-white hover:border-amber-300'
                          }`}
                        >
                          {/* Chapter Header row */}
                          <div className="p-3 bg-gradient-to-r from-amber-50/80 to-white flex items-center justify-between border-b border-amber-100">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center shadow-2xs">
                                {ch.chapterNumber}
                              </span>
                              <div>
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider block">
                                  {ch.chapterNumber}단원
                                </span>
                                <h5 className="text-xs sm:text-sm font-black text-slate-900">
                                  {ch.chapterName}
                                </h5>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectWholeChapter(ch)}
                              className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-blue-100 hover:bg-blue-600 text-blue-700 hover:text-white transition-all shadow-2xs"
                            >
                              {ch.chapterNumber}단원 전체 보기
                            </button>
                          </div>

                          {/* Subunits & Grand Assessment buttons */}
                          <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* 중단원 마무리 문제들 */}
                            {ch.subUnits.map((su) => {
                              const isSubActive = activeSubUnitObj?.id === su.id;
                              const count = getSubUnitCount(ch, su);
                              return (
                                <div
                                  key={su.id}
                                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all group ${
                                    isSubActive
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-md font-bold'
                                      : 'bg-white hover:bg-blue-50 text-slate-800 border-amber-100 hover:border-blue-300'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleSelectSubUnit(ch, su)}
                                    className="flex items-center gap-2 min-w-0 flex-1 text-left"
                                  >
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${isSubActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'}`}>
                                      중단원
                                    </span>
                                    <span className="text-xs font-bold break-keep">
                                      {su.title}
                                    </span>
                                  </button>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isSubActive ? 'bg-white text-blue-900' : 'bg-amber-100 text-amber-900'}`}>
                                      {count}문제
                                    </span>
                                    {userRole === 'admin' && (
                                      <button
                                        type="button"
                                        title="이 중단원에 문제 추가"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenAddProblemModal(ch.id, su.id, 'single');
                                        }}
                                        className={`p-1 rounded-md text-[10px] font-black flex items-center gap-0.5 transition-all ${
                                          isSubActive
                                            ? 'bg-white/30 hover:bg-white text-white hover:text-blue-900'
                                            : 'bg-amber-200 hover:bg-amber-400 text-amber-950'
                                        }`}
                                      >
                                        <PlusCircle className="w-3 h-3" />
                                        <span>추가</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* 대단원 평가 문제 (전체) */}
                            {(() => {
                              const grandCount = getSubUnitCount(ch, ch.grandAssessment);
                              const isGrandActive = activeSubUnitObj?.id === ch.grandAssessment.id;
                              return (
                                <div
                                  className={`sm:col-span-2 p-2.5 rounded-xl border-2 flex items-center justify-between gap-2 transition-all ${
                                    isGrandActive
                                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-md font-bold'
                                      : 'bg-amber-50/80 hover:bg-amber-100/80 text-amber-950 border-amber-300 hover:border-amber-400'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleSelectSubUnit(ch, ch.grandAssessment)}
                                    className="flex items-center gap-2 flex-1 text-left"
                                  >
                                    <span className="text-base">🏆</span>
                                    <div>
                                      <span className="text-xs font-black block">
                                        {ch.grandAssessment.title}
                                      </span>
                                      <span className={`text-[10px] font-medium ${isGrandActive ? 'text-amber-100' : 'text-amber-700'}`}>
                                        {ch.chapterNumber}단원 전체 범위 실전 대단원 평가 ({grandCount}문제 수록)
                                      </span>
                                    </div>
                                  </button>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full shadow-2xs ${
                                      isGrandActive
                                        ? 'bg-white text-amber-800'
                                        : 'bg-amber-500 text-white'
                                    }`}>
                                      {grandCount}문제 풀기 →
                                    </span>
                                    {userRole === 'admin' && (
                                      <button
                                        type="button"
                                        title="대단원 평가 문제 추가"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenAddProblemModal(ch.id, ch.grandAssessment.id, 'single');
                                        }}
                                        className={`p-1 px-2 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all ${
                                          isGrandActive
                                            ? 'bg-white/30 hover:bg-white text-white hover:text-amber-900'
                                            : 'bg-orange-600 hover:bg-orange-700 text-white'
                                        }`}
                                      >
                                        <PlusCircle className="w-3 h-3" />
                                        <span>추가</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-xs text-slate-500">
                    <span>💡 원하시는 단원이나 평가를 누르면 즉시 해당 단원의 모든 문제와 풀이가 열립니다.</span>
                    <button
                      type="button"
                      onClick={() => setIsUnitSelectorOpen(false)}
                      className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold"
                    >
                      닫기
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active Selection Breadcrumb & Quick Filter Pills */}
          <div className="flex items-center justify-between flex-wrap gap-2 bg-white p-2.5 rounded-2xl border border-amber-200 shadow-2xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-black text-slate-500">현재 단원:</span>
              {activeChapterObj ? (
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-900 text-xs font-black flex items-center gap-1">
                  <span>{activeChapterObj.fullName}</span>
                  {activeSubUnitObj && <span>&gt; {activeSubUnitObj.title}</span>}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                  전체 단원
                </span>
              )}

              {selectedCategoryFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-xs font-black">
                  [{selectedCategoryFilter}]
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(activeChapterObj || selectedCategoryFilter !== 'all') && (
                <button
                  type="button"
                  onClick={handleResetUnitFilter}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-700 flex items-center gap-0.5 px-2 py-0.5 rounded-md hover:bg-slate-100"
                >
                  <X className="w-3 h-3" />
                  <span>필터 초기화</span>
                </button>
              )}

              {userRole === 'admin' && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenAddProblemModal(activeChapterObj?.id, activeSubUnitObj?.id, 'single')}
                    className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>+ 문제 추가 (연속)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAddProblemModal(activeChapterObj?.id, activeSubUnitObj?.id, 'batch')}
                    className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
                  >
                    <Layers className="w-3 h-3" />
                    <span>⚡ 일괄 등록</span>
                  </button>
                </div>
              )}

              <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                {filteredProblems.length}문제 수록
              </span>
            </div>
          </div>

          {/* Problem Cards List */}
          <div className="space-y-3">
            {filteredProblems.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-3xl border-2 border-dashed border-amber-200 space-y-3">
                <span className="text-3xl block">📖</span>
                <p className="text-sm font-bold text-slate-800">
                  선택하신 단원에 등록된 문제가 없습니다.
                </p>
                {userRole === 'admin' ? (
                  <div className="space-y-2.5 max-w-md mx-auto">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      선생님 권한으로 {activeSubUnitObj?.title || activeChapterObj?.fullName || '선택 단원'}에 새 문제를 등록할 수 있습니다.
                    </p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenAddProblemModal(activeChapterObj?.id, activeSubUnitObj?.id, 'single')}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>개별 문제 등록</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAddProblemModal(activeChapterObj?.id, activeSubUnitObj?.id, 'batch')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <Layers className="w-4 h-4" />
                        <span>일괄 등록</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    상단 단원 선택 버튼을 눌러 다른 단원의 문제를 확인해보세요.
                  </p>
                )}
              </div>
            ) : (
              filteredProblems.map((prob) => {
                const isBookmarked = bookmarkedProblemIds.includes(prob.id);
                return (
                  <div
                    key={prob.id}
                    onClick={() => onSelectProblem(prob)}
                    className="p-4 bg-white rounded-2xl border-2 border-amber-200/90 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all space-y-2.5 group"
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          p.{prob.pageNumber}
                        </span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                          prob.problemNumber.includes('대단원')
                            ? 'bg-amber-500 text-white'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {prob.problemNumber}
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          [{prob.problemType}]
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {userRole === 'admin' && (
                          <div className="flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 text-[10px] font-black border border-amber-400 hidden sm:flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3 text-amber-600" />
                              <span>선생님 검수</span>
                            </span>
                            {onUpdateProblem && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditProblemModal(prob);
                                }}
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-1 border border-blue-200"
                                title="관리자 권한으로 문제 수정"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold">수정</span>
                              </button>
                            )}
                            {onDeleteProblem && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteProblemTarget({
                                    id: prob.id,
                                    title: `${prob.unitName} (p.${prob.pageNumber} ${prob.problemNumber})`,
                                    pageNumber: prob.pageNumber,
                                    problemNumber: prob.problemNumber,
                                    text: prob.problemText,
                                  });
                                }}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors flex items-center gap-1 border border-rose-200"
                                title="관리자 권한으로 문제 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold">삭제</span>
                              </button>
                            )}
                          </div>
                        )}
                        <span className="text-[11px] font-bold text-slate-400">
                          난이도: <span className="text-amber-600 font-black">{prob.difficulty}</span>
                        </span>
                        {isBookmarked && (
                          <span className="text-xs text-amber-500">⭐️</span>
                        )}
                      </div>
                    </div>

                    {/* Unit Name */}
                    <h3 className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <span className="text-blue-600 font-black">{prob.chapter}</span>
                      <span>·</span>
                      <span>{prob.unitName}</span>
                    </h3>

                    {/* Problem photo / video badges & text snippet */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {prob.problemImage && (
                        <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black border border-blue-200 flex items-center gap-1">
                          <Camera className="w-3 h-3 text-blue-600" />
                          <span>문제 사진</span>
                        </span>
                      )}
                      {prob.solutionImage && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-emerald-600" />
                          <span>풀이 사진</span>
                        </span>
                      )}
                      {prob.videoUrl && (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-black border border-rose-200 flex items-center gap-1">
                          <PlayCircle className="w-3 h-3 text-rose-600" />
                          <span>인강 해설</span>
                        </span>
                      )}
                    </div>

                    {prob.problemText ? (
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                        {prob.problemText}
                      </p>
                    ) : (
                      <p className="text-xs font-bold text-slate-500">
                        교과서 {prob.pageNumber}쪽 {prob.problemNumber} 풀이 및 정답 보기
                      </p>
                    )}

                    {/* Bottom row */}
                    <div className="pt-1 flex items-center justify-between border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2 text-slate-500 font-medium">
                        <span className="text-emerald-600 font-bold">✓ 정답(답칸) &amp; 해설 확인</span>
                      </div>

                      <span className="font-black text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                        풀이 보기 <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}









      {/* Fullscreen View: Add New Problem & Solution (Admin only - Single/Continuous & Batch Multi-Problem) */}
      <AnimatePresence>
        {showAddProblemModal && (
          <motion.div
            id="admin-add-problem-fullscreen-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-[#FBF9F5] flex flex-col w-full h-full overflow-hidden"
          >
            {/* Modal Top Header */}
            <div className="px-4 sm:px-8 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 text-white flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProblemModal(false);
                    setEditingProblem(null);
                  }}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs"
                  title="돌아가기"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  <span className="hidden sm:inline">돌아가기</span>
                </button>

                <div className="h-6 w-[1px] bg-white/30 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <span className="text-xl">{editingProblem ? '✏️' : '✍️'}</span>
                  <div>
                    <h2 className="text-sm sm:text-base font-black">
                      {editingProblem ? '교과서 문제 & 풀이 수정 (관리자 전용)' : '교과서 문제 & 단계별 풀이 등록'}
                    </h2>
                    <p className="text-[11px] text-amber-100 font-medium hidden sm:block">
                      {subject === 'math' ? '미래엔 공통수학 2' : '비상교육 통합과학 2'} 단원별 문제 {editingProblem ? '수정' : '등록'} 시스템
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddProblemModal(false);
                  setEditingProblem(null);
                }}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs (Hidden during Edit Mode) */}
            {!editingProblem && (
              <div className="px-4 sm:px-8 py-2.5 bg-amber-100/70 border-b border-amber-200 flex items-center gap-2 shrink-0">
                <div className="max-w-4xl mx-auto w-full flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAddProblemModalMode('single')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all ${
                      addProblemModalMode === 'single'
                        ? 'bg-white text-blue-900 border-2 border-blue-400 shadow-sm'
                        : 'text-slate-600 hover:bg-white/50 border-2 border-transparent'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>단일 / 연속 문제 등록</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddProblemModalMode('batch')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all ${
                      addProblemModalMode === 'batch'
                        ? 'bg-white text-blue-900 border-2 border-blue-400 shadow-sm'
                        : 'text-slate-600 hover:bg-white/50 border-2 border-transparent'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>⚡ 여러 문제 한 번에 일괄 등록 (Multi-Add)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto w-full p-4 sm:p-6 sm:px-8">
              <div className="max-w-4xl mx-auto space-y-4 pb-16">
                {/* Target Chapter & SubUnit Selectors Bar (Common for both modes) */}
                <div className="p-4 sm:p-5 bg-white rounded-3xl border-2 border-amber-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">
                      1. {editingProblem ? '수정할 대단원 선택' : '등록할 대단원 선택'}
                    </label>
                    <select
                      value={modalChapterId}
                      onChange={(e) => {
                        const chId = e.target.value;
                        setModalChapterId(chId);
                        const targetCh = curriculumChapters.find((c) => c.id === chId) || curriculumChapters[0];
                        const firstSub = targetCh.subUnits[0] || targetCh.grandAssessment;
                        setModalSubUnitId(firstSub.id);
                        if (!editingProblem) {
                          const count = getSubUnitCount(targetCh, firstSub);
                          const nextNum = count + 1;
                          setNewProbNum(nextNum < 10 ? `0${nextNum}번` : `${nextNum}번`);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-amber-200 text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      {curriculumChapters.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {ch.chapterNumber}단원: {ch.chapterName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">
                      2. {editingProblem ? '수정할 중단원 / 대단원 평가 선택' : '등록할 중단원 / 대단원 평가 선택'}
                    </label>
                    {(() => {
                      const targetCh = curriculumChapters.find((c) => c.id === modalChapterId) || curriculumChapters[0];
                      return (
                        <select
                          value={modalSubUnitId}
                          onChange={(e) => {
                            const suId = e.target.value;
                            setModalSubUnitId(suId);
                            const targetSub =
                              targetCh.grandAssessment.id === suId
                                ? targetCh.grandAssessment
                                : targetCh.subUnits.find((s) => s.id === suId) || targetCh.subUnits[0];
                            if (!editingProblem) {
                              const count = getSubUnitCount(targetCh, targetSub);
                              const nextNum = count + 1;
                              setNewProbNum(nextNum < 10 ? `0${nextNum}번` : `${nextNum}번`);
                              if (targetSub.category === '대단원 평가') {
                                setNewProbType('대단원 평가');
                              } else {
                                setNewProbType('중단원 마무리');
                              }
                            }
                          }}
                          className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-amber-200 text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        >
                          {targetCh.subUnits.map((su) => {
                            const cnt = getSubUnitCount(targetCh, su);
                            return (
                              <option key={su.id} value={su.id}>
                                [중단원] {su.title} (현재 {cnt}문제 수록)
                              </option>
                            );
                          })}
                          <option value={targetCh.grandAssessment.id}>
                            [대단원] {targetCh.grandAssessment.title} (현재 {getSubUnitCount(targetCh, targetCh.grandAssessment)}문제 수록)
                          </option>
                        </select>
                      );
                    })()}
                  </div>
                </div>

                {/* Mode 1: Single / Continuous Problem Form */}
                {addProblemModalMode === 'single' && (
                  <form onSubmit={handleCreateProblemSingle} className="bg-white p-5 sm:p-7 rounded-3xl border-2 border-amber-200 shadow-sm space-y-4">
                    {/* Toast notification banner */}
                    {successToastMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3.5 bg-emerald-500 text-white rounded-2xl text-xs font-black shadow-md flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-100" />
                          <span>{successToastMessage}</span>
                        </div>
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                          총 {recentlyAddedCount}개 등록 완료
                        </span>
                      </motion.div>
                    )}

                  {/* Problem Type & Difficulty & Page & Problem Number */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">문제 분류</label>
                      <select
                        value={newProbType}
                        onChange={(e) => setNewProbType(e.target.value as any)}
                        className="w-full px-2.5 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
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
                        value={newProbDifficulty}
                        onChange={(e) => setNewProbDifficulty(e.target.value as any)}
                        className="w-full px-2.5 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
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
                        placeholder="예: 42"
                        value={newPageNum}
                        onChange={(e) => setNewPageNum(e.target.value)}
                        required
                        className="w-full px-2.5 py-2 bg-white rounded-xl border border-amber-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">문제 번호</label>
                      <input
                        type="text"
                        placeholder="예: 01번"
                        value={newProbNum}
                        onChange={(e) => setNewProbNum(e.target.value)}
                        required
                        className="w-full px-2.5 py-2 bg-white rounded-xl border border-amber-200 text-xs font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  {/* 1. 교과서 문제 사진 첨부 (텍스트 대신 사진) */}
                  <div className="p-4 bg-blue-50/70 rounded-2xl border-2 border-blue-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-blue-600" />
                        <span>📸 교과서 문제 사진 첨부</span>
                      </label>
                      <span className="text-[10px] text-blue-700 font-bold">텍스트 대신 사진으로 등록</span>
                    </div>

                    {newProblemImage ? (
                      <div className="relative rounded-2xl border-2 border-blue-300 bg-slate-900 p-2 overflow-hidden flex flex-col items-center">
                        <img
                          src={newProblemImage}
                          alt="교과서 문제 사진 미리보기"
                          className="max-h-48 rounded-xl object-contain w-full"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => setZoomImage(newProblemImage)}
                            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <Maximize2 className="w-3 h-3" /> 크게 보기
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewProblemImage(null)}
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
                          onClick={() => problemCameraInputRef.current?.click()}
                          className="py-2.5 px-3 bg-white hover:bg-blue-100 border border-blue-300 rounded-xl text-xs font-bold text-blue-900 flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs"
                        >
                          <Camera className="w-4 h-4 text-blue-600" />
                          <span>문제 바로 촬영</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => problemFileInputRef.current?.click()}
                          className="py-2.5 px-3 bg-white hover:bg-blue-100 border border-blue-300 rounded-xl text-xs font-bold text-blue-900 flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs"
                        >
                          <Upload className="w-4 h-4 text-blue-600" />
                          <span>문제 사진 파일 찾기</span>
                        </button>
                      </div>
                    )}

                    <input
                      ref={problemFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProblemImageFileRead(file);
                      }}
                      className="hidden"
                    />
                    <input
                      ref={problemCameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProblemImageFileRead(file);
                      }}
                      className="hidden"
                    />
                  </div>

                  {/* 2. 해설 풀이 사진 첨부 (1·2단계 풀이 대신 사진) */}
                  <div className="p-4 bg-emerald-50/70 rounded-2xl border-2 border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-emerald-600" />
                        <span>📝 해설 풀이 / 판서 사진 첨부</span>
                      </label>
                      <span className="text-[10px] text-emerald-700 font-bold">1·2단계 풀이 대신 사진으로 등록</span>
                    </div>

                    {newSolutionImage ? (
                      <div className="relative rounded-2xl border-2 border-emerald-300 bg-slate-900 p-2 overflow-hidden flex flex-col items-center">
                        <img
                          src={newSolutionImage}
                          alt="풀이 첨부 사진"
                          className="max-h-48 rounded-xl object-contain w-full"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => setZoomImage(newSolutionImage)}
                            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <Maximize2 className="w-3 h-3" /> 크게 보기
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewSolutionImage(null)}
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
                          onClick={() => solutionCameraInputRef.current?.click()}
                          className="py-2.5 px-3 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs"
                        >
                          <Camera className="w-4 h-4 text-emerald-600" />
                          <span>풀이 바로 촬영</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => solutionFileInputRef.current?.click()}
                          className="py-2.5 px-3 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs"
                        >
                          <Upload className="w-4 h-4 text-emerald-600" />
                          <span>풀이 사진 파일 찾기</span>
                        </button>
                      </div>
                    )}

                    <input
                      ref={solutionFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSolutionImageFileRead(file);
                      }}
                      className="hidden"
                    />
                    <input
                      ref={solutionCameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSolutionImageFileRead(file);
                      }}
                      className="hidden"
                    />
                  </div>

                  {/* 3. 인강 / 동영상 강의 링크 칸 */}
                  <div className="p-4 bg-amber-50/70 rounded-2xl border-2 border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                        <PlayCircle className="w-4 h-4 text-rose-500" />
                        <span>🎬 인강 / 해설 동영상 강의 링크 (선택)</span>
                      </label>
                      <span className="text-[10px] text-amber-800 font-bold">YouTube 링크 등</span>
                    </div>
                    <input
                      type="text"
                      placeholder="예: 유튜브 해설 영상 링크 (https://youtu.be/... 또는 동영상 URL)"
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-amber-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    {newVideoUrl.trim() && (
                      <div className="pt-1">
                        <VideoLectureEmbed
                          videoUrl={newVideoUrl}
                          title="인강 해설 동영상 미리보기"
                        />
                      </div>
                    )}
                  </div>

                  {/* 4. 최종 정답 (답칸) - 필수 입력 */}
                  <div className="p-4 bg-white rounded-2xl border-2 border-blue-300 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-blue-950 flex items-center gap-1">
                        <span>최종 정답 (답칸)</span>
                        <span className="text-[10px] text-amber-700 font-black">* 필수 입력</span>
                      </label>
                      <span className="text-[10px] text-slate-500">학생 화면의 정답 칸에 표시됩니다</span>
                    </div>
                    <input
                      type="text"
                      placeholder="예: k = 4, x + 2y - 5 = 0, 30°"
                      value={newFinalAns}
                      onChange={(e) => setNewFinalAns(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-blue-50/50 rounded-xl border-2 border-blue-400 text-xs sm:text-sm font-black text-blue-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Continuous Add Toggle Option (Create mode only) */}
                  {!editingProblem && (
                    <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={continuousAdd}
                          onChange={(e) => setContinuousAdd(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-xs font-black text-blue-950 block">
                            연속 등록 모드 활성화 (추천)
                          </span>
                          <span className="text-[10px] text-blue-700 font-medium">
                            등록 후 창이 닫히지 않고 다음 문제 번호로 자동 세팅되어 연속으로 입력할 수 있습니다.
                          </span>
                        </div>
                      </label>
                      {recentlyAddedCount > 0 && (
                        <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg shrink-0">
                          {recentlyAddedCount}개 등록됨
                        </span>
                      )}
                    </div>
                  )}

                  {/* Bottom Action Buttons */}
                  <div className="pt-2 border-t border-amber-200 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddProblemModal(false);
                        setEditingProblem(null);
                      }}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                    >
                      {!editingProblem && recentlyAddedCount > 0 ? '등록 완료 후 닫기' : '취소'}
                    </button>
                    <button
                      type="submit"
                      className={`px-5 py-2.5 text-white rounded-xl text-xs font-black shadow-md active:scale-95 flex items-center gap-1.5 ${
                        editingProblem
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                      }`}
                    >
                      {editingProblem ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>수정 내용 저장</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-4 h-4" />
                          <span>{continuousAdd ? '✨ 문제 등록 및 다음 문제 작성' : '등록 완료'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Mode 2: Batch Multi-Problem Multi-Add Form */}
              {addProblemModalMode === 'batch' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Batch Guidance Header */}
                  <div className="p-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📚</span>
                      <div>
                        <span className="text-xs font-black text-blue-950 block">
                          한 단원에 여러 문제를 카드별로 작성하여 한 번에 등록합니다.
                        </span>
                        <span className="text-[10px] text-blue-700">
                          아래 카드에 문제와 정답을 채우고 [일괄 등록] 버튼을 누르면 단원에 모든 문제가 즉시 반영됩니다.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddBatchDraftRow}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm flex items-center gap-1 shrink-0 active:scale-95 transition-all"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ 문제 카드 추가</span>
                    </button>
                  </div>

                  {/* Problem Cards List */}
                  <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4">
                    {batchDrafts.map((draft, idx) => (
                      <div
                        key={draft.tempId}
                        className="p-3.5 sm:p-4 bg-white rounded-2xl border-2 border-amber-300 shadow-sm space-y-3 relative group"
                      >
                        {/* Card Header Row */}
                        <div className="flex items-center justify-between pb-2 border-b border-amber-100 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-black text-slate-800">
                              문제 카드 #{idx + 1}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-bold text-slate-500">페이지:</span>
                              <input
                                type="number"
                                placeholder="쪽수"
                                value={draft.pageNumber}
                                onChange={(e) => handleUpdateBatchDraftField(draft.tempId, 'pageNumber', e.target.value)}
                                className="w-16 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200 text-xs font-bold"
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-bold text-slate-500">문제번호:</span>
                              <input
                                type="text"
                                placeholder="01번"
                                value={draft.problemNumber}
                                onChange={(e) => handleUpdateBatchDraftField(draft.tempId, 'problemNumber', e.target.value)}
                                className="w-20 px-2 py-1 bg-blue-50 rounded-lg border border-blue-200 text-xs font-black text-blue-800"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveBatchDraftRow(draft.tempId)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                              title="이 문제 카드 삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Difficulty & Problem Type */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">난이도</label>
                            <select
                              value={draft.difficulty}
                              onChange={(e) => handleUpdateBatchDraftField(draft.tempId, 'difficulty', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-50 rounded-lg border border-slate-200 text-xs font-bold"
                            >
                              <option value="쉬움">🟢 쉬움</option>
                              <option value="보통">🟡 보통</option>
                              <option value="도전">🟠 도전</option>
                              <option value="심화">🔴 심화</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">분류</label>
                            <select
                              value={draft.problemType}
                              onChange={(e) => handleUpdateBatchDraftField(draft.tempId, 'problemType', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-50 rounded-lg border border-slate-200 text-xs font-bold"
                            >
                              <option value="중단원 마무리">중단원 마무리</option>
                              <option value="대단원 평가">대단원 평가</option>
                              <option value="발전/심화 문제">발전/심화 문제</option>
                              <option value="개념 예제">개념 예제</option>
                              <option value="확인 문제">확인 문제</option>
                            </select>
                          </div>
                        </div>

                        {/* 1. 문제 사진 & 풀이 사진 첨부 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {/* Problem Photo */}
                          <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between">
                            <span className="text-[10px] font-black text-blue-900 flex items-center gap-1">
                              <Camera className="w-3.5 h-3.5 text-blue-600" />
                              문제 사진
                            </span>
                            {draft.problemImage ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-blue-700">✓ 등록됨</span>
                                <button
                                  type="button"
                                  onClick={() => setZoomImage(draft.problemImage || null)}
                                  className="text-[10px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded shadow-2xs"
                                >
                                  보기
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBatchDraftField(draft.tempId, 'problemImage', null)}
                                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700"
                                >
                                  삭제
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveBatchDraftIdForImage(draft.tempId);
                                  setActiveBatchTargetType('problem');
                                  batchImageInputRef.current?.click();
                                }}
                                className="text-[10px] font-bold text-blue-700 bg-white hover:bg-blue-100 border border-blue-300 px-2.5 py-1 rounded-lg flex items-center gap-1"
                              >
                                <Upload className="w-3 h-3" /> 사진 올리기
                              </button>
                            )}
                          </div>

                          {/* Solution Photo */}
                          <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between">
                            <span className="text-[10px] font-black text-emerald-900 flex items-center gap-1">
                              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                              풀이 사진
                            </span>
                            {draft.solutionImage ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-emerald-700">✓ 등록됨</span>
                                <button
                                  type="button"
                                  onClick={() => setZoomImage(draft.solutionImage || null)}
                                  className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded shadow-2xs"
                                >
                                  보기
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBatchDraftField(draft.tempId, 'solutionImage', null)}
                                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700"
                                >
                                  삭제
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveBatchDraftIdForImage(draft.tempId);
                                  setActiveBatchTargetType('solution');
                                  batchImageInputRef.current?.click();
                                }}
                                className="text-[10px] font-bold text-emerald-700 bg-white hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1"
                              >
                                <Upload className="w-3 h-3" /> 사진 올리기
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 2. 인강 동영상 링크 (선택) */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5 flex items-center gap-1">
                            <PlayCircle className="w-3 h-3 text-rose-500" />
                            <span>인강 / 해설 동영상 링크 (선택)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="예: https://youtu.be/... (유튜브 인강 링크)"
                            value={draft.videoUrl || ''}
                            onChange={(e) => handleUpdateBatchDraftField(draft.tempId, 'videoUrl', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>

                        {/* 3. 최종 정답 (답칸) - 필수 */}
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="text-[10px] font-black text-blue-900">
                              최종 정답 (답칸) <span className="text-amber-600">*필수</span>
                            </label>
                            <span className="text-[9px] text-slate-400">정답 칸에 표시</span>
                          </div>
                          <input
                            type="text"
                            placeholder="예: k = 4, 30°"
                            value={draft.finalAnswer}
                            onChange={(e) => handleUpdateBatchDraftField(draft.tempId, 'finalAnswer', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-blue-50/50 rounded-xl border-2 border-blue-300 text-xs font-black text-blue-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ))}

                    <input
                      ref={batchImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleBatchImageFileRead(file);
                      }}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={handleAddBatchDraftRow}
                      className="w-full py-3 bg-amber-50 hover:bg-amber-100 border-2 border-dashed border-amber-300 rounded-2xl text-xs font-black text-amber-900 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <PlusCircle className="w-4 h-4 text-amber-600" />
                      <span>+ 새 문제 카드 추가하기</span>
                    </button>
                  </div>

                  {/* Batch Modal Footer */}
                  <div className="p-3 sm:p-4 bg-slate-50 border-t border-amber-200 flex items-center justify-between gap-2 shrink-0">
                    <div className="text-xs font-black text-slate-700">
                      작성 중인 문제: <span className="text-blue-600">{batchDrafts.length}개</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddProblemModal(false)}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateProblemBatch}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md active:scale-95 flex items-center gap-1.5"
                      >
                        <Layers className="w-4 h-4" />
                        <span>🚀 총 {batchDrafts.length}개 문제 일괄 등록 완료</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-90 px-4 py-2.5 bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold rounded-2xl shadow-xl border border-white/20 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prominent Modal: Delete Textbook Problem Confirmation */}
      <AnimatePresence>
        {deleteProblemTarget && (
          <div
            className="fixed inset-0 z-80 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeleteProblemTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-rose-200 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-rose-600 text-white p-5 sm:p-6 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                    <Trash2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">선생님 권한 — 교과서 문제 영구 삭제</h3>
                    <p className="text-xs text-rose-100 font-medium">p.{deleteProblemTarget.pageNumber} {deleteProblemTarget.problemNumber}번 문제를 삭제합니다</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteProblemTarget(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 flex items-start gap-3">
                  <span className="text-2xl shrink-0">⚠️</span>
                  <div className="text-xs sm:text-sm text-rose-900 leading-relaxed font-bold">
                    <p className="font-black text-rose-950">정말로 이 교과서 문제를 삭제하시겠습니까?</p>
                    <p className="text-rose-600 font-semibold mt-1">
                      삭제된 문제는 교과서 마스터 목록에서 완전히 제거되며 복구할 수 없습니다.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-xs font-bold">
                      {deleteProblemTarget.title}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">문제 내용</span>
                  </label>
                  {deleteProblemTarget.text && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 font-medium max-h-36 overflow-y-auto leading-relaxed whitespace-pre-wrap shadow-inner">
                      {deleteProblemTarget.text}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteProblemTarget(null)}
                    className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-black transition-all active:scale-98"
                  >
                    취소하기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteProblem && deleteProblemTarget) {
                        onDeleteProblem(deleteProblemTarget.id);
                        setToastNotice(`p.${deleteProblemTarget.pageNumber} ${deleteProblemTarget.problemNumber}번 문제가 완전히 삭제되었습니다.`);
                        setTimeout(() => setToastNotice(null), 3000);
                        setDeleteProblemTarget(null);
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

      {/* Floating Bottom-Right Quick Home Action Button */}
      <button
        type="button"
        onClick={onGoBack}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-white/95 backdrop-blur-md border-2 border-amber-400 text-slate-800 hover:bg-amber-50 shadow-xl text-xs sm:text-sm font-black transition-all hover:scale-105 active:scale-95 cursor-pointer touch-manipulation select-none"
        title="홈 화면으로 바로가기"
      >
        <Home className="w-4 h-4 text-amber-600" />
        <span>홈으로</span>
      </button>
    </div>
  );
};
export default TextbookMasterView;