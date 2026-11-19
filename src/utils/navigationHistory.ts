import { useEffect, useRef } from 'react';

/**
 * Hook to synchronize any modal or overlay with browser history (Back button / swipe-back gesture).
 *
 * Behavior:
 * - When `isOpen` becomes true, pushes a unique history state to `window.history`.
 * - When user presses browser back button (or Android back gesture / mouse back button),
 *   `popstate` fires and automatically invokes `onClose()`.
 * - When user closes the modal via UI buttons (e.g. 'X' or backdrop click),
 *   it automatically pops the history entry (`window.history.back()`) to keep the history stack clean.
 */
export function useModalHistory(
  isOpen: boolean,
  onClose: () => void,
  modalKey: string
) {
  const isPushedRef = useRef(false);
  const isClosingByPopRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Modal opened -> push a new history entry
    isPushedRef.current = true;
    isClosingByPopRef.current = false;
    const historyState = {
      puleoModal: modalKey,
      timestamp: Date.now(),
    };

    window.history.pushState(historyState, '', `#${modalKey}`);

    const handlePopState = (e: PopStateEvent) => {
      // If browser back was pressed while our modal is active
      if (isPushedRef.current) {
        isPushedRef.current = false;
        isClosingByPopRef.current = true;
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);

      // If modal was closed programmatically or by UI click (NOT by browser back button)
      if (isPushedRef.current && !isClosingByPopRef.current) {
        isPushedRef.current = false;
        // Verify current top state is indeed this modal before calling history.back()
        if (window.history.state?.puleoModal === modalKey) {
          window.history.back();
        }
      }
    };
  }, [isOpen, modalKey]);
}
