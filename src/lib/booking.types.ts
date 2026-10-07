export type BookingBusiness = {
  name: string;
  tagline: string;
  address_line: string;
  city: string;
  whatsapp_phone: string;
  instagram_url: string | null;
  maps_url: string | null;
  review_url: string | null;
  opening_hours_text: string;
  cancellation_policy: string;
  max_advance_days: number;
};

export type BookingService = {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
};

export type BookingBarber = {
  id: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
};

export type BookingContext = {
  business: BookingBusiness;
  services: BookingService[];
  barbers: BookingBarber[];
  barberServices: { barber_id: string; service_id: string }[];
};
