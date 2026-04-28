import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Sparkles } from 'lucide-react';

export default function ChildProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [child, setChild] = useState(null);
  const [gifts, setGifts] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('childToken');
    if (!token) {
      navigate('/child-auth', { replace: true });
      return;
    }

    fetch('/api/auth/child-me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Failed to load profile');
        return data;
      })
      .then((data) => {
        setChild(data);
        localStorage.setItem('childAge', String(data.age || 10));
        
        // Fetch gifts
        return fetch('/api/gifts/list', {
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then(res => res.json())
      .then(data => setGifts(data.gifts || []))
      .catch((e) => setError(e.message || 'Could not load profile'))
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/video-feed" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Back to feed
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" /> Child Profile
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-indigo-500/20 border border-indigo-300/30 flex items-center justify-center">
              <User className="w-7 h-7 text-indigo-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{child?.name || 'Your Profile'}</h1>
              <p className="text-sm text-white/70">Personalized by age and interests</p>
            </div>
          </div>

          {loading && <p className="text-white/70">Loading profile...</p>}
          {!loading && error && <p className="text-rose-300">{error}</p>}

          {!loading && !error && child && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard label="Age" value={String(child.age ?? '-')} />
                <StatCard label="Level" value={String(child.level ?? '-')} />
                <StatCard label="XP" value={String(child.xp ?? '-')} />
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70 mb-2">Interests</h2>
                {Array.isArray(child.interests) && child.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {child.interests.map((interest) => (
                      <span
                        key={interest}
                        className="px-3 py-1 rounded-full text-sm bg-indigo-500/15 border border-indigo-300/30 text-indigo-200"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/60 text-sm">No interests set yet.</p>
                )}
              </div>

              {/* Gift Collection */}
              <div className="pt-6 border-t border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Your Memory Chest ({gifts.length})</h2>
                </div>
                
                {gifts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
                    <p className="text-sm text-white/40">Watch videos and unbox "Wow Factors" to collect memories!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {gifts.map((gift) => {
                       const iconMap = { rocket: '🚀', star: '⭐', diamond: '💎', crown: '👑', 'magic-box': '🎁' };
                       return (
                        <div key={gift._id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10">
                          <div className="text-2xl">{iconMap[gift.giftType] || '🎁'}</div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-tighter">Fact about {gift.relatableThing}</div>
                            <div className="text-sm font-semibold text-white truncate">{gift.videoTitle}</div>
                            <div className="text-[11px] text-white/50 italic line-clamp-1">"{gift.fact}"</div>
                          </div>
                        </div>
                       );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-white/60">{label}</div>
      <div className="mt-1 text-lg font-bold text-white">{value}</div>
    </div>
  );
}
