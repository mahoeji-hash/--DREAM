import { supabase } from '../supabaseClient';

// ==========================================
// 1. 교과서 문제 (Textbook Problems) DB 연동
// ==========================================

export async function dbSaveTextbookProblem(problem: any) {
  const { data, error } = await supabase.from('textbook_problems').insert([
    {
      textbook_id: problem.textbookId || '',
      subject: problem.subject || '',
      grade: problem.grade || '',
      chapter: problem.chapter || '',
      unit_number: problem.unitNumber || '',
      unit_name: problem.unitName || '',
      sub_unit_id: problem.subUnitId || '',
      unit_code: problem.unitCode || '',
      page_number: problem.pageNumber || 1,
      problem_number: problem.problemNumber || '',
      problem_type: problem.problemType || '',
      difficulty: problem.difficulty || '보통',
      problem_text: problem.problemText || '',
      solution_steps: problem.solutionSteps || [],
      final_answer: problem.finalAnswer || '',
      core_concepts: problem.coreConcepts || [],
      dream_tip: problem.dreamTip || '',
      solution_image: problem.solutionImage || null,
      views: problem.views || 1,
      likes: problem.likes || 0,
    },
  ]).select();

  if (error) {
    console.warn('교과서 문제 DB 저장 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function dbFetchTextbookProblems() {
  const { data, error } = await supabase
    .from('textbook_problems')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.warn('교과서 문제 DB 불러오기 오류:', error);
    return [];
  }
  return data || [];
}

// ==========================================
// 2. Q&A 게시판 (QnA Questions) DB 연동
// ==========================================

export async function dbSaveQnaQuestion(qna: {
  userName: string;
  title: string;
  content: string;
  subject: string;
  imageUrl?: string;
}) {
  const { data, error } = await supabase.from('qna_questions').insert([
    {
      user_name: qna.userName,
      title: qna.title,
      content: qna.content,
      subject: qna.subject,
      status: '답변대기',
      image_url: qna.imageUrl || '',
    },
  ]).select();

  if (error) {
    console.warn('Q&A 저장 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function dbFetchQnaQuestions() {
  const { data, error } = await supabase
    .from('qna_questions')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.warn('Q&A 불러오기 오류:', error);
    return [];
  }
  return data || [];
}

export async function dbUpdateQnaAnswer(id: number, answerContent: string) {
  const { data, error } = await supabase
    .from('qna_questions')
    .update({
      answer_content: answerContent,
      status: '답변완료',
    })
    .eq('id', id)
    .select();

  if (error) {
    console.warn('Q&A 답변 저장 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

// ==========================================
// 3. 포스터 / 게시글 (Posters) DB 연동
// ==========================================

export async function dbSavePoster(poster: {
  title: string;
  content: string;
  imageUrl?: string;
  author?: string;
  category?: string;
}) {
  const { data, error } = await supabase.from('posters').insert([
    {
      title: poster.title,
      content: poster.content,
      image_url: poster.imageUrl || '',
      author: poster.author || '관리자',
      category: poster.category || '일반',
    },
  ]).select();

  if (error) {
    console.warn('포스터 DB 저장 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function dbFetchPosters() {
  const { data, error } = await supabase
    .from('posters')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.warn('포스터 불러오기 오류:', error);
    return [];
  }
  return data || [];
}

// ==========================================
// 4. 단원평가 문제 (Test Questions) DB 연동
// ==========================================

export async function dbSaveTestQuestion(test: {
  clientId: string;
  subject: string;
  unitCode: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint?: string;
  questionImage?: string;
  explanationImage?: string;
}) {
  const { data, error } = await supabase.from('test_questions').insert([
    {
      client_id: test.clientId,
      subject: test.subject,
      unit_code: test.unitCode,
      question_text: test.questionText,
      options: test.options,
      correct_answer: test.options[test.correctIndex] || '',
      correct_index: test.correctIndex,
      explanation: test.explanation,
      hint: test.hint || null,
      question_image: test.questionImage || null,
      explanation_image: test.explanationImage || null,
    },
  ]).select();

  if (error) {
    console.warn('단원평가 DB 저장 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function dbDeleteTestQuestion(clientId: string) {
  const { error } = await supabase
    .from('test_questions')
    .delete()
    .eq('client_id', clientId);

  if (error) {
    console.warn('단원평가 문제 삭제 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function dbFetchTestQuestions() {
  const { data, error } = await supabase
    .from('test_questions')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.warn('단원평가 불러오기 오류:', error);
    return [];
  }
  return data || [];
}

// ==========================================
// 5. 교과서 문제 DB 연동 (Textbook Questions)
// ==========================================

export interface TextbookQuestionInput {
  subject: 'math' | 'science';
  textbookName: string;
  publisher?: string;
  unitCode: string;
  unitName?: string;
  pageNumber?: number;
  problemNumber?: number;
  title: string;
  questionText: string;
  imageUrl?: string;
  solutionSteps?: Array<{
    stepNumber: number;
    title: string;
    explanation: string;
    formulaOrKey?: string;
  }>;
  finalAnswer?: string;
  teacherTip?: string;
}

export async function dbSaveTextbookQuestion(item: TextbookQuestionInput) {
  const { data, error } = await supabase.from('textbook_questions').insert([
    {
      subject: item.subject,
      textbook_name: item.textbookName,
      publisher: item.publisher,
      unit_code: item.unitCode,
      unit_name: item.unitName,
      page_number: item.pageNumber,
      problem_number: item.problemNumber,
      title: item.title,
      question_text: item.questionText,
      image_url: item.imageUrl,
      solution_steps: item.solutionSteps,
      final_answer: item.finalAnswer,
      teacher_tip: item.teacherTip,
    },
  ]).select();

  if (error) {
    console.warn('교과서 문제 DB 저장 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function dbFetchTextbookQuestions() {
  const { data, error } = await supabase
    .from('textbook_questions')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.warn('교과서 문제 불러오기 오류:', error);
    return [];
  }
  return data || [];
}

export async function dbFetchTextbookQuestionsByUnit(subject?: string, unitCode?: string) {
  let query = supabase.from('textbook_questions').select('*');

  if (subject && subject !== 'all') {
    query = query.eq('subject', subject);
  }
  if (unitCode) {
    query = query.eq('unit_code', unitCode);
  }

  const { data, error } = await query.order('page_number', { ascending: true });

  if (error) {
    console.warn('단원별 교과서 문제 불러오기 오류:', error);
    return [];
  }
  return data || [];
}

export async function dbDeleteTextbookQuestion(id: number | string) {
  const { error } = await supabase
    .from('textbook_questions')
    .delete()
    .eq('id', id);

  if (error) {
    console.warn('교과서 문제 삭제 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ==========================================
// 6. 커뮤니티 질문 (Community Questions) DB 연동
// ==========================================

export async function dbSaveCommunityQuestion(question: any) {
  const { data, error } = await supabase.from('community_questions').insert([
    {
      author_id: question.authorId,
      author_name: question.authorName,
      author_role: question.authorRole,
      author_school: question.authorSchool,
      author_grade: question.authorGrade,
      subject: question.subject,
      textbook_ref: question.textbookRef || null,
      title: question.title,
      content: question.content,
      image_url: question.imageUrl || null,
      status: 'waiting',
      likes: 0,
    },
  ]).select();

  if (error) {
    console.warn('커뮤니티 질문 DB 저장 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function dbFetchCommunityQuestions() {
  const { data, error } = await supabase
    .from('community_questions')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.warn('커뮤니티 질문 불러오기 오류:', error);
    return [];
  }
  return data || [];
}

export async function dbAnswerCommunityQuestion(questionId: string, answer: any) {
  const { data, error } = await supabase
    .from('community_questions')
    .update({
      status: 'answered',
      teacher_answer: answer,
    })
    .eq('id', questionId)
    .select();

  if (error) {
    console.warn('선생님 답변 저장 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function dbDeleteCommunityQuestion(questionId: string) {
  const { error } = await supabase
    .from('community_questions')
    .delete()
    .eq('id', questionId);

  if (error) {
    console.warn('커뮤니티 질문 삭제 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function dbToggleLikeCommunityQuestion(questionId: string, increment: boolean) {
  const { data: current } = await supabase
    .from('community_questions')
    .select('likes')
    .eq('id', questionId)
    .single();

  const newLikes = Math.max(0, (current?.likes || 0) + (increment ? 1 : -1));

  const { error } = await supabase
    .from('community_questions')
    .update({ likes: newLikes })
    .eq('id', questionId);

  if (error) {
    console.warn('좋아요 업데이트 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
// ==========================================
// 7. 흥미로운 사실 포스터 (Interesting Facts) DB 연동
// ==========================================

export async function dbFetchInterestingFacts() {
  const { data, error } = await supabase
    .from('interesting_facts')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.warn('흥미로운 사실 불러오기 오류:', error);
    return [];
  }
  return data || [];
}

export async function dbSaveInterestingFact(fact: any) {
  const { data, error } = await supabase.from('interesting_facts').insert([
    {
      subject: fact.subject,
      title: fact.title,
      subtitle: fact.subtitle || null,
      category: fact.category,
      content: fact.content,
      poster_image: fact.posterImage || null,
      author_name: fact.authorName || '선생님 공식 포스터',
      tags: fact.tags || [],
      likes: 0,
      liked_user_ids: [],
      bg_gradient: fact.bgGradient || null,
    },
  ]).select();

  if (error) {
    console.warn('흥미로운 사실 저장 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function dbDeleteInterestingFact(factId: string) {
  const { error } = await supabase
    .from('interesting_facts')
    .delete()
    .eq('id', factId);

  if (error) {
    console.warn('흥미로운 사실 삭제 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function dbToggleLikeInterestingFact(factId: string, userId: string, isLiked: boolean) {
  const { data: current } = await supabase
    .from('interesting_facts')
    .select('likes, liked_user_ids')
    .eq('id', factId)
    .single();

  const currentLikedIds: string[] = current?.liked_user_ids || [];
  const newLikedIds = isLiked
    ? currentLikedIds.filter((id) => id !== userId)
    : [...currentLikedIds, userId];
  const newLikes = Math.max(0, (current?.likes || 0) + (isLiked ? -1 : 1));

  const { error } = await supabase
    .from('interesting_facts')
    .update({ likes: newLikes, liked_user_ids: newLikedIds })
    .eq('id', factId);

  if (error) {
    console.warn('좋아요 업데이트 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ==========================================
// 8. 스마트 오답노트 (User Wrong Answers) DB 연동
// ==========================================

export async function dbSaveWrongAnswer(userId: string, wrongItem: any) {
  const { data, error } = await supabase.from('user_wrong_answers').upsert([
    {
      id: wrongItem.id || `wrong-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      quiz_id: wrongItem.quizId || '',
      quiz_title: wrongItem.quizTitle || '',
      unit_name: wrongItem.unitName || '',
      subject: wrongItem.subject || 'math',
      question: wrongItem.question || '',
      options: wrongItem.options || [],
      user_answer_index: wrongItem.userAnswerIndex ?? null,
      correct_index: wrongItem.correctIndex ?? 0,
      explanation: wrongItem.explanation || '',
      hint: wrongItem.hint || null,
      user_attached_photos: wrongItem.userAttachedPhotos || [],
      is_reviewed: Boolean(wrongItem.isReviewed),
      review_count: wrongItem.reviewCount || 0,
      my_memo: wrongItem.myMemo || null,
      last_reviewed_at: wrongItem.lastReviewedAt || null,
    },
  ]).select();

  if (error) {
    console.warn('오답노트 DB 저장 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function dbFetchWrongAnswers(userId: string) {
  const { data, error } = await supabase
    .from('user_wrong_answers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('오답노트 DB 불러오기 오류:', error);
    return [];
  }
  return data || [];
}

export async function dbDeleteWrongAnswer(wrongId: string) {
  const { error } = await supabase
    .from('user_wrong_answers')
    .delete()
    .eq('id', wrongId);

  if (error) {
    console.warn('오답 삭제 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function dbUpdateWrongAnswerReviewed(wrongId: string, isReviewed: boolean) {
  const { error } = await supabase
    .from('user_wrong_answers')
    .update({
      is_reviewed: isReviewed,
      last_reviewed_at: new Date().toISOString(),
    })
    .eq('id', wrongId);

  if (error) {
    console.warn('오답 복습 상태 변경 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ==========================================
// 9. 퀴즈/단원평가 응시 기록 (Quiz Attempts) DB 연동
// ==========================================

export async function dbSaveQuizAttempt(attempt: any) {
  const { data, error } = await supabase.from('quiz_attempts').insert([
    {
      id: attempt.id || `attempt-${Date.now()}`,
      user_id: attempt.userId,
      quiz_id: attempt.quizId,
      quiz_title: attempt.quizTitle,
      unit_name: attempt.unitName,
      subject: attempt.subject,
      score: attempt.score,
      total_questions: attempt.totalQuestions,
      percentage: attempt.percentage,
      completed_at: attempt.completedAt || new Date().toISOString(),
    },
  ]).select();

  if (error) {
    console.warn('퀴즈 응시 기록 저장 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

// ==========================================
// 10. 핵심 개념 (Textbook Concepts) DB 연동
// ==========================================

export async function dbSaveConcept(concept: any) {
  const { data, error } = await supabase.from('textbook_concepts').insert([
    {
      subject: concept.subject,
      chapter: concept.chapterName || '',
      chapter_id: concept.chapterId || '',
      unit_name: concept.subUnitTitle || '',
      sub_unit_id: concept.subUnitId || '',
      sub_unit_title: concept.subUnitTitle || '',
      title: concept.title,
      summary: concept.summary || '',
      badge: concept.badge || null,
      key_points: concept.keyPoints || [],
      key_formulas: concept.keyPoints || [],
      formulas_and_reactions: concept.formulasAndReactions || [],
      teacher_tips: concept.teacherTips || [],
      quick_checks: concept.quickChecks || [],
      diagram_image_url: concept.diagramImageUrl || null,
      tags: concept.tags || [],
      author_name: concept.authorName || '선생님',
      likes: concept.likes || 0,
      liked_user_ids: [],
    },
  ]).select();

  if (error) {
    console.warn('핵심 개념 저장 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function dbFetchConcepts() {
  const { data, error } = await supabase
    .from('textbook_concepts')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.warn('핵심 개념 불러오기 오류:', error);
    return [];
  }
  return data || [];
}

export async function dbDeleteConcept(conceptId: string) {
  const { error } = await supabase
    .from('textbook_concepts')
    .delete()
    .eq('id', conceptId);

  if (error) {
    console.warn('핵심 개념 삭제 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function dbToggleLikeConcept(conceptId: string, userId: string, isLiked: boolean) {
  const { data: current } = await supabase
    .from('textbook_concepts')
    .select('likes, liked_user_ids')
    .eq('id', conceptId)
    .single();

  const currentLikedIds: string[] = current?.liked_user_ids || [];
  const newLikedIds = isLiked
    ? currentLikedIds.filter((id) => id !== userId)
    : [...currentLikedIds, userId];
  const newLikes = Math.max(0, (current?.likes || 0) + (isLiked ? -1 : 1));

  const { error } = await supabase
    .from('textbook_concepts')
    .update({ likes: newLikes, liked_user_ids: newLikedIds })
    .eq('id', conceptId);

  if (error) {
    console.warn('개념 좋아요 업데이트 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ==========================================
// 11. 교과서 문제 (Textbook Problems) 수정/삭제 DB 연동
// ==========================================

export async function dbUpdateTextbookProblem(id: string | number, problem: any) {
  const { data, error } = await supabase
    .from('textbook_problems')
    .update({
      textbook_id: problem.textbookId,
      subject: problem.subject,
      grade: problem.grade,
      chapter: problem.chapter,
      unit_number: problem.unitNumber,
      unit_name: problem.unitName,
      sub_unit_id: problem.subUnitId,
      unit_code: problem.unitCode,
      page_number: problem.pageNumber,
      problem_number: problem.problemNumber,
      problem_type: problem.problemType,
      difficulty: problem.difficulty,
      problem_text: problem.problemText,
      solution_steps: problem.solutionSteps || [],
      final_answer: problem.finalAnswer,
      core_concepts: problem.coreConcepts || [],
      dream_tip: problem.dreamTip,
      solution_image: problem.solutionImage || null,
    })
    .eq('id', id)
    .select();

  if (error) {
    console.warn('교과서 문제 수정 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function dbDeleteTextbookProblem(id: string | number) {
  const { error } = await supabase
    .from('textbook_problems')
    .delete()
    .eq('id', id);

  if (error) {
    console.warn('교과서 문제 삭제 오류:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}