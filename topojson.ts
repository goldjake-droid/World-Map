export function topoDecode(topology: any, object: any) {
  const arcs = topology.arcs;
  const t = topology.transform;

  function decArc(ai: number) {
    const arc = arcs[ai < 0 ? ~ai : ai];
    const cs: [number, number][] = [];
    let x = 0, y = 0;
    for (const p of arc) {
      x += p[0]; y += p[1];
      cs.push([x * t.scale[0] + t.translate[0], y * t.scale[1] + t.translate[1]]);
    }
    if (ai < 0) cs.reverse();
    return cs;
  }

  function decRing(r: number[]) {
    const cs: [number, number][] = [];
    for (const ai of r) {
      const d = decArc(ai);
      for (let i = 0; i < d.length; i++) {
        if (i > 0 || !cs.length) cs.push(d[i]);
      }
    }
    return cs;
  }

  function decGeom(g: any) {
    if (g.type === 'Polygon') return { type: 'Polygon', coordinates: g.arcs.map(decRing) };
    if (g.type === 'MultiPolygon') return { type: 'MultiPolygon', coordinates: g.arcs.map((p: any) => p.map(decRing)) };
    return { type: g.type, coordinates: [] };
  }

  return {
    type: 'FeatureCollection' as const,
    features: object.geometries.map((g: any) => ({
      type: 'Feature' as const,
      id: g.id,
      properties: g.properties || {},
      geometry: decGeom(g),
    })),
  };
}

export function topoMesh(topology: any, object: any) {
  const arcs = topology.arcs;
  const t = topology.transform;

  function decArc(ai: number) {
    const arc = arcs[ai < 0 ? ~ai : ai];
    const cs: [number, number][] = [];
    let x = 0, y = 0;
    for (const p of arc) {
      x += p[0]; y += p[1];
      cs.push([x * t.scale[0] + t.translate[0], y * t.scale[1] + t.translate[1]]);
    }
    if (ai < 0) cs.reverse();
    return cs;
  }

  const used: Record<number, boolean> = {};
  for (const g of object.geometries) {
    const allArcs = g.type === 'Polygon' ? g.arcs : g.type === 'MultiPolygon' ? g.arcs.flat() : [];
    for (const r of allArcs) for (const a of r) { used[a < 0 ? ~a : a] = true; }
  }

  const lines = Object.keys(used).map(k => decArc(parseInt(k)));
  return { type: 'MultiLineString' as const, coordinates: lines };
}
