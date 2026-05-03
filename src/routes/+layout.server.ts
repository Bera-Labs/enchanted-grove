import { kv } from '@vercel/kv';
import type { LayoutServerLoad } from './$types';
import type { PersistedState } from '$lib/store.svelte';

const KEY = 'enchanted-grove:state:v1';

export const load: LayoutServerLoad = async () => {
	try {
		const state = (await kv.get<PersistedState>(KEY)) ?? null;
		return { state };
	} catch (e) {
		// During local dev without KV env vars, this will throw — return null so the app still works.
		console.warn('KV unavailable, starting with empty state:', e);
		return { state: null };
	}
};
