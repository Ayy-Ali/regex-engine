import { useEffect, useMemo, useState } from "react";

const SVG_CLASS = "block h-auto w-full min-w-[640px] max-w-[1280px]";

const VIEW_ORDER = [
  { id: "parseTree", label: "Parse Tree" },
  { id: "nfa", label: "NFA" },
  { id: "dfa", label: "DFA" },
  { id: "minimizedDfa", label: "Min DFA" },
];

const flattenTree = (root) => {
  let nextX = 0;
  let maxDepth = 0;

  const walk = (node, depth = 0) => {
    maxDepth = Math.max(maxDepth, depth);
    const children = (node.children || []).map((child) => walk(child, depth + 1));
    const x =
      children.length === 0
        ? nextX++
        : (children[0].x + children[children.length - 1].x) / 2;

    return { ...node, x, depth, children };
  };

  const laidOut = walk(root);
  const nodes = [];
  const edges = [];

  const visit = (node) => {
    nodes.push(node);
    node.children.forEach((child) => {
      edges.push({ from: node, to: child });
      visit(child);
    });
  };

  visit(laidOut);

  return {
    nodes,
    edges,
    maxDepth,
    width: Math.max(laidOut.x + 1, 1),
  };
};

const layoutGraph = (graph) => {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const startNode = graph.nodes.find((node) => node.isStart) || graph.nodes[0];
  const levelById = new Map();
  const queue = [];

  if (startNode) {
    levelById.set(startNode.id, 0);
    queue.push(startNode.id);
  }

  while (queue.length > 0) {
    const currentId = queue.shift();
    const currentLevel = levelById.get(currentId);

    graph.edges
      .filter((edge) => edge.from === currentId && edge.to !== currentId)
      .forEach((edge) => {
        if (!levelById.has(edge.to)) {
          levelById.set(edge.to, currentLevel + 1);
          queue.push(edge.to);
        }
      });
  }

  let fallbackLevel = Math.max(...levelById.values(), 0);
  graph.nodes.forEach((node) => {
    if (!levelById.has(node.id)) {
      fallbackLevel += 1;
      levelById.set(node.id, fallbackLevel);
    }
  });

  const levels = new Map();
  graph.nodes.forEach((node) => {
    const level = levelById.get(node.id) || 0;
    if (!levels.has(level)) {
      levels.set(level, []);
    }
    levels.get(level).push(node);
  });

  const orderedLevels = Array.from(levels.keys()).sort((left, right) => left - right);
  const xGap = 152;
  const yGap = 88;
  const maxPerLevel = Math.max(...Array.from(levels.values()).map((group) => group.length), 1);
  const width = Math.max(420, orderedLevels.length * xGap + 112);
  const height = Math.max(260, maxPerLevel * yGap + 96);
  const positioned = new Map();

  orderedLevels.forEach((level, levelIndex) => {
    const group = levels
      .get(level)
      .slice()
      .sort((left, right) => left.state - right.state);
    const spacing = height / (group.length + 1);

    group.forEach((node, index) => {
      positioned.set(node.id, {
        ...node,
        x: 72 + levelIndex * xGap,
        y: spacing * (index + 1),
      });
    });
  });

  return {
    nodes: graph.nodes.map((node) => positioned.get(node.id) || nodesById.get(node.id)),
    edges: graph.edges.map((edge) => ({
      ...edge,
      fromNode: positioned.get(edge.from),
      toNode: positioned.get(edge.to),
    })),
    width,
    height,
  };
};

