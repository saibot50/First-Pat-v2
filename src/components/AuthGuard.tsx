import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useNavigate, useLocation } from 'react-router-dom';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    // We use a separate state to track if we should render children
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setShouldRender(true);
            } else {
                setShouldRender(false);
                // Redirect to login, saving the location they were trying to access
                navigate('/login', { replace: true, state: { from: location } });
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [navigate, location]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-sans">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    // If not loading and authenticated, render children
    // If not authenticated, we already navigated away, but return null to be safe
    return shouldRender ? <>{children}</> : null;
};
