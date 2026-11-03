import React, { useState } from 'react';
import {
  User,
  Sliders,
  Sparkles,
  Music,
  Heart,
  History,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Headphones,
  LogOut,
  RefreshCw,
  Plus,
  ListMusic,
  ExternalLink,
  Cookie,
  Key,
} from 'lucide-react';
import { GoogleUserProfile, Track, UserPlaylist } from '../../types/music';
import {
  clearRecentHistory,
  getUserYouTubeCookies,
  saveUserYouTubeCookies,
} from '../../services/musicStorageService';
import { getStoredUser, saveStoredUser } from '../../services/googleAuthService';
import { fetchYouTubePlaylist } from '../../services/youtubeSearchService';
import { DiscordPresenceCard } from '../DiscordPresenceCard';
interface AccountTabProps {
  favoritesCount: number;
  historyCount: number;
  totalTracksCount: number;
  playlistsCount: number;
  onClearHistory: () => void;
  onImportTracks: (tracks: Track[]) => void;
  onSyncPlaylists: () => void;
  onAddPlaylist?: (playlist: UserPlaylist) => void;
  onSyncAllUserPlaylists?: (cookies?: string) => Promise<UserPlaylist[]>;
}
export const AccountTab: React.FC<AccountTabProps> = ({
  favoritesCount,
  historyCount,
  totalTracksCount,
  playlistsCount,
  onClearHistory,
  onImportTracks,
  onSyncPlaylists,
  onAddPlaylist,
  onSyncAllUserPlaylists,
}) => {
  const [user, setUser] = useState<GoogleUserProfile | null>(getStoredUser());
  const [streamQuality, setStreamQuality] = useState<'high' | 'ultra'>('ultra');
  const [cacheCleared, setCacheCleared] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [quickUrl, setQuickUrl] = useState('');
  const [isQuickImporting, setIsQuickImporting] = useState(false);
  const [cookieInput, setCookieInput] = useState(getUserYouTubeCookies());
  const [showCookiesConfig, setShowCookiesConfig] = useState(false);
  const handleConnectGooglePhone = async () => {
    if ((window as any).AndroidYouTubeAuth?.openYouTubeLogin) {
      (window as any).AndroidYouTubeAuth.openYouTubeLogin();
      return;
    }
    const cookies = cookieInput.trim() || getUserYouTubeCookies();
    if (cookies && onSyncAllUserPlaylists) {
      setIsSyncing(true);
      setSyncFeedback('🔍 Recherche et importation de vos playlists privées...');
      try {
        const imported = await onSyncAllUserPlaylists(cookies);
        const phoneGoogleUser: GoogleUserProfile = {
          id: 'google_phone_' + Date.now(),
          name: 'Compte YouTube Music Relié',
          email: 'Synchronisé via cookies',
          picture: '/logo.jpeg',
          accessToken: 'phone_token_' + Date.now(),
        };
        saveStoredUser(phoneGoogleUser);
        setUser(phoneGoogleUser);
        setSyncFeedback(`🎉 ${imported.length} playlists privées et publiques importées avec succès !`);
      } catch (err: any) {
        setSyncFeedback(err.message || 'Erreur lors de la synchronisation.');
      } finally {
        setIsSyncing(false);
        setTimeout(() => setSyncFeedback(null), 5000);
      }
      return;
    }
    setShowCookiesConfig(true);
    setSyncFeedback("Veuillez renseigner vos cookies YouTube Music ou utiliser l'application Android pour connecter directement votre compte.");
    setTimeout(() => setSyncFeedback(null), 5000);
  };
  const handleDisconnect = () => {
    saveStoredUser(null);
    setUser(null);
    if ((window as any).AndroidYouTubeAuth?.clearCookies) {
      (window as any).AndroidYouTubeAuth.clearCookies();
    }
    setSyncFeedback('Compte déconnecté.');
    setTimeout(() => setSyncFeedback(null), 3000);
  };
  const handleDirectSyncYouTubeMusic = async () => {
    setIsSyncing(true);
    setSyncFeedback('🔄 Synchronisation de vos playlists YouTube Music...');
    try {
      const cookies = cookieInput.trim() || getUserYouTubeCookies();
      if (cookies && onSyncAllUserPlaylists) {
        const imported = await onSyncAllUserPlaylists(cookies);
        onSyncPlaylists();
        setSyncFeedback(
          `✅ Synchronisation réussie : ${imported.length} playlists synchronisées depuis votre compte YouTube Music !`
        );
      } else if ((window as any).AndroidYouTubeAuth?.openYouTubeLogin) {
        setIsSyncing(false);
        (window as any).AndroidYouTubeAuth.openYouTubeLogin();
        return;
      } else {
        onSyncPlaylists();
        setSyncFeedback(
          `✅ Vos ${playlistsCount} playlists locales sont à jour.`
        );
      }
    } catch (err: any) {
      setSyncFeedback(err?.message || 'Erreur lors de la synchronisation.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };
  const handleSaveCookies = async () => {
    saveUserYouTubeCookies(cookieInput);
    if (onSyncAllUserPlaylists && cookieInput.trim()) {
      setIsSyncing(true);
      setSyncFeedback('🔍 Cookies enregistrés ! Récupération de vos playlists privées...');
      try {
        const imported = await onSyncAllUserPlaylists(cookieInput.trim());
        setSyncFeedback(`🎉 Succès : ${imported.length} playlists importées depuis votre compte !`);
      } catch (err: any) {
        setSyncFeedback('✅ Vos cookies YouTube Music ont été enregistrés avec succès !');
      } finally {
        setIsSyncing(false);
        setTimeout(() => setSyncFeedback(null), 5000);
      }
    } else {
      setSyncFeedback('✅ Vos cookies YouTube Music ont été enregistrés avec succès !');
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };
  const handleQuickImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) return;
    setIsQuickImporting(true);
    setSyncFeedback(null);
    try {
      const cookies = cookieInput.trim() || getUserYouTubeCookies();
      const res = await fetchYouTubePlaylist(quickUrl.trim(), cookies);
      if (res && res.tracks.length > 0 && onAddPlaylist) {
        const newPl: UserPlaylist = {
          id: 'yt_quick_' + Date.now(),
          title: res.title,
          description: res.description,
          thumbnail: res.thumbnail,
          itemCount: res.tracks.length,
          tracks: res.tracks,
        };
        onAddPlaylist(newPl);
        setQuickUrl('');
        setSyncFeedback(`🎉 Playlist "${res.title}" (${res.tracks.length} titres) importée avec succès !`);
      } else {
        setSyncFeedback("Impossible de récupérer la playlist. Vérifiez que le lien est accessible ou configurez vos cookies si elle est privée.");
      }
    } catch (err: any) {
      setSyncFeedback(err?.message || "Erreur lors de l'importation.");
    } finally {
      setIsQuickImporting(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };
  const handleClearHistory = () => {
    if (window.confirm("Voulez-vous vraiment effacer l'historique d'écoute ?")) {
      clearRecentHistory();
      onClearHistory();
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 3000);
    }
  };
  return (
    <div style={{ padding: '16px 16px 140px 16px' }}>
      <h2
        className="font-display"
        style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: '20px', color: '#fff' }}
      >
        Compte & Paramètres
      </h2>
      { }
      <div
        className="glass-panel"
        style={{
          padding: '24px 20px',
          borderRadius: '26px',
          marginBottom: '20px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55)',
          position: 'relative',
          overflow: 'hidden',
          border: user ? '1px solid rgba(0, 229, 255, 0.35)' : '1px solid var(--border-default)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '140px',
            height: '140px',
            background: 'radial-gradient(circle, rgba(0, 229, 255, 0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div
            style={{
              position: 'relative',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              padding: '2.5px',
              background: 'var(--gradient-primary)',
              boxShadow: 'var(--glow-cyan)',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: '#0a0e17',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                src={user?.picture || '/logo.jpeg'}
                alt="Profile"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                {user ? user.name : 'Saez Music'}
              </h3>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  backgroundColor: 'rgba(0, 229, 255, 0.15)',
                  color: 'var(--cyan)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  border: '1px solid rgba(0, 229, 255, 0.3)',
                }}
              >
                PREMIUM
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {user ? 'YouTube Music Relié' : 'Édition Mobile Sans Pub'}
            </p>
          </div>
        </div>
        { }
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
          <button
            className="btn-primary"
            onClick={handleDirectSyncYouTubeMusic}
            disabled={isSyncing}
            style={{ width: '100%', fontSize: '0.86rem', padding: '13px' }}
          >
            <RefreshCw size={16} className={isSyncing ? 'spin' : ''} />
            <span>
              {isSyncing
                ? 'Synchronisation des playlists...'
                : 'Synchroniser toutes mes Playlists YouTube Music'}
            </span>
          </button>
          {!user ? (
            <button
              onClick={handleConnectGooglePhone}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} color="var(--cyan)" />
              <span>Relier mon compte YouTube Music</span>
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(255, 45, 123, 0.1)',
                border: '1px solid rgba(255, 45, 123, 0.3)',
                color: 'var(--rose)',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <LogOut size={14} />
              <span>Déconnecter le compte</span>
            </button>
          )}
        </div>
        { }
        {syncFeedback && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px 16px',
              borderRadius: '14px',
              backgroundColor: 'rgba(0, 229, 255, 0.15)',
              border: '1px solid var(--cyan)',
              color: 'var(--cyan)',
              fontSize: '0.82rem',
              fontWeight: 600,
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(0, 229, 255, 0.2)',
            }}
          >
            {syncFeedback}
          </div>
        )}
        { }
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-default)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <span
              className="font-display"
              style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--cyan)' }}
            >
              {totalTracksCount}
            </span>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>Titres</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span
              className="font-display"
              style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}
            >
              {playlistsCount}
            </span>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>Playlists</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span
              className="font-display"
              style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--rose)' }}
            >
              {favoritesCount}
            </span>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>Favoris</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span
              className="font-display"
              style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}
            >
              {historyCount}
            </span>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>Écoutés</p>
          </div>
        </div>
      </div>
      { }
      <DiscordPresenceCard />
      { }
      <div
        className="glass-panel"
        style={{
          padding: '20px',
          borderRadius: '24px',
          marginBottom: '20px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <ListMusic size={18} color="var(--cyan)" />
          <h4 className="font-display" style={{ fontSize: '0.98rem', fontWeight: 700 }}>
            Ajouter une Playlist YouTube Music
          </h4>
        </div>
        <form onSubmit={handleQuickImportSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Lien de la playlist (ex: music.youtube.com/...)"
            value={quickUrl}
            onChange={(e) => setQuickUrl(e.target.value)}
            disabled={isQuickImporting}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-full)',
              padding: '10px 14px',
              color: '#fff',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={isQuickImporting || !quickUrl.trim()}
            style={{
              padding: '10px 16px',
              fontSize: '0.8rem',
              opacity: isQuickImporting || !quickUrl.trim() ? 0.6 : 1,
            }}
          >
            {isQuickImporting ? <RefreshCw size={14} className="spin" /> : 'Ajouter'}
          </button>
        </form>
      </div>
      { }
      <div
        className="glass-panel"
        style={{
          padding: '20px',
          borderRadius: '24px',
          marginBottom: '20px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={() => setShowCookiesConfig(!showCookiesConfig)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cookie size={18} color="var(--cyan)" />
            <div>
              <h4 className="font-display" style={{ fontSize: '0.98rem', fontWeight: 700 }}>
                Cookies YouTube Music (Playlists Privées)
              </h4>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                {cookieInput.trim() ? '✅ Cookies configurés et actifs' : 'Optionnel pour débloquer vos playlists privées'}
              </p>
            </div>
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--cyan)',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(0, 229, 255, 0.1)',
            }}
          >
            {showCookiesConfig ? 'Masquer' : 'Configurer'}
          </span>
        </div>
        {showCookiesConfig && (
          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-default)' }}>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.45 }}>
              Collez vos cookies YouTube (Netscape ou en-tête Cookie) pour permettre l'import direct et la synchronisation de toutes vos playlists privées et de votre compte sans restriction :
            </p>
            <textarea
              rows={4}
              placeholder="Collez ici le contenu de vos cookies YouTube..."
              value={cookieInput}
              onChange={(e) => setCookieInput(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid var(--border-default)',
                borderRadius: '12px',
                padding: '10px 12px',
                color: '#fff',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                outline: 'none',
                resize: 'none',
                marginBottom: '10px',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveCookies}
                style={{ padding: '8px 18px', fontSize: '0.78rem' }}
              >
                Enregistrer les cookies
              </button>
            </div>
          </div>
        )}
      </div>
      { }
      <div
        className="glass-panel"
        style={{
          padding: '20px',
          borderRadius: '24px',
          marginBottom: '20px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <Sliders size={20} color="var(--cyan)" />
          <h4 className="font-display" style={{ fontSize: '1rem', fontWeight: 700 }}>
            Préférences de Lecture
          </h4>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          { }
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>Blocage des publicités</p>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                Suppression automatique des pubs YouTube
              </p>
            </div>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--cyan)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ShieldCheck size={16} />
              100% Sans Pub
            </span>
          </div>
          <div style={{ height: '1px', backgroundColor: 'var(--border-default)' }} />
          { }
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>Lecture en arrière-plan</p>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                Service Android continu écran verrouillé
              </p>
            </div>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle2 size={15} />
              Actif (Service Dédié)
            </span>
          </div>
          <div style={{ height: '1px', backgroundColor: 'var(--border-default)' }} />
          { }
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>Qualité du flux audio</p>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>Format AAC Haute Définition</p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setStreamQuality('high')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor:
                    streamQuality === 'high' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: streamQuality === 'high' ? 'var(--cyan)' : 'var(--text-muted)',
                  border: streamQuality === 'high' ? '1px solid var(--cyan)' : '1px solid var(--border-default)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                256 kbps
              </button>
              <button
                onClick={() => setStreamQuality('ultra')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor:
                    streamQuality === 'ultra' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: streamQuality === 'ultra' ? 'var(--cyan)' : 'var(--text-muted)',
                  border: streamQuality === 'ultra' ? '1px solid var(--cyan)' : '1px solid var(--border-default)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                Ultra HQ
              </button>
            </div>
          </div>
          <div style={{ height: '1px', backgroundColor: 'var(--border-default)' }} />
          { }
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>Historique de lecture</p>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                {historyCount} titre(s) enregistré(s) localement
              </p>
            </div>
            <button
              onClick={handleClearHistory}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(255, 45, 123, 0.1)',
                border: '1px solid rgba(255, 45, 123, 0.3)',
                color: 'var(--rose)',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              <Trash2 size={13} />
              <span>{cacheCleared ? 'Effacé !' : 'Vider'}</span>
            </button>
          </div>
        </div>
      </div>
      { }
      <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-dim)' }}>
        <p style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          Saez Music • Application Android
        </p>
        <p style={{ fontSize: '0.74rem', marginTop: '4px' }}>
          Version 1.0.0 • Sans Publicités • Lecture en Arrière-Plan
        </p>
      </div>
    </div>
  );
};
