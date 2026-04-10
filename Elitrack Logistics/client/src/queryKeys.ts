type TrackingVehicleId = number | string | null | undefined;

export const queryKeys = {
  vehicles: {
    mine: ['vehicles', 'mine'] as const,
  },
  bookings: {
    mine: ['bookings', 'mine'] as const,
  },
  admin: {
    stats: ['admin', 'stats'] as const,
    bookingsAll: ['admin', 'bookings', 'all'] as const,
    users: ['admin', 'users'] as const,
    transactions: ['admin', 'transactions'] as const,
    notifications: ['admin', 'notifications'] as const,
  },
  tracking: {
    byVehicleId: (vehicleId: TrackingVehicleId) => ['tracking', 'vehicle', String(vehicleId || '')] as const,
  },
};
