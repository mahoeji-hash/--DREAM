import { ConceptItem } from '../types';
import {
  idbSet,
  safeLocalStorageGet,
  safeLocalStorageSet,
} from '../services/storageService';

export const INITIAL_CONCEPTS: ConceptItem[] = [];

const LOCAL_STORAGE_CONCEPTS_KEY = 'puleo_concepts_data_v2';

export function getStoredConcepts(): ConceptItem[] {
  const parsed = safeLocalStorageGet<ConceptItem[]>(LOCAL_STORAGE_CONCEPTS_KEY, []);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  return [];
}

export function saveStoredConcepts(concepts: ConceptItem[]): void {
  if (!Array.isArray(concepts)) return;
  idbSet(LOCAL_STORAGE_CONCEPTS_KEY, concepts).catch(() => {});
  safeLocalStorageSet(LOCAL_STORAGE_CONCEPTS_KEY, concepts);
}
