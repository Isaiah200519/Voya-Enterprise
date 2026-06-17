import React, { useState } from 'react';
import { User, UserRole, Store } from '../types';
import { dbGetUsers, dbSaveUser, dbSaveStore } from '../utils/firebase';
import { ShieldCheck, Eye, EyeOff, UserCheck, Store as StoreIcon, HelpCircle } from 'lucide-react';
import { ToastMessage } from './Toast';
import VoyaLogo from './VoyaLogo';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function AuthScreen({ onLoginSuccess, showToast }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [storeName, setStoreName] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  const [payoutEmail, setPayoutEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      showToast('Please fill out all fields', 'error');
      return;
    }

    try {
      const users = await dbGetUsers();

      // Find user matching credentials and role
      const matchedUser = users.find(
        (u) => (u.email || '').toLowerCase() === email.toLowerCase() && u.password === password
      );

      if (!matchedUser) {
        showToast('Invalid email or password', 'error');
        return;
      }

      // Role-specific check
      if (matchedUser.role !== role) {
        // Allow admin only if role is matching
        showToast(`Selected role "${role}" does not match this account's credentials.`, 'error');
        return;
      }

      // ADMIN check
      if (role === 'admin') {
        if (email.toLowerCase() !== 'savieisaiah54@gmail.com') {
          showToast('Access denied: You are not authorized to login as an Administrator.', 'error');
          return;
        }
      }

      // Checking block state
      if (matchedUser.blocked) {
        showToast('Your account has been blocked by the Administrator.', 'error');
        return;
      }

      // Checking pending seller approval
      if (role === 'seller' && !matchedUser.approved) {
        showToast('Your seller store registration is pending approval by the Admin.', 'info');
        return;
      }

      // Success login
      showToast(`Welcome back, ${matchedUser.name}!`, 'success');
      onLoginSuccess(matchedUser);
    } catch (err) {
      console.error(err);
      showToast('Login verification failed.', 'error');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !name) {
      showToast('Please fill out all basic registration fields', 'error');
      return;
    }

    if (role === 'seller' && (!storeName || !payoutEmail)) {
      showToast('Sellers must enter a Store Name and Payout Email address', 'error');
      return;
    }

    try {
      const users = await dbGetUsers();

      // Prevent registering as Admin email via customer registration
      if (email.toLowerCase() === 'savieisaiah54@gmail.com') {
        showToast('You cannot register an account with the Administrator email address.', 'error');
        return;
      }

      // Check if email already taken
      const exists = users.some((u) => (u.email || '').toLowerCase() === email.toLowerCase());
      if (exists) {
        showToast('An account with this email address already exists.', 'error');
        return;
      }

      const newUserId = `user-${Date.now()}`;
      const newStoreId = role === 'seller' ? `store-${Date.now()}` : undefined;

      const newUser: User = {
        userId: newUserId,
        email: email.toLowerCase(),
        password: password,
        name: name,
        role: role,
        approved: role === 'customer' ? true : false, // Seller is pending
        storeId: newStoreId,
        profilePicture: `data:image/svg+xml;utf8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="#2563eb"><circle cx="50" cy="50" r="45" fill="#f1f5f9"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-size="36" font-family="sans-serif" font-weight="bold">${name[0].toUpperCase()}</text></svg>`
        )}`,
        shippingAddress: '',
      };

      // If seller, generate a Store entry in stores stack too
      if (role === 'seller' && newStoreId) {
        const newStore: Store = {
          storeId: newStoreId,
          sellerId: newUserId,
          storeName: storeName,
          logo: `data:image/svg+xml;utf8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="#64748b"><circle cx="60" cy="60" r="55" fill="#e2e8f0"/><text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" font-size="44" font-weight="black" font-family="sans-serif" fill="#475569">${storeName[0].toUpperCase()}</text></svg>`
          )}`,
          banner: `data:image/svg+xml;utf8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" fill="#3b82f6"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="64" font-family="sans-serif" font-weight="bold" fill="#64748b">${storeName}</text></svg>`
          )}`,
          description: storeDesc || `${storeName} - Certified Vendor at Voya.`,
          approved: false, // Must be approved by Admin
          payoutEmail: payoutEmail,
        };
        await dbSaveStore(newStore);
      }

      await dbSaveUser(newUser);

      showToast(
        role === 'seller'
          ? 'Registration successful! Your store is now pending administrator approval.'
          : 'Registration successful! You can now log in.',
        'success'
      );

      // Swap back to login mode
      setIsLogin(true);
      setPassword('');
    } catch (err) {
      console.error(err);
      showToast('Registration failed.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-6 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center flex-col items-center">
          <VoyaLogo light={true} className="mb-3 scale-110 text-center" />
          <p className="text-[10px] text-center text-slate-400 font-mono tracking-wider leading-none uppercase mt-1">
            SAVIE&apos;S ENTERPRISE GLOBAL PLATFORM
          </p>
        </div>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-4 px-4 shadow-sm rounded border border-slate-200 sm:px-6">
          
          {/* Header tabs login/register toggle */}
          <div className="flex border-b border-slate-200 mb-4">
            <button
              onClick={() => { setIsLogin(true); setRole('customer'); }}
              className={`flex-1 text-center font-bold text-xs uppercase tracking-wider pb-2 border-b-2 transition-all cursor-pointer ${
                isLogin ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setRole('customer'); }}
              className={`flex-1 text-center font-bold text-xs uppercase tracking-wider pb-2 border-b-2 transition-all cursor-pointer ${
                !isLogin ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              New Account
            </button>
          </div>

          <form className="space-y-3" onSubmit={isLogin ? handleLogin : handleRegister}>
            {/* Common fields (Email / Password) */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
              <div className="mt-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="appearance-none block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500 text-slate-800"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
              <div className="mt-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter access key"
                  className="appearance-none block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500 pr-9 text-slate-800"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Registration-only general fields */}
            {!isLogin && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name / Public Name</label>
                <div className="mt-1">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your real or business name"
                    className="appearance-none block w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500 text-slate-800"
                    required
                  />
                </div>
              </div>
            )}

            {/* Role selector block */}
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Portal Access Terminal
              </label>
              
              <div className={`grid ${isLogin ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  className={`flex items-center gap-1 justify-center py-1.5 px-1.5 rounded border text-center transition-all cursor-pointer ${
                    role === 'customer'
                      ? 'border-slate-800 bg-slate-800 text-white'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">Buyer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('seller')}
                  className={`flex items-center gap-1 justify-center py-1.5 px-1.5 rounded border text-center transition-all cursor-pointer ${
                    role === 'seller'
                      ? 'border-slate-800 bg-slate-800 text-white'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <StoreIcon className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">Seller</span>
                </button>

                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`flex items-center gap-1 justify-center py-1.5 px-1.5 rounded border text-center transition-all cursor-pointer ${
                      role === 'admin'
                        ? 'border-slate-800 bg-slate-800 text-white'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold">Admin</span>
                  </button>
                )}
              </div>

              {role === 'admin' && isLogin && (
                <p className="mt-2 text-[10px] text-amber-800 bg-amber-50 rounded p-1.5 flex items-start gap-1 font-semibold leading-tight border border-amber-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>Authorized access only. Verified logging trace active.</span>
                </p>
              )}
            </div>

            {/* Seller registration extra info */}
            {!isLogin && role === 'seller' && (
              <div className="space-y-3 border-t border-slate-150 pt-3 mt-3">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Store / Boutique Details
                </h4>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Official Store Name</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="e.g. Shenzhen Wholesale Electronics"
                      className="appearance-none block w-full px-2.5 py-1.5 border border-slate-202 rounded text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500 text-slate-800"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Payout Email Address</label>
                  <div className="mt-1">
                    <input
                      type="email"
                      value={payoutEmail}
                      onChange={(e) => setPayoutEmail(e.target.value)}
                      placeholder="e.g. payouts@mystore.com"
                      className="appearance-none block w-full px-2.5 py-1.5 border border-slate-202 rounded text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500 text-slate-800"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Store Description</label>
                  <div className="mt-1">
                    <textarea
                      value={storeDesc}
                      onChange={(e) => setStoreDesc(e.target.value)}
                      placeholder="Add descriptions..."
                      rows={2}
                      className="appearance-none block w-full px-2.5 py-1.5 border border-slate-202 rounded text-xs placeholder-slate-404 focus:outline-none focus:ring-1 focus:ring-slate-500 text-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-3 border border-transparent rounded text-xs font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 focus:outline-none cursor-pointer transition-all"
              >
                {isLogin ? 'Enter Platform Gateway' : 'Submit Registration'}
              </button>
            </div>
          </form>

          {/* Quick instructions / Help guide */}
          <div className="mt-4 border-t border-slate-150 pt-3 flex items-center justify-between text-[10px] text-slate-500 font-semibold bg-slate-50 -mx-4 -mb-4 p-2.5 rounded-b">
            <span className="flex items-center gap-1">
              <HelpCircle className="w-3 h-3" />
              Demo accounts prefill:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEmail('savieisaiah54@gmail.com');
                  setPassword('admin123');
                  setRole('admin');
                  setIsLogin(true);
                  showToast('Prefilled Admin credentials', 'info');
                }}
                className="text-slate-800 hover:underline cursor-pointer font-bold"
              >
                Admin
              </button>
              <span>•</span>
              <button
                onClick={() => {
                  setEmail('seller@voya.com');
                  setPassword('seller123');
                  setRole('seller');
                  setIsLogin(true);
                  showToast('Prefilled Approved Seller credentials', 'info');
                }}
                className="text-slate-800 hover:underline cursor-pointer font-bold"
              >
                Seller
              </button>
              <span>•</span>
              <button
                onClick={() => {
                  setEmail('buyer@savie.com');
                  setPassword('buyer123');
                  setRole('customer');
                  setIsLogin(true);
                  showToast('Prefilled Customer credentials', 'info');
                }}
                className="text-slate-800 hover:underline cursor-pointer font-bold"
              >
                Buyer
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
