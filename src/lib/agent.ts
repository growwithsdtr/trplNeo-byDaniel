import type { HotelGraph, LiveLocalUpdate } from "@/lib/types";

export interface TravelerAgentResult {
  matchedHotelId: string;
  hotelName: string;
  matchingCriteria: string[];
  latestUpdatesUsed: LiveLocalUpdate[];
  availableRoom: {
    roomType: string;
    date: string;
    remaining: number;
  };
  rateYen: number;
  policyNotes: string[];
  directBookingRationale: string;
  source: "Hotel Knowledge Graph";
  selectionReason: string;
  assistantMessage?: string;
  missingInformation?: string[];
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

const semanticUpdateGroups = [
  ["surf", "surfing", "surfboard", "surfboards", "wakeboard", "wakeboards", "water gear", "lake"],
  ["jazz", "concert"],
  ["shamisen", "samizen", "shamizen", "concert"],
  ["culinary", "gourmet", "washoku", "french", "chinese cuisine", "food lovers"],
  ["wi-fi", "wifi", "hdmi", "business", "presentation"],
  ["onsen", "kaiseki", "ryokan", "private bath"],
  ["pet", "pets", "dog", "dogs"],
];

function hotelSearchText(hotel: HotelGraph) {
  return [
    hotel.name,
    hotel.type,
    hotel.shortDescription,
    hotel.amenities.join(" "),
    hotel.mealPlans.join(" "),
    hotel.onsenBathSauna.join(" "),
    hotel.petPolicyDetails.join(" "),
    hotel.businessTravelerAmenities.join(" "),
    hotel.roomTechAmenities.join(" "),
    hotel.localActivities.map((activity) => `${activity.name} ${activity.notes}`).join(" "),
    hotel.liveLocalUpdates
      .map((update) => `${update.category} ${update.title} ${update.travelerFacingSummary}`)
      .join(" "),
    hotel.promotions.join(" "),
    hotel.policies.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function approvedUpdateText(update: LiveLocalUpdate) {
  return [
    update.category,
    update.title,
    update.travelerFacingSummary,
    update.affectedRoomTypes.join(" "),
    update.affectedOffer ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function liveLocalUpdateMatchScore(query: string, hotel: HotelGraph) {
  const approvedUpdates = hotel.liveLocalUpdates.filter(
    (update) => update.status === "approved"
  );
  let score = 0;

  for (const update of approvedUpdates) {
    const updateText = approvedUpdateText(update);
    const queryTerms = query
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length > 3);
    if (queryTerms.some((term) => updateText.includes(term))) {
      score += 28;
    }
    for (const group of semanticUpdateGroups) {
      if (hasAny(query, group) && hasAny(updateText, group)) {
        score += 60;
      }
    }
  }

  return score;
}

function scoreHotel(query: string, hotel: HotelGraph) {
  const text = hotelSearchText(hotel);

  const queryTerms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);

  let score = queryTerms.reduce(
    (total, term) => total + (text.includes(term) ? 1 : 0),
    0
  );
  score += liveLocalUpdateMatchScore(query, hotel);

  const wantsBusiness = hasAny(query, [
    "business",
    "presentation",
    "wi-fi",
    "wifi",
    "hdmi",
    "desk",
    "workspace",
    "late check-in",
    "coin laundry",
    "laundry",
    "breakfast",
  ]);
  const wantsPet = hasAny(query, ["dog", "pet", "pets"]);
  const wantsFamily = hasAny(query, [
    "kid",
    "kids",
    "child",
    "children",
    "family",
    "golden week",
  ]);
  const wantsConcert = hasAny(query, ["concert", "shamisen", "samizen", "shamizen", "jazz"]);
  const wantsRyokan = hasAny(query, ["ryokan", "onsen", "local food", "kaiseki"]);
  const wantsActivity = hasAny(query, [
    "activity",
    "activities",
    "lake chuzenji",
    "cycling",
    "hiking",
    "surf",
    "surfing",
    "surfboard",
    "wakeboard",
    "water gear",
  ]);

  if (wantsBusiness) {
    if (hotel.type.includes("business")) score += 18;
    if (text.includes("180 mbps")) score += 4;
    if (text.includes("hdmi")) score += 4;
    if (text.includes("workspace") || text.includes("desk")) score += 4;
    if (text.includes("late check-in")) score += 3;
    if (text.includes("coin laundry")) score += 3;
    if (text.includes("breakfast")) score += 3;
  }
  if (wantsPet && (text.includes("pet-friendly") || text.includes("dog"))) {
    score += 18;
  }
  if (wantsFamily && (text.includes("family") || text.includes("children"))) {
    score += 10;
  }
  if (wantsActivity && (text.includes("lake cycling") || text.includes("hiking") || text.includes("lake chuzenji"))) {
    score += 16;
  }
  if (wantsConcert) {
    const approvedConcert = hotel.liveLocalUpdates.some((update) => {
      const updateText = approvedUpdateText(update);
      return update.status === "approved" && hasAny(updateText, ["concert", "shamisen", "jazz"]);
    });
    if (approvedConcert) score += 42;
  }
  if (query.includes("ryokan") && hotel.type.includes("ryokan")) score += 6;
  if (wantsRyokan && text.includes("onsen")) score += 14;
  if ((query.includes("lake") || query.includes("cycling")) && text.includes("cycling")) {
    score += 9;
  }

  return score;
}

function relevantUpdates(query: string, hotel: HotelGraph) {
  const q = query.toLowerCase();
  const wantsConcert = hasAny(q, ["concert", "shamisen", "samizen", "shamizen", "jazz"]);
  return hotel.liveLocalUpdates
    .filter((update) => update.status === "approved")
    .filter((update) => {
      const updateText = approvedUpdateText(update);
      if (wantsConcert && hasAny(updateText, ["concert", "shamisen", "jazz"])) return true;
      if (
        semanticUpdateGroups.some(
          (group) => hasAny(q, group) && hasAny(updateText, group)
        )
      ) {
        return true;
      }
      return q
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length > 3)
        .some((term) => updateText.includes(term));
    })
    .slice(0, 3);
}

function chooseRoom(query: string, hotel: HotelGraph) {
  const q = query.toLowerCase();
  if (hasAny(q, ["kid", "kids", "child", "children", "family", "golden week"])) {
    const familyRoom = hotel.roomTypes.find((room) =>
      room.name.toLowerCase().includes("family")
    );
    if (familyRoom) return familyRoom;
  }
  if (hasAny(q, ["dog", "pet", "pets"])) {
    const petRoom = hotel.roomTypes.find((room) =>
      room.name.toLowerCase().includes("dog")
    );
    if (petRoom) return petRoom;
  }
  if (hasAny(q, ["two separate beds", "twin beds"])) {
    const twinRoom = hotel.roomTypes.find((room) =>
      room.name.toLowerCase().includes("twin")
    );
    if (twinRoom) return twinRoom;
  }
  if (hasAny(q, ["wife", "husband", "partner", "two", "one big bed"])) {
    const twinOrSuite = hotel.roomTypes.find((room) =>
      hasAny(room.name.toLowerCase(), ["twin", "suite", "washitsu"])
    );
    if (twinOrSuite) return twinOrSuite;
  }
  return (
    hotel.roomTypes.find((candidate) =>
      candidate.availability.some((slot) => slot.available)
    ) ?? hotel.roomTypes[0]
  );
}

function selectionReasonFor(query: string, hotel: HotelGraph, updates: LiveLocalUpdate[]) {
  const q = query.toLowerCase();
  if (updates.length > 0) {
    return `${hotel.name} was selected because an approved live/local update directly matches the traveler intent: ${updates[0].title}.`;
  }
  if (hasAny(q, ["business", "presentation", "wifi", "wi-fi", "hdmi"])) {
    return `${hotel.name} was selected because the graph includes business-traveler fit signals such as verified Wi-Fi, HDMI, workspace, late check-in, laundry, and breakfast.`;
  }
  if (hasAny(q, ["activity", "lake chuzenji", "golden week"])) {
    return `${hotel.name} was selected because the graph includes activity, family, and Lake Chuzenji fit signals.`;
  }
  if (hasAny(q, ["pet", "dog", "pets", "kids", "children", "family"])) {
    return `${hotel.name} was selected because the graph includes pet and family policies that best match the traveler intent.`;
  }
  if (hasAny(q, ["onsen", "ryokan", "kaiseki", "local food"])) {
    return `${hotel.name} was selected because the graph includes ryokan, onsen, and local-food signals.`;
  }
  return `${hotel.name} was selected as the best match from the provided Hotel Knowledge Graph.`;
}

function matchingCriteriaFor(query: string, hotel: HotelGraph, updates: LiveLocalUpdate[]) {
  const q = query.toLowerCase();
  if (updates.length > 0) {
    return [hotel.type, "Approved live/local update", updates[0].title];
  }
  if (hasAny(q, ["business", "presentation", "wifi", "wi-fi", "hdmi"])) {
    return [
      hotel.type,
      "Verified high-speed Wi-Fi",
      "HDMI-accessible TV",
      "Workspace desk",
      "Late check-in, coin laundry, and breakfast",
    ];
  }
  if (hasAny(q, ["concert", "shamisen", "samizen", "shamizen"]) && updates.length > 0) {
    return [hotel.type, "Approved live/local event update", updates[0].title];
  }
  if (hasAny(q, ["activity", "lake chuzenji", "golden week"])) {
    return [
      hotel.type,
      ...hotel.localActivities.slice(0, 2).map((activity) => activity.name),
      ...hotel.policies.slice(0, 1),
    ];
  }
  if (hasAny(q, ["pet", "dog", "pets", "kids", "children", "family"])) {
    return [hotel.type, ...hotel.petPolicyDetails.slice(0, 2), ...hotel.policies.slice(0, 1)];
  }
  return [
    hotel.type,
    ...hotel.amenities.slice(0, 3),
    ...hotel.localActivities.slice(0, 1).map((activity) => activity.name),
  ];
}

export function runTravelerAgent(
  query: string,
  hotels: HotelGraph[]
): TravelerAgentResult {
  const normalizedQuery = query.toLowerCase();
  const matchedHotel = [...hotels].sort(
    (a, b) => scoreHotel(normalizedQuery, b) - scoreHotel(normalizedQuery, a)
  )[0];
  const updates = relevantUpdates(normalizedQuery, matchedHotel);
  const room = chooseRoom(normalizedQuery, matchedHotel);
  const availability = room.availability.find((slot) => slot.available) ?? room.availability[0];

  return {
    matchedHotelId: matchedHotel.id,
    hotelName: matchedHotel.name,
    matchingCriteria: matchingCriteriaFor(normalizedQuery, matchedHotel, updates),
    latestUpdatesUsed: updates,
    availableRoom: {
      roomType: room.name,
      date: availability.date,
      remaining: availability.remaining,
    },
    rateYen: room.rateYen,
    policyNotes: matchedHotel.policies.slice(0, 3),
    directBookingRationale:
      "Direct booking is useful here because the hotel-owned graph can confirm room availability, current local details, and policy notes without relying on OTA-controlled summaries.",
    source: "Hotel Knowledge Graph",
    selectionReason: selectionReasonFor(normalizedQuery, matchedHotel, updates),
  };
}
