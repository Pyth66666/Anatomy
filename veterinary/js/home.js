import { t, getLang, setLang, applyStatic, onLangChange } from '../../i18n.js';
import { SPECIES } from './strings.js';

let counts = {};

/** Structures per species, counting VT-ARIES split files (Name, Name1…) once. */
function countStructures(species) {
    let n = 0;
    for (const region of species.regions) {
        for (const group of region.groups) {
            const ids = new Set(group.pieces.map(p => p.id));
            n += group.pieces.filter(p => {
                const base = p.id.replace(/[\s_]*\d+$/, '');
                return base === p.id || !ids.has(base);
            }).length;
        }
    }
    return n;
}

function render() {
    document.title = t('page.title');
    document.getElementById('species-grid').innerHTML = Object.entries(SPECIES).map(([id, s]) => {
        const inner = `
            <div class="card-top">
                <span class="card-dot"></span>
                <span class="card-count">${s.soon ? t('sp.soon') : t('sp.structures', { n: counts[id] ?? '…' })}</span>
            </div>
            <span class="card-name">${t(`sp.${id}`)}</span>
            <span class="card-latin">${s.latin}</span>
            <span class="card-desc">${t(`sp.${id}.desc`)}</span>
            ${s.soon ? '' : `<span class="card-cta">${t('sp.explore')}</span>`}`;
        return s.soon
            ? `<div class="species-card soon" style="--c:${s.hex}">${inner}</div>`
            : `<a class="species-card" style="--c:${s.hex}" href="viewer.html?specie=${id}">${inner}</a>`;
    }).join('');
}

applyStatic();
render();
onLangChange(render);
document.getElementById('lang-btn').addEventListener('click', () => setLang(getLang() === 'en' ? 'ms' : 'en'));

fetch('models.json')
    .then(r => r.json())
    .then(inv => {
        inv.species.forEach(s => { counts[s.id] = countStructures(s); });
        render();
    })
    .catch(() => {});
