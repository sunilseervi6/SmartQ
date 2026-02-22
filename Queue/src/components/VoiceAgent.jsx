import { useState, useContext, useRef, useEffect, useCallback } from "react";
import { Room, RoomEvent, Track, ConnectionState } from "livekit-client";
import { AuthContext } from "../context/AuthContext";
import "./VoiceAgent.css";

const CALL_STATE = {
  IDLE: "idle",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ENDING: "ending",
};

export default function VoiceAgent() {
  const { user } = useContext(AuthContext);
  const [callState, setCallState] = useState(CALL_STATE.IDLE);
  const [agentReady, setAgentReady] = useState(false); // true only once agent joins room
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [duration, setDuration] = useState(0);

  const roomRef = useRef(null);
  const roomNameRef = useRef(null);
  const audioElementsRef = useRef([]);
  const timerRef = useRef(null);
  const callStartRef = useRef(null);

  // Cleanup audio elements on unmount
  useEffect(() => {
    return () => {
      audioElementsRef.current.forEach((el) => {
        el.pause();
        el.remove();
      });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer only starts once the agent has actually joined (agentReady)
  useEffect(() => {
    if (agentReady) {
      callStartRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - callStartRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [agentReady]);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const startCall = useCallback(async () => {
    if (!user?.token) {
      setError("Please log in to use the voice assistant.");
      return;
    }

    setError(null);
    setCallState(CALL_STATE.CONNECTING);

    try {
      // 1. Get token from backend
      const res = await fetch("http://localhost:5000/api/voice/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to get voice token");
      }

      const { token, roomName, serverUrl } = await res.json();
      roomNameRef.current = roomName;

      // 2. Create LiveKit room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      // 3. Wire up room events
      room.on(RoomEvent.Connected, () => {
        setCallState(CALL_STATE.CONNECTED);
      });

      room.on(RoomEvent.Disconnected, () => {
        setCallState(CALL_STATE.IDLE);
        setAgentReady(false);
        setAgentSpeaking(false);
        setUserSpeaking(false);
        audioElementsRef.current.forEach((el) => { el.pause(); el.remove(); });
        audioElementsRef.current = [];
        roomRef.current = null;
      });

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === ConnectionState.Reconnecting) {
          setError("Reconnecting...");
        } else if (state === ConnectionState.Connected) {
          setError(null);
        }
      });

      // 4. Play remote audio (agent voice) automatically
      // agentReady triggers here — this is when the agent has actually joined
      room.on(RoomEvent.TrackSubscribed, (track, _publication, _participant) => {
        if (track.kind === Track.Kind.Audio) {
          setAgentReady(true); // start the timer now
          const audioEl = track.attach();
          audioEl.autoplay = true;
          audioEl.style.display = "none";
          document.body.appendChild(audioEl);
          audioElementsRef.current.push(audioEl);

          track.on("muted", () => setAgentSpeaking(false));
          track.on("unmuted", () => setAgentSpeaking(true));
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          track.detach().forEach((el) => el.remove());
          setAgentSpeaking(false);
        }
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const localIsSpeaking = speakers.some(
          (s) => s.identity === room.localParticipant?.identity
        );
        const agentIsSpeaking = speakers.some(
          (s) => s.identity !== room.localParticipant?.identity
        );
        setUserSpeaking(localIsSpeaking);
        setAgentSpeaking(agentIsSpeaking);
      });

      // 5. Connect and enable microphone
      await room.connect(serverUrl, token);
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch (err) {
      console.error("Voice call error:", err);
      setError(err.message || "Failed to start voice call");
      setCallState(CALL_STATE.IDLE);
      roomRef.current = null;
    }
  }, [user]);

  const endCall = useCallback(async () => {
    setCallState(CALL_STATE.ENDING);
    setAgentReady(false);

    // Disconnect LiveKit room
    if (roomRef.current) {
      await roomRef.current.disconnect();
    }

    // Tell backend to kill the agent process
    if (roomNameRef.current && user?.token) {
      fetch("http://localhost:5000/api/voice/end", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ roomName: roomNameRef.current }),
      }).catch(() => {}); // fire and forget
      roomNameRef.current = null;
    }

    setCallState(CALL_STATE.IDLE);
  }, [user]);

  const isActive = callState === CALL_STATE.CONNECTED || callState === CALL_STATE.ENDING;
  const isConnecting = callState === CALL_STATE.CONNECTING;

  return (
    <>
      {/* Floating action button — positioned above the chatbot FAB */}
      <button
        className={`voice-fab ${isActive ? "voice-fab--active" : ""} ${isConnecting ? "voice-fab--connecting" : ""}`}
        onClick={isActive ? endCall : startCall}
        disabled={callState === CALL_STATE.ENDING}
        title={isActive ? "End voice call" : "Start SmartQ voice assistant"}
      >
        {isConnecting ? (
          <svg className="voice-fab-spinner" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" strokeWidth="3" stroke="currentColor" strokeDasharray="30 60" />
          </svg>
        ) : isActive ? (
          /* Phone hang-up icon */
          <svg viewBox="0 0 24 24">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.12-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
          </svg>
        ) : (
          /* Microphone icon */
          <svg viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
          </svg>
        )}
      </button>

      {/* Active call card — bottom-left, stays visible while navigating */}
      {isActive && (
        <div className={`voice-card ${minimized ? "voice-card--minimized" : ""}`}>
          <div className="voice-card-header">
            <div className="voice-card-title-area">
              <div className={`voice-card-dot ${agentSpeaking ? "voice-card-dot--speaking" : agentReady ? "" : "voice-card-dot--connecting"}`} />
              <span className="voice-card-title">SmartQ Voice</span>
              {agentReady && <span className="voice-card-duration">{formatDuration(duration)}</span>}
            </div>
            <button
              className="voice-card-minimize"
              onClick={() => setMinimized((v) => !v)}
              title={minimized ? "Expand" : "Minimize"}
            >
              {minimized ? "▲" : "▼"}
            </button>
          </div>

          {!minimized && (
            <div className="voice-card-body">
              {/* Waveform visualizer */}
              <div className="voice-waveform">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className={`voice-waveform-bar ${agentSpeaking ? "voice-waveform-bar--active" : ""}`}
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>

              <p className="voice-card-status">
                {!agentReady
                  ? "Agent joining..."
                  : agentSpeaking
                  ? "Assistant speaking..."
                  : userSpeaking
                  ? "Listening..."
                  : "Connected — say something"}
              </p>

              <button className="voice-end-btn" onClick={endCall}>
                <svg viewBox="0 0 24 24">
                  <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.12-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
                </svg>
                End Call
              </button>
            </div>
          )}
        </div>
      )}

      {/* Connecting overlay hint */}
      {isConnecting && (
        <div className="voice-card voice-card--connecting">
          <div className="voice-card-header">
            <div className="voice-card-title-area">
              <div className="voice-card-dot voice-card-dot--connecting" />
              <span className="voice-card-title">Connecting...</span>
            </div>
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="voice-error" onClick={() => setError(null)}>
          {error}
        </div>
      )}
    </>
  );
}
