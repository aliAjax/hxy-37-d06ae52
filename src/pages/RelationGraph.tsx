import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Network, Filter, X, ZoomIn, ZoomOut, Maximize2, User, Users, BookOpen, FileText, CircleDot, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Material, Character, Staff, MaterialType, ScanStatus, MaterialTypeLabels, ScanStatusLabels } from '../types';
import { Modal } from '../components/Modal';

type NodeType = 'work' | 'character' | 'staff' | 'material';

interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  data: Material | Character | Staff | string;
}

interface GraphEdge {
  source: string;
  target: string;
  sourceNode: GraphNode;
  targetNode: GraphNode;
}

interface FilterState {
  materialTypes: MaterialType[];
  scanStatuses: ScanStatus[];
}

const nodeColors: Record<NodeType, string> = {
  work: '#f59e0b',
  character: '#ec4899',
  staff: '#8b5cf6',
  material: '#10b981',
};

const nodeIcons: Record<NodeType, typeof User> = {
  work: BookOpen,
  character: User,
  staff: Users,
  material: FileText,
};

const nodeLabels: Record<NodeType, string> = {
  work: '作品',
  character: '角色',
  staff: '制作人员',
  material: '资料',
};

export function RelationGraph() {
  const materials = useStore((state) => state.materials);
  const characters = useStore((state) => state.characters);
  const staff = useStore((state) => state.staff);
  const works = useStore((state) => state.getWorks());

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number>();
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const draggingRef = useRef<string | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [filters, setFilters] = useState<FilterState>({
    materialTypes: ['artbook', 'storyboard', 'setting', 'magazine', 'special'],
    scanStatuses: ['unscanned', 'partial', 'completed'],
  });
  const [startNodeType, setStartNodeType] = useState<NodeType | null>(null);
  const [startNodeSelectorOpen, setStartNodeSelectorOpen] = useState(false);

  const filteredMaterials = useMemo(() => {
    return materials.filter(
      (m) =>
        filters.materialTypes.includes(m.type) && filters.scanStatuses.includes(m.scanStatus)
    );
  }, [materials, filters]);

  const buildGraph = useCallback(() => {
    const nodes: Map<string, GraphNode> = new Map();
    const edges: GraphEdge[] = [];

    const width = 800;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;

    const addNode = (id: string, type: NodeType, label: string, data: any, radius?: number) => {
      if (!nodes.has(id)) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 200;
        nodes.set(id, {
          id,
          type,
          label,
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          vx: 0,
          vy: 0,
          radius: radius || (type === 'work' ? 35 : type === 'material' ? 25 : 20),
          data,
        });
      }
      return nodes.get(id)!;
    };

    works.forEach((work) => {
      addNode(`work:${work}`, 'work', work, work, 40);
    });

    characters.forEach((char) => {
      const workMaterials = filteredMaterials.filter((m) => m.work === char.work);
      if (workMaterials.length > 0) {
        addNode(`char:${char.id}`, 'character', char.name, char);
      }
    });

    staff.forEach((s) => {
      const workMaterials = filteredMaterials.filter((m) =>
        s.works.some((w) => m.work === w)
      );
      if (workMaterials.length > 0) {
        addNode(`staff:${s.id}`, 'staff', s.name, s);
      }
    });

    filteredMaterials.forEach((material) => {
      addNode(`mat:${material.id}`, 'material', material.title, material);
    });

    filteredMaterials.forEach((material) => {
      const materialNode = nodes.get(`mat:${material.id}`);
      if (!materialNode) return;

      if (material.work) {
        const workNode = nodes.get(`work:${material.work}`);
        if (workNode) {
          edges.push({ source: materialNode.id, target: workNode.id, sourceNode: materialNode, targetNode: workNode });
        }
      }

      material.characterIds.forEach((charId) => {
        const charNode = nodes.get(`char:${charId}`);
        if (charNode) {
          edges.push({ source: materialNode.id, target: charNode.id, sourceNode: materialNode, targetNode: charNode });
        }
      });

      material.staffIds.forEach((staffId) => {
        const staffNode = nodes.get(`staff:${staffId}`);
        if (staffNode) {
          edges.push({ source: materialNode.id, target: staffNode.id, sourceNode: materialNode, targetNode: staffNode });
        }
      });
    });

    characters.forEach((char) => {
      const charNode = nodes.get(`char:${char.id}`);
      const workNode = nodes.get(`work:${char.work}`);
      if (charNode && workNode) {
        const exists = edges.some(
          (e) =>
            (e.source === charNode.id && e.target === workNode.id) ||
            (e.source === workNode.id && e.target === charNode.id)
        );
        if (!exists) {
          edges.push({ source: charNode.id, target: workNode.id, sourceNode: charNode, targetNode: workNode });
        }
      }
    });

    staff.forEach((s) => {
      const staffNode = nodes.get(`staff:${s.id}`);
      if (!staffNode) return;
      s.works.forEach((work) => {
        const workNode = nodes.get(`work:${work}`);
        if (workNode) {
          const exists = edges.some(
            (e) =>
              (e.source === staffNode.id && e.target === workNode.id) ||
              (e.source === workNode.id && e.target === staffNode.id)
          );
          if (!exists) {
            edges.push({ source: staffNode.id, target: workNode.id, sourceNode: staffNode, targetNode: workNode });
          }
        }
      });
    });

    nodesRef.current = Array.from(nodes.values());
    edgesRef.current = edges;
  }, [works, characters, staff, filteredMaterials]);

  useEffect(() => {
    buildGraph();
  }, [buildGraph]);

  useEffect(() => {
    const simulate = () => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      if (nodes.length === 0) return;

      const repulsion = 8000;
      const attraction = 0.02;
      const damping = 0.9;
      const centerPull = 0.005;
      const centerX = 400;
      const centerY = 300;

      nodes.forEach((node, i) => {
        if (draggingRef.current === node.id) return;

        nodes.forEach((other, j) => {
          if (i === j) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);
          node.vx += (dx / dist) * force;
          node.vy += (dy / dist) * force;
        });

        node.vx += (centerX - node.x) * centerPull;
        node.vy += (centerY - node.y) * centerPull;
      });

      edges.forEach((edge) => {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) return;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 100) * attraction;

        if (draggingRef.current !== source.id) {
          source.vx += (dx / dist) * force;
          source.vy += (dy / dist) * force;
        }
        if (draggingRef.current !== target.id) {
          target.vx -= (dx / dist) * force;
          target.vy -= (dy / dist) * force;
        }
      });

      nodes.forEach((node) => {
        if (draggingRef.current === node.id) {
          node.vx = 0;
          node.vy = 0;
          node.x = mousePosRef.current.x;
          node.y = mousePosRef.current.y;
        } else {
          node.vx *= damping;
          node.vy *= damping;
          node.x += node.vx;
          node.y += node.vy;
        }
      });

      nodesRef.current = [...nodes];
    };

    const animate = () => {
      simulate();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 16);
    return () => clearInterval(interval);
  }, []);

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    draggingRef.current = nodeId;
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      mousePosRef.current = {
        x: (e.clientX - rect.left - offset.x) / zoom,
        y: (e.clientY - rect.top - offset.y) / zoom,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (draggingRef.current) {
      mousePosRef.current = {
        x: (e.clientX - rect.left - offset.x) / zoom,
        y: (e.clientY - rect.top - offset.y) / zoom,
      };
    } else if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    draggingRef.current = null;
    setIsPanning(false);
  };

  const handleSvgMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
      });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.3, Math.min(3, z * delta)));
  };

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const getRelatedMaterials = (node: GraphNode) => {
    if (node.type === 'material') return [node.data as Material];

    return filteredMaterials.filter((m) => {
      if (node.type === 'work') return m.work === (node.data as string);
      if (node.type === 'character') return m.characterIds.includes((node.data as Character).id);
      if (node.type === 'staff') return m.staffIds.includes((node.data as Staff).id);
      return false;
    });
  };

  const toggleFilter = (key: 'materialTypes' | 'scanStatuses', value: MaterialType | ScanStatus) => {
    setFilters((prev) => {
      const current = prev[key];
      if ((current as string[]).includes(value as string)) {
        return { ...prev, [key]: current.filter((v) => v !== value) };
      } else {
        return { ...prev, [key]: [...current, value as never] };
      }
    });
  };

  const startNodes = useMemo(() => {
    const options: { id: string; label: string; type: NodeType }[] = [];
    works.forEach((w) => options.push({ id: `work:${w}`, label: w, type: 'work' }));
    characters.forEach((c) => options.push({ id: `char:${c.id}`, label: c.name, type: 'character' }));
    staff.forEach((s) => options.push({ id: `staff:${s.id}`, label: s.name, type: 'staff' }));
    return options;
  }, [works, characters, staff]);

  const focusOnNode = (nodeId: string) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setZoom(1.5);
      setOffset({
        x: 400 - node.x * 1.5,
        y: 300 - node.y * 1.5,
      });
    }
    setStartNodeSelectorOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold gradient-text mb-2">关系图谱</h1>
          <p className="text-gray-400">
            可视化资料、作品、角色、制作人员之间的关联网络
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStartNodeSelectorOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 transition-colors"
          >
            <Network className="w-4 h-4" />
            选择起始节点
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        <div className="w-64 flex-shrink-0 space-y-4">
          <div className="p-4 rounded-xl bg-primary-800/30 border border-accent-500/20">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-white">筛选条件</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">资料类型</label>
                <div className="space-y-2">
                  {(['artbook', 'storyboard', 'setting', 'magazine', 'special'] as const).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.materialTypes.includes(type)}
                        onChange={() => toggleFilter('materialTypes', type)}
                        className="w-4 h-4 rounded border-gray-600 bg-primary-800 text-accent-500 focus:ring-accent-500"
                      />
                      <span className="text-sm text-gray-300">{MaterialTypeLabels[type]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">扫描状态</label>
                <div className="space-y-2">
                  {(['unscanned', 'partial', 'completed'] as const).map((status) => (
                    <label key={status} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.scanStatuses.includes(status)}
                        onChange={() => toggleFilter('scanStatuses', status)}
                        className="w-4 h-4 rounded border-gray-600 bg-primary-800 text-accent-500 focus:ring-accent-500"
                      />
                      <span className="text-sm text-gray-300">{ScanStatusLabels[status]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-primary-800/30 border border-accent-500/20">
            <div className="flex items-center gap-2 mb-4">
              <CircleDot className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-white">图例</span>
            </div>
            <div className="space-y-3">
              {(Object.keys(nodeColors) as NodeType[]).map((type) => {
                const Icon = nodeIcons[type];
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: nodeColors[type] }}
                    >
                      <Icon className="w-3 h-3 text-primary-900" />
                    </div>
                    <span className="text-sm text-gray-300">{nodeLabels[type]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-primary-800/30 border border-accent-500/20">
            <div className="flex items-center gap-2 mb-4">
              <Maximize2 className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-white">视图控制</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setZoom((z) => Math.min(3, z * 1.2))}
                className="flex-1 flex items-center justify-center p-2 rounded-lg bg-primary-700/50 text-gray-300 hover:bg-primary-700 hover:text-white transition-colors"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))}
                className="flex-1 flex items-center justify-center p-2 rounded-lg bg-primary-700/50 text-gray-300 hover:bg-primary-700 hover:text-white transition-colors"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={resetView}
                className="flex-1 flex items-center justify-center p-2 rounded-lg bg-primary-700/50 text-gray-300 hover:bg-primary-700 hover:text-white transition-colors"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 text-center text-sm text-gray-400">
              缩放: {Math.round(zoom * 100)}%
            </div>
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex-1 rounded-xl bg-primary-800/30 border border-accent-500/20 overflow-hidden relative"
        >
          <svg
            ref={svgRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleSvgMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <g transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`}>
              {edgesRef.current.map((edge, i) => {
                const source = nodesRef.current.find((n) => n.id === edge.source);
                const target = nodesRef.current.find((n) => n.id === edge.target);
                if (!source || !target) return null;
                return (
                  <line
                    key={i}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="rgba(251, 191, 36, 0.3"
                    strokeWidth="1.5"
                  />
                );
              })}

              {nodesRef.current.map((node) => {
                const Icon = nodeIcons[node.type];
                const isSelected = selectedNode?.id === node.id;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseDown={(e) => handleMouseDown(e, node.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                    className="cursor-pointer"
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      r={node.radius + (isSelected ? 5 : 0)}
                      fill={nodeColors[node.type]}
                      stroke={isSelected ? '#fff' : 'transparent'}
                      strokeWidth="2"
                      className="transition-all duration-200"
                      style={{
                        filter: isSelected ? 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' : 'none',
                      }}
                    />
                    <Icon
                      x={-node.radius * 0.5}
                      y={-node.radius * 0.5}
                      width={node.radius}
                      height={node.radius}
                      fill="rgba(15, 23, 42, 0.9"
                    />
                    <text
                      y={node.radius + 14}
                      textAnchor="middle"
                      fill="white"
                      fontSize="12"
                      fontWeight="500"
                    >
                      {node.label.length > 10 ? node.label.slice(0, 10) + '...' : node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          <div className="absolute bottom-4 left-4 text-xs text-gray-500">
            <p>拖拽节点调整位置 • 滚轮缩放 • 空白处拖拽平移</p>
          </div>
        </div>

        <div className="w-80 flex-shrink-0">
          {selectedNode ? (
            <div className="h-full rounded-xl bg-primary-800/30 border border-accent-500/20 flex flex-col">
              <div className="p-4 border-b border-accent-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: nodeColors[selectedNode.type] }}
                    >
                      {(() => {
                        const Icon = nodeIcons[selectedNode.type];
                        return <Icon className="w-5 h-5 text-primary-900" />;
                      })()}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{selectedNode.label}</h3>
                      <p className="text-sm text-gray-400">{nodeLabels[selectedNode.type]}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="p-1 rounded hover:bg-primary-700/50 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">关联资料</h4>
                <div className="space-y-2">
                  {getRelatedMaterials(selectedNode).map((material) => (
                    <div
                      key={material.id}
                      className="p-3 rounded-lg bg-primary-700/30 hover:bg-primary-700/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{material.title}</p>
                          <p className="text-xs text-gray-400">
                            {MaterialTypeLabels[material.type]} • {material.publisher}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                  {getRelatedMaterials(selectedNode).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      暂无关联资料
                    </p>
                  )}
                </div>

                {selectedNode.type === 'material' && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">详细信息</h4>
                    {(() => {
                      const material = selectedNode.data as Material;
                      return (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                          <span className="text-gray-400">扫描状态</span>
                          <span className="text-white">{ScanStatusLabels[material.scanStatus]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">出版社</span>
                          <span className="text-white">{material.publisher}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">出版日期</span>
                          <span className="text-white">{material.publishDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">页数</span>
                          <span className="text-white">{material.pageCount}页</span>
                        </div>
                      </div>
                      );
                    })()}
                  </div>
                )}

                {selectedNode.type === 'character' && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">详细信息</h4>
                    {(() => {
                      const character = selectedNode.data as Character;
                      return (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">所属作品</span>
                            <span className="text-white">{character.work}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {selectedNode.type === 'staff' && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">详细信息</h4>
                    {(() => {
                      const s = selectedNode.data as Staff;
                      return (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">职位</span>
                            <span className="text-white">{s.role}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">参与作品</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {s.works.map((w) => (
                                <span key={w} className="px-2 py-0.5 text-xs rounded bg-accent-500/20 text-accent-400">
                                  {w}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full rounded-xl bg-primary-800/30 border border-accent-500/20 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>点击节点查看详情</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={startNodeSelectorOpen}
        onClose={() => setStartNodeSelectorOpen(false)}
        title="选择起始节点"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setStartNodeType(null)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                startNodeType === null
                  ? 'bg-accent-500 text-primary-900'
                  : 'bg-primary-700/50 text-gray-300 hover:bg-primary-700'
              }`}
            >
              全部
            </button>
            {(Object.keys(nodeLabels) as NodeType[]).map((type) => (
              <button
                key={type}
                onClick={() => setStartNodeType(type)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  startNodeType === type
                    ? 'bg-accent-500 text-primary-900'
                    : 'bg-primary-700/50 text-gray-300 hover:bg-primary-700'
                }`}
              >
                {nodeLabels[type]}
              </button>
            ))}
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {startNodes
              .filter((n) => !startNodeType || n.type === startNodeType)
              .map((node) => (
                <button
                  key={node.id}
                  onClick={() => focusOnNode(node.id)}
                  className="w-full p-3 rounded-lg bg-primary-700/30 hover:bg-primary-700/50 text-left transition-colors flex items-center gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: nodeColors[node.type] }}
                  >
                    {(() => {
                      const Icon = nodeIcons[node.type];
                      return <Icon className="w-4 h-4 text-primary-900" />;
                    })()}
                  </div>
                  <span className="text-white">{node.label}</span>
                </button>
              ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
