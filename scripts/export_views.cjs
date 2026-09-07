// Export preview triangles only. Never overwrite the validated STL or print files.
const path = require('path');
const j = require('@jscad/modeling');
const root = path.resolve(__dirname, '..');
const current = require(path.join(root, 'precision-grasper.js'));
const triangleMeshes = geometry => (Array.isArray(geometry) ? geometry : [geometry])
  .filter(g => j.geometries.geom3.toPolygons(g).length > 0)
  .map(g => ({color: g.color || [.5, .5, .5], triangles: j.geometries.geom3.toPolygons(g)
    .flatMap(p => p.vertices.slice(2).map((v, i) => [p.vertices[0], p.vertices[i + 1], v]))}));
const views = [
  ['assembly', 'assembly', 'docs/images/assembly.png'],
  ['handle', 'handle', 'docs/images/handle.png'],
  ['clamp', 'clamp', 'docs/images/clamp.png'],
  ['head', 'head', 'docs/images/head-v02.png'],
  ['head-layout', 'head-layout', 'docs/images/head-v02-layout.png']
].map(([name, view, destination]) => ({name, destinations:[destination],
  meshes: triangleMeshes(current.main({view, opening:20, screwLength:12}))}));
const handleLayout = current.layout().map((g, i) => ({part:current.HANDLE_NAMES[i], bounds:j.measurements.measureBoundingBox(g)}));
process.stdout.write(JSON.stringify({views, handleLayout}));
