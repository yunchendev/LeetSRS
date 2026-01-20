import { MessageType, sendMessage } from '@/shared/messages';
import { getThemeColors } from './theme';

const RESET_CONFIRM_TIMEOUT_MS = 2000;
const RESET_CONFIRM_POLL_MS = 50;
const RESET_NAVIGATION_DELAY_MS = 400;
const RESET_TOAST_DURATION_MS = 2500;
const SLUG_CHECK_INTERVAL_MS = 1000;

export function setupLeetcodeAutoReset(): void {
  if (!isLeetcodeHost()) {
    return;
  }

  setupAutoReset({
    label: 'LeetCode editor',
    getSlug: getLeetcodeSlug,
    isEnabled: async () => sendMessage({ type: MessageType.GET_AUTO_CLEAR_LEETCODE }),
    resetForSlug: async (_slug) => {
      const resetButton = findLeetcodeResetButton();
      if (!resetButton) {
        return false;
      }

      resetButton.click();
      return await waitForConfirmClick(findLeetcodeConfirmButton);
    },
    onSuccess: () => {
      showToast('Code reset to default');
    },
  });
}

export function setupNeetcodeAutoReset(): void {
  if (!isNeetcodeHost()) {
    return;
  }

  setupAutoReset({
    label: 'NeetCode editor',
    getSlug: getNeetcodeSlug,
    isEnabled: async () => sendMessage({ type: MessageType.GET_AUTO_CLEAR_NEETCODE }),
    resetForSlug: async (_slug) => {
      const resetButton = findNeetcodeResetButton();
      if (!resetButton) {
        return false;
      }

      resetButton.click();
      return await waitForConfirmClick(findNeetcodeConfirmButton);
    },
    onSuccess: () => {
      showToast('Code reset to default');
    },
  });
}

type AutoResetConfig = {
  label: string;
  getSlug: () => string | null;
  isEnabled: () => Promise<boolean>;
  resetForSlug: (slug: string) => Promise<boolean>;
  onSuccess?: () => void;
};

function setupAutoReset(config: AutoResetConfig): void {
  let lastSlug: string | null = null;
  let lastResetSlug: string | null = null;
  let isResetting = false;
  let lastAttemptedSlug: string | null = null;
  let lastAttemptAt = 0;

  const checkForNavigation = () => {
    const slug = config.getSlug();
    if (!slug) {
      lastSlug = null;
      return;
    }

    const now = Date.now();
    if (slug !== lastSlug) {
      lastSlug = slug;
      lastAttemptedSlug = null;
      lastAttemptAt = 0;
    }

    if (slug !== lastResetSlug) {
      if (lastAttemptedSlug === slug && now - lastAttemptAt < SLUG_CHECK_INTERVAL_MS) {
        return;
      }

      lastAttemptedSlug = slug;
      lastAttemptAt = now;
      window.setTimeout(() => {
        void tryAutoReset(slug);
      }, RESET_NAVIGATION_DELAY_MS);
    }
  };

  const tryAutoReset = async (slug: string) => {
    if (isResetting || slug === lastResetSlug) {
      return;
    }

    isResetting = true;
    try {
      const autoClearEnabled = await config.isEnabled();
      if (!autoClearEnabled) {
        return;
      }

      const didReset = await config.resetForSlug(slug);
      if (didReset) {
        config.onSuccess?.();
        lastResetSlug = slug;
      }
    } catch (error) {
      console.error(`Failed to auto reset ${config.label}:`, error);
    } finally {
      isResetting = false;
    }
  };

  checkForNavigation();

  const observer = new MutationObserver(() => {
    checkForNavigation();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('popstate', checkForNavigation);
  window.setInterval(checkForNavigation, SLUG_CHECK_INTERVAL_MS);
}

function getLeetcodeSlug(): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextRouter = (window as any).next?.router;
  if (nextRouter?.query?.slug) {
    return nextRouter.query.slug;
  }

  const match = window.location.pathname.match(/\/problems\/([^/]+)/);
  return match ? match[1] : null;
}

function getNeetcodeSlug(): string | null {
  const match = window.location.pathname.match(/\/problems\/([^/]+)/);
  return match ? match[1] : null;
}

function isLeetcodeHost(): boolean {
  return window.location.hostname.endsWith('leetcode.com');
}

function isNeetcodeHost(): boolean {
  return window.location.hostname.endsWith('neetcode.io');
}

function waitForConfirmClick(findConfirmButton: () => HTMLElement | null): Promise<boolean> {
  return new Promise((resolve) => {
    const existing = findConfirmButton();
    if (existing) {
      existing.click();
      resolve(true);
      return;
    }

    const start = Date.now();
    const interval = window.setInterval(() => {
      const button = findConfirmButton();
      if (button) {
        button.click();
        window.clearInterval(interval);
        resolve(true);
        return;
      }

      if (Date.now() - start >= RESET_CONFIRM_TIMEOUT_MS) {
        window.clearInterval(interval);
        resolve(false);
      }
    }, RESET_CONFIRM_POLL_MS);
  });
}

type FindButtonOptions = {
  icon?: string;
  text?: string[];
  root?: ParentNode;
};

function findButton({ icon, text, root = document }: FindButtonOptions): HTMLButtonElement | null {
  const buttons = Array.from(root.querySelectorAll('button'));
  const loweredText = text?.map((entry) => entry.trim().toLowerCase()) ?? [];

  for (const button of buttons) {
    if (icon && button.querySelector(`svg[data-icon='${icon}']`)) {
      return button;
    }

    if (!loweredText.length) {
      continue;
    }

    const label = button.textContent?.trim().toLowerCase() ?? '';
    if (!label) {
      continue;
    }

    if (loweredText.includes(label)) {
      return button;
    }
  }

  return null;
}

function findLeetcodeResetButton(): HTMLButtonElement | null {
  return findButton({ icon: 'arrow-rotate-left' });
}

function findLeetcodeConfirmButton(): HTMLElement | null {
  return findButton({ text: ['confirm'] });
}

function findNeetcodeResetButton(): HTMLButtonElement | null {
  return findButton({ icon: 'arrow-rotate-left' });
}

function findNeetcodeConfirmButton(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll('button.btn.btn-secondary.btn-danger'));
  for (const button of candidates) {
    if (!(button instanceof HTMLButtonElement)) {
      continue;
    }
    const label = button.textContent?.trim().toLowerCase() ?? '';
    if (label === 'reset') {
      return button;
    }
  }

  return findButton({ text: ['reset'] });
}

function showToast(message: string): void {
  const theme = getThemeColors();
  const toast = document.createElement('div');
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    background: theme.bgSecondary,
    color: theme.textPrimary,
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    border: `1px solid ${theme.border}`,
    zIndex: '9999',
    opacity: '0',
    transition: 'opacity 0.3s ease-in-out',
  } as Partial<CSSStyleDeclaration>);

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });

  window.setTimeout(() => {
    toast.style.opacity = '0';
    window.setTimeout(() => toast.remove(), 300);
  }, RESET_TOAST_DURATION_MS);
}
