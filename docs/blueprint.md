# Project Blueprint

## Overview

This project is a modern, responsive email campaign manager built with Next.js and shadcn/ui. It provides a comprehensive suite of tools for creating, managing, and analyzing email campaigns.

## Core Features

- **Dashboard:** An at-a-glance overview of key metrics, including campaign performance and recipient engagement.
- **Campaigns:** A full-featured editor for creating and managing email campaigns, with real-time previews and template integration.
- **Recipients:** A robust system for managing recipient lists, with support for filtering, segmentation, and bulk actions.
- **Templates:** A library of pre-designed templates that can be easily customized to fit any brand.

## Design & Styling

- **Color Palette:** The application uses a modern, high-contrast color palette with a light and dark mode.
  - **Primary:** A vibrant blue used for interactive elements and highlights.
  - **Neutral:** A range of grays for backgrounds, borders, and text.
  - **Accent:** Supporting colors for status indicators and notifications.
- **Typography:** The application uses a clean, sans-serif font for readability and a modern aesthetic.
- **Iconography:** The interface relies on the `lucide-react` library for a consistent and intuitive set of icons.

## Current Plan

- **Objective:** Re-implement the application's sidebar using the `shadcn/ui` sidebar component to ensure a consistent and themeable design.
- **Steps:**
  1. Install the `shadcn/ui` sidebar component.
  2. Re-create the `V2Sidebar` component using the correct `shadcn/ui` structure and components.
  3. Ensure the new sidebar is a pixel-perfect match to the provided design, including icons, layout, and active states.
  4. Integrate the updated sidebar into the main application layout, replacing the old implementation.
  5. Verify that the application builds successfully and that there are no console errors.
