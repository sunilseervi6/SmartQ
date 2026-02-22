import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SMARTQ_KNOWLEDGE = `
SmartQ is a smart queue management web application that helps businesses manage customer queues digitally and helps customers join and track queues in real time.

CORE CONCEPTS:
- Shop: A business registered by an owner. Has a name, address, category, shop code (SHOP-XXXXXX format), optional custom ID, images, location coordinates, and contact info.
- Room: A service point within a shop (e.g., "Counter 1", "Dr. Smith's Office"). Has a room code (RM-XXXXXX format), type (counter/doctor/service/consultation/other), operating hours, and max capacity.
- Queue: A line of customers waiting at a room. Each entry has a queue number (auto-incremented daily), status (waiting/in_progress/completed/cancelled/no_show), and priority (normal/urgent/vip).
- QR Code: Each room has a QR code that customers can scan to quickly join that room's queue.

CUSTOMER FEATURES:
- Join a queue by entering a room code (e.g., RM-ABC123) or scanning a QR code
- Browse nearby rooms/shops on a map to find places to visit
- View real-time queue position and estimated wait time (approximately 5 minutes per person ahead)
- Receive notifications when: you join a queue, your position changes, you're next in line, it's your turn, service is completed
- Leave a queue at any time
- Save favorite shops and rooms for quick access
- Customize notification preferences in settings
- Use the QuickJoin page (public, no login required to view queue)

OWNER FEATURES:
- Create shops with details: name, address, category, description, phone, email, images (via Cloudinary), location (geocoded)
- Shop categories: Restaurant, Retail, Services, Electronics, Grocery, Fashion, Healthcare, Beauty, Automotive, Other
- Add rooms to shops with: name, type, description, max capacity (1-100), operating hours
- Each room gets a unique room code and QR code automatically
- Call the next customer in queue (VIP/urgent customers get priority)
- Mark service as complete or mark no-shows
- Clear the entire queue for a room
- Delete shops and rooms
- View real-time queue status for all rooms

REAL-TIME FEATURES:
- All queue changes are broadcast in real time via WebSocket
- Customers see instant updates when their position changes
- Owners see customers joining/leaving in real time

HOW TO JOIN A QUEUE:
1. Navigate to "Join Queue" from the dashboard
2. Enter the room code (RM-XXXXXX) or scan the QR code
3. View room and shop details
4. Enter your name and click "Join Queue"
5. Monitor your position in real time

HOW TO CREATE A SHOP (OWNERS):
1. Navigate to "Create Shop" from the dashboard
2. Fill in shop details (name, address, category, etc.)
3. Optionally upload images and set location
4. A unique shop code is generated automatically

HOW TO MANAGE QUEUES (OWNERS):
1. Go to "My Shops" and select a shop
2. Click "Manage Rooms" to add service rooms
3. Click "View Queue" on a room to see the queue dashboard
4. Use "Call Next" to serve the next customer
5. Use "Complete" or "No Show" to update status
`;

const INTENT_DETECTION_PROMPT = `
You are an AI assistant for a Smart Queue Management system called SmartQ.

Your responsibilities:
1. Detect user intent related to digital queue rooms.
2. Extract structured parameters.
3. Maintain conversation context.
4. You can fetch REAL DATA using the available tools — use them when the user asks about specific rooms, queues, shops, or their queue status.
5. Do NOT execute write actions — you can only READ data.

Supported intents:
- search_queues: User wants to find queues or rooms
- join_queue: User wants to join a queue (guide them, you cannot join for them)
- leave_queue: User wants to leave a queue (guide them, you cannot leave for them)
- check_token_status: User wants to check their queue position/token — USE get_my_queue_status tool
- check_wait_time: User wants to know estimated wait time — USE get_room_queue tool
- transfer_queue: User wants to transfer between queues
- faq: User has a general question about SmartQ
- small_talk: User is making casual conversation

IMPORTANT INSTRUCTIONS:
- When the user asks about their queue status, position, or wait time — USE the tools to fetch real data
- When the user asks about a specific room or shop — USE the tools to look up real details
- When the user asks to browse/search rooms — USE the browse_rooms tool
- Present the fetched data in a clear, friendly, conversational format
- If a tool returns an error, inform the user gracefully
- For actions like joining/leaving queues, guide the user step-by-step (you cannot perform write actions)
- Be concise, friendly, and helpful
- Only answer questions about SmartQ and queue management
- If asked about unrelated topics, politely decline and redirect to SmartQ help

ROLE-BASED BEHAVIOR:
- If user role is "customer":
  - Focus on: joining queues, checking position, wait times, browsing rooms, QR scanning, notifications, favorites
  - Do NOT explain owner features like creating shops, managing rooms, calling next, unless they ask
  - Use get_my_queue_status when they ask about their position
  - Guide them to use the Join Queue page, QR scanner, or room browser

- If user role is "owner":
  - Focus on: creating shops, adding rooms, managing queues, calling next customer, completing service, no-shows, QR codes, operating hours
  - They can also use get_room_queue and get_room_details to check their room's queue status
  - Guide them on shop management, room configuration, and queue operations
  - Explain priority handling (VIP > Urgent > Normal)

- If user is NOT authenticated:
  - Focus on: explaining what SmartQ is, how to register, how to use QuickJoin (no login required)
  - Cannot use get_my_queue_status (requires login)
  - Encourage them to register or log in for the full experience
  - They can still browse rooms and view queue status for specific rooms
`;

