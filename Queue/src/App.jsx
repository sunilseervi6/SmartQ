import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import PrivateRoute from "./utils/PrivateRoute";
import ChatBot from "./components/ChatBot";
import VoiceAgent from "./components/VoiceAgent";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreateShop from "./pages/CreateShop";
import MyShops from "./pages/MyShops";
import ManageRooms from "./pages/ManageRooms";
import QueueDashboard from "./pages/QueueDashboard";
import JoinQueue from "./pages/JoinQueue";
import QuickJoin from "./pages/QuickJoin";

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <Router>
          <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/join" element={<QuickJoin />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/create-shop"
            element={
              <PrivateRoute>
                <CreateShop />
              </PrivateRoute>
            }
          />
          <Route
            path="/my-shops"
            element={
              <PrivateRoute>
                <MyShops />
              </PrivateRoute>
            }
          />
          <Route
            path="/manage-rooms/:shopId"
            element={
              <PrivateRoute>
                <ManageRooms />
              </PrivateRoute>
            }
          />
          <Route
            path="/queue-dashboard/:roomId"
            element={
              <PrivateRoute>
                <QueueDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/join-queue"
            element={
              <PrivateRoute>
                <JoinQueue />
              </PrivateRoute>
            }
          />
          </Routes>
          <ChatBot />
          <VoiceAgent />
        </Router>
      </ChatProvider>
    </AuthProvider>
  );
}
