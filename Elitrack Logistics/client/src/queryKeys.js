export const queryKeys = {
  vehicles: {
    mine: ['vehicles', 'mine'],
  },
  bookings: {
    mine: ['bookings', 'mine'],
  },
  tracking: {
    byVehicleId: (vehicleId) => ['tracking', 'vehicle', String(vehicleId || '')],
  },
};
