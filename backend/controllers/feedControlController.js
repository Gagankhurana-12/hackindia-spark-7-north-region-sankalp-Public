const mongoose = require('mongoose');
const Child = require('../models/Child');
const FeedControlMessage = require('../models/FeedControlMessage');
const ParentVideoSuggestion = require('../models/ParentVideoSuggestion');
const {
    extractYoutubeId,
    sanitizeTopic,
    detectLocalActions,
    buildChildSnapshot,
    buildSystemPrompt,
    buildHistory,
    callGroq,
    buildGreeting,
    reviewVideoForChild,
} = require('../services/feedControlService');

const ensureChildOwned = async (childId, parentId) => {
    if (!mongoose.Types.ObjectId.isValid(childId)) return null;
    return Child.findOne({ _id: childId, parentId });
};

async function applyActions({ parentId, child, actions }) {
    const applied = [];
    const seen = new Set();
    for (const action of actions) {
        if (!action || typeof action !== 'object') continue;
        const key = `${action.type}|${(action.value || action.payload?.value || action.videoId || '').toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        if (action.type === 'add_interest') {
            const value = sanitizeTopic(action.value || action.payload?.value);
            if (!value) continue;
            const exists = (child.interests || []).map((s) => s.toLowerCase()).includes(value);
            if (!exists) {
                child.interests = [...(child.interests || []), value];
                await child.save();
            }
            applied.push({ type: 'add_interest', payload: { value }, appliedAt: new Date() });
        } else if (action.type === 'remove_interest') {
            const value = sanitizeTopic(action.value || action.payload?.value);
            if (!value) continue;
            const before = (child.interests || []).length;
            child.interests = (child.interests || []).filter((s) => s.toLowerCase() !== value);
            if (child.interests.length !== before) await child.save();
            applied.push({ type: 'remove_interest', payload: { value }, appliedAt: new Date() });
        } else if (action.type === 'add_video') {
            const url = String(action.url || action.payload?.url || '').trim();
            const videoId = action.videoId || action.payload?.videoId || extractYoutubeId(url);
            if (!videoId) continue;
            const finalUrl = url || `https://www.youtube.com/watch?v=${videoId}`;
            const existing = await ParentVideoSuggestion.findOne({ parentId, childId: child._id, videoId });
            if (!existing) {
                await ParentVideoSuggestion.create({
                    parentId,
                    childId: child._id,
                    videoId,
                    url: finalUrl,
                    title: action.title || action.payload?.title || '',
                    note: action.note || action.payload?.note || '',
                });
            }
            applied.push({
                type: 'add_video',
                payload: { videoId, url: finalUrl, title: action.title || action.payload?.title || '' },
                appliedAt: new Date(),
            });
        } else if (action.type === 'block_video') {
            const videoId = action.videoId || action.payload?.videoId;
            const reason = String(action.reason || action.payload?.reason || 'flagged as not appropriate').slice(0, 240);
            applied.push({
                type: 'block_video',
                payload: { videoId: videoId || '', reason },
                appliedAt: new Date(),
            });
        }
    }
    return applied;
}

exports.getThread = async (req, res) => {
    try {
        const parentId = req.parent?._id;
        if (!parentId) return res.status(401).json({ message: 'Not authorized' });

        const { childId } = req.query;
        if (!childId) return res.status(400).json({ message: 'childId is required' });

        const child = await ensureChildOwned(childId, parentId);
        if (!child) return res.status(404).json({ message: 'Child not found' });

        const [messages, suggestions, snapshot] = await Promise.all([
            FeedControlMessage.find({ parentId, childId }).sort({ createdAt: 1 }).lean(),
            ParentVideoSuggestion.find({ parentId, childId }).sort({ createdAt: -1 }).limit(20).lean(),
            buildChildSnapshot(child._id),
        ]);

        let finalMessages = messages;
        if (messages.length === 0) {
            const greeting = buildGreeting(child, snapshot);
            const greetingDoc = await FeedControlMessage.create({
                parentId, childId, role: 'assistant', content: greeting,
            });
            finalMessages = [greetingDoc.toObject()];
        }

        res.json({
            messages: finalMessages,
            interests: child.interests || [],
            suggestions,
            recentWatched: snapshot.recentWatched,
            stats: {
                totalMinutes: snapshot.totalMinutes,
                totalVideos: snapshot.totalVideos,
                aiInteractions: snapshot.aiInteractions,
                topTopics: snapshot.topTopics,
            },
        });
    } catch (error) {
        console.error('getThread error:', error);
        res.status(500).json({ message: 'Server error loading conversation' });
    }
};

