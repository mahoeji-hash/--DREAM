import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useModalHistory } from './utils/navigationHistory';
import { TEXTBOOKS, getStoredProblems, saveStoredProblems, hydrateProblemsFromIndexedDB } from './data/mockTextbooks';
import { getStoredQuestions, saveStoredQuestions } from './data/mockCommunityQuestions';
import { getStoredInterestingFacts, saveStoredInterestingFacts } from './data/mockInterestingFacts';
import { getStoredConcepts, saveStoredConcepts } from './data/mockConcepts';
import { ProblemItem, TextbookInfo, UserProfile, AIQuestionResult, CommunityQuestion, TeacherAnswer, InterestingFactItem, QuizAttemptRecord, ConceptItem } from './types';
import { getStoredAccounts, fetchStoredAccountsFromDB } from './services/authService';
import {
  dbFetchCommunityQuestions,
  dbFetchTextbookProblems,
  dbSaveCommunityQuestion,
  dbAnswerCommunityQuestion,
  dbDeleteCommunityQuestion,
  dbToggleLikeCommunityQuestion,
  dbSaveTextbookProblem,
  dbUpdateTextbookProblem,
  dbDeleteTextbookProblem,
  dbSaveQuizAttempt,
  dbSaveWrongAnswer,
} from './services/dbService';
import { isSupabaseConfigured, testSupabaseConnection } from './supabaseClient';
import { cleanLegacyStorageKeys, safeLocalStorageSet, safeLocalStorageGet } from './services/storageService';
import { HomeScreen } from './components/HomeScreen';
import { TextbookMasterView } from './components/TextbookMasterView';
import { ProblemDetailModal } from './components/ProblemDetailModal';
import { AskQuestionModal } from './components/AskQuestionModal';
import { UserProfileModal } from './components/UserProfileModal';
import { CommunityQnAView } from './components/CommunityQnAView';
import { LoginScreen } from './components/LoginScreen';

