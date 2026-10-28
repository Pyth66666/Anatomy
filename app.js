/**
 * Tam Boy Anatomi Simülatörü
 * Model: Z-Anatomy (CC-BY-SA 4.0) / BodyParts3D — DBCLS (CC-BY-SA 2.1 JP)
 *
 * Mimari notu: her sistem GLB'sinde yapılar AYRI mesh olarak gelir (278–684 adet).
 * Bunları çizim çağrısı başına 1'e indirmek için tek bir BufferGeometry'de
 * birleştirip her köşeye `structureId` yazıyoruz. Işın testi vurduğu üçgenin
 * köşesinden id'yi okuyup yapının GERÇEK adını veriyor — beyin simülatöründeki
 * gibi koordinat tahminine gerek yok.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { t, getLang, setLang, applyStatic, onLangChange } from './i18n.js';

// Hover picking tests the pointer against ~2M triangles once every system is
// loaded. Brute force took ~160 ms per frame; a BVH brings it under 1 ms.
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// -------------------------------------------------------------
// SYSTEM DEFINITIONS (names/descriptions live in i18n.js as sys.<id>.name/desc)
// -------------------------------------------------------------
const SYSTEMS = [
    { id: 'iskelet', latin: 'Systema skeletale', hex: '#e8dcc8', oncelik: 0 },
    { id: 'eklem', latin: 'Articulationes', hex: '#9fd8cb', oncelik: 1 },
    { id: 'kas', latin: 'Systema musculare', hex: '#c8564f', oncelik: 2 },
    { id: 'dolasim', latin: 'Systema cardiovasculare', hex: '#d94f5c', oncelik: 3 },
    { id: 'sinir', latin: 'Systema nervosum', hex: '#f2c14e', oncelik: 4 },
    { id: 'ic-organlar', latin: 'Systemata visceralia', hex: '#c98a5e', oncelik: 5 },
    { id: 'lenf', latin: 'Systema lymphoideum', hex: '#7fb2e5', oncelik: 6 }
];
const sysName = (id) => t(`sys.${id}.name`);
const sysDesc = (id) => t(`sys.${id}.desc`);

// 3B veri sürümü — GLB'ler yeniden üretildiğinde tools/stamp_data.py ile
// güncellenir. Tarayıcı önbelleği aksi halde eski modeli servis ediyor
// (dolaşım sistemi 676 yapıya çıktığı hâlde 22 yapılık eski dosya geliyordu).
const DATA_VERSION = 'cce8b7a6';

// Structure name suffixes: .l/.r side, parentheses = alternative/older term
const SIDES = new Set(['l', 'r', 'ol', 'or']);

// Örtü katmanları: altındaki yapıları tamamen kapatan zarlar. Anatomik olarak
// doğru ama açıkken kasları/organları göstermiyor, o yüzden ayrı mesh'e alınıp
// varsayılan olarak kapatılıyor.
const COVER_RE = /fascia|aponeuros|retinacul|peritone|pleura|dura mater|pericardi|omentum|epicardium/i;
const isCover = (name) => COVER_RE.test(name);

// Üreme sistemi yapıları. Okul/sınıf ortamında varsayılan olarak kapalı;
// anatomik bütünlük için silinmiyor, ayrı katmana alınıp anahtarla açılıyor.
// (Üretra idrar yolunun da parçası olduğu için kapsam dışında bırakıldı.)
const GENITAL_RE = /penis|scrot|testis|testicul|epididym|prostat|seminal|ductus deferens|spermat|glans|corpus cavernos|corpus spongios|uter|ovar|vagin|clitor|salping/i;
const isGenital = (name) => GENITAL_RE.test(name);

function parseStructureName(raw) {
    let name = (raw || '').trim();
    let side = null;

    const m = name.match(/\.(ol|or|l|r)$/i);
    if (m) {
        const key = m[1].toLowerCase();
        side = SIDES.has(key) ? t(`side.${key}`) : null;
        name = name.slice(0, -m[0].length);
    }
    // Blender kopya eki
    name = name.replace(/\.\d{3}$/, '');
    // Atlas artefacts: group markers (".g"/".j", e.g. "Pharynx.j"), stray
    // trailing quotes ("Central canal'") and names lost to encoding ("????").
    name = name.replace(/\.[gj]$/i, '').replace(/['"]+$/, '');
    if (/^\?+$/.test(name)) name = t('structure.unnamed');

    let note = null;
    if (/^\(.*\)$/.test(name)) {
        name = name.slice(1, -1);
        note = t('note.alt');
    }
    return { name: name.trim(), side, note };
}

// -------------------------------------------------------------
// UYGULAMA
// -------------------------------------------------------------
class AnatomyApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        const rect = this.container.getBoundingClientRect();
        this.width = Math.max(1, Math.round(rect.width) || window.innerWidth);
        this.height = Math.max(1, Math.round(rect.height) || window.innerHeight);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0d13);
        this.scene.fog = new THREE.FogExp2(0x0a0d13, 0.028);

        this.camera = new THREE.PerspectiveCamera(42, this.width / this.height, 0.05, 200);
        this.camera.position.set(0, 0.2, 6.2);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.minDistance = 0.4;
        this.controls.maxDistance = 20;

        // Dış grup yalnız DÖNER, iç grup ölçek/merkezleme taşır.
        // Tek grupta yapılırsa matris sırası (T·R·S) yüzünden model dönerken
        // merkezden kayıyor.
        this.bodyGroup = new THREE.Group();
        this.bodyPivot = new THREE.Group();
        this.bodyGroup.add(this.bodyPivot);
        this.scene.add(this.bodyGroup);

        this.loader = new GLTFLoader();
        this.layers = new Map();        // id -> {names, parts:[{kind,mesh,structureIds,colorAttr}], visible}
        this.loading = new Set();
        this.activeSystem = null;
        this.hovered = null;            // {systemId, structureId}
        this.selected = null;
        this.normalized = false;        // gövde ölçek/merkez dönüşümü uygulandı mı
        this.autoSpin = true;
        this.showHoverName = true;
        this.showCovers = false;     // fasya/periton gibi örtü zarları
        this.showGenital = true;     // üreme sistemi varsayılan AÇIK (anatomik bütünlük);
                                     // yalnız tanıtım videosunda kapatılıyor
        this.dimOpacity = 0.16;

        this.raycaster = new THREE.Raycaster();
        this.raycaster.firstHitOnly = true;
        this.pointer = new THREE.Vector2(-999, -999);
        this.pointerPx = { x: 0, y: 0 };

        applyStatic();
        this.initLights();
        this.buildSystemList();
        this.initEvents();
        this.initBrowser();
        onLangChange(() => this.refreshLanguage());

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        this.selectSystem('iskelet');
    }

    initLights() {
        this.scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x2a2118, 0.85));

        const key = new THREE.DirectionalLight(0xfff2e0, 1.7);
        key.position.set(3, 6, 5);
        this.scene.add(key);

        const fill = new THREE.DirectionalLight(0x9fc2ff, 0.6);
        fill.position.set(-5, 1, 3);
        this.scene.add(fill);

        const rim = new THREE.DirectionalLight(0xffffff, 0.75);
        rim.position.set(0, 3, -6);
        this.scene.add(rim);
    }

    // ---------------------------------------------------------
    // SİSTEM YÜKLEME + BİRLEŞTİRME
    // ---------------------------------------------------------
    async loadSystem(id) {
        if (this.layers.has(id) || this.loading.has(id)) return this.layers.get(id);
        this.loading.add(id);
        this.setLoading(true, t('loading.system', { name: sysName(id) }));

        const gltf = await this.loader.loadAsync(`systems/${id}.glb?v=${DATA_VERSION}`);

        // three.js GLTFLoader node adlarını animasyon bağlaması için sterilize
        // eder (nokta silinir, boşluk "_" olur) -> "Incus.l" adı "Incusl" olur.
        // Orijinal adı glTF JSON'undan associations üzerinden okuyoruz.
        const json = gltf.parser.json;
        const assoc = gltf.parser.associations;
        const originalName = (obj) => {
            const a = assoc.get(obj);
            if (a && a.nodes !== undefined && json.nodes[a.nodes]) {
                return json.nodes[a.nodes].name || obj.name;
            }
            return obj.name;
        };

        // Yapıları "ana" ve "örtü" olarak iki gruba ayırıp her grubu tek
        // geometride birleştir; köşe başına structureId yaz.
        const buckets = { main: [], cover: [], genital: [] };
        const names = [];
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse((child) => {
            if (!child.isMesh) return;
            const geom = child.geometry.clone();
            geom.applyMatrix4(child.matrixWorld);
            geom.deleteAttribute('uv');
            geom.deleteAttribute('tangent');
            if (!geom.attributes.normal) geom.computeVertexNormals();

            const structureId = names.length;
            const name = originalName(child) || t('structure.fallback', { n: structureId });
            names.push(name);

            const n = geom.attributes.position.count;
            const ids = new Float32Array(n).fill(structureId);
            geom.setAttribute('structureId', new THREE.BufferAttribute(ids, 1));
            const kova = isGenital(name) ? 'genital' : (isCover(name) ? 'cover' : 'main');
            buckets[kova].push(geom);
        });

        const sys = SYSTEMS.find(s => s.id === id);
        const layer = {
            id, names,
            baseColor: new THREE.Color(sys.hex),
            visible: true,
            parts: []
        };

        for (const kind of ['main', 'cover', 'genital']) {
            if (!buckets[kind].length) continue;
            const merged = mergeGeometries(buckets[kind]);
            buckets[kind].forEach(g => g.dispose());
            merged.computeBoundsTree();
            const colors = new Float32Array(merged.attributes.position.count * 3);
            merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: kind === 'cover' ? 0.5 : 0.62,
                metalness: 0.03,
                transparent: true,
                opacity: 1,
                side: THREE.DoubleSide
            }));
            mesh.name = `${id}:${kind}`;
            mesh.userData.systemId = id;
            mesh.visible = kind === 'main'
                || (kind === 'cover' && this.showCovers)
                || (kind === 'genital' && this.showGenital);

            layer.parts.push({
                kind, mesh,
                structureIds: merged.attributes.structureId.array,
                colorAttr: merged.attributes.color
            });
            this.bodyPivot.add(mesh);
        }

        this.layers.set(id, layer);
        this.paintLayer(layer);

        if (!this.normalized) this.normalizeBody();

        this.loading.delete(id);
        if (this.loading.size === 0) this.setLoading(false);
        this.refreshSystemList();
        return layer;
    }

    /** Gövdeyi sahne merkezine al ve sabit boya ölçekle (ilk tam boy sistemden). */
    normalizeBody() {
        const box = new THREE.Box3().setFromObject(this.bodyPivot);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        if (size.y < 0.001) return;

        const scale = 3.4 / size.y;
        this.bodyPivot.scale.setScalar(scale);
        this.bodyPivot.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
        this.normalized = true;
        this.bodyHeight = 3.4;
        this.setCamera('front', false);
    }

    // ---------------------------------------------------------
    // RENKLENDİRME
    // ---------------------------------------------------------
    paintLayer(layer) {
        const base = layer.baseColor;
        const isActive = layer.id === this.activeSystem;

        const hoverId = (this.hovered && this.hovered.systemId === layer.id) ? this.hovered.structureId : -1;
        const selId = (this.selected && this.selected.systemId === layer.id) ? this.selected.structureId : -1;

        // Her yapıya kararlı (deterministik) küçük bir ton farkı: aynı sistemdeki
        // komşu kaslar/kemikler tek düz renk yerine ayırt edilebilir olsun.
        // Ton, structureId'den değil TEMEL ADDAN türetilir; böylece bir yapının
        // sol ve sağ eşi aynı rengi alır (aksi halde gövde ortadan ikiye
        // bölünmüş gibi görünüyordu).
        if (!layer.shades) {
            layer.shades = new Float32Array(layer.names.length);
            for (let s = 0; s < layer.names.length; s++) {
                const nm = parseStructureName(layer.names[s]).name;
                let h = 0;
                for (let c = 0; c < nm.length; c++) h = (h * 31 + nm.charCodeAt(c)) % 100003;
                layer.shades[s] = 0.82 + 0.30 * (h / 100003);
            }
        }
        const shades = layer.shades;
        const dim = isActive ? 1 : 0.55;

        for (const part of layer.parts) {
            const colors = part.colorAttr.array;
            const ids = part.structureIds;
            for (let i = 0; i < ids.length; i++) {
                const k = dim * shades[ids[i]];
                let r = base.r * k, g = base.g * k, b = base.b * k;
                if (ids[i] === selId) { r = 1.0; g = 0.86; b = 0.35; }
                else if (ids[i] === hoverId) {
                    r = Math.min(1, r * 1.5 + 0.18);
                    g = Math.min(1, g * 1.5 + 0.18);
                    b = Math.min(1, b * 1.5 + 0.18);
                }
                colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
            }
            part.colorAttr.clearUpdateRanges();   // full upload
            part.colorAttr.needsUpdate = true;

            const mat = part.mesh.material;
            mat.opacity = isActive ? (part.kind === 'cover' ? 0.5 : 1) : this.dimOpacity;
            mat.depthWrite = mat.opacity > 0.9;
            mat.transparent = mat.opacity < 0.999;
            part.mesh.visible = layer.visible && (
                part.kind === 'main'
                || (part.kind === 'cover' && this.showCovers)
                || (part.kind === 'genital' && this.showGenital));
        }
    }

    repaintAll() {
        this.layers.forEach(l => this.paintLayer(l));
        this.syncHighlightVisibility();
    }

    /**
     * Recolour just the given structures. Hovering used to call repaintAll(),
     * which rewrote and re-uploaded >1M vertex colours every time the pointer
     * crossed into a new structure. Same colour rules as paintLayer().
     */
    paintStructures(systemId, sids) {
        const layer = this.layers.get(systemId);
        if (!layer || !layer.shades) return;
        const base = layer.baseColor;
        const dim = layer.id === this.activeSystem ? 1 : 0.55;
        const hoverId = (this.hovered && this.hovered.systemId === layer.id) ? this.hovered.structureId : -1;
        const selId = (this.selected && this.selected.systemId === layer.id) ? this.selected.structureId : -1;

        for (const part of layer.parts) {
            if (!part.ranges) part.ranges = structureRanges(part.structureIds);
            const colors = part.colorAttr.array;
            let touched = false;
            for (const sid of sids) {
                const range = part.ranges.get(sid);
                if (!range) continue;
                const k = dim * layer.shades[sid];
                let r = base.r * k, g = base.g * k, b = base.b * k;
                if (sid === selId) { r = 1.0; g = 0.86; b = 0.35; }
                else if (sid === hoverId) {
                    r = Math.min(1, r * 1.5 + 0.18);
                    g = Math.min(1, g * 1.5 + 0.18);
                    b = Math.min(1, b * 1.5 + 0.18);
                }
                for (let i = range[0]; i < range[1]; i++) {
                    colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
                }
                part.colorAttr.addUpdateRange(range[0] * 3, (range[1] - range[0]) * 3);
                touched = true;
            }
            if (touched) part.colorAttr.needsUpdate = true;
        }
    }

    /** Move the hover highlight from `prev` to this.hovered. */
    repaintHover(prev) {
        if (prev) this.paintStructures(prev.systemId, [prev.structureId]);
        if (this.hovered) this.paintStructures(this.hovered.systemId, [this.hovered.structureId]);
    }

    // ---------------------------------------------------------
    // ETKİLEŞİM
    // ---------------------------------------------------------
    /**
     * @param {boolean} secimiKoru  Yapıya tıklanarak gelindiyse seçim korunur;
     *   aksi halde (listeden sistem seçimi) temizlenir. Korunmazsa kullanıcı bir
     *   kemiğe dokunduğunda sistem değişiyor ama yapının adı panelden siliniyordu.
     */
    async selectSystem(id, secimiKoru = false) {
        const changed = id !== this.activeSystem;
        this.activeSystem = id;
        if (!secimiKoru) {
            this.selected = null;
            document.getElementById('structure-block').hidden = true;
            this.updateHighlight();
        }
        if (changed) {
            this.browseFilter = '';
            document.getElementById('structure-search').value = '';
        }
        this.refreshSystemList();
        this.showSystemInfo(id);
        this.renderBrowser();
        await this.loadSystem(id);
        this.showSystemInfo(id);   // yapı sayısı ancak katman yüklenince bilinir
        this.repaintAll();
        this.renderBrowser();
    }

    toggleLayer(id, on) {
        const layer = this.layers.get(id);
        if (on && !layer) { this.loadSystem(id); return; }
        if (!layer) return;
        layer.visible = on;
        this.paintLayer(layer);
        this.refreshSystemList();
        this.syncHighlightVisibility();
    }

    checkHover() {
        if (!this.showHoverName) return;

        // Only re-pick when something that affects the hit has changed.
        const c = this.camera.position;
        const key = `${this.pointer.x},${this.pointer.y},${this.bodyGroup.rotation.y},${c.x},${c.y},${c.z},${this.layers.size}`;
        if (key === this.lastHoverKey) return;
        this.lastHoverKey = key;
        if (this.pointer.x < -1) return;   // pointer is off the canvas
        const meshes = [];
        this.layers.forEach(l => l.parts.forEach(p => { if (p.mesh.visible) meshes.push(p.mesh); }));
        if (!meshes.length) return;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        const hits = this.raycaster.intersectObjects(meshes, false);

        if (!hits.length) {
            if (this.hovered) { const prev = this.hovered; this.hovered = null; this.repaintHover(prev); }
            this.hideTooltip();
            return;
        }

        const hit = hits[0];
        const layer = this.layers.get(hit.object.userData.systemId);
        const part = layer.parts.find(p => p.mesh === hit.object);
        const idx = this.nearestVertex(hit);
        const sid = part.structureIds[idx];

        if (!this.hovered || this.hovered.systemId !== layer.id || this.hovered.structureId !== sid) {
            const prev = this.hovered;
            this.hovered = { systemId: layer.id, structureId: sid };
            this.repaintHover(prev);
        }
        this.showTooltip(layer.names[sid]);
    }

    nearestVertex(hit) {
        const pos = hit.object.geometry.attributes.position;
        const tmp = new THREE.Vector3();
        let best = hit.face.a, bestD = Infinity;
        for (const idx of [hit.face.a, hit.face.b, hit.face.c]) {
            tmp.fromBufferAttribute(pos, idx).applyMatrix4(hit.object.matrixWorld);
            const d = tmp.distanceToSquared(hit.point);
            if (d < bestD) { bestD = d; best = idx; }
        }
        return best;
    }

    selectStructure() {
        if (!this.hovered) return;
        this.selected = { ...this.hovered };
        this.showSelectedStructure();
        this.updateHighlight();

        if (this.selected.systemId !== this.activeSystem) this.selectSystem(this.selected.systemId, true);
        else { this.repaintAll(); this.renderBrowser(); }
    }

    /**
     * Select a structure from the browser list or prev/next and fly to it.
     * About 7% of structures sit inside others (ossicles, heart valves,
     * brainstem nuclei, deep muscles) and can't be clicked on the model, so
     * this is the path that reaches every one of them.
     */
    async focusStructure(systemId, sid) {
        this.selected = { systemId, structureId: sid };
        if (systemId !== this.activeSystem) await this.selectSystem(systemId, true);
        else this.repaintAll();
        this.showSelectedStructure();
        this.updateHighlight();
        this.renderBrowser();
        this.flyToStructure();
    }

    stepStructure(dir) {
        const entries = this.browseEntries();
        if (!entries.length) return;
        const selSid = (this.selected && this.selected.systemId === this.activeSystem) ? this.selected.structureId : -1;
        let i = entries.findIndex(e => e.sid === selSid);
        i = i < 0 ? (dir > 0 ? 0 : entries.length - 1) : (i + dir + entries.length) % entries.length;
        this.focusStructure(this.activeSystem, entries[i].sid);
    }

    // ---------------------------------------------------------
    // STRUCTURE BROWSER
    // ---------------------------------------------------------
    initBrowser() {
        this.browseFilter = '';
        const search = document.getElementById('structure-search');
        search.addEventListener('input', () => {
            this.browseFilter = search.value.trim().toLowerCase();
            this.renderBrowser();
        });
        search.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.stepStructure(1); }
        });
        document.getElementById('structure-list').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-sid]');
            if (btn) this.focusStructure(this.activeSystem, Number(btn.dataset.sid));
        });
        document.getElementById('prev-structure').addEventListener('click', () => this.stepStructure(-1));
        document.getElementById('next-structure').addEventListener('click', () => this.stepStructure(1));

        // Seen through anything in front of it, so buried structures still show.
        this.highlightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffd766, transparent: true, opacity: 0.38,
            depthTest: false, depthWrite: false, side: THREE.DoubleSide
        });
    }

    /** Active system's structures, sorted by display name, filtered by search. */
    browseEntries() {
        const layer = this.layers.get(this.activeSystem);
        if (!layer) return [];
        if (!layer.sorted || layer.sortedLang !== getLang()) {
            layer.sorted = layer.names.map((raw, sid) => {
                const p = parseStructureName(raw);
                return { sid, label: p.side ? `${p.name} — ${p.side}` : p.name };
            }).sort((x, y) => x.label.localeCompare(y.label));
            layer.sortedLang = getLang();
        }
        const f = this.browseFilter;
        return f ? layer.sorted.filter(e => e.label.toLowerCase().includes(f)) : layer.sorted;
    }

    renderBrowser() {
        const list = document.getElementById('structure-list');
        const layer = this.layers.get(this.activeSystem);
        const entries = this.browseEntries();
        document.getElementById('browse-count').textContent = !layer ? ''
            : (this.browseFilter ? `${entries.length} / ${layer.names.length}` : `${layer.names.length}`);

        const selSid = (this.selected && this.selected.systemId === this.activeSystem) ? this.selected.structureId : -1;
        list.innerHTML = !layer ? ''
            : entries.length
                ? entries.map(e => `<li><button data-sid="${e.sid}"${e.sid === selSid ? ' class="active"' : ''}>${escapeHtml(e.label)}</button></li>`).join('')
                : `<li class="empty">${t('browse.none')}</li>`;

        const active = list.querySelector('button.active');
        if (active && (active.offsetTop < list.scrollTop
            || active.offsetTop + active.offsetHeight > list.scrollTop + list.clientHeight)) {
            list.scrollTop = active.offsetTop - list.clientHeight / 2;
        }
    }

    /** Rebuild the see-through overlay for the selected structure. */
    updateHighlight() {
        if (this.highlight) {
            this.bodyPivot.remove(this.highlight);
            this.highlight.children.forEach(m => m.geometry.dispose());
            this.highlight = null;
            this.highlightCenter = null;
        }
        if (!this.selected) return;
        const layer = this.layers.get(this.selected.systemId);
        if (!layer) return;
        const sid = this.selected.structureId;

        const group = new THREE.Group();
        for (const part of layer.parts) {
            if (!part.ranges) part.ranges = structureRanges(part.structureIds);
            const range = part.ranges.get(sid);
            if (!range) continue;
            const [r0, r1] = range;
            const src = part.mesh.geometry;
            const idx = src.index.array;
            const tris = [];
            for (let i = 0; i < idx.length; i += 3) {
                if (idx[i] >= r0 && idx[i] < r1) tris.push(idx[i] - r0, idx[i + 1] - r0, idx[i + 2] - r0);
            }
            const geom = new THREE.BufferGeometry();
            geom.setAttribute('position', new THREE.BufferAttribute(src.attributes.position.array.slice(r0 * 3, r1 * 3), 3));
            geom.setIndex(tris);
            const mesh = new THREE.Mesh(geom, this.highlightMaterial);
            mesh.renderOrder = 999;
            mesh.userData.part = part;
            group.add(mesh);
        }
        this.highlight = group;
        this.bodyPivot.add(group);
        const box = new THREE.Box3();
        group.children.forEach(m => { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox); });
        this.highlightCenter = box.isEmpty() ? null : box.getCenter(new THREE.Vector3());
        this.syncHighlightVisibility();
    }

    /** Keep the on-screen ring over the selected structure (tiny ones are otherwise invisible). */
    updateMarker() {
        const marker = document.getElementById('focus-marker');
        const shown = this.highlight && this.highlightCenter && this.highlight.children.some(m => m.visible);
        if (!shown) { marker.hidden = true; return; }
        const p = this.bodyPivot.localToWorld(this.highlightCenter.clone()).project(this.camera);
        if (p.z > 1 || Math.abs(p.x) > 1.1 || Math.abs(p.y) > 1.1) { marker.hidden = true; return; }
        marker.hidden = false;
        marker.style.transform = `translate(${(p.x + 1) / 2 * this.width}px, ${(1 - p.y) / 2 * this.height}px)`;
    }

    syncHighlightVisibility() {
        if (!this.highlight) return;
        this.highlight.children.forEach(m => { m.visible = m.userData.part.mesh.visible; });
    }

    flyToStructure() {
        if (!this.highlight || !this.highlight.children.length) return;
        const box = new THREE.Box3();
        this.highlight.children.forEach(m => { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox); });
        // bodyGroup's spin is reset to 0 by flyTo, so bodyPivot space is enough.
        box.applyMatrix4(this.bodyPivot.matrix);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3()).length();
        // Look from the front (+z) unless the structure sits in the back half.
        const dir = new THREE.Vector3(0, 0.15, center.z >= -0.02 ? 1 : -1).normalize();
        // Floor keeps tiny structures (ossicles ~3 mm) in anatomical context.
        const dist = THREE.MathUtils.clamp(size * 1.8, 0.85, 6);

        this.autoSpin = false;
        document.getElementById('spin-btn').setAttribute('aria-pressed', 'false');
        this.updateSpinLabel();
        this.lastView = null;   // resize refit is for whole-body presets only
        this.flyTo(center.clone().addScaledVector(dir, dist), center);
    }

    showSelectedStructure() {
        if (!this.selected) return;
        const layer = this.layers.get(this.selected.systemId);
        const parsed = parseStructureName(layer.names[this.selected.structureId]);

        document.getElementById('structure-block').hidden = false;
        document.getElementById('structure-name').textContent = parsed.name;
        document.getElementById('structure-side').textContent =
            [parsed.side, parsed.note].filter(Boolean).join(' · ');
    }

    /** Re-render every piece of dynamic text after a language switch. */
    refreshLanguage() {
        this.buildSystemList();
        this.refreshSystemList();
        if (this.activeSystem) this.showSystemInfo(this.activeSystem);
        this.showSelectedStructure();
        this.renderBrowser();
        this.updateSpinLabel();
        if (this.loading.size) {
            this.setLoading(true, t('loading.system', { name: sysName([...this.loading][0]) }));
        }
    }

    updateSpinLabel() {
        document.getElementById('spin-btn').textContent = t(this.autoSpin ? 'btn.spinOn' : 'btn.spinOff');
    }

    // ---------------------------------------------------------
    // UI
    // ---------------------------------------------------------
    buildSystemList() {
        const box = document.getElementById('system-list');
        box.innerHTML = '';
        SYSTEMS.forEach((s) => {
            const row = document.createElement('div');
            row.className = 'system-row';
            row.dataset.system = s.id;
            row.innerHTML = `
                <button class="sys-main" data-system="${s.id}">
                    <span class="sys-dot" style="--c:${s.hex}"></span>
                    <span class="sys-name">${sysName(s.id)}</span>
                    <span class="sys-count"></span>
                </button>
                <button class="sys-eye" data-eye="${s.id}" title="${t('layer.toggle')}" aria-label="${t('layer.toggle')}">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                </button>`;
            box.appendChild(row);
        });

        // Rebuilt on every language switch; bind the click handler only once.
        if (box.dataset.bound) return;
        box.dataset.bound = '1';
        box.addEventListener('click', (e) => {
            const main = e.target.closest('.sys-main');
            if (main) { this.selectSystem(main.dataset.system); return; }
            const eye = e.target.closest('.sys-eye');
            if (eye) {
                const id = eye.dataset.eye;
                const layer = this.layers.get(id);
                this.toggleLayer(id, layer ? !layer.visible : true);
            }
        });
    }

    refreshSystemList() {
        SYSTEMS.forEach((s) => {
            const row = document.querySelector(`.system-row[data-system="${s.id}"]`);
            if (!row) return;
            const layer = this.layers.get(s.id);
            row.classList.toggle('active', s.id === this.activeSystem);
            row.classList.toggle('loaded', !!layer);
            row.classList.toggle('hidden-layer', !!layer && !layer.visible);
            row.classList.toggle('busy', this.loading.has(s.id));
            const count = row.querySelector('.sys-count');
            count.textContent = layer ? `${layer.names.length}` : '';
        });
    }

    showSystemInfo(id) {
        const s = SYSTEMS.find(x => x.id === id);
        document.getElementById('info-title').textContent = sysName(id);
        document.getElementById('info-latin').textContent = s.latin;
        document.getElementById('info-desc').textContent = sysDesc(id);
        const dot = document.getElementById('info-dot');
        dot.style.background = s.hex;
        dot.style.boxShadow = `0 0 12px ${s.hex}`;

        const meta = (this.systemsMeta || {})[id];
        const layer = this.layers.get(id);
        const specs = [];
        if (layer) specs.push([t('spec.count'), layer.names.length]);
        if (meta) {
            specs.push([t('spec.tris'), meta.ucgen_ham.toLocaleString(getLang() === 'ms' ? 'ms-MY' : 'en-US')]);
            specs.push([t('spec.decimate'), `${Math.round(meta.decimate_orani * 100)}%`]);
            specs.push([t('spec.size'), `${meta.boyut_mb} MB`]);
        }
        document.getElementById('info-specs').innerHTML =
            specs.map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join('');
    }

    showTooltip(raw) {
        const parsed = parseStructureName(raw);
        const tip = document.getElementById('tooltip');
        tip.textContent = parsed.side ? `${parsed.name} — ${parsed.side}` : parsed.name;
        tip.style.left = `${this.pointerPx.x}px`;
        tip.style.top = `${this.pointerPx.y}px`;
        tip.style.opacity = '1';
    }

    hideTooltip() {
        document.getElementById('tooltip').style.opacity = '0';
    }

    setLoading(on, text) {
        const ov = document.getElementById('loading-overlay');
        if (text) document.getElementById('loading-text').textContent = text;
        ov.classList.toggle('hidden', !on);
    }

    // ---------------------------------------------------------
    // KAMERA
    // ---------------------------------------------------------
    /**
     * Dikey (mobil) ekranda yatay görüş açısı daraldığı için model kadraja
     * sığmıyor. Ön ayar mesafeleri geniş ekrana göre yazıldı; burada en-boy
     * oranına göre ölçekleniyor.
     */
    fitDistance(pos, target) {
        const dir = pos.clone().sub(target);
        const d = dir.length();
        if (d < 1e-6) return pos.clone();
        const halfW = (this.bodyHeight || 3.4) * 0.30;
        const vFov = THREE.MathUtils.degToRad(this.camera.fov);
        const needed = halfW / (Math.tan(vFov / 2) * Math.max(this.camera.aspect, 0.3));
        const f = Math.max(1, Math.min(3, needed / d));
        return target.clone().add(dir.multiplyScalar(f));
    }

    setCamera(preset, animate = true) {
        const h = this.bodyHeight || 3.4;
        const views = {
            front: { pos: [0, 0, h * 1.55], target: [0, 0, 0] },
            back: { pos: [0, 0, -h * 1.55], target: [0, 0, 0] },
            left: { pos: [-h * 1.55, 0, 0], target: [0, 0, 0] },
            right: { pos: [h * 1.55, 0, 0], target: [0, 0, 0] },
            head: { pos: [0, h * 0.44, h * 0.42], target: [0, h * 0.42, 0] },
            torso: { pos: [0, h * 0.08, h * 0.72], target: [0, h * 0.08, 0] }
        };
        const v = views[preset] || views.front;
        const target = new THREE.Vector3(...v.target);
        // Ham ön ayar saklanır: ekran döndürülünce kadraj HAM değerden yeniden
        // hesaplanır, yoksa fit yalnız büyüttüğü için geri küçülmez.
        this.lastView = { pos: new THREE.Vector3(...v.pos), target: target.clone() };
        const pos = this.fitDistance(this.lastView.pos, target);
        if (!animate) {
            this.camera.position.copy(pos);
            this.controls.target.copy(target);
            this.controls.update();
            return;
        }
        this.flyTo(pos, target);
    }

    flyTo(pos, target) {
        const p0 = this.camera.position.clone();
        const t0 = this.controls.target.clone();
        const rot0 = ((this.bodyGroup.rotation.y + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        const id = (this.flightId || 0) + 1;
        this.flightId = id;
        this.flying = true;
        const start = performance.now();

        const step = () => {
            if (this.flightId !== id) return;
            const p = Math.min(1, (performance.now() - start) / 750);
            const e = 0.5 - Math.cos(p * Math.PI) / 2;
            this.camera.position.lerpVectors(p0, pos, e);
            this.controls.target.lerpVectors(t0, target, e);
            this.bodyGroup.rotation.y = rot0 * (1 - e);
            this.controls.update();
            if (p < 1) requestAnimationFrame(step);
            else this.flying = false;
        };
        step();
    }

    // ---------------------------------------------------------
    // OLAYLAR
    // ---------------------------------------------------------
    initEvents() {
        const resize = () => {
            const rect = this.container.getBoundingClientRect();
            const w = Math.max(1, Math.round(rect.width) || window.innerWidth);
            const h = Math.max(1, Math.round(rect.height) || window.innerHeight);
            if (w === this.width && h === this.height) return;
            this.width = w; this.height = h;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);

            // En-boy oranı değişti: kadrajı yeniden hesapla (telefon döndürme)
            if (!this.flying && this.normalized && this.lastView) {
                this.camera.position.copy(this.fitDistance(this.lastView.pos, this.lastView.target));
                this.controls.target.copy(this.lastView.target);
                this.controls.update();
            }
        };
        window.addEventListener('resize', resize);
        if (window.ResizeObserver) new ResizeObserver(resize).observe(this.container);

        const canvas = this.renderer.domElement;
        canvas.addEventListener('pointermove', (e) => {
            this.pointerPx = { x: e.clientX, y: e.clientY };
            this.pointer.x = (e.clientX / this.width) * 2 - 1;
            this.pointer.y = -(e.clientY / this.height) * 2 + 1;
        });
        canvas.addEventListener('pointerleave', () => {
            this.pointer.set(-999, -999);
            if (this.hovered) { const prev = this.hovered; this.hovered = null; this.repaintHover(prev); }
            this.hideTooltip();
        });
        canvas.addEventListener('pointerdown', () => { this.dragStart = performance.now(); });
        canvas.addEventListener('pointerup', () => {
            // Mobilde çekmeceyi kapatmak için yapılan dokunuş seçim sayılmaz
            // (bkz. mobile.js). Aksi halde altta duran sönük katmandaki yapı
            // seçilip aktif sistem değişiyordu.
            if (this.suppressTap) { this.suppressTap = false; return; }
            if (performance.now() - (this.dragStart || 0) < 220) this.selectStructure();
        });

        document.querySelectorAll('.cam-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setCamera(btn.dataset.cam));
        });

        document.getElementById('reset-view-btn').addEventListener('click', () => this.setCamera('front'));

        const spinBtn = document.getElementById('spin-btn');
        this.updateSpinLabel();
        spinBtn.addEventListener('click', () => {
            this.autoSpin = !this.autoSpin;
            spinBtn.setAttribute('aria-pressed', String(this.autoSpin));
            this.updateSpinLabel();
        });

        document.getElementById('lang-btn').addEventListener('click', () => {
            setLang(getLang() === 'en' ? 'ms' : 'en');
        });

        document.getElementById('opacity-slider').addEventListener('input', (e) => {
            this.dimOpacity = e.target.value / 100;
            this.repaintAll();
        });

        document.getElementById('xray-toggle').addEventListener('change', (e) => {
            const on = e.target.checked;
            this.layers.forEach(l => l.parts.forEach(p => { p.mesh.material.wireframe = on; }));
        });

        document.getElementById('cover-toggle').addEventListener('change', (e) => {
            this.showCovers = e.target.checked;
            this.repaintAll();
        });

        document.getElementById('genital-toggle').addEventListener('change', (e) => {
            this.showGenital = e.target.checked;
            this.repaintAll();
        });

        document.getElementById('hover-toggle').addEventListener('change', (e) => {
            this.showHoverName = e.target.checked;
            if (!this.showHoverName) { this.hovered = null; this.hideTooltip(); this.repaintAll(); }
        });
    }

    animate() {
        requestAnimationFrame(this.animate);
        if (this.autoSpin && !this.flying && this.controls.state === -1) {
            this.bodyGroup.rotation.y += 0.0022;
        }
        this.checkHover();
        this.controls.update();
        this.updateMarker();
        this.renderer.render(this.scene, this.camera);
    }
}

