/**
 * Hybrid Wait Time Prediction Module
 *
 * Formula: T_pred = 0.7 × W_base + 0.3 × ML_adj
 *
 *   W_base  = queue_length × avg_service_time
 *   ML_adj  = W_base × correction_factor(λ, μ, n)
 *
 * Where:
 *   λ = arrival rate  (customers per minute, last 30 min window)
 *   μ = service rate  (customers per minute, last 50 completions)
 *   n = current queue length (waiting only)
 */

import Queue from "../models/Queue.js";

// ─── Constants ─────────────────────────────────────────────────────────────
const DEFAULT_SERVICE_TIME = 5;   // minutes — fallback when no history
const ARRIVAL_WINDOW_MS   = 30 * 60 * 1000; // 30-minute sliding window
const HISTORY_SAMPLE_SIZE = 50;             // completions to average over

// ─── 1. Average Service Time ────────────────────────────────────────────────
/**
 * Returns the average service time (in minutes) for a room,
 * computed from the last N completed queue entries where both
 * calledAt and completedAt are recorded.
 */
export const getAverageServiceTime = async (roomId) => {
  const completions = await Queue.find({
    roomId,
    status: { $in: ["completed", "no_show"] },
    calledAt: { $exists: true, $ne: null },
    completedAt: { $exists: true, $ne: null },
  })
    .sort({ completedAt: -1 })
    .limit(HISTORY_SAMPLE_SIZE)
    .select("calledAt completedAt")
    .lean();

  if (!completions.length) return DEFAULT_SERVICE_TIME;

  const totalMinutes = completions.reduce((sum, entry) => {
    const diff = (entry.completedAt - entry.calledAt) / 60000; // ms → minutes
    return sum + (diff > 0 ? diff : 0);
  }, 0);

  const avg = totalMinutes / completions.length;
  // Clamp to [1, 60] minutes to prevent nonsensical values
  return Math.min(Math.max(avg, 1), 60);
};

// ─── 2. Arrival Rate (λ) ────────────────────────────────────────────────────
/**
 * Returns arrival rate in customers per minute,
 * based on how many customers joined in the last 30 minutes.
 */
export const getArrivalRate = async (roomId) => {
  const windowStart = new Date(Date.now() - ARRIVAL_WINDOW_MS);

  const recentArrivals = await Queue.countDocuments({
    roomId,
    joinedAt: { $gte: windowStart },
  });

  const windowMinutes = ARRIVAL_WINDOW_MS / 60000; // 30
  return recentArrivals / windowMinutes; // λ customers/min
};

// ─── 3. Service Rate (μ) ────────────────────────────────────────────────────
/**
 * Returns service rate in customers per minute = 1 / avg_service_time.
 */
export const getServiceRate = async (roomId) => {
  const avgServiceTime = await getAverageServiceTime(roomId);
  return 1 / avgServiceTime; // μ customers/min
};

// ─── 4. Correction Factor ───────────────────────────────────────────────────
/**
 * Lightweight ML-style correction using queue dynamics:
 *
 *   - If λ > μ  (arrivals outpace service) → queues grow → add penalty
 *   - If λ < μ  (service faster than arrivals) → queues drain → reduce estimate
 *   - Longer queues amplify the correction (congestion effect)
 *
 * Returns a multiplier (e.g. 1.2 = 20% longer than base).
 */
const getCorrectionFactor = (arrivalRate, serviceRate, queueLength) => {
  if (serviceRate <= 0) return 1;

  // Traffic intensity ρ = λ/μ  (> 1 means overloaded)
  const rho = arrivalRate / serviceRate;

  // Congestion pressure: more people → more variability
  const congestionPressure = Math.log1p(queueLength) / 10; // log(n+1)/10

  // Base correction: rho - 1 is positive when overloaded, negative when idle
  const rhoDelta = rho - 1;

  // Final factor: clamp between 0.5× and 2.5× of base
  const factor = 1 + rhoDelta + congestionPressure;
  return Math.min(Math.max(factor, 0.5), 2.5);
};

// ─── 5. Predicted Wait Time ─────────────────────────────────────────────────
/**
 * Main prediction function.
 *
 * @param {ObjectId|string} roomId
 * @param {number} positionInQueue  — how many people are ahead (0 = next up)
 * @returns {number} predicted wait time in minutes (rounded to 1 decimal)
 */
export const predictWaitTime = async (roomId, positionInQueue) => {
  if (positionInQueue <= 0) return 0;

  const [avgServiceTime, arrivalRate, serviceRate] = await Promise.all([
    getAverageServiceTime(roomId),
    getArrivalRate(roomId),
    getServiceRate(roomId),
  ]);

  // W_base = n × avg_service_time
  const W_base = positionInQueue * avgServiceTime;

  // ML_adj = W_base × correction_factor
  const correctionFactor = getCorrectionFactor(arrivalRate, serviceRate, positionInQueue);
  const ML_adj = W_base * correctionFactor;

  // T_pred = 0.7 × W_base + 0.3 × ML_adj
  const T_pred = 0.7 * W_base + 0.3 * ML_adj;

  return Math.round(T_pred * 10) / 10; // 1 decimal place
};

// ─── 6. Bulk update all waiting entries for a room ──────────────────────────
/**
 * Recalculates and persists estimatedWaitTime for every waiting
 * customer in a room. Call this after any queue state change.
 *
 * @param {ObjectId|string} roomId
 * @param {object|null} io   — Socket.IO server instance (optional, for real-time push)
 */
export const refreshRoomWaitTimes = async (roomId, io = null) => {
  // Fetch all waiting entries sorted by priority then queue number
  // (mirrors callNextCustomer sort order)
  const waitingEntries = await Queue.find({
    roomId,
    status: "waiting",
  })
    .sort({ priority: -1, queueNumber: 1 })
    .select("_id queueNumber customerId")
    .lean();

  const updates = [];

  for (let i = 0; i < waitingEntries.length; i++) {
    const peopleAhead = i; // 0-indexed → position i has i people ahead
    const predicted = await predictWaitTime(roomId, peopleAhead);

    updates.push(
      Queue.findByIdAndUpdate(waitingEntries[i]._id, {
        estimatedWaitTime: predicted,
      })
    );
  }

  await Promise.all(updates);

  // Push updated predictions to the room's connected clients
  if (io) {
    io.to(`room-${roomId}`).emit("wait-times-updated", {
      roomId,
      entries: waitingEntries.map((e, i) => ({
        queueId: e._id,
        customerId: e.customerId,
        position: i + 1,
        estimatedWaitTime: updates[i] ? undefined : 0, // will be set after resolve
      })),
    });
  }
};
