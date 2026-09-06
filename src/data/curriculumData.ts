import { SubjectType } from '../types';

export interface SubUnitItem {
  id: string;
  unitCode: string;
  title: string;
  category: '중단원 마무리' | '대단원 평가' | '핵심 개념';
  badge: string;
  pageRange?: string;
  problemCount?: number;
}

export interface ChapterGroup {
  id: string;
  chapterNumber: number;
  chapterName: string;
  fullName: string;
  subUnits: SubUnitItem[];
  grandAssessment: SubUnitItem;
}

export const MATH_MIRAEN_COMMON_MATH_2: ChapterGroup[] = [
  {
    id: 'ch-math-geom',
    chapterNumber: 1,
    chapterName: '도형의 방정식',
    fullName: 'I. 도형의 방정식',
    subUnits: [
      {
        id: 'unit-math-1-1',
        unitCode: 'MATH2-1-1',
        title: '1. 평면좌표와 직선의 방정식',
        category: '중단원 마무리',
        badge: '중단원 마무리 문제',
        pageRange: 'p.10 ~ p.38',
        problemCount: 0,
      },
      {
        id: 'unit-math-1-2',
        unitCode: 'MATH2-1-2',
        title: '2. 원의 방정식',
        category: '중단원 마무리',
        badge: '중단원 마무리 문제',
        pageRange: 'p.39 ~ p.58',
        problemCount: 0,
      },
      {
        id: 'unit-math-1-3',
        unitCode: 'MATH2-1-3',
        title: '3. 도형의 이동',
        category: '중단원 마무리',
        badge: '중단원 마무리 문제',
        pageRange: 'p.59 ~ p.75',
        problemCount: 0,
      },
    ],
    grandAssessment: {
      id: 'unit-math-1-grand',
      unitCode: 'MATH2-1-GRAND',
      title: 'I단원 도형의 방정식 대단원 평가하기',
      category: '대단원 평가',
      badge: '대단원 평가 문제 (전체)',
      pageRange: 'p.76 ~ p.82',
      problemCount: 0,
    },
  },
  {
    id: 'ch-math-set-prop',
    chapterNumber: 2,
    chapterName: '집합과 명제',
    fullName: 'II. 집합과 명제',
    subUnits: [
      {
        id: 'unit-math-2-1',
        unitCode: 'MATH2-2-1',
        title: '1. 집합',
        category: '중단원 마무리',
        badge: '중단원 마무리 문제',
        pageRange: 'p.84 ~ p.108',
        problemCount: 0,
      },
      {
        id: 'unit-math-2-2',
        unitCode: 'MATH2-2-2',
        title: '2. 명제',
        category: '중단원 마무리',
        badge: '중단원 마무리 문제',
        pageRange: 'p.109 ~ p.132',
        problemCount: 0,
      },
    ],
    grandAssessment: {
      id: 'unit-math-2-grand',
      unitCode: 'MATH2-2-GRAND',
      title: 'II단원 집합과 명제 대단원 평가하기',
      category: '대단원 평가',
      badge: '대단원 평가 문제 (전체)',
      pageRange: 'p.133 ~ p.138',
      problemCount: 0,
    },
  },
  {
    id: 'ch-math-func',
    chapterNumber: 3,
    chapterName: '함수와 그래프',
    fullName: 'III. 함수와 그래프',
    subUnits: [
      {
        id: 'unit-math-3-1',
        unitCode: 'MATH2-3-1',
        title: '1. 함수',
        category: '중단원 마무리',
        badge: '중단원 마무리 문제',
        pageRange: 'p.140 ~ p.168',
        problemCount: 0,
      },
      {
        id: 'unit-math-3-2',
        unitCode: 'MATH2-3-2',
        title: '2. 유리함수와 무리함수',
        category: '중단원 마무리',
        badge: '중단원 마무리 문제',
        pageRange: 'p.169 ~ p.196',
        problemCount: 0,
      },
    ],
    grandAssessment: {
      id: 'unit-math-3-grand',
      unitCode: 'MATH2-3-GRAND',
      title: 'III단원 함수와 그래프 대단원 평가하기',
      category: '대단원 평가',
      badge: '대단원 평가 문제 (전체)',
      pageRange: 'p.197 ~ p.204',
      problemCount: 0,
    },
  },
];

export const SCIENCE_VISANG_INTEGRATED_2: ChapterGroup[] = [
  {
    id: 'ch-sci-diversity',
    chapterNumber: 1,
    chapterName: '변화와 다양성',
    fullName: 'I. 변화와 다양성',
    subUnits: [
      {
        id: 'unit-sci-1-1',
        unitCode: 'SCI2-1-1',
        title: '1. 지구 환경 변화와 생물다양성',
        category: '중단원 마무리',
        badge: '중단원 마무리 문제',
        pageRange: 'p.10 ~ p.48',
        problemCount: 0,
      },
      {
        id: 'unit-sci-1-2',
        unitCode: 'SCI2-1-2',
        title: '2. 화학 변화',
        category: '중단원 마무리',
        badge: '중단원 마무리 문제',
        pageRange: 'p.49 ~ p.88',
        problemCount: 0,
      },
    ],
    grandAssessment: {
      id: 'unit-sci-1-grand',
      unitCode: 'SCI2-1-GRAND',
      title: 'I단원 변화와 다양성 대단원 마무리',
      category: '대단원 평가',
      badge: '대단원 마무리 문제 (전체)',
      pageRange: 'p.89 ~ p.96',
      problemCount: 0,
    },
  },
  {
    id: 'ch-sci-environment-energy',
    chapterNumber: 2,
    chapterName: '환경과 에너지',
    fullName: 'II. 환경과 에너지',
    subUnits: [
      {
        id: 'unit-sci-2-1',
        unitCode: 'SCI2-2-1',
        title: '1. 생태계와 환경 변화',
        category: '중단원 마무리',
        badge: '중단원 마무리 문제',
        pageRange: 'p.98 ~ p.138',
        problemCount: 0,
      },
      {
        id: 'unit-sci-2-2',
        unitCode: 'SCI2-2-2',
        title: '2. 에너지 전환과 활용',
        category: '중단원 마무리',
        badge: '중단원 마무리 문제',
        pageRange: 'p.139 ~ p.178',
        problemCount: 0,
      },
    ],
    grandAssessment: {
      id: 'unit-sci-2-grand',
      unitCode: 'SCI2-2-GRAND',
      title: 'II단원 환경과 에너지 대단원 마무리',
      category: '대단원 평가',
      badge: '대단원 마무리 문제 (전체)',
      pageRange: 'p.179 ~ p.186',
      problemCount: 0,
    },
  },
  {
    id: 'ch-sci-future-society',
    chapterNumber: 3,
    chapterName: '과학과 미래 사회',
    fullName: 'III. 과학과 미래 사회',
    subUnits: [
      {
        id: 'unit-sci-3-1',
        unitCode: 'SCI2-3-1',
        title: '1. 과학 기술의 활용',
        category: '중단원 마무리',
        badge: '중단원 마무리 문제',
        pageRange: 'p.188 ~ p.220',
        problemCount: 0,
      },
      {
        id: 'unit-sci-3-2',
        unitCode: 'SCI2-3-2',
        title: '2. 과학 기술의 발전과 쟁점',
        category: '중단원 마무리',
        badge: '중단원 마무리 문제',
        pageRange: 'p.221 ~ p.254',
        problemCount: 0,
      },
    ],
    grandAssessment: {
      id: 'unit-sci-3-grand',
      unitCode: 'SCI2-3-GRAND',
      title: 'III단원 과학과 미래 사회 대단원 마무리',
      category: '대단원 평가',
      badge: '대단원 마무리 문제 (전체)',
      pageRange: 'p.255 ~ p.262',
      problemCount: 0,
    },
  },
];

export const getCurriculumForSubject = (subject: SubjectType): ChapterGroup[] => {
  if (subject === 'math') {
    return MATH_MIRAEN_COMMON_MATH_2;
  }
  return SCIENCE_VISANG_INTEGRATED_2;
};