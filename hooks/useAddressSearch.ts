/**
 * P7SAI - 地址搜索優化組件
 * Phase 2: 乘客端 - 地址搜索優化
 * 
 * 優化特點:
 * - 本地緩存 (localStorage)
 * - Debounce 減少 API 請求
 * - 常用地址記憶
 * - 搜索歷史
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

interface AddressSuggestion {
  id: string;
  placeName: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

interface UseAddressSearchOptions {
  enableCache?: boolean;
  enableHistory?: boolean;
  maxSuggestions?: number;
  debounceMs?: number;
}

const STORAGE_KEY = 'p7s_address_cache';
const HISTORY_KEY = 'p7s_address_history';

export const useAddressSearch = (options: UseAddressSearchOptions = {}) => {
  const {
    enableCache = true,
    enableHistory = true,
    maxSuggestions = 10,
    debounceMs = 300
  } = options;

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get cached suggestions
  const getCachedResults = useCallback((q: string): AddressSuggestion[] => {
    if (!enableCache) return [];
    
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (!cached) return [];
      
      const cache = JSON.parse(cached);
      const key = q.toLowerCase();
      
      // Check if cache exists and is valid (24 hours)
      if (cache[key] && cache[key].timestamp > Date.now() - 24 * 60 * 60 * 1000) {
        return cache[key].results;
      }
    } catch (e) {
      console.error('Cache read error:', e);
    }
    
    return [];
  }, [enableCache]);

  // Save to cache
  const saveToCache = useCallback((q: string, results: AddressSuggestion[]) => {
    if (!enableCache) return;
    
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      const cache = cached ? JSON.parse(cached) : {};
      
      cache[q.toLowerCase()] = {
        results,
        timestamp: Date.now()
      };
      
      // Keep only last 100 queries
      const keys = Object.keys(cache);
      if (keys.length > 100) {
        const sorted = keys.sort((a, b) => 
          (cache[b].timestamp || 0) - (cache[a].timestamp || 0)
        );
        keys.slice(100).forEach(k => delete cache[k]);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error('Cache write error:', e);
    }
  }, [enableCache]);

  // Get search history
  const getHistory = useCallback((): AddressSuggestion[] => {
    if (!enableHistory) return [];
    
    try {
      const history = localStorage.getItem(HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (e) {
      return [];
    }
  }, [enableHistory]);

  // Add to history
  const addToHistory = useCallback((suggestion: AddressSuggestion) => {
    if (!enableHistory) return;
    
    try {
      let history = getHistory();
      
      // Remove if already exists
      history = history.filter(h => h.id !== suggestion.id);
      
      // Add to front
      history.unshift(suggestion);
      
      // Keep only last 20
      history = history.slice(0, 20);
      
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('History write error:', e);
    }
  }, [enableHistory, getHistory]);

  // Search function (mock - would integrate with actual map API)
  const search = useCallback(async (q: string): Promise<AddressSuggestion[]> => {
    if (!q || q.length < 2) return [];
    
    // Check cache first
    const cached = getCachedResults(q);
    if (cached.length > 0) {
      return cached.slice(0, maxSuggestions);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Mock API call - replace with actual map API
      // In real app: await fetch(`/api/address?q=${encodeURIComponent(q)}`)
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const mockResults: AddressSuggestion[] = [
        { id: `1-${q}`, placeName: `${q} - 深圳`, address: '深圳市南山區' },
        { id: `2-${q}`, placeName: `${q} - 銅鑼灣`, address: '香港島銅鑼灣' },
        { id: `3-${q}`, placeName: `${q} - 旺角`, address: '九龍旺角' },
        { id: `4-${q}`, placeName: `${q} - 中環`, address: '香港島中環' },
        { id: `5-${q}`, placeName: `${q} - 機場`, address: '赤鱲角機場' },
      ].slice(0, maxSuggestions);
      
      // Save to cache
      saveToCache(q, mockResults);
      
      setSuggestions(mockResults);
      return mockResults;
      
    } catch (e) {
      setError('搜索失敗');
      return [];
    } finally {
      setLoading(false);
    }
  }, [getCachedResults, maxSuggestions, saveToCache]);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    const timer = setTimeout(() => {
      search(query);
    }, debounceMs);
    
    return () => clearTimeout(timer);
  }, [query, search, debounceMs]);

  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    loading,
    error,
    search,
    clearSuggestions,
    addToHistory,
    getHistory: getHistory()
  };
};

export default useAddressSearch;
