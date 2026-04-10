export const queryKeys = {
  vehicles: {
    mine: ['vehicles', 'mine'],
  },
  bookings: {
    mine: ['bookings', 'mine'],
  },
  admin: {
    stats: ['admin', 'stats'],
    bookingsAll: ['admin', 'bookings', 'all'],
    users: ['admin', 'users'],
    transactions: ['admin', 'transactions'],
    notifications: ['admin', 'notifications'],
  },
  tracking: {
    byVehicleId: (vehicleId) => ['tracking', 'vehicle', String(vehicleId || '')],
  },
};
