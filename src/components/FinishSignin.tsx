import React, { useEffect, useState } from 'react';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';

export const FinishSignin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('Verifying sign-in link...');
    const [needsEmail, setNeedsEmail] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (isSignInWithEmailLink(auth, window.location.href)) {
            let emailForSignIn = window.localStorage.getItem('emailForSignIn');

            if (!emailForSignIn) {
                // User opened the link on a different device or browser
                setNeedsEmail(true);
                setStatus('Please confirm your email address to complete sign-in.');
            } else {
                completeSignIn(emailForSignIn);
            }
        } else {
            setStatus('Invalid sign-in link.');
            setTimeout(() => navigate('/login'), 3000);
        }
    }, [navigate]);

    const completeSignIn = async (emailToUse: string) => {
        try {
            await signInWithEmailLink(auth, emailToUse, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            // Redirect to home
            navigate('/');
        } catch (error: any) {
            console.error(error);
            setStatus(`Sign-in failed: ${error.message}`);
        }
    };

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            completeSignIn(email);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-slate-900">
            <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-center">Completing Sign-In</h2>
                <p className="text-center text-slate-600 mb-6">{status}</p>

                {needsEmail && (
                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="confirm-email" className="block text-sm font-medium text-slate-700 mb-1">
                                Confirm your email
                            </label>
                            <input
                                id="confirm-email"
                                type="email"
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Verify & Sign In
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
