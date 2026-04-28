import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const ChildContext = createContext(null);

export function ChildProvider({ children }) {
    const { token, isAuthenticated } = useAuth();
    const [list, setList] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchChildren = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/parent/children', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'Failed to load children');
            const items = data.children || [];
            setList(items);
            setSelectedChild((prev) => prev || items[0] || null);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (isAuthenticated) fetchChildren();
        else {
            setList([]);
            setSelectedChild(null);
        }
    }, [isAuthenticated, fetchChildren]);

    const value = useMemo(
        () => ({ children: list, selectedChild, setSelectedChild, loading, error, refresh: fetchChildren }),
        [list, selectedChild, loading, error, fetchChildren]
    );

    return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>;
}

export function useChildren() {
    const ctx = useContext(ChildContext);
    if (!ctx) throw new Error('useChildren must be used within ChildProvider');
    return ctx;
}
