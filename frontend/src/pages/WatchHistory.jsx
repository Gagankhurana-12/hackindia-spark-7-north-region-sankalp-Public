import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Clock, Video } from 'lucide-react';

export default function WatchHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Guard: must be logged in as child
  useEffect(() => {
    if (!localStorage.getItem('childToken')) {
      navigate('/child-auth', { replace: true });
    }
  }, [navigate]);

  // Fetch watch history
  useEffect(() => {
    const childToken = localStorage.getItem('childToken');
    if (!childToken) return;

    setLoading(true);
    setError(null);

    fetch('/api/watch/history?limit=50', {
      headers: {
        'Authorization': `Bearer ${childToken}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setHistory(data.history || []);
      })
      .catch(err => {
        console.error('Failed to fetch watch history:', err);
        setError(err.message || 'Failed to load watch history');
      })
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Parse duration from string format (e.g., "10:23" or "1:23:45")
  const parseDuration = (durationStr) => {
    if (!durationStr) return 0;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  // Calculate progress bar percentage
  const getCompletionColor = (completion) => {
    if (completion >= 80) return 'bg-[#00D4AA]'; // Teal for complete
    if (completion >= 50) return 'bg-[#6C3CE1]'; // Violet for halfway
    return 'bg-purple-400';
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0E0E16] text-white font-sans overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0E0E16]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-12 h-16 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/video-feed')}
            className="flex items-center gap-2 text-white/70 hover:text-white font-bold transition"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:block">Back to Explore</span>
          </button>
          <span className="font-khoj text-2xl text-[#6C3CE1] font-black tracking-tighter hidden sm:block">KHOJ</span>
        </div>
        <h1 className="text-xl font-bold text-white/90 flex items-center gap-2"><Clock className="w-5 h-5 text-[#00D4AA]"/> Watch History</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-4 sm:px-12 py-10">
        <div className="max-w-5xl mx-auto">
          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-900/20 border border-red-500/30 backdrop-blur-sm">
              <p className="text-red-400 font-bold">❌ Error: {error}</p>
              <p className="text-red-400/80 text-sm mt-1">
                Make sure you're logged in and refresh the page.
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="inline-block animate-spin">
                  <Clock className="h-10 w-10 text-[#6C3CE1]" />
                </div>
                <p className="mt-4 text-white/60 font-bold text-lg tracking-wide">Loading your history...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && history.length === 0 && (
            <div className="text-center py-20 bg-[#1E1E2A]/50 rounded-3xl border border-white/5 backdrop-blur-sm">
              <Video className="h-20 w-20 mx-auto text-[#6C3CE1]/50 mb-6 drop-shadow-lg" />
              <h2 className="text-3xl font-black text-white mb-3 tracking-tight">No Watch History Yet</h2>
              <p className="text-white/60 mb-8 text-lg">Start watching videos to build your learning journey!</p>
              <Link
                to="/video-feed"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#6C3CE1] to-[#7D4FF5] text-white rounded-full font-bold text-lg hover:shadow-lg hover:shadow-violet-500/40 transition hover:scale-105"
              >
                <Play className="h-5 w-5 fill-white" />
                Go to Video Feed
              </Link>
            </div>
          )}

          {/* History List - YouTube Style */}
          {!loading && !error && history.length > 0 && (
            <div className="space-y-6">
              <div className="mb-6 border-b border-white/10 pb-4">
                <p className="text-white/60 font-medium">
                  <span className="font-bold text-[#00D4AA] text-lg">{history.length}</span> video{history.length !== 1 ? 's' : ''} explored
                </p>
              </div>

              {history.map((item, idx) => {
                const title = item.videoTitle || `Video: ${item.videoId}`;
                const looksLikeYouTubeId = /^[a-zA-Z0-9_-]{11}$/.test(String(item.videoId || ''));
                const thumbnail = item.videoThumbnail || (looksLikeYouTubeId ? `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg` : '');
                const channel = item.videoChannel || 'YouTube';
                const duration = item.videoDuration ? parseDuration(item.videoDuration) : 0;
                const completionSecs = item.lastWatchedTime || 0;
                const completionPercent = Math.round(item.completion || 0);

                return (
                  <div
                    key={`${item.videoId}-${idx}`}
                    className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 rounded-2xl bg-[#1E1E2A] border border-white/5 hover:border-[#6C3CE1]/50 hover:bg-[#262635] hover:shadow-[0_4px_30px_rgba(108,60,225,0.15)] transition-all group"
                  >
                    {/* Thumbnail */}
                    <Link
                      to={`/watch/${item.videoId}`}
                      state={{
                        video: {
                          id: item.videoId,
                          videoId: item.videoId,
                          title,
                          thumbnail,
                          channel,
                          duration: item.videoDuration || '0:00',
                          category: item.videoTopic || 'history',
                          accent: 'from-[#6C3CE1] to-[#00D4AA]',
                        }
                      }}
                      className="relative shrink-0 w-full sm:w-64 aspect-video rounded-xl overflow-hidden bg-black group-hover:brightness-110 transition cursor-pointer"
                    >
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={title || 'Video thumbnail'}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#0E0E16]">
                          <Video className="h-8 w-8 text-white/20" />
                        </div>
                      )}

                      {/* Duration Badge */}
                      {duration > 0 && (
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                          {formatDuration(duration)}
                        </div>
                      )}

                      {/* Progress Overlay */}
                      {completionPercent > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                          <div
                            className={`h-full ${getCompletionColor(completionPercent)} transition-all shadow-[0_0_10px_currentColor]`}
                            style={{ width: `${completionPercent}%` }}
                          />
                        </div>
                      )}

                      {/* Resume Badge */}
                      {completionPercent < 100 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                          <div className="bg-[#6C3CE1] p-3 rounded-full shadow-lg shadow-violet-500/50">
                            <Play className="h-6 w-6 text-white fill-white" />
                          </div>
                        </div>
                      )}
                    </Link>

                    {/* Video Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                      <div>
                        <h3 className="font-bold text-white text-lg sm:text-xl line-clamp-2 group-hover:text-[#00D4AA] transition">
                          {title}
                        </h3>
                        <p className="text-sm font-medium text-white/60 mt-1">
                          {channel}
                        </p>
                      </div>

                      {/* Completion Info */}
                      <div className="flex items-center gap-4 text-sm text-white/50 mt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 rounded-full bg-white/10 overflow-hidden shadow-inner">
                            <div
                              className={`h-full ${getCompletionColor(completionPercent)}`}
                              style={{ width: `${completionPercent}%` }}
                            />
                          </div>
                          <span className="font-bold text-white/90">{completionPercent}%</span>
                        </div>
                        {completionSecs > 0 && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                            {formatDuration(completionSecs)} watched
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date & Action */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between py-1 shrink-0 mt-4 sm:mt-0">
                      <p className="text-xs font-bold text-white/40 uppercase tracking-widest">
                        {formatDate(item.updatedAt || item.createdAt)}
                      </p>
                      <Link
                        to={`/watch/${item.videoId}`}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-[#6C3CE1] font-bold transition text-sm whitespace-nowrap mt-4 sm:mt-0"
                      >
                        <Play className="h-4 w-4 fill-white" />
                        {completionPercent < 100 ? 'Resume' : 'Rewatch'}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
