import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Hello! 👋</h1>

      {user ? (
        <>
          <p>Welcome to SmartQ, <strong>{user.name}</strong>!</p>
          <p>You are successfully logged in.</p>
          
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "2rem", flexWrap: "wrap" }}>
            <button 
              onClick={() => navigate("/create-shop")}
              style={{ 
                padding: "1rem 2rem", 
                backgroundColor: "#007bff", 
                color: "white", 
                border: "none", 
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "1.1rem",
                fontWeight: "bold"
              }}
            >
              Create Shop
            </button>
            <button 
              onClick={() => navigate("/my-shops")}
              style={{ 
                padding: "1rem 2rem", 
                backgroundColor: "#28a745", 
                color: "white", 
                border: "none", 
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "1.1rem",
                fontWeight: "bold"
              }}
            >
              My Shops
            </button>
            <button 
              onClick={() => navigate("/join-queue")}
              style={{ 
                padding: "1rem 2rem", 
                backgroundColor: "#6f42c1", 
                color: "white", 
                border: "none", 
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "1.1rem",
                fontWeight: "bold"
              }}
            >
              Join Queue
            </button>
          </div>

          <button 
            onClick={logout} 
            style={{ 
              marginTop: "2rem", 
              padding: "0.5rem 1rem",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Logout
          </button>
        </>
      ) : (
        <p>You are not logged in.</p>
      )}
    </div>
  );
}
