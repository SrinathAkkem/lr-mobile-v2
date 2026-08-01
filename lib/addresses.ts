import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { api } from "./api";
import type { Address } from "../types";

const SELECTED_KEY = "rono_address_selected";
const isWeb = Platform.OS === "web";

type AddressType = "consigner" | "consignee";
type SelectedMap = Record<string, Partial<Record<AddressType, string>>>;

async function loadSelected(): Promise<SelectedMap> {
  try {
    const json = isWeb
      ? localStorage.getItem(SELECTED_KEY)
      : await SecureStore.getItemAsync(SELECTED_KEY);
    if (!json) return {};
    return JSON.parse(json) as SelectedMap;
  } catch {
    return {};
  }
}

async function saveSelected(map: SelectedMap): Promise<void> {
  const json = JSON.stringify(map);
  if (isWeb) {
    localStorage.setItem(SELECTED_KEY, json);
  } else {
    await SecureStore.setItemAsync(SELECTED_KEY, json);
  }
}

function assertSuccess<T>(res: { success: boolean; data?: T; error?: string }): T {
  if (!res.success || res.data === undefined) {
    throw new Error(res.error || "Address request failed");
  }
  return res.data;
}

export const addressBook = {
  list: async (
    _userId: string,
    type?: "consigner" | "consignee",
  ): Promise<Address[]> => {
    const res = await api.getAddresses(type);
    if (!res.success || !res.data) return [];
    return res.data;
  },

  create: async (
    _userId: string,
    data: Omit<Address, "id" | "userId" | "createdAt">
  ): Promise<Address> => {
    const res = await api.createAddress(data);
    return assertSuccess(res);
  },

  update: async (
    id: string,
    data: Partial<Omit<Address, "id" | "userId" | "createdAt">>
  ): Promise<Address | null> => {
    const res = await api.updateAddress(id, data);
    if (!res.success || !res.data) return null;
    return res.data;
  },

  delete: async (id: string): Promise<boolean> => {
    const res = await api.deleteAddress(id);
    return res.success;
  },

  search: async (_userId: string, query: string): Promise<Address[]> => {
    const res = await api.searchAddresses(query);
    return assertSuccess(res);
  },

  getSelected: async (userId: string, type: AddressType): Promise<string | null> => {
    const map = await loadSelected();
    return map[userId]?.[type] ?? null;
  },

  setSelected: async (userId: string, type: AddressType, id: string): Promise<void> => {
    const map = await loadSelected();
    if (!map[userId]) map[userId] = {};
    if (!id) {
      delete map[userId][type];
    } else {
      map[userId][type] = id;
    }
    await saveSelected(map);
  },
};
