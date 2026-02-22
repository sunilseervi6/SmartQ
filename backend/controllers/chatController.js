import { chatCompletionWithTools, streamChatCompletion } from "../services/groqService.js";
import Room from "../models/Room.js";
import Shop from "../models/Shop.js";
import Queue from "../models/Queue.js";

// ─── Built-in FAQ — answered locally without calling Groq API ───
const FAQ_DATABASE = {
  // General
  general: [
    {
      patterns: ["what is smartq", "what's smartq", "tell me about smartq", "what does smartq do"],
      answer: "SmartQ is a smart queue management web application that helps businesses manage customer queues digitally and helps customers join and track queues in real time. Businesses can create shops and rooms, while customers can join queues, track their position, and receive real-time notifications.",
    },
    {
      patterns: ["how does smartq work", "how smartq works"],
      answer: "SmartQ works in 3 simple steps:\n1. Shop owners create their business and add service rooms (counters, consultation rooms, etc.)\n2. Customers join a queue by entering a room code (RM-XXXXXX) or scanning a QR code\n3. Everyone gets real-time updates — customers see their position, owners manage the queue digitally",
    },
    {
      patterns: ["is smartq free", "pricing", "cost", "how much"],
      answer: "SmartQ is currently free to use for both shop owners and customers. Simply register an account and get started!",
    },
  ],

  // Customer FAQs
  customer: [
    {
      patterns: ["how to join", "how do i join", "join a queue", "join queue", "how can i join"],
      answer: "To join a queue:\n1. Go to 'Join Queue' from the dashboard\n2. Enter the room code (RM-XXXXXX format) or scan the QR code\n3. View the room and shop details\n4. Enter your name and click 'Join Queue'\n5. You'll get real-time updates on your position!",
    },
    {
      patterns: ["how to leave", "leave queue", "exit queue", "cancel queue", "how do i leave"],
      answer: "To leave a queue, go to your active queue view and click the 'Leave Queue' button. You'll be removed immediately and your position will be freed up for others.",
    },
    {
      patterns: ["what is room code", "room code", "what's a room code", "rm code"],
      answer: "A room code is a unique identifier in the format RM-XXXXXX (e.g., RM-ABC123). Each service room has its own code. You can get it from the shop owner, scan the room's QR code, or find it when browsing nearby rooms.",
    },
    {
      patterns: ["qr code", "scan qr", "how to scan", "qr scan"],
      answer: "Each room has a unique QR code. To use it:\n1. Go to 'Join Queue' and click 'Scan QR Code'\n2. Point your camera at the QR code\n3. The room details will load automatically\n4. Enter your name and join!",
    },
    {
      patterns: ["notifications", "notification", "alerts", "notify me"],
      answer: "SmartQ sends you real-time notifications for:\n- When you join a queue\n- When your position changes\n- When you're next in line\n- When it's your turn\n- When your service is completed\n\nYou can customize these in your notification preferences.",
    },
    {
      patterns: ["wait time", "how long", "estimated time", "waiting time"],
      answer: "Estimated wait time is calculated at approximately 5 minutes per person ahead of you in the queue. For example, if you're 4th in line, your estimated wait is about 15 minutes. This updates in real time as the queue moves.",
    },
    {
      patterns: ["favorites", "favourite", "save shop", "bookmark"],
      answer: "You can save your favorite shops and rooms for quick access! Just click the heart/favorite icon on any shop or room, and it'll appear in your Favorites section on the dashboard.",
    },
    {
      patterns: ["priority", "urgent", "vip", "priority levels"],
      answer: "SmartQ supports 3 priority levels:\n- Normal: Standard queue position\n- Urgent: Gets priority over normal entries\n- VIP: Highest priority, served first\n\nPriority is typically set by the shop owner when managing the queue.",
    },
  ],

  // Owner FAQs
  owner: [
    {
      patterns: ["how to create shop", "create a shop", "register shop", "add shop", "new shop", "create shop"],
      answer: "To create a shop:\n1. Go to 'Create Shop' from the dashboard\n2. Fill in your shop details — name, address, category, description\n3. Add contact info (phone, email)\n4. Optionally upload images and set your location on the map\n5. Click 'Create' — a unique shop code (SHOP-XXXXXX) is generated automatically!",
    },
    {
      patterns: ["how to add room", "create room", "add a room", "new room", "add room"],
      answer: "To add a room to your shop:\n1. Go to 'My Shops' and select your shop\n2. Click 'Manage Rooms'\n3. Click 'Add Room'\n4. Enter room name, type (counter/doctor/service/consultation/other), description, max capacity (1-100), and operating hours\n5. A unique room code and QR code are generated automatically!",
    },
    {
      patterns: ["how to call next", "call next", "serve next", "next customer"],
      answer: "To call the next customer:\n1. Go to 'My Shops' → select your shop → 'Manage Rooms'\n2. Click 'View Queue' on the room\n3. Click 'Call Next' — this automatically selects the next person based on priority (VIP > Urgent > Normal)\n4. The customer receives a real-time notification that it's their turn!",
    },
    {
      patterns: ["manage queue", "queue management", "how to manage"],
      answer: "On the Queue Dashboard, you can:\n- 'Call Next' — serve the next customer in priority order\n- 'Complete' — mark a customer's service as done\n- 'No Show' — mark a customer who didn't show up\n- 'Clear Queue' — remove all waiting entries\n- View real-time queue status and customer details",
    },
    {
      patterns: ["shop categories", "what categories", "category list"],
      answer: "Available shop categories:\n- Restaurant\n- Retail\n- Services\n- Electronics\n- Grocery\n- Fashion\n- Healthcare\n- Beauty\n- Automotive\n- Other",
    },
    {
      patterns: ["room types", "what room types", "type of rooms"],
      answer: "Available room types:\n- Counter — for service counters\n- Doctor — for medical consultations\n- Service — for general services\n- Consultation — for advisory sessions\n- Other — for anything else",
    },
    {
      patterns: ["operating hours", "set hours", "business hours", "working hours"],
      answer: "You can set operating hours for each room when creating or editing it. Set a start time and end time (e.g., 09:00 to 17:00). Outside these hours, the queue for that room will be closed and customers won't be able to join.",
    },
    {
      patterns: ["delete shop", "remove shop", "delete room", "remove room"],
      answer: "To delete a shop or room:\n- For shops: Go to 'My Shops', find the shop, and click the delete button\n- For rooms: Go to 'Manage Rooms' for the shop, find the room, and click delete\n\nNote: Deleting a shop will also remove all its rooms and active queues.",
    },
  ],
};

