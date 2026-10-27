import React, { useState, useEffect, useRef } from 'react';
import { Compass, LayoutDashboard, Headphones, Swords, BookOpen, Users, Dices, Settings, Search, ChevronDown, ChevronUp, ArrowUpRight, Play, Pause, Volume2, VolumeX, Plus, Grip, MoreHorizontal, CloudRain, Waves, Wind, Flame, Check, Save, X, Music, SlidersHorizontal, PanelTop, RotateCcw, Download, Trash2, Sun, Moon, PanelLeftClose, PanelLeft, SkipForward, Shield, Eye } from 'lucide-react';
import { type Character, seedCharacters } from './models';
import './style.css';
import './features.css';
import './theme.css';
import CampaignTools from './CampaignTools';
import Compendium from './Compendium';
import CombatTracker from './CombatTracker';
import SourcePicker from './SourcePicker';
import YouTubeMixer from './YouTubeMixer';
import { FreesoundModal } from './FreesoundModal';
import { getCachedAudioBlob, type FreesoundSound } from './freesound';
import { useSaved, writeSavedValue } from './storage';
import CloudSettings, { useCloudStatus } from './CloudSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Slider as ShadcnSlider } from '@/components/ui/slider';
import { bootSupabase } from './supabaseCloud';
import { saveAudio, readAudio } from './cloudFiles';
import { parseProviderSource, type Scene } from './sources';
import { seedEncounters, seedPages, uid, type Combatant, type Encounter, type WikiPage } from './models';
import { cleanBundledCampaignTemplates } from './campaigns';
const scenes: Scene[] = [{ name: 'The Drowned Coast', tag: 'EXPLORATION', art: 'coast', desc: 'Salt in the air. Something beneath the waves.', layers: [72, 36, 48, 0] }, { name: 'Whispers in the Pines', tag: 'EXPLORATION', art: 'forest', desc: 'An old path through an older forest.', layers: [12, 68, 0, 0] }, { name: 'The Last Hearth', tag: 'ROLEPLAY', art: 'tavern', desc: 'Warm fire. Cold ale. Familiar strangers.', layers: [0, 0, 0, 76] }, { name: 'Beneath the Ruins', tag: 'TENSION', art: 'ruins', desc: 'The silence here has a weight of its own.', layers: [20, 45, 0, 15] }, { name: 'A Storm Approaches', tag: 'COMBAT', art: 'storm', desc: 'A dark horizon. Nowhere left to run.', layers: [90, 80, 50, 0] }];
const campaignPrefixes = ['encounters', 'characters', 'wiki', 'battle', 'battle-title', 'battle-id', 'battle-active', 'note', 'round', 'turn', 'hp'];
function campaignHasContent(name: string) {
    for (const prefix of ['encounters', 'characters', 'wiki', 'battle'])
        try {
            const value = JSON.parse(localStorage.getItem(`wf-${prefix}:${name}`) || 'null');
            if (Array.isArray(value) && value.length)
                return true;
        }
        catch { }
    try {
        if (String(JSON.parse(localStorage.getItem(`wf-note:${name}`) || 'null') || '').trim())
            return true;
    }
    catch { }
    return false;
}
function discoverCampaigns() {
    try {
        const saved = JSON.parse(localStorage.getItem('wf-campaigns') || 'null');
        if (Array.isArray(saved))
            return [...new Set(saved.filter(name => typeof name === 'string' && name.trim()).map(name => name.trim()))];
    }
    catch { }
    const names: string[] = [];
    try {
        const active = JSON.parse(localStorage.getItem('wf-campaign') || 'null');
        if (typeof active === 'string' && active.trim())
            names.push(active.trim());
    }
    catch { }
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || '', match = key.match(new RegExp(`^wf-(?:${campaignPrefixes.join('|')}):(.+)$`));
        if (match)
            names.push(match[1]);
    }
    return [...new Set(names)].filter(name => !['Sagara', 'Icewind Dale', 'Padukuhan Waluh'].includes(name) || campaignHasContent(name));
}
cleanBundledCampaignTemplates();
const startingCampaigns = discoverCampaigns();
const icons = [CloudRain, Wind, Waves, Flame];
const layerNames = ['Rainfall', 'Forest wind', 'Ocean surf', 'Hearth fire'];
export default function App() {
    const cloud = useCloudStatus();
    useEffect(() => { void bootSupabase(); }, []);
    const [campaigns, setCampaigns] = useSaved<string[]>('wf-campaigns', startingCampaigns), [campaign, setCampaign] = useSaved('wf-campaign', startingCampaigns[0] || ''), campaignKey = campaign || '__new__';
    const [page, setPage] = useState('Dashboard'), [scene, setScene] = useSaved('wf-scene', 0), [layers, setLayers] = useSaved('wf-layers', [72, 36, 48, 0]), [master, setMaster] = useSaved('wf-master', 70), [music, setMusic] = useSaved('wf-music', 45), [playing, setPlaying] = useState(false), [muted, setMuted] = useState(false), [filter, setFilter] = useState('All scenes'), [query, setQuery] = useState(''), [layout, setLayout] = useSaved('wf-layout', 'Session'), [orders, setOrders] = useSaved<Record<string, string[]>>('wf-orders', { Session: ['combat', 'atmosphere', 'journal', 'dice'], Combat: ['combat', 'dice', 'atmosphere', 'journal'], Exploration: ['atmosphere', 'journal', 'dice', 'combat'] }), [edit, setEdit] = useState(false), [wide, setWide] = useSaved<Record<string, boolean>>('wf-wide', {}), [collapsed, setCollapsed] = useSaved<Record<string, boolean>>('wf-collapsed-widgets', {}), [note, setNote] = useSaved(`wf-note:${campaignKey}`, ''), [round, setRound] = useSaved(`wf-round:${campaignKey}`, 1), [turn, setTurn] = useSaved(`wf-turn:${campaignKey}`, 0), [hp, setHp] = useSaved(`wf-hp:${campaignKey}`, []), [dice, setDice] = useState('1d20+3'), [roll, setRoll] = useState<number | null>(null), [history, setHistory] = useSaved<string[]>('wf-rolls', []), [rollMode, setRollMode] = useState<'normal' | 'adv' | 'disadv'>('normal'), [targetDC, setTargetDC] = useState<number | null>(null), [critState, setCritState] = useState<'nat20' | 'nat1' | null>(null), [rollOverlay, setRollOverlay] = useState<{ label: string; expression: string; total: number; breakdown: string; crit: 'nat20' | 'nat1' | null } | null>(null), [modal, setModal] = useState(startingCampaigns.length ? '' : 'campaign'), [toast, setToast] = useState(''), [source, setSource] = useSaved('wf-source', ''), [sourceInput, setSourceInput] = useState(''), [custom, setCustom] = useSaved<Scene[]>('wf-custom', []), [sceneName, setSceneName] = useState(''), [concentration, setConcentration] = useSaved('wf-concentration', true), [campaignName, setCampaignName] = useState(''), [campaignError, setCampaignError] = useState(''), [deleteCampaignText, setDeleteCampaignText] = useState(''), [deleteCampaignError, setDeleteCampaignError] = useState('');
    const [sourceName, setSourceName] = useState(''), [sourceCategory, setSourceCategory] = useState('EXPLORATION'), [keepMix, setKeepMix] = useState(true), [providerStopped, setProviderStopped] = useState(false), [playerCollapsed, setPlayerCollapsed] = useState(false);
    const [hiddenScenes, setHiddenScenes] = useSaved<string[]>('wf-hidden-builtin-scenes', []), [sceneSelectMode, setSceneSelectMode] = useState(false), [selectedSceneNames, setSelectedSceneNames] = useState<Set<string>>(new Set()), [sceneBulkConfirm, setSceneBulkConfirm] = useState(false);
    const [customLayers, setCustomLayers] = useSaved<(FreesoundSound | null)[]>('wf-custom-layers', [null, null, null, null]), [freesoundTargetSlot, setFreesoundTargetSlot] = useState<number | null>(null);
    const audioNodes = useRef<(AudioBufferSourceNode | null)[]>([null, null, null, null]);
    const [youtubeDeckA, setYoutubeDeckA] = useSaved('wf-youtube-deck-a', ''), [youtubeDeckB, setYoutubeDeckB] = useSaved('wf-youtube-deck-b', ''), [youtubeVolumeA, setYoutubeVolumeA] = useSaved('wf-youtube-volume-a', 75), [youtubeVolumeB, setYoutubeVolumeB] = useSaved('wf-youtube-volume-b', 75), [youtubeMaster, setYoutubeMaster] = useSaved('wf-youtube-master', 80), [youtubeCrossfade, setYoutubeCrossfade] = useSaved('wf-youtube-crossfade', 50), [youtubeMixerOpen, setYoutubeMixerOpen] = useState(false), [youtubeStopSignal, setYoutubeStopSignal] = useState(0);
    const [battle, setBattle] = useSaved<Combatant[]>(`wf-battle:${campaignKey}`, []), [battleTitle, setBattleTitle] = useSaved(`wf-battle-title:${campaignKey}`, 'No active encounter'), [battleId, setBattleId] = useSaved(`wf-battle-id:${campaignKey}`, ''), [battleActive, setBattleActive] = useSaved(`wf-battle-active:${campaignKey}`, false);
    const preCombatView = useRef<{
        layout: string;
        wide: Record<string, boolean>;
    } | null>(null);
    useEffect(() => {
        let blobURL = '';
        let cancelled = false;
        const load = async () => {
            const saved = await readAudio().catch(() => null);
            if (cancelled || !saved)
                return;
            const el = document.getElementById('local-audio') as HTMLAudioElement | null;
            if (el) {
                if (blobURL)
                    URL.revokeObjectURL(blobURL);
                blobURL = URL.createObjectURL(saved.file);
                el.src = blobURL;
            }
        };
        if (page === 'Atmosphere Studio')
            void load();
        window.addEventListener('planarch-audio-changed', load);
        return () => {
            cancelled = true;
            window.removeEventListener('planarch-audio-changed', load);
            if (blobURL)
                URL.revokeObjectURL(blobURL);
        };
    }, [page]);
    const [compendiumFocus, setCompendiumFocus] = useState(''), [youtubeKey, setYoutubeKey] = useState(() => {
        try {
            return sessionStorage.getItem('planarch-youtube-key') || sessionStorage.getItem('wayfinder-youtube-key') || '';
        }
        catch {
            return '';
        }
    });
    const openReference = (id: string) => { setCompendiumFocus(id); setPage('Compendium'); };
    const [theme, setTheme] = useSaved<'light' | 'dark'>('wf-theme', 'light'), [saveError, setSaveError] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useSaved<boolean>('wf-sidebar-collapsed', false);
    useEffect(() => { const failed = () => { setSaveError(true); notify('Browser storage is full or unavailable. Export a backup before closing.'); }; window.addEventListener('planarch-save-error', failed); return () => window.removeEventListener('planarch-save-error', failed); }, []);
    const startEncounter = (e: Encounter) => { const sorted = [...e.members].sort((a, b) => b.initiative - a.initiative); preCombatView.current = { layout, wide }; setBattle(sorted); setBattleTitle(e.name); setBattleId(e.id); setBattleActive(true); setRound(1); setTurn(0); setPage('Dashboard'); setLayout('Combat'); setWide(current => ({ ...current, combat: true })); notify(`${e.name} started · combat workspace activated`); };
    const updateActiveEncounter = (e: Encounter) => {
        if (!battleActive || battleId !== e.id)
            return;
        const activeId = battle[turn]?.id;
        const next = e.members.map(prepared => {
            const active = battle.find(member => member.id === prepared.id);
            return active ? { ...prepared, hp: active.hp, maxHp: Math.max(prepared.maxHp, active.hp), turnState: active.turnState } : prepared;
        });
        setBattle(next);
        setBattleTitle(e.name);
        const activeIndex = next.findIndex(member => member.id === activeId);
        setTurn(activeIndex >= 0 ? activeIndex : Math.min(turn, Math.max(0, next.length - 1)));
        notify(`${e.name} roster updated · HP and round ${round} preserved`);
    };
    const endEncounter = () => { const key = `wf-encounters:${campaign}`; const stored: Encounter[] = JSON.parse(localStorage.getItem(key) || 'null') || seedEncounters(campaign); writeSavedValue(key, stored.map(e => e.id === battleId ? { ...e, status: 'Completed' } : e)); const defeated = battle.filter(m => m.role === 'Monster' && m.hp === 0).map(m => m.name); const log = `${battleTitle} ended after ${round} rounds.\nDefeated monsters: ${defeated.join(', ') || 'None recorded'}.`; setNote(note + '\n\n' + log); const wikiKey = `wf-wiki:${campaign}`, pages: WikiPage[] = JSON.parse(localStorage.getItem(wikiKey) || 'null') || seedPages(campaign); writeSavedValue(wikiKey, [...pages, { id: uid(), title: battleTitle + ' · Encounter log', category: 'Session log', body: log, tags: 'combat', updated: new Date().toISOString() }]); setBattleActive(false); notify('Encounter ended; session journal and wiki log updated'); };
    const advanceTurn = () => {
        if (!battle.length)
            return;
        if (turn + 1 < battle.length) {
            setTurn(turn + 1);
        }
        else {
            setTurn(0);
            setRound(r => r + 1);
        }
    };
    useEffect(() => {
        if (source && !custom.some(s => s.source?.url === source)) {
            try {
                const provider = parseProviderSource(source);
                if (!custom.some(s => s.source?.identity === provider.identity))
                    setCustom(c => [...c, { name: `${provider.provider} soundtrack`, tag: 'EXPLORATION', art: 'coast', desc: 'Saved source from your previous workspace.', layers: [0, 0, 0, 0], source: provider }]);
            }
            catch { }
        }
    }, []);
    const audio = useRef<AudioContext | null>(null), gains = useRef<GainNode[]>([]), drag = useRef('');
    const [characterVersion, setCharacterVersion] = useState(0);
    useEffect(() => {
        if (!rollOverlay) return;
        const timer = setTimeout(() => setRollOverlay(null), 4500);
        return () => clearTimeout(timer);
    }, [rollOverlay]);
    const partyCharacters: Character[] = (() => {
        try {
            const raw = localStorage.getItem(`wf-characters:${campaignKey}`);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    })();
    const visibleBuiltinScenes = scenes.filter(s => !hiddenScenes.includes(s.name));
    const allScenes = [...visibleBuiltinScenes, ...custom], active = allScenes[scene] || visibleBuiltinScenes[0] || scenes[0], youtubeSources = custom.filter(item => item.source?.provider === 'YouTube');
    const removeScene = (s: Scene, i: number) => {
        if (custom.some(c => c.name === s.name)) {
            setCustom(custom.filter(c => c.name !== s.name));
        } else {
            setHiddenScenes([...hiddenScenes, s.name]);
        }
        if (scene === i) {
            setScene(0);
            setLayers((allScenes[0] || scenes[0]).layers);
        } else if (scene > i) {
            setScene(scene - 1);
        }
        notify(`${s.name} removed`);
    };
    const deleteSelectedScenes = () => {
        if (!selectedSceneNames.size) return;
        const count = selectedSceneNames.size;
        const nextCustom = custom.filter(s => !selectedSceneNames.has(s.name));
        const nextHidden = new Set(hiddenScenes);
        for (const name of selectedSceneNames) {
            if (!custom.some(c => c.name === name)) {
                nextHidden.add(name);
            }
        }
        setCustom(nextCustom);
        setHiddenScenes(Array.from(nextHidden));
        setSelectedSceneNames(new Set());
        setSceneSelectMode(false);
        setSceneBulkConfirm(false);
        setScene(0);
        notify(`${count} scene${count === 1 ? '' : 's'} removed`);
    };
    const toggleSceneSelect = (name: string, e: React.MouseEvent | React.ChangeEvent) => {
        e.stopPropagation();
        const next = new Set(selectedSceneNames);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        setSelectedSceneNames(next);
    };
    const notify = (s: string) => { setToast(s); setTimeout(() => setToast(''), 3000); };
    const createCampaign = () => {
        const name = campaignName.trim().replace(/\s+/g, ' ');
        if (!name) {
            setCampaignError('Give the campaign a name.');
            return;
        }
        if (name.length > 80) {
            setCampaignError('Use 80 characters or fewer.');
            return;
        }
        if (campaigns.some(item => item.toLowerCase() === name.toLowerCase())) {
            setCampaignError('That campaign already exists. Choose it from the list.');
            return;
        }
        for (const prefix of campaignPrefixes)
            localStorage.removeItem(`wf-${prefix}:__new__`);
        setCampaigns([...campaigns, name]);
        setCampaign(name);
        setCampaignName('');
        setCampaignError('');
        setModal('');
        setPage('Dashboard');
        notify(`${name} is now active`);
    };
    const deleteCampaign = () => {
        if (!campaign || deleteCampaignText.trim() !== campaign) {
            setDeleteCampaignError(`Type “${campaign}” exactly to confirm.`);
            return;
        }
        const empty: Record<string, unknown> = { encounters: [], characters: [], wiki: [], battle: [], 'battle-title': 'No active encounter', 'battle-id': '', 'battle-active': false, note: '', round: 1, turn: 0, hp: [] };
        for (const prefix of campaignPrefixes)
            writeSavedValue(`wf-${prefix}:${campaign}`, empty[prefix]);
        const remaining = campaigns.filter(name => name !== campaign), deleted = campaign, next = remaining[0] || '';
        setCampaigns(remaining);
        setCampaign(next);
        setDeleteCampaignText('');
        setDeleteCampaignError('');
        setPage('Dashboard');
        if (next) {
            setModal('');
            notify(`${deleted} deleted · ${next} is now active`);
        }
        else {
            setCampaignName('');
            setModal('campaign');
            notify(`${deleted} deleted`);
        }
    };
    useEffect(() => {
        const fn = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k' && campaigns.length) {
                e.preventDefault();
                if (battleActive)
                    window.dispatchEvent(new CustomEvent('planarch-command-open'));
                else
                    setModal('search');
            }
            if (e.key === 'Escape' && campaigns.length)
                setModal('');
        };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, [campaigns.length, battleActive]);
    useEffect(() => {
        if (!battleActive && preCombatView.current) {
            setLayout(preCombatView.current.layout);
            setWide(preCombatView.current.wide);
            preCombatView.current = null;
        }
    }, [battleActive]);
    useEffect(() => { gains.current.forEach((g, i) => g.gain.setTargetAtTime(playing && !muted ? layers[i] / 100 * master / 100 * .22 : 0, audio.current!.currentTime, .4)); }, [playing, muted, layers, master]);
    useEffect(() => {
        const toggle = () => { void toggleAudio(); };
        const mute = () => setMuted(value => !value);
        const openYouTubeMixer = () => setYoutubeMixerOpen(true);
        const closeYouTubeMixer = () => setYoutubeMixerOpen(false);
        const onCustomRoll = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail && detail.expression) {
                rollDice(detail.expression, detail.label || detail.expression);
            }
        };
        window.addEventListener('planarch-audio-toggle', toggle);
        window.addEventListener('planarch-audio-mute', mute);
        window.addEventListener('planarch-youtube-mixer-open', openYouTubeMixer);
        window.addEventListener('planarch-youtube-mixer-close', closeYouTubeMixer);
        window.addEventListener('planarch-dice-roll', onCustomRoll);
        return () => {
            window.removeEventListener('planarch-audio-toggle', toggle);
            window.removeEventListener('planarch-audio-mute', mute);
            window.removeEventListener('planarch-youtube-mixer-open', openYouTubeMixer);
            window.removeEventListener('planarch-youtube-mixer-close', closeYouTubeMixer);
            window.removeEventListener('planarch-dice-roll', onCustomRoll);
        };
    }, []);
    async function setupLayerSource(i: number, ctx: AudioContext, gainNode: GainNode) {
        if (audioNodes.current[i]) {
            try { audioNodes.current[i]?.stop(); audioNodes.current[i]?.disconnect(); } catch {}
            audioNodes.current[i] = null;
        }

        const customSound = customLayers[i];
        if (customSound) {
            try {
                const cachedBuf = await getCachedAudioBlob(customSound.id);
                if (cachedBuf) {
                    const audioBuffer = await ctx.decodeAudioData(cachedBuf.slice(0));
                    const sourceNode = ctx.createBufferSource();
                    sourceNode.buffer = audioBuffer;
                    sourceNode.loop = true;
                    sourceNode.connect(gainNode);
                    sourceNode.start();
                    audioNodes.current[i] = sourceNode;
                    return;
                }
            } catch (e) {
                console.warn('Failed to decode cached custom sound, falling back to procedural:', e);
            }
        }

        // Procedural fallback / default synthetic ambience
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate), data = buffer.getChannelData(0);
        let last = 0;
        for (let n = 0; n < data.length; n++) {
            let white = Math.random() * 2 - 1;
            last = (last + .025 * white) / 1.025;
            data[n] = i === 3 ? white * (Math.random() > .998 ? 1 : .08) : i === 0 ? white * .45 : last * 6;
        }
        const node = ctx.createBufferSource();
        node.buffer = buffer;
        node.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = i === 0 ? 'highpass' : 'lowpass';
        f.frequency.value = [900, 420, 240, 1800][i];
        node.connect(f).connect(gainNode);
        node.start();
        audioNodes.current[i] = node;
    }

    async function toggleAudio() {
        if (!audio.current) {
            const ctx = new AudioContext();
            audio.current = ctx;
            for (let i = 0; i < 4; i++) {
                const g = ctx.createGain();
                g.gain.value = 0;
                g.connect(ctx.destination);
                gains.current.push(g);
                await setupLayerSource(i, ctx, g);
            }
        }
        await audio.current.resume();
        setPlaying(p => !p);
    }
    const loadYouTubeDeck = (identity: string, deck: 'A' | 'B') => {
        if (deck === 'A')
            setYoutubeDeckA(identity);
        else
            setYoutubeDeckB(identity);
        setYoutubeMixerOpen(true);
        notify(`Loaded into YouTube deck ${deck}`);
    };
    const activate = (i: number) => {
        const selected = allScenes[i];
        setScene(i);
        setLayers(selected.layers);
        if (selected.source?.provider === 'YouTube') {
            if (!youtubeDeckA)
                loadYouTubeDeck(selected.source.identity, 'A');
            else if (youtubeDeckA !== selected.source.identity && !youtubeDeckB)
                loadYouTubeDeck(selected.source.identity, 'B');
            else
                setYoutubeMixerOpen(true);
        }
        else {
            setProviderStopped(false);
            setPlayerCollapsed(false);
        }
        notify(`${selected.name} loaded`);
    };
    const rollDice = (overrideDice?: string, rollLabel?: string) => {
        const expression = (overrideDice || dice).trim();
        const clean = expression.replace(/\s+/g, '');
        const tokens = clean.match(/([+-]?[^+-]+)/g);
        if (!tokens || !tokens.length) {
            notify('Use dice notation, such as 1d20+5d6 or 2d6+3');
            return;
        }

        let total = 0;
        const breakdowns: string[] = [];
        let singleD20Roll: number | null = null;
        let isSingleD20 = false;

        const diceTokens = tokens.filter(t => t.toLowerCase().includes('d'));
        if (tokens.length === 1 && diceTokens.length === 1) {
            const m = diceTokens[0].match(/^[+]?(\d*)d(20)$/i);
            if (m && (m[1] === '' || m[1] === '1'))
                isSingleD20 = true;
        }

        for (const token of tokens) {
            const sign = token.startsWith('-') ? -1 : 1;
            const body = token.replace(/^[+-]/, '');
            const diceMatch = body.match(/^(\d*)d(4|6|8|10|12|20|100)$/i);

            if (diceMatch) {
                const count = Number(diceMatch[1]) || 1;
                const sides = Number(diceMatch[2]);
                if (count < 1 || count > 50) {
                    notify('Max 50 dice per pool');
                    return;
                }

                if (isSingleD20 && sides === 20 && count === 1 && rollMode !== 'normal') {
                    const r1 = 1 + Math.floor(Math.random() * 20);
                    const r2 = 1 + Math.floor(Math.random() * 20);
                    const chosen = rollMode === 'adv' ? Math.max(r1, r2) : Math.min(r1, r2);
                    singleD20Roll = chosen;
                    total += sign * chosen;
                    breakdowns.push(`${sign < 0 ? '-' : (breakdowns.length ? '+' : '')}${body}(${rollMode === 'adv' ? 'ADV' : 'DIS'} [${r1}, ${r2}] = ${chosen})`);
                } else {
                    const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
                    const sum = rolls.reduce((a, b) => a + b, 0);
                    if (sides === 20 && count === 1 && !singleD20Roll)
                        singleD20Roll = rolls[0];
                    total += sign * sum;
                    const rollStr = rolls.length > 1 ? `[${rolls.join('+')}]` : `${rolls[0]}`;
                    breakdowns.push(`${sign < 0 ? '-' : (breakdowns.length ? '+' : '')}${count > 1 ? `${count}d${sides}` : `d${sides}`}(${rollStr})`);
                }
            } else if (/^\d+$/.test(body)) {
                const val = Number(body);
                total += sign * val;
                breakdowns.push(`${sign < 0 ? '-' : (breakdowns.length ? '+' : '')}${val}`);
            } else {
                notify('Invalid dice expression. Example: 1d20+5d6 or 2d6+3');
                return;
            }
        }

        setRoll(total);
        const crit = singleD20Roll !== null ? (singleD20Roll === 20 ? 'nat20' : singleD20Roll === 1 ? 'nat1' : null) : null;
        setCritState(crit);

        const entry = `${expression}: ${breakdowns.join(' ')} = ${total}`;
        setHistory(h => [entry, ...h].slice(0, 8));

        if (rollLabel) {
            setRollOverlay({
                label: rollLabel,
                expression,
                total,
                breakdown: breakdowns.join(' '),
                crit,
            });
        }
    };
    const handleDieClick = (die: number, isShift: boolean) => {
        const clean = dice.trim();
        const tokens = clean.replace(/\s+/g, '').match(/([+-]?[^+-]+)/g) || [];

        const formatTokens = (toks: string[]) => {
            return toks.map((t, i) => {
                const sign = t.startsWith('+') ? '+' : (t.startsWith('-') ? '-' : '');
                const body = t.replace(/^[+-]/, '');
                if (i === 0) return (sign === '-' ? '-' : '') + body;
                return ` ${sign === '-' ? '-' : '+'} ${body}`;
            }).join('').trim();
        };

        if (isShift) {
            if (!tokens.length) {
                setDice(`1d${die}`);
                return;
            }
            let found = false;
            const newTokens = tokens.map(t => {
                const sign = t.startsWith('-') ? '-' : (t.startsWith('+') ? '+' : '');
                const body = t.replace(/^[+-]/, '');
                const m = body.match(/^(\d*)d(\d+)$/i);
                if (m && Number(m[2]) === die && sign !== '-') {
                    found = true;
                    const count = (Number(m[1]) || 1) + 1;
                    return (sign ? sign : '') + count + 'd' + die;
                }
                return t;
            });

            if (!found) {
                const last = newTokens[newTokens.length - 1];
                if (/^[+-]?\d+$/.test(last) && !last.toLowerCase().includes('d')) {
                    newTokens.splice(newTokens.length - 1, 0, `+1d${die}`);
                } else {
                    newTokens.push(`+1d${die}`);
                }
            }
            setDice(formatTokens(newTokens));
        } else {
            const hasDie = tokens.some(t => {
                const body = t.replace(/^[+-]/, '');
                const m = body.match(/^(\d*)d(\d+)$/i);
                return m && Number(m[2]) === die;
            });

            if (hasDie) {
                const remaining = tokens.filter(t => {
                    const body = t.replace(/^[+-]/, '');
                    const m = body.match(/^(\d*)d(\d+)$/i);
                    return !(m && Number(m[2]) === die);
                });
                const hasRemainingDice = remaining.some(t => t.toLowerCase().includes('d'));
                if (!hasRemainingDice) {
                    setDice('');
                } else {
                    setDice(formatTokens(remaining));
                }
            } else {
                setDice(`1d${die}`);
            }
        }
    };
    const applyModifier = (delta: number) => {
        const trimmed = dice.trim();
        const m = trimmed.match(/^([\s\S]*?)([+-]\d+)?$/);
        const base = m && m[1] ? m[1].trim() : '1d20';
        const currentMod = m && m[2] ? Number(m[2]) : 0;
        const nextMod = currentMod + delta;
        const modStr = nextMod > 0 ? `+${nextMod}` : nextMod < 0 ? `${nextMod}` : '';
        setDice(`${base}${modStr}`);
    };
    const reorder = (target: string) => {
        if (!drag.current || target === drag.current)
            return;
        const a = [...(orders[layout] || orders.Session)], from = a.indexOf(drag.current), to = a.indexOf(target);
        a.splice(from, 1);
        a.splice(to, 0, drag.current);
        setOrders({ ...orders, [layout]: a });
        drag.current = '';
    };
    const exportData = () => { const data = Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('wf-')).map(k => [k, JSON.parse(localStorage.getItem(k)!)])); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'planarch-backup.json'; a.click(); URL.revokeObjectURL(url); notify('Backup exported'); };
    function mixer(compact = false) {
        return <div className={compact ? 'mini-mixer' : 'layer-list'}>{layerNames.map((n, i) => {
            const Icon = icons[i];
            const customSound = customLayers[i];
            const displayName = customSound ? customSound.name : n;
            return <div className="layer" key={i}><div className="layer-icon"><Icon size={18}/></div><div className="layer-content"><div className="between"><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={displayName}>{displayName}</span><small>{layers[i]}%</small></div><input aria-label={`${displayName} volume`} type="range" value={layers[i]} onChange={e => setLayers(layers.map((v, j) => j === i ? +e.target.value : v))}/></div><div className="inline" style={{ gap: '2px' }}><button className="icon-button" aria-label={`Mute ${displayName}`} onClick={() => setLayers(layers.map((v, j) => j === i ? (v ? 0 : 50) : v))}>{layers[i] ? <Volume2 size={16}/> : <VolumeX size={16}/>}</button><button className="icon-button" aria-label={`Change sound for ${displayName}`} title="Pick Freesound audio" onClick={() => setFreesoundTargetSlot(i)}><Music size={14}/></button>{customSound && <button className="icon-button danger-text" aria-label={`Reset ${displayName} to default`} title="Reset to procedural" onClick={async () => {
                const next = [...customLayers];
                next[i] = null;
                setCustomLayers(next);
                if (audio.current && gains.current[i]) {
                    await setupLayerSource(i, audio.current, gains.current[i]);
                }
                notify(`Layer ${i + 1} reset to default`);
            }}><RotateCcw size={13}/></button>}</div></div>;
        })}</div>;
    }
    function widget(id: string) {
        const isCollapsed = Boolean(collapsed[id]);
        return <section key={id} className={`widget ${wide[id] ? 'wide' : ''} ${isCollapsed ? 'widget-collapsed' : ''}`} onDragOver={event => edit && event.preventDefault()} onDrop={() => reorder(id)}>
      <div className="widget-head"><div className="inline"><span draggable={edit} onDragStart={() => { drag.current = id; }} className={edit ? 'drag-handle enabled' : 'drag-handle'} title={edit ? 'Drag to rearrange' : 'Unlock layout to rearrange'}><Grip size={16}/></span>{id === 'combat' ? <Swords size={17}/> : id === 'atmosphere' ? <Headphones size={17}/> : id === 'journal' ? <BookOpen size={17}/> : <Dices size={17}/>}<h3>{({ combat: 'Live encounter', atmosphere: 'Atmosphere', journal: 'Session journal', dice: 'Dice tray' } as Record<string, string>)[id]}</h3></div><div className="inline widget-controls"><button aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${id} widget`} className="icon-button" onClick={() => setCollapsed({ ...collapsed, [id]: !isCollapsed })} title={isCollapsed ? 'Expand widget' : 'Collapse widget'}>{isCollapsed ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}</button><button aria-label={`Resize ${id} widget`} className="icon-button" onClick={() => setWide({ ...wide, [id]: !wide[id] })} title="Toggle wide span"><PanelTop size={16}/></button></div></div>
      {!isCollapsed && (id === 'combat' ? <CombatTracker battle={battle} setBattle={setBattle} battleTitle={battleTitle} battleActive={battleActive} round={round} setRound={setRound} turn={turn} setTurn={setTurn} onReference={openReference} onOpenEncounters={() => setPage('Encounters')} onEnd={endEncounter} notify={notify}/> : id === 'atmosphere' ? <><div className={`mini-art ${active.art}`}><div><span className="eyebrow">CURRENT SCENE</span><h2>{active.name}</h2></div><button className="play-circle" aria-label="Toggle ambience" onClick={toggleAudio}>{playing ? <Pause size={20}/> : <Play size={20}/>}</button></div>{mixer(true)}<button className="text-button widget-link" onClick={() => setPage('Atmosphere Studio')}>Open Atmosphere Studio <ArrowUpRight size={15}/></button></> : id === 'journal' ? <><div className="between journal-meta"><span className="badge subtle">Session notes</span><small><Check size={12}/> Autosaved locally</small></div><textarea aria-label="Session journal" value={note} onChange={event => setNote(event.target.value)}/><div className="widget-bottom between"><small>Private notes · {campaign}</small><button className="text-button" onClick={() => setNote(note + '\n• ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' — ')}>+ Timestamp</button></div></> : <><div className="dice-types">{[4, 6, 8, 10, 12, 20, 100].map(die => <button className={dice.toLowerCase().includes(`d${die}`) ? 'selected' : ''} key={die} onClick={e => handleDieClick(die, e.shiftKey)} title={`Click to select/deselect · Shift+Click to add/increment d${die}`}><Dices size={20}/><span>d{die}</span></button>)}</div><div className="dice-bar"><div className="dice-mode-toggle">{([['normal', 'Normal'], ['adv', 'Advantage'], ['disadv', 'Disadvantage']] as const).map(([m, label]) => <button key={m} className={rollMode === m ? 'active' : ''} onClick={() => setRollMode(m)}>{label}</button>)}</div><div className="dice-dc-pills"><span className="dc-tag">TARGET DC</span>{([null, 10, 15, 20] as const).map(dc => <button key={String(dc)} className={targetDC === dc ? 'active' : ''} onClick={() => setTargetDC(dc)}>{dc === null ? 'Off' : dc}</button>)}</div></div><div className="dice-entry"><input aria-label="Dice expression" value={dice} placeholder="Choose dice or type (e.g. 1d20+5d6)" onChange={event => setDice(event.target.value)} onKeyDown={event => event.key === 'Enter' && rollDice()}/><button type="button" className="dice-clear-btn" onClick={() => setDice('')} title="Clear all dice">Clear</button><div className="quick-mods">{[1, 2, 3, 5].map(v => <button key={v} type="button" className="mod-btn" onClick={() => applyModifier(v)}>+{v}</button>)}<button type="button" className="mod-btn" onClick={() => applyModifier(-1)}>-1</button></div><button className="primary roll-action-btn" onClick={() => rollDice()}>Roll dice</button></div><div className={`roll-result ${critState ? critState : ''} ${targetDC !== null && roll !== null ? (roll >= targetDC ? 'roll-pass' : 'roll-fail') : ''}`}><strong>{roll ?? '—'}</strong><div className="roll-details"><div className="roll-tags"><span>{roll === null ? 'Your next roll awaits' : 'Latest result'}</span>{critState === 'nat20' && <span className="crit-badge crit-nat20">NAT 20 · CRITICAL!</span>}{critState === 'nat1' && <span className="crit-badge crit-nat1">NAT 1 · FUMBLE!</span>}{targetDC !== null && roll !== null && <span className={`dc-badge ${roll >= targetDC ? 'dc-pass' : 'dc-fail'}`}>{roll >= targetDC ? `PASS (DC ${targetDC})` : `FAIL (DC ${targetDC})`}</span>}</div><small>{history[0] || 'Try 2d6+3, or choose a die above.'}</small></div></div><div className="roll-history">{history.slice(1, 4).map((entry, index) => <small key={index}>{entry}</small>)}</div></>)}
    </section>;
    }
    return <div className={`app theme-${theme}${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}><aside className="sidebar"><div className="brand"><div className="brand-mark"><Compass size={28}/></div><div>PLANARCH<small>THE DM COMMAND CENTER</small></div><button className="icon-button collapse-sidebar-button" aria-label="Collapse sidebar" title="Collapse sidebar" onClick={() => setSidebarCollapsed(true)}><PanelLeftClose size={18}/></button></div><div className="campaign-switch"><small>ACTIVE CAMPAIGN</small><select aria-label="Active campaign" value={campaign} disabled={!campaigns.length} onChange={e => { setCampaign(e.target.value); setPage('Dashboard'); }}>{!campaigns.length && <option value="">No campaigns yet</option>}{campaigns.map(name => <option key={name} value={name}>{name}</option>)}</select><div className="campaign-actions"><button className="new-campaign-button" onClick={() => { setCampaignName(''); setCampaignError(''); setModal('campaign'); }}><Plus size={14}/>New campaign</button><button className="delete-campaign-button" disabled={!campaign} aria-label="Delete active campaign" onClick={() => { setDeleteCampaignText(''); setDeleteCampaignError(''); setModal('delete-campaign'); }}><Trash2 size={13}/></button></div><span className="campaign-status">● &nbsp;{battleActive ? 'Encounter in progress' : 'Ready to plan'}</span></div><div className="nav-label">WORKSPACE</div><nav>{[[LayoutDashboard, 'Dashboard'], [Headphones, 'Atmosphere Studio']].map(([Icon, n]) => <button key={String(n)} className={page === n ? 'active' : ''} onClick={() => setPage(String(n))}>{React.createElement(Icon as typeof Compass, { size: 19 })}{String(n)}{n === 'Atmosphere Studio' && <span className="tiny-dot"/>}</button>)}</nav><div className="nav-label">CAMPAIGN TOOLS</div><nav className="campaign-nav">{[[Swords, 'Encounters'], [Users, 'Characters & NPCs'], [BookOpen, 'Campaign wiki'], [BookOpen, 'Compendium']].map(([Icon, n]) => <button disabled={!campaign} className={page === n ? 'active' : ''} key={String(n)} onClick={() => setPage(String(n))}>{React.createElement(Icon as typeof Compass, { size: 18 })}{String(n)}</button>)}</nav><div className="sidebar-bottom"><div className="local-status"><span /> {cloud.user ? 'Supabase workspace' : 'Local-first workspace'}<small>{cloud.transfer || (cloud.user ? cloud.status + (cloud.pending ? ` · ${cloud.pending} pending` : '') : 'Connect Supabase in Settings for cloud sync.')}</small></div><button onClick={() => setModal('settings')}><Settings size={17}/> Settings & backup</button><div className="profile"><div className="avatar">DM</div><div>Dungeon Master<small>Private workspace</small></div><MoreHorizontal size={18}/></div></div></aside>{!sidebarCollapsed && <div className="sidebar-backdrop" onClick={() => setSidebarCollapsed(true)} />}<main><header className="topbar"><button className="icon-button toggle-sidebar-button" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}><PanelLeft size={18}/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{page}</strong></div><button className="search-button" onClick={() => setModal('search')}><Search size={16}/> Quick search <kbd>⌘ K</kbd></button><button className="theme-toggle icon-button" aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'} title={theme === 'light' ? 'Dark theme' : 'Light theme'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={17}/> : <Sun size={17}/>}</button><button className="settings-toggle icon-button" aria-label="Settings & backup" title="Settings & backup" onClick={() => setModal('settings')}><Settings size={17}/></button><span className={`saved ${saveError ? "form-error" : ""}`}><Check size={14}/> {saveError ? 'Storage full · export a backup' : cloud.transfer ? 'Cloud transfer…' : cloud.user ? cloud.status === 'synced' ? 'Saved to Supabase' : cloud.status === 'conflict' ? 'Sync conflict · open Settings' : cloud.status === 'error' ? 'Cloud sync error' : cloud.status === 'offline' ? 'Offline · saved locally' : 'Syncing to Supabase…' : 'All changes saved locally'}</span></header><div className="content"><div className="page-heading"><div><div className="eyebrow">{page === 'Dashboard' ? 'YOUR TABLE. YOUR WORLD.' : page === 'Atmosphere Studio' ? 'SET THE SCENE.' : campaign.toUpperCase() + ' · CAMPAIGN TOOLS'}</div><h1>{page === 'Dashboard' ? 'Behind the screen.' : page}<span className="heading-star">✧</span></h1><p>{page === 'Dashboard' ? 'A little less bookkeeping. A little more adventure.' : page === 'Atmosphere Studio' ? 'Every great story deserves a soundscape.' : page === 'Encounters' ? 'Prepare the challenge. Run it with confidence.' : page === 'Characters & NPCs' ? 'Remember the people who make your world.' : page === 'Compendium' ? 'Your sourcebook. Every creature, spell, and possibility.' : 'Keep the clues, places, and stories connected.'}</p></div><div className="inline">{page === 'Dashboard' ? <button className={edit ? 'primary' : 'secondary'} onClick={() => {
                setEdit(!edit);
                if (edit)
                    notify('Workspace layout saved');
            }}>{edit ? <Check size={16}/> : <SlidersHorizontal size={16}/>} {edit ? 'Save layout' : 'Customize layout'}</button> : page === 'Atmosphere Studio' ? <div className="inline"><button className="secondary" aria-label="Toggle scene multi-select" onClick={() => { setSceneSelectMode(!sceneSelectMode); setSelectedSceneNames(new Set()); setSceneBulkConfirm(false); }}>{sceneSelectMode ? 'Cancel selection' : 'Select'}</button>{hiddenScenes.length > 0 && <button className="secondary" onClick={() => { setHiddenScenes([]); notify('Default scenes restored'); }} title="Restore all default scenes"><RotateCcw size={14}/> Restore defaults</button>}<button className="primary" onClick={() => setModal('scene')}><Plus size={17}/> Save current scene</button></div> : <span className="badge subtle">Campaign records · autosaved</span>}</div></div>{page === 'Dashboard' ? <><div className={`session-banner ${battleActive ? 'battle-mode' : ''}`}><div className="session-emblem">{battleActive ? <Swords size={26}/> : <Compass size={26}/>}</div><div className="session-info"><div className="session-eyebrow"><span className="eyebrow">{campaign.toUpperCase()}</span><span className={`session-pill ${battleActive ? 'live' : ''}`}><span /> {battleActive ? 'Encounter Active' : 'Campaign Ready'}</span></div><h2>{battleActive ? battleTitle : 'Behind The DM Screen'}</h2>{battleActive ? <div className="session-combat-meta"><span className="combat-chip round-chip">Round <strong>{round}</strong></span><span className="combat-chip turn-chip">Turn: <strong>{battle[turn]?.name || 'Initiative'}</strong></span>{battle[turn] && <span className="combat-chip hp-chip">{battle[turn].hp} / {battle[turn].maxHp} HP</span>}</div> : <p className="session-subtitle">Active Scene: <strong>{active.name}</strong> · Quick shortcuts ready for your session.</p>}</div><div className="session-actions">{battleActive ? <><button className="primary session-action-btn" onClick={advanceTurn} title="Next Turn"><SkipForward size={14}/> Next Turn</button><button className="secondary session-action-btn" onClick={() => setModal('journal')} title="Session Notes"><BookOpen size={14}/> Notes</button><button className="danger-text session-action-btn" onClick={endEncounter} title="End Encounter">End Battle</button></> : <><button className="secondary session-action-btn" onClick={toggleAudio} title={playing ? 'Pause Ambience' : 'Play Ambience'}>{playing ? <Pause size={14}/> : <Play size={14}/>} {playing ? 'Pause audio' : 'Play scene'}</button><button className="secondary session-action-btn" onClick={() => setPage('Encounters')} title="Plan Encounters"><Swords size={14}/> Encounters</button><button className="icon-button session-notes-btn" aria-label="Open session notes" title="Open session notes" onClick={() => setModal('journal')}><ArrowUpRight size={18}/></button></>}</div></div>{partyCharacters.filter(c => c.kind === 'Player').length > 0 && <div className="party-status-strip" aria-label="Party status overview"><div className="party-strip-heading"><div className="inline"><Shield size={14}/><span>PARTY VITALS</span></div><button className="text-button party-manage-btn" onClick={() => setPage('Characters & NPCs')}>Manage party <ArrowUpRight size={13}/></button></div><div className="party-cards-grid">{partyCharacters.filter(c => c.kind === 'Player').map(pc => <div key={pc.id} className="party-card"><div className="party-card-avatar">{pc.portrait ? <img src={pc.portrait} alt="" /> : pc.name.slice(0, 1)}</div><div className="party-card-info"><strong>{pc.name}</strong><small>{pc.role || 'Player Character'}</small></div><div className="party-card-stats"><span className="party-stat ac-stat" title="Armor Class"><Shield size={12}/><strong>{pc.ac ?? 10}</strong><small>AC</small></span><span className="party-stat pp-stat" title="Passive Perception"><Eye size={12}/><strong>{pc.passivePerception ?? 10}</strong><small>PP</small></span><span className="party-stat hp-stat" title="Hit Points"><small>HP</small><strong>{pc.hp}</strong></span></div></div>)}</div></div>}<div className="workspace-toolbar"><div className="tabs">{['Session', 'Combat', 'Exploration'].map(t => <button key={t} onClick={() => setLayout(t)} className={layout === t ? 'selected' : ''}>{t}</button>)}</div><span>{edit ? 'Drag the grip to reorder · use the panel icon to resize' : '4 widgets'} <span className="dim">/</span> <button className="text-button" onClick={() => { setOrders({ ...orders, [layout]: ['combat', 'atmosphere', 'journal', 'dice'] }); setWide({}); notify('Layout reset'); }}>Reset layout</button></span></div><div className={`widget-grid ${edit ? 'editing' : ''}`}>{(orders[layout] || orders.Session).map(widget)}</div></> : page === 'Compendium' ? <Compendium campaign={campaign} focus={compendiumFocus} onFocusHandled={() => setCompendiumFocus('')} notify={notify}/> : page !== 'Atmosphere Studio' ? <CampaignTools key={campaign + '-' + page} page={page} campaign={campaign} onStart={startEncounter} onUpdate={updateActiveEncounter} activeEncounterId={battleId} battleActive={battleActive} notify={notify} onReference={openReference}/> : <><div className="studio-grid"><div className="scene-library"><div className="section-heading"><h3>Scene library <span>{allScenes.length}</span></h3><span className="badge subtle">Campaign + global</span></div><div className="scene-filters">{['All scenes', 'Exploration', 'Roleplay', 'Tension', 'Combat'].map(f => <button className={f === filter ? 'selected' : ''} key={f} onClick={() => setFilter(f)}>{f}</button>)}</div>{sceneSelectMode && <div className="bulk-actions-bar inline between" style={{ padding: '8px 14px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '8px', marginBottom: '16px' }}><div className="inline"><strong>{selectedSceneNames.size} scenes selected</strong><button className="secondary" onClick={() => setSelectedSceneNames(selectedSceneNames.size === allScenes.length ? new Set() : new Set(allScenes.map(s => s.name)))}>{selectedSceneNames.size === allScenes.length ? 'Deselect all' : 'Select all'}</button></div>{selectedSceneNames.size > 0 && (sceneBulkConfirm ? <div className="inline"><span style={{ fontSize: '11px', color: '#f87171' }}>Remove {selectedSceneNames.size} scene{selectedSceneNames.size === 1 ? '' : 's'}?</span><button className="danger" onClick={deleteSelectedScenes}>Confirm delete</button><button className="secondary" onClick={() => setSceneBulkConfirm(false)}>Cancel</button></div> : <button className="secondary danger-text" onClick={() => setSceneBulkConfirm(true)}><Trash2 size={14}/> Delete selected ({selectedSceneNames.size})</button>)}</div>}<div className="scene-grid">{allScenes.map((s, i) => (filter === 'All scenes' || s.tag.toLowerCase() === filter.toLowerCase()) && <div className="scene-wrapper" key={s.name} style={{ position: 'relative' }}>{sceneSelectMode && <input type="checkbox" aria-label={`Select ${s.name}`} checked={selectedSceneNames.has(s.name)} onChange={e => toggleSceneSelect(s.name, e)} onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10, width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }} />}<button className={`scene-card ${i === scene ? 'chosen' : ''}`} onClick={() => { if (sceneSelectMode) toggleSceneSelect(s.name, {} as any); else activate(i); }}><div className={`scene-art ${s.art}`}><span className="art-stars">✦</span><span className="scene-tag">{s.tag}</span>{i === scene ? <div className="scene-current"><Check size={14}/> Loaded</div> : <div className="scene-play"><Play size={20}/></div>}</div><div className="scene-info"><h3>{s.name}</h3><p>{s.desc}</p><span>{s.source ? s.source.provider + ' source' : '4 ambience layers'} <span>·</span> {custom.some(c => c.name === s.name) ? 'Your library' : 'Built-in library'}</span></div></button>{s.source?.provider === 'YouTube' && <div className="scene-deck-actions"><button aria-label={`Load ${s.name} to YouTube deck A`} onClick={() => loadYouTubeDeck(s.source!.identity, 'A')}>A</button><button aria-label={`Load ${s.name} to YouTube deck B`} onClick={() => loadYouTubeDeck(s.source!.identity, 'B')}>B</button></div>}<button className="scene-remove icon-button" aria-label={`Remove ${s.name}`} onClick={(e) => { e.stopPropagation(); removeScene(s, i); }}><X size={12}/></button></div>)}</div><div className="source-panel"><div className="inline"><Music size={18}/><h3>Music sources</h3></div><p>Bring your own soundtrack. YouTube sources can run together through the two-channel mixer; Spotify and local audio remain available.</p><div className="inline wrap"><button className="secondary" onClick={() => { setSourceInput(''); setSourceName(''); setModal('source'); }}><Plus size={15}/> Add provider link</button><label className="secondary file-label"><Plus size={15}/> Local audio<input type="file" accept="audio/*" onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                    if (file.size > 50 * 1024 * 1024) {
                        notify('Choose audio smaller than 50 MB');
                        return;
                    }
                    saveAudio(file, file.name).then(() => notify(`${file.name} saved; cloud sync will upload it when connected`)).catch(() => notify('Audio could not be saved to this browser'));
                }
            }}/></label>{youtubeSources.length > 0 && <button className="secondary" onClick={() => setYoutubeMixerOpen(true)}><SlidersHorizontal size={15}/> Open YouTube mixer</button>}</div><audio id="local-audio" aria-label="Local procedural audio player" controls onPlay={e => { e.currentTarget.volume = music / 100; }}/><small>Use the A/B buttons on any YouTube scene card to load a deck. Mixer selections and levels sync with your workspace; playback stays on this device.</small></div></div><aside className="studio-console"><div className="console-heading"><span className="eyebrow">LIVE MIXER</span><span className={`status-dot ${playing ? 'on' : ''}`}>{playing ? 'Live' : 'Standby'}</span></div><div className={`console-art ${active.art}`}><Compass size={58}/></div><h2>{active.name}</h2><p className="console-caption">{playing ? 'Procedural ambience is playing' : 'Ready when your story is.'}</p>{active.source && <div className="source-selected"><Music size={16}/><div><strong>{active.source.provider} source selected</strong><small>{active.source.provider === 'YouTube' ? 'Load this source into Deck A or B, then blend both channels.' : 'Source playback uses the persistent player.'}</small></div><button className="text-button" onClick={() => {
                    if (active.source?.provider === 'YouTube')
                        setYoutubeMixerOpen(true);
                    else {
                        setProviderStopped(false);
                        setPlayerCollapsed(false);
                    }
                }}>{active.source.provider === 'YouTube' ? 'Open mixer' : 'Show player'}</button></div>}<div className="playback"><button className="secondary" aria-label="Reset mix" onClick={() => setLayers(active.layers)}><RotateCcw size={17}/></button><button className="primary" onClick={toggleAudio}>{playing ? <Pause size={18}/> : <Play size={18}/>} {playing ? 'Pause ambience' : active.source ? 'Play ambience' : 'Play scene'}</button><button className="secondary" aria-label="Mute all" onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={17}/> : <Volume2 size={17}/>}</button></div><div className="console-divider"/><div className="between"><h3>Ambience layers</h3><small>Independent mix</small></div>{mixer()}<div className="console-divider"/><div className="between"><h3>Music channel</h3><small>{music}%</small></div><input aria-label="Music volume" type="range" value={music} onChange={e => { setMusic(+e.target.value); (document.getElementById('local-audio') as HTMLAudioElement).volume = +e.target.value / 100; }}/><p className="control-note">Controls local audio. Provider players use their own volume controls.</p><div className="master"><div className="between"><h3><Volume2 size={16}/> Ambience master</h3><strong>{muted ? 'Muted' : master + '%'}</strong></div><input aria-label="Ambience master volume" type="range" value={master} onChange={e => setMaster(+e.target.value)}/></div><div className="console-foot"><span><Check size={13}/> Mix autosaved locally</span><button className="text-button" onClick={() => { setPlaying(false); const el = document.getElementById('local-audio') as HTMLAudioElement | null; el?.pause(); setProviderStopped(true); setYoutubeStopSignal(value => value + 1); notify('Audio stopped'); }}>Stop all</button></div></aside></div></>}</div>{playing && <footer className="now-playing"><div className="inline"><div className={`now-art ${active.art}`}><Headphones size={19}/></div><div><strong>{active.name}</strong><small>Ambience playing <span>·</span> {campaign}</small></div></div><div className="now-center"><button aria-label="Toggle ambience playback" className="icon-button" onClick={toggleAudio}><Pause size={20}/></button><div className="equalizer animated">{[8, 18, 12, 25, 16, 22, 10, 18, 27, 15, 20, 10, 23, 17, 12, 21, 9, 18].map((h, i) => <i key={i} style={{ height: h, animationDelay: `${i * .07}s` }}/>)}</div><span>LIVE MIX</span></div><div className="inline"><button className="icon-button" aria-label="Toggle mute" onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={17}/> : <Volume2 size={17}/>}</button><input aria-label="Quick master volume" type="range" value={master} onChange={e => setMaster(+e.target.value)}/><button className="text-button" onClick={() => setPage('Atmosphere Studio')}>Open mixer <ArrowUpRight size={15}/></button></div></footer>}</main><YouTubeMixer sources={youtubeSources} deckA={youtubeDeckA} deckB={youtubeDeckB} setDeckA={setYoutubeDeckA} setDeckB={setYoutubeDeckB} volumeA={youtubeVolumeA} volumeB={youtubeVolumeB} setVolumeA={setYoutubeVolumeA} setVolumeB={setYoutubeVolumeB} master={youtubeMaster} crossfade={youtubeCrossfade} setMaster={setYoutubeMaster} setCrossfade={setYoutubeCrossfade} open={youtubeMixerOpen} setOpen={setYoutubeMixerOpen} stopSignal={youtubeStopSignal}/>{active.source?.provider === 'Spotify' && !providerStopped && <aside className={`source-player-dock ${playerCollapsed ? 'collapsed' : ''}`} aria-label="Source playback"><div className="source-player-heading"><div><Music size={14}/><strong>{active.name}</strong><small>{active.source.provider}</small></div><button className="icon-button" aria-label={playerCollapsed ? 'Expand source player' : 'Minimize source player'} onClick={() => setPlayerCollapsed(!playerCollapsed)}><ChevronDown size={17}/></button><button className="icon-button" aria-label="Stop source player" onClick={() => setProviderStopped(true)}><X size={16}/></button></div><div className="provider-player"><iframe key={active.source.embed} src={active.source.embed} title={`${active.source.provider}: ${active.name}`} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/><a href={active.source.url} target="_blank" rel="noreferrer">Open in {active.source.provider} <ArrowUpRight size={13}/></a><small>Source volume and playback use the provider controls.</small></div></aside>}{freesoundTargetSlot !== null && <FreesoundModal targetLayerIndex={freesoundTargetSlot} onClose={() => setFreesoundTargetSlot(null)} onSelectSound={async (sound) => {
        const slot = freesoundTargetSlot;
        const next = [...customLayers];
        next[slot] = sound;
        setCustomLayers(next);
        setFreesoundTargetSlot(null);
        if (audio.current && gains.current[slot]) {
            await setupLayerSource(slot, audio.current, gains.current[slot]);
        }
        notify(`Loaded "${sound.name}" into slot ${slot + 1}`);
    }}/>}{toast && <div role="status" className="toast"><Check size={16}/>{toast}</div>}{modal && <div className="modal-backdrop" onClick={() => campaigns.length && setModal('')}><div className="modal" role="dialog" aria-modal="true" aria-label={modal} onClick={e => e.stopPropagation()}>{(modal !== 'campaign' || campaigns.length > 0) && <button className="modal-close icon-button" aria-label="Close dialog" onClick={() => setModal('')}><X size={20}/></button>}{modal === 'campaign' ? <><div className="campaign-create-icon"><Compass size={28}/></div><span className="eyebrow">{campaigns.length ? 'NEW ADVENTURE' : 'WELCOME TO PLANARCH'}</span><h2>{campaigns.length ? 'Create a campaign' : 'Name your first campaign'}</h2><p>Campaigns keep encounters, characters, wiki pages, combat state and session notes separate.</p><label>Campaign name<input autoFocus aria-label="New campaign name" value={campaignName} maxLength={80} onChange={e => { setCampaignName(e.target.value); setCampaignError(''); }} onKeyDown={e => e.key === 'Enter' && createCampaign()} placeholder="e.g. The Shattered Crown"/></label>{campaignError && <p role="alert" className="form-error">{campaignError}</p>}<button className="primary campaign-create-submit" disabled={!campaignName.trim()} onClick={createCampaign}><Plus size={16}/>Create and activate</button></> : modal === 'delete-campaign' ? <><div className="campaign-delete-icon"><Trash2 size={25}/></div><span className="eyebrow">DELETE CAMPAIGN</span><h2>Delete {campaign}?</h2><p>This permanently clears its encounters, characters, wiki posts and images, combat state, and session notes from this workspace and queues those empty records for Supabase sync.</p><label>Type the campaign name to confirm<input autoFocus aria-label="Confirm campaign deletion" value={deleteCampaignText} onChange={e => { setDeleteCampaignText(e.target.value); setDeleteCampaignError(''); }} onKeyDown={e => e.key === 'Enter' && deleteCampaign()} placeholder={campaign}/></label>{deleteCampaignError && <p role="alert" className="form-error">{deleteCampaignError}</p>}<button className="danger campaign-delete-submit" disabled={deleteCampaignText.trim() !== campaign} onClick={deleteCampaign}><Trash2 size={16}/>Delete campaign permanently</button></> : modal === 'search' ? <><h2>Find your way</h2><input autoFocus placeholder="Search workspaces or scenes…" value={query} onChange={e => setQuery(e.target.value)}/>{['Dashboard', 'Atmosphere Studio', 'Encounters', 'Characters & NPCs', 'Campaign wiki', 'Compendium', ...allScenes.map(s => s.name)].filter(n => n.toLowerCase().includes(query.toLowerCase())).map(n => <button className="search-result" key={n} onClick={() => {
                        const i = allScenes.findIndex(s => s.name === n);
                        if (i >= 0) {
                            activate(i);
                            setPage('Atmosphere Studio');
                        }
                        else
                            setPage(n);
                        setModal('');
                    }}><Compass size={17}/>{n}<ArrowUpRight size={15}/></button>)}</> : modal === 'scene' ? <><h2>Keep this atmosphere</h2><p>Save all four layer levels as a reusable scene.</p><label>Scene name<input autoFocus value={sceneName} onChange={e => setSceneName(e.target.value)} placeholder="The forgotten sanctuary"/></label><button className="primary" disabled={!sceneName.trim()} onClick={() => { setCustom([...custom, { name: sceneName.trim(), tag: 'EXPLORATION', art: active.art, desc: 'Your own soundscape, ready for the next adventure.', layers: [...layers] }]); setScene(allScenes.length); setSceneName(''); setModal(''); notify('Custom scene saved'); }}><Save size={16}/> Save scene</button></> : modal === 'source' ? <SourcePicker apiKey={youtubeKey} notify={notify} onAdd={({ provider, name, category, keepMix, spotifyOriginal }) => {
                    const exists = allScenes.findIndex(s => s.source?.identity === provider.identity);
                    if (exists >= 0) {
                        activate(exists);
                        setPage('Atmosphere Studio');
                        setFilter('All scenes');
                        setModal('');
                        notify('This source is already in your library');
                        return;
                    }
                    const added: Scene = { name: name || `${provider.provider} soundtrack ${custom.filter(s => s.source).length + 1}`, tag: category, art: active.art, desc: spotifyOriginal ? 'YouTube version matched from a Spotify song.' : `Your saved ${provider.provider} soundtrack.`, layers: keepMix ? [...layers] : [0, 0, 0, 0], source: provider, spotifyOriginal };
                    setCustom([...custom, added]);
                    setScene(allScenes.length);
                    setLayers(added.layers);
                    if (provider.provider === 'YouTube') {
                        if (!youtubeDeckA)
                            setYoutubeDeckA(provider.identity);
                        else if (!youtubeDeckB)
                            setYoutubeDeckB(provider.identity);
                        setYoutubeMixerOpen(true);
                    }
                    else {
                        setProviderStopped(false);
                        setPlayerCollapsed(false);
                    }
                    setPage('Atmosphere Studio');
                    setFilter('All scenes');
                    setModal('');
                    notify('Source added to atmosphere selection');
                }}/> : modal === 'journal' ? <><h2>{campaign} · Session notes</h2><textarea value={note} onChange={e => setNote(e.target.value)} aria-label="Expanded journal"/><small>Autosaved to this browser.</small></> : <><h2>Your workspace</h2><p>Connect Supabase to synchronize your workspace across devices. JSON backups remain available; the compendium and uploaded audio are synchronized separately through Cloud Storage.</p><CloudSettings /><button className="secondary" onClick={exportData}><Download size={16}/> Export workspace backup</button><label className="secondary file-label">Import backup<input type="file" accept="application/json" onChange={async (e) => {
                    try {
                        const f = e.target.files?.[0];
                        if (!f)
                            return;
                        const data = JSON.parse(await f.text());
                        if (!data || Array.isArray(data) || typeof data !== 'object')
                            throw Error();
                        const expected: Record<string, string> = { 'wf-campaign': 'string', 'wf-campaigns': 'object', 'wf-scene': 'number', 'wf-layers': 'object', 'wf-master': 'number', 'wf-music': 'number', 'wf-layout': 'string', 'wf-orders': 'object', 'wf-wide': 'object', 'wf-note': 'string', 'wf-round': 'number', 'wf-turn': 'number', 'wf-hp': 'object', 'wf-rolls': 'object', 'wf-source': 'string', 'wf-custom': 'object', 'wf-concentration': 'boolean', 'wf-youtube-deck-a': 'string', 'wf-youtube-deck-b': 'string', 'wf-youtube-volume-a': 'number', 'wf-youtube-volume-b': 'number', 'wf-youtube-master': 'number', 'wf-youtube-crossfade': 'number', 'wf-theme': 'string' };
                        const campaignKey = (k: string) => /^wf-(encounters|characters|wiki|battle|battle-title|battle-id|battle-active|note|round|turn|hp):/.test(k);
                        for (const [k, v] of Object.entries(data)) {
                            if (expected[k] && typeof v !== expected[k])
                                throw Error();
                        }
                        for (const [k, v] of Object.entries(data))
                            if (expected[k] || campaignKey(k))
                                writeSavedValue(k, v);
                        notify('Backup imported; cloud sync queued');
                    }
                    catch {
                        notify('Backup could not be imported');
                    }
                }}/></label><div className="youtube-settings"><h3>YouTube song matching</h3><p>Add a YouTube Data API key for automatic Spotify-to-YouTube search. The key stays in this tab and is excluded from exported backups. Restrict it to your website origins and the YouTube Data API.</p><input type="password" aria-label="YouTube API key" placeholder="YouTube Data API key (optional)" value={youtubeKey} onChange={e => {
                    setYoutubeKey(e.target.value);
                    try {
                        sessionStorage.setItem('planarch-youtube-key', e.target.value);
                    }
                    catch { }
                }}/><small>No key? You can still open a title search and paste a matching video.</small></div><div className="settings-note">React + TypeScript + Vite<br />Netlify: npm run build → dist<br />Keyboard: Ctrl / ⌘ K to search, Esc to close</div></>}</div></div>}
    {rollOverlay && <div className="quick-roll-overlay" role="status" aria-live="polite">
      <div className="quick-roll-header">
        <span className="quick-roll-label">{rollOverlay.label}</span>
        <button className="quick-roll-close" onClick={() => setRollOverlay(null)} aria-label="Close roll overlay"><X size={13}/></button>
      </div>
      <div className="quick-roll-body">
        <div className={`quick-roll-total ${rollOverlay.crit ? rollOverlay.crit : ''}`}>
          {rollOverlay.total}
        </div>
        <div className="quick-roll-meta">
          {rollOverlay.crit === 'nat20' && <span className="crit-badge crit-nat20">NAT 20</span>}
          {rollOverlay.crit === 'nat1' && <span className="crit-badge crit-nat1">NAT 1</span>}
          <div className="quick-roll-expr">{rollOverlay.expression}</div>
          <small className="quick-roll-breakdown">{rollOverlay.breakdown}</small>
        </div>
      </div>
    </div>}
  </div>;
}
