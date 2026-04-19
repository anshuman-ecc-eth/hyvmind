import PublicGraphView from "../pages/PublicGraphView";

export default function LandingGraphDiagram() {
  return (
    <div
      className="relative w-full h-full font-mono"
      data-ocid="landing.canvas_target"
    >
      <PublicGraphView isLanding={true} />
    </div>
  );
}
