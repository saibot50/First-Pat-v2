import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Loader2 } from 'lucide-react';
import { auth } from '../services/firebase';
import { getUserApplications, createApplication, ApplicationSummary } from '../services/firestoreService';
import { Header } from './Header';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [apps, setApps] = useState<ApplicationSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectTitle, setNewProjectTitle] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            if (!auth.currentUser) return;
            try {
                const data = await getUserApplications(auth.currentUser.uid);
                setApps(data);
            } catch (e) {
                console.error("Failed to load apps", e);
            } finally {
                setIsLoading(false);
            }
        };
        // Add auth check loop or subscriber? For now assume AuthGuard handles logged in state.
        if (auth.currentUser) {
            load();
        } else {
            // Fallback if auth isn't ready immediately, though AuthGuard should ensure it.
            // We can check auth.onAuthStateChanged but typically AuthGuard waits.
            const unsubscribe = auth.onAuthStateChanged(user => {
                if (user) load();
            });
            return () => unsubscribe();
        }
    }, []);

    const handleCreate = async () => {
        if (!newProjectTitle.trim() || !auth.currentUser) return;
        setIsCreating(true);
        setError(null);
        try {
            const id = await createApplication(auth.currentUser.uid, newProjectTitle);
            navigate(`/app/${id}`);
        } catch (e: any) {
            console.error(e);
            setError(e.message || 'An unexpected error occurred. Please try again.');
            setIsCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <Header />
            <div className="max-w-5xl mx-auto px-4 py-12">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Your Projects</h1>
                    <Button onClick={() => setShowCreateModal(true)} icon={<Plus size={20} />}>
                        New Project
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>
                ) : apps.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-200">
                        <FolderOpen size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">No projects yet</h3>
                        <p className="text-slate-500 mb-6">Start your first idea evaluation today.</p>
                        <Button onClick={() => setShowCreateModal(true)}>Create Project</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {apps.map(app => (
                            <div key={app.id}
                                className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group"
                                onClick={() => navigate(`/app/${app.id}`)}
                            >
                                <h3 className="font-bold text-lg mb-2 group-hover:text-blue-600 truncate">{app.title}</h3>
                                <div className="text-xs text-slate-500 space-y-1">
                                    <p>Stage: <span className="font-medium text-slate-700">{app.stage}</span></p>
                                    <p>Updated: {app.updatedAt?.toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6">
                        <h2 className="text-xl font-bold mb-4">New Project</h2>
                        <Input
                            label="Project Title"
                            value={newProjectTitle}
                            onChange={(e) => setNewProjectTitle(e.target.value)}
                            placeholder="e.g. Smart Dog Collar"
                            autoFocus
                        />
                        {error && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="ghost" onClick={() => { setShowCreateModal(false); setError(null); }}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={!newProjectTitle.trim() || isCreating}>
                                {isCreating ? 'Creating...' : 'Create & Start'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