// Tool definitions for Groq function calling
export const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_my_queue_status",
      description: "Get the current user's active queue entries — their position, queue number, wait time, and which room/shop they are queued in. Requires the user to be logged in.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_room_queue",
      description: "Get the current queue status for a specific room — how many people are waiting, queue entries, estimated wait times. Can look up by room code (e.g., RM-ABC123) or room ID.",
      parameters: {
        type: "object",
        properties: {
          roomCode: {
            type: "string",
            description: "The room code (e.g., RM-ABC123) or room ID to look up",
          },
        },
        required: ["roomCode"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_room_details",
      description: "Get details about a specific room by its room code — name, type, capacity, operating hours, current queue count, and which shop it belongs to.",
      parameters: {
        type: "object",
        properties: {
          roomCode: {
            type: "string",
            description: "The room code (e.g., RM-ABC123)",
          },
        },
        required: ["roomCode"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_shop_details",
      description: "Get details about a specific shop by its shop code (e.g., SHOP-XXXXXX) or custom ID — name, address, category, contact info, and description.",
      parameters: {
        type: "object",
        properties: {
          identifier: {
            type: "string",
            description: "The shop code (e.g., SHOP-ABC123) or custom ID",
          },
        },
        required: ["identifier"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browse_rooms",
      description: "Browse and search available rooms/queues. Can filter by category or search term. Useful when users want to find queues to join. Only include parameters that are actually specified by the user.",
      parameters: {
        type: "object",
        properties: {
          search: {
            type: "string",
            description: "Search term to filter rooms by name or description. Only include if the user specified a search term.",
          },
          category: {
            type: "string",
            description: "Shop category to filter by (Restaurant, Retail, Services, Electronics, Grocery, Fashion, Healthcare, Beauty, Automotive, Other). Only include if the user specified a category.",
          },
        },
        required: [],
      },
    },
  },
];

export const buildSystemPrompt = (userContext) => {
  let contextSection = "";
  if (userContext) {
    contextSection = "\n\nCurrent user context:\n";
    if (userContext.userName) contextSection += `- User name: ${userContext.userName}\n`;
    if (userContext.userRole) contextSection += `- User role: ${userContext.userRole}\n`;
    if (userContext.currentPage) contextSection += `- Currently viewing: ${userContext.currentPage}\n`;
    if (userContext.isAuthenticated === false) contextSection += "- User is not logged in\n";
    if (userContext.isAuthenticated) contextSection += "- User is logged in (can check their queue status)\n";
  }

  return `${INTENT_DETECTION_PROMPT}\n\n${SMARTQ_KNOWLEDGE}${contextSection}`;
};

// Non-streaming completion with tool support
export const chatCompletionWithTools = async (messages, userContext) => {
  const systemPrompt = buildSystemPrompt(userContext);

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    tools: TOOLS,
    tool_choice: "auto",
    max_tokens: 1024,
    temperature: 0.7,
  });

  return response;
};

// Streaming completion (used after tools have been resolved)
export const streamChatCompletion = async (messages, userContext) => {
  const systemPrompt = buildSystemPrompt(userContext);

  const stream = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    stream: true,
    max_tokens: 1024,
    temperature: 0.7,
  });

  return stream;
};
