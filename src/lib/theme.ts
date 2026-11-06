'use client';

import { useEffect, useSyncExternalStore } from 'react';

export const THEME_KEY = 'rodanexo_theme';

type Theme = 'light' | 'dark';
/** O que a pessoa escolheu: um tema fixo ou seguir o sistema. */
export type ThemeMode = Theme | 'system';

const CHANGE_EVENT = 'rodanexo-theme';

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function currentMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// O tema mora no data-theme do <html> e a escolha no localStorage; um evento avisa os botões
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    observer.disconnect();
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function paint(theme: Theme) {
  if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
}

function saveMode(mode: ThemeMode) {
  try {
    if (mode === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, mode);
  } catch {
    // sem storage (aba privada): a escolha vale só para esta visita
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** true só depois da hidratação: para o que o servidor não tem como saber. */
export function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

/**
 * Tema atual, escolha (claro/escuro/sistema) e troca. A troca abre o tema novo num círculo
 * a partir do ponto clicado (View Transitions); sem suporte ou com movimento reduzido, troca direto.
 */
export function useTheme() {
  const theme = useSyncExternalStore<Theme>(subscribe, currentTheme, () => 'light');
  const mode = useSyncExternalStore<ThemeMode>(subscribe, currentMode, () => 'system');

  // Em "seguir o sistema", acompanha a troca de tema do sistema operacional
  useEffect(() => {
    if (mode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => paint(systemTheme());
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [mode]);

  const setMode = (next: ThemeMode, origin?: { clientX: number; clientY: number }) => {
    const target = next === 'system' ? systemTheme() : next;
    const commit = () => {
      paint(target);
      saveMode(next);
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (target === currentTheme() || !document.startViewTransition || reduced) return commit();

    const x = origin?.clientX ?? window.innerWidth / 2;
    const y = origin?.clientY ?? window.innerHeight / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    document.startViewTransition(commit).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 560, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  };

  const toggle = (origin?: { clientX: number; clientY: number }) =>
    setMode(currentTheme() === 'dark' ? 'light' : 'dark', origin);

  return { theme, mode, setMode, toggle };
}
