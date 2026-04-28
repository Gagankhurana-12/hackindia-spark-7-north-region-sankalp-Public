// Lightweight keyword → topic classifier used as a fallback when no LLM
// key is configured. Each topic lists trigger words; first match wins.
const TOPIC_KEYWORDS = [
    ['space', ['space', 'planet', 'galaxy', 'astronaut', 'rocket', 'orbit', 'cosmos', 'mars', 'moon', 'star', 'nebula', 'satellite']],
    ['dinosaurs', ['dinosaur', 't-rex', 'jurassic', 'fossil', 'paleontology', 'raptor', 'triceratops']],
    ['animals', ['animal', 'wildlife', 'mammal', 'bird', 'reptile', 'tiger', 'lion', 'elephant', 'shark', 'whale']],
    ['nature', ['nature', 'forest', 'ocean', 'jungle', 'rainforest', 'ecosystem', 'biodiversity', 'plant', 'tree']],
    ['ai', ['ai ', 'artificial intelligence', 'machine learning', 'neural', 'chatgpt', 'llm', 'robot']],
    ['coding', ['coding', 'programming', 'python', 'javascript', 'algorithm', 'developer', 'software']],
    ['math', ['math', 'mathematics', 'algebra', 'geometry', 'calculus', 'arithmetic', 'fraction', 'equation']],
    ['science', ['science', 'experiment', 'physics', 'chemistry', 'biology', 'molecule', 'atom']],
    ['history', ['history', 'ancient', 'pyramid', 'pharaoh', 'rome', 'medieval', 'civilization', 'world war']],
    ['music', ['music', 'song', 'piano', 'guitar', 'drum', 'orchestra', 'rhythm', 'melody']],
    ['art', ['art', 'painting', 'drawing', 'sketch', 'sculpture', 'museum']],
    ['sports', ['sport', 'football', 'soccer', 'cricket', 'basketball', 'tennis', 'olympics']],
    ['cooking', ['cook', 'recipe', 'baking', 'kitchen', 'chef']],
    ['geography', ['geography', 'country', 'continent', 'mountain', 'river', 'volcano', 'earthquake']],
    ['technology', ['technology', 'gadget', 'computer', 'smartphone', 'engineer', 'invention']],
    ['storytelling', ['story', 'fairy tale', 'fable', 'bedtime', 'tale']],
];

function classifyByKeywords(text) {
    const haystack = String(text || '').toLowerCase();
    if (!haystack) return null;
    for (const [topic, keys] of TOPIC_KEYWORDS) {
        if (keys.some((k) => haystack.includes(k))) return topic;
    }
    return null;
}

module.exports = { classifyByKeywords };
