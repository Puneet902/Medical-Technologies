/**
 * Knapsack-based maintenance scheduler.
 *
 * Each vehicle has a maintenance cost and priority score.
 * Given a depot's capacity, this selects the optimal set of vehicles
 * to service without exceeding that capacity.
 *
 * @param {Array} vehicles  - Array of { id, maintenanceCost, priorityScore }
 * @param {number} capacity - Maximum total maintenance cost a depot can handle
 * @returns {Array} Selected vehicles that maximise total priority within capacity
 */
function buildMaintenanceSchedule(vehicles, capacity) {
  const n = vehicles.length;

  // dp[i][w] = max priority achievable using first i vehicles with capacity w
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const vehicle = vehicles[i - 1];
    const cost = vehicle.maintenanceCost;
    const score = vehicle.priorityScore;

    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i - 1][w];
      if (cost <= w) {
        dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - cost] + score);
      }
    }
  }

  // Trace back to find which vehicles were selected
  const selected = [];
  let remainingCapacity = capacity;

  for (let i = n; i > 0; i--) {
    if (dp[i][remainingCapacity] !== dp[i - 1][remainingCapacity]) {
      selected.push(vehicles[i - 1]);
      remainingCapacity -= vehicles[i - 1].maintenanceCost;
    }
  }

  return {
    scheduledVehicles: selected,
    totalPriority: dp[n][capacity],
  };
}

module.exports = { buildMaintenanceSchedule };
