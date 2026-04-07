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

export default function VisualizationPanel({ tree, automata }) {
  if (!tree) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-muted">
        {automata?.supported === false
          ? "Visualization is available for the supported automata subset."
          : "Parse-tree visualization will appear here."}
      </div>
    );
  }

  const layout = flattenTree(tree);
  const xGap = 160;
  const yGap = 110;
  const width = Math.max(420, layout.width * xGap + 80);
  const height = Math.max(240, (layout.maxDepth + 1) * yGap + 80);

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

      <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-slate-950/30 p-4">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {layout.edges.map((edge, index) => {
            const x1 = edge.from.x * xGap + 60;
            const y1 = edge.from.depth * yGap + 48;
            const x2 = edge.to.x * xGap + 60;
            const y2 = edge.to.depth * yGap + 48;

            return (
              <path
                key={`edge-${index}`}
                d={`M ${x1} ${y1} C ${x1} ${y1 + 36}, ${x2} ${y2 - 36}, ${x2} ${y2}`}
                stroke="rgba(147, 171, 200, 0.6)"
                strokeWidth="2"
                fill="none"
              />
            );
          })}

          {layout.nodes.map((node) => {
            const x = node.x * xGap + 60;
            const y = node.depth * yGap + 48;
            return (
              <g key={node.id} transform={`translate(${x}, ${y})`}>
                <rect
                  x="-58"
                  y="-26"
                  rx="18"
                  width="116"
                  height="52"
                  fill="rgba(17, 33, 58, 0.96)"
                  stroke="rgba(94, 234, 212, 0.35)"
                />
                <text
                  x="0"
                  y="-2"
                  textAnchor="middle"
                  fontSize="12"
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
                    fontSize="10"
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
      </div>
    </div>
  );
}

