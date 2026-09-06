import { InterestingFactItem } from '../types';
import {
  idbSet,
  safeLocalStorageGet,
  safeLocalStorageSet,
} from '../services/storageService';

export const INITIAL_INTERESTING_FACTS: InterestingFactItem[] = [];

const FACTS_STORAGE_KEY = 'puleo_dream_interesting_facts_v3';

export const getStoredInterestingFacts = (): InterestingFactItem[] => {
  const parsed = safeLocalStorageGet<InterestingFactItem[]>(FACTS_STORAGE_KEY, []);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  return [];
};

export const saveStoredInterestingFacts = (facts: InterestingFactItem[]): void => {
  if (!Array.isArray(facts)) return;
  idbSet(FACTS_STORAGE_KEY, facts).catch(() => {});
  safeLocalStorageSet(FACTS_STORAGE_KEY, facts);
};