// Match user message against FAQ patterns
const matchFAQ = (message, userRole) => {
  const msgLower = message.toLowerCase().trim();

  // Check general FAQs first (available to everyone)
  for (const faq of FAQ_DATABASE.general) {
    if (faq.patterns.some((p) => msgLower.includes(p))) {
      return faq.answer;
    }
  }

  // Check role-specific FAQs
  if (userRole === "owner") {
    for (const faq of FAQ_DATABASE.owner) {
      if (faq.patterns.some((p) => msgLower.includes(p))) {
        return faq.answer;
      }
    }
  }

  // Customer FAQs available to customers and unauthenticated users
  if (userRole !== "owner") {
    for (const faq of FAQ_DATABASE.customer) {
      if (faq.patterns.some((p) => msgLower.includes(p))) {
        return faq.answer;
      }
    }
  }

  // Also check the other role's FAQs as fallback (owner asking customer questions, etc.)
  const fallbackRole = userRole === "owner" ? "customer" : "owner";
  for (const faq of FAQ_DATABASE[fallbackRole] || []) {
    if (faq.patterns.some((p) => msgLower.includes(p))) {
      return faq.answer;
    }
  }

  return null; // No FAQ match — needs Groq API
};

// ─── Tool call executor ───
const executeToolCall = async (toolName, args, userId) => {
  try {
    switch (toolName) {
      case "get_my_queue_status": {
        if (!userId) {
          return { error: "User is not logged in. Please log in to check your queue status." };
        }
        const entries = await Queue.find({
          customerId: userId,
          status: { $in: ["waiting", "in_progress"] },
        })
          .populate({ path: "roomId", select: "name roomCode", populate: { path: "shopId", select: "name shopCode" } })
          .lean();

        if (!entries.length) {
          return { message: "You are not currently in any queue." };
        }

        // Calculate position for each entry
        const results = [];
        for (const e of entries) {
          const position = await Queue.countDocuments({
            roomId: e.roomId?._id || e.roomId,
            status: "waiting",
            joinedAt: { $lt: e.joinedAt },
          }) + 1;

          results.push({
            queueNumber: e.queueNumber,
            position,
            status: e.status,
            priority: e.priority,
            estimatedWaitTime: `${(position - 1) * 5} minutes`,
            joinedAt: e.joinedAt,
            room: e.roomId?.name || "Unknown",
            roomCode: e.roomId?.roomCode || "Unknown",
            shop: e.roomId?.shopId?.name || "Unknown",
          });
        }
        return results;
      }

      case "get_room_queue": {
        const { roomCode } = args;
        // Try finding by roomCode first, then by ID
        let room = await Room.findOne({ roomCode }).populate("shopId", "name shopCode address").lean();
        if (!room) {
          room = await Room.findById(roomCode).populate("shopId", "name shopCode address").lean().catch(() => null);
        }
        if (!room) {
          return { error: `Room "${roomCode}" not found.` };
        }

        const queueEntries = await Queue.find({
          roomId: room._id,
          status: { $in: ["waiting", "in_progress"] },
        })
          .sort({ priority: -1, joinedAt: 1 })
          .lean();

        return {
          room: room.name,
          roomCode: room.roomCode,
          shop: room.shopId?.name || "Unknown",
          address: room.shopId?.address || "Unknown",
          totalWaiting: queueEntries.filter((e) => e.status === "waiting").length,
          currentlyServing: queueEntries.filter((e) => e.status === "in_progress").length,
          estimatedWait: `${queueEntries.filter((e) => e.status === "waiting").length * 5} minutes`,
          maxCapacity: room.maxCapacity,
        };
      }

      case "get_room_details": {
        const room = await Room.findOne({ roomCode: args.roomCode })
          .populate("shopId", "name shopCode address category phone email")
          .lean();

        if (!room) {
          return { error: `Room "${args.roomCode}" not found.` };
        }

        const waitingCount = await Queue.countDocuments({
          roomId: room._id,
          status: "waiting",
        });

        return {
          name: room.name,
          roomCode: room.roomCode,
          type: room.roomType,
          description: room.description || "No description",
          maxCapacity: room.maxCapacity,
          operatingHours: room.operatingHours || "Not set",
          currentQueueCount: waitingCount,
          shop: {
            name: room.shopId?.name,
            shopCode: room.shopId?.shopCode,
            address: room.shopId?.address,
            category: room.shopId?.category,
            phone: room.shopId?.phone,
            email: room.shopId?.email,
          },
        };
      }

      case "get_shop_details": {
        const { identifier } = args;
        let shop = await Shop.findOne({
          $or: [{ shopCode: identifier }, { customId: identifier }],
        }).lean();

        if (!shop) {
          return { error: `Shop "${identifier}" not found.` };
        }

        const rooms = await Room.find({ shopId: shop._id }).select("name roomCode roomType").lean();

        return {
          name: shop.name,
          shopCode: shop.shopCode,
          customId: shop.customId || null,
          address: shop.address,
          category: shop.category,
          description: shop.description || "No description",
          phone: shop.phone || "Not provided",
          email: shop.email || "Not provided",
          rooms: rooms.map((r) => ({ name: r.name, roomCode: r.roomCode, type: r.roomType })),
        };
      }

      case "browse_rooms": {
        const { search, category, limit = 10 } = args;
        const query = {};

        const rooms = await Room.find(query)
          .populate({
            path: "shopId",
            select: "name shopCode address category",
            ...(category ? { match: { category } } : {}),
          })
          .limit(limit)
          .lean();

        let results = rooms.filter((r) => r.shopId); // filter out rooms where shop didn't match

        if (search) {
          const searchLower = search.toLowerCase();
          results = results.filter(
            (r) =>
              r.name.toLowerCase().includes(searchLower) ||
              (r.description && r.description.toLowerCase().includes(searchLower)) ||
              r.shopId.name.toLowerCase().includes(searchLower)
          );
        }

        if (!results.length) {
          return { message: "No rooms found matching your criteria." };
        }

        // Get queue counts for each room
        const roomIds = results.map((r) => r._id);
        const queueCounts = await Queue.aggregate([
          { $match: { roomId: { $in: roomIds }, status: "waiting" } },
          { $group: { _id: "$roomId", count: { $sum: 1 } } },
        ]);
        const countMap = Object.fromEntries(queueCounts.map((q) => [q._id.toString(), q.count]));

        return results.map((r) => ({
          name: r.name,
          roomCode: r.roomCode,
          type: r.roomType,
          shop: r.shopId.name,
          address: r.shopId.address,
          category: r.shopId.category,
          waitingCount: countMap[r._id.toString()] || 0,
        }));
      }

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    console.error(`Tool execution error (${toolName}):`, err);
    return { error: "Failed to fetch data. Please try again." };
  }
};

export const chat = async (req, res) => {
  try {
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "Messages array is required" });
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return res.status(400).json({ message: "Each message must have role and content" });
      }
      if (!["user", "assistant"].includes(msg.role)) {
        return res.status(400).json({ message: "Message role must be 'user' or 'assistant'" });
      }
    }

    const trimmedMessages = messages.slice(-20);

    const userContext = {
      userName: req.user?.name || context?.userName || null,
      userRole: req.user?.role || null,
      isAuthenticated: !!req.user,
      currentPage: context?.currentPage || null,
    };

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Step 0: Check built-in FAQ first (no API call needed)
    const lastUserMsg = trimmedMessages[trimmedMessages.length - 1];
    if (lastUserMsg?.role === "user") {
      const faqAnswer = matchFAQ(lastUserMsg.content, userContext.userRole);
      if (faqAnswer) {
        res.write(`data: ${JSON.stringify({ content: faqAnswer })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }
    }

    // Step 1: Call Groq with tools to detect if it needs real data
    const initialResponse = await chatCompletionWithTools(trimmedMessages, userContext);
    const assistantMessage = initialResponse.choices[0].message;

    // Step 2: If the model wants to call tools, execute them
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Build the conversation with tool results
      const toolMessages = [
        ...trimmedMessages,
        assistantMessage, // The assistant's message with tool_calls
      ];

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments || "{}");
        const result = await executeToolCall(toolCall.function.name, args, req.user?.id);

        toolMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      // Step 3: Stream the final response with tool results in context
      const stream = await streamChatCompletion(toolMessages, userContext);
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
    } else {
      // No tool calls — just stream the text response directly
      // Since we already have the full response, send it as one chunk
      const content = assistantMessage.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("Chat error:", err);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "An error occurred" })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ message: "Chat service error" });
    }
  }
};
