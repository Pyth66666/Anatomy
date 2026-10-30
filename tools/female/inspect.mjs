// Prints every mesh node of the HuBMAP female GLB with its system path, world
// bounding box and triangle count. Usage: node inspect.mjs <file.glb> [filter]
import { NodeIO } from '@gltf-transform/core';
import { getBounds } from '@gltf-transform/core';

const [file, filter] = process.argv.slice(2);
const doc = await new NodeIO().read(file);
const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];

const rows = [];
scene.traverse((node) => {
    const mesh = node.getMesh();
    if (!mesh) return;
    const path = [];
    for (let p = node; p; p = p.getParentNode()) path.unshift(p.getName());
    let tris = 0;
    for (const prim of mesh.listPrimitives()) {
        const idx = prim.getIndices();
        tris += (idx ? idx.getCount() : prim.getAttribute('POSITION').getCount()) / 3;
    }
    rows.push({ path: path.join(' / '), tris, box: getBounds(node) });
});

const all = getBounds(scene);
console.log('scene bounds min', all.min.map(v => v.toFixed(3)), 'max', all.max.map(v => v.toFixed(3)));
for (const r of rows) {
    if (filter && !r.path.toLowerCase().includes(filter.toLowerCase())) continue;
    const c = r.box.min.map((v, i) => ((v + r.box.max[i]) / 2).toFixed(3));
    console.log(`${String(r.tris).padStart(7)}  [${c.join(',')}]  ${r.path}`);
}
console.log('mesh nodes:', rows.length);
