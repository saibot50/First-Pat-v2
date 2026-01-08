import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { ApplicationEditor } from './components/ApplicationEditor';
import { Login } from './components/Login';
import { FinishSignin } from './components/FinishSignin';
import { AuthGuard } from './components/AuthGuard';
import { AuthIndicator } from './components/AuthIndicator';


const App: React.FC = () => {
    return (
        <Router>
            <AuthIndicator />
            <Routes>
                <Route path="/" element={
                    <AuthGuard>
                        <Dashboard />
                    </AuthGuard>
                } />
                <Route path="/app/:appId" element={
                    <AuthGuard>
                        <ApplicationEditor />
                    </AuthGuard>
                } />
                <Route path="/login" element={<Login />} />
                <Route path="/finish-signin" element={<FinishSignin />} />
            </Routes>
        </Router>
    );
};

export default App;
