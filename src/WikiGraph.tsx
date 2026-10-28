import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Search, HelpCircle } from 'lucide-react';
import type { WikiPage } from './models';

interface WikiGraphProps {
  items: WikiPage[];
  onSelectPage: (id: string) => void;
  activeId?: string;
}

interface GraphNode {
  id: string;
  title: string;
  category: string;
  tags: string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  degree: number;
  pinned?: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'wiki' | 'tag';
}

const CATEGORY_COLORS: Record<string, string> = {
  Location: '#f59e0b',    // Amber
  Lore: '#38bdf8',        // Sky Blue
  Faction: '#10b981',     // Emerald
  Item: '#a855f7',        // Purple
  'Session log': '#ec4899',// Pink
  Default: '#94a3b8'      // Slate
};

export function WikiGraph({ items, onSelectPage, activeId }: WikiGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Parse nodes and edges from pages
  const { initialNodes, edges } = useMemo(() => {
    const titleToId = new Map(items.map(p => [p.title.toLowerCase().trim(), p.id]));
    const nodes: GraphNode[] = items.map((p, i) => {
      const angle = (i / Math.max(1, items.length)) * 2 * Math.PI;
      const dist = 140 + Math.random() * 80;
      return {
        id: p.id,
        title: p.title,
        category: p.category,
        tags: (p.tags || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 16,
        degree: 0
      };
    });

    const parsedEdges: GraphEdge[] = [];
    const edgeKeys = new Set<string>();

    for (const page of items) {
      const matches = page.body.matchAll(/\[\[([^\]]+)\]\]/g);
      for (const match of matches) {
        const targetTitle = match[1].trim().toLowerCase();
        if (targetTitle.startsWith('image:')) continue;
        const targetId = titleToId.get(targetTitle);
        if (targetId && targetId !== page.id) {
          const edgeKey = [page.id, targetId].sort().join('--');
          if (!edgeKeys.has(edgeKey)) {
            edgeKeys.add(edgeKey);
            parsedEdges.push({ source: page.id, target: targetId, type: 'wiki' });
          }
        }
      }
    }

    for (let i = 0; i < items.length; i++) {
      const pageA = nodes[i];
      for (let j = i + 1; j < items.length; j++) {
        const pageB = nodes[j];
        if (pageA.tags.some(t => pageB.tags.includes(t))) {
          const edgeKey = [pageA.id, pageB.id].sort().join('--');
          if (!edgeKeys.has(edgeKey)) {
            edgeKeys.add(edgeKey);
            parsedEdges.push({ source: pageA.id, target: pageB.id, type: 'tag' });
          }
        }
      }
    }

    for (const edge of parsedEdges) {
      const a = nodes.find(n => n.id === edge.source);
      const b = nodes.find(n => n.id === edge.target);
      if (a) a.degree++;
      if (b) b.degree++;
    }

    for (const n of nodes) {
      n.radius = Math.min(28, Math.max(14, 14 + n.degree * 2.5));
    }

    return { initialNodes: nodes, edges: parsedEdges };
  }, [items]);

  const nodesRef = useRef<GraphNode[]>(initialNodes);
  useEffect(() => {
    nodesRef.current = initialNodes;
  }, [initialNodes]);

  // Interaction tracking state
  const isDraggingNode = useRef<string | null>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.clientWidth || 800;
    let height = canvas.clientHeight || 550;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Simulation loop
    function stepPhysics() {
      const nodes = nodesRef.current;
      const kRepel = 2400;
      const kAttract = 0.04;
      const idealDist = 95;
      const damping = 0.82;
      const centerGravity = 0.015;

      // 1. Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy + 1;
          const dist = Math.sqrt(distSq);
          const force = kRepel / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (!a.pinned) { a.vx -= fx; a.vy -= fy; }
          if (!b.pinned) { b.vx += fx; b.vy += fy; }
        }
      }

      // 2. Attraction along edges
      for (const edge of edges) {
        const a = nodes.find(n => n.id === edge.source);
        const b = nodes.find(n => n.id === edge.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const diff = dist - (edge.type === 'wiki' ? idealDist : idealDist * 1.4);
        const force = diff * kAttract;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (!a.pinned) { a.vx += fx; a.vy += fy; }
        if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
      }

      // 3. Center gravity and update position
      for (const n of nodes) {
        if (!n.pinned) {
          n.vx += -n.x * centerGravity;
          n.vy += -n.y * centerGravity;
          n.vx *= damping;
          n.vy *= damping;
          n.x += n.vx;
          n.y += n.vy;
        }
      }
    }

    if (prefersReducedMotion) {
      for (let i = 0; i < 60; i++) stepPhysics();
    }

    function render() {
      if (!ctx || !canvas) return;
      if (!prefersReducedMotion) {
        stepPhysics();
      }

      const dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth || 800;
      height = canvas.clientHeight || 550;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Center origin with pan and zoom
      ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
      ctx.scale(zoom, zoom);

      const nodes = nodesRef.current;
      const nodeMap = new Map(nodes.map(n => [n.id, n]));

      // Detect light mode from document
      const isLight = document.documentElement.classList.contains('theme-light') || 
                      document.body.classList.contains('theme-light') || 
                      Boolean(document.querySelector('.theme-light'));

      // 1. Draw Edges
      for (const edge of edges) {
        const a = nodeMap.get(edge.source);
        const b = nodeMap.get(edge.target);
        if (!a || !b) continue;

        const isHighlighted = hoveredNode === a.id || hoveredNode === b.id || activeId === a.id || activeId === b.id;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);

        if (isHighlighted) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.2;
        } else {
          ctx.strokeStyle = isLight 
            ? (edge.type === 'wiki' ? 'rgba(100, 116, 139, 0.45)' : 'rgba(148, 163, 184, 0.25)')
            : (edge.type === 'wiki' ? 'rgba(148, 163, 184, 0.35)' : 'rgba(148, 163, 184, 0.16)');
          ctx.lineWidth = edge.type === 'wiki' ? 1.2 : 0.8;
          if (edge.type === 'tag') {
            ctx.setLineDash([4, 4]);
          } else {
            ctx.setLineDash([]);
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 2. Draw Nodes
      const queryLower = search.trim().toLowerCase();
      for (const n of nodes) {
        const isHovered = hoveredNode === n.id;
        const isActive = activeId === n.id;
        const isMatched = queryLower ? (n.title.toLowerCase().includes(queryLower) || n.tags.some(t => t.includes(queryLower))) : true;
        const color = CATEGORY_COLORS[n.category] || CATEGORY_COLORS.Default;

        // Node Circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? '#f59e0b' : (isLight ? '#ffffff' : '#0f172a');
        ctx.fill();

        ctx.lineWidth = isActive ? 3 : isHovered ? 2.5 : 1.8;
        ctx.strokeStyle = isMatched ? color : (isLight ? 'rgba(148, 163, 184, 0.35)' : 'rgba(148, 163, 184, 0.25)');
        ctx.stroke();

        // Node Label
        ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = isMatched 
          ? (isHovered || isActive 
              ? (isLight ? '#0f172a' : '#f8fafc') 
              : (isLight ? '#334155' : '#cbd5e1')) 
          : (isLight ? 'rgba(100, 116, 139, 0.4)' : 'rgba(148, 163, 184, 0.35)');
        ctx.fillText(n.title, n.x, n.y + n.radius + 6);
      }

      ctx.restore();

      if (!prefersReducedMotion) {
        animFrameId.current = requestAnimationFrame(render);
      }
    }

    render();

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [edges, zoom, pan, hoveredNode, activeId, search]);

  // Coordinate conversion: Screen to Canvas World
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 550;
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const worldX = (mouseX - (width / 2 + pan.x)) / zoom;
    const worldY = (mouseY - (height / 2 + pan.y)) / zoom;
    return { x: worldX, y: worldY };
  };

  const findNodeAt = (clientX: number, clientY: number): GraphNode | null => {
    const { x, y } = getCanvasCoords(clientX, clientY);
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = n.x - x;
      const dy = n.y - y;
      if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) {
        return n;
      }
    }
    return null;
  };

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const hit = findNodeAt(e.clientX, e.clientY);
    if (hit) {
      isDraggingNode.current = hit.id;
      hit.pinned = true;
    } else {
      isPanning.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingNode.current) {
      const node = nodesRef.current.find(n => n.id === isDraggingNode.current);
      if (node) {
        const { x, y } = getCanvasCoords(e.clientX, e.clientY);
        node.x = x;
        node.y = y;
        node.vx = 0;
        node.vy = 0;
      }
    } else if (isPanning.current) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y
      });
    } else {
      const hit = findNodeAt(e.clientX, e.clientY);
      setHoveredNode(hit ? hit.id : null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingNode.current) {
      const node = nodesRef.current.find(n => n.id === isDraggingNode.current);
      if (node) node.pinned = false;
      isDraggingNode.current = null;
    }
    isPanning.current = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const hit = findNodeAt(e.clientX, e.clientY);
    if (hit) {
      onSelectPage(hit.id);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom(z => Math.min(2.5, Math.max(0.4, z * factor)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="wiki-graph-container" ref={containerRef} style={{ position: 'relative', width: '100%', height: '600px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Top Controls Overlay */}
      <div className="graph-controls inline between" style={{ position: 'absolute', top: '12px', left: '14px', right: '14px', zIndex: 10, pointerEvents: 'none' }}>
        <div className="inline" style={{ pointerEvents: 'auto', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--line)' }}>
          <Search size={14} style={{ color: 'var(--muted)', marginRight: '6px' }} />
          <input
            type="text"
            placeholder="Highlight page or tag…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 0, padding: 0, fontSize: '11px', color: 'var(--text-main)', width: '160px', outline: 'none' }}
          />
        </div>
        <div className="inline" style={{ pointerEvents: 'auto', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', padding: '4px', borderRadius: '8px', border: '1px solid var(--line)', gap: '4px' }}>
          <button className="icon-button" aria-label="Zoom in" onClick={() => setZoom(z => Math.min(2.5, z * 1.2))} title="Zoom In">
            <ZoomIn size={15} />
          </button>
          <button className="icon-button" aria-label="Zoom out" onClick={() => setZoom(z => Math.max(0.4, z / 1.2))} title="Zoom Out">
            <ZoomOut size={15} />
          </button>
          <button className="icon-button" aria-label="Reset graph view" onClick={resetView} title="Reset View">
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        onWheel={handleWheel}
        style={{ width: '100%', height: '100%', display: 'block', cursor: hoveredNode ? 'pointer' : isPanning.current ? 'grabbing' : 'grab' }}
      />

      {/* Legend & Hint Overlay */}
      <div className="graph-legend inline" style={{ position: 'absolute', bottom: '12px', left: '14px', zIndex: 10, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '10px', color: 'var(--muted)', gap: '10px' }}>
        {Object.entries(CATEGORY_COLORS).filter(([k]) => k !== 'Default').map(([cat, color]) => (
          <div key={cat} className="inline" style={{ gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
            <span>{cat}</span>
          </div>
        ))}
        <div className="inline" style={{ marginLeft: '8px', borderLeft: '1px solid var(--line)', paddingLeft: '8px', gap: '4px' }}>
          <HelpCircle size={12} />
          <span>Click node to open page</span>
        </div>
      </div>
    </div>
  );
}
