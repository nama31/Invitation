"use client";
import { createContext, useContext } from "react";

export const AdminTokenContext = createContext<string>("");

export function useAdminToken(): string {
  return useContext(AdminTokenContext);
}
