import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, BookOpen, ChevronRight, Filter, Sparkles, PlusCircle, 
  CheckCircle, CheckCircle2, Bookmark, ArrowLeft, Trash2, ShieldCheck, Award, 
  FileQuestion, Camera, Upload, Image as ImageIcon, Maximize2, X, 
  Lightbulb, Layers, ChevronDown, Check, PlayCircle, BookMarked, Compass,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SubjectType, GradeType, TextbookInfo, ProblemItem, SolutionStep, UserRole, InterestingFactItem, QuizAttemptRecord, ConceptItem } from '../types';
import { getStoredUnitQuizzes, saveStoredUnitQuizzes, saveStoredUnitQuizzesLocal, UnitQuiz, QuizQuestion } from '../data/mockUnitTests';
import { getCurriculumForSubject, ChapterGroup, SubUnitItem } from '../data/curriculumData';
import { UnitTestModal } from './UnitTestModal';
import { dbSaveTestQuestion, dbFetchTestQuestions, dbDeleteTestQuestion } from '../services/dbService';
import { isSupabaseConfigured } from '../supabaseClient';
import { InterestingFactsGallery } from './InterestingFactsGallery';
import { ConceptMasterView } from './ConceptMasterView';
import { compressImageFile } from '../services/imageService';
import { safeLocalStorageGet, safeLocalStorageSet } from '../services/storageService';

const CIRCLED_NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

export interface BatchProblemDraft {
  tempId: string;
  problemNumber: string;
  pageNumber: string;
  difficulty: '쉬움' | '보통' | '도전' | '심화';
  problemType: '중단원 마무리' | '대단원 평가' | '개념 예제' | '확인 문제' | '발전/심화 문제';
  problemText: string;
  step1: string;
  step2: string;
  finalAnswer: string;
  dreamTip: string;
  solutionImage?: string | null;
}

interface TextbookMasterViewProps {
  subject: SubjectType;
  textbooks: TextbookInfo[];
  problems: ProblemItem[];
  bookmarkedProblemIds: string[];
  userRole?: UserRole;
  currentUserId?: string;
  facts?: InterestingFactItem[];
  concepts?: ConceptItem[];
  initialTab?: 'problems' | 'concepts' | 'facts' | 'unit_tests';
  onSelectProblem: (problem: ProblemItem) => void;
  onGoBack: () => void;
  onAddNewProblem: (newProblem: ProblemItem) => void;
  onAddNewProblems?: (newProblems: ProblemItem[]) => void;
  onDeleteProblem?: (problemId: string) => void;
  onAddNewFact?: (fact: InterestingFactItem) => void;
  onDeleteFact?: (factId: string) => void;
  onToggleLikeFact?: (factId: string) => void;
  onAddNewConcept?: (concept: ConceptItem) => void;
  onDeleteConcept?: (conceptId: string) => void;
  onToggleLikeConcept?: (conceptId: string) => void;
  onCompleteQuiz?: (attempt: QuizAttemptRecord) => void;
}

