import { useState, useEffect, useCallback } from 'react';

export type RouteTab = 'painel' | 'backlog' | 'jogando' | 'wrapup' | 'jogo';

export interface RouteState {
  tab: RouteTab;
  gameId?: string;
  wrapUpYear?: string;
  queryParams: Record<string, string>;
  rawHash: string;
}

function parseHash(hash: string): RouteState {
  // Remove leading # or #/
  const clean = hash.replace(/^#\/?/, '');
  const [pathPart, queryPart] = clean.split('?');
  const segments = (pathPart || '').split('/').filter(Boolean);

  // Parse query params
  const queryParams: Record<string, string> = {};
  if (queryPart) {
    const searchParams = new URLSearchParams(queryPart);
    searchParams.forEach((val, key) => {
      queryParams[key] = val;
    });
  }

  // Default to painel if empty
  if (segments.length === 0 || segments[0] === 'dashboard' || segments[0] === 'painel') {
    return {
      tab: 'painel',
      queryParams,
      rawHash: hash,
    };
  }

  const first = segments[0].toLowerCase();

  if (first === 'jogo' || first === 'game') {
    return {
      tab: 'jogo',
      gameId: segments[1] ? decodeURIComponent(segments[1]) : queryParams.id || undefined,
      queryParams,
      rawHash: hash,
    };
  }

  if (first === 'backlog') {
    return {
      tab: 'backlog',
      queryParams,
      rawHash: hash,
    };
  }

  if (first === 'jogando' || first === 'playing') {
    return {
      tab: 'jogando',
      gameId: segments[1] ? decodeURIComponent(segments[1]) : queryParams.id || undefined,
      queryParams,
      rawHash: hash,
    };
  }

  if (first === 'wrapup' || first === 'retrospectiva') {
    return {
      tab: 'wrapup',
      wrapUpYear: segments[1] || undefined,
      queryParams,
      rawHash: hash,
    };
  }

  return {
    tab: 'painel',
    queryParams,
    rawHash: hash,
  };
}

export function useHashRoute() {
  const [route, setRoute] = useState<RouteState>(() => {
    if (typeof window !== 'undefined') {
      return parseHash(window.location.hash);
    }
    return { tab: 'painel', queryParams: {}, rawHash: '' };
  });

  useEffect(() => {
    const handleHashChange = () => {
      const parsed = parseHash(window.location.hash);
      setRoute(parsed);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };

    window.addEventListener('hashchange', handleHashChange);
    // If no hash initially, set default hash to #/painel
    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
      window.location.hash = '#/painel';
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Set document title based on route
  useEffect(() => {
    switch (route.tab) {
      case 'painel':
        document.title = 'Painel · GameHub';
        break;
      case 'backlog':
        document.title = 'Backlog · GameHub';
        break;
      case 'jogando':
        document.title = 'Jogando Agora · GameHub';
        break;
      case 'wrapup':
        document.title = route.wrapUpYear
          ? `Retrospectiva ${route.wrapUpYear} · GameHub`
          : 'Retrospectiva · GameHub';
        break;
      case 'jogo':
        document.title = 'Detalhe do Jogo · GameHub';
        break;
      default:
        document.title = 'GameHub';
    }
  }, [route]);

  const navigate = useCallback(
    (to: string, options?: { replace?: boolean }) => {
      let targetHash = to.startsWith('#') ? to : `#${to.startsWith('/') ? '' : '/'}${to}`;
      if (options?.replace) {
        const url = new URL(window.location.href);
        url.hash = targetHash;
        window.history.replaceState(null, '', url.toString());
        setRoute(parseHash(targetHash));
      } else {
        window.location.hash = targetHash;
      }
    },
    []
  );

  const setQueryParams = useCallback(
    (params: Record<string, string | null | undefined>, options?: boolean | { replace?: boolean }) => {
      const replace = typeof options === 'boolean' ? options : options?.replace ?? true;
      const currentHash = window.location.hash.replace(/^#\/?/, '');
      const [pathPart, queryPart] = currentHash.split('?');
      const searchParams = new URLSearchParams(queryPart || '');

      Object.entries(params).forEach(([key, val]) => {
        if (val === null || val === undefined || val === '') {
          searchParams.delete(key);
        } else {
          searchParams.set(key, val);
        }
      });

      const queryString = searchParams.toString();
      const newHash = `#/${pathPart}${queryString ? `?${queryString}` : ''}`;

      if (replace) {
        const url = new URL(window.location.href);
        url.hash = newHash;
        window.history.replaceState(null, '', url.toString());
        setRoute(parseHash(newHash));
      } else {
        window.location.hash = newHash;
      }
    },
    []
  );

  const goBack = useCallback((fallback = '/painel') => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(fallback);
    }
  }, [navigate]);

  return {
    ...route,
    route: {
      path: route.tab,
      params: { id: route.gameId, ano: route.wrapUpYear },
      query: route.queryParams,
    },
    query: route.queryParams,
    updateQuery: setQueryParams,
    navigate,
    setQueryParams,
    goBack,
  };
}
