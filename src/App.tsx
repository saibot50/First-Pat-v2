import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './components/Home';
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
                        <Home />
                    </AuthGuard>
                } />
                <Route path="/login" element={<Login />} />
                <Route path="/finish-signin" element={<FinishSignin />} />
            </Routes>
        </Router>
    );
};

export default App;
