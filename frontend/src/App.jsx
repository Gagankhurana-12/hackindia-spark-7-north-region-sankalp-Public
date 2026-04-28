import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import ParentAuth from './pages/ParentAuth';
import ParentDashboard from './pages/ParentDashboard';
import ChildAuth from './pages/ChildAuth';
import RoleChooser from './pages/RoleChooser';
import VideoFeed from './pages/VideoFeed';
import Watch from './pages/Watch';
import ChildProfile from './pages/ChildProfile';
import WatchHistory from './pages/WatchHistory';
import AIMentorChat from './pages/AIMentorChat';
import { AuthProvider } from './context/AuthContext';
import { ChildProvider } from './context/ChildContext';
import ProtectedRoute from './components/ProtectedRoute';
import Overview from './pages/Overview';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import FeedControl from './pages/FeedControl';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ChildProvider>
          <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/get-started" element={<RoleChooser />} />
              <Route path="/parent-auth" element={<ParentAuth />} />
              <Route path="/child-auth" element={<ChildAuth />} />
              <Route
                path="/parent-dashboard"
                element={
                  <ProtectedRoute>
                    <ParentDashboard />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<Overview />} />
                <Route path="feed-control" element={<FeedControl />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="/video-feed" element={<VideoFeed />} />
              <Route path="/child-profile" element={<ChildProfile />} />
              <Route path="/watch-history" element={<WatchHistory />} />
              <Route path="/ai-mentor" element={<AIMentorChat />} />
              <Route path="/watch/:id" element={<Watch />} />
              {/* Legacy redirect or wildcard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </ChildProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;