import Room from "../models/Room.js";
import Shop from "../models/Shop.js";
import Queue from "../models/Queue.js";

export const executeToolCall = async (toolName, args, userId) => {
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
        let room = await Room.findOne({ roomCode }).populate("shopId", "name shopCode address").lean();
        if (!room) {
          room = await Room.findById(roomCode).populate("shopId", "name shopCode address").lean().catch(() => null);
        }
        if (!room) return { error: `Room "${roomCode}" not found.` };

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

        if (!room) return { error: `Room "${args.roomCode}" not found.` };

        const waitingCount = await Queue.countDocuments({ roomId: room._id, status: "waiting" });

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
        const shop = await Shop.findOne({
          $or: [{ shopCode: identifier }, { customId: identifier }],
        }).lean();

        if (!shop) return { error: `Shop "${identifier}" not found.` };

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
        const rooms = await Room.find({})
          .populate({
            path: "shopId",
            select: "name shopCode address category",
            ...(category ? { match: { category } } : {}),
          })
          .limit(limit)
          .lean();

        let results = rooms.filter((r) => r.shopId);

        if (search) {
          const searchLower = search.toLowerCase();
          results = results.filter(
            (r) =>
              r.name.toLowerCase().includes(searchLower) ||
              (r.description && r.description.toLowerCase().includes(searchLower)) ||
              r.shopId.name.toLowerCase().includes(searchLower)
          );
        }

        if (!results.length) return { message: "No rooms found matching your criteria." };

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
