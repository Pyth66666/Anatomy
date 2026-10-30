/**
 * Veterinary viewer: one species from VT-ARIES (CC BY-NC-SA 4.0), laid out
 * like the human viewer — regions on the left, structure browser on the right.
 *
 * VT-ARIES stores one structure across several files named Name, Name1,
 * Name2… ("Cervical_Vertebrae", "Cervical_Vertebrae1" are both the cervical
 * spine, not C1). Those are merged into one component so the list and labels
 * don't invent vertebra numbers.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { computeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { t, getLang, setLang, applyStatic, onLangChange } from '../../i18n.js';
import { SPECIES } from './strings.js';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const requested = new URLSearchParams(location.search).get('specie');
const SPECIES_ID = SPECIES[requested] && !SPECIES[requested].soon ? requested : 'Canine';
const REGION_COLORS = ['#e8dcc8', '#c8564f', '#f2c14e', '#7fb2e5', '#9fd8cb', '#c98a5e', '#d94f5c',
    '#b39ddb', '#8bc34a', '#ff8a65', '#4dd0e1', '#f48fb1', '#aed581'];
const GOLD = new THREE.Color(0xffd766);
const HOVER = new THREE.Color(0x7fb2e5);

const $ = (id) => document.getElementById(id);
const pretty = (s) => s.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
const lookup = (key, fallback) => { const v = t(key); return v === key ? fallback : v; };
const regionName = (id) => lookup(`region.${id}`, pretty(id));
const isSide = (group) => /^(Left|Right)_(Front|Back)$/.test(group);
const groupName = (group) => (group ? lookup(`side.${group}`, pretty(group)) : '');
const speciesName = (id) => t(`sp.${id}`);

function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

class VetViewer {
    constructor() {
        this.container = $('canvas-container');
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0d13);
        this.camera = new THREE.PerspectiveCamera(40, this.width / this.height, 0.1, 5000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.width, this.height);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.07;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.6;

        this.scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x2a2118, 0.9));
        const key = new THREE.DirectionalLight(0xfff2e0, 1.6);
        key.position.set(3, 6, 5);
        this.camera.add(key);   // light follows the camera so no side is ever in shadow
        this.scene.add(this.camera);
        const fill = new THREE.DirectionalLight(0x9fc2ff, 0.5);
        fill.position.set(-5, 2, -3);
        this.scene.add(fill);

        this.root = new THREE.Group();
        this.scene.add(this.root);

        this.components = [];          // {key,name,region,group,files,meshes,visible}
        this.regions = [];             // {id,color,visible,count}
        this.focusRegion = null;
        this.selected = null;
        this.hovered = null;
        this.dim = 0.18;
        this.xray = false;
        this.showHover = true;
        this.browseFilter = '';
        this.pointer = new THREE.Vector2(-9, -9);
        this.pointerPx = { x: 0, y: 0 };
        this.raycaster = new THREE.Raycaster();
        this.raycaster.firstHitOnly = true;
        this.ghostMaterial = new THREE.MeshBasicMaterial({
            color: GOLD, transparent: true, opacity: 0.38, depthTest: false, depthWrite: false, side: THREE.DoubleSide
        });

        applyStatic();
        this.renderStaticTexts();
        this.initEvents();
        onLangChange(() => this.refreshLanguage());

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
        this.load().catch((err) => {
            console.error(err);
            $('loading-text').textContent = t('vet.loadFailed');
        });
    }

    // ---------------------------------------------------------
    // LOADING
    // ---------------------------------------------------------
    async load() {
        this.setLoading(true);
        const inventory = await (await fetch('models.json')).json();
        const species = inventory.species.find(s => s.id === SPECIES_ID);

        // Build components, merging Name / Name1 / Name2 files of one structure.
        const files = [];
        species.regions.forEach((region, ri) => {
            this.regions.push({ id: region.id, color: REGION_COLORS[ri % REGION_COLORS.length], visible: true, count: 0 });
            for (const group of region.groups) {
                const ids = new Set(group.pieces.map(p => p.id));
                const byBase = new Map();
                for (const piece of group.pieces) {
                    const stripped = piece.id.replace(/[\s_]*\d+$/, '');
                    const base = stripped !== piece.id && ids.has(stripped) ? stripped : piece.id;
                    let comp = byBase.get(base);
                    if (!comp) {
                        comp = { key: `${region.id}/${group.id}/${base}`, name: pretty(base), region: region.id,
                                 group: group.id, files: [], meshes: [], visible: true };
                        byBase.set(base, comp);
                        this.components.push(comp);
                    }
                    comp.files.push(piece.file);
                    files.push({ file: piece.file, comp });
                }
            }
        });
        this.regions.forEach(r => { r.count = this.components.filter(c => c.region === r.id).length; });
        this.buildRegionList();

        const loader = new GLTFLoader();
        let done = 0, next = 0;
        const failed = [];
        const worker = async () => {
            while (next < files.length) {
                const f = files[next++];
                try {
                    const gltf = await loader.loadAsync(encodeURI(f.file));
                    this.addModel(f.comp, gltf.scene);
                } catch (err) {
                    failed.push(f.file);
                    console.warn('Could not load', f.file, err);
                }
                done++;
                $('progress-bar').style.width = `${(done / files.length) * 100}%`;
                $('progress-count').textContent = t('vet.loadingCount', { done, total: files.length });
            }
        };
        await Promise.all(Array.from({ length: 6 }, worker));

        // Components whose files all failed are dropped from the list.
        this.components = this.components.filter(c => c.meshes.length);
        if (failed.length) {
            $('missing-note').hidden = false;
            $('missing-note').textContent = t('vet.missing', { n: failed.length });
        }

        this.frame();
        this.applyState();
        this.renderBrowser();
        this.setLoading(false);
    }

    addModel(comp, object) {
        object.traverse((m) => {
            if (!m.isMesh) return;
            m.material = m.material.clone();   // per-mesh so dimming/highlight don't leak
            m.userData.comp = comp;
            m.userData.base = {
                opacity: m.material.opacity, transparent: m.material.transparent,
                emissive: m.material.emissive ? m.material.emissive.clone() : null,
                emissiveIntensity: m.material.emissiveIntensity ?? 1
            };
            m.geometry.computeBoundsTree();
            comp.meshes.push(m);
        });
        this.root.add(object);
    }

    /**
     * Centre the animal and work out its axes from the data: Y is up, and the
     * head direction is wherever the skull sits relative to the body centre.
     */
    frame() {
        this.root.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(this.root);
        const center = box.getCenter(new THREE.Vector3());
        this.root.position.sub(center);
        this.root.updateMatrixWorld(true);
        box.translate(center.clone().negate());
        this.size = box.getSize(new THREE.Vector3());
        this.maxDim = Math.max(this.size.x, this.size.y, this.size.z);

        const skull = this.components.filter(c => /^Skull/.test(c.region));
        this.headCenter = skull.length ? this.boxOf(skull).getCenter(new THREE.Vector3()) : new THREE.Vector3();
        const h = this.headCenter.clone().setY(0);
        // Snap to the dominant horizontal axis; models are axis-aligned.
        this.forward = Math.abs(h.x) > Math.abs(h.z)
            ? new THREE.Vector3(Math.sign(h.x) || 1, 0, 0)
            : new THREE.Vector3(0, 0, Math.sign(h.z) || 1);
        this.left = new THREE.Vector3(0, 1, 0).cross(this.forward).normalize();

        this.camera.near = this.maxDim / 200;
        this.camera.far = this.maxDim * 50;
        this.camera.updateProjectionMatrix();
        this.setCamera('home', false);
    }

    boxOf(comps) {
        const box = new THREE.Box3();
        comps.forEach(c => c.meshes.forEach(m => box.expandByObject(m)));
        return box;
    }

    // ---------------------------------------------------------
    // CAMERA
    // ---------------------------------------------------------
    viewDistance(extent) {
        const vFov = THREE.MathUtils.degToRad(this.camera.fov);
        const fitH = extent / (2 * Math.tan(vFov / 2));
        return fitH / Math.min(1, this.camera.aspect) * 1.15;
    }

    setCamera(preset, animate = true) {
        const up = new THREE.Vector3(0, 1, 0);
        const d = this.viewDistance(this.maxDim);
        const target = new THREE.Vector3();
        let dir;
        switch (preset) {
            case 'left': dir = this.left.clone(); break;
            case 'right': dir = this.left.clone().negate(); break;
            case 'front': dir = this.forward.clone(); break;
            case 'back': dir = this.forward.clone().negate(); break;
            case 'top': dir = up.clone().addScaledVector(this.left, 0.02); break;
            case 'head': {
                target.copy(this.headCenter);
                dir = this.left.clone().multiplyScalar(0.7).addScaledVector(this.forward, 0.6).addScaledVector(up, 0.3).normalize();
                const pos = target.clone().addScaledVector(dir, this.viewDistance(this.maxDim * 0.35));
                return animate ? this.flyTo(pos, target) : this.jumpTo(pos, target);
            }
            default: dir = this.left.clone().multiplyScalar(0.85).addScaledVector(this.forward, 0.45).addScaledVector(up, 0.3).normalize();
        }
        const pos = target.clone().addScaledVector(dir, d);
        return animate ? this.flyTo(pos, target) : this.jumpTo(pos, target);
    }

    jumpTo(pos, target) {
        this.flightId = (this.flightId || 0) + 1;   // cancel any fly-to still running
        this.camera.position.copy(pos);
        this.controls.target.copy(target);
        this.controls.update();
    }

    flyTo(pos, target) {
        const p0 = this.camera.position.clone(), t0 = this.controls.target.clone();
        const id = (this.flightId || 0) + 1;
        this.flightId = id;
        const start = performance.now();
        const step = () => {
            if (this.flightId !== id) return;
            const p = Math.min(1, (performance.now() - start) / 750);
            const e = 0.5 - Math.cos(p * Math.PI) / 2;
            this.camera.position.lerpVectors(p0, pos, e);
            this.controls.target.lerpVectors(t0, target, e);
            this.controls.update();
            if (p < 1) requestAnimationFrame(step);
        };
        step();
    }

    setSpin(on) {
        this.controls.autoRotate = on;
        $('spin-btn').setAttribute('aria-pressed', String(on));
        $('spin-btn').textContent = t(on ? 'btn.spinOn' : 'btn.spinOff');
    }

    // ---------------------------------------------------------
    // STATE → MATERIALS
    // ---------------------------------------------------------
    applyState() {
        const regionVisible = new Map(this.regions.map(r => [r.id, r.visible]));
        for (const comp of this.components) {
            const shown = comp.visible && regionVisible.get(comp.region);
            const dimmed = this.focusRegion && comp.region !== this.focusRegion;
            const isSel = comp === this.selected, isHov = comp === this.hovered;
            for (const m of comp.meshes) {
                const mat = m.material, base = m.userData.base;
                m.visible = shown;
                mat.opacity = dimmed ? Math.min(base.opacity, this.dim) : base.opacity;
                mat.transparent = dimmed || base.transparent;
                mat.depthWrite = !dimmed;
                mat.wireframe = this.xray;
                if (base.emissive) {
                    if (isSel) { mat.emissive.copy(GOLD); mat.emissiveIntensity = 0.55; }
                    else if (isHov) { mat.emissive.copy(HOVER); mat.emissiveIntensity = 0.16; }
                    else { mat.emissive.copy(base.emissive); mat.emissiveIntensity = base.emissiveIntensity; }
                }
            }
        }
        this.refreshRegionList();
    }

    // ---------------------------------------------------------
    // SELECTION
    // ---------------------------------------------------------
    select(comp, { fly = false } = {}) {
        if (this.selected) this.selected.meshes.forEach(m => { if (m.userData.ghost) { m.remove(m.userData.ghost); m.userData.ghost = null; } });
        this.selected = comp;
        if (comp) {
            comp.visible = true;
            const region = this.regions.find(r => r.id === comp.region);
            if (region) region.visible = true;
            // See-through copy so buried structures (brain, turbinates) still show.
            comp.meshes.forEach(m => {
                const ghost = new THREE.Mesh(m.geometry, this.ghostMaterial);
                ghost.renderOrder = 999;
                ghost.raycast = () => {};
                m.add(ghost);
                m.userData.ghost = ghost;
            });
            this.selectedCenter = this.boxOf([comp]).getCenter(new THREE.Vector3());
        }
        this.applyState();
        this.showSelected();
        this.renderBrowser();
        if (comp && fly) this.focusSelected();
    }

    focusSelected() {
        if (!this.selected) return;
        const box = this.boxOf([this.selected]);
        const center = box.getCenter(new THREE.Vector3());
        const extent = Math.max(box.getSize(new THREE.Vector3()).length(), this.maxDim * 0.12);
        const dir = this.camera.position.clone().sub(this.controls.target).normalize();
        this.setSpin(false);
        this.flyTo(center.clone().addScaledVector(dir, this.viewDistance(extent)), center);
    }

    locationOf(comp) {
        return [regionName(comp.region), comp.group ? groupName(comp.group) : null].filter(Boolean).join(' · ');
    }

    labelOf(comp) {
        return isSide(comp.group) ? `${comp.name} — ${groupName(comp.group)}` : comp.name;
    }

    showSelected() {
        const c = this.selected;
        $('structure-empty').hidden = !!c;
        $('structure-block').hidden = !c;   // mobile.js opens the info drawer when this un-hides
        $('structure-name').textContent = c ? c.name : '';
        $('structure-side').textContent = !c ? '' : [this.locationOf(c),
            c.files.length > 1 ? t('info.parts', { n: c.files.length }) : null].filter(Boolean).join(' · ');
    }

    // ---------------------------------------------------------
    // BROWSER (right panel)
    // ---------------------------------------------------------
    browseEntries() {
        const order = new Map(this.regions.map((r, i) => [r.id, i]));
        const f = this.browseFilter;
        return this.components
            .filter(c => !f || this.labelOf(c).toLowerCase().includes(f) || this.locationOf(c).toLowerCase().includes(f))
            .sort((a, b) => (order.get(a.region) - order.get(b.region))
                || a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
    }

    renderBrowser() {
        const list = $('structure-list');
        const entries = this.browseEntries();
        $('browse-count').textContent = this.browseFilter
            ? `${entries.length} / ${this.components.length}` : `${this.components.length}`;
        let html = '', lastRegion = null;
        entries.forEach((c, i) => {
            if (c.region !== lastRegion) {
                const r = this.regions.find(x => x.id === c.region);
                html += `<li class="sub"><span class="sys-dot" style="--c:${r.color}"></span>${escapeHtml(regionName(c.region))}</li>`;
                lastRegion = c.region;
            }
            const cls = [c === this.selected ? 'active' : '', c.visible ? '' : 'off'].filter(Boolean).join(' ');
            html += `<li><button data-i="${this.components.indexOf(c)}"${cls ? ` class="${cls}"` : ''}>${escapeHtml(this.labelOf(c))}</button></li>`;
        });
        list.innerHTML = html || `<li class="empty">${t('browse.none')}</li>`;
        const active = list.querySelector('button.active');
        if (active && (active.offsetTop < list.scrollTop
            || active.offsetTop + active.offsetHeight > list.scrollTop + list.clientHeight)) {
            list.scrollTop = active.offsetTop - list.clientHeight / 2;
        }
    }

    step(dir) {
        const entries = this.browseEntries();
        if (!entries.length) return;
        let i = entries.indexOf(this.selected);
        i = i < 0 ? (dir > 0 ? 0 : entries.length - 1) : (i + dir + entries.length) % entries.length;
        this.select(entries[i], { fly: true });
    }

    // ---------------------------------------------------------
    // REGIONS (left panel)
    // ---------------------------------------------------------
    buildRegionList() {
        const box = $('region-list');
        box.innerHTML = this.regions.map(r => `
            <div class="system-row" data-region="${escapeHtml(r.id)}">
                <button class="sys-main" data-region="${escapeHtml(r.id)}">
                    <span class="sys-dot" style="--c:${r.color}"></span>
                    <span class="sys-name">${escapeHtml(regionName(r.id))}</span>
                    <span class="sys-count">${r.count}</span>
                </button>
                <button class="sys-eye" data-eye="${escapeHtml(r.id)}" title="${t('layer.toggle')}" aria-label="${t('layer.toggle')}">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                </button>
            </div>`).join('');
        this.refreshRegionList();
    }

    refreshRegionList() {
        for (const r of this.regions) {
            const row = document.querySelector(`.system-row[data-region="${CSS.escape(r.id)}"]`);
            if (!row) continue;
            row.classList.toggle('active', r.id === this.focusRegion);
            row.classList.toggle('hidden-layer', !r.visible);
        }
    }

    // ---------------------------------------------------------
    // UI
    // ---------------------------------------------------------
    renderStaticTexts() {
        const sp = SPECIES[SPECIES_ID];
        $('species-title').textContent = speciesName(SPECIES_ID).toUpperCase();
        $('info-title').textContent = speciesName(SPECIES_ID);
        $('info-latin').textContent = sp.latin;
        $('info-dot').style.background = sp.hex;
        $('info-dot').style.boxShadow = `0 0 12px ${sp.hex}`;
        document.title = `${speciesName(SPECIES_ID)} | ${t('page.title')}`;
        $('species-switch').innerHTML = Object.entries(SPECIES).map(([id, s]) => s.soon
            ? `<span class="species-pill soon" title="${escapeHtml(t('sp.soon'))}">${escapeHtml(speciesName(id))}<small>${escapeHtml(t('sp.soon'))}</small></span>`
            : `<a class="species-pill${id === SPECIES_ID ? ' active' : ''}" href="viewer.html?specie=${id}"${id === SPECIES_ID ? ' aria-current="page"' : ''}>${escapeHtml(speciesName(id))}</a>`
        ).join('');
        $('loading-text').textContent = t('vet.loading', { name: speciesName(SPECIES_ID) });
        this.setSpin(this.controls.autoRotate);
    }

    refreshLanguage() {
        this.renderStaticTexts();
        this.buildRegionList();
        this.showSelected();
        this.renderBrowser();
    }

    setLoading(on) { $('loading-overlay').classList.toggle('hidden', !on); }

    showTooltip(comp) {
        const tip = $('tooltip');
        tip.textContent = this.labelOf(comp);
        tip.style.left = `${this.pointerPx.x}px`;
        tip.style.top = `${this.pointerPx.y}px`;
        tip.style.opacity = '1';
    }

    hideTooltip() { $('tooltip').style.opacity = '0'; }

    initEvents() {
        window.addEventListener('resize', () => {
            this.width = window.innerWidth; this.height = window.innerHeight;
            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.width, this.height);
            this.viewOffset = -1;   // re-apply for the new size
        });

        const canvas = this.renderer.domElement;
        canvas.addEventListener('pointermove', (e) => {
            this.pointerPx = { x: e.clientX, y: e.clientY };
            this.pointer.set((e.clientX / this.width) * 2 - 1, -(e.clientY / this.height) * 2 + 1);
        });
        canvas.addEventListener('pointerleave', () => {
            this.pointer.set(-9, -9);
            if (this.hovered) { this.hovered = null; this.applyState(); }
            this.hideTooltip();
        });
        canvas.addEventListener('pointerdown', (e) => { this.down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
        canvas.addEventListener('pointerup', (e) => {
            if (this.suppressTap) { this.suppressTap = false; return; }   // mobile.js: tap that closes a drawer
            if (!this.down || Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 6) return;
            this.pointer.set((e.clientX / this.width) * 2 - 1, -(e.clientY / this.height) * 2 + 1);
            const hit = this.pick();
            if (hit) this.select(hit);
        });

        $('region-list').addEventListener('click', (e) => {
            const eye = e.target.closest('.sys-eye');
            if (eye) {
                const r = this.regions.find(x => x.id === eye.dataset.eye);
                r.visible = !r.visible;
                if (!r.visible && this.focusRegion === r.id) this.focusRegion = null;
                this.applyState();
                return;
            }
            const main = e.target.closest('.sys-main');
            if (!main) return;
            const id = main.dataset.region;
            this.focusRegion = this.focusRegion === id ? null : id;
            if (this.focusRegion) {
                this.regions.find(x => x.id === id).visible = true;
                const box = this.boxOf(this.components.filter(c => c.region === id));
                const center = box.getCenter(new THREE.Vector3());
                const dir = this.camera.position.clone().sub(this.controls.target).normalize();
                this.flyTo(center.clone().addScaledVector(dir, this.viewDistance(box.getSize(new THREE.Vector3()).length())), center);
            }
            this.applyState();
        });

        $('opacity-slider').addEventListener('input', (e) => { this.dim = e.target.value / 100; this.applyState(); });
        $('xray-toggle').addEventListener('change', (e) => { this.xray = e.target.checked; this.applyState(); });
        $('hover-toggle').addEventListener('change', (e) => {
            this.showHover = e.target.checked;
            if (!this.showHover) { this.hovered = null; this.hideTooltip(); this.applyState(); }
        });
        $('show-all-btn').addEventListener('click', () => this.showAll());

        document.querySelectorAll('.cam-btn[data-cam]').forEach(b => b.addEventListener('click', () => this.setCamera(b.dataset.cam)));
        $('reset-view-btn').addEventListener('click', () => { this.showAll(); this.select(null); this.setCamera('home'); });
        $('spin-btn').addEventListener('click', () => this.setSpin(!this.controls.autoRotate));
        $('lang-btn').addEventListener('click', () => setLang(getLang() === 'en' ? 'ms' : 'en'));

        $('act-focus').addEventListener('click', () => this.focusSelected());
        $('act-isolate').addEventListener('click', () => {
            if (!this.selected) return;
            this.components.forEach(c => { c.visible = c === this.selected; });
            this.focusRegion = null;
            this.applyState(); this.renderBrowser(); this.focusSelected();
        });
        $('act-hide').addEventListener('click', () => {
            if (!this.selected) return;
            const c = this.selected;
            this.select(null);
            c.visible = false;
            this.applyState(); this.renderBrowser();
        });
        $('act-clear').addEventListener('click', () => this.select(null));

        const search = $('structure-search');
        search.addEventListener('input', () => { this.browseFilter = search.value.trim().toLowerCase(); this.renderBrowser(); });
        search.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.step(1); } });
        $('structure-list').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-i]');
            if (btn) this.select(this.components[Number(btn.dataset.i)], { fly: true });
        });
        $('prev-structure').addEventListener('click', () => this.step(-1));
        $('next-structure').addEventListener('click', () => this.step(1));
    }

    showAll() {
        this.components.forEach(c => { c.visible = true; });
        this.regions.forEach(r => { r.visible = true; });
        this.focusRegion = null;
        this.applyState();
        this.renderBrowser();
    }

    visibleMeshes() {
        const out = [];
        this.components.forEach(c => c.meshes.forEach(m => { if (m.visible) out.push(m); }));
        return out;
    }

    pick() {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const hit = this.raycaster.intersectObjects(this.visibleMeshes(), false)[0];
        return hit ? hit.object.userData.comp : null;
    }

    checkHover() {
        if (!this.showHover || this.pointer.x < -1.5 || !this.components.length) return;
        const c = this.camera.position;
        const key = `${this.pointer.x},${this.pointer.y},${c.x},${c.y},${c.z}`;
        if (key === this.lastHoverKey) return;
        this.lastHoverKey = key;
        const comp = this.pick();
        if (comp !== this.hovered) { this.hovered = comp; this.applyState(); }
        if (comp) this.showTooltip(comp); else this.hideTooltip();
    }

    updateMarker() {
        const marker = $('focus-marker');
        if (!this.selected || !this.selectedCenter || !this.selected.meshes.some(m => m.visible)) { marker.hidden = true; return; }
        const p = this.selectedCenter.clone().project(this.camera);
        if (p.z > 1 || Math.abs(p.x) > 1.1 || Math.abs(p.y) > 1.1) { marker.hidden = true; return; }
        marker.hidden = false;
        marker.style.transform = `translate(${(p.x + 1) / 2 * this.width}px, ${(1 - p.y) / 2 * this.height}px)`;
    }

    /** On phones a drawer covers the lower screen; shift the view so the target stays visible. */
    updateViewOffset() {
        const drawer = this.width <= 860 && document.querySelector('.left-panel.open, .right-panel.open');
        const off = drawer ? Math.round(drawer.offsetHeight / 2) : 0;
        if (off === this.viewOffset) return;
        this.viewOffset = off;
        this.lastHoverKey = null;   // picking depends on the projection too
        if (off) this.camera.setViewOffset(this.width, this.height, 0, off, this.width, this.height);
        else this.camera.clearViewOffset();
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.updateViewOffset();
        this.controls.update();
        this.checkHover();
        this.updateMarker();
        this.renderer.render(this.scene, this.camera);
    }
}

window.anatomyApp = new VetViewer();
