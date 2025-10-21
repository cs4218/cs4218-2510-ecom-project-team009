import React from "react";
import { useState, useContext, createContext } from "react";

const SearchContext = createContext();
const SearchProvider = ({ children, initialValue = { keyword: "", results: [] } }) => {
  const [auth, setAuth] = useState(initialValue);

  return (
    <SearchContext.Provider value={[auth, setAuth]}>
      {children}
    </SearchContext.Provider>
  );
};

// custom hook
const useSearch = () => useContext(SearchContext);

export { useSearch, SearchProvider };