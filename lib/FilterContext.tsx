"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface FilterContextType {
  country: string;
  state: string;
  city: string;
  sector: string;
  setCountry: (country: string) => void;
  setState: (state: string) => void;
  setCity: (city: string) => void;
  setSector: (sector: string) => void;
  clearFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountryState] = useState("");
  const [state, setStateState] = useState("");
  const [city, setCityState] = useState("");
  const [sector, setSectorState] = useState("");

  // Load initial filters from localStorage if in browser
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCountryState(localStorage.getItem("global_filter_country") || "");
      setStateState(localStorage.getItem("global_filter_state") || "");
      setCityState(localStorage.getItem("global_filter_city") || "");
      setSectorState(localStorage.getItem("global_filter_sector") || "");
    }
  }, []);

  const setCountry = (val: string) => {
    setCountryState(val);
    if (typeof window !== "undefined") localStorage.setItem("global_filter_country", val);
    // Reset state and city when country changes
    setStateState("");
    setCityState("");
    if (typeof window !== "undefined") {
      localStorage.setItem("global_filter_state", "");
      localStorage.setItem("global_filter_city", "");
    }
  };

  const setState = (val: string) => {
    setStateState(val);
    if (typeof window !== "undefined") localStorage.setItem("global_filter_state", val);
    // Reset city when state changes
    setCityState("");
    if (typeof window !== "undefined") localStorage.setItem("global_filter_city", "");
  };

  const setCity = (val: string) => {
    setCityState(val);
    if (typeof window !== "undefined") localStorage.setItem("global_filter_city", val);
  };

  const setSector = (val: string) => {
    setSectorState(val);
    if (typeof window !== "undefined") localStorage.setItem("global_filter_sector", val);
  };

  const clearFilters = () => {
    setCountryState("");
    setStateState("");
    setCityState("");
    setSectorState("");
    if (typeof window !== "undefined") {
      localStorage.removeItem("global_filter_country");
      localStorage.removeItem("global_filter_state");
      localStorage.removeItem("global_filter_city");
      localStorage.removeItem("global_filter_sector");
    }
  };

  return (
    <FilterContext.Provider
      value={{
        country,
        state,
        city,
        sector,
        setCountry,
        setState,
        setCity,
        setSector,
        clearFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error("useFilters must be used within a FilterProvider");
  }
  return context;
}
