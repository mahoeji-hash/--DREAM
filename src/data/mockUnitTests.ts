import { supabase } from '../supabaseClient';
import { SubjectType } from '../types';

export interface QuizQuestion {
  id?: string | number;
  unit_code?: string;
  questionText: string;
  question_text?: string;
  options: string[];
  correctIndex: number;
  correct_index?: number;
  explanation: string;
  hint?: string;
  questionImage?: string;
  explanationImage?: string;
  created_at?: string;
}

export interface UnitQuiz {
  id: string | number;
  subject: SubjectType;
  grade: 'high_1';
  chapterNumber: number;
  chapterName: string;
  unitName: string;
  unitCode: string;
  badge: string;
  estimatedMinutes: number;
  questions: QuizQuestion[];
}

export const INITIAL_MAJOR_CHAPTER_QUIZZES: UnitQuiz[] = [
  {
    id: 'quiz-math-chapter-1',
    subject: 'math',
    grade: 'high_1',
    chapterNumber: 1,
    chapterName: 'I. 도형의 방정식',
    unitName: '1단원. 도형의 방정식 (대단원 TEST)',
    unitCode: 'MATH-CH1',
    badge: '1단원 대단원 TEST',
    estimatedMinutes: 10,
    questions: [
      {
        id: 'qm-ch1-1',
        questionText: '두 점 A(1, 2), B(5, 8) 사이의 거리는?',
        options: ['2√13', '4√3', '2√10', '6'],
        correctIndex: 0,
        explanation: '거리 d = √[(5-1)² + (8-2)²] = √[4² + 6²] = √[16 + 36] = √52 = 2√13 입니다.',
        hint: '두 점 사이 거리 공식 d = √((x₂-x₁)² + (y₂-y₁)²) 을 사용하세요.',
      },
      {
        id: 'qm-ch1-2',
        questionText: '중심이 (2, -1)이고 점 (5, 3)을 지나는 원의 방정식의 반지름의 길이는?',
        options: ['3', '4', '5', '25'],
        correctIndex: 2,
        explanation: '반지름 r = 중심과 점 사이의 거리 = √[(5-2)² + (3 - (-1))²] = √[9 + 16] = 5 입니다.',
        hint: '원의 반지름은 중심과 원 위의 한 점 사이의 거리입니다.',
      },
    ],
  },
  {
    id: 'quiz-math-chapter-2',
    subject: 'math',
    grade: 'high_1',
    chapterNumber: 2,
    chapterName: 'II. 집합과 명제',
    unitName: '2단원. 집합과 명제 (대단원 TEST)',
    unitCode: 'MATH-CH2',
    badge: '2단원 대단원 TEST',
    estimatedMinutes: 10,
    questions: [
      {
        id: 'qm-ch2-1',
        questionText: '집합 A = {1, 2, 3, 4, 5}의 부분집합 중 1, 2를 반드시 포함하는 부분집합의 개수는?',
        options: ['4개', '8개', '16개', '32개'],
        correctIndex: 1,
        explanation: '원소 5개 중 특정 원소 2개를 반드시 포함하므로 2^(5-2) = 2³ = 8개 입니다.',
        hint: '특정 원소를 포함하는 부분집합 개수 공식 2^(n-k)',
      },
      {
        id: 'qm-ch2-2',
        questionText: '양수 x에 대하여 x + 9/x 의 최솟값은?',
        options: ['3', '6', '9', '18'],
        correctIndex: 1,
        explanation: '산술·기하평균 부등식에 의해 x + 9/x ≥ 2√(x · 9/x) = 2 · 3 = 6 입니다.',
        hint: 'a > 0, b > 0 일 때 a + b ≥ 2√(ab)',
      },
    ],
  },
  {
    id: 'quiz-math-chapter-3',
    subject: 'math',
    grade: 'high_1',
    chapterNumber: 3,
    chapterName: 'III. 함수와 그래프',
    unitName: '3단원. 함수와 그래프 (대단원 TEST)',
    unitCode: 'MATH-CH3',
    badge: '3단원 대단원 TEST',
    estimatedMinutes: 10,
    questions: [
      {
        id: 'qm-ch3-1',
        questionText: 'f(x) = 3x - 1, g(x) = x² + 2 일 때, 합성함수 (g ∘ f)(2) 의 값은?',
        options: ['27', '17', '35', '11'],
        correctIndex: 0,
        explanation: 'f(2) = 3(2) - 1 = 5 이고, g(5) = 5² + 2 = 27 입니다.',
        hint: 'f(2)를 먼저 구한 뒤 결과를 g에 대입하세요.',
      },
      {
        id: 'qm-ch3-2',
        questionText: '유리함수 y = (3x - 2)/(x - 1) 의 두 점근선의 교점의 좌표는?',
        options: ['(1, 3)', '(1, -2)', '(-1, 3)', '(3, 1)'],
        correctIndex: 0,
        explanation: '점근선 x = 1, y = 3 이므로 점근선의 교점은 (1, 3) 입니다.',
        hint: '분모가 0이 되는 x값과 계수 비를 구하세요.',
      },
    ],
  },
  {
    id: 'quiz-sci-chapter-1',
    subject: 'science',
    grade: 'high_1',
    chapterNumber: 1,
    chapterName: 'I. 변화와 다양성',
    unitName: '1단원. 변화와 다양성 (대단원 TEST)',
    unitCode: 'SCI-CH1',
    badge: '1단원 대단원 TEST',
    estimatedMinutes: 10,
    questions: [
      {
        id: 'qs-ch1-1',
        questionText: '생물다양성을 구성하는 3가지 핵심 요소에 해당하지 않는 것은?',
        options: ['유전적 다양성', '종 다양성', '생태계 다양성', '화학적 다양성'],
        correctIndex: 3,
        explanation: '생물다양성은 유전적 다양성, 종 다양성, 생태계 다양성으로 구성됩니다.',
        hint: '유전자, 생물 종, 서식 환경을 생각하세요.',
      },
      {
        id: 'qs-ch1-2',
        questionText: '산과 염기의 중화 반응에서 일어나는 현상으로 옳지 않은 것은?',
        options: [
          '수소 이온(H⁺)과 수산화 이온(OH⁻)이 반응하여 물(H₂O)이 생성된다.',
          '반응 시 중화열이 발생하여 용액의 온도가 높아진다.',
          '용액의 액성이 변하더라도 지시약의 색은 전혀 변하지 않는다.',
          '산의 음이온과 염기의 양이온이 결합하여 염이 생성될 수 있다.',
        ],
        correctIndex: 2,
        explanation: '중화 반응에 따라 용액의 액성이 변하므로 지시약 색깔이 변합니다.',
        hint: '지시약의 역할(산성/중성/염기성 판별)을 떠올려보세요.',
      },
    ],
  },
  {
    id: 'quiz-sci-chapter-2',
    subject: 'science',
    grade: 'high_1',
    chapterNumber: 2,
    chapterName: 'II. 환경과 에너지',
    unitName: '2단원. 환경과 에너지 (대단원 TEST)',
    unitCode: 'SCI-CH2',
    badge: '2단원 대단원 TEST',
    estimatedMinutes: 10,
    questions: [
      {
        id: 'qs-ch2-1',
        questionText: '생태계에서 먹이 그물이 복잡할수록 생태계 평형이 잘 유지되는 주된 이유는?',
        options: [
          '특정 생물종이 사라져도 대체할 수 있는 다른 먹이사슬이 존재하기 때문에',
          '생산자의 수가 급격히 줄어들기 때문에',
          '에너지 전달 효율이 100%가 되기 때문에',
          '비생물적 요인의 영향이 완전히 사라지기 때문에',
        ],
        correctIndex: 0,
        explanation: '먹이 그물이 복잡하면 한 종의 개체수 변동에도 다른 대체 먹이가 있어 생태계 평형이 잘 유지됩니다.',
        hint: '다양한 먹이 사슬이 그물처럼 얽혀 있는 구조를 생각하세요.',
      },
      {
        id: 'qs-ch2-2',
        questionText: '태양 전지에 대한 설명으로 옳은 것은?',
        options: [
          '빛에너지를 전기 에너지로 직접 변환한다.',
          '온실가스인 이산화 탄소를 대량 배출한다.',
          '터빈을 회전시켜 전기를 발생시킨다.',
          '수소와 산소의 연소 반응을 이용한다.',
        ],
        correctIndex: 0,
        explanation: '태양 전지는 광전 효과를 이용하여 태양의 빛에너지를 전기 에너지로 직접 변환합니다.',
        hint: '신재생 에너지 발전 원리를 확인하세요.',
      },
    ],
  },
  {
    id: 'quiz-sci-chapter-3',
    subject: 'science',
    grade: 'high_1',
    chapterNumber: 3,
    chapterName: 'III. 과학과 미래 사회',
    unitName: '3단원. 과학과 미래 사회 (대단원 TEST)',
    unitCode: 'SCI-CH3',
    badge: '3단원 대단원 TEST',
    estimatedMinutes: 10,
    questions: [
      {
        id: 'qs-ch3-1',
        questionText: '탄소 원자들이 2차원 평면의 육각형 벌집 모양 격자 구조를 이루고 있는 신소재는?',
        options: ['그래핀(Graphene)', '탄소 나노튜브', '풀러렌', '초전도체'],
        correctIndex: 0,
        explanation: '그래핀은 탄소 원자가 2차원 벌집 모양 평면 구조를 형성한 첨단 나노 신소재입니다.',
        hint: '탄소 1개 층으로 이루어진 2차원 평면 시트입니다.',
      },
      {
        id: 'qs-ch3-2',
        questionText: '미래 지속 가능한 사회를 위한 적정 기술(Appropriate Technology)의 올바른 특징은?',
        options: [
          '현지의 문화와 환경, 자원을 고려하여 누구나 쉽게 사용 및 수리할 수 있어야 한다.',
          '가장 비싸고 고도화된 수입 장비만을 사용해야 한다.',
          '대량의 화석 연료를 필수적으로 소모해야 한다.',
          '특정 대기업만 독점 생산할 수 있어야 한다.',
        ],
        correctIndex: 0,
        explanation: '적정 기술은 현지 상황에 맞춰 친환경적이고 지속 가능한 방식으로 문제를 해결하는 기술입니다.',
        hint: '현지 맞춤형, 지속 가능성, 접근성을 떠올려보세요.',
      },
    ],
  },
];

