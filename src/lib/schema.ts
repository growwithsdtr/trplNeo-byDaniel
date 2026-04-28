import type { HotelGraph } from "@/lib/types";

export function buildHotelJsonLd(hotel: HotelGraph) {
  return {
    "@context": "https://schema.org",
    "@type": ["Hotel", "LodgingBusiness"],
    "@id": `https://example.com/triplaNeoByDaniel/hotels/${hotel.id}`,
    name: hotel.name,
    description: hotel.shortDescription,
    address: {
      "@type": "PostalAddress",
      streetAddress: hotel.address,
      addressCountry: "JP",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: hotel.geo.latitude,
      longitude: hotel.geo.longitude,
    },
    checkinTime: hotel.checkinTime,
    checkoutTime: hotel.checkoutTime,
    numberOfRooms: hotel.numberOfRooms,
    availableLanguage: hotel.languages,
    starRating: {
      "@type": "Rating",
      ratingValue: hotel.starRating,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: hotel.aggregateRating.ratingValue,
      reviewCount: hotel.aggregateRating.reviewCount,
    },
    amenityFeature: hotel.amenities.map((amenity) => ({
      "@type": "LocationFeatureSpecification",
      name: amenity,
      value: true,
    })),
    petsAllowed: hotel.petPolicyDetails.some((policy) =>
      policy.toLowerCase().includes("dog")
    ),
    containsPlace: hotel.roomTypes.map((room) => ({
      "@type": "HotelRoom",
      name: room.name,
      description: room.description,
      occupancy: room.capacity,
      amenityFeature: room.amenities.map((amenity) => ({
        "@type": "LocationFeatureSpecification",
        name: amenity,
        value: true,
      })),
    })),
    makesOffer: hotel.offers.map((offer) => ({
      "@type": "Offer",
      name: offer.name,
      price: offer.priceYen,
      priceCurrency: "JPY",
      validFrom: offer.validFrom,
      validThrough: offer.validThrough,
      itemOffered: {
        "@type": "Accommodation",
        name: offer.roomType,
      },
      description: offer.includes.join(", "),
    })),
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "triplaNeo live/local updates",
        value: hotel.liveLocalUpdates
          .filter((update) => update.status === "approved")
          .map((update) => update.travelerFacingSummary)
          .join(" | "),
      },
      {
        "@type": "PropertyValue",
        name: "triplaNeo simulated enrichment sources",
        value: hotel.simulatedTriplaSources.join(", "),
      },
      {
        "@type": "PropertyValue",
        name: "lastVerifiedAt",
        value: hotel.lastVerifiedAt,
      },
    ],
  };
}
