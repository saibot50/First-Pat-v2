import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../services/firebase';

export const AuthIndicator: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Sign out error', error);
        }
    };

    if (!user) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg border border-slate-200 z-50 flex items-center space-x-3 text-sm">
            <div className="flex flex-col">
                <span className="text-slate-500 text-xs">Signed in as</span>
                <span className="font-medium text-slate-800">{user.email}</span>
            </div>
            <button
                onClick={handleSignOut}
                className="text-red-600 hover:text-red-800 px-2 py-1 bg-red-50 hover:bg-red-100 rounded transition-colors"
            >
                Sign Out
            </button>
        </div>
    );
};
