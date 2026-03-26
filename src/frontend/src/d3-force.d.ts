// Type shim for d3-force — package is installed but not in package.json types
declare module "d3-force" {
  export interface SimulationNodeDatum {
    index?: number;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
  }

  export interface SimulationLinkDatum<NodeDatum extends SimulationNodeDatum> {
    source: NodeDatum | string | number;
    target: NodeDatum | string | number;
    index?: number;
  }

  export interface Simulation<
    NodeDatum extends SimulationNodeDatum,
    _LinkDatum extends SimulationLinkDatum<NodeDatum> | undefined,
  > {
    restart(): this;
    stop(): this;
    tick(iterations?: number): this;
    nodes(): NodeDatum[];
    nodes(nodes: NodeDatum[]): this;
    alpha(): number;
    alpha(alpha: number): this;
    alphaMin(): number;
    alphaMin(min: number): this;
    alphaDecay(): number;
    alphaDecay(decay: number): this;
    alphaTarget(): number;
    alphaTarget(target: number): this;
    velocityDecay(): number;
    velocityDecay(decay: number): this;
    force(name: string): Force<NodeDatum, LinkDatum> | undefined;
    force(name: string, force: null): this;
    force(name: string, force: Force<NodeDatum, LinkDatum>): this;
    find(x: number, y: number, radius?: number): NodeDatum | undefined;
    on(typenames: string, listener: null): this;
    on(typenames: string, listener: (this: this) => void): this;
    on(typenames: string): ((this: this) => void) | undefined;
  }

  export interface Force<
    NodeDatum extends SimulationNodeDatum,
    _LinkDatum extends SimulationLinkDatum<NodeDatum> | undefined,
  > {
    (alpha: number): void;
    initialize?(nodes: NodeDatum[], random: () => number): void;
  }

  export interface ForceLink<
    NodeDatum extends SimulationNodeDatum,
    LinkDatum extends SimulationLinkDatum<NodeDatum>,
  > extends Force<NodeDatum, LinkDatum> {
    links(): LinkDatum[];
    links(links: LinkDatum[]): this;
    id(): (
      node: NodeDatum,
      i: number,
      nodesData: NodeDatum[],
    ) => string | number;
    id(
      id: (
        node: NodeDatum,
        i: number,
        nodesData: NodeDatum[],
      ) => string | number,
    ): this;
    distance():
      | number
      | ((link: LinkDatum, i: number, links: LinkDatum[]) => number);
    distance(distance: number): this;
    distance(
      distance: (link: LinkDatum, i: number, links: LinkDatum[]) => number,
    ): this;
    strength():
      | number
      | ((link: LinkDatum, i: number, links: LinkDatum[]) => number);
    strength(strength: number): this;
    strength(
      strength: (link: LinkDatum, i: number, links: LinkDatum[]) => number,
    ): this;
    iterations(): number;
    iterations(iterations: number): this;
  }

  export interface ForceManyBody<NodeDatum extends SimulationNodeDatum>
    extends Force<NodeDatum, undefined> {
    strength():
      | number
      | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number);
    strength(strength: number): this;
    strength(
      strength: (node: NodeDatum, i: number, nodes: NodeDatum[]) => number,
    ): this;
    theta(): number;
    theta(theta: number): this;
    distanceMin(): number;
    distanceMin(distance: number): this;
    distanceMax(): number;
    distanceMax(distance: number): this;
  }

  export interface ForceCenter<NodeDatum extends SimulationNodeDatum>
    extends Force<NodeDatum, undefined> {
    x(): number;
    x(x: number): this;
    y(): number;
    y(y: number): this;
    strength(): number;
    strength(strength: number): this;
  }

  export interface ForceCollide<NodeDatum extends SimulationNodeDatum>
    extends Force<NodeDatum, undefined> {
    radius():
      | number
      | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number);
    radius(radius: number): this;
    radius(
      radius: (node: NodeDatum, i: number, nodes: NodeDatum[]) => number,
    ): this;
    strength(): number;
    strength(strength: number): this;
    iterations(): number;
    iterations(iterations: number): this;
  }

  export function forceSimulation<NodeDatum extends SimulationNodeDatum>(
    nodes?: NodeDatum[],
  ): Simulation<NodeDatum, undefined>;

  export function forceLink<
    NodeDatum extends SimulationNodeDatum,
    LinkDatum extends SimulationLinkDatum<NodeDatum>,
  >(links?: LinkDatum[]): ForceLink<NodeDatum, LinkDatum>;

  export function forceManyBody<
    NodeDatum extends SimulationNodeDatum,
  >(): ForceManyBody<NodeDatum>;

  export function forceCenter<NodeDatum extends SimulationNodeDatum>(
    x?: number,
    y?: number,
  ): ForceCenter<NodeDatum>;

  export function forceCollide<NodeDatum extends SimulationNodeDatum>(
    radius?:
      | number
      | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number),
  ): ForceCollide<NodeDatum>;
}
