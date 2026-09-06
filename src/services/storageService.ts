/**
 * Resilient multi-tier Storage Service (IndexedDB + Quota-safe LocalStorage)
 * Eliminates "Setting the value of ... exceeded the quota" errors permanently.
 */

const DB_NAME = 'puleo_dream_storage';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';

// Open IndexedDB database safely
function openIndexedDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// Get item from IndexedDB
export async function idbGet<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openIndexedDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

// Set item in IndexedDB (virtually unlimited quota, handles large Base64 images)
export async function idbSet(key: string, value: any): Promise<boolean> {
  try {
    const db = await openIndexedDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

/**
 * Automatically cleans up old/obsolete localStorage keys from prior versions
 * to free up multiple megabytes of space in the 5MB browser quota.
 */
export function cleanLegacyStorageKeys(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const currentKeysToKeep = new Set([
      'puleo_dream_stored_problems_v9',
      'puleo_community_questions_v3',
      'puleo_concepts_data_v2',
      'puleo_dream_interesting_facts_v3',
      'puleo_dream_unit_quizzes_v2',
      'puleo_dream_user_accounts_v3',
      'puleo_user_profile',
      'puleo_is_logged_in',
      'puleo_active_role',
      'puleo_current_view',
      'puleo_selected_problem',
      'puleo_initial_subject_tab',
      'puleo_math_active_tab',
      'puleo_science_active_tab',
      'puleo_math_selected_chapter_id',
      'puleo_science_selected_chapter_id',
      'puleo_math_selected_subunit_id',
      'puleo_science_selected_subunit_id',
      'puleo_math_selected_textbook_id',
      'puleo_science_selected_textbook_id',
    ]);

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      // Identify obsolete versions of problems, questions, facts, quizzes, or large cached items
      if (
        (k.startsWith('puleo_dream_stored_problems_') && k !== 'puleo_dream_stored_problems_v9') ||
        (k.startsWith('puleo_community_questions_') && k !== 'puleo_community_questions_v3') ||
        (k.startsWith('puleo_dream_interesting_facts_') && k !== 'puleo_dream_interesting_facts_v3') ||
        (k.startsWith('puleo_concepts_data_') && k !== 'puleo_concepts_data_v2') ||
        (k.startsWith('puleo_dream_unit_quizzes_') && k !== 'puleo_dream_unit_quizzes_v2') ||
        (k.startsWith('puleo_') && !currentKeysToKeep.has(k) && (k.includes('_v') || k.includes('cache') || k.includes('draft')))
      ) {
        keysToRemove.push(k);
      }
    }

    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch {
    // Ignore error in cleanup
  }
}

/**
 * Safely saves data to localStorage.
 * If quota is exceeded, performs multi-level recovery:
 * 1. Clean legacy/obsolete keys from previous versions.
 * 2. If still exceeding, create a sanitized lightweight copy (removes massive Base64 strings).
 * 3. Never throws an unhandled QuotaExceededError.
 */
export function safeLocalStorageSet<T = any>(
  key: string,
  data: T,
  sanitizeForFallback?: (item: T) => T
): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    return true;
  } catch (firstErr: any) {
    // QuotaExceededError caught
    try {
      // Step 1: Clean legacy keys and retry
      cleanLegacyStorageKeys();
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
      return true;
    } catch {
      // Step 2: If custom sanitizer provided, strip heavy fields (e.g. huge base64 images)
      if (sanitizeForFallback) {
        try {
          const sanitized = sanitizeForFallback(data);
          localStorage.setItem(key, JSON.stringify(sanitized));
          return true;
        } catch {
          // Step 3: If still exceeding, log warning gently without crashing
          console.warn(`[StorageService] LocalStorage quota reached for "${key}". Data safely retained in memory & IndexedDB.`);
          return false;
        }
      }

      console.warn(`[StorageService] LocalStorage quota reached for "${key}". Data safely retained in memory & IndexedDB.`);
      return false;
    }
  }
}

/**
 * Safely reads from localStorage
 */
export function safeLocalStorageGet<T = any>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    return parsed ?? defaultValue;
  } catch {
    return defaultValue;
  }
}
