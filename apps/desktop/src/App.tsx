/// <reference path="./electron.d.ts" />
import { useState, useEffect } from 'react';
import { IdentityManager } from '@tuxnotas/shared';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (SUPABASE_URL && SUPABASE_KEY) {
  IdentityManager.initializeCloud(SUPABASE_URL, SUPABASE_KEY);
}

import { addPool, getUserProfile, saveUserProfile, type UserProfile } from './core/domain/UserProfile';
import { ProfileSetup } from './ui/screens/ProfileSetup';
import { HomeDashboard } from './ui/screens/HomeDashboard';
import { PoolWorkspace } from './ui/screens/PoolWorkspace';


// ════════════════════════════════════════════════════
// MAIN APP — Screen Router
// ════════════════════════════════════════════════════

type Screen = { type: 'profile' } | { type: 'dashboard' } | { type: 'workspace'; poolId: string; poolName: string; signalingUrl?: string };

function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(getUserProfile());
  const [screen, setScreen] = useState<Screen>(() => {
    return getUserProfile() ? { type: 'dashboard' } : { type: 'profile' };
  });

  const fetchAndSaveProfile = async (uid: string, authUser: any) => {
    const sb = IdentityManager.cloudClient;
    if (!sb) return;
    try {
      const { data } = await sb.from('profiles').select('*').eq('id', uid).single();
      const color = data?.color || '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
      const finalName = data?.username || data?.full_name || authUser?.email?.split('@')[0] || 'Cloud User';

      const profile: UserProfile = {
        id: uid,
        name: finalName,
        color,
        createdAt: Date.now(),
        identityType: 'cloud'
      };

      saveUserProfile(profile);
      setUserProfile(profile);

      // Sincronizar Pools (Libretas) guardadas en la Nube hacia Local
      const { data: poolsData } = await sb.from('user_pools').select('*').eq('user_id', uid);
      if (poolsData && poolsData.length > 0) {
        poolsData.forEach(p => {
          addPool({
            id: p.pool_id,
            name: p.pool_name,
            icon: 'collab', // Icono general
            lastOpened: Date.now(),
            createdAt: Date.now(),
            signalingUrl: undefined // Tendrán que reconectar IP
          });
        });
      }

      setScreen({ type: 'dashboard' });
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  useEffect(() => {
    const sb = IdentityManager.cloudClient;
    if (!sb) return;

    // Verificar si apenas llegamos de un redirect de Google sin perfil local
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session && !getUserProfile()) {
        fetchAndSaveProfile(session.user.id, session.user);
      }
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      if (session && !userProfile) {
        fetchAndSaveProfile(session.user.id, session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [userProfile]);

  const handleProfileComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setScreen({ type: 'dashboard' });
  };

  const handleOpenPool = (poolId: string, poolName: string, signalingUrl?: string) => {
    setScreen({ type: 'workspace', poolId, poolName, signalingUrl });
  };

  const handleBack = () => {
    setScreen({ type: 'dashboard' });
  };

  const handleLogout = () => {
    setScreen({ type: 'profile' });
  };

  if (screen.type === 'profile' || !userProfile) {
    return <ProfileSetup onComplete={handleProfileComplete} />;
  }

  if (screen.type === 'dashboard') {
    return <HomeDashboard user={userProfile} onOpenPool={handleOpenPool} onLogout={handleLogout} />;
  }

  return (
    <PoolWorkspace
      key={screen.poolId}
      poolId={screen.poolId}
      poolName={screen.poolName}
      user={userProfile}
      onBack={handleBack}
      signalingUrl={screen.signalingUrl}
    />
  );
}

export default App;