const renderTreeView = (tree) => {
  const layout = flattenTree(tree);
  const xGap = 140;
  const yGap = 96;
  const width = Math.max(400, layout.width * xGap + 72);
  const height = Math.max(220, (layout.maxDepth + 1) * yGap + 72);

  return (
    <svg
      className={SVG_CLASS}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {layout.edges.map((edge, index) => {
        const x1 = edge.from.x * xGap + 52;
        const y1 = edge.from.depth * yGap + 40;
        const x2 = edge.to.x * xGap + 52;
        const y2 = edge.to.depth * yGap + 40;

        return (
          <path
            key={`tree-edge-${index}`}
            d={`M ${x1} ${y1} C ${x1} ${y1 + 36}, ${x2} ${y2 - 36}, ${x2} ${y2}`}
            stroke="rgba(147, 171, 200, 0.6)"
            strokeWidth="2"
            fill="none"
          />
        );
      })}

      {layout.nodes.map((node) => {
        const x = node.x * xGap + 52;
        const y = node.depth * yGap + 40;
        return (
          <g key={node.id} transform={`translate(${x}, ${y})`}>
            <rect
              x="-52"
              y="-24"
              rx="16"
              width="104"
              height="48"
              fill="rgba(17, 33, 58, 0.96)"
              stroke="rgba(94, 234, 212, 0.35)"
            />
            <text
              x="0"
              y="-2"
              textAnchor="middle"
              fontSize="11"
              fontFamily="IBM Plex Sans"
              fill="#edf6ff"
            >
              {node.label}
            </text>
            {node.meta?.preview ? (
              <text
                x="0"
                y="14"
                textAnchor="middle"
                fontSize="9"
                fontFamily="IBM Plex Sans"
                fill="#93abc8"
              >
                {node.meta.preview}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};

const renderGraphView = (graph) => {
  const layout = layoutGraph(graph);

  return (
    <svg
      className={SVG_CLASS}
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker
          id="graph-arrow"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(147, 171, 200, 0.75)" />
        </marker>
      </defs>

      {layout.edges.map((edge, index) => {
        const from = edge.fromNode;
        const to = edge.toNode;

        if (!from || !to) {
          return null;
        }

        if (from.id === to.id) {
          const loopPath = `M ${from.x} ${from.y - 28} C ${from.x + 34} ${from.y - 62}, ${from.x - 34} ${from.y - 62}, ${from.x} ${from.y - 28}`;
          return (
            <g key={`loop-${index}`}>
              <path
                d={loopPath}
                stroke="rgba(147, 171, 200, 0.7)"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#graph-arrow)"
              />
              <text
                x={from.x}
                y={from.y - 66}
                textAnchor="middle"
                fontSize="9"
                fontFamily="IBM Plex Sans"
                fill="#5eead4"
              >
                {edge.label}
              </text>
            </g>
          );
        }

        const controlOffset = from.x === to.x ? 64 : Math.max(28, Math.abs(to.x - from.x) * 0.24);
        const path = `M ${from.x + 24} ${from.y} C ${from.x + controlOffset} ${from.y}, ${to.x - controlOffset} ${to.y}, ${to.x - 24} ${to.y}`;
        const labelX = (from.x + to.x) / 2;
        const labelY = (from.y + to.y) / 2 - (from.y === to.y ? 20 : 8);
        const labelWidth = Math.min(Math.max(edge.label.length * 6.4 + 14, 44), 96);

        return (
          <g key={`edge-${index}`}>
            <path
              d={path}
              stroke="rgba(147, 171, 200, 0.7)"
              strokeWidth="2"
              fill="none"
              markerEnd="url(#graph-arrow)"
            />
            <rect
              x={labelX - labelWidth / 2}
              y={labelY - 11}
              width={labelWidth}
              height="18"
              rx="9"
              fill="rgba(7, 17, 31, 0.92)"
            />
            <text
              x={labelX}
              y={labelY}
              dominantBaseline="middle"
              textAnchor="middle"
              fontSize="9"
              fontFamily="IBM Plex Sans"
              fill="#5eead4"
            >
              {edge.label}
            </text>
          </g>
        );
      })}

      {layout.nodes.map((node) => (
        <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
          {node.isStart ? (
            <path
              d="M -58 0 L -30 0"
              stroke="rgba(245, 158, 11, 0.9)"
              strokeWidth="2.5"
              fill="none"
              markerEnd="url(#graph-arrow)"
            />
          ) : null}
          <circle
            r="24"
            fill="rgba(17, 33, 58, 0.96)"
            stroke={node.isAccepting ? "rgba(245, 158, 11, 0.85)" : "rgba(94, 234, 212, 0.38)"}
            strokeWidth="2"
          />
          {node.isAccepting ? (
            <circle
              r="19"
              fill="none"
              stroke="rgba(245, 158, 11, 0.7)"
              strokeWidth="1.75"
            />
          ) : null}
          <text
            x="0"
            y={node.subset ? "-3" : "1"}
            textAnchor="middle"
            fontSize="11"
            fontFamily="IBM Plex Sans"
            fill="#edf6ff"
          >
            {node.label}
          </text>
          {node.subset ? (
            <text
              x="0"
              y="10"
              textAnchor="middle"
              fontSize="8"
              fontFamily="IBM Plex Sans"
              fill="#93abc8"
            >
              {`{${node.subset.join(",")}}`}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
};

export default function VisualizationPanel({ visualization, automata }) {
  const availableViews = useMemo(
    () => VIEW_ORDER.filter((view) => visualization?.[view.id]),
    [visualization],
  );
  const [activeView, setActiveView] = useState("nfa");

  useEffect(() => {
    if (!availableViews.some((view) => view.id === activeView)) {
      setActiveView(availableViews[0]?.id || "nfa");
    }
  }, [activeView, availableViews]);

  if (!visualization) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-muted">
        {automata?.supported === false
          ? "Visualization is available for the supported automata subset."
          : "Parse tree, NFA, and DFA diagrams will appear here."}
      </div>
    );
  }

  const currentView = activeView === "parseTree" ? visualization.parseTree : visualization?.[activeView];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-muted">NFA</div>
          <div className="mt-2 font-display text-2xl text-ink">{automata?.nfaStates ?? "?"}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-muted">DFA</div>
          <div className="mt-2 font-display text-2xl text-ink">{automata?.dfaStates ?? "?"}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-muted">Minimized</div>
          <div className="mt-2 font-display text-2xl text-ink">
            {automata?.minimizedStates ?? "?"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {availableViews.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => setActiveView(view.id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${
              activeView === view.id ? "tab-active" : "tab-idle"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-slate-950/30 p-4">
        <div className="flex min-w-full justify-center">
          {activeView === "parseTree"
            ? renderTreeView(currentView)
            : renderGraphView(currentView)}
        </div>
      </div>
    </div>
  );
}
