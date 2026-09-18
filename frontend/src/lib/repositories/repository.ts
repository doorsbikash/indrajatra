import type { FestivalData } from "../types";
import { seedData } from "../../content/seed/data";

export type FestivalRepository = {
  getData(): Promise<FestivalData>;
};

export const SeedRepository: FestivalRepository = {
  async getData() {
    return seedData;
  }
};

export const ApiRepository: FestivalRepository = {
  async getData() {
    const response = await fetch("/api/public-data", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Unable to load festival data");
    return response.json() as Promise<FestivalData>;
  }
};

export function getRepository(): FestivalRepository {
  return import.meta.env.VITE_DATA_PROVIDER === "api" ? ApiRepository : SeedRepository;
}
