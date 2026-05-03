export type PlantSpecies = 'glowfern' | 'moonlily' | 'starblossom' | 'crystalvine' | 'emberbloom';

export type PlantStage = 0 | 1 | 2 | 3 | 4; // 0=seed, 1=sprout, 2=sapling, 3=young, 4=mature
export type PlantStatus = 'growing' | 'mature' | 'withered';

export interface Plant {
	id: string;
	species: PlantSpecies;
	stage: PlantStage;
	status: PlantStatus;
	plantedAt: number;
	completedAt?: number;
	note?: string;
}

export const SESSION_MS = 60 * 60 * 1000; // 1 hour
export const STAGE_MS = 15 * 60 * 1000; // 15 minutes
