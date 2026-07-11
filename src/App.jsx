import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Login } from "./pages/Auth/Login";
import { Signup } from "./pages/Auth/Signup";
import { Dashboard } from "./pages/Dashboard";
import { Chat } from "./pages/Chat";
import { Profile } from "./pages/Profile";
import { StudyMaterials } from "./pages/StudyMaterials";
import { NoticeBoard } from "./pages/NoticeBoard";
import { ClubDetail } from "./pages/ClubDetail";
import { ProtectedRoute } from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/study-materials" element={<ProtectedRoute><StudyMaterials /></ProtectedRoute>} />
        <Route path="/notice-board" element={<ProtectedRoute><NoticeBoard /></ProtectedRoute>} />
        <Route path="/club/:slug" element={<ProtectedRoute><ClubDetail /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}
export default App;
