import type { Scene } from './sources';

export type SceneKind = 'builtin' | 'custom';

function sceneSlug(name: string) {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'scene';
}

export function normalizeScenes(scenes: Scene[], kind: SceneKind): Scene[] {
    const used = new Set<string>();
    return scenes.map(scene => {
        const base = scene.id || `${kind}:${sceneSlug(scene.name)}`;
        let id = base;
        for (let suffix = 2; used.has(id); suffix++) id = `${base}-${suffix}`;
        used.add(id);
        return scene.id === id ? scene : { ...scene, id };
    });
}

export function updateSceneById(scenes: Scene[], id: string, update: (scene: Scene) => Scene): Scene[] {
    const index = scenes.findIndex(scene => scene.id === id);
    if (index < 0) return scenes;
    const next = [...scenes];
    next[index] = update(scenes[index]);
    return next;
}

export function removeSceneById(scenes: Scene[], id: string): Scene[] {
    const index = scenes.findIndex(scene => scene.id === id);
    if (index < 0) return scenes;
    return [...scenes.slice(0, index), ...scenes.slice(index + 1)];
}

export function findSceneIndexById(scenes: Scene[], id?: string): number {
    if (!scenes.length) return -1;
    const index = scenes.findIndex(scene => scene.id === id);
    return index < 0 ? 0 : index;
}
