export interface CreateVehicleDto {
  category?: string;
  custom_category?: string;
  vehicle_name?: string;
  plate_number?: string;
  tracking_enabled?: boolean | number | string;
}