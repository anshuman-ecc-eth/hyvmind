import { Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type * as THREE from "three";

interface LayoutNode {
  id: string;
  label: string;
  type: string;
  level: number;
  x: number;
  y: number;
  upvotes: number;
  downvotes: number;
  originalTokenSequence?: string;
  curationId?: string;
  swarmId?: string;
  opacity?: number;
}

interface LayoutLink {
  source: string;
  target: string;
  relationType?: string;
  isInterpretationTokenEdge?: boolean;
  edgeType?: "from" | "to";
}

interface GraphScene3DProps {
  nodes: LayoutNode[];
  links: LayoutLink[];
  filteredNodes: LayoutNode[];
  filteredLinks: LayoutLink[];
  subgraphNodes: LayoutNode[];
  subgraphLinks: LayoutLink[];
  nodeSize: number;
  edgeThickness: number;
  theme: string | undefined;
  resolvedTheme: string | undefined;
  hoveredNode: LayoutNode | null;
  selectedNode: LayoutNode | null;
  subgraphMode: boolean;
  focusedNode: string | null;
  onNodeClick: (node: LayoutNode) => void;
  onNodeHover: (node: LayoutNode | null) => void;
}

const Z_SCALE = 150;

function getNodeColor(type: string, resolvedTheme?: string): string {
  const isDark = resolvedTheme === "dark";
  switch (type) {
    case "curation":
      return isDark ? "#7C3AED" : "#6D28D9";
    case "swarm":
      return isDark ? "#2563EB" : "#1D4ED8";
    case "location":
      return isDark ? "#059669" : "#047857";
    case "lawToken":
      return isDark ? "#D97706" : "#B45309";
    case "interpretationToken":
      return isDark ? "#DC2626" : "#B91C1C";
    case "sublocation":
      return isDark ? "#0891B2" : "#0E7490";
    default:
      return isDark ? "#6B7280" : "#9CA3AF";
  }
}

interface Node3DProps {
  node: LayoutNode;
  position: [number, number, number];
  nodeSize: number;
  resolvedTheme: string | undefined;
  isHovered: boolean;
  isSelected: boolean;
  isFocused: boolean;
  onNodeClick: (node: LayoutNode) => void;
  onNodeHover: (node: LayoutNode | null) => void;
}

function Node3D({
  node,
  position,
  nodeSize,
  resolvedTheme,
  isHovered,
  isSelected,
  isFocused,
  onNodeClick,
  onNodeHover,
}: Node3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const radius = Math.max(4, nodeSize - node.level * 2);
  const color = getNodeColor(node.type, resolvedTheme);

  const scale: [number, number, number] =
    isHovered || isSelected || isFocused ? [1.3, 1.3, 1.3] : [1, 1, 1];

  const emissiveIntensity = isSelected
    ? 0.5
    : isFocused
      ? 0.35
      : isHovered
        ? 0.2
        : 0;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onNodeClick(node);
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onNodeHover(node);
    if (document.body) document.body.style.cursor = "pointer";
  };

  const handlePointerOut = () => {
    onNodeHover(null);
    if (document.body) document.body.style.cursor = "auto";
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: 3D mesh interaction via pointer events
    <mesh
      ref={meshRef}
      position={position}
      scale={scale}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        roughness={0.4}
        metalness={0.3}
      />
      {(isHovered || isSelected || isFocused) && (
        <Html distanceFactor={200} zIndexRange={[100, 0]}>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "11px",
              color: "white",
              background: "rgba(0,0,0,0.7)",
              padding: "2px 5px",
              borderRadius: "3px",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {node.label.substring(0, 20)}
          </span>
        </Html>
      )}
    </mesh>
  );
}

interface Edge3DProps {
  link: LayoutLink;
  sourcePos: [number, number, number];
  targetPos: [number, number, number];
  edgeThickness: number;
  resolvedTheme: string | undefined;
}

function Edge3D({
  link,
  sourcePos,
  targetPos,
  edgeThickness,
  resolvedTheme,
}: Edge3DProps) {
  const isDark = resolvedTheme === "dark";
  const color = link.isInterpretationTokenEdge
    ? isDark
      ? "#DC2626"
      : "#B91C1C"
    : isDark
      ? "#444"
      : "#999";

  const points: [number, number, number][] = [sourcePos, targetPos];

  if (link.isInterpretationTokenEdge) {
    return (
      <Line
        points={points}
        color={color}
        lineWidth={edgeThickness}
        dashed
        dashScale={2}
        dashSize={3}
        gapSize={3}
      />
    );
  }

  return <Line points={points} color={color} lineWidth={edgeThickness} />;
}

