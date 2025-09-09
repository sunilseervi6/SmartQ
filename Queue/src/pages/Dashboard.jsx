import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Hello! 👋</h1>

      {user ? (
        <>
          <p>Welcome to SmartQ, <strong>{user.name}</strong>!</p>
          <p>You are successfully logged in.</p>
          
          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button 
              onClick={() => window.location.href = "/create-shop"}
              style={{ 
                padding: "1rem 1.5rem", 
                backgroundColor: "#28a745", 
                color: "white", 
                border: "none", 
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "bold"
              }}
            >
              🏪 Create Shop
            </button>
            
            <button 
              onClick={() => window.location.href = "/my-shops"}
              style={{ 
                padding: "1rem 1.5rem", 
                backgroundColor: "#007bff", 
                color: "white", 
                border: "none", 
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "bold"
              }}
            >
              📋 My Shops
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
