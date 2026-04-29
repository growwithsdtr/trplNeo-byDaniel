export type RiskLevel = "low" | "medium" | "high";

export type UpdateCategory =
  | "onsen_update"
  | "meal_plan"
  | "promotion"
  | "maintenance"
  | "local_event"
  | "pet_policy"
  | "room_tech"
  | "business_amenity"
  | "activity"
  | "policy_update"
  | "guest_insight"
  | "crm_insight"
  | "bot_insight"
  | "reputation_sensitive";

export type UpdateSource =
  | "operator_text"
  | "operator_voice"
  | "crm_simulated"
  | "bot_simulated"
  | "guest_comment_simulated";

export type UpdateStatus = "draft" | "approved" | "rejected";

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface RoomAvailability {
  date: string;
  available: boolean;
  remaining: number;
}

export interface RoomType {
  name: string;
  description: string;
  capacity: string;
  rateYen: number;
  currency: "JPY";
  amenities: string[];
  availability: RoomAvailability[];
}

export interface Offer {
  id: string;
  name: string;
  roomType: string;
  priceYen: number;
  validFrom: string;
  validThrough: string;
  includes: string[];
}

export interface Activity {
  name: string;
  schedule: string;
  priceYen?: number;
  notes: string;
  weatherDependent?: boolean;
}

export interface Insight {
  source: string;
  summary: string;
  lastVerifiedAt: string;
  confidence: number;
}

export interface LiveLocalUpdate {
  id: string;
  category: UpdateCategory;
  title: string;
  hotelId: string;
  affectedDates: string[];
  affectedRoomTypes: string[];
  affectedOffer?: string;
  eventTime?: string;
  bookingDeadline?: string;
  reputationSensitive?: boolean;
  sanitizedTravelerCopy?: boolean;
  priceImpact: string;
  travelerFacingSummary: string;
  internalNotes: string;
  languagesToGenerate: Array<"ja" | "en" | "ko" | "zh-TW">;
  preview: {
    ja: string;
    en: string;
    ko: string;
    zhTW: string;
  };
  source: UpdateSource;
  confidence: number;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  status: UpdateStatus;
  lastVerifiedAt: string;
  createdAt: string;
  approvedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  hotel: string;
  category: UpdateCategory;
  source: UpdateSource;
  riskLevel: RiskLevel;
  approvedBy: "operator";
  status: UpdateStatus;
}

export interface BookingHandoff {
  id: string;
  hotelId: string;
  hotelName: string;
  roomType: string;
  dates: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  adults?: number;
  children?: number;
  pets?: number;
  bedConfiguration?: string;
  rateYen?: number;
  handoffType?: "verified_booking_handoff" | "booking_inquiry_handoff";
  availabilityVerified?: boolean;
  rateNote?: string;
  liveLocalUpdateUsed: string;
  bookingUrl: string;
  createdAt: string;
}

export interface HotelGraph {
  id: string;
  name: string;
  type: string;
  location: string;
  address: string;
  geo: GeoCoordinates;
  shortDescription: string;
  languages: string[];
  checkinTime: string;
  checkoutTime: string;
  numberOfRooms: number;
  starRating: number;
  aggregateRating: {
    ratingValue: number;
    reviewCount: number;
  };
  amenities: string[];
  roomTypes: RoomType[];
  offers: Offer[];
  mealPlans: string[];
  onsenBathSauna: string[];
  petPolicyDetails: string[];
  businessTravelerAmenities: string[];
  roomTechAmenities: string[];
  localActivities: Activity[];
  nearbyAttractions: string[];
  policies: string[];
  liveLocalUpdates: LiveLocalUpdate[];
  promotions: string[];
  maintenanceNotices: string[];
  verifiedGuestInsights: Insight[];
  crmSegmentInsights: Insight[];
  botQuestionInsights: Insight[];
  simulatedTriplaSources: string[];
  lastVerifiedAt: string;
  source: string;
  confidence: number;
}

export interface DemoMetrics {
  aiDiscoveryReadiness: number;
  freshnessScore: number;
  directBookingHandoffCount: number;
  incrementalDirectGmvPotential: number;
  operatorTimeSavedMinutes: number;
}
