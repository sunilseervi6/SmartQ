import os
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Annotated

import httpx
from dotenv import load_dotenv

from livekit import agents, rtc
from livekit.agents import AgentServer, AgentSession, Agent, room_io, function_tool
from livekit.plugins import noise_cancellation, silero, groq, cartesia, assemblyai

load_dotenv(".env.local")

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")
AGENT_SECRET = os.getenv("AGENT_SECRET", "smartq-agent-secret-2024")

LATENCY_FILE = Path(__file__).parent / "latency.txt"

SMARTQ_SYSTEM_PROMPT = """You are SmartQ Voice Assistant — a friendly, concise voice AI for the SmartQ queue management platform.

SmartQ helps businesses manage digital queues and helps customers join and track queues in real time.

CORE CONCEPTS:
- Shop: A business with a unique shop code (SHOP-XXXXXX). Owners create shops with name, address, category, contact info.
- Room: A service point inside a shop (e.g. "Counter 1", "Dr. Smith"). Has a room code (RM-XXXXXX), type, and max capacity.
- Queue: Customers waiting at a room. Each entry has a queue number, status (waiting/in_progress/completed), and priority (normal/urgent/vip).
- QR Code: Each room has a QR code customers can scan to join quickly.

WHAT YOU CAN DO:
- Look up room queue status, room details, shop details, and browse available rooms using your tools.
- Guide customers on how to join queues, check position, use QR codes, understand wait times.
- Guide owners on how to create shops, add rooms, manage queues, call next customer, handle priorities.
- Answer general questions about SmartQ.

VOICE GUIDELINES:
- Keep responses SHORT and conversational — this is voice, not text.
- No asterisks, bullet points, markdown, or special symbols.
- Speak naturally. Use "about 5 minutes" not "approximately 5 minutes".
- For lists, say "first... second... third..." instead of bullet points.
- If a user asks about their own queue status, let them know you can look it up if they provide their user ID, or they can check the app directly.
- Only answer questions about SmartQ and queue management. Politely redirect off-topic questions.
"""


def log_latency(ms: float) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] Response latency: {ms:.0f}ms"
    print(line)
    with open(LATENCY_FILE, "a") as f:
        f.write(line + "\n")


async def call_backend(action: str, params: dict) -> dict:
    """Call the SmartQ backend agent-query endpoint to execute a tool."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/voice/agent-query",
                json={"action": action, "params": params},
                headers={"x-agent-secret": AGENT_SECRET},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        return {"error": f"Could not reach backend: {str(e)}"}


class SmartQAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=SMARTQ_SYSTEM_PROMPT)

    @function_tool
    async def get_room_queue(
        self,
        room_code: Annotated[str, "The room code to look up, for example RM-ABC123"],
    ) -> str:
        """Get the current queue status for a specific room — how many people are waiting and estimated wait time."""
        result = await call_backend("get_room_queue", {"roomCode": room_code})
        return json.dumps(result)

    @function_tool
    async def get_room_details(
        self,
        room_code: Annotated[str, "The room code, for example RM-ABC123"],
    ) -> str:
        """Get details about a specific room — name, type, capacity, operating hours, and the shop it belongs to."""
        result = await call_backend("get_room_details", {"roomCode": room_code})
        return json.dumps(result)

    @function_tool
    async def get_shop_details(
        self,
        identifier: Annotated[str, "The shop code (e.g. SHOP-ABC123) or custom ID"],
    ) -> str:
        """Get details about a specific shop — name, address, category, contact info, and its rooms."""
        result = await call_backend("get_shop_details", {"identifier": identifier})
        return json.dumps(result)

    @function_tool
    async def browse_rooms(
        self,
        search: Annotated[str, "Optional search term to filter rooms by name or description"] = "",
        category: Annotated[str, "Optional shop category to filter by, e.g. Restaurant, Healthcare, Retail"] = "",
    ) -> str:
        """Browse and search available rooms and queues. Use when the user wants to find a room or queue to join."""
        params = {}
        if search:
            params["search"] = search
        if category:
            params["category"] = category
        result = await call_backend("browse_rooms", params)
        return json.dumps(result)


server = AgentServer()


@server.rtc_session()
async def smartq_voice_agent(ctx: agents.JobContext):
    session = AgentSession(
        vad=silero.VAD.load(),
        stt=assemblyai.STT(),
        llm=groq.LLM(model="llama-3.3-70b-versatile"),
        tts=cartesia.TTS(
            voice="79a125e8-cd45-4c13-8a67-188112f4dd22",  # Friendly female voice
        ),
    )

    _thinking_start: list[float] = [0.0]

    @session.on("agent_state_changed")
    def on_agent_state_changed(ev) -> None:
        if ev.new_state == "thinking":
            _thinking_start[0] = time.perf_counter()
        elif ev.new_state == "speaking" and _thinking_start[0]:
            log_latency((time.perf_counter() - _thinking_start[0]) * 1000)
            _thinking_start[0] = 0.0

    await session.start(
        room=ctx.room,
        agent=SmartQAssistant(),
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: (
                    noise_cancellation.BVCTelephony()
                    if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                    else noise_cancellation.BVC()
                ),
            ),
            audio_output=True,
        ),
    )

    await session.generate_reply(
        instructions="Greet the user warmly, introduce yourself as the SmartQ voice assistant, and ask how you can help them today."
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
