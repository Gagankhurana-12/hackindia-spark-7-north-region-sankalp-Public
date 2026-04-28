const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const parentRoutes = require('./routes/parentRoutes');
const ppuRoutes = require('./routes/ppuRoutes');
const watchRoutes = require('./routes/watchRoutes');
const mentorRoutes = require('./routes/mentorRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const taskRoutes = require('./routes/taskRoutes');
const activityRoutes = require('./routes/activityRoutes');
const reportRoutes = require('./routes/reportRoutes');
const feedControlRoutes = require('./routes/feedControlRoutes');
const giftRoutes = require('./routes/giftRoutes');
const missionRoutes = require('./routes/missionRoutes');


// Load env variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const bodyLimit = process.env.BODY_LIMIT || '15mb';

// Middleware
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
app.use(cors());

// Default Route
app.get('/', (req, res) => {
    res.send('GrowthFeed Backend API is running');
});

// Import Routes
app.use('/api/auth', authRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/ppu', ppuRoutes);
app.use('/api/watch', watchRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/feed-control', feedControlRoutes);
app.use('/api/gifts', giftRoutes);
app.use('/api/missions', missionRoutes);


// Return a helpful message when voice uploads exceed configured size.
app.use((error, req, res, next) => {
    if (error?.type === 'entity.too.large' || error?.status === 413) {
        return res.status(413).json({
            message: `Voice payload is too large. Please keep recordings shorter or increase BODY_LIMIT (current: ${bodyLimit}).`,
        });
    }

    return next(error);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, console.log(`Server running on port ${PORT}`));