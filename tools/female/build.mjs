/**
 * Builds systems-female/*.glb from the HuBMAP Human Reference Atlas female body.
 *
 *   node --max-old-space-size=8192 build.mjs <dir-with-f-v1.10.glb-and-f-v1.5.glb>
 *
 * Sources (all redistributable with attribution, see ATTRIBUTION.md):
 *   - Browne & Schlehlein, 3D Reference Organ Set for Female v1.10 + v1.5
 *     (HuBMAP, CC BY 4.0). v1.5 only supplies the ischium and pubis, which
 *     v1.10 dropped; both releases share one coordinate frame.
 *   - Bones the female source does not model (skull, ribs, shoulder, arm,
 *     hand, foot) are borrowed from the male atlas in ../../systems, fitted by
 *     least squares onto landmarks both bodies share, and tagged
 *     "[male-derived]" so the app can label and toggle them.
 *
 * Output matches the male files: one mesh node per structure, world-space
 * positions + indices (the app computes normals), Y-up metres, front = +Z,
 * body's left = +X.
 */
import { NodeIO, Document } from '@gltf-transform/core';
import { MeshoptSimplifier } from 'meshoptimizer';
import { writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..', '..');
const SRC = process.argv[2];
if (!SRC) { console.error('usage: node build.mjs <hra-raw-dir>'); process.exit(1); }
const OUT = join(APP, 'systems-female');
mkdirSync(OUT, { recursive: true });

// Triangle budget per system after simplification (source has 7.7M).
const BUDGET = {
    iskelet: 380000, eklem: 110000, kas: 70000, dolasim: 300000,
    sinir: 420000, 'ic-organlar': 480000, lenf: 50000, deri: 260000
};
const MAX_ERROR = 0.01;   // meshopt relative error cap per structure

// ---------------------------------------------------------------------------
// geometry helpers
// ---------------------------------------------------------------------------
const io = new NodeIO();

/** World-space positions + indices of one mesh node (all primitives merged). */
function bakeNode(node) {
    const m = node.getWorldMatrix();
    const pos = [], idx = [];
    for (const prim of node.getMesh().listPrimitives()) {
        const p = prim.getAttribute('POSITION');
        const base = pos.length / 3;
        const v = [0, 0, 0];
        for (let i = 0; i < p.getCount(); i++) {
            p.getElement(i, v);
            pos.push(
                m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
                m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
                m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]);
        }
        const ind = prim.getIndices();
        if (ind) for (let i = 0; i < ind.getCount(); i++) idx.push(base + ind.getScalar(i));
        else for (let i = 0; i < p.getCount(); i++) idx.push(base + i);
    }
    return weld(new Float32Array(pos), new Uint32Array(idx));
}

/** Merge coincident vertices (needed for smooth normals and simplification). */
function weld(pos, idx) {
    const map = new Map(), remap = new Uint32Array(pos.length / 3), out = [];
    for (let i = 0; i < pos.length / 3; i++) {
        const k = `${Math.round(pos[i * 3] * 1e5)},${Math.round(pos[i * 3 + 1] * 1e5)},${Math.round(pos[i * 3 + 2] * 1e5)}`;
        let j = map.get(k);
        if (j === undefined) { j = out.length / 3; map.set(k, j); out.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); }
        remap[i] = j;
    }
    const tri = [];
    for (let i = 0; i < idx.length; i += 3) {
        const a = remap[idx[i]], b = remap[idx[i + 1]], c = remap[idx[i + 2]];
        if (a !== b && b !== c && a !== c) tri.push(a, b, c);
    }
    return { pos: new Float32Array(out), idx: new Uint32Array(tri) };
}

function simplifyMesh(g, ratio) {
    if (ratio >= 0.999 || g.idx.length < 300) return g;
    const target = Math.max(120, Math.floor(g.idx.length * ratio / 3) * 3);
    const [dst] = MeshoptSimplifier.simplify(g.idx, g.pos, 3, target, MAX_ERROR);
    // compact unused vertices
    const used = new Int32Array(g.pos.length / 3).fill(-1), pos = [];
    const idx = new Uint32Array(dst.length);
    for (let i = 0; i < dst.length; i++) {
        let j = used[dst[i]];
        if (j < 0) { j = used[dst[i]] = pos.length / 3; pos.push(g.pos[dst[i] * 3], g.pos[dst[i] * 3 + 1], g.pos[dst[i] * 3 + 2]); }
        idx[i] = j;
    }
    return { pos: new Float32Array(pos), idx };
}