export const TextbookMasterView: React.FC<TextbookMasterViewProps> = ({
  subject,
  textbooks,
  problems,
  bookmarkedProblemIds,
  userRole = 'student',
  currentUserId,
  facts = [],
  concepts = [],
  initialTab,
  onSelectProblem,
  onGoBack,
  onAddNewProblem,
  onAddNewProblems,
  onDeleteProblem,
  onAddNewFact,
  onDeleteFact,
  onToggleLikeFact,
  onAddNewConcept,
  onDeleteConcept,
  onToggleLikeConcept,
  onCompleteQuiz,
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

  // Active Tab: Problems vs Concepts vs Interesting Facts vs Unit Tests
  const [activeTab, setActiveTab] = useState<'problems' | 'concepts' | 'facts' | 'unit_tests'>(() => {
    if (initialTab && initialTab !== 'problems') return initialTab;
    const saved = safeLocalStorageGet<'problems' | 'concepts' | 'facts' | 'unit_tests' | null>(`puleo_${subject}_active_tab`, null);
    if (saved) return saved;
    if (initialTab) return initialTab;
    return subject === 'science' ? 'concepts' : 'problems';
  });

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
    safeLocalStorageSet(`puleo_${subject}_active_tab`, activeTab);
  }, [subject, activeTab]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [selectedQuiz, setSelectedQuiz] = useState<UnitQuiz | null>(null);

  // Unit Quizzes State & Admin Persistence
  const [allQuizzes, setAllQuizzes] = useState<UnitQuiz[]>(() => getStoredUnitQuizzes());
    // Supabase 클라우드에서 TEST 문제 불러와 병합
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    dbFetchTestQuestions().then((cloudQuestions) => {
      if (!Array.isArray(cloudQuestions) || cloudQuestions.length === 0) return;
      setAllQuizzes((prevQuizzes) =>
        prevQuizzes.map((quiz) => {
          const relevant = cloudQuestions.filter(
            (q: any) => q.unit_code === quiz.unitCode && q.subject === quiz.subject
          );
          const existingIds = new Set(quiz.questions.map((q) => q.id));
          const newOnes = relevant
            .filter((q: any) => q.client_id && !existingIds.has(q.client_id))
            .map((q: any) => ({
              id: q.client_id,
              questionText: q.question_text,
              options: q.options || [],
              correctIndex: q.correct_index ?? 0,
              explanation: q.explanation || '',
              hint: q.hint || undefined,
              questionImage: q.question_image || undefined,
              explanationImage: q.explanation_image || undefined,
            }));
          if (newOnes.length === 0) return quiz;
          return {
            ...quiz,
            questions: [...quiz.questions, ...newOnes],
          };
        })
      );
    });
  }, []);
  useEffect(() => {
    if (subject === 'math' && activeTab === 'concepts') {
      setActiveTab('problems');
    }
  }, [subject, activeTab]);

  // Persist quizzes state locally
  useEffect(() => {
    saveStoredUnitQuizzesLocal(allQuizzes);
  }, [allQuizzes]);
  
  // Admin Quiz Management States
  const [showAddQuizModal, setShowAddQuizModal] = useState(false);
  const [showManageQuizModal, setShowManageQuizModal] = useState(false);
  const [targetQuizIdForAdd, setTargetQuizIdForAdd] = useState<string>('');
  const [selectedQuizForManage, setSelectedQuizForManage] = useState<UnitQuiz | null>(null);

  // Admin Quiz Duration Setting Modal States
  const [showEditQuizTimeModal, setShowEditQuizTimeModal] = useState(false);
  const [editingQuizForTime, setEditingQuizForTime] = useState<UnitQuiz | null>(null);
  const [customQuizMinutes, setCustomQuizMinutes] = useState<number>(10);

  // New Quiz Question Form Fields
  const [newQuizQuestionText, setNewQuizQuestionText] = useState('');
  const [newQuizOptions, setNewQuizOptions] = useState<string[]>(['', '', '', '', '']); // Default to 5 options (5지선다)
  const [newQuizCorrectIdx, setNewQuizCorrectIdx] = useState(0);
  const [newQuizExplanation, setNewQuizExplanation] = useState('');
  const [newQuizHint, setNewQuizHint] = useState('');
  const [newQuizQuestionImage, setNewQuizQuestionImage] = useState<string | null>(null);
  const [newQuizExplanationImage, setNewQuizExplanationImage] = useState<string | null>(null);

  const quizQuestionFileInputRef = useRef<HTMLInputElement>(null);
  const quizExplanationFileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Options Management for Quiz Creation
  const handleAddOptionField = () => {
    if (newQuizOptions.length >= 10) {
      alert('보기(선지)는 최대 10개까지 추가할 수 있습니다.');
      return;
    }
    setNewQuizOptions((prev) => [...prev, '']);
  };

  const handleRemoveOptionField = (indexToRemove: number) => {
    if (newQuizOptions.length <= 2) {
      alert('최소 2개 이상의 보기(선지)가 있어야 합니다.');
      return;
    }
    setNewQuizOptions((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (newQuizCorrectIdx === indexToRemove) {
      setNewQuizCorrectIdx(0);
    } else if (newQuizCorrectIdx > indexToRemove) {
      setNewQuizCorrectIdx((prev) => prev - 1);
    }
  };

  const handleSetOptionCountPreset = (count: number) => {
    if (count === 2) {
      setNewQuizOptions(['O (참 / 옳음)', 'X (거짓 / 틀림)']);
      setNewQuizCorrectIdx(0);
    } else {
      setNewQuizOptions((prev) => {
        const next = [...prev];
        if (next.length < count) {
          while (next.length < count) next.push('');
        } else {
          next.length = count;
        }
        return next;
      });
      if (newQuizCorrectIdx >= count) {
        setNewQuizCorrectIdx(0);
      }
    }
  };

  const handleUpdateOptionText = (index: number, text: string) => {
    setNewQuizOptions((prev) => {
      const next = [...prev];
      next[index] = text;
      return next;
    });
  };

  // Problem registration modal (Admin only) - Single & Batch Modes
  const [showAddProblemModal, setShowAddProblemModal] = useState(false);
  const [addProblemModalMode, setAddProblemModalMode] = useState<'single' | 'batch'>('single');

  // Deletion confirmation targets for large prominent modal dialogs
  const [deleteQuizQTarget, setDeleteQuizQTarget] = useState<{ quizId: string; questionId: string; num: number; text: string } | null>(null);
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
  const [newProbText, setNewProbText] = useState('');
  const [newStep1, setNewStep1] = useState('');
  const [newStep2, setNewStep2] = useState('');
  const [newFinalAns, setNewFinalAns] = useState('');
  const [newTip, setNewTip] = useState('');
  const [newSolutionImage, setNewSolutionImage] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Batch multi-problem fields
  const [batchDrafts, setBatchDrafts] = useState<BatchProblemDraft[]>([]);

  const selectorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const batchImageInputRef = useRef<HTMLInputElement>(null);
  const [activeBatchDraftIdForImage, setActiveBatchDraftIdForImage] = useState<string | null>(null);

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

  const handleImageFileRead = async (file: File) => {
    const compressed = await compressImageFile(file);
    if (compressed) {
      setNewSolutionImage(compressed);
    }
  };

  // High 1 Subject major chapter quizzes
  const subjectQuizzes = useMemo(() => {
    return allQuizzes.filter((q) => q.subject === subject);
  }, [allQuizzes, subject]);

  const handleOpenAddQuizQuestion = (quizId?: string) => {
    if (quizId) {
      setTargetQuizIdForAdd(quizId);
    } else if (subjectQuizzes.length > 0) {
      setTargetQuizIdForAdd(subjectQuizzes[0].id);
    }
    setNewQuizQuestionText('');
    setNewQuizOptions(['', '', '', '', '']); // 5 choices default
    setNewQuizCorrectIdx(0);
    setNewQuizExplanation('');
    setNewQuizHint('');
    setNewQuizQuestionImage(null);
    setNewQuizExplanationImage(null);
    setShowAddQuizModal(true);
  };

  const handleSaveQuizQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetQuizIdForAdd || !newQuizQuestionText.trim()) return;

    const validOpts = newQuizOptions.map((o) => o.trim()).filter(Boolean);

    if (validOpts.length < 2) {
      alert('최소 2개 이상의 선지(보기) 내용을 입력해주세요.');
      return;
    }

    const safeCorrectIdx = Math.min(newQuizCorrectIdx, validOpts.length - 1);

    const newQuestion: QuizQuestion = {
      id: `custom-q-${Date.now()}`,
      questionText: newQuizQuestionText.trim(),
      options: validOpts,
      correctIndex: safeCorrectIdx >= 0 ? safeCorrectIdx : 0,
      explanation: newQuizExplanation.trim() || '상세 해설이 등록되었습니다.',
      hint: newQuizHint.trim() || undefined,
      questionImage: newQuizQuestionImage || undefined,
      explanationImage: newQuizExplanationImage || undefined,
    };

    const updated = allQuizzes.map((quiz) => {
      if (quiz.id === targetQuizIdForAdd) {
        const updatedQuestions = [...quiz.questions, newQuestion];
        const updatedQuiz = {
          ...quiz,
          questions: updatedQuestions,
          estimatedMinutes: quiz.estimatedMinutes ?? 20,
        };
        if (selectedQuizForManage && selectedQuizForManage.id === quiz.id) {
          setSelectedQuizForManage(updatedQuiz);
        }
        if (selectedQuiz && selectedQuiz.id === quiz.id) {
          setSelectedQuiz(updatedQuiz);
        }
        return updatedQuiz;
      }
      return quiz;
    });

        setAllQuizzes(updated);
    saveStoredUnitQuizzes(updated);
    setShowAddQuizModal(false);

    // Supabase 클라우드 DB 저장
    if (isSupabaseConfigured) {
      const targetQuiz = allQuizzes.find((q) => q.id === targetQuizIdForAdd);
      if (targetQuiz) {
        dbSaveTestQuestion({
          clientId: String(newQuestion.id),
          subject: targetQuiz.subject,
          unitCode: targetQuiz.unitCode,
          questionText: newQuestion.questionText,
          options: newQuestion.options,
          correctIndex: newQuestion.correctIndex,
          explanation: newQuestion.explanation,
          hint: newQuestion.hint,
          questionImage: newQuestion.questionImage,
          explanationImage: newQuestion.explanationImage,
        }).then((result) => {
          if (!result.success) console.warn('TEST 문제 DB 저장 경고:', result.error);
        });
      }
    }
  };

  const handleDeleteQuizQuestion = (quizId: string, questionId: string) => {
    const updated = allQuizzes.map((quiz) => {
      if (quiz.id === quizId) {
        const updatedQuestions = quiz.questions.filter((q) => q.id !== questionId);
        const updatedQuiz = {
          ...quiz,
          questions: updatedQuestions,
          estimatedMinutes: quiz.estimatedMinutes ?? 20,
        };
        if (selectedQuizForManage && selectedQuizForManage.id === quiz.id) {
          setSelectedQuizForManage(updatedQuiz);
        }
        if (selectedQuiz && selectedQuiz.id === quiz.id) {
          setSelectedQuiz(updatedQuiz);
        }
        return updatedQuiz;
      }
      return quiz;
    });

        setAllQuizzes(updated);
    saveStoredUnitQuizzes(updated);
    setToastNotice('문항이 성공적으로 삭제되었습니다.');
    setTimeout(() => setToastNotice(null), 3000);

    // Supabase 클라우드 DB 삭제
    if (isSupabaseConfigured) {
      dbDeleteTestQuestion(questionId).then((result) => {
        if (!result.success) console.error('TEST 문제 DB 삭제 실패:', result.error);
      });
    }
  };

  const handleOpenEditQuizTime = (quiz: UnitQuiz) => {
    setEditingQuizForTime(quiz);
    setCustomQuizMinutes(quiz.estimatedMinutes ?? 20);
    setShowEditQuizTimeModal(true);
  };

  const handleSaveQuizTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuizForTime) return;
    const minutes = Math.max(0, Math.min(180, Number(customQuizMinutes)));
    const updated = allQuizzes.map((q) => {
      if (q.id === editingQuizForTime.id) {
        const updatedQuiz = { ...q, estimatedMinutes: minutes };
        if (selectedQuizForManage && selectedQuizForManage.id === q.id) {
          setSelectedQuizForManage(updatedQuiz);
        }
        return updatedQuiz;
      }
      return q;
    });
    setAllQuizzes(updated);
    saveStoredUnitQuizzes(updated);
    setShowEditQuizTimeModal(false);
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
        const matchesNum = prob.problemNumber.toLowerCase().includes(q);
        const matchesText = prob.problemText.toLowerCase().includes(q);
        const matchesUnit = prob.unitName.toLowerCase().includes(q);
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

  // Find corresponding quiz for current selection
  const matchingQuizForSelection = useMemo(() => {
    if (!activeSubUnitObj) return null;
    return subjectQuizzes.find((q) => q.unitCode === activeSubUnitObj.unitCode) || null;
  }, [activeSubUnitObj, subjectQuizzes]);

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
    setNewProbText('');
    setNewStep1('');
    setNewStep2('');
    setNewFinalAns('');
    setNewTip('');
    setNewSolutionImage(null);

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
        problemText: '',
        step1: '',
        step2: '',
        finalAnswer: '',
        dreamTip: '',
        solutionImage: null,
      },
      {
        tempId: `draft-${Date.now()}-2`,
        problemNumber: `0${nextNum + 1}번`,
        pageNumber: newPageNum || (targetSubUnit?.pageRange?.match(/\d+/)?.[0] ?? '40'),
        difficulty: '보통',
        problemType: targetSubUnit?.category === '대단원 평가' ? '대단원 평가' : '중단원 마무리',
        problemText: '',
        step1: '',
        step2: '',
        finalAnswer: '',
        dreamTip: '',
        solutionImage: null,
      },
    ];
    setBatchDrafts(initialBatch);

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
        problemText: '',
        step1: '',
        step2: '',
        finalAnswer: '',
        dreamTip: '',
        solutionImage: null,
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
    const compressed = await compressImageFile(file);
    if (compressed) {
      handleUpdateBatchDraftField(activeBatchDraftIdForImage, 'solutionImage', compressed);
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

    if (!newProbText.trim() || !newFinalAns.trim()) {
      alert('문제 내용과 최종 정답을 모두 입력해주세요.');
      return;
    }

    const steps: SolutionStep[] = [];
    if (newStep1.trim()) {
      steps.push({
        stepNumber: 1,
        title: '핵심 개념 및 공식 적용',
        explanation: newStep1.trim(),
      });
    }
    if (newStep2.trim()) {
      steps.push({
        stepNumber: steps.length + 1,
        title: '풀이 전개 및 정리',
        explanation: newStep2.trim(),
      });
    }
    if (steps.length === 0) {
      steps.push({
        stepNumber: 1,
        title: '단계별 해설',
        explanation: '교과서 공식과 정의를 활용하여 차례대로 계산합니다.',
      });
    }

    const probNumStr = newProbNum.trim() || '문제 1번';

    const created: ProblemItem = {
      id: `prob-custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      textbookId: activeTextbook?.id || (subject === 'math' ? 'tb-math-mr-h2' : 'tb-sci-bs-h1'),
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
      problemText: newProbText.trim(),
      solutionSteps: steps,
      finalAnswer: newFinalAns.trim(),
      coreConcepts: [targetSubUnit.title, newProbType],
      dreamTip: newTip.trim() || '💡 핵심 개념과 공식을 꼼꼼히 확인하고 부호 실수를 조심하세요!',
      solutionImage: newSolutionImage || undefined,
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
        const formatted = nextInt < 10 ? `0${nextInt}` : `${nextInt}`;
        setNewProbNum(probNumStr.replace(numMatch[0], formatted));
      } else {
        setNewProbNum(`${probNumStr} (다음)`);
      }

      // Clear question body and answer for next problem, while keeping unit & page intact
      setNewProbText('');
      setNewStep1('');
      setNewStep2('');
      setNewFinalAns('');
      setNewTip('');
      setNewSolutionImage(null);
    } else {
      setShowAddProblemModal(false);
      alert(`새 교과서 문제 [${probNumStr}]가 성공적으로 등록되었습니다! 🎉`);
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

    // Filter valid drafts
    const validDrafts = batchDrafts.filter((d) => d.problemText.trim() && d.finalAnswer.trim());
    if (validDrafts.length === 0) {
      alert('등록할 문제의 [문제 내용]과 [최종 정답]을 최소 1문제 이상 입력해주세요.');
      return;
    }

    const newProblemsToSave: ProblemItem[] = validDrafts.map((draft, idx) => {
      const steps: SolutionStep[] = [];
      if (draft.step1.trim()) {
        steps.push({
          stepNumber: 1,
          title: '핵심 개념 및 공식 적용',
          explanation: draft.step1.trim(),
        });
      }
      if (draft.step2.trim()) {
        steps.push({
          stepNumber: steps.length + 1,
          title: '풀이 전개 및 정리',
          explanation: draft.step2.trim(),
        });
      }
      if (steps.length === 0) {
        steps.push({
          stepNumber: 1,
          title: '단계별 해설',
          explanation: '교과서 공식과 정의를 활용하여 차례대로 계산합니다.',
        });
      }

      return {
        id: `prob-custom-batch-${Date.now()}-${idx}`,
        textbookId: activeTextbook?.id || (subject === 'math' ? 'tb-math-mr-h2' : 'tb-sci-bs-h1'),
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
        problemText: draft.problemText.trim(),
        solutionSteps: steps,
        finalAnswer: draft.finalAnswer.trim(),
        coreConcepts: [targetSubUnit.title, draft.problemType],
        dreamTip: draft.dreamTip.trim() || '💡 핵심 개념과 공식을 꼼꼼히 확인하세요!',
        solutionImage: draft.solutionImage || undefined,
        peerTips: [],
        studentSolutions: [],
        views: 1,
        likes: 0,
      };
    });

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
      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-amber-200/90">
        <button
          id="btn-back-to-home"
          type="button"
          onClick={onGoBack}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-50/70 text-slate-700 text-xs sm:text-sm font-black shadow-sm transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-amber-700" />
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
        {/* For Science: 핵심 개념 설명 comes first before 교과서 문제 풀이 */}
        {subject === 'science' && (
          <button
            id="tab-btn-concepts"
            type="button"
            onClick={() => setActiveTab('concepts')}
            className={`flex-1 py-3 px-3 sm:px-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all relative ${
              activeTab === 'concepts'
                ? 'bg-white text-emerald-950 border-2 border-emerald-500 shadow-md scale-[1.01]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 border-2 border-transparent'
            }`}
          >
            <Lightbulb className={`w-4 h-4 shrink-0 ${activeTab === 'concepts' ? 'text-amber-500 fill-amber-400' : 'text-slate-500'}`} />
            <span className="tracking-tight whitespace-nowrap">핵심 개념 설명</span>
          </button>
        )}

        <button
          id="tab-btn-problems"
          type="button"
          onClick={() => setActiveTab('problems')}
          className={`flex-1 py-3 px-3 sm:px-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all relative ${
            activeTab === 'problems'
              ? subject === 'science'
                ? 'bg-white text-emerald-950 border-2 border-emerald-500 shadow-md scale-[1.01]'
                : 'bg-white text-blue-900 border-2 border-blue-400 shadow-md scale-[1.01]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 border-2 border-transparent'
          }`}
        >
          <BookOpen className={`w-4 h-4 shrink-0 ${activeTab === 'problems' ? (subject === 'science' ? 'text-emerald-600' : 'text-blue-600') : 'text-slate-500'}`} />
          <span className="tracking-tight whitespace-nowrap">교과서 문제 풀이</span>
        </button>

        <button
          id="tab-btn-facts"
          type="button"
          onClick={() => setActiveTab('facts')}
          className={`flex-1 py-3 px-3 sm:px-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all relative ${
            activeTab === 'facts'
              ? 'bg-white text-amber-950 border-2 border-amber-400 shadow-md scale-[1.01]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 border-2 border-transparent'
          }`}
        >
          <Sparkles className={`w-4 h-4 shrink-0 ${activeTab === 'facts' ? 'text-amber-500 fill-amber-400' : 'text-slate-500'}`} />
          <span className="tracking-tight whitespace-nowrap">4컷 만화 포스터</span>
        </button>

        <button
          id="tab-btn-unit-tests"
          type="button"
          onClick={() => setActiveTab('unit_tests')}
          className={`flex-1 py-3 px-3 sm:px-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all relative ${
            activeTab === 'unit_tests'
              ? 'bg-white text-orange-950 border-2 border-orange-400 shadow-md scale-[1.01]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 border-2 border-transparent'
          }`}
        >
          <Award className={`w-4 h-4 shrink-0 ${activeTab === 'unit_tests' ? 'text-orange-500' : 'text-slate-500'}`} />
          <span className="tracking-tight whitespace-nowrap">대단원 실전 TEST</span>
        </button>
      </div>

      {/* ========================================================== */}
      {/* TAB: 핵심 개념 설명 */}
      {/* ========================================================== */}
      {activeTab === 'concepts' && (
        <ConceptMasterView
          subject={subject}
          userRole={userRole}
          currentUserId={currentUserId}
          concepts={concepts}
          onAddNewConcept={(newConcept) => onAddNewConcept && onAddNewConcept(newConcept)}
          onDeleteConcept={(conceptId) => onDeleteConcept && onDeleteConcept(conceptId)}
          onToggleLikeConcept={(conceptId) => onToggleLikeConcept && onToggleLikeConcept(conceptId)}
        />
      )}

      {/* ========================================================== */}
      {/* TAB: 흥미로운 사실 포스터 갤러리 */}
      {/* ========================================================== */}
      {activeTab === 'facts' && (
        <InterestingFactsGallery
          subject={subject}
          userRole={userRole}
          currentUserId={currentUserId}
          facts={facts}
          onAddNewFact={(newFact) => onAddNewFact && onAddNewFact(newFact)}
          onDeleteFact={(factId) => onDeleteFact && onDeleteFact(factId)}
          onToggleLikeFact={(factId) => onToggleLikeFact && onToggleLikeFact(factId)}
        />
      )}

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

          {/* Unit Test Direct Link Banner (if matching quiz exists) */}
          {matchingQuizForSelection && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🏆</span>
                <div>
                  <span className="text-xs font-black block">
                    {matchingQuizForSelection.unitName} 실전 TEST ({matchingQuizForSelection.questions.length}문항)
                  </span>
                  <span className="text-[11px] text-amber-100 font-medium">
                    대단원 실전 테스트를 바로 풀어보고 자동 채점과 오답노트를 확인해보세요.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                {userRole === 'admin' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenAddQuizQuestion(matchingQuizForSelection.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-black shadow-xs transition-all flex items-center gap-1"
                      title="이 단원에 새 테스트 문제 출제"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>문제 출제</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedQuizForManage(matchingQuizForSelection);
                        setShowManageQuizModal(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-black/30 hover:bg-black/40 text-amber-100 text-xs font-bold transition-all flex items-center gap-1"
                      title="문항 관리 및 삭제"
                    >
                      <span>문항 관리 ({matchingQuizForSelection.questions.length})</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (matchingQuizForSelection.questions.length === 0) {
                      alert('현재 등록된 문제가 없습니다. 선생님(관리자)이 문제를 출제한 후 응시할 수 있습니다.');
                      return;
                    }
                    setSelectedQuiz(matchingQuizForSelection);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white text-amber-900 text-xs font-black shadow-sm hover:bg-amber-50 active:scale-95 transition-all"
                >
                  TEST 시작하기 →
                </button>
              </div>
            </motion.div>
          )}

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
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 text-[10px] font-black border border-amber-400 flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3 text-amber-600" />
                              <span>선생님 검수</span>
                            </span>
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

                    {/* Problem text snippet */}
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                      {prob.problemText}
                    </p>

                    {/* Bottom row */}
                    <div className="pt-1 flex items-center justify-between border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2 text-slate-500 font-medium">
                        <span className="text-emerald-600 font-bold">✓ 정답 & 단계별 풀이 제공</span>
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

      {/* ========================================================== */}
      {/* TAB 2: 단원별 실전 마스터 TEST */}
      {/* ========================================================== */}
      {activeTab === 'unit_tests' && (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 bg-white/20 text-[10px] font-black rounded-full uppercase tracking-wider">
                {subject === 'math' ? '미래엔 공통수학 2' : '비상교육 통합과학 2'} 대단원 실전 TEST
              </span>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                대단원 실전 TEST
              </h3>
              <p className="text-xs text-amber-100 font-medium">
                대단원별 문제를 풀고 실력을 점검해보세요.
              </p>
            </div>
            {userRole === 'admin' && (
              <button
                type="button"
                onClick={() => handleOpenAddQuizQuestion()}
                className="px-4 py-2.5 bg-white text-amber-700 hover:bg-amber-50 rounded-2xl text-xs font-black shadow-md flex items-center gap-1.5 shrink-0 active:scale-95 transition-all"
              >
                <PlusCircle className="w-4 h-4 text-amber-600" />
                <span>TEST 문제 출제</span>
              </button>
            )}
          </div>

          {/* Big Chapters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subjectQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="p-5 bg-white rounded-3xl border-2 border-amber-200/90 hover:border-amber-400 hover:shadow-lg transition-all flex flex-col justify-between space-y-4 relative group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-200">
                      {quiz.unitCode} (대단원)
                    </span>
                    <span className="text-[11px] font-bold text-slate-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>{quiz.estimatedMinutes === 0 ? '무제한' : `${quiz.estimatedMinutes}분`}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 font-bold block">
                      {quiz.chapterName}
                    </span>
                    <h4 className="text-base font-black text-slate-900 mt-0.5">
                      {quiz.unitName}
                    </h4>
                  </div>

                  <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                    {quiz.description || '대단원 전체 종합 평가 및 실전 모의 테스트'}
                  </p>

                  <div className="flex items-center flex-wrap gap-2 text-xs font-bold text-slate-600 pt-1">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                      출제 문항: <strong className="text-amber-600">{quiz.questions.length}</strong>개
                    </span>
                    <span className="text-emerald-600 flex items-center gap-0.5 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 자동 채점
                    </span>
                    <span className="text-amber-700 flex items-center gap-0.5 text-[11px] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      <Camera className="w-3 h-3 text-amber-600" /> 사진 첨부 풀이
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {/* Start Test Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (quiz.questions.length === 0) {
                        alert('현재 등록된 문제가 없습니다. 선생님(관리자)이 문제를 출제한 후 응시할 수 있습니다.');
                        return;
                      }
                      setSelectedQuiz(quiz);
                    }}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <span>TEST 응시하기 ({quiz.questions.length}문항 · {quiz.estimatedMinutes === 0 ? '자유 풀이' : `${quiz.estimatedMinutes}분`})</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Admin Controls */}
                  {userRole === 'admin' && (
                    <div className="space-y-1.5 pt-1">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenAddQuizQuestion(quiz.id)}
                          className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-[11px] font-bold border border-amber-200 flex items-center justify-center gap-1 transition-all"
                        >
                          <PlusCircle className="w-3 h-3 text-amber-600" />
                          <span>문제 출제</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedQuizForManage(quiz);
                            setShowManageQuizModal(true);
                          }}
                          className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[11px] font-bold border border-slate-200 flex items-center justify-center gap-1 transition-all"
                        >
                          <span>문항 관리 ({quiz.questions.length})</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEditQuizTime(quiz)}
                        className="w-full py-1.5 px-2 bg-orange-50 hover:bg-orange-100 text-orange-900 rounded-xl text-[11px] font-bold border border-orange-200 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Clock className="w-3.5 h-3.5 text-orange-600" />
                        <span>⏱️ 시험 시간 설정 ({quiz.estimatedMinutes === 0 ? '무제한' : `${quiz.estimatedMinutes}분`})</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Admin Edit Quiz Duration */}
      <AnimatePresence>
        {showEditQuizTimeModal && editingQuizForTime && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-[#FFFDF9] rounded-3xl shadow-2xl border-4 border-amber-200 overflow-hidden flex flex-col"
            >
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-200" />
                  <div>
                    <h3 className="text-base font-black">대단원 TEST 제한 시간 설정</h3>
                    <p className="text-[11px] text-amber-100 font-medium">
                      {editingQuizForTime.chapterName} · {editingQuizForTime.unitName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditQuizTimeModal(false)}
                  className="p-1 rounded-lg hover:bg-white/20 text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveQuizTime} className="p-5 space-y-4">
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 font-medium space-y-1">
                  <p className="font-bold flex items-center gap-1 text-amber-900">
                    <span>💡</span> 시험 시간 작동 방식
                  </p>
                  <p className="leading-relaxed">
                    선생님이 설정한 시험 시간이 학생 화면 상단에 실시간 카운트다운 타이머로 표시됩니다.
                    시간이 종료되면 풀던 답안이 자동으로 채점 처리됩니다.
                  </p>
                </div>

                {/* Preset Time Buttons */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 block">
                    빠른 시간 프리셋 선택
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 15, 20, 30, 45, 60, 0].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setCustomQuizMinutes(mins)}
                        className={`py-2 px-1 rounded-xl text-xs font-black border transition-all ${
                          customQuizMinutes === mins
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm scale-105'
                            : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50 hover:border-amber-400'
                        }`}
                      >
                        {mins === 0 ? '무제한' : `${mins}분`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Number Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-800 flex items-center justify-between">
                    <span>직접 분(Minute) 입력</span>
                    <span className="text-[11px] text-amber-600 font-bold">
                      {customQuizMinutes === 0 ? '시간 제한 없음' : `현재 설정: ${customQuizMinutes}분`}
                    </span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min="0"
                      max="180"
                      value={customQuizMinutes}
                      onChange={(e) => setCustomQuizMinutes(Number(e.target.value))}
                      placeholder="0은 무제한 (최대 180분)"
                      className="w-full p-3 rounded-2xl border-2 border-amber-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none text-sm font-bold text-slate-900"
                    />
                    <span className="absolute right-4 text-xs font-black text-slate-400">
                      분 (mins)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    * 0을 입력하시면 타이머 없이 무제한으로 문제를 풀 수 있습니다.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-amber-200">
                  <button
                    type="button"
                    onClick={() => setShowEditQuizTimeModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>설정 저장하기</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unit Test Modal */}
      <AnimatePresence>
        {selectedQuiz && (
          <UnitTestModal
            quiz={selectedQuiz}
            userRole={userRole}
            onClose={() => setSelectedQuiz(null)}
            onDeleteQuestion={handleDeleteQuizQuestion}
            onOpenAddQuestion={(quizId) => handleOpenAddQuizQuestion(quizId)}
            onCompleteQuiz={(_score, _total, attempt) => {
              if (attempt && onCompleteQuiz) {
                onCompleteQuiz(attempt);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Fullscreen View: Admin Add Quiz Question */}
      <AnimatePresence>
        {showAddQuizModal && (
          <motion.div
            id="admin-add-quiz-fullscreen-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-[#FBF9F5] flex flex-col w-full h-full overflow-hidden"
          >
            {/* Navigation Header */}
            <div className="px-4 sm:px-8 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 text-white flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddQuizModal(false)}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs"
                  title="돌아가기"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  <span className="hidden sm:inline">돌아가기</span>
                </button>

                <div className="h-6 w-[1px] bg-white/30 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <span className="text-xl">📝</span>
                  <h2 className="text-sm sm:text-base font-black text-white">
                    대단원 실전 TEST 문제 직접 출제
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddQuizModal(false)}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto w-full p-4 sm:p-6 sm:px-8">
              <div className="max-w-3xl mx-auto pb-16">
                <form onSubmit={handleSaveQuizQuestion} className="bg-white p-5 sm:p-7 rounded-3xl border-2 border-amber-200 shadow-sm space-y-4">
                  {/* Target Big Chapter Selector */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block">
                      출제할 대단원(큰 단원) 선택
                    </label>
                    <select
                      value={targetQuizIdForAdd}
                      onChange={(e) => setTargetQuizIdForAdd(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-amber-300 text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      {subjectQuizzes.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.unitCode} - {q.chapterName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Question Text */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block">
                      문제 지문 / 내용 <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      placeholder="대단원 실전 문제 질문과 지문을 입력해주세요..."
                      value={newQuizQuestionText}
                      onChange={(e) => setNewQuizQuestionText(e.target.value)}
                      rows={3}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-amber-200 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  {/* Question Image Attachment (Diagram / Graphic) */}
                  <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-amber-600" />
                        <span>문제 도형/지문 사진 첨부 (선택)</span>
                      </label>
                      {newQuizQuestionImage && (
                        <button
                          type="button"
                          onClick={() => setNewQuizQuestionImage(null)}
                          className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>사진 제거</span>
                        </button>
                      )}
                    </div>

                    <input
                      ref={quizQuestionFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const compressed = await compressImageFile(file);
                        if (compressed) {
                          setNewQuizQuestionImage(compressed);
                        }
                        e.target.value = '';
                      }}
                    />

                    {newQuizQuestionImage ? (
                      <div className="relative rounded-2xl overflow-hidden border border-amber-300 max-h-48 bg-white flex items-center justify-center p-2">
                        <img
                          src={newQuizQuestionImage}
                          alt="문제 사진 미리보기"
                          className="max-h-48 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => quizQuestionFileInputRef.current?.click()}
                        className="w-full py-2.5 px-3 bg-white border-2 border-dashed border-amber-300 hover:bg-amber-50/50 rounded-2xl text-xs font-bold text-amber-900 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Camera className="w-4 h-4 text-amber-600" />
                        <span>문제 그림/도형/지문 사진 파일 첨부하기</span>
                      </button>
                    )}
                  </div>

                  {/* Dynamic Choices (선지 추가/삭제/지정) */}
                  <div className="space-y-2.5 p-4 bg-amber-50/50 rounded-2xl border border-amber-200">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div>
                        <label className="text-xs font-black text-slate-800 flex items-center gap-1">
                          <span>선지(보기) 설정 및 정답 지정</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[11px] text-slate-500 font-medium">
                          정답인 선지 앞 [✓ 정답] 버튼을 클릭하세요 ({newQuizOptions.length}개 선지 구성)
                        </span>
                      </div>

                      {/* Presets & Add Option Button */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSetOptionCountPreset(5)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                            newQuizOptions.length === 5
                              ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50'
                          }`}
                        >
                          5지선다
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetOptionCountPreset(4)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                            newQuizOptions.length === 4
                              ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50'
                          }`}
                        >
                          4지선다
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetOptionCountPreset(2)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                            newQuizOptions.length === 2
                              ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50'
                          }`}
                        >
                          O/X
                        </button>
                        <button
                          type="button"
                          onClick={handleAddOptionField}
                          className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center gap-1 transition-all"
                          title="새 보기(선지) 추가하기"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>+ 선지 추가</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      {newQuizOptions.map((optText, optIdx) => {
                        const isCorrect = newQuizCorrectIdx === optIdx;
                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-2 p-2 rounded-2xl border transition-all ${
                              isCorrect
                                ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-300'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setNewQuizCorrectIdx(optIdx)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all flex items-center gap-1 shrink-0 ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                              }`}
                              title={isCorrect ? '정답으로 지정됨' : '클릭하여 정답으로 지정'}
                            >
                              <span>{CIRCLED_NUMBERS[optIdx] || optIdx + 1}</span>
                              <span>{isCorrect ? '✓ 정답' : '선택'}</span>
                            </button>

                            <input
                              type="text"
                              placeholder={`${CIRCLED_NUMBERS[optIdx] || optIdx + 1}번 선지 내용을 입력하세요`}
                              value={optText}
                              onChange={(e) => handleUpdateOptionText(optIdx, e.target.value)}
                              required={optIdx < 2}
                              className="flex-1 px-3 py-1.5 bg-transparent border-none text-xs sm:text-sm font-medium text-slate-800 focus:outline-none placeholder:text-slate-400"
                            />

                            {newQuizOptions.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOptionField(optIdx)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                                title="이 선지 삭제"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-emerald-800 font-bold">
                        💡 현재 지정된 정답: {CIRCLED_NUMBERS[newQuizCorrectIdx] || newQuizCorrectIdx + 1}번 선지
                      </span>
                      <button
                        type="button"
                        onClick={handleAddOptionField}
                        className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>선지 항목 하나 더 추가 ({newQuizOptions.length}/10)</span>
                      </button>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block">
                      정답 해설 및 풀이 과정
                    </label>
                    <textarea
                      placeholder="학생들이 풀이를 마친 후 확인할 상세 해설을 입력하세요..."
                      value={newQuizExplanation}
                      onChange={(e) => setNewQuizExplanation(e.target.value)}
                      rows={3}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-amber-200 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  {/* Explanation Image Attachment */}
                  <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-amber-600" />
                        <span>해설/손글씨 풀이 사진 첨부 (선택)</span>
                      </label>
                      {newQuizExplanationImage && (
                        <button
                          type="button"
                          onClick={() => setNewQuizExplanationImage(null)}
                          className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>사진 제거</span>
                        </button>
                      )}
                    </div>

                    <input
                      ref={quizExplanationFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const compressed = await compressImageFile(file);
                        if (compressed) {
                          setNewQuizExplanationImage(compressed);
                        }
                        e.target.value = '';
                      }}
                    />

                    {newQuizExplanationImage ? (
                      <div className="relative rounded-2xl overflow-hidden border border-amber-300 max-h-48 bg-white flex items-center justify-center p-2">
                        <img
                          src={newQuizExplanationImage}
                          alt="해설 사진 미리보기"
                          className="max-h-48 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => quizExplanationFileInputRef.current?.click()}
                        className="w-full py-2.5 px-3 bg-white border-2 border-dashed border-amber-300 hover:bg-amber-50/50 rounded-2xl text-xs font-bold text-amber-900 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Camera className="w-4 h-4 text-amber-600" />
                        <span>해설/손글씨 풀이 사진 파일 첨부하기</span>
                      </button>
                    )}
                  </div>

                  {/* Hint */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block">
                      풀이 힌트 / 공식 팁 (선택)
                    </label>
                    <input
                      type="text"
                      placeholder="예: 두 점 사이의 거리 공식 d = √((x2-x1)² + (y2-y1)²) 활용"
                      value={newQuizHint}
                      onChange={(e) => setNewQuizHint(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-amber-200 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  {/* Submit Buttons */}
                  <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-amber-100">
                    <button
                      type="button"
                      onClick={() => setShowAddQuizModal(false)}
                      className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-2xl text-xs sm:text-sm font-bold hover:bg-slate-200"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md active:scale-95 transition-all"
                    >
                      대단원 TEST에 문제 등록 완료 ✨
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen View: Admin Manage Questions for a Big Chapter */}
      <AnimatePresence>
        {showManageQuizModal && selectedQuizForManage && (
          <motion.div
            id="admin-manage-quiz-fullscreen-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-[#FBF9F5] flex flex-col w-full h-full overflow-hidden"
          >
            {/* Header Bar */}
            <div className="px-4 sm:px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowManageQuizModal(false)}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs"
                  title="돌아가기"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  <span className="hidden sm:inline">돌아가기</span>
                </button>

                <div className="h-6 w-[1px] bg-white/30 hidden sm:block" />

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase px-2.5 py-0.5 bg-white/25 rounded-full">
                      {selectedQuizForManage.unitCode} 문항 관리
                    </span>
                    <h2 className="text-sm sm:text-base font-black">
                      {selectedQuizForManage.chapterName} 출제 문제 목록
                    </h2>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowManageQuizModal(false)}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto w-full p-4 sm:p-6 sm:px-8">
              <div className="max-w-4xl mx-auto space-y-4 pb-16">
                {/* Quiz Duration Admin Control Banner inside Manage Modal */}
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl border-2 border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-amber-200 text-amber-900">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-black text-amber-950 block">
                        시험 제한 시간: {selectedQuizForManage.estimatedMinutes === 0 ? '무제한 (자유 풀이)' : `${selectedQuizForManage.estimatedMinutes}분`}
                      </span>
                      <span className="text-[11px] sm:text-xs text-amber-800 font-medium">
                        시험 시작 시 카운트다운 타이머가 작동하며 시간 종료 시 자동 채점됩니다.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenEditQuizTime(selectedQuizForManage)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black shadow-xs flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>제한 시간 변경</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-xs sm:text-sm font-black text-slate-800">
                    현재 등록된 문제: <strong>{selectedQuizForManage.questions.length}</strong>개
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowManageQuizModal(false);
                      handleOpenAddQuizQuestion(selectedQuizForManage.id);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-black shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ 새 문제 추가 출제</span>
                  </button>
                </div>

                {selectedQuizForManage.questions.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-2 bg-white rounded-3xl border-2 border-dashed border-amber-200">
                    <p className="text-3xl">📭</p>
                    <p className="text-xs sm:text-sm font-bold">등록된 문제가 없습니다. 새로운 문제를 출제해보세요!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedQuizForManage.questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-4 sm:p-5 bg-white rounded-3xl border-2 border-slate-200 space-y-3 shadow-2xs hover:border-amber-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-xl text-xs font-black">
                              Q{idx + 1}
                            </span>
                            <div className="space-y-1">
                              <span className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed block">
                                {q.questionText}
                              </span>
                              {q.questionImage && (
                                <div className="mt-2 rounded-2xl overflow-hidden border border-slate-200 max-w-[200px] bg-slate-50">
                                  <img
                                    src={q.questionImage}
                                    alt="문제 사진"
                                    className="max-h-32 object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteQuizQTarget({
                                quizId: selectedQuizForManage.id,
                                questionId: q.id,
                                num: idx + 1,
                                text: q.questionText,
                              })
                            }
                            className="px-3 py-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-bold border border-rose-200 transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                            title="선생님 권한으로 문항 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>삭제</span>
                          </button>
                        </div>

                        {/* Options preview */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {q.options.map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className={`p-2.5 rounded-2xl text-xs font-medium flex items-center gap-2 border ${
                                optIdx === q.correctIndex
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold shrink-0 ${
                                  optIdx === q.correctIndex
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {CIRCLED_NUMBERS[optIdx] || optIdx + 1}
                              </span>
                              <span className="truncate">{opt}</span>
                              {optIdx === q.correctIndex && (
                                <span className="ml-auto text-[10px] text-emerald-600 font-black shrink-0">
                                  ✓ 정답
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Explanation */}
                        {q.explanation && (
                          <div className="p-3 bg-amber-50/60 rounded-2xl text-xs text-slate-700 border border-amber-100">
                            <strong className="text-amber-800 font-black">해설:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  onClick={() => setShowAddProblemModal(false)}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs"
                  title="돌아가기"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  <span className="hidden sm:inline">돌아가기</span>
                </button>

                <div className="h-6 w-[1px] bg-white/30 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <span className="text-xl">✍️</span>
                  <div>
                    <h2 className="text-sm sm:text-base font-black">
                      교과서 문제 & 단계별 풀이 등록
                    </h2>
                    <p className="text-[11px] text-amber-100 font-medium hidden sm:block">
                      {subject === 'math' ? '미래엔 공통수학 2' : '비상교육 통합과학 2'} 단원별 문제 등록 시스템
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddProblemModal(false)}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
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

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto w-full p-4 sm:p-6 sm:px-8">
              <div className="max-w-4xl mx-auto space-y-4 pb-16">
                {/* Target Chapter & SubUnit Selectors Bar (Common for both modes) */}
                <div className="p-4 sm:p-5 bg-white rounded-3xl border-2 border-amber-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">
                      1. 등록할 대단원 선택
                    </label>
                    <select
                      value={modalChapterId}
                      onChange={(e) => {
                        const chId = e.target.value;
                        setModalChapterId(chId);
                        const targetCh = curriculumChapters.find((c) => c.id === chId) || curriculumChapters[0];
                        const firstSub = targetCh.subUnits[0] || targetCh.grandAssessment;
                        setModalSubUnitId(firstSub.id);
                        const count = getSubUnitCount(targetCh, firstSub);
                        const nextNum = count + 1;
                        setNewProbNum(nextNum < 10 ? `0${nextNum}번` : `${nextNum}번`);
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
                      2. 등록할 중단원 / 대단원 평가 선택
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
                            const count = getSubUnitCount(targetCh, targetSub);
                            const nextNum = count + 1;
                            setNewProbNum(nextNum < 10 ? `0${nextNum}번` : `${nextNum}번`);
                            if (targetSub.category === '대단원 평가') {
                              setNewProbType('대단원 평가');
                            } else {
                              setNewProbType('중단원 마무리');
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

                  {/* Problem Text */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 block">문제 본문 지문</label>
                      <span className="text-[10px] text-amber-700 font-bold">* 필수 입력</span>
                    </div>
                    <textarea
                      placeholder="교과서 문제 지문과 수식(f(x), 좌표, 조건 등)을 입력해주세요..."
                      value={newProbText}
                      onChange={(e) => setNewProbText(e.target.value)}
                      rows={3}
                      required
                      className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  {/* Step 1 & Step 2 Solutions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        1단계 풀이 (핵심 공식 & 식 세우기)
                      </label>
                      <textarea
                        placeholder="예: 점과 직선 사이의 거리 공식 d = |ax1 + by1 + c| / √(a² + b²) 적용..."
                        value={newStep1}
                        onChange={(e) => setNewStep1(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        2단계 풀이 (식 전개 & 정리 과정)
                      </label>
                      <textarea
                        placeholder="예: 방정식을 대입하여 계산하면 k = 4 또는 k = -4가 도출됩니다..."
                        value={newStep2}
                        onChange={(e) => setNewStep2(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  {/* Final Answer */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 block">최종 정답</label>
                      <span className="text-[10px] text-amber-700 font-bold">* 필수 입력</span>
                    </div>
                    <input
                      type="text"
                      placeholder="예: k = 4, x + 2y - 5 = 0"
                      value={newFinalAns}
                      onChange={(e) => setNewFinalAns(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  {/* Solution Photo Attachment */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      해설 풀이 사진 첨부 (선택)
                    </label>
                    {newSolutionImage ? (
                      <div className="relative rounded-2xl border-2 border-amber-300 bg-slate-900 p-2 overflow-hidden flex flex-col items-center">
                        <img
                          src={newSolutionImage}
                          alt="풀이 첨부 사진"
                          className="max-h-40 rounded-xl object-contain w-full"
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
                            <Trash2 className="w-3 h-3" /> 삭제
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="flex-1 py-2 px-3 bg-amber-50 hover:bg-amber-100/80 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs"
                        >
                          <Camera className="w-4 h-4 text-amber-600" />
                          <span>카메라 촬영</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs"
                        >
                          <Upload className="w-4 h-4 text-slate-500" />
                          <span>사진 파일 찾기</span>
                        </button>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageFileRead(file);
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
                        if (file) handleImageFileRead(file);
                      }}
                      className="hidden"
                    />
                  </div>

                  {/* Dream Tip */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      풀이 핵심 팁 & 실수 방지 포인트 (선택)
                    </label>
                    <input
                      type="text"
                      placeholder="예: 분모가 0이 되지 않도록 범위를 먼저 점검하세요!"
                      value={newTip}
                      onChange={(e) => setNewTip(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  {/* Continuous Add Toggle Option */}
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

                  {/* Bottom Action Buttons */}
                  <div className="pt-2 border-t border-amber-200 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddProblemModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                    >
                      {recentlyAddedCount > 0 ? '등록 완료 후 닫기' : '취소'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-black shadow-md hover:from-amber-600 hover:to-orange-600 active:scale-95 flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>{continuousAdd ? '✨ 문제 등록 및 다음 문제 작성' : '등록 완료'}</span>
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

                        {/* Problem Text */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            문제 본문 지문 <span className="text-amber-600 font-black">*필수</span>
                          </label>
                          <textarea
                            placeholder="문제 지문을 입력하세요..."
                            value={draft.problemText}
                            onChange={(e) => handleUpdateBatchDraftField(draft.tempId, 'problemText', e.target.value)}
                            rows={2}
                            className="w-full px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>

                        {/* Step 1 & Step 2 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              1단계 풀이 (공식 및 식 세우기)
                            </label>
                            <textarea
                              placeholder="공식 적용 과정..."
                              value={draft.step1}
                              onChange={(e) => handleUpdateBatchDraftField(draft.tempId, 'step1', e.target.value)}
                              rows={2}
                              className="w-full px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              2단계 풀이 (전개 및 도출 과정)
                            </label>
                            <textarea
                              placeholder="계산 및 풀이 과정..."
                              value={draft.step2}
                              onChange={(e) => handleUpdateBatchDraftField(draft.tempId, 'step2', e.target.value)}
                              rows={2}
                              className="w-full px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </div>
                        </div>

                        {/* Final Answer & Tip */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              최종 정답 <span className="text-amber-600 font-black">*필수</span>
                            </label>
                            <input
                              type="text"
                              placeholder="예: k = 4"
                              value={draft.finalAnswer}
                              onChange={(e) => handleUpdateBatchDraftField(draft.tempId, 'finalAnswer', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-blue-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              풀이 팁 (선택)
                            </label>
                            <input
                              type="text"
                              placeholder="핵심 팁"
                              value={draft.dreamTip}
                              onChange={(e) => handleUpdateBatchDraftField(draft.tempId, 'dreamTip', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </div>
                        </div>

                        {/* Image Upload for Batch Card */}
                        <div className="pt-1 flex items-center justify-between">
                          {draft.solutionImage ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                ✓ 사진 첨부됨
                              </span>
                              <button
                                type="button"
                                onClick={() => setZoomImage(draft.solutionImage)}
                                className="text-[11px] font-bold text-blue-600 hover:underline"
                              >
                                미리보기
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateBatchDraftField(draft.tempId, 'solutionImage', null)}
                                className="text-[11px] font-bold text-rose-600 hover:underline"
                              >
                                삭제
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveBatchDraftIdForImage(draft.tempId);
                                batchImageInputRef.current?.click();
                              }}
                              className="text-[11px] font-bold text-slate-600 hover:text-blue-700 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 transition-colors"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>해설 사진 첨부</span>
                            </button>
                          )}
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

      {/* Prominent Modal: Delete Unit Test Question Confirmation */}
      <AnimatePresence>
        {deleteQuizQTarget && (
          <div
            className="fixed inset-0 z-80 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeleteQuizQTarget(null)}
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
                    <h3 className="text-lg font-black tracking-tight">선생님 권한 — 대단원 TEST 문항 삭제</h3>
                    <p className="text-xs text-rose-100 font-medium">Q{deleteQuizQTarget.num}번 문항을 완전히 삭제합니다</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteQuizQTarget(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 flex items-start gap-3">
                  <span className="text-2xl shrink-0">⚠️</span>
                  <div className="text-xs sm:text-sm text-rose-900 leading-relaxed font-bold">
                    <p className="font-black text-rose-950">정말로 이 테스트 문항을 삭제하시겠습니까?</p>
                    <p className="text-rose-600 font-semibold mt-1">
                      삭제된 문제는 즉시 해당 단원 테스트에서 제거됩니다.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded-lg text-xs font-bold">
                      삭제 대상: Q{deleteQuizQTarget.num}번
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">문항 미리보기</span>
                  </label>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 font-medium max-h-36 overflow-y-auto leading-relaxed whitespace-pre-wrap shadow-inner">
                    {deleteQuizQTarget.text}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteQuizQTarget(null)}
                    className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-black transition-all active:scale-98"
                  >
                    취소하기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (deleteQuizQTarget) {
                        handleDeleteQuizQuestion(deleteQuizQTarget.quizId, deleteQuizQTarget.questionId);
                        setToastNotice(`Q${deleteQuizQTarget.num}번 문항이 삭제되었습니다.`);
                        setTimeout(() => setToastNotice(null), 3000);
                        setDeleteQuizQTarget(null);
                      }
                    }}
                    className="py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-black shadow-lg shadow-rose-200 transition-all active:scale-98 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>문항 삭제 확인</span>
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
    </div>
  );
};
export default TextbookMasterView;