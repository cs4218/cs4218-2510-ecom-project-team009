import React from "react";
import { Routes } from "react-router-dom";
import { renderWithProviders } from "./renderWithProviders";

/**
 * Renders a tree of routes within the real provider stack.
 * Accepts JSX children representing <Route> elements.
 */
export const renderTopDown = (routes, options) =>
  renderWithProviders(<Routes>{routes}</Routes>, options);
