import { SESSION_MS, STAGE_MS, type Plant, type PlantSpecies, type PlantStage } from './types';

const SPECIES: PlantSpecies[] = ['glowfern', 'moonlily', 'starblossom', 'crystalvine', 'emberbloom'];

const STORAGE_VERSION = 1;
const SAVE_DEBOUNCE_MS = 600;

export interface PersistedState {
	v: number;
	garden: Plant[];
	current: Plant | null;
	awaitingResult: boolean;
	noteDraft: string;
}

function pickSpecies(): PlantSpecies {
	return SPECIES[Math.floor(Math.random() * SPECIES.length)];
}

function uid() {
	return Math.random().toString(36).slice(2, 10);
}

class GroveStore {
	garden = $state<Plant[]>([]);
	current = $state<Plant | null>(null);
	now = $state<number>(Date.now());
	awaitingResult = $state<boolean>(false);
	noteDraft = $state<string>('');

	hydrated = $state<boolean>(false);
	saving = $state<boolean>(false);
	saveError = $state<string | null>(null);

	private tickHandle: number | null = null;
	private saveTimer: number | null = null;

	/** Seed store from server-loaded persisted state (idempotent). */
	hydrate(state: PersistedState | null) {
		if (state && state.v === STORAGE_VERSION) {
			this.garden = state.garden ?? [];
			this.current = state.current ?? null;
			this.awaitingResult = state.awaitingResult ?? false;
			this.noteDraft = state.noteDraft ?? '';
			if (this.current && !this.awaitingResult) {
				this.now = Date.now();
				if (this.elapsed >= SESSION_MS) {
					this.awaitingResult = true;
				} else {
					this.startTicking();
				}
			}
		}
		this.hydrated = true;
	}

	private scheduleSave() {
		if (!this.hydrated) return; // never save before we've loaded
		if (typeof window === 'undefined') return;
		if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
		this.saveTimer = window.setTimeout(() => {
			this.saveTimer = null;
			void this.flushSave();
		}, SAVE_DEBOUNCE_MS);
	}

	private async flushSave() {
		const payload: PersistedState = {
			v: STORAGE_VERSION,
			garden: this.garden,
			current: this.current,
			awaitingResult: this.awaitingResult,
			noteDraft: this.noteDraft
		};
		this.saving = true;
		this.saveError = null;
		try {
			const res = await fetch('/api/grove', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) throw new Error(`save failed: ${res.status}`);
		} catch (e) {
			this.saveError = e instanceof Error ? e.message : 'save failed';
		} finally {
			this.saving = false;
		}
	}

	startSession() {
		if (this.current || this.awaitingResult) return;
		const plant: Plant = {
			id: uid(),
			species: pickSpecies(),
			stage: 0,
			status: 'growing',
			plantedAt: Date.now()
		};
		this.current = plant;
		this.now = Date.now();
		this.startTicking();
		this.scheduleSave();
	}

	cancelSession() {
		this.current = null;
		this.awaitingResult = false;
		this.noteDraft = '';
		this.stopTicking();
		this.scheduleSave();
	}

	finishSuccess() {
		if (!this.current) return;
		const completed: Plant = {
			...this.current,
			stage: 4,
			status: 'mature',
			completedAt: Date.now(),
			note: this.noteDraft.trim() || undefined
		};
		this.garden = [...this.garden, completed];
		this.current = null;
		this.awaitingResult = false;
		this.noteDraft = '';
		this.stopTicking();
		this.scheduleSave();
	}

	finishFailure() {
		if (!this.current) return;
		const withered: Plant = {
			...this.current,
			status: 'withered',
			completedAt: Date.now(),
			note: this.noteDraft.trim() || undefined
		};
		this.garden = [...this.garden, withered];
		this.current = null;
		this.awaitingResult = false;
		this.noteDraft = '';
		this.stopTicking();
		this.scheduleSave();
	}

	get elapsed(): number {
		if (!this.current) return 0;
		return Math.min(this.now - this.current.plantedAt, SESSION_MS);
	}

	get remaining(): number {
		return Math.max(0, SESSION_MS - this.elapsed);
	}

	get currentStage(): PlantStage {
		const e = this.elapsed;
		if (e >= SESSION_MS) return 4;
		const s = Math.floor(e / STAGE_MS);
		return Math.min(3, Math.max(0, s)) as PlantStage;
	}

	private startTicking() {
		this.stopTicking();
		this.tickHandle = window.setInterval(() => {
			this.now = Date.now();
			if (this.current && !this.awaitingResult && this.elapsed >= SESSION_MS) {
				this.awaitingResult = true;
				this.stopTicking();
				this.scheduleSave();
			}
		}, 250);
	}

	private stopTicking() {
		if (this.tickHandle !== null) {
			window.clearInterval(this.tickHandle);
			this.tickHandle = null;
		}
	}
}

export const grove = new GroveStore();