function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * structureId -> [firstVertex, endVertex). mergeGeometries() appends each
 * structure's vertices as one contiguous block, so a single scan finds them.
 */
function structureRanges(ids) {
    const ranges = new Map();
    let start = 0;
    for (let i = 1; i <= ids.length; i++) {
        if (i === ids.length || ids[i] !== ids[start]) {
            ranges.set(ids[start], [start, i]);
            start = i;
        }
    }
    return ranges;
}

/** Basit geometri birleştirme (yalnız position/normal/structureId, indeksli). */
function mergeGeometries(geoms) {
    let vCount = 0, iCount = 0;
    for (const g of geoms) {
        vCount += g.attributes.position.count;
        iCount += g.index ? g.index.count : g.attributes.position.count;
    }

    const position = new Float32Array(vCount * 3);
    const normal = new Float32Array(vCount * 3);
    const structureId = new Float32Array(vCount);
    const index = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);

    let vo = 0, io = 0;
    for (const g of geoms) {
        const p = g.attributes.position, n = g.attributes.normal, s = g.attributes.structureId;
        const c = p.count;
        position.set(p.array.subarray(0, c * 3), vo * 3);
        if (n) normal.set(n.array.subarray(0, c * 3), vo * 3);
        structureId.set(s.array.subarray(0, c), vo);

        if (g.index) {
            const src = g.index.array;
            for (let i = 0; i < src.length; i++) index[io + i] = src[i] + vo;
            io += src.length;
        } else {
            for (let i = 0; i < c; i++) index[io + i] = vo + i;
            io += c;
        }
        vo += c;
    }

    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(position, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    out.setAttribute('structureId', new THREE.BufferAttribute(structureId, 1));
    out.setIndex(new THREE.BufferAttribute(index, 1));
    out.computeBoundingSphere();
    return out;
}

const app = new AnatomyApp();
window.anatomyApp = app;

fetch('data/systems.json')
    .then(r => r.json())
    .then(m => { app.systemsMeta = m; app.showSystemInfo(app.activeSystem); })
    .catch(() => {});
