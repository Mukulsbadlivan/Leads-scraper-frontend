"use client";

import React, { useState, useEffect, useRef } from "react";
import { useFilters } from "@/lib/FilterContext";
import { LOCATION_CONFIG as GEOGRAPHY, getSearchableLocations as getLocations, type SearchableLocation } from "@/shared/config/LocationConfig";
import { MapPin, Tag, Search, Globe, X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar() {
  const {
    country,
    state,
    city,
    sector,
    setCountry,
    setState,
    setCity,
    setSector,
    clearFilters,
  } = useFilters();

  const [mode, setMode] = useState<"cascade" | "quick">("cascade");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchableLocation[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Flat list of searchable locations for autocomplete
  const allLocations = getLocations();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update suggestions based on input query
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length >= 1) {
      const filtered = allLocations
        .filter((loc) => loc.label.toLowerCase().includes(val.toLowerCase()))
        .slice(0, 10);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (loc: SearchableLocation) => {
    if (loc.type === "special" && loc.value === "Remote") {
      setCountry("Remote");
    } else {
      setCountry(loc.country);
      if (loc.state) setState(loc.state);
      if (loc.city) setCity(loc.city);
    }
    setSearchQuery("");
    setShowSuggestions(false);
  };

  // Get options for cascades
  const countryOptions = Object.keys(GEOGRAPHY);
  const selectedCountryData = country ? GEOGRAPHY[country] : null;
  const stateOptions = selectedCountryData?.states ? Object.keys(selectedCountryData.states) : [];
  const cityOptions =
    country && state && selectedCountryData?.states?.[state]
      ? selectedCountryData.states[state]
      : selectedCountryData?.cities || [];

  const sectorsList = [
    "SaaS",
    "FinTech",
    "HealthTech",
    "EdTech",
    "AI",
    "Cybersecurity",
    "IT Services",
    "E-Commerce",
    "DeepTech",
    "CleanTech",
  ];

  const hasActiveFilters = country || state || city || sector;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/60 backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4">
        {/* Modes Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-secondary/80 p-0.5 border border-border/40">
            <button
              onClick={() => setMode("cascade")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === "cascade"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cascading Select
            </button>
            <button
              onClick={() => setMode("quick")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === "quick"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Quick Search
            </button>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-red-400 gap-1.5 h-8"
            >
              <X className="w-3.5 h-3.5" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Dynamic Filters Form */}
        <div className="flex flex-wrap items-center gap-3">
          {mode === "cascade" ? (
            <>
              {/* Country Select */}
              <div className="relative flex items-center">
                <Globe className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-8 pl-8 pr-3 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary transition"
                >
                  <option value="">All Countries</option>
                  <option value="Remote">Remote 🌐</option>
                  {countryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* State Select (Only if states exist for the selected country) */}
              {country && country !== "Remote" && stateOptions.length > 0 && (
                <div className="relative flex items-center animate-fade-in">
                  <MapPin className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="h-8 pl-8 pr-3 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary transition"
                  >
                    <option value="">All States</option>
                    {stateOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* City Select (Only if cities exist for the country/state) */}
              {country && country !== "Remote" && cityOptions.length > 0 && (
                <div className="relative flex items-center animate-fade-in">
                  <MapPin className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="h-8 pl-8 pr-3 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary transition"
                  >
                    <option value="">All Cities</option>
                    {cityOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            /* Quick Search Autocomplete Mode */
            <div className="relative flex items-center" ref={suggestionRef}>
              <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search country, state, city, Remote..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchQuery.trim().length >= 1) setShowSuggestions(true);
                }}
                className="w-56 h-8 pl-8 pr-3 rounded-lg border border-border bg-secondary/50 text-foreground text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary transition"
              />

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-9 left-0 w-64 rounded-lg border border-border bg-card shadow-xl overflow-hidden z-50">
                  <ul className="py-1 text-xs">
                    {suggestions.map((loc, idx) => (
                      <li key={idx}>
                        <button
                          type="button"
                          onClick={() => handleSelectSuggestion(loc)}
                          className="w-full px-3 py-2 text-left hover:bg-secondary flex items-center gap-2 text-foreground"
                        >
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{loc.label}</p>
                            <span className="text-[10px] text-muted-foreground uppercase">
                              {loc.type}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Sector Selector */}
          <div className="relative flex items-center">
            <Tag className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="h-8 pl-8 pr-3 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary transition"
            >
              <option value="">All Sectors</option>
              {sectorsList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Current Active Filter Badge */}
          {country && (
            <div className="hidden lg:flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-primary/20 bg-primary/10 text-primary text-xs font-medium select-none animate-fade-in">
              <Globe className="w-3 h-3" />
              <span>
                {country === "Remote"
                  ? "Remote 🌐"
                  : [city, state, country].filter(Boolean).join(" → ")}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
