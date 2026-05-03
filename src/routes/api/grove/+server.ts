import { json, error } from '@sveltejs/kit';
import { kv } from '@vercel/kv';
import type { RequestHandler } from './$types';

const KEY = 'enchanted-grove:state:v1';

export const GET: RequestHandler = async () => {
	try {
		const state = await kv.get(KEY);
		return json(state ?? null);
	} catch (e) {
		console.error('KV GET failed:', e);
		throw error(500, 'failed to load state');
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'invalid JSON');
	}

	try {
		await kv.set(KEY, body);
		return json({ ok: true });
	} catch (e) {
		console.error('KV SET failed:', e);
		throw error(500, 'failed to save state');
	}
};
