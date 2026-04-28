// Central catalog of demo videos. Shared by VideoFeed (grid) and Watch page (main + recommended).
// Swap any videoId for your own — IDs must belong to public YouTube videos with English captions
// for the PPU transcript pipeline to produce Wow Factors.

export const CATEGORIES = [
  { id: 'all',     label: 'All',     gradient: 'from-indigo-500 to-purple-500' },
  { id: 'space',   label: 'Space',   gradient: 'from-indigo-600 to-sky-500' },
  { id: 'math',    label: 'Math',    gradient: 'from-fuchsia-500 to-pink-500' },
  { id: 'science', label: 'Science', gradient: 'from-amber-500 to-orange-500' },
  { id: 'nature',  label: 'Nature',  gradient: 'from-emerald-500 to-teal-500' },
  { id: 'tech',    label: 'Tech',    gradient: 'from-blue-500 to-cyan-500' },
];

export const mockVideos = [];

export function getVideoById(id) {
  const n = Number(id);
  return mockVideos.find(v => v.id === n) || null;
}

export function getRecommended(currentId, limit = 6) {
  const id = Number(currentId);
  return mockVideos.filter(v => v.id !== id).slice(0, limit);
}

