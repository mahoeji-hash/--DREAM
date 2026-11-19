import { supabase, isSupabaseConfigured, generateUuid, isValidUuid } from '../supabaseClient';
import { uploadImageToSupabase } from './imageService';
import { getCurriculumForSubject } from '../data/curriculumData';
import { CommunityQuestion, ProblemItem, SolutionStep, SubjectType, TeacherAnswer } from '../types';

const isOnline = () => isSupabaseConfigured;

function formatKoreanDateTime(isoString?: string | null): string {
  if (!isoString) {
    return new Date().toLocaleDateString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return String(isoString);
  return date.toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ==========================================
// 1. 교과서 문제 (textbook_problems) DB 연동
// ==========================================

export function mapDbProblemToProblemItem(row: any): ProblemItem {
  const subject: SubjectType = row.subject === 'science' ? 'science' : 'math';
  const textbookId = subject === 'science' ? 'tb-sci-bs-h2' : 'tb-math-mr-h2';
  const majorUnit = row.major_unit || '';
  const subUnit = row.sub_unit || '';
  const category = row.category || '중단원 마무리';

  const curriculum = getCurriculumForSubject(subject);
  let matchedChapter = curriculum.find(
    (ch) =>
      ch.fullName === majorUnit ||
      ch.chapterName === majorUnit ||
      (majorUnit && (majorUnit.includes(ch.chapterName) || ch.fullName.includes(majorUnit)))
  );

  let matchedSubUnit = matchedChapter
    ? [matchedChapter.grandAssessment, ...matchedChapter.subUnits].find(
        (su) =>
          su.title === subUnit ||
          (subUnit && (subUnit.includes(su.title) || su.title.includes(subUnit)))
      )
    : undefined;

  // Fallback search across all chapters if major_unit didn't match directly
  if (!matchedSubUnit && subUnit) {
    for (const ch of curriculum) {
      const found = [ch.grandAssessment, ...ch.subUnits].find(
        (su) => su.title === subUnit || subUnit.includes(su.title) || su.title.includes(subUnit)
      );
      if (found) {
        matchedChapter = ch;
        matchedSubUnit = found;
        break;
      }
    }
  }

  return {
    id: String(row.id),
    textbookId,
    subject,
    grade: 'high_1',
    chapter: majorUnit || matchedChapter?.fullName || '',
    unitNumber: matchedChapter?.chapterNumber || 1,
    unitName: subUnit || matchedSubUnit?.title || '',
    subUnitId: matchedSubUnit?.id || undefined,
    unitCode: matchedSubUnit?.unitCode || undefined,
    pageNumber: parseInt(String(row.page_number ?? '1'), 10) || 1,
    problemNumber: String(row.problem_number || '1'),
    problemType: category as ProblemItem['problemType'],
    difficulty: (row.difficulty as ProblemItem['difficulty']) || '보통',
    problemText: '',
    problemImage: row.problem_image_url || undefined,
    solutionImage: row.solution_image_url || undefined,
    videoUrl: row.video_url || undefined,
    solutionSteps: [],
    finalAnswer: row.final_answer || '',
    coreConcepts: [subUnit || matchedSubUnit?.title || '', category].filter(Boolean),
    dreamTip: '',
    peerTips: [],
    studentSolutions: [],
    views: 1,
    likes: 0,
  };
}

export async function dbSaveTextbookProblem(problem: ProblemItem): Promise<{
  success: boolean;
  offline?: boolean;
  data?: any;
  problemImageUrl?: string;
  solutionImageUrl?: string;
  error?: string;
}> {
  if (!isOnline()) return { success: true, offline: true };
  try {
    let problemImageUrl = problem.problemImage || null;
    let solutionImageUrl = problem.solutionImage || null;

    if (problemImageUrl && problemImageUrl.startsWith('data:')) {
      const uploaded = await uploadImageToSupabase(problemImageUrl, 'problems');
      problemImageUrl = uploaded.url || null;
    }

    if (solutionImageUrl && solutionImageUrl.startsWith('data:')) {
      const uploaded = await uploadImageToSupabase(solutionImageUrl, 'solutions');
      solutionImageUrl = uploaded.url || null;
    }

    const problemId = isValidUuid(problem.id) ? problem.id : generateUuid();

    const { data, error } = await supabase
      .from('textbook_problems')
      .insert([
        {
          id: problemId,
          subject: problem.subject || 'math',
          major_unit: problem.chapter || '',
          sub_unit: problem.unitName || '',
          page_number: String(problem.pageNumber ?? '1'),
          problem_number: problem.problemNumber || '',
          category: problem.problemType || '중단원 마무리',
          difficulty: problem.difficulty || '보통',
          problem_image_url: problemImageUrl,
          solution_image_url: solutionImageUrl,
          video_url: problem.videoUrl?.trim() || null,
          final_answer: problem.finalAnswer || '',
        },
      ])
      .select();

    if (error) {
      console.warn('교과서 문제 DB 저장 경고:', error.message || error);
      return { success: false, error: error.message };
    }
    return {
      success: true,
      data,
      problemImageUrl: problemImageUrl || undefined,
      solutionImageUrl: solutionImageUrl || undefined,
    };
  } catch (err: any) {
    console.warn('교과서 문제 DB 저장 통신 실패:', err?.message || err);
    return { success: false, offline: true, error: err?.message };
  }
}

export async function dbFetchTextbookProblems(): Promise<ProblemItem[]> {
  if (!isOnline()) return [];
  try {
    const { data, error } = await supabase
      .from('textbook_problems')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('교과서 문제 DB 불러오기 경고:', error.message || error);
      return [];
    }
    return (data || []).map(mapDbProblemToProblemItem);
  } catch (err) {
    console.warn('교과서 문제 DB 네트워크 오류:', err);
    return [];
  }
}

export async function dbUpdateTextbookProblem(id: string | number, problem: ProblemItem): Promise<{
  success: boolean;
  offline?: boolean;
  data?: any;
  problemImageUrl?: string;
  solutionImageUrl?: string;
  error?: string;
}> {
  if (!isOnline()) return { success: true, offline: true };
  const idStr = String(id);
  if (!isValidUuid(idStr)) {
    return { success: false, error: '유효하지 않은 문제 ID 형식입니다.' };
  }
  try {
    let problemImageUrl = problem.problemImage || null;
    let solutionImageUrl = problem.solutionImage || null;

    if (problemImageUrl && problemImageUrl.startsWith('data:')) {
      const uploaded = await uploadImageToSupabase(problemImageUrl, 'problems');
      problemImageUrl = uploaded.url || null;
    }

    if (solutionImageUrl && solutionImageUrl.startsWith('data:')) {
      const uploaded = await uploadImageToSupabase(solutionImageUrl, 'solutions');
      solutionImageUrl = uploaded.url || null;
    }

    const { data, error } = await supabase
      .from('textbook_problems')
      .update({
        subject: problem.subject,
        major_unit: problem.chapter || '',
        sub_unit: problem.unitName || '',
        page_number: String(problem.pageNumber ?? '1'),
        problem_number: problem.problemNumber || '',
        category: problem.problemType || '중단원 마무리',
        difficulty: problem.difficulty || '보통',
        problem_image_url: problemImageUrl,
        solution_image_url: solutionImageUrl,
        video_url: problem.videoUrl?.trim() || null,
        final_answer: problem.finalAnswer || '',
      })
      .eq('id', idStr)
      .select();

    if (error) {
      console.warn('교과서 문제 수정 경고:', error.message || error);
      return { success: false, error: error.message };
    }
    return {
      success: true,
      data,
      problemImageUrl: problemImageUrl || undefined,
      solutionImageUrl: solutionImageUrl || undefined,
    };
  } catch (err: any) {
    console.warn('교과서 문제 수정 통신 오류:', err?.message || err);
    return { success: false, offline: true, error: err?.message };
  }
}

export async function dbDeleteTextbookProblem(id: string | number) {
  if (!isOnline()) return { success: true, offline: true };
  const idStr = String(id);
  if (!isValidUuid(idStr)) {
    return { success: true };
  }
  try {
    const { error } = await supabase
      .from('textbook_problems')
      .delete()
      .eq('id', idStr);

    if (error) {
      console.warn('교과서 문제 삭제 경고:', error.message || error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('교과서 문제 삭제 통신 오류:', err?.message || err);
    return { success: false, offline: true, error: err?.message };
  }
}

// ==========================================
// 2. Q&A 질문 (questions) & 선생님 답변 (answers) DB 연동
// ==========================================

const FORMULA_MARKER = '\n\n[핵심 공식]\n';
const STEPS_MARKER = '\n\n[단계별 풀이]\n';
const TIP_MARKER = '\n\n[선생님 팁]\n';

function serializeAnswerSummary(answer: TeacherAnswer): string {
  let summary = (answer.answerText || '').trim();
  if (answer.keyFormula?.trim()) {
    summary += `${FORMULA_MARKER}${answer.keyFormula.trim()}`;
  }
  if (Array.isArray(answer.solutionSteps) && answer.solutionSteps.length > 0) {
    const stepsStr = answer.solutionSteps
      .map((s) => `${s.stepNumber}. ${s.title}: ${s.explanation}`)
      .join('\n');
    summary += `${STEPS_MARKER}${stepsStr}`;
  }
  if (answer.teacherTip?.trim()) {
    summary += `${TIP_MARKER}${answer.teacherTip.trim()}`;
  }
  return summary;
}

function parseAnswerSummary(rawSummary: string): {
  answerText: string;
  keyFormula?: string;
  solutionSteps?: SolutionStep[];
  teacherTip?: string;
} {
  let remaining = rawSummary || '';
  let teacherTip: string | undefined;
  let solutionSteps: SolutionStep[] | undefined;
  let keyFormula: string | undefined;

  const tipIdx = remaining.indexOf(TIP_MARKER);
  if (tipIdx !== -1) {
    teacherTip = remaining.slice(tipIdx + TIP_MARKER.length).trim();
    remaining = remaining.slice(0, tipIdx);
  }

  const stepsIdx = remaining.indexOf(STEPS_MARKER);
  if (stepsIdx !== -1) {
    const rawSteps = remaining.slice(stepsIdx + STEPS_MARKER.length).trim();
    remaining = remaining.slice(0, stepsIdx);
    const parsedSteps = rawSteps
      .split('\n')
      .map((line, idx) => {
        const match = line.match(/^\d+\.\s*([^:]+):\s*(.+)$/);
        if (match) {
          return {
            stepNumber: idx + 1,
            title: match[1].trim(),
            explanation: match[2].trim(),
          };
        }
        return null;
      })
      .filter((s): s is SolutionStep => s !== null);
    if (parsedSteps.length > 0) {
      solutionSteps = parsedSteps;
    }
  }

  const formulaIdx = remaining.indexOf(FORMULA_MARKER);
  if (formulaIdx !== -1) {
    keyFormula = remaining.slice(formulaIdx + FORMULA_MARKER.length).trim();
    remaining = remaining.slice(0, formulaIdx);
  }

  return {
    answerText: remaining.trim(),
    keyFormula,
    solutionSteps,
    teacherTip,
  };
}

export async function dbSaveCommunityQuestion(question: CommunityQuestion): Promise<{
  success: boolean;
  offline?: boolean;
  data?: any;
  imageUrl?: string;
  error?: string;
}> {
  if (!isOnline()) return { success: true, offline: true };
  try {
    let imageUrl = question.imageUrl || null;
    if (imageUrl && imageUrl.startsWith('data:')) {
      const uploaded = await uploadImageToSupabase(imageUrl, 'questions');
      imageUrl = uploaded.url || null;
    }

    const questionId = isValidUuid(question.id) ? question.id : generateUuid();

    const { data, error } = await supabase
      .from('questions')
      .insert([
        {
          id: questionId,
          author_id: question.authorId || 'student',
          author_name: question.authorName || '익명 학생',
          school: question.authorSchool || '대구화원고등학교',
          subject: question.subject || 'math',
          title: question.title || '',
          content: question.content || '',
          image_url: imageUrl,
          status: question.status || 'waiting',
          likes: typeof question.likes === 'number' ? question.likes : 0,
        },
      ])
      .select();

    if (error) {
      console.warn('질문 DB 저장 오류:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data, imageUrl: imageUrl || undefined };
  } catch (err: any) {
    console.warn('질문 DB 저장 통신 오류:', err?.message || err);
    return { success: false, offline: true, error: err?.message };
  }
}

export async function dbFetchCommunityQuestions(): Promise<CommunityQuestion[]> {
  if (!isOnline()) return [];
  try {
    const [qRes, aRes] = await Promise.all([
      supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('answers')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);

    if (qRes.error) {
      console.warn('질문 불러오기 오류:', qRes.error);
      return [];
    }

    const answerByQuestionId = new Map<string, any>();
    if (!aRes.error && Array.isArray(aRes.data)) {
      for (const ans of aRes.data) {
        const qId = String(ans.question_id);
        if (!answerByQuestionId.has(qId)) {
          answerByQuestionId.set(qId, ans);
        }
      }
    }

    return (qRes.data || []).map((q: any): CommunityQuestion => {
      const qId = String(q.id);
      const ansRow = answerByQuestionId.get(qId);

      let teacherAnswer: TeacherAnswer | undefined;
      if (ansRow) {
        const parsed = parseAnswerSummary(ansRow.summary || '');
        teacherAnswer = {
          id: String(ansRow.id),
          authorId: 'teacher',
          authorName: ansRow.teacher_name || '담당 선생님',
          authorSchool: q.school || '대구화원고등학교',
          answeredAt: formatKoreanDateTime(ansRow.created_at),
          answerText: parsed.answerText,
          imageUrl: ansRow.solution_image_url || undefined,
          videoUrl: ansRow.video_url || undefined,
          keyFormula: parsed.keyFormula,
          solutionSteps: parsed.solutionSteps,
          teacherTip: parsed.teacherTip,
          verifiedBadge: true,
        };
      }

      return {
        id: qId,
        authorId: q.author_id || '',
        authorName: q.author_name || '익명 학생',
        authorRole: 'student',
        authorSchool: q.school || '대구화원고등학교',
        authorGrade: 'high_1',
        subject: q.subject === 'science' ? 'science' : 'math',
        title: q.title || '',
        content: q.content || '',
        imageUrl: q.image_url || undefined,
        createdAt: formatKoreanDateTime(q.created_at),
        status: teacherAnswer || q.status === 'answered' ? 'answered' : 'waiting',
        likes: typeof q.likes === 'number' ? q.likes : 0,
        teacherAnswer,
      };
    });
  } catch (err) {
    console.warn('질문/답변 불러오기 통신 오류:', err);
    return [];
  }
}

export async function dbAnswerCommunityQuestion(questionId: string, answer: TeacherAnswer) {
  if (!isOnline()) return { success: true, offline: true };
  if (!isValidUuid(questionId)) {
    return { success: false, error: '유효하지 않은 질문 ID입니다.' };
  }

  try {
    let solutionImageUrl = answer.imageUrl || null;
    if (solutionImageUrl && solutionImageUrl.startsWith('data:')) {
      const uploaded = await uploadImageToSupabase(solutionImageUrl, 'answers');
      solutionImageUrl = uploaded.url || null;
    }

    const summaryText = serializeAnswerSummary(answer);

    // 기존 답변이 있는지 확인 후 update 또는 insert
    const { data: existingAnswer } = await supabase
      .from('answers')
      .select('id')
      .eq('question_id', questionId)
      .maybeSingle();

    let ansError: any = null;
    let savedAnswerData: any = null;

    if (existingAnswer?.id) {
      const res = await supabase
        .from('answers')
        .update({
          teacher_name: answer.authorName || '담당 선생님',
          summary: summaryText,
          solution_image_url: solutionImageUrl,
          video_url: answer.videoUrl?.trim() || null,
        })
        .eq('id', existingAnswer.id)
        .select();
      ansError = res.error;
      savedAnswerData = res.data;
    } else {
      const answerId = isValidUuid(answer.id) ? answer.id : generateUuid();
      const res = await supabase
        .from('answers')
        .insert([
          {
            id: answerId,
            question_id: questionId,
            teacher_name: answer.authorName || '담당 선생님',
            summary: summaryText,
            solution_image_url: solutionImageUrl,
            video_url: answer.videoUrl?.trim() || null,
          },
        ])
        .select();
      ansError = res.error;
      savedAnswerData = res.data;
    }

    if (ansError) {
      console.warn('선생님 답변 저장 오류:', ansError);
      return { success: false, error: ansError.message };
    }

    // 질문 상태를 'answered'로 업데이트
    const { error: qUpdateErr } = await supabase
      .from('questions')
      .update({ status: 'answered' })
      .eq('id', questionId);

    if (qUpdateErr) {
      console.warn('질문 상태 업데이트 경고:', qUpdateErr);
    }

    return {
      success: true,
      data: savedAnswerData,
      solutionImageUrl: solutionImageUrl || undefined,
    };
  } catch (err: any) {
    console.warn('선생님 답변 저장 통신 오류:', err?.message || err);
    return { success: false, offline: true, error: err?.message };
  }
}

export async function dbDeleteCommunityQuestion(questionId: string) {
  if (!isOnline()) return { success: true, offline: true };
  if (!isValidUuid(questionId)) return { success: true };

  try {
    // 연결된 답변 먼저 삭제
    await supabase.from('answers').delete().eq('question_id', questionId);

    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      console.warn('질문 삭제 오류:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('질문 삭제 통신 오류:', err?.message || err);
    return { success: false, offline: true, error: err?.message };
  }
}

export async function dbToggleLikeCommunityQuestion(questionId: string, increment: boolean) {
  if (!isOnline() || !isValidUuid(questionId)) return { success: true };
  try {
    const { data: current } = await supabase
      .from('questions')
      .select('likes')
      .eq('id', questionId)
      .single();

    const newLikes = Math.max(0, (current?.likes || 0) + (increment ? 1 : -1));

    const { error } = await supabase
      .from('questions')
      .update({ likes: newLikes })
      .eq('id', questionId);

    if (error) {
      console.warn('좋아요 업데이트 오류:', error);
      return { success: false, error: error.message };
    }
    return { success: true, likes: newLikes };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// Legacy compatibility wrapper -> routes to `questions` table
export async function dbSaveQnaQuestion(qna: {
  userName: string;
  title: string;
  content: string;
  subject: string;
  imageUrl?: string;
  authorId?: string;
  school?: string;
}) {
  return dbSaveCommunityQuestion({
    id: generateUuid(),
    authorId: qna.authorId || 'student',
    authorName: qna.userName || '익명 학생',
    authorRole: 'student',
    authorSchool: qna.school || '대구화원고등학교',
    authorGrade: 'high_1',
    subject: qna.subject === 'science' ? 'science' : 'math',
    title: qna.title,
    content: qna.content,
    imageUrl: qna.imageUrl,
    createdAt: formatKoreanDateTime(),
    status: 'waiting',
    likes: 0,
  });
}

// ==========================================
// 3. 로컬 저장소 전용 보조 함수 (별도 Supabase 테이블이 없는 부가 기능용)
// ==========================================

export async function dbFetchInterestingFacts() {
  return [];
}
export async function dbSaveInterestingFact(_fact: any) {
  return { success: true, offline: true };
}
export async function dbDeleteInterestingFact(_factId: string) {
  return { success: true, offline: true };
}
export async function dbToggleLikeInterestingFact(_factId: string, _userId: string, _isLiked: boolean) {
  return { success: true, offline: true };
}

export async function dbFetchConcepts() {
  return [];
}
export async function dbSaveConcept(_concept: any) {
  return { success: true, offline: true };
}
export async function dbDeleteConcept(_conceptId: string) {
  return { success: true, offline: true };
}
export async function dbToggleLikeConcept(_conceptId: string, _userId: string, _isLiked: boolean) {
  return { success: true, offline: true };
}

export async function dbSaveQuizAttempt(_attempt: any): Promise<{ success: boolean; offline?: boolean; error?: string }> {
  return { success: true, offline: true };
}
export async function dbSaveWrongAnswer(_userId: string, _wrongItem: any): Promise<{ success: boolean; offline?: boolean; error?: string }> {
  return { success: true, offline: true };
}