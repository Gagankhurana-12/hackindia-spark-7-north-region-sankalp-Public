import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const TOKEN_KEY = 'parentToken';

const readStoredToken = () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};

export function AuthProvider({ children }) {
    const [token, setToken] = useState(readStoredToken);
    const [parent, setParent] = useState(null);
    const [hydrating, setHydrating] = useState(!!readStoredToken());

    useEffect(() => {
        let cancelled = false;
        if (!token) {
            setParent(null);
            setHydrating(false);
            return;
        }
        setHydrating(true);
        (async () => {
            try {
                const res = await fetch('/api/auth/me', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error('Session invalid');
                const data = await res.json();
                if (!cancelled) setParent(data);
            } catch {
                if (!cancelled) {
                    try { localStorage.removeItem(TOKEN_KEY); } catch (_) { /* ignore */ }
                    setToken(null);
                    setParent(null);
                }
            } finally {
                if (!cancelled) setHydrating(false);
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    const setSession = useCallback(({ token: newToken, parent: parentData }) => {
        if (newToken) {
            try { localStorage.setItem(TOKEN_KEY, newToken); } catch (_) { /* ignore */ }
            setToken(newToken);
        }
        if (parentData) setParent(parentData);
    }, []);

    const login = useCallback(async (email, password) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data?.message || 'Login failed');
        }
        setSession({ token: data.token, parent: data.parent });
        return data;
    }, [setSession]);

    const logout = useCallback(() => {
        try { localStorage.removeItem(TOKEN_KEY); } catch (_) { /* ignore */ }
        setToken(null);
        setParent(null);
    }, []);

    const value = useMemo(
        () => ({ token, parent, login, logout, setSession, hydrating, isAuthenticated: !!token }),
        [token, parent, login, logout, setSession, hydrating]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
