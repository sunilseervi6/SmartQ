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
          <button onClick={logout} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
            Logout
          </button>
        </>
      ) : (
        <p>You are not logged in.</p>
      )}
    </div>
  );
}