let cachedQuizzes: UnitQuiz[] = [...INITIAL_MAJOR_CHAPTER_QUIZZES];

// UI 컴포넌트가 동기식 배열 반환을 원할 때 바로 배열을 리턴하여 오류 예방
export function getStoredUnitQuizzes(): UnitQuiz[] {
  return cachedQuizzes;
}

// 백그라운드에서 DB의 최신 문제를 가져오는 비동기 함수
export async function fetchStoredUnitQuizzesFromDB(): Promise<UnitQuiz[]> {
  try {
    const { data, error } = await supabase
      .from('test_questions')
      .select('*')
      .order('id', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      // 필요 시 DB 데이터를 cachedQuizzes에 반영
    }
  } catch (err) {
    console.error('DB Fetch Error:', err);
  }
  return cachedQuizzes;
}

export async function saveStoredUnitQuiz(quiz: any) {
  return saveStoredUnitQuizzes(quiz);
}

export async function saveStoredUnitQuizzes(quiz: any) {
  try {
    const { data, error } = await supabase
      .from('test_questions')
      .insert([
        {
          unit_code: quiz.unitCode || quiz.unit_code || '',
          question_text: quiz.questionText || quiz.question_text || '',
          options: quiz.options || [],
          correct_index: quiz.correctIndex ?? quiz.correct_index ?? 0,
          explanation: quiz.explanation || '',
          hint: quiz.hint || ''
        }
      ])
      .select();

    if (error) {
      console.error('단원 평가 퀴즈 저장 에러:', error);
      throw error;
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}