function bbox(g) {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < g.pos.length; i += 3) for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], g.pos[i + k]); max[k] = Math.max(max[k], g.pos[i + k]);
    }
    return { min, max, center: min.map((v, k) => (v + max[k]) / 2) };
}
const centerOf = (gs) => {   // bbox centre of several geometries together
    const b = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const g of gs) { const x = bbox(g); for (let k = 0; k < 3; k++) { b.min[k] = Math.min(b.min[k], x.min[k]); b.max[k] = Math.max(b.max[k], x.max[k]); } }
    return b.min.map((v, k) => (v + b.max[k]) / 2);
};
/** Centre of the lowest `band` metres of a geometry (distal end of a long bone). */
function bottomOf(g, band = 0.03) {
    const y0 = bbox(g).min[1]; let s = [0, 0, 0], n = 0;
    for (let i = 0; i < g.pos.length; i += 3) if (g.pos[i + 1] < y0 + band) { s[0] += g.pos[i]; s[1] += g.pos[i + 1]; s[2] += g.pos[i + 2]; n++; }
    return s.map(v => v / n);
}

/** Least-squares uniform scale + translation mapping points P onto Q. */
function fitScaleTranslate(P, Q) {
    const mean = (A) => A[0].map((_, k) => A.reduce((s, p) => s + p[k], 0) / A.length);
    const pc = mean(P), qc = mean(Q);
    let num = 0, den = 0;
    P.forEach((p, i) => { for (let k = 0; k < 3; k++) { num += (p[k] - pc[k]) * (Q[i][k] - qc[k]); den += (p[k] - pc[k]) ** 2; } });
    const s = num / den, t = qc.map((v, k) => v - s * pc[k]);
    const rms = Math.sqrt(P.reduce((acc, p, i) => acc + p.reduce((a, v, k) => a + (s * v + t[k] - Q[i][k]) ** 2, 0), 0) / P.length);
    return { s, t, rms };
}
const applyFit = (g, f) => {
    const pos = new Float32Array(g.pos.length);
    for (let i = 0; i < pos.length; i++) pos[i] = g.pos[i] * f.s + f.t[i % 3];
    return { pos, idx: g.idx };
};
/** Rotate about `pivot` by the rotation taking unit vector a onto unit vector b. */
function rotateOnto(g, pivot, a, b) {
    const cross = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const s = Math.hypot(...cross), c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    if (s < 1e-9) return g;
    const k = cross.map(v => v / s), ang = Math.atan2(s, c);
    const ca = Math.cos(ang), sa = Math.sin(ang), C = 1 - ca;
    const R = [
        ca + k[0] * k[0] * C, k[0] * k[1] * C - k[2] * sa, k[0] * k[2] * C + k[1] * sa,
        k[1] * k[0] * C + k[2] * sa, ca + k[1] * k[1] * C, k[1] * k[2] * C - k[0] * sa,
        k[2] * k[0] * C - k[1] * sa, k[2] * k[1] * C + k[0] * sa, ca + k[2] * k[2] * C];
    const pos = new Float32Array(g.pos.length);
    for (let i = 0; i < pos.length; i += 3) {
        const x = g.pos[i] - pivot[0], y = g.pos[i + 1] - pivot[1], z = g.pos[i + 2] - pivot[2];
        pos[i] = R[0] * x + R[1] * y + R[2] * z + pivot[0];
        pos[i + 1] = R[3] * x + R[4] * y + R[5] * z + pivot[1];
        pos[i + 2] = R[6] * x + R[7] * y + R[8] * z + pivot[2];
    }
    return { pos, idx: g.idx };
}
const norm = (v) => { const l = Math.hypot(...v); return v.map(x => x / l); };

/** First principal axis of a point set, oriented to point downward (-Y). */
function principalAxis(pts) {
    const c = [0, 1, 2].map(k => pts.reduce((s, p) => s + p[k], 0) / pts.length);
    const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const p of pts) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) M[i][j] += (p[i] - c[i]) * (p[j] - c[j]);
    let v = [0, -1, 0];
    for (let it = 0; it < 50; it++) v = norm([0, 1, 2].map(i => M[i][0] * v[0] + M[i][1] * v[1] + M[i][2] * v[2]));
    return v[1] > 0 ? v.map(x => -x) : v;
}

// ---------------------------------------------------------------------------
// female source
// ---------------------------------------------------------------------------
const PREFIX_RE = /^(VH_F_|Allen_|Yao_)/;
const RENAME = {
    'ginviva of upper jaw': 'gingiva of upper jaw', 'ginviva of lower jaw': 'gingiva of lower jaw',
    'lateral perichondular surface': 'lateral perichondral surface',
    'medial perichondular surface': 'medial perichondral surface',
    'fat': 'adipose tissue of breast',
    'gallbladder': 'gallbladder',
    // representative lymph node (Yao) — a single detailed node, not the whole chain
    'afferent lymphatic vessel': 'afferent lymphatic vessel (representative lymph node)',
    'efferent lymph node': 'efferent lymphatic vessel (representative lymph node)',
    'capsule of lymph node': 'capsule of lymph node (representative)',
    'follicles': 'lymphoid follicles (representative lymph node)',
    'medulla of lymph node': 'medulla of lymph node (representative)',
    'paracortex': 'paracortex (representative lymph node)',
    'blood vasculature': 'blood vessels (representative lymph node)'
};
const ABBREV = [[/\bposmed\b/, 'posteromedial'], [/\bpostmed\b/, 'posteromedial'], [/\bantlat\b/, 'anterolateral'],
    [/\bpos\b/, 'posterior'], [/\bant\b/, 'anterior'], [/\bmed\b/, 'medial'], [/\bsep\b/, 'septal'],
    [/\binf\b/, 'inferior'], [/\bsup\b/, 'superior'], [/\bHTH\b/, 'hypothalamus']];
// Spelling errors in the source names, corrected for display only.
const TYPOS = [[/\bfibria\b/i, 'fimbria'], [/\bjejenum\b/i, 'jejunum'], [/\bucinate\b/i, 'uncinate'],
    [/\bhepataduodenal\b/i, 'hepatoduodenal'], [/\bheptopancreatic\b/i, 'hepatopancreatic'],
    [/\bsegmennt\b/i, 'segment'], [/\bsegm$/i, 'segment'], [/\bepiglotic\b/i, 'epiglottic'],
    [/\bopthalmic\b/i, 'ophthalmic'], [/\beigth\b/i, 'eighth'], [/^ingulo parahippocampal/i, 'cingulo-parahippocampal'],
    [/\bschlemms\b/i, "Schlemm's"], [/\bdistal most\b/i, 'distal-most'], [/(\D)\d$/, '$1']];
// Names that only make sense inside their source folder.
const CONTEXT = {
    'cornua': 'cornua of uterus', 'broad ligament': 'broad ligament of uterus',
    'basal plate': 'basal plate of placenta', 'chorionic plate': 'chorionic plate of placenta',
    'suspensory ligaments': 'suspensory ligaments of breast', 'sternum': 'body of sternum',
    'manubrium': 'manubrium of sternum', 'hilum': 'hilum of lung', 'hilum upper': 'upper hilum of lung',
    'hilum lower': 'lower hilum of lung', 'hilum middle': 'middle hilum of lung',
    'duodenum superior': 'superior part of duodenum', 'duodenum descending': 'descending part of duodenum',
    'duodenum horizontal': 'horizontal part of duodenum', 'duodenum ascending': 'ascending part of duodenum',
    'ileum terminal': 'terminal ileum'
};

function cleanName(raw) {
    let n = raw.trim().replace(PREFIX_RE, '');
    let side = '', part = '';
    for (let k = 0; k < 2; k++) {   // "renal_papilla_L_a": part, then side
        const m = n.match(/_(L|R)$/);
        if (m && !side) { side = '.' + m[1].toLowerCase(); n = n.slice(0, -2); continue; }
        const seg = n.match(/_([a-z])$/);
        if (seg && !part) { part = ` (part ${seg[1].toUpperCase()})`; n = n.slice(0, -2); }
    }
    n = n.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
    // side written as a word inside the name: "pulmonary vein L superior", "dura mater right"
    const mid = n.match(/ (L|R)\b/);
    if (mid && !side) { side = '.' + mid[1].toLowerCase(); n = n.replace(/ (L|R)\b/, ''); }
    const word = n.match(/ (left|right)$/);
    if (word && !side) { side = word[1] === 'left' ? '.l' : '.r'; n = n.slice(0, -word[0].length); }
    if (RENAME[n]) n = RENAME[n];
    for (const [re, full] of ABBREV) n = n.replace(re, full);
    for (const [re, fix] of TYPOS) n = n.replace(re, fix);
    if (CONTEXT[n.toLowerCase()]) n = CONTEXT[n.toLowerCase()];
    n = n.charAt(0).toUpperCase() + n.slice(1);
    return n + part + side;
}

function systemFor(path, name) {
    const top = path[1] || '';
    if (top === 'VH_F_integumentary_system') return 'deri';
    if (top === 'VH_F_lymphatic_system' || /palatine_tonsil/.test(path.join('/'))) return 'lenf';
    if (top === 'VH_F_circulatory_system') return 'dolasim';
    if (top === 'VH_F_nervous_system') return 'sinir';
    if (top === 'VH_F_muscular_system') return 'kas';
    if (top === 'VH_F_skeletal_system') return /disk|pulposus/i.test(name) ? 'eklem' : 'iskelet';
    if (top === 'VH_F_lower_limb') return /ligament|meniscus|cartilage|enthesis/i.test(name) ? 'eklem' : 'iskelet';
    return 'ic-organlar';   // respiratory, urinary, digestive, reproductive
}

async function readFemale(file, keep) {
    const doc = await io.read(file);
    const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
    const out = [];
    scene.traverse((node) => {
        if (!node.getMesh()) return;
        const path = [];
        for (let p = node; p; p = p.getParentNode()) path.unshift(p.getName());
        if (keep && !keep(path)) return;
        out.push({ raw: node.getName(), path, name: cleanName(node.getName()), system: systemFor(path, node.getName()), geom: bakeNode(node) });
    });
    return out;
}

// ---------------------------------------------------------------------------
// male bones to borrow
// ---------------------------------------------------------------------------
const HEAD_RE = /^(Frontal bone|Parietal bone|Occipital bone|Temporal bone|Sphenoid bone|Sinus of sphenoid bone|Sinus of frontal bone|Ethmoid bone|(Anterior|Middle|Posterior) cells of ethmoid bone|Nasal bone|Lacrimal bone|Zygomatic bone|Maxilla|Palatine bone|Vomer|Inferior nasal concha bone|Mandible|Hyoid bone|Incus|Malleus|Stapes)(\.[lr])?$/;
const THORAX_RE = /^((First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth) rib|Costal cartilage of .* rib|Xiphoid process|Clavicle|Scapula)(\.[lr])?$/;
const ARM_RE = /^(Humerus|Radius|Ulna|Scaphoid bone|Lunate bone|Triquetrum bone|Pisiform bone|Trapezium bone|Trapezoid bone|Capitate bone|Hamate bone|.* metacarpal bone|.* phalanx of .* finger of hand)\.[lr]$/;
const FOOT_RE = /^(Talus|Calcaneus|Navicular bone|Cuboid bone|.* cuneiform bone|.* metatarsal bone|.* phalanx of .* finger of foot|Sesamoid bones of foot)\.[lr]$/;

async function readMale(file) {
    const doc = await io.read(file);
    const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
    const out = new Map();
    scene.traverse((node) => { if (node.getMesh()) out.set(node.getName(), bakeNode(node)); });
    return out;
}

// ---------------------------------------------------------------------------
await MeshoptSimplifier.ready;
console.log('reading female v1.10 …');
const female = await readFemale(join(SRC, 'f-v1.10.glb'));
console.log('reading female v1.5 (ischium, pubis) …');
const pelvis15 = await readFemale(join(SRC, 'f-v1.5.glb'), (p) => p.some(x => /VH_F_(ischium|pubis)$/.test(x)));
const structures = [...female, ...pelvis15];
console.log(`female structures: ${female.length} + ${pelvis15.length} from v1.5`);

const F = (re) => structures.filter(s => re.test(s.raw)).map(s => s.geom);
const one = (re) => { const g = F(re); if (g.length !== 1) throw new Error(`female landmark ${re}: ${g.length} matches`); return g[0]; };

console.log('reading male skeleton + eyes …');
const male = await readMale(join(APP, 'systems', 'iskelet.glb'));
const maleNerv = await readMale(join(APP, 'systems', 'sinir.glb'));
const M = (name) => { const g = male.get(name) || maleNerv.get(name); if (!g) throw new Error('male landmark missing: ' + name); return g; };
const fits = {};

// Head: upper neck, eyeballs, upper teeth, and the cranial vault sitting
// SCALP mm inside the female head skin (top, back, both sides above the ears).
// Neck/eyes/teeth alone sit below the vault and over-scaled it (~8%).
{
    const SCALP = 0.006, ABOVE_EYES = 0.035;
    const P = [], Q = [];
    ['Atlas (C1)', 'Axis (C2)'].forEach((n, i) => {
        P.push(bbox(M(n)).center); Q.push(bbox(one(new RegExp(`^VH_F_cervical_vertebra_${i + 1}$`))).center);
    });
    const mEye = [], fEye = [];
    for (const s of ['l', 'r']) {
        mEye.push(bbox(M(`Posterior segment of eyeball.${s}`)).center);
        fEye.push(bbox(one(new RegExp(`^VH_F_sclera_${s.toUpperCase()}$`))).center);
    }
    P.push(...mEye); Q.push(...fEye);
    P.push(centerOf([...male.keys()].filter(n => /^Upper .*(incisor|canine|premolar|molar)/.test(n)).map(n => male.get(n))));
    Q.push(bbox(one(/^VH_F_set_of_upper_jaw_teeth$/)).center);

    const vaultBox = (geoms, yMin) => {
        const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for (const g of geoms) for (let i = 0; i < g.pos.length; i += 3) {
            if (g.pos[i + 1] < yMin) continue;
            for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], g.pos[i + k]); max[k] = Math.max(max[k], g.pos[i + k]); }
        }
        return { min, max, c: min.map((v, k) => (v + max[k]) / 2) };
    };
    const extremes = (b, inset) => [
        [b.c[0], b.max[1] - inset, b.c[2]],          // vertex (top)
        [b.c[0], b.c[1], b.min[2] + inset],          // back
        [b.max[0] - inset, b.c[1], b.c[2]],          // left side
        [b.min[0] + inset, b.c[1], b.c[2]]];         // right side
    const mVault = vaultBox(['Frontal bone', 'Parietal bone.l', 'Parietal bone.r', 'Occipital bone']
        .map(n => male.get(n)).filter(Boolean), (mEye[0][1] + mEye[1][1]) / 2 + ABOVE_EYES);
    const fVault = vaultBox([one(/^VH_F_skin$/)], (fEye[0][1] + fEye[1][1]) / 2 + ABOVE_EYES);
    P.push(...extremes(mVault, 0)); Q.push(...extremes(fVault, SCALP));
    fits.head = fitScaleTranslate(P, Q);
}
// Thorax + shoulder girdle: thoracic vertebrae + manubrium + sternum
{
    const P = [], Q = [];
    for (let i = 1; i <= 12; i++) { P.push(bbox(M(`Vertebra T${i}`)).center); Q.push(bbox(one(new RegExp(`^VH_F_thoracic_vertebra_${i}$`))).center); }
    P.push(bbox(M('Manubrium of sternum')).center); Q.push(bbox(one(/^VH_F_manubrium$/)).center);
    P.push(bbox(M('Body of sternum')).center); Q.push(bbox(one(/^VH_F_sternum$/)).center);
    fits.thorax = fitScaleTranslate(P, Q);
}
// Feet: tibia + fibula of the same leg (whole-bone centre and distal end)
for (const s of ['l', 'r']) {
    const S = s.toUpperCase(), P = [], Q = [];
    for (const [mn, fre] of [['Tibia', new RegExp(`^VH_F_tibia_${S}$`)], ['Fibula', new RegExp(`^VH_F_fibula_${S}$`)]]) {
        const mg = M(`${mn}.${s}`), fg = one(fre);
        P.push(bbox(mg).center, bottomOf(mg)); Q.push(bbox(fg).center, bottomOf(fg));
    }
    fits['foot_' + s] = fitScaleTranslate(P, Q);
}

// Female skin, for aligning the arms with the body's own arms.
const skin = one(/^VH_F_skin$/);

const borrowed = [];
for (const [name, g] of male) {
    let fit, region;
    if (HEAD_RE.test(name)) { fit = fits.head; region = 'head'; }
    else if (THORAX_RE.test(name)) { fit = fits.thorax; region = 'thorax'; }
    else if (ARM_RE.test(name)) { fit = fits.thorax; region = 'arm_' + name.slice(-1); }
    else if (FOOT_RE.test(name)) { fit = fits['foot_' + name.slice(-1)]; region = 'foot'; }
    else continue;
    borrowed.push({ raw: name, name: `${name} [male-derived]`, system: 'iskelet', region, geom: applyFit(g, fit), borrowed: true });
}

// Arms: after the thorax fit, swing each arm about the shoulder joint so its
// long axis follows the female body's own arm (measured on the skin).
const armReport = {};
for (const s of ['l', 'r']) {
    const parts = borrowed.filter(b => b.region === 'arm_' + s);
    const hum = parts.find(b => b.raw === `Humerus.${s}`).geom;
    const hb = bbox(hum);
    const pivot = [0, 1, 2].map(k => { // centre of the humeral head = top 4 cm of the humerus
        let acc = 0, n = 0;
        for (let i = 0; i < hum.pos.length; i += 3) if (hum.pos[i + 1] > hb.max[1] - 0.04) { acc += hum.pos[i + k]; n++; }
        return acc / n;
    });
    const armPts = [];
    for (const b of parts) for (let i = 0; i < b.geom.pos.length; i += 3) armPts.push([b.geom.pos[i], b.geom.pos[i + 1], b.geom.pos[i + 2]]);
    const maleAxis = principalAxis(armPts);
    const armBottom = Math.min(...parts.map(b => bbox(b.geom).min[1]));
    // skin vertices on this side, lateral to the trunk, between shoulder and hand
    const sign = s === 'l' ? 1 : -1;
    const trunkHalf = Math.abs(pivot[0]) - 0.02;
    const skinPts = [];
    for (let i = 0; i < skin.pos.length; i += 3) {
        const x = skin.pos[i], y = skin.pos[i + 1];
        if (sign * x > trunkHalf && y < pivot[1] - 0.08 && y > armBottom) skinPts.push([x, y, skin.pos[i + 2]]);
    }
    const femaleAxis = principalAxis(skinPts);
    const angle = Math.acos(Math.min(1, maleAxis.reduce((a, v, k) => a + v * femaleAxis[k], 0))) * 180 / Math.PI;
    for (const b of parts) b.geom = rotateOnto(b.geom, pivot, maleAxis, femaleAxis);
    armReport[s] = { turnDeg: +angle.toFixed(1), skinPts: skinPts.length };
}

console.log('fits:', Object.fromEntries(Object.entries(fits).map(([k, f]) => [k, { scale: +f.s.toFixed(3), rmsMm: +(f.rms * 1000).toFixed(1) }])));
console.log('arm turn:', armReport);

// ---------------------------------------------------------------------------
// simplify + write
// ---------------------------------------------------------------------------
const all = [...structures, ...borrowed];
const bySystem = {};
for (const s of all) (bySystem[s.system] ||= []).push(s);

const meta = {};
for (const [sys, list] of Object.entries(bySystem)) {
    // unique names: identical cleaned names get a running number
    const seen = new Map();
    for (const s of list) {
        const n = seen.get(s.name) || 0; seen.set(s.name, n + 1);
        if (n) s.name = s.name.replace(/(\.[lr])?$/, ` (${n + 1})$1`);
    }
    const rawTris = list.filter(s => !s.borrowed).reduce((a, s) => a + s.geom.idx.length / 3, 0);
    const borrowedTris = list.filter(s => s.borrowed).reduce((a, s) => a + s.geom.idx.length / 3, 0);
    const ratio = Math.min(1, (BUDGET[sys] - borrowedTris) / rawTris);

    const doc = new Document();
    const buffer = doc.createBuffer();
    const scene = doc.createScene(sys);
    let tris = 0;
    for (const s of list) {
        const g = s.borrowed ? s.geom : simplifyMesh(s.geom, ratio);
        if (!g.idx.length) { console.warn('dropped empty', s.name); continue; }
        tris += g.idx.length / 3;
        const prim = doc.createPrimitive()
            .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(g.pos).setBuffer(buffer))
            .setIndices(doc.createAccessor().setType('SCALAR')
                .setArray(g.pos.length / 3 > 65535 ? g.idx : new Uint16Array(g.idx)).setBuffer(buffer));
        scene.addChild(doc.createNode(s.name).setMesh(doc.createMesh(s.name).addPrimitive(prim)));
    }
    const file = join(OUT, `${sys}.glb`);
    await io.write(file, doc);
    const mb = +(statSync(file).size / 1048576).toFixed(2);
    meta[sys] = {
        id: sys, dosya: `systems-female/${sys}.glb`, obje: list.length,
        odunc: list.filter(s => s.borrowed).length,
        ucgen_ham: rawTris + borrowedTris, decimate_orani: +(tris / (rawTris + borrowedTris)).toFixed(4), boyut_mb: mb
    };
    console.log(`${sys.padEnd(12)} ${String(list.length).padStart(4)} structures  ${String(Math.round(tris)).padStart(7)} tris  ${mb} MB`);
}
writeFileSync(join(APP, 'data', 'systems-female.json'), JSON.stringify(meta, null, 1));
writeFileSync(join(APP, 'data', 'female-fit.json'), JSON.stringify({ fits, arms: armReport }, null, 1));
console.log('done →', OUT);
