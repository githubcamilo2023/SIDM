import { useState, useEffect, useCallback } from 'react';
import { C, fontStack } from './constants';
import AuthService, { API_URL } from './services/auth';
import PantallaLogin from './components/auth/PantallaLogin';
import AppPrincipal from './pages/AppPrincipal';

export default function App() {
  const [token, setToken] = useState(AuthService.getAccessToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleLogin = (accessToken, refreshToken, userData) => {
    AuthService.setTokens(accessToken, refreshToken);
    setToken(accessToken);
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      const t = AuthService.getAccessToken();
      if (t) {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${t}` },
        });
      }
    } catch {}
    AuthService.clearTokens();
    setToken(null);
    setUser(null);
  };

  const handleSessionExpired = useCallback(() => {
    AuthService.clearTokens();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (token) {
      AuthService.secureFetch(`${API_URL}/auth/me`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => { setUser(data); setLoading(false); })
        .catch(() => { AuthService.clearTokens(); setToken(null); setLoading(false); });
    } else { setLoading(false); }
  }, [token]);

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.background = C.bg;
    document.body.style.fontFamily = fontStack;
    document.body.style.WebkitFontSmoothing = "antialiased";
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:fontStack }}>
        <div style={{textAlign:"center"}}>
          <div style={{ fontSize:36, fontWeight:700, letterSpacing:"-0.04em", background:C.gradientPrimary, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:8, fontFamily:"'Space Grotesk', sans-serif" }}>SIDM</div>
          <div style={{fontSize:14,color:C.muted}}>Cargando...</div>
          <div style={{ width:32, height:3, borderRadius:2, background:C.gradientAccent, margin:"16px auto 0", animation:"pulse 1.5s ease-in-out infinite" }}/>
          <style>{`@keyframes pulse { 0%,100% { opacity:0.4; width:32px; } 50% { opacity:1; width:64px; } }`}</style>
        </div>
      </div>
    );
  }

  if (!token) return <PantallaLogin onLogin={handleLogin} />;

  return <AppPrincipal user={user} onLogout={handleLogout} onSessionExpired={handleSessionExpired} />;
}
