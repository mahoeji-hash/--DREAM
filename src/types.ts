export type SubjectType = 'math' | 'science';

export type GradeType =
  | 'middle_1'
  | 'middle_2'
  | 'middle_3'
  | 'high_1'
  | 'high_2_3';

export interface TextbookInfo {
  id: string;
  name: string;
  publisher: string;
  subject: SubjectType;
  grade: GradeType;
  category: '교과서' | '익힘책' | '문제집' | '기출/수능특강';
  color: string;
  badgeText: string;
  totalChapters: number;
}

export interface SolutionStep {
  stepNumber: number;
  title: string;
  explanation: string;
  formulaOrKey?: string;
}

export interface PeerTip {
  id: string;
  author: string;
  authorBadge: string;
  tip: string;
  likes: number;
  isHelpful?: boolean;
}

export interface StudentSolution {
  id: string;
  author: string;
  authorSchool: string;
  date: string;
  description: string;
  drawingImage?: string;
  handwrittenNotes?: string[];
  likes: number;
}

export interface GraphExplanation {
  functionFormula: string; // e.g. "x^2 - 4*x + 3" or "2*x - 1"
  functionLabel?: string; // e.g. "이차함수 f(x) = x² - 4x + 3"
  explanationNote?: string; // Teacher's supplementary note on the graph
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  keyPoints?: Array<{ x: number; y: number; label: string }>;
  registeredBy?: string; // e.g. '선생님'
  updatedAt?: string;
}

export interface ProblemItem {
  id: string;
  textbookId: string;
  subject: SubjectType;
  grade: GradeType;
  chapter: string;
  unitNumber: number;
  unitName: string;
  subUnitId?: string;
  unitCode?: string;
  pageNumber: number;
  problemNumber: string;
  problemType: '개념 예제' | '확인 문제' | '중단원 마무리' | '발전/심화 문제' | '실험 탐구';
  difficulty: '쉬움' | '보통' | '도전' | '심화';
  problemText: string;
  diagramSvgType?: 'graph_parabola' | 'triangle_geometry' | 'chemical_reaction' | 'physics_pulley' | 'biology_cell' | 'linear_function' | 'cube_volume';
  diagramLabel?: string;
  graphExplanation?: GraphExplanation;
  solutionSteps: SolutionStep[];
  finalAnswer: string;
  coreConcepts: string[];
  dreamTip: string;
  solutionImage?: string;
  peerTips: PeerTip[];
  studentSolutions: StudentSolution[];
  views: number;
  likes: number;
}

export interface AIQuestionResult {
  id: string;
  createdAt: string;
  subject: string;
  problemTitle: string;
  extractedProblemText: string;
  summary: string;
  steps: SolutionStep[];
  finalAnswer: string;
  dreamTip: string;
  keyConcepts?: string[];
  userImage?: string;
  userQuestion?: string;
  chatHistory?: Array<{ sender: 'user' | 'assistant'; text: string; time: string }>;
}

export type UserRole = 'student' | 'admin';

export interface UserAccount {
  id: string;
  loginId: string;
  passwordHash: string; // Stored user password
  role: UserRole;
  nickname: string;
  schoolName: string;
  grade: GradeType;
  avatarSeed: string;
  createdAt: string;
}

export interface QuizWrongAnswer {
  id: string;
  quizId: string;
  quizTitle: string;
  unitName: string;
  subject: SubjectType;
  questionId: string;
  questionText: string;
  options: string[];
  userAnswerIndex?: number;
  correctIndex: number;
  explanation: string;
  hint?: string;
  questionImage?: string;
  explanationImage?: string;
  userAttachedPhotos?: string[];
  date: string;
  isReviewed?: boolean;
}

export interface QuizAttemptRecord {
  id: string;
  quizId: string;
  quizTitle: string;
  unitName: string;
  subject: SubjectType;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
  wrongAnswers: QuizWrongAnswer[];
}

export interface UserProfile {
  id?: string;
  loginId?: string;
  role: UserRole;
  nickname: string;
  schoolName: string;
  grade: GradeType;
  avatarSeed: string;
  solvedCount: number;
  helpedCount: number;
  bookmarkedProblemIds: string[];
  historyQuestions: AIQuestionResult[];
  quizAttempts?: QuizAttemptRecord[];
  wrongQuizQuestions?: QuizWrongAnswer[];
  adminPasscode?: string;
}

export interface TeacherAnswer {
  id: string;
  authorId: string;
  authorName: string; // e.g. '김선생님 (수학/과학 담당)'
  authorSchool: string;
  answeredAt: string;
  answerText: string;
  imageUrl?: string;
  keyFormula?: string;
  solutionSteps?: SolutionStep[];
  teacherTip?: string;
  verifiedBadge: boolean;
}

export interface CommunityQuestion {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorSchool: string;
  authorGrade: GradeType;
  subject: SubjectType;
  textbookRef?: string; // e.g. '대구화원고 1학년 공통수학 p.45 8번'
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  status: 'waiting' | 'answered'; // 'waiting' = 답변 대기중, 'answered' = 선생님 답변 완료
  teacherAnswer?: TeacherAnswer;
  likes: number;
}

export interface ComicCut {
  id: string;
  cutNumber: number; // 1, 2, 3, 4 ...
  imageUrl?: string;
  title?: string;
  caption: string; // The explanation right under the image in 4-cut comic style
}

export interface InterestingFactItem {
  id: string;
  subject: SubjectType;
  title: string;
  subtitle?: string;
  category: string; // e.g. '일상 속 과학', '수학의 역사', '우주의 신비', '재미있는 공식'
  content: string;
  posterImage?: string; // YouTube thumbnail cover image uploaded by admin
  comicCuts?: ComicCut[]; // 4-cut comic panels with image and explanation underneath
  authorName: string;
  createdAt: string;
  tags: string[];
  likes: number;
  likedUserIds?: string[]; // Array of user account IDs who liked this poster (1 like per account)
  bgGradient?: string;
}

export interface ConceptKeyPoint {
  title: string;
  description: string;
  formulaOrReaction?: string;
  importantNote?: string;
}

export interface ConceptQuickCheck {
  question: string;
  answer: string;
  explanation: string;
}

export interface ConceptItem {
  id: string;
  subject: SubjectType;
  chapterId: string;
  chapterName: string;
  subUnitId: string;
  subUnitTitle: string;
  title: string;
  summary: string;
  badge?: string; // e.g. '내신 빈출 1순위', '핵심 원리', '실험 탐구', '서술형 대비'
  keyPoints: ConceptKeyPoint[];
  formulasAndReactions?: string[];
  teacherTips: string[];
  quickChecks?: ConceptQuickCheck[];
  diagramImageUrl?: string;
  tags: string[];
  authorName?: string;
  createdAt?: string;
  likes?: number;
  likedUserIds?: string[];
}

