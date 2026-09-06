import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TEXTBOOKS, getStoredProblems, saveStoredProblems, hydrateProblemsFromIndexedDB } from './data/mockTextbooks';
import { getStoredQuestions, saveStoredQuestions } from './data/mockCommunityQuestions';
import { getStoredInterestingFacts, saveStoredInterestingFacts } from './data/mockInterestingFacts';
import { getStoredConcepts, saveStoredConcepts } from './data/mockConcepts';
import { ProblemItem, TextbookInfo, UserProfile, AIQuestionResult, CommunityQuestion, TeacherAnswer, InterestingFactItem, QuizAttemptRecord, ConceptItem } from './types';
import { getStoredAccounts, fetchStoredAccountsFromDB } from './services/authService';
import {
  dbFetchCommunityQuestions,
  dbFetchTextbookProblems,
  dbFetchInterestingFacts,
  dbSaveCommunityQuestion,
  dbAnswerCommunityQuestion,
  dbDeleteCommunityQuestion,
  dbSaveTextbookProblem,
  dbUpdateTextbookProblem,
  dbDeleteTextbookProblem,
  dbSaveInterestingFact,
  dbDeleteInterestingFact,
  dbToggleLikeInterestingFact,
  dbSaveConcept,
  dbDeleteConcept,
  dbToggleLikeConcept,
  dbSaveQuizAttempt,
  dbSaveWrongAnswer,
} from './services/dbService';
import { isSupabaseConfigured, testSupabaseConnection } from './supabaseClient';
import { cleanLegacyStorageKeys, safeLocalStorageSet } from './services/storageService';
import { HomeScreen } from './components/HomeScreen';
import { TextbookMasterView } from './components/TextbookMasterView';
import { ProblemDetailModal } from './components/ProblemDetailModal';
import { AskQuestionModal } from './components/AskQuestionModal';
import { UserProfileModal } from './components/UserProfileModal';
import { CommunityQnAView } from './components/CommunityQnAView';
import { WrongAnswersNoteView } from './components/WrongAnswersNoteView';
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
    const savedLogin = localStorage.getItem('puleo_is_logged_in');
    return savedLogin === 'true';
  });

  const [currentView, setCurrentView] = useState<'home' | 'math' | 'science' | 'wrong-answers' | 'qna'>('home');
  const [initialSubjectTab, setInitialSubjectTab] = useState<'problems' | 'concepts' | 'facts' | 'unit_tests'>('problems');
  const [selectedProblem, setSelectedProblem] = useState<ProblemItem | null>(null);
  const [isAskQuestionOpen, setIsAskQuestionOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [problemForAI, setProblemForAI] = useState<ProblemItem | null>(null);

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
    safeLocalStorageSet('puleo_is_logged_in', isLoggedIn ? 'true' : 'false');
  }, [isLoggedIn]);

  // Supabase 클라우드 데이터 실시간 동기화
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;

    async function syncFromCloud() {
      try {
        // 클라우드 DB 연결 가능 여부 선제 확인 (URL 미등록 또는 네트워크 실패 시 불필요한 요청 방지)
        const diag = await testSupabaseConnection();
        if (diag.status !== 'connected' || !isMounted) {
          return;
        }

        // 1. 회원 계정 동기화 (클라우드에 있는 회원 정보 가져와 로컬 캐시 갱신)
        await fetchStoredAccountsFromDB();

        // 2. 커뮤니티 질문 동기화
        const cloudQuestions = await dbFetchCommunityQuestions();
        if (isMounted && Array.isArray(cloudQuestions) && cloudQuestions.length > 0) {
          const mapped: CommunityQuestion[] = cloudQuestions.map((q: any) => ({
            id: String(q.id),
            authorId: q.author_id,
            authorName: q.author_name,
            authorRole: q.author_role || 'student',
            authorSchool: q.author_school,
            authorGrade: q.author_grade,
            subject: q.subject,
            textbookRef: q.textbook_ref,
            title: q.title,
            content: q.content,
            imageUrl: q.image_url,
            createdAt: q.created_at,
            status: q.status || 'waiting',
            likes: q.likes || 0,
            teacherAnswer: q.teacher_answer,
          }));
          setCommunityQuestions(mapped);
        }

        // 3. 교과서 문제 동기화
        const cloudProblems = await dbFetchTextbookProblems();
        if (isMounted && Array.isArray(cloudProblems) && cloudProblems.length > 0) {
          const mapped: ProblemItem[] = cloudProblems.map((p: any) => ({
            id: String(p.id),
            textbookId: p.textbook_id || 'high1-math-miraen',
            subject: p.subject || 'math',
            grade: p.grade || 'high_1',
            chapter: p.chapter || '',
            unitNumber: p.unit_number || '1',
            unitName: p.unit_name || '',
            subUnitId: p.sub_unit_id || 'unit-1',
            unitCode: p.unit_code || 'unit-1',
            pageNumber: p.page_number || 1,
            problemNumber: p.problem_number || '1',
            problemType: p.problem_type || '예제',
            difficulty: p.difficulty || '보통',
            problemText: p.problem_text || '',
            solutionSteps: p.solution_steps || [],
            finalAnswer: p.final_answer || '',
            coreConcepts: p.core_concepts || [],
            dreamTip: p.dream_tip || '',
            solutionImage: p.solution_image || undefined,
            peerTips: p.peer_tips || [],
            studentSolutions: p.student_solutions || [],
            views: p.views || 1,
            likes: p.likes || 0,
          }));
          setProblems((prev) => {
            // Merge cloud problems with existing ones without duplicating
            const existingIds = new Set(mapped.map((m) => m.id));
            const remaining = prev.filter((item) => !existingIds.has(item.id));
            return [...mapped, ...remaining];
          });
        }

        // 4. 흥미로운 사실 포스터 동기화
        const cloudFacts = await dbFetchInterestingFacts();
        if (isMounted && Array.isArray(cloudFacts) && cloudFacts.length > 0) {
          const mapped: InterestingFactItem[] = cloudFacts.map((f: any) => ({
            id: String(f.id),
            subject: f.subject,
            title: f.title,
            subtitle: f.subtitle,
            category: f.category,
            content: f.content,
            posterImage: f.poster_image,
            authorName: f.author_name || '선생님 공식 포스터',
            tags: f.tags || [],
            likes: f.likes || 0,
            likedUserIds: f.liked_user_ids || [],
            bgGradient: f.bg_gradient,
            createdAt: f.created_at,
          }));
          setInterestingFacts(mapped);
        }
      } catch (err) {
        console.warn('Initial cloud sync error:', err);
      }
    }

    syncFromCloud();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = (profile: UserProfile) => {
    setUserProfile(profile);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsProfileOpen(false);
    setCurrentView('home');
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

    // Supabase 클라우드 DB 저장
    if (isSupabaseConfigured) {
      dbSaveTextbookProblem(newProb).then((result) => {
        if (!result.success) console.error('문제 DB 저장 실패:', result.error);
      });
    }
  };

  const handleAddNewProblems = (newProbs: ProblemItem[]) => {
    if (!newProbs || newProbs.length === 0) return;
    setProblems((prev) => [...newProbs, ...prev]);

    // Supabase 클라우드 DB 저장 (다건)
    if (isSupabaseConfigured) {
      newProbs.forEach((p) => {
        dbSaveTextbookProblem(p).then((result) => {
          if (!result.success) console.error('문제 DB 저장 실패:', result.error);
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
        if (!result.success) console.error('문제 DB 삭제 실패:', result.error);
      });
    }
  };

  const handleUpdateProblem = (updatedProblem: ProblemItem) => {
    setProblems((prev) =>
      prev.map((p) => (p.id === updatedProblem.id ? updatedProblem : p))
    );
    if (selectedProblem?.id === updatedProblem.id) {
      setSelectedProblem(updatedProblem);
    }

    // Supabase 클라우드 DB 수정
    if (isSupabaseConfigured) {
      dbUpdateTextbookProblem(updatedProblem.id, updatedProblem).then((result) => {
        if (!result.success) console.error('문제 DB 수정 실패:', result.error);
      });
    }
  };

  // Interesting Facts Handlers (Admin creates/deletes, 1 like per user account)
  const handleAddNewFact = (newFact: InterestingFactItem) => {
    setInterestingFacts((prev) => [newFact, ...prev]);

    // Supabase 클라우드 DB 저장
    if (isSupabaseConfigured) {
      dbSaveInterestingFact(newFact).then((result) => {
        if (!result.success) console.error('포스터 DB 저장 실패:', result.error);
      });
    }
  };

  const handleDeleteFact = (factId: string) => {
    setInterestingFacts((prev) => prev.filter((f) => f.id !== factId));

    // Supabase 클라우드 DB 삭제
    if (isSupabaseConfigured) {
      dbDeleteInterestingFact(factId).then((result) => {
        if (!result.success) console.error('포스터 DB 삭제 실패:', result.error);
      });
    }
  };

  const handleToggleLikeFact = (factId: string) => {
    const activeUserId = userProfile.id || userProfile.loginId || 'user_account_default';
    let wasLiked = false;

    setInterestingFacts((prev) =>
      prev.map((f) => {
        if (f.id !== factId) return f;
        const currentLikedUsers = Array.isArray(f.likedUserIds) ? f.likedUserIds : [];
        const isAlreadyLiked = currentLikedUsers.includes(activeUserId);
        wasLiked = isAlreadyLiked;

        if (isAlreadyLiked) {
          // Unlike (1 like per account toggle off)
          const updatedUsers = currentLikedUsers.filter((uid) => uid !== activeUserId);
          return {
            ...f,
            likes: Math.max(0, (f.likes || 1) - 1),
            likedUserIds: updatedUsers,
          };
        } else {
          // Like (add user ID)
          return {
            ...f,
            likes: (f.likes || 0) + 1,
            likedUserIds: [...currentLikedUsers, activeUserId],
          };
        }
      })
    );

    // Supabase 클라우드 DB 저장
    if (isSupabaseConfigured) {
      dbToggleLikeInterestingFact(factId, activeUserId, wasLiked).then((result) => {
        if (!result.success) console.error('포스터 좋아요 DB 저장 실패:', result.error);
      });
    }
  };

  // Concept Notes Handlers (Admin creates/deletes, 1 like per user account)
  const handleAddNewConcept = (newConcept: ConceptItem) => {
    setConcepts((prev) => [newConcept, ...prev]);

    // Supabase 클라우드 DB 저장
    if (isSupabaseConfigured) {
      dbSaveConcept(newConcept).then((result) => {
        if (!result.success) console.error('개념 DB 저장 실패:', result.error);
      });
    }
  };

  const handleDeleteConcept = (conceptId: string) => {
    setConcepts((prev) => prev.filter((c) => c.id !== conceptId));

    // Supabase 클라우드 DB 삭제
    if (isSupabaseConfigured) {
      dbDeleteConcept(conceptId).then((result) => {
        if (!result.success) console.error('개념 DB 삭제 실패:', result.error);
      });
    }
  };

  const handleToggleLikeConcept = (conceptId: string) => {
    const activeUserId = userProfile.id || userProfile.loginId || 'user_account_default';
    let wasLiked = false;

    setConcepts((prev) =>
      prev.map((c) => {
        if (c.id !== conceptId) return c;
        const currentLikedUsers = Array.isArray(c.likedUserIds) ? c.likedUserIds : [];
        const isAlreadyLiked = currentLikedUsers.includes(activeUserId);
        wasLiked = isAlreadyLiked;

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

    // Supabase 클라우드 DB 저장
    if (isSupabaseConfigured) {
      dbToggleLikeConcept(conceptId, activeUserId, wasLiked).then((result) => {
        if (!result.success) console.error('개념 좋아요 DB 저장 실패:', result.error);
      });
    }
  };

  // Community Questions Handlers
  const handleAddCommunityQuestion = (newQ: CommunityQuestion) => {
    setCommunityQuestions((prev) => [newQ, ...prev]);

    // Supabase 클라우드 DB 저장
    if (isSupabaseConfigured) {
      dbSaveCommunityQuestion(newQ).then((result) => {
        if (!result.success) console.error('커뮤니티 질문 DB 저장 실패:', result.error);
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

    // Supabase 클라우드 DB 저장
    if (isSupabaseConfigured) {
      dbAnswerCommunityQuestion(questionId, answer).then((result) => {
        if (!result.success) console.error('선생님 답변 DB 저장 실패:', result.error);
      });
    }
  };

  const handleDeleteCommunityQuestion = (questionId: string) => {
    setCommunityQuestions((prev) => prev.filter((q) => q.id !== questionId));

    // Supabase 클라우드 DB 삭제
    if (isSupabaseConfigured) {
      dbDeleteCommunityQuestion(questionId).then((result) => {
        if (!result.success) console.error('커뮤니티 질문 DB 삭제 실패:', result.error);
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
                onSelectMath={() => setCurrentView('math')}
                onSelectScience={() => setCurrentView('science')}
                onSelectWrongAnswers={() => setCurrentView('wrong-answers')}
                onSelectAskQuestion={() => {
                  setProblemForAI(null);
                  setIsAskQuestionOpen(true);
                }}
                onSelectQnA={() => setCurrentView('qna')}
                onOpenProfile={() => setIsProfileOpen(true)}
                onLogout={handleLogout}
                userRole={userProfile.role}
                solvedCount={userProfile.solvedCount}
                waitingQuestionsCount={waitingCount}
                wrongQuestionsCount={userProfile.wrongQuizQuestions?.length || 0}
                unreviewedWrongCount={(userProfile.wrongQuizQuestions || []).filter((q) => !q.isReviewed).length}
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
                onGoBack={() => setCurrentView('home')}
                onAddQuestion={handleAddCommunityQuestion}
                onAnswerQuestion={handleAnswerCommunityQuestion}
                onDeleteQuestion={userProfile.role === 'admin' ? handleDeleteCommunityQuestion : undefined}
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
                facts={interestingFacts}
                concepts={concepts}
                initialTab={initialSubjectTab}
                onSelectProblem={(prob) => setSelectedProblem(prob)}
                onGoBack={() => setCurrentView('home')}
                onAddNewProblem={handleAddNewProblem}
                onAddNewProblems={handleAddNewProblems}
                onDeleteProblem={handleDeleteProblem}
                onUpdateProblem={handleUpdateProblem}
                onAddNewFact={handleAddNewFact}
                onDeleteFact={handleDeleteFact}
                onToggleLikeFact={handleToggleLikeFact}
                onAddNewConcept={handleAddNewConcept}
                onDeleteConcept={handleDeleteConcept}
                onToggleLikeConcept={handleToggleLikeConcept}
                onCompleteQuiz={handleCompleteQuiz}
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
                facts={interestingFacts}
                concepts={concepts}
                initialTab={initialSubjectTab}
                onSelectProblem={(prob) => setSelectedProblem(prob)}
                onGoBack={() => setCurrentView('home')}
                onAddNewProblem={handleAddNewProblem}
                onAddNewProblems={handleAddNewProblems}
                onDeleteProblem={handleDeleteProblem}
                onUpdateProblem={handleUpdateProblem}
                onAddNewFact={handleAddNewFact}
                onDeleteFact={handleDeleteFact}
                onToggleLikeFact={handleToggleLikeFact}
                onAddNewConcept={handleAddNewConcept}
                onDeleteConcept={handleDeleteConcept}
                onToggleLikeConcept={handleToggleLikeConcept}
                onCompleteQuiz={handleCompleteQuiz}
              />
            </motion.div>
          )}

          {currentView === 'wrong-answers' && (
            <motion.div
              key="wrong-answers"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <WrongAnswersNoteView
                userProfile={userProfile}
                onUpdateProfile={(updated) => setUserProfile((prev) => ({ ...prev, ...updated }))}
                onGoBack={() => setCurrentView('home')}
                onNavigateToSubject={(subj, tab) => {
                  setInitialSubjectTab(tab || (subj === 'science' ? 'concepts' : 'problems'));
                  setCurrentView(subj);
                }}
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
            onAskAIAboutProblem={handleAskAIAboutSpecificProblem}
            onDeleteProblem={userProfile.role === 'admin' ? handleDeleteProblem : undefined}
            onUpdateProblem={handleUpdateProblem}
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
            onOpenWrongAnswersNote={() => {
              setIsProfileOpen(false);
              setCurrentView('wrong-answers');
            }}
            onLogout={handleLogout}
            onClose={() => setIsProfileOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}