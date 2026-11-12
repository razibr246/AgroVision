import { useState } from 'react';
import { ShieldCheck, LogIn, LogOut, KeyRound, CheckCircle2, UserCheck, Sparkles, ExternalLink, Info } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useStore } from '../../store';

export default function Auth0LoginCard({ role = 'farmer' }) {
  const { isConfigured, isAuthenticated, isLoading, user, loginWithRedirect, logout } = useAuth();
  const { T } = useStore();
  const [showConfigHelp, setShowConfigHelp] = useState(false);

  const handleLogin = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'login',
      },
    });
  };

  const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: window.location.origin + window.location.pathname,
      },
    });
  };

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-primary-50/50 p-4 shadow-sm ring-1 ring-emerald-500/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14.5px] font-bold text-emerald-950">
                {T('Auth0 সিকিউর অথেনটিকেশন', 'Auth0 Enterprise Authentication')}
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                {isConfigured ? (isAuthenticated ? T('লগইনকৃত', 'Signed in') : T('লাইভ ক্লাউড', 'Live Cloud')) : T('ডেমো মোড', 'Demo Mode')}
              </span>
            </div>
            <p className="text-[12.5px] leading-4 text-emerald-900/70">
              {role === 'officer'
                ? T('কর্মকর্তাদের জন্য Passkey, DAE Gov SSO এবং মাল্টি-ফ্যাক্টর নিরাপত্তা', 'WebAuthn Passkeys, DAE Institutional SSO & MFA for officers')
                : T('পাসওয়ার্ডহীন মোবাইল ওটিপি বা ফিঙ্গারপ্রিন্ট দিয়ে নিরাপদ প্রবেশ', 'Passwordless phone OTP or biometric passkey for farmers')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {user?.picture ? (
                  <img src={user.picture} alt={user.name || 'User'} className="h-8 w-8 rounded-full border border-emerald-300" />
                ) : (
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-200 text-emerald-900 font-bold text-[12px]">
                    {user?.name?.slice(0, 1) || 'U'}
                  </div>
                )}
                <div className="text-left text-[12px]">
                  <p className="font-bold text-emerald-950 leading-tight">{user?.name || user?.email}</p>
                  <p className="text-emerald-700">{user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-emerald-900 transition hover:bg-emerald-50"
              >
                <LogOut size={14} />
                {T('লগআউট', 'Log out')}
              </button>
            </div>
          ) : isConfigured ? (
            <button
              type="button"
              disabled={isLoading}
              onClick={handleLogin}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-emerald-800 active:scale-95"
            >
              <LogIn size={15} />
              {T('Auth0 সাইন ইন', 'Sign in with Auth0')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfigHelp(!showConfigHelp)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300/80 bg-white/90 px-3 py-1.5 text-[12px] font-semibold text-emerald-900 shadow-2xs hover:bg-emerald-50"
            >
              <KeyRound size={13} className="text-emerald-700" />
              {T('Auth0 স্ট্যাটাস ও তথ্য', 'Auth0 Info')}
            </button>
          )}
        </div>
      </div>

      {showConfigHelp && !isAuthenticated && (
        <div className="mt-3.5 rounded-xl border border-emerald-200/80 bg-white p-3 text-[12.5px] leading-5 text-emerald-950 animate-in fade-in">
          <div className="flex items-start gap-2">
            <Info size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">
                {T('উন্নত প্রাতিষ্ঠানিক নিরাপত্তা (Auth0)', 'Enterprise Identity with Auth0')}:
              </p>
              <p className="mt-1 text-muted">
                {T(
                  'কৃষি কর্মকর্তা ও কৃষকদের জন্য প্রাতিষ্ঠানিক সাইন-ইন (Auth0 Universal Login) প্রস্তুত রয়েছে। সরাসরি প্রদর্শনের জন্য নিচের যেকোনো ডেমো অ্যাকাউন্ট বেছে নিয়ে এখনই প্ল্যাটফর্মটি ব্যবহার করতে পারেন।',
                  'Enterprise sign-in (Auth0 Universal Login with passkeys, DAE SSO, and SMS OTP) is integrated for live deployments. Select any demo profile below to explore the full platform immediately.'
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