function SceneContent({
  visibleNodes,
  visibleLinks,
  nodeSize,
  edgeThickness,
  resolvedTheme,
  hoveredNode,
  selectedNode,
  focusedNode,
  onNodeClick,
  onNodeHover,
  zOffsets,
}: {
  visibleNodes: LayoutNode[];
  visibleLinks: LayoutLink[];
  nodeSize: number;
  edgeThickness: number;
  resolvedTheme: string | undefined;
  hoveredNode: LayoutNode | null;
  selectedNode: LayoutNode | null;
  focusedNode: string | null;
  onNodeClick: (node: LayoutNode) => void;
  onNodeHover: (node: LayoutNode | null) => void;
  zOffsets: Map<string, number>;
}) {
  const nodeMap = useMemo(() => {
    const m = new Map<string, LayoutNode>();
    for (const n of visibleNodes) m.set(n.id, n);
    return m;
  }, [visibleNodes]);

  const getPos = (node: LayoutNode): [number, number, number] => [
    node.x,
    node.y,
    zOffsets.get(node.id) ?? node.level * Z_SCALE,
  ];

  return (
    <>
      {visibleNodes.map((node) => (
        <Node3D
          key={node.id}
          node={node}
          position={getPos(node)}
          nodeSize={nodeSize}
          resolvedTheme={resolvedTheme}
          isHovered={hoveredNode?.id === node.id}
          isSelected={selectedNode?.id === node.id}
          isFocused={focusedNode === node.id}
          onNodeClick={onNodeClick}
          onNodeHover={onNodeHover}
        />
      ))}
      {visibleLinks.map((link, i) => {
        const sourceNode = nodeMap.get(link.source);
        const targetNode = nodeMap.get(link.target);
        if (!sourceNode || !targetNode) return null;
        return (
          <Edge3D
            key={`${link.source}-${link.target}-${i}`}
            link={link}
            sourcePos={getPos(sourceNode)}
            targetPos={getPos(targetNode)}
            edgeThickness={edgeThickness}
            resolvedTheme={resolvedTheme}
          />
        );
      })}
    </>
  );
}

export function GraphScene3D({
  nodes,
  filteredNodes,
  filteredLinks,
  subgraphNodes,
  subgraphLinks,
  nodeSize,
  edgeThickness,
  resolvedTheme,
  hoveredNode,
  selectedNode,
  subgraphMode,
  focusedNode,
  onNodeClick,
  onNodeHover,
}: GraphScene3DProps) {
  const allNodes = subgraphMode ? subgraphNodes : filteredNodes;
  const allLinks = subgraphMode ? subgraphLinks : filteredLinks;

  // Stable z offsets — only recompute when node IDs change
  const nodeIdKey = useMemo(() => nodes.map((n) => n.id).join(","), [nodes]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally keyed by nodeIdKey
  const zOffsets = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of nodes) {
      map.set(n.id, n.level * Z_SCALE + (Math.random() - 0.5) * 20);
    }
    return map;
  }, [nodeIdKey]);

  const isDark = resolvedTheme === "dark";

  return (
    <Canvas
      style={{ width: "100%", height: "100%" }}
      camera={{ position: [500, 500, 500], fov: 50 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[isDark ? "#0a0a0a" : "#f5f5f5"]} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        screenSpacePanning
        minDistance={100}
        maxDistance={3000}
      />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-500, 500, 500]} intensity={0.3} />
      <SceneContent
        visibleNodes={allNodes}
        visibleLinks={allLinks}
        nodeSize={nodeSize}
        edgeThickness={edgeThickness}
        resolvedTheme={resolvedTheme}
        hoveredNode={hoveredNode}
        selectedNode={selectedNode}
        focusedNode={focusedNode}
        onNodeClick={onNodeClick}
        onNodeHover={onNodeHover}
        zOffsets={zOffsets}
      />
    </Canvas>
  );
}
