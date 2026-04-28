// Depth-Evolution Matrix: age band -> visual/intent hooks + interest lexicon.
// Keeps "Toddler" and "Specialist" flows fully isolated (no shared overrides).

export const AGE_BANDS = {
  sensory: {
    range: [2, 5],
    hooks: [
      'animated for preschoolers',
      'story and song for toddlers',
      'fun learning cartoon',
      'playful educational video',
    ],
    pillars: {
      Nature:  ['animated animals for kids', 'nature songs for toddlers', 'colorful jungle learning'],
      Tech:    ['robot cartoon for kids', 'toy car learning animation'],
      Logic:   ['shapes and colors song', 'counting rhyme for kids', 'abc phonics animation'],
      Planes:  ['airplane cartoon for toddlers', 'vehicles song for kids'],
      Space:   ['cartoon planets for kids', 'space song for toddlers'],
    },
  },

  functional: {
    range: [6, 12],
    hooks: [
      'fun educational for kids',
      'explained with animation',
      'hands-on learning for children',
      'story based science for kids',
    ],
    pillars: {
      Nature:  ['wildlife for kids', 'ecosystem animation for kids'],
      Tech:    ['computers for kids animation', 'robotics for kids project'],
      Logic:   ['math puzzle game for kids', 'coding story for children'],
      Planes:  ['how airplanes fly for kids animation', 'aircraft parts for kids'],
      Space:   ['solar system animation for kids', 'space facts for kids'],
    },
  },

  specialist: {
    range: [13, 20],
    hooks: [
      'deep dive with visuals',
      'project based explanation',
      'documentary style breakdown',
      'advanced but engaging',
    ],
    pillars: {
      Nature:  ['ecology documentary explained', 'climate systems visual analysis'],
      Tech:    ['systems engineering breakdown with examples', 'semiconductor explained visually'],
      Logic:   ['algorithm deep dive with demos', 'advanced math visual intuition'],
      Planes:  ['aerodynamics engineering breakdown', 'jet engine explained with animation'],
      Space:   ['orbital mechanics visual deep dive'],
    },
  },
};

// Master pillars used when interest is null (Discovery Mode).
export const DISCOVERY_PILLARS = ['Nature', 'Tech', 'Logic'];

// Age-specific quality rules to keep recommendations educational + engaging,
// while suppressing dry lecture/classroom style uploads.
export const AGE_CONTENT_RULES = {
  sensory: {
    includeAny: ['animation', 'cartoon', 'song', 'rhymes', 'story', 'kids', 'toddlers', 'preschool'],
    excludeAny: ['lecture', 'class', 'syllabus', 'exam', 'worksheet', 'homework', 'university', 'podcast', 'news', 'politics'],
    minDurationSec: 60,
    maxDurationSec: 900,
    preferredVideoDuration: 'short',
  },
  functional: {
    includeAny: ['for kids', 'animation', 'explained', 'fun learning', 'experiment', 'activity', 'story'],
    excludeAny: ['full course', 'lecture', 'coaching', 'exam prep', 'jee', 'neet', 'podcast', 'debate', 'politics'],
    minDurationSec: 120,
    maxDurationSec: 1200,
    preferredVideoDuration: 'medium',
  },
  specialist: {
    includeAny: ['explained', 'breakdown', 'documentary', 'analysis', 'project', 'case study', 'visualized'],
    excludeAny: ['full lecture', 'classroom recording', 'exam strategy', 'crash course', 'political debate'],
    minDurationSec: 180,
    maxDurationSec: 1800,
    preferredVideoDuration: 'medium',
  },
};

// Brain-Rot junk filter (applied to title + description).
export const JUNK_REGEX =
  /\b(prank|challenge|unboxing|skibidi|vlog|reaction|surprise\s*egg)\b/i;