const DEFAULT_PROFILE: UserProfile = {
  role: 'student',
  nickname: '화원고열공이',
  schoolName: '대구화원고등학교',
  grade: 'high_1',
  avatarSeed: 'puppy',
  solvedCount: 0,
  helpedCount: 0,
  bookmarkedProblemIds: [],
  historyQuestions: [],
  quizAttempts: [],
  wrongQuizQuestions: [],
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const raw = localStorage.getItem('puleo_is_logged_in');
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'boolean') return parsed;
      if (parsed === 'true') return true;
    } catch {
      return raw === 'true';
    }
    return raw === 'true';
  });

  const [currentView, setCurrentView] = useState<'home' | 'math' | 'science' | 'qna'>(() => {
    const saved = safeLocalStorageGet<any>('puleo_current_view', 'home');
    if (saved === 'wrong-answers') return 'home';
    return saved === 'math' || saved === 'science' || saved === 'qna' ? saved : 'home';
  });

  const [initialSubjectTab, setInitialSubjectTab] = useState<'problems' | 'concepts'>('problems');

  const [selectedProblem, setSelectedProblem] = useState<ProblemItem | null>(() => {
    return safeLocalStorageGet<ProblemItem | null>('puleo_selected_problem', null);
  });
  const [isAskQuestionOpen, setIsAskQuestionOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [problemForAI, setProblemForAI] = useState<ProblemItem | null>(null);

  // Synchronize top-level modals with browser back/forward history
  useModalHistory(!!selectedProblem, () => setSelectedProblem(null), 'problem-detail');
  useModalHistory(
    isAskQuestionOpen,
    () => {
      setIsAskQuestionOpen(false);
      setProblemForAI(null);
    },
    'ask-ai-modal'
  );
  useModalHistory(isProfileOpen, () => setIsProfileOpen(false), 'profile-modal');

  // Exit Guard & Toast state for preventing accidental website exit on Home
  const [showExitToast, setShowExitToast] = useState(false);
  const exitWarningTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cloud DB error banner notice (e.g., Supabase RLS policy blocks)
  const [dbErrorNotice, setDbErrorNotice] = useState<string | null>(null);
  const dbErrorTimerRef = useRef<NodeJS.Timeout | null>(null);

  const notifyDbError = (actionLabel: string, errMsg?: string) => {
    const isRls = Boolean(
      errMsg && (errMsg.toLowerCase().includes('row-level security') || errMsg.includes('42501'))
    );
    const formatted = isRls
      ? `${actionLabel} 실패: Supabase RLS(행 수준 보안) 정책 때문에 저장이 차단되었습니다. supabase_schema.sql을 SQL Editor에서 실행해주세요.`
      : `${actionLabel} 실패: ${errMsg || 'Supabase 저장 중 오류가 발생했습니다.'}`;
    setDbErrorNotice(formatted);
    if (dbErrorTimerRef.current) clearTimeout(dbErrorTimerRef.current);
    dbErrorTimerRef.current = setTimeout(() => setDbErrorNotice(null), 7000);
  };

  // Persistent State
  const [problems, setProblems] = useState<ProblemItem[]>(() => {
    return getStoredProblems();
  });

  const [communityQuestions, setCommunityQuestions] = useState<CommunityQuestion[]>(() => {
    return getStoredQuestions();
  });

  const [interestingFacts, setInterestingFacts] = useState<InterestingFactItem[]>(() => {
    return getStoredInterestingFacts();
  });

  const [concepts, setConcepts] = useState<ConceptItem[]>(() => {
    return getStoredConcepts();
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('puleo_user_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clean legacy mock default bookmarks if user had not customized
        if (
          Array.isArray(parsed.bookmarkedProblemIds) &&
          parsed.bookmarkedProblemIds.length === 2 &&
          parsed.bookmarkedProblemIds[0] === 'prob-math-1' &&
          parsed.bookmarkedProblemIds[1] === 'prob-sci-1'
        ) {
          parsed.bookmarkedProblemIds = [];
        }
        return {
          ...DEFAULT_PROFILE,
          ...parsed,
          bookmarkedProblemIds: Array.isArray(parsed.bookmarkedProblemIds) ? parsed.bookmarkedProblemIds : [],
          quizAttempts: Array.isArray(parsed.quizAttempts) ? parsed.quizAttempts : [],
          wrongQuizQuestions: Array.isArray(parsed.wrongQuizQuestions) ? parsed.wrongQuizQuestions : [],
        };
      } catch (e) {
        return DEFAULT_PROFILE;
      }
    }
    return DEFAULT_PROFILE;
  });

  // Initial storage maintenance & IndexedDB hydration
  useEffect(() => {
    cleanLegacyStorageKeys();

    hydrateProblemsFromIndexedDB().then((idbProblems) => {
      if (Array.isArray(idbProblems) && idbProblems.length > 0) {
        setProblems((prev) => {
          // If IndexedDB has items, use them or merge them
          if (prev.length === 0) return idbProblems;
          const map = new Map<string, ProblemItem>();
          idbProblems.forEach((p) => map.set(p.id, p));
          prev.forEach((p) => {
            if (!map.has(p.id)) map.set(p.id, p);
          });
          return Array.from(map.values());
        });
      }
    });
  }, []);

  // Save to local storage on changes
  useEffect(() => {
    saveStoredProblems(problems);
  }, [problems]);

  useEffect(() => {
    saveStoredQuestions(communityQuestions);
  }, [communityQuestions]);

  useEffect(() => {
    saveStoredInterestingFacts(interestingFacts);
  }, [interestingFacts]);

  useEffect(() => {
    saveStoredConcepts(concepts);
  }, [concepts]);

  useEffect(() => {
    safeLocalStorageSet('puleo_user_profile', userProfile);
  }, [userProfile]);

  useEffect(() => {
    safeLocalStorageSet('puleo_is_logged_in', isLoggedIn);
  }, [isLoggedIn]);

  useEffect(() => {
    safeLocalStorageSet('puleo_current_view', currentView);
  }, [currentView]);

  useEffect(() => {
    safeLocalStorageSet('puleo_initial_subject_tab', initialSubjectTab);
  }, [initialSubjectTab]);

  useEffect(() => {
    safeLocalStorageSet('puleo_selected_problem', selectedProblem);
  }, [selectedProblem]);

  // Supabase 클라우드 데이터 실시간 동기화
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;

    async function syncFromCloud() {
      try {
        const diag = await testSupabaseConnection();
        if (diag.status !== 'connected' || !isMounted) {
          return;
        }

        // 1. 회원 계정 동기화 (`users` 테이블)
        await fetchStoredAccountsFromDB();

        // 2. Q&A 질문 & 선생님 답변 동기화 (`questions` + `answers` 테이블)
        const cloudQuestions = await dbFetchCommunityQuestions();
        if (isMounted && Array.isArray(cloudQuestions)) {
          setCommunityQuestions(cloudQuestions);
        }

        // 3. 교과서 문제 동기화 (`textbook_problems` 테이블)
        const cloudProblems = await dbFetchTextbookProblems();
        if (isMounted && Array.isArray(cloudProblems)) {
          setProblems(cloudProblems);
        }
      } catch (err) {
        console.warn('Initial cloud sync error:', err);
      }
    }

    syncFromCloud();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn]);

  const handleLoginSuccess = (profile: UserProfile) => {
    setUserProfile(profile);
    safeLocalStorageSet('puleo_user_profile', profile);
    safeLocalStorageSet('puleo_is_logged_in', true);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    safeLocalStorageSet('puleo_is_logged_in', false);
    safeLocalStorageSet('puleo_current_view', 'home');
    safeLocalStorageSet('puleo_selected_problem', null);
    setIsProfileOpen(false);
    setCurrentView('home');
    setSelectedProblem(null);
  };

  const handleToggleBookmark = (problemId: string) => {
    setUserProfile((prev) => {
      const exists = prev.bookmarkedProblemIds.includes(problemId);
      const updated = exists
        ? prev.bookmarkedProblemIds.filter((id) => id !== problemId)
        : [...prev.bookmarkedProblemIds, problemId];
      return { ...prev, bookmarkedProblemIds: updated };
    });
  };

  const handleSaveAIQuestionResult = (result: AIQuestionResult) => {
    setUserProfile((prev) => ({
      ...prev,
      historyQuestions: [result, ...prev.historyQuestions],
      solvedCount: prev.solvedCount + 1,
    }));
  };

  const handleCompleteQuiz = (attempt: QuizAttemptRecord) => {
    setUserProfile((prev) => {
      const currentAttempts = prev.quizAttempts || [];
      const currentWrong = prev.wrongQuizQuestions || [];

      // Add new attempt record
      const updatedAttempts = [attempt, ...currentAttempts];

      // Remove any previously recorded wrong questions for this quiz that the user now solved correctly
      const newWrongQuestionIds = new Set(attempt.wrongAnswers.map((w) => w.questionId));
      const remainingOldWrong = currentWrong.filter((w) => {
        if (w.quizId === attempt.quizId) {
          // If was wrong in old quiz but now solved correctly, remove it!
          return newWrongQuestionIds.has(w.questionId);
        }
        return true;
      });

      // Replace or prepend newest wrong answers
      const updatedWrong = [
        ...attempt.wrongAnswers,
        ...remainingOldWrong.filter((w) => !newWrongQuestionIds.has(w.questionId)),
      ];

      return {
        ...prev,
        solvedCount: prev.solvedCount + 1,
        quizAttempts: updatedAttempts,
        wrongQuizQuestions: updatedWrong,
      };
    });

    // Supabase 클라우드 DB 저장
    if (isSupabaseConfigured) {
      const activeUserId = userProfile.id || userProfile.loginId || 'user_account_default';
      dbSaveQuizAttempt({
        id: (attempt as any).id,
        userId: activeUserId,
        quizId: attempt.quizId,
        quizTitle: (attempt as any).quizTitle,
        unitName: (attempt as any).unitName,
        subject: (attempt as any).subject,
        score: (attempt as any).score,
        totalQuestions: (attempt as any).totalQuestions,
        percentage: (attempt as any).percentage,
        completedAt: (attempt as any).completedAt,
      }).then((result) => {
        if (!result.success) console.error('퀴즈 기록 DB 저장 실패:', result.error);
      });

      // 오답노트 개별 항목 DB 저장
      attempt.wrongAnswers.forEach((w: any) => {
        dbSaveWrongAnswer(activeUserId, {
          id: w.id,
          quizId: attempt.quizId,
          quizTitle: (attempt as any).quizTitle,
          unitName: (attempt as any).unitName,
          subject: (attempt as any).subject,
          question: w.questionText,
          options: w.options,
          userAnswerIndex: w.userAnswerIndex,
          correctIndex: w.correctIndex,
          explanation: w.explanation,
          hint: w.hint,
          userAttachedPhotos: w.userAttachedPhotos,
          isReviewed: w.isReviewed || false,
        }).then((result) => {
          if (!result.success) console.error('오답 DB 저장 실패:', result.error);
        });
      });
    }
  };

  const handleAddNewProblem = (newProb: ProblemItem, autoOpen = false) => {
    setProblems((prev) => [newProb, ...prev]);
    if (autoOpen) {
      setSelectedProblem(newProb);
    }

    // Supabase 클라우드 DB 저장 (`textbook_problems`)
    if (isSupabaseConfigured) {
      dbSaveTextbookProblem(newProb).then((result) => {
        if (!result.success) {
          console.error('문제 DB 저장 실패:', result.error);
          notifyDbError('문제 저장', result.error);
        } else if (result.problemImageUrl || result.solutionImageUrl) {
          setProblems((prev) =>
            prev.map((p) =>
              p.id === newProb.id
                ? {
                    ...p,
                    problemImage: result.problemImageUrl || p.problemImage,
                    solutionImage: result.solutionImageUrl || p.solutionImage,
                  }
                : p
            )
          );
        }
      });
    }
  };

  const handleAddNewProblems = (newProbs: ProblemItem[]) => {
    if (!newProbs || newProbs.length === 0) return;
    setProblems((prev) => [...newProbs, ...prev]);

    // Supabase 클라우드 DB 저장 (다건)
    if (isSupabaseConfigured) {
      newProbs.forEach((prob) => {
        dbSaveTextbookProblem(prob).then((result) => {
          if (!result.success) {
            console.error('문제 DB 저장 실패:', result.error);
            notifyDbError('문제 일괄 저장', result.error);
          } else if (result.problemImageUrl || result.solutionImageUrl) {
            setProblems((prev) =>
              prev.map((p) =>
                p.id === prob.id
                  ? {
                      ...p,
                      problemImage: result.problemImageUrl || p.problemImage,
                      solutionImage: result.solutionImageUrl || p.solutionImage,
                    }
                  : p
              )
            );
          }
        });
      });
    }
  };

  const handleDeleteProblem = (problemId: string) => {
    setProblems((prev) => prev.filter((p) => p.id !== problemId));
    if (selectedProblem?.id === problemId) {
      setSelectedProblem(null);
    }

    // Supabase 클라우드 DB 삭제
    if (isSupabaseConfigured) {
      dbDeleteTextbookProblem(problemId).then((result) => {
        if (!result.success) {
          console.error('문제 DB 삭제 실패:', result.error);
          notifyDbError('문제 삭제', result.error);
        }
      });
    }
  };

  const handleUpdateProblem = (updatedProblem: ProblemItem) => {
    if (userProfile.role !== 'admin') return;

    setProblems((prev) =>
      prev.map((p) => (p.id === updatedProblem.id ? updatedProblem : p))
    );
    if (selectedProblem?.id === updatedProblem.id) {
      setSelectedProblem(updatedProblem);
    }

    // Supabase 클라우드 DB 수정
    if (isSupabaseConfigured) {
      dbUpdateTextbookProblem(updatedProblem.id, updatedProblem).then((result) => {
        if (!result.success) {
          console.error('문제 DB 수정 실패:', result.error);
          notifyDbError('문제 수정', result.error);
        } else if (result.problemImageUrl || result.solutionImageUrl) {
          setProblems((prev) =>
            prev.map((p) =>
              p.id === updatedProblem.id
                ? {
                    ...p,
                    problemImage: result.problemImageUrl || p.problemImage,
                    solutionImage: result.solutionImageUrl || p.solutionImage,
                  }
                : p
            )
          );
          setSelectedProblem((prev) =>
            prev && prev.id === updatedProblem.id
              ? {
                  ...prev,
                  problemImage: result.problemImageUrl || prev.problemImage,
                  solutionImage: result.solutionImageUrl || prev.solutionImage,
                }
              : prev
          );
        }
      });
    }
  };

  // Interesting Facts Handlers (로컬 저장소 유지)
  const handleAddNewFact = (newFact: InterestingFactItem) => {
    setInterestingFacts((prev) => [newFact, ...prev]);
  };

  const handleDeleteFact = (factId: string) => {
    setInterestingFacts((prev) => prev.filter((f) => f.id !== factId));
  };

  const handleToggleLikeFact = (factId: string) => {
    const activeUserId = userProfile.id || userProfile.loginId || 'user_account_default';

    setInterestingFacts((prev) =>
      prev.map((f) => {
        if (f.id !== factId) return f;
        const currentLikedUsers = Array.isArray(f.likedUserIds) ? f.likedUserIds : [];
        const isAlreadyLiked = currentLikedUsers.includes(activeUserId);

        if (isAlreadyLiked) {
          const updatedUsers = currentLikedUsers.filter((uid) => uid !== activeUserId);
          return {
            ...f,
            likes: Math.max(0, (f.likes || 1) - 1),
            likedUserIds: updatedUsers,
          };
        } else {
          return {
            ...f,
            likes: (f.likes || 0) + 1,
            likedUserIds: [...currentLikedUsers, activeUserId],
          };
        }
      })
    );
  };

  // Concept Notes Handlers (로컬 저장소 유지)
  const handleAddNewConcept = (newConcept: ConceptItem) => {
    setConcepts((prev) => [newConcept, ...prev]);
  };

  const handleDeleteConcept = (conceptId: string) => {
    setConcepts((prev) => prev.filter((c) => c.id !== conceptId));
  };

  const handleToggleLikeConcept = (conceptId: string) => {
    const activeUserId = userProfile.id || userProfile.loginId || 'user_account_default';

    setConcepts((prev) =>
      prev.map((c) => {
        if (c.id !== conceptId) return c;
        const currentLikedUsers = Array.isArray(c.likedUserIds) ? c.likedUserIds : [];
        const isAlreadyLiked = currentLikedUsers.includes(activeUserId);

        if (isAlreadyLiked) {
          const updatedUsers = currentLikedUsers.filter((uid) => uid !== activeUserId);
          return {
            ...c,
            likes: Math.max(0, (c.likes || 1) - 1),
            likedUserIds: updatedUsers,
          };
        } else {
          return {
            ...c,
            likes: (c.likes || 0) + 1,
            likedUserIds: [...currentLikedUsers, activeUserId],
          };
        }
      })
    );
  };

  // Community Questions Handlers (`questions` & `answers` 테이블)
  const handleAddCommunityQuestion = (newQ: CommunityQuestion) => {
    setCommunityQuestions((prev) => [newQ, ...prev]);

    if (isSupabaseConfigured) {
      dbSaveCommunityQuestion(newQ).then((result) => {
        if (!result.success) {
          console.error('질문 DB 저장 실패:', result.error);
          notifyDbError('질문 등록', result.error);
        } else if (result.imageUrl) {
          setCommunityQuestions((prev) =>
            prev.map((q) => (q.id === newQ.id ? { ...q, imageUrl: result.imageUrl } : q))
          );
        }
      });
    }
  };

  const handleAnswerCommunityQuestion = (questionId: string, answer: TeacherAnswer) => {
    setCommunityQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              status: 'answered',
              teacherAnswer: answer,
            }
          : q
      )
    );

    if (isSupabaseConfigured) {
      dbAnswerCommunityQuestion(questionId, answer).then((result) => {
        if (!result.success) {
          console.error('선생님 답변 DB 저장 실패:', result.error);
          notifyDbError('선생님 답변 저장', result.error);
        } else if (result.solutionImageUrl) {
          setCommunityQuestions((prev) =>
            prev.map((q) =>
              q.id === questionId && q.teacherAnswer
                ? {
                    ...q,
                    teacherAnswer: {
                      ...q.teacherAnswer,
                      imageUrl: result.solutionImageUrl,
                    },
                  }
                : q
            )
          );
        }
      });
    }
  };

  const handleDeleteCommunityQuestion = (questionId: string) => {
    setCommunityQuestions((prev) => prev.filter((q) => q.id !== questionId));

    if (isSupabaseConfigured) {
      dbDeleteCommunityQuestion(questionId).then((result) => {
        if (!result.success) {
          console.error('질문 DB 삭제 실패:', result.error);
          notifyDbError('질문 삭제', result.error);
        }
      });
    }
  };

  const handleToggleLikeCommunityQuestion = (questionId: string, increment: boolean) => {
    setCommunityQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, likes: Math.max(0, (q.likes || 0) + (increment ? 1 : -1)) }
          : q
      )
    );

    if (isSupabaseConfigured) {
      dbToggleLikeCommunityQuestion(questionId, increment).then((result) => {
        if (!result.success) console.error('질문 좋아요 DB 저장 실패:', result.error);
      });
    }
  };

  const handleAskAIAboutSpecificProblem = (problem: ProblemItem) => {
    setProblemForAI(problem);
    setSelectedProblem(null);
    setIsAskQuestionOpen(true);
  };

  const handleSelectHistoryQuestion = (historyItem: AIQuestionResult) => {
    setProblemForAI(null);
    setIsAskQuestionOpen(true);
  };

  const waitingCount = communityQuestions.filter((q) => q.status === 'waiting').length;

  // View navigation helper with browser history pushState
  const navigateToView = (view: 'home' | 'math' | 'science' | 'wrong-answers' | 'qna') => {
    safeLocalStorageSet('puleo_current_view', view);
    if (view === currentView) return;
    try {
      window.history.pushState({ puleoRoot: true, puleoView: view, timestamp: Date.now() }, '', `#${view}`);
    } catch {
      // safe fallback
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  };

  // Immediate, unconditional navigation to Home
  const handleGoHome = () => {
    // 1. Close all active modals & reset active problem
    setSelectedProblem(null);
    setIsAskQuestionOpen(false);
    setIsProfileOpen(false);
    setProblemForAI(null);

    // 2. Persist view state
    safeLocalStorageSet('puleo_current_view', 'home');
    safeLocalStorageSet('puleo_selected_problem', null);

    // 3. Push clean home state to browser history
    try {
      window.history.pushState({ puleoRoot: true, puleoView: 'home', step: 1, timestamp: Date.now() }, '', '#home');
    } catch {
      // safe fallback
    }

    // 4. Directly update current view
    setCurrentView('home');

    // 5. Scroll to top instantly
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  };

  // Synchronize browser forward/back buttons with views and exit guard
  useEffect(() => {
    if (!isLoggedIn) return;

    // Check initial hash on load
    const currentHash = window.location.hash.replace('#', '');
    const validViews: Array<'home' | 'math' | 'science' | 'qna'> = [
      'home', 'math', 'science', 'qna'
    ];

    let startView = currentView;
    if (validViews.includes(currentHash as any)) {
      startView = currentHash as any;
      if (startView !== currentView) {
        setCurrentView(startView);
      }
    }

    // Initialize history baseline with exit guard
    if (!window.history.state || !window.history.state.puleoRoot) {
      window.history.replaceState({ puleoRoot: true, puleoExitGuard: true, step: 0 }, '', '#guard');
      window.history.pushState({ puleoRoot: true, puleoView: startView, step: 1 }, '', `#${startView}`);
    }

    const handlePopState = (e: PopStateEvent) => {
      // 1. Check if user pressed Back while at base/Home guard
      if (e.state?.puleoExitGuard) {
        if (exitWarningTimerRef.current) {
          // Pressed back twice quickly -> allow closing/exiting
          clearTimeout(exitWarningTimerRef.current);
          exitWarningTimerRef.current = null;
          window.history.back();
          return;
        }

        // Show friendly toast informing user they are on home
        setShowExitToast(true);
        // Re-push home to keep the app safely open
        window.history.pushState({ puleoRoot: true, puleoView: 'home', step: 1 }, '', '#home');
        setCurrentView('home');

        exitWarningTimerRef.current = setTimeout(() => {
          setShowExitToast(false);
          exitWarningTimerRef.current = null;
        }, 2500);
        return;
      }

      // 2. View transitions
      const targetView = e.state?.puleoView;
      if (targetView && validViews.includes(targetView)) {
        setCurrentView(targetView);
      } else if (!targetView && !e.state?.puleoModal && !e.state?.puleoExitGuard) {
        setCurrentView('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isLoggedIn, currentView]);

  // If not logged in, display the Login Screen first
  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="puleo-dream-app" className="min-h-screen bg-[#F8F5EE] bg-[radial-gradient(#E8DFCA_1px,transparent_1px)] [background-size:24px_24px] text-slate-800 flex flex-col justify-between selection:bg-amber-200">
      <main className="flex-1 w-full flex flex-col items-center justify-start py-2 sm:py-4">
        <AnimatePresence mode="wait">
          {currentView === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <HomeScreen
                onSelectMath={() => navigateToView('math')}
                onSelectScience={() => navigateToView('science')}
                onSelectAskQuestion={() => {
                  setProblemForAI(null);
                  setIsAskQuestionOpen(true);
                }}
                onSelectQnA={() => navigateToView('qna')}
                onOpenProfile={() => setIsProfileOpen(true)}
                onLogout={handleLogout}
                userRole={userProfile.role}
                solvedCount={userProfile.solvedCount}
                waitingQuestionsCount={waitingCount}
              />
            </motion.div>
          )}

          {currentView === 'qna' && (
            <motion.div
              key="qna"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <CommunityQnAView
                userProfile={userProfile}
                questions={communityQuestions}
                onGoBack={handleGoHome}
                onAddQuestion={handleAddCommunityQuestion}
                onAnswerQuestion={handleAnswerCommunityQuestion}
                onDeleteQuestion={userProfile.role === 'admin' ? handleDeleteCommunityQuestion : undefined}
                onToggleLikeQuestion={handleToggleLikeCommunityQuestion}
              />
            </motion.div>
          )}

          {currentView === 'math' && (
            <motion.div
              key="math"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <TextbookMasterView
                subject="math"
                textbooks={TEXTBOOKS}
                problems={problems}
                bookmarkedProblemIds={userProfile.bookmarkedProblemIds}
                userRole={userProfile.role}
                currentUserId={userProfile.id || userProfile.loginId || 'user_account_default'}
                concepts={concepts}
                initialTab={initialSubjectTab}
                onSelectProblem={(prob) => setSelectedProblem(prob)}
                onGoBack={handleGoHome}
                onAddNewProblem={handleAddNewProblem}
                onAddNewProblems={handleAddNewProblems}
                onUpdateProblem={userProfile.role === 'admin' ? handleUpdateProblem : undefined}
                onDeleteProblem={userProfile.role === 'admin' ? handleDeleteProblem : undefined}
                onAddNewConcept={handleAddNewConcept}
                onDeleteConcept={handleDeleteConcept}
                onToggleLikeConcept={handleToggleLikeConcept}
              />
            </motion.div>
          )}

          {currentView === 'science' && (
            <motion.div
              key="science"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <TextbookMasterView
                subject="science"
                textbooks={TEXTBOOKS}
                problems={problems}
                bookmarkedProblemIds={userProfile.bookmarkedProblemIds}
                userRole={userProfile.role}
                currentUserId={userProfile.id || userProfile.loginId || 'user_account_default'}
                concepts={concepts}
                initialTab={initialSubjectTab}
                onSelectProblem={(prob) => setSelectedProblem(prob)}
                onGoBack={handleGoHome}
                onAddNewProblem={handleAddNewProblem}
                onAddNewProblems={handleAddNewProblems}
                onUpdateProblem={userProfile.role === 'admin' ? handleUpdateProblem : undefined}
                onDeleteProblem={userProfile.role === 'admin' ? handleDeleteProblem : undefined}
                onAddNewConcept={handleAddNewConcept}
                onDeleteConcept={handleDeleteConcept}
                onToggleLikeConcept={handleToggleLikeConcept}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Problem Detail Modal */}
      <AnimatePresence>
        {selectedProblem && (
          <ProblemDetailModal
            problem={selectedProblem}
            textbook={TEXTBOOKS.find((tb) => tb.id === selectedProblem.textbookId)}
            isBookmarked={userProfile.bookmarkedProblemIds.includes(selectedProblem.id)}
            userRole={userProfile.role}
            onToggleBookmark={handleToggleBookmark}
            onClose={() => setSelectedProblem(null)}
            onGoHome={handleGoHome}
            onAskAIAboutProblem={handleAskAIAboutSpecificProblem}
            onDeleteProblem={userProfile.role === 'admin' ? handleDeleteProblem : undefined}
            onUpdateProblem={userProfile.role === 'admin' ? handleUpdateProblem : undefined}
          />
        )}
      </AnimatePresence>

      {/* Ask Question (Camera / Photo / Text AI Solver) Modal */}
      <AnimatePresence>
        {isAskQuestionOpen && (
          <AskQuestionModal
            initialProblem={problemForAI}
            userProfile={userProfile}
            onClose={() => {
              setIsAskQuestionOpen(false);
              setProblemForAI(null);
            }}
            onSaveToHistory={handleSaveAIQuestionResult}
            onPostToCommunity={handleAddCommunityQuestion}
          />
        )}
      </AnimatePresence>

      {/* User Profile & Bookmarks Modal */}
      <AnimatePresence>
        {isProfileOpen && (
          <UserProfileModal
            userProfile={userProfile}
            problems={problems}
            onUpdateProfile={(updated) => setUserProfile((prev) => ({ ...prev, ...updated }))}
            onSelectProblem={(prob) => setSelectedProblem(prob)}
            onSelectHistoryQuestion={handleSelectHistoryQuestion}
            onLogout={handleLogout}
            onClose={() => setIsProfileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Cloud DB Error Notice Banner */}
      <AnimatePresence>
        {dbErrorNotice && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92vw] px-4 py-3 bg-rose-950/95 backdrop-blur-md text-rose-100 text-xs sm:text-sm font-semibold rounded-2xl shadow-2xl flex items-start justify-between gap-3 border border-rose-500/40"
          >
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 mt-1.5 rounded-full bg-rose-400 shrink-0 animate-pulse"></span>
              <span>{dbErrorNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setDbErrorNotice(null)}
              className="text-rose-300 hover:text-white text-xs font-bold shrink-0 px-1.5 py-0.5 rounded bg-rose-900/60"
            >
              닫기
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Home Exit Guard Toast Banner */}
      <AnimatePresence>
        {showExitToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900/90 backdrop-blur-md text-white text-xs sm:text-sm font-bold rounded-full shadow-2xl flex items-center gap-2 border border-white/20 pointer-events-none"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>홈 화면입니다. 한 번 더 뒤로가기를 누르면 사이트에서 나갑니다.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}