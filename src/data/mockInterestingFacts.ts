import { InterestingFactItem, SubjectType } from '../types';

export const INITIAL_INTERESTING_FACTS: InterestingFactItem[] = [
  {
    id: 'fact-math-1',
    subject: 'math',
    title: '자연 속에 숨겨진 마법의 비율, 피보나치 수열과 황금비',
    subtitle: '해바라기 씨앗부터 은하수의 나선까지 이어지는 1:1.618',
    category: '자연과 수학',
    content: '1, 1, 2, 3, 5, 8, 13, 21... 앞의 두 수를 더해 다음 수가 되는 피보나치 수열! 해바라기 씨앗의 나선 개수, 솔방울의 비늘, 파인애플 껍질의 눈까지 자연계의 모든 최적화 배열은 이 비율을 따릅니다. 인접한 두 수의 비율은 약 1:1.618인 황금비로 수렴하며, 신용카드, 모나리자, 애플 로고에도 널리 쓰이고 있습니다.',
    posterImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="100%" height="100%"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e3a8a"/><stop offset="50%" stop-color="%234338ca"/><stop offset="100%" stop-color="%230f172a"/></linearGradient><linearGradient id="spiral" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23fbbf24"/><stop offset="100%" stop-color="%23f59e0b"/></linearGradient></defs><rect width="640" height="360" fill="url(%23bg)"/><circle cx="320" cy="180" r="140" fill="none" stroke="%2338bdf8" stroke-width="2" stroke-dasharray="6,6" opacity="0.3"/><path d="M 220 230 C 220 200, 240 180, 270 180 C 310 180, 330 220, 370 220 C 420 220, 460 160, 460 110" fill="none" stroke="url(%23spiral)" stroke-width="8" stroke-linecap="round"/><rect x="220" y="180" width="50" height="50" fill="%23fbbf24" fill-opacity="0.15" stroke="%23fbbf24" stroke-width="2"/><rect x="270" y="150" width="80" height="80" fill="%2338bdf8" fill-opacity="0.15" stroke="%2338bdf8" stroke-width="2"/><rect x="220" y="70" width="130" height="130" fill="%23a855f7" fill-opacity="0.15" stroke="%23a855f7" stroke-width="2"/><text x="40" y="60" fill="%23fbbf24" font-size="18" font-family="sans-serif" font-weight="900" letter-spacing="2">FIBONACCI &amp; GOLDEN RATIO</text><text x="40" y="310" fill="%23ffffff" font-size="24" font-family="sans-serif" font-weight="900">피보나치 수열과 황금비의 비밀 🌻</text><text x="40" y="335" fill="%2393c5fd" font-size="14" font-family="sans-serif" font-weight="bold">자연이 선택한 가장 완벽한 성장 곡선 (1.618 : 1)</text><rect x="520" y="295" width="85" height="32" rx="8" fill="%23ef4444"/><text x="532" y="316" fill="%23ffffff" font-size="12" font-family="sans-serif" font-weight="900">4컷 만화</text></svg>',
    comicCuts: [
      {
        id: 'cut-math-1',
        cutNumber: 1,
        title: '1컷: 토끼 번식 문제와 수열의 탄생',
        caption: '13세기 이탈리아의 수학자 피보나치는 "토끼 한 쌍이 매달 새끼를 낳으면 몇 쌍이 될까?"라는 호기심에서 [1, 1, 2, 3, 5, 8, 13, 21...] 수열을 발견했습니다.',
        imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="100%" height="100%"><rect width="400" height="250" fill="%23eff6ff"/><circle cx="120" cy="110" r="45" fill="%23dbeafe" stroke="%233b82f6" stroke-width="3"/><text x="120" y="120" font-size="36" text-anchor="middle">🐰</text><circle cx="280" cy="90" r="35" fill="%23fef3c7" stroke="%23f59e0b" stroke-width="3"/><circle cx="250" cy="150" r="30" fill="%23fef3c7" stroke="%23f59e0b" stroke-width="3"/><circle cx="320" cy="150" r="30" fill="%23fef3c7" stroke="%23f59e0b" stroke-width="3"/><text x="280" y="98" font-size="26" text-anchor="middle">🐰</text><text x="250" y="158" font-size="22" text-anchor="middle">🐇</text><text x="320" y="158" font-size="22" text-anchor="middle">🐇</text><rect x="30" y="195" width="340" height="38" rx="10" fill="%231e40af"/><text x="200" y="220" fill="%23ffffff" font-size="15" font-family="sans-serif" font-weight="900" text-anchor="middle">1 → 1 → 2 → 3 → 5 → 8 → 13 → 21...</text></svg>',
      },
      {
        id: 'cut-math-2',
        cutNumber: 2,
        title: '2컷: 황금 사각형과 나선 곡선',
        caption: '피보나치 수열의 정사각형들을 이어붙이고 호를 그리면 아름다운 "황금 나선"이 만들어집니다. 인접한 두 수의 비율(21÷13)은 정확히 1.618(황금비 Φ)에 가까워집니다.',
        imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="100%" height="100%"><rect width="400" height="250" fill="%23f8fafc"/><rect x="50" y="40" width="300" height="170" fill="%23fef08a" fill-opacity="0.3" stroke="%23eab308" stroke-width="3"/><rect x="50" y="40" width="170" height="170" fill="%23bfdbfe" fill-opacity="0.4" stroke="%233b82f6" stroke-width="2"/><rect x="220" y="40" width="130" height="130" fill="%23fbcfe8" fill-opacity="0.4" stroke="%23ec4899" stroke-width="2"/><path d="M 50 210 A 170 170 0 0 1 220 40 A 130 130 0 0 1 350 170" fill="none" stroke="%23ef4444" stroke-width="5" stroke-linecap="round"/><text x="200" y="235" fill="%231e293b" font-size="14" font-family="sans-serif" font-weight="900" text-anchor="middle">비율(b ÷ a) = 1 : 1.618033... (황금비 Φ)</text></svg>',
      },
      {
        id: 'cut-math-3',
        cutNumber: 3,
        title: '3컷: 해바라기 씨앗과 솔방울의 비밀',
        caption: '해바라기 씨앗은 서로 부딪히지 않고 가장 빽빽하게 햇빛을 받기 위해 시계방향 34개, 반시계방향 55개의 피보나치 나선으로 배열되어 있습니다!',
        imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="100%" height="100%"><rect width="400" height="250" fill="%23fefce8"/><circle cx="200" cy="115" r="75" fill="%23fde047" stroke="%23ca8a04" stroke-width="4"/><circle cx="200" cy="115" r="55" fill="%23854d0e"/><circle cx="180" cy="105" r="4" fill="%23fef08a"/><circle cx="200" cy="95" r="4" fill="%23fef08a"/><circle cx="220" cy="105" r="4" fill="%23fef08a"/><circle cx="215" cy="125" r="4" fill="%23fef08a"/><circle cx="190" cy="130" r="4" fill="%23fef08a"/><text x="200" y="125" font-size="34" text-anchor="middle">🌻</text><text x="200" y="225" fill="%23713f12" font-size="14" font-family="sans-serif" font-weight="900" text-anchor="middle">나선 개수: 21 / 34 / 55 / 89 (모두 피보나치 수!)</text></svg>',
      },
      {
        id: 'cut-math-4',
        cutNumber: 4,
        title: '4컷: 신용카드와 예술 속 황금비',
        caption: '우리가 지갑에 넣고 다니는 신용카드(가로 8.56cm : 세로 5.398cm ≈ 1.586)와 모나리자의 구도, 스마트폰 로고까지 인류가 가장 안정감을 느끼는 황금비가 숨어있습니다.',
        imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="100%" height="100%"><rect width="400" height="250" fill="%23f1f5f9"/><rect x="80" y="55" width="240" height="140" rx="14" fill="%231e293b" stroke="%23475569" stroke-width="3"/><rect x="110" y="90" width="40" height="30" rx="6" fill="%23fbbf24"/><circle cx="270" cy="140" r="22" fill="%23ef4444" fill-opacity="0.8"/><circle cx="250" cy="140" r="22" fill="%23f59e0b" fill-opacity="0.8"/><text x="200" y="225" fill="%23334155" font-size="13" font-family="sans-serif" font-weight="900" text-anchor="middle">💳 신용카드 가로/세로 비율 ≈ 1.6 : 1 황금 사각형</text></svg>',
      },
    ],
    authorName: '선생님 공식 포스터',
    createdAt: '2026-08-25',
    tags: ['#피보나치', '#황금비', '#자연의규칙', '#4컷만화'],
    likes: 24,
    bgGradient: 'from-blue-600 via-indigo-600 to-purple-700',
  },
  {
    id: 'fact-sci-1',
    subject: 'science',
    title: '지구상 모든 인류의 원자 속 빈 공간을 빼면 각설탕 하나?',
    subtitle: '물질을 이루는 원자의 99.9999999%는 텅 빈 공간이다',
    category: '미시세계의 비밀',
    content: '우리를 이루는 원자는 축구장 한가운데 놓인 탁구공(원자핵)과 관람석을 도는 파리(전자)처럼 거의 텅 비어 있습니다. 지구상의 전 인류(약 80억 명) 몸속 모든 원자에서 빈 공간을 완전히 압축해 원자핵들만 뭉치면 각설탕 하나 크기(약 1cm³)에 불과합니다!',
    posterImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="100%" height="100%"><defs><linearGradient id="bgsci" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23064e3b"/><stop offset="50%" stop-color="%230f766e"/><stop offset="100%" stop-color="%23022c22"/></linearGradient></defs><rect width="640" height="360" fill="url(%23bgsci)"/><ellipse cx="320" cy="180" rx="160" ry="60" fill="none" stroke="%2334d399" stroke-width="2" stroke-dasharray="4,4" transform="rotate(-25 320 180)"/><ellipse cx="320" cy="180" rx="160" ry="60" fill="none" stroke="%2322d3ee" stroke-width="2" stroke-dasharray="4,4" transform="rotate(25 320 180)"/><circle cx="320" cy="180" r="28" fill="%23f43f5e" stroke="%23ffffff" stroke-width="3"/><text x="320" y="186" fill="%23ffffff" font-size="14" font-family="sans-serif" font-weight="900" text-anchor="middle">원자핵</text><circle cx="170" cy="140" r="10" fill="%2338bdf8"/><circle cx="470" cy="220" r="10" fill="%2338bdf8"/><text x="40" y="60" fill="%2334d399" font-size="18" font-family="sans-serif" font-weight="900" letter-spacing="2">QUANTUM &amp; ATOM STRUCTURE</text><text x="40" y="310" fill="%23ffffff" font-size="24" font-family="sans-serif" font-weight="900">원자의 99.9999999%는 텅 빈 공간! ⚛️</text><text x="40" y="335" fill="%23a7f3d0" font-size="14" font-family="sans-serif" font-weight="bold">전 인류 80억 명의 원자핵을 모으면 각설탕 1개(1cm³)?</text><rect x="520" y="295" width="85" height="32" rx="8" fill="%2310b981"/><text x="532" y="316" fill="%23ffffff" font-size="12" font-family="sans-serif" font-weight="900">4컷 만화</text></svg>',
    comicCuts: [
      {
        id: 'cut-sci-1',
        cutNumber: 1,
        title: '1컷: 딱딱해 보이는 책상과 우리 몸',
        caption: '우리는 단단한 물체와 우리 몸이 물질로 꽉 차 있다고 생각합니다. 하지만 물질의 기본 단위인 원자를 현미경 너머로 들여다보면 충격적인 사실이 숨어있습니다.',
        imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="100%" height="100%"><rect width="400" height="250" fill="%23ecfdf5"/><rect x="80" y="80" width="240" height="90" rx="10" fill="%23b45309" stroke="%2378350f" stroke-width="3"/><text x="200" y="135" fill="%23fef3c7" font-size="20" font-family="sans-serif" font-weight="900" text-anchor="middle">단단한 나무 책상 &amp; 물체</text><text x="200" y="215" fill="%23065f46" font-size="13" font-family="sans-serif" font-weight="bold" text-anchor="middle">"안이 꽉 차 있는 것처럼 보이지만...?"</text></svg>',
      },
      {
        id: 'cut-sci-2',
        cutNumber: 2,
        title: '2컷: 상암 월드컵 경기장과 탁구공',
        caption: '원자핵의 크기를 축구장 한가운데 놓인 작은 탁구공에 비유하면, 전자는 관람석 맨 꼭대기를 날아다니는 파리 한 마리에 불과합니다. 그 사이는 완전한 진공입니다!',
        imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="100%" height="100%"><rect width="400" height="250" fill="%23f0fdf4"/><rect x="40" y="40" width="320" height="150" rx="20" fill="%2315803d" stroke="%23166534" stroke-width="4"/><circle cx="200" cy="115" r="40" fill="none" stroke="%23ffffff" stroke-width="2"/><line x1="200" y1="40" x2="200" y2="190" stroke="%23ffffff" stroke-width="2"/><circle cx="200" cy="115" r="10" fill="%23f97316" stroke="%23ffffff" stroke-width="2"/><text x="200" y="100" fill="%23fef08a" font-size="11" font-weight="900" text-anchor="middle">탁구공 (원자핵)</text><text x="320" y="70" fill="%2338bdf8" font-size="11" font-weight="900" text-anchor="middle">파리 (전자) 🪰</text><text x="200" y="225" fill="%2314532d" font-size="13" font-family="sans-serif" font-weight="900" text-anchor="middle">경기장 크기 = 원자 크기 / 탁구공 = 원자핵 (나머진 빈 공간!)</text></svg>',
      },
      {
        id: 'cut-sci-3',
        cutNumber: 3,
        title: '3컷: 원자의 99.9999999%는 빈 공간',
        caption: '놀랍게도 원자 부피의 99.9999999%는 아무것도 없는 빈 공간이며, 질량의 99.95% 이상은 가운데 아주 작은 원자핵에 집중되어 있습니다.',
        imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="100%" height="100%"><rect width="400" height="250" fill="%230f172a"/><circle cx="200" cy="110" r="80" fill="none" stroke="%2338bdf8" stroke-width="3" stroke-dasharray="6,6"/><circle cx="200" cy="110" r="14" fill="%23ef4444" stroke="%23ffffff" stroke-width="2"/><text x="200" y="115" fill="%23ffffff" font-size="10" font-weight="900" text-anchor="middle">핵</text><text x="200" y="70" fill="%2338bdf8" font-size="13" font-weight="900" text-anchor="middle">99.9999999% 텅 빈 공간</text><text x="200" y="220" fill="%2334d399" font-size="14" font-family="sans-serif" font-weight="900" text-anchor="middle">질량은 원자핵에 99.95% 집중!</text></svg>',
      },
      {
        id: 'cut-sci-4',
        cutNumber: 4,
        title: '4컷: 전 인류를 압축하면 각설탕 1개?',
        caption: '지구상의 약 80억 인류 몸속 모든 원자에서 빈 공간을 완전히 압축해 원자핵들만 뭉치면, 놀랍게도 가로세로 1cm 크기의 각설탕 하나에 쏙 들어갑니다! (무게는 수억 톤)',
        imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="100%" height="100%"><rect width="400" height="250" fill="%23f8fafc"/><rect x="150" y="65" width="100" height="100" rx="10" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="4"/><polygon points="150,65 180,40 280,40 250,65" fill="%23e2e8f0" stroke="%23cbd5e1" stroke-width="3"/><polygon points="250,65 280,40 280,140 250,165" fill="%2394a3b8" stroke="%23cbd5e1" stroke-width="3"/><text x="200" y="125" fill="%230f172a" font-size="28" text-anchor="middle">🧊</text><text x="200" y="195" fill="%23047857" font-size="13" font-family="sans-serif" font-weight="900" text-anchor="middle">각설탕 1개 크기 (1cm³) = 80억 인류의 순수 원자핵</text></svg>',
      },
    ],
    authorName: '선생님 공식 포스터',
    createdAt: '2026-08-25',
    tags: ['#통합과학', '#원자구조', '#물리의신비', '#4컷만화'],
    likes: 31,
    bgGradient: 'from-emerald-600 via-teal-600 to-cyan-700',
  },
];

import {
  idbSet,
  safeLocalStorageGet,
  safeLocalStorageSet,
} from '../services/storageService';

const FACTS_STORAGE_KEY = 'puleo_dream_interesting_facts_v2';

export const getStoredInterestingFacts = (): InterestingFactItem[] => {
  const parsed = safeLocalStorageGet<InterestingFactItem[]>(FACTS_STORAGE_KEY, []);
  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed;
  }
  return INITIAL_INTERESTING_FACTS;
};

export const saveStoredInterestingFacts = (facts: InterestingFactItem[]): void => {
  if (!Array.isArray(facts)) return;
  idbSet(FACTS_STORAGE_KEY, facts).catch(() => {});
  safeLocalStorageSet(FACTS_STORAGE_KEY, facts);
};