exports.postMessage = async (req, res) => {
    try {
        const parentId = req.parent?._id;
        if (!parentId) return res.status(401).json({ message: 'Not authorized' });

        const { childId, content } = req.body;
        if (!childId) return res.status(400).json({ message: 'childId is required' });
        const text = String(content || '').trim();
        if (!text) return res.status(400).json({ message: 'message is required' });

        const child = await ensureChildOwned(childId, parentId);
        if (!child) return res.status(404).json({ message: 'Child not found' });

        await FeedControlMessage.create({ parentId, childId, role: 'user', content: text });

        const snapshot = await buildChildSnapshot(child._id);
        const history = buildHistory(
            await FeedControlMessage.find({ parentId, childId }).sort({ createdAt: 1 }).lean()
        );
        const system = buildSystemPrompt(child, snapshot);

        // 1) YouTube link → safety + age-fit + concept extraction
        const ytId = extractYoutubeId(text);
        let videoReview = null;
        let contextHint = '';
        if (ytId) {
            videoReview = await reviewVideoForChild({ videoId: ytId, childAge: child.age, parentText: text });
            const parts = [
                `[video review] videoId=${ytId}`,
                `safe=${videoReview.safe}`,
                `ageAppropriate=${videoReview.ageAppropriate}`,
                `topic="${videoReview.topic || 'unknown'}"`,
                `concepts=[${(videoReview.concepts || []).join(', ')}]`,
                `oneLineSummary="${videoReview.oneLineSummary || ''}"`,
            ];
            if (videoReview.reason) parts.push(`reason="${videoReview.reason}"`);
            contextHint = parts.join(' ');
        }

        // 2) Local intent regex (works without GROQ key too)
        const localActions = detectLocalActions(text);

        // 3) LLM call
        let ai;
        try {
            ai = await callGroq({ system, history, userMessage: text, contextHint });
        } catch (err) {
            console.warn('[feedControl] Groq error, falling back:', err.message);
            ai = { reply: '', actions: [], source: 'fallback-error' };
        }

        // 4) Merge actions: local + LLM + safety-gated YT auto-actions
        const proposed = [...localActions, ...(ai.actions || [])];
        if (ytId && videoReview) {
            const allowed = videoReview.safe && videoReview.ageAppropriate;
            if (!allowed) {
                // Strip any add_video/add_interest tied to this URL — gate is closed.
                for (let i = proposed.length - 1; i >= 0; i--) {
                    const a = proposed[i];
                    if (a.type === 'add_video' && (a.videoId === ytId || a.payload?.videoId === ytId)) proposed.splice(i, 1);
                    if (a.type === 'add_interest' && videoReview.concepts.includes(sanitizeTopic(a.value || a.payload?.value))) proposed.splice(i, 1);
                }
                if (!proposed.some((a) => a.type === 'block_video')) {
                    proposed.push({ type: 'block_video', videoId: ytId, reason: videoReview.reason || 'not appropriate' });
                }
            } else {
                if (!proposed.some((a) => a.type === 'add_video' && (a.videoId === ytId || a.payload?.videoId === ytId))) {
                    proposed.push({ type: 'add_video', videoId: ytId, url: `https://www.youtube.com/watch?v=${ytId}` });
                }
                for (const concept of (videoReview.concepts || []).slice(0, 3)) {
                    if (!proposed.some((a) => a.type === 'add_interest' && sanitizeTopic(a.value || a.payload?.value) === concept)) {
                        proposed.push({ type: 'add_interest', value: concept });
                    }
                }
            }
        }

        const applied = await applyActions({ parentId, child, actions: proposed });

        // Reply enrichment when LLM had nothing useful
        let reply = ai.reply;
        if (ytId && videoReview && !reply) {
            if (!videoReview.safe || !videoReview.ageAppropriate) {
                reply = `I held off on adding that video for ${child.name}. ${videoReview.reason || 'It looks outside the safe / age-appropriate range.'} Want to try a video around ${(child.interests || [])[0] || 'a topic they already love'} instead?`;
            } else {
                const conceptList = (videoReview.concepts || []).join(', ') || videoReview.topic || 'a new topic';
                reply = `Reviewed it — looks safe for age ${child.age}. ${videoReview.oneLineSummary || ''} I've queued it and added ${conceptList} to ${child.name}'s interests.`;
            }
        } else if (!ytId && applied.some((a) => a.type === 'add_interest') && (!reply || reply === 'Got it.')) {
            const added = applied.filter((a) => a.type === 'add_interest').map((a) => a.payload.value).join(', ');
            reply = `Done — added ${added} to ${child.name}'s interests.`;
        }

        const assistantMsg = await FeedControlMessage.create({
            parentId, childId, role: 'assistant', content: reply || 'Got it.', actions: applied,
        });

        const [suggestions, refreshedChild] = await Promise.all([
            ParentVideoSuggestion.find({ parentId, childId }).sort({ createdAt: -1 }).limit(20).lean(),
            Child.findById(child._id).lean(),
        ]);

        res.json({
            message: assistantMsg.toObject(),
            interests: refreshedChild?.interests || [],
            suggestions,
        });
    } catch (error) {
        console.error('postMessage error:', error);
        res.status(500).json({ message: 'Server error sending message' });
    }
};

exports.addInterest = async (req, res) => {
    try {
        const parentId = req.parent?._id;
        const { childId, interest } = req.body;
        if (!childId || !interest) return res.status(400).json({ message: 'childId and interest required' });
        const child = await ensureChildOwned(childId, parentId);
        if (!child) return res.status(404).json({ message: 'Child not found' });
        const value = sanitizeTopic(interest);
        if (!value || value.length < 2) return res.status(400).json({ message: 'Invalid interest' });
        const exists = (child.interests || []).map((s) => s.toLowerCase()).includes(value);
        if (!exists) {
            child.interests = [...(child.interests || []), value];
            await child.save();
        }
        res.json({ interests: child.interests });
    } catch (error) {
        console.error('addInterest error:', error);
        res.status(500).json({ message: 'Server error adding interest' });
    }
};

exports.removeInterest = async (req, res) => {
    try {
        const parentId = req.parent?._id;
        const { childId, interest } = req.body;
        if (!childId || !interest) return res.status(400).json({ message: 'childId and interest required' });
        const child = await ensureChildOwned(childId, parentId);
        if (!child) return res.status(404).json({ message: 'Child not found' });
        const target = sanitizeTopic(interest);
        child.interests = (child.interests || []).filter((s) => s.toLowerCase() !== target);
        await child.save();
        res.json({ interests: child.interests });
    } catch (error) {
        console.error('removeInterest error:', error);
        res.status(500).json({ message: 'Server error removing interest' });
    }
};
