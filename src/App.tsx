import React, { useState, useEffect } from 'react';
import { User } from './types';
import { seedLocalStorage, seedFirebaseIfEmpty } from './utils/seedData';
import AuthScreen from './components/AuthScreen';
import AdminPanel from './components/AdminPanel';
import SellerPanel from './components/SellerPanel';
import CustomerPanel from './components/CustomerPanel';
import Toast, { ToastMessage } from './components/Toast';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const initApp = async () => {
      // One-time automatic clean of LocalStorage to wipe heavy old base64 strings and start completely fresh
      if (!localStorage.getItem('voya_clear_done_v4')) {
        localStorage.clear();
        localStorage.setItem('voya_clear_done_v4', 'true');
        showToast('Applet LocalStorage cleared & reset successfully.', 'success');
      }

      // 1. Seed fallback LocalStorage synchronously first
      seedLocalStorage();

      // 2. Seed remote Firestore if empty and online
      await seedFirebaseIfEmpty();

      // 3. Load potential living session if one exists
      const storedSession = localStorage.getItem('voya_active_session');
      if (storedSession) {
        try {
          const user = JSON.parse(storedSession) as User;
          setCurrentUser(user);
        } catch (e) {
          console.warn('Failed to restore active marketplace session', e);
        }
      }
    };
    initApp();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' | 'info') => {
    setToast({
      id: Date.now().toString(),
      text,
      type,
    });
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('voya_active_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('voya_active_session');
    showToast('Successfully logged out of Voya.', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-300">
      
      {/* Dynamic view router */}
      {!currentUser ? (
        <CustomerPanel 
          currentUser={null} 
          onLogout={handleLogout} 
          showToast={showToast} 
          setCurrentUser={setCurrentUser} 
        />
      ) : currentUser.role === 'admin' ? (
        <AdminPanel currentUser={currentUser} onLogout={handleLogout} showToast={showToast} setCurrentUser={setCurrentUser} />
      ) : currentUser.role === 'seller' ? (
        <SellerPanel currentUser={currentUser} onLogout={handleLogout} showToast={showToast} setCurrentUser={setCurrentUser} />
      ) : (
        <CustomerPanel 
          currentUser={currentUser} 
          onLogout={handleLogout} 
          showToast={showToast} 
          setCurrentUser={setCurrentUser} 
        />
      )}

      {/* Real-time platform notifications */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

