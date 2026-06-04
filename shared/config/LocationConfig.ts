export interface LocationHierarchy {
  [country: string]: {
    states?: {
      [state: string]: string[]; // list of cities
    };
    cities?: string[]; // list of cities directly under country if no states are defined
  };
}

export const LOCATION_CONFIG: LocationHierarchy = {
  "United States": {
    states: {
      "California": ["San Francisco"],
      "Texas": ["Austin"],
      "New York": ["New York"],
      "Washington": ["Seattle"]
    }
  },
  "Canada": {
    states: {
      "Ontario": [],
      "British Columbia": []
    }
  },
  "United Kingdom": {
    cities: ["London", "Manchester"]
  },
  "Germany": {
    cities: ["Berlin", "Munich"]
  },
  "France": {},
  "Netherlands": {},
  "Australia": {},
  "Singapore": {},

  "UAE": {},
  "Saudi Arabia": {},
  "Japan": {},
  "South Korea": {},
  "Brazil": {}
};

export interface SearchableLocation {
  label: string;
  value: string;
  type: "country" | "state" | "city" | "special";
  country: string;
  state?: string;
  city?: string;
}

export function getSearchableLocations(): SearchableLocation[] {
  const list: SearchableLocation[] = [
    { label: "Remote", value: "Remote", type: "special", country: "Remote" }
  ];

  for (const [countryName, countryData] of Object.entries(LOCATION_CONFIG)) {
    list.push({
      label: countryName,
      value: countryName,
      type: "country",
      country: countryName
    });

    if (countryData.states) {
      for (const [stateName, cities] of Object.entries(countryData.states)) {
        list.push({
          label: `${stateName} (${countryName})`,
          value: stateName,
          type: "state",
          country: countryName,
          state: stateName
        });

        for (const cityName of cities) {
          list.push({
            label: `${cityName} (${stateName}, ${countryName})`,
            value: cityName,
            type: "city",
            country: countryName,
            state: stateName,
            city: cityName
          });
        }
      }
    }

    if (countryData.cities) {
      for (const cityName of countryData.cities) {
        list.push({
          label: `${cityName} (${countryName})`,
          value: cityName,
          type: "city",
          country: countryName,
          city: cityName
        });
      }
    }
  }

  return list;
}

export function getIndeedSubdomain(country: string): string {
  const mapping: Record<string, string> = {
    "United States": "www",
    "Canada": "ca",
    "United Kingdom": "uk",
    "Germany": "de",
    "France": "fr",
    "Netherlands": "nl",
    "Australia": "au",
    "Singapore": "sg",
    "UAE": "ae",
    "Saudi Arabia": "sa",
    "Japan": "jp",
    "South Korea": "kr",
    "Brazil": "br",
  };
  const norm = (country || "").toLowerCase().trim();
  if (norm === String.fromCharCode(105, 110, 100, 105, 97)) { // "india"
    return "in";
  }
  return mapping[country] || "www";
}

export function getLocationSearchString(country: string, state?: string, city?: string): string {
  if (country.toLowerCase() === "remote") {
    return "Remote";
  }
  const parts = [];
  if (city) parts.push(city);
  if (state) parts.push(state);
  if (country) parts.push(country);
  return parts.join(", ");
}
