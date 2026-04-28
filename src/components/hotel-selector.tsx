import type { HotelGraph } from "@/lib/types";

interface HotelSelectorProps {
  hotels: HotelGraph[];
  selectedHotelId: string;
  onChange: (hotelId: string) => void;
}

export function HotelSelector({
  hotels,
  selectedHotelId,
  onChange,
}: HotelSelectorProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
      Hotel
      <select
        value={selectedHotelId}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm transition hover:border-zinc-300 focus:border-blue-600"
      >
        {hotels.map((hotel) => (
          <option key={hotel.id} value={hotel.id}>
            {hotel.name}
          </option>
        ))}
      </select>
    </label>
  );
}
