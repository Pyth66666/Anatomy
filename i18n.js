/**
 * UI strings in English and Malay.
 *
 * Static text in index.html is tagged with data-i18n (textContent),
 * data-i18n-html (innerHTML, for strings with markup) or
 * data-i18n-title (title + aria-label) or data-i18n-placeholder. Dynamic text in app.js goes through t().
 * Structure names come from the Z-Anatomy atlas and are already English, so
 * they are not translated.
 */
export const STRINGS = {
    en: {
        'nav.veterinary': 'Veterinary',
        'page.title': 'Anatomy 360 | Full-Body Human Anatomy',
        'loading.model': 'Loading anatomical model…',
        'loading.system': 'Loading {name}…',
        'brand.wordmark': 'Free & Open Source',
        'brand.title': 'ANATOMY 360',
        'brand.badge': 'Full-Body Human Anatomy · Z-Anatomy Atlas',
        'btn.reset': 'Reset View',
        'btn.spinOn': 'Auto-Rotate: On',
        'btn.spinOff': 'Auto-Rotate: Off',
        'btn.lang': 'BM',
        'btn.langTitle': 'Tukar ke Bahasa Melayu',
        'panel.systems': 'ANATOMICAL SYSTEMS',
        'panel.systemsHint': 'Click: show only that system · Eye: toggle layer',
        'panel.view': 'VIEW',
        'ctl.opacity': 'Opacity of other layers',
        'ctl.xray': 'X-ray mode',
        'ctl.hover': 'Show structure name (hover)',
        'ctl.cover': 'Covering membranes <em>(fascia, peritoneum…)</em>',
        'ctl.genital': 'Reproductive system',
        'panel.camera': 'CAMERA',
        'cam.front': 'Front',
        'cam.back': 'Back',
        'cam.left': 'Left',
        'cam.right': 'Right',
        'cam.head': 'Head',
        'cam.torso': 'Torso',
        'info.none': 'No system selected',
        'info.definition': 'Definition',
        'info.pick': 'Choose an anatomical system from the list on the left.',
        'info.selected': 'Selected Structure',
        'info.layer': 'Layer Info',
        'spec.count': 'Distinct structures',
        'spec.tris': 'Triangles (atlas)',
        'spec.decimate': 'Reduced for web to',
        'spec.size': 'File size',
        'layer.toggle': 'Toggle layer',
        'side.l': 'Left',
        'side.r': 'Right',
        'side.ol': 'Left (outer)',
        'side.or': 'Right (outer)',
        'note.alt': 'Alternative / older term',
        'structure.fallback': 'Structure {n}',
        'structure.unnamed': '(unnamed structure)',
        'browse.title': 'Structures in this system',
        'browse.search': 'Search structures…',
        'browse.prev': 'Previous structure',
        'browse.next': 'Next structure',
        'browse.none': 'No matching structure',
        'body.switch': 'Reference body',
        'body.male': 'Male body (BodyParts3D / Z-Anatomy)',
        'body.female': 'Female body (Human Reference Atlas)',
        'ctl.pregnancy': 'Pregnancy (placenta, umbilical cord)',
        'ctl.borrowed': 'Placeholder bones <em>(male-derived)</em>',
        'note.borrowed': 'Placeholder from the male skeleton: the female source has no model of this bone',
        'spec.borrowed': 'Male-derived placeholder bones',
        'footer.female': 'Female: Human Reference Atlas, HuBMAP (Browne &amp; Schlehlein) — CC BY 4.0',
        'sys.iskelet.femaleNote': 'FEMALE BODY: the source models the spine, sternum, pelvis and leg bones. The skull, ribs, shoulders, arms, hands and feet are placeholders fitted from the male skeleton (shown blue-grey); they carry no female skeletal differences.',
        'sys.kas.femaleNote': 'FEMALE BODY: the open female source only models the eye muscles and the rectus femoris. No open dataset of female trunk or arm muscles exists, and male muscles are not substituted.',
        'sys.eklem.femaleNote': 'FEMALE BODY: intervertebral discs and knee structures only.',
        'sys.deri.name': 'Skin & Breast',
        'sys.deri.desc': 'The integumentary system: the skin covering the whole body, the breast (mammary lobes, lactiferous ducts and sinuses, nipple, areola, suspensory ligaments, adipose tissue) and abdominal subcutaneous fat. Fat layers are shown with "Covering membranes".',
        'footer.rotate': '<strong>Left-click + drag:</strong> rotate',
        'footer.pan': '<strong>Right-click + drag:</strong> pan',
        'footer.zoom': '<strong>Scroll wheel:</strong> zoom',
        'footer.basedOn': 'Based on <a href="https://github.com/DrMuratAltun/anatomi-simulatoru" target="_blank" rel="noopener">Anatomi Simülatörü</a> by Dr. Murat Altun (MIT)',
        'mob.systems': '◧ Systems &amp; View',
        'mob.info': '◨ Info Card',

        'sys.iskelet.name': 'Skeletal System',
        'sys.iskelet.desc': 'The body\'s supporting framework. 206 bones: levers for movement, armour for the internal organs, ' +
            'the site of blood cell production (red bone marrow) and a store of calcium and phosphate.',
        'sys.eklem.name': 'Ligaments & Joint Structures',
        'sys.eklem.desc': 'Structures that surround and support the joints: ligaments (292), joint capsules (34), ' +
            'discs and menisci (46), pubic and sacrococcygeal symphyses. ' +
            'NOTE: immovable joints (skull sutures, gomphoses, synchondroses) are named in the atlas ' +
            'but not modelled in 3D. Skull sutures appear as bone boundaries in the skeletal layer.',
        'sys.kas.name': 'Muscular System',
        'sys.kas.desc': 'Skeletal muscles attach to the skeleton and produce voluntary movement. They also maintain posture, ' +
            'stabilise joints and generate heat through shivering.',
        'sys.dolasim.name': 'Cardiovascular System',
        'sys.dolasim.desc': 'The heart and blood vessels. Carries oxygen, nutrients, hormones and heat, and takes waste products ' +
            'to the excretory organs. Two circuits: systemic and pulmonary circulation.',
        'sys.sinir.name': 'Nervous System',
        'sys.sinir.desc': 'The central (brain, spinal cord) and peripheral nervous systems, plus the sense organs. Receives and ' +
            'processes information and produces responses; coordinates all other systems.',
        'sys.ic-organlar.name': 'Internal Organs',
        'sys.ic-organlar.desc': 'The digestive, respiratory, urinary and genital systems. Digestion of food, gas exchange, ' +
            'filtration of blood and reproduction take place in these organs.',
        'sys.lenf.name': 'Lymphatic System',
        'sys.lenf.desc': 'Lymph nodes, spleen, thymus and tonsils. Returns tissue fluid to the circulation, takes part in ' +
            'fat absorption and is the centre of the immune response. ' +
            'NOTE: lymphatic vessels and the thoracic duct are named in the atlas but not modelled in 3D; ' +
            'this layer consists of organs and nodes.'
    },

    ms: {
        'nav.veterinary': 'Veterinar',
        'page.title': 'Anatomi 360 | Anatomi Manusia Seluruh Badan',
        'loading.model': 'Memuatkan model anatomi…',
        'loading.system': 'Memuatkan {name}…',
        'brand.wordmark': 'Percuma & Sumber Terbuka',
        'brand.title': 'ANATOMI 360',
        'brand.badge': 'Anatomi Manusia Seluruh Badan · Atlas Z-Anatomy',
        'btn.reset': 'Set Semula Paparan',
        'btn.spinOn': 'Putaran Auto: Hidup',
        'btn.spinOff': 'Putaran Auto: Mati',
        'btn.lang': 'EN',
        'btn.langTitle': 'Switch to English',
        'panel.systems': 'SISTEM ANATOMI',
        'panel.systemsHint': 'Klik: tunjuk sistem itu sahaja · Mata: hidup/matikan lapisan',
        'panel.view': 'PAPARAN',
        'ctl.opacity': 'Kelegapan lapisan lain',
        'ctl.xray': 'Mod X-ray',
        'ctl.hover': 'Tunjuk nama struktur (hover)',
        'ctl.cover': 'Membran penutup <em>(fasia, peritoneum…)</em>',
        'ctl.genital': 'Sistem pembiakan',
        'panel.camera': 'KAMERA',
        'cam.front': 'Depan',
        'cam.back': 'Belakang',
        'cam.left': 'Kiri',
        'cam.right': 'Kanan',
        'cam.head': 'Kepala',
        'cam.torso': 'Torso',
        'info.none': 'Tiada sistem dipilih',
        'info.definition': 'Definisi',
        'info.pick': 'Pilih satu sistem anatomi daripada senarai di sebelah kiri.',
        'info.selected': 'Struktur Dipilih',
        'info.layer': 'Maklumat Lapisan',
        'spec.count': 'Bilangan struktur',
        'spec.tris': 'Segi tiga (atlas)',
        'spec.decimate': 'Dikurangkan untuk web kepada',
        'spec.size': 'Saiz fail',
        'layer.toggle': 'Hidup/matikan lapisan',
        'side.l': 'Kiri',
        'side.r': 'Kanan',
        'side.ol': 'Kiri (luar)',
        'side.or': 'Kanan (luar)',
        'note.alt': 'Istilah alternatif / lama',
        'structure.fallback': 'Struktur {n}',
        'structure.unnamed': '(struktur tanpa nama)',
        'browse.title': 'Struktur dalam sistem ini',
        'browse.search': 'Cari struktur…',
        'browse.prev': 'Struktur sebelumnya',
        'browse.next': 'Struktur seterusnya',
        'browse.none': 'Tiada struktur sepadan',
        'body.switch': 'Badan rujukan',
        'body.male': 'Badan lelaki (BodyParts3D / Z-Anatomy)',
        'body.female': 'Badan perempuan (Human Reference Atlas)',
        'ctl.pregnancy': 'Kehamilan (plasenta, tali pusat)',
        'ctl.borrowed': 'Tulang pengganti <em>(daripada lelaki)</em>',
        'note.borrowed': 'Pengganti daripada rangka lelaki: sumber perempuan tiada model tulang ini',
        'spec.borrowed': 'Tulang pengganti daripada lelaki',
        'footer.female': 'Perempuan: Human Reference Atlas, HuBMAP (Browne &amp; Schlehlein) — CC BY 4.0',
        'sys.iskelet.femaleNote': 'BADAN PEREMPUAN: sumber memodelkan tulang belakang, sternum, pelvis dan tulang kaki. Tengkorak, rusuk, bahu, lengan, tangan dan kaki (tapak) ialah pengganti yang dipadankan daripada rangka lelaki (berwarna biru kelabu); ia tidak menunjukkan perbezaan rangka perempuan.',
        'sys.kas.femaleNote': 'BADAN PEREMPUAN: sumber terbuka perempuan hanya memodelkan otot mata dan rektus femoris. Tiada set data terbuka bagi otot batang badan atau lengan perempuan, dan otot lelaki tidak digunakan sebagai ganti.',
        'sys.eklem.femaleNote': 'BADAN PEREMPUAN: cakera intervertebra dan struktur lutut sahaja.',
        'sys.deri.name': 'Kulit & Payudara',
        'sys.deri.desc': 'Sistem integumen: kulit yang menyelaputi seluruh badan, payudara (lobus mamari, duktus dan sinus laktiferus, puting, areola, ligamen penggantung, tisu adipos) dan lemak subkutaneus abdomen. Lapisan lemak dipaparkan melalui "Membran penutup".',
        'footer.rotate': '<strong>Klik kiri + seret:</strong> putar',
        'footer.pan': '<strong>Klik kanan + seret:</strong> anjak',
        'footer.zoom': '<strong>Roda tetikus:</strong> zum',
        'footer.basedOn': 'Berasaskan <a href="https://github.com/DrMuratAltun/anatomi-simulatoru" target="_blank" rel="noopener">Anatomi Simülatörü</a> oleh Dr. Murat Altun (MIT)',
        'mob.systems': '◧ Sistem &amp; Paparan',
        'mob.info': '◨ Kad Info',

        'sys.iskelet.name': 'Sistem Rangka',
        'sys.iskelet.desc': 'Rangka penyokong badan. 206 tulang: tuas untuk pergerakan, pelindung organ dalaman, ' +
            'tempat penghasilan sel darah (sumsum tulang merah) dan simpanan kalsium serta fosfat.',
        'sys.eklem.name': 'Ligamen & Struktur Sendi',
        'sys.eklem.desc': 'Struktur yang menyelaputi dan menyokong sendi: ligamen (292), kapsul sendi (34), ' +
            'cakera dan meniskus (46), simfisis pubik dan sakrokoksigeal. ' +
            'NOTA: sendi tidak bergerak (sutur tengkorak, gomfosis, sinkondrosis) dinamakan dalam atlas ' +
            'tetapi tidak dimodelkan dalam 3D. Sutur tengkorak kelihatan sebagai sempadan tulang dalam lapisan rangka.',
        'sys.kas.name': 'Sistem Otot',
        'sys.kas.desc': 'Otot rangka melekat pada rangka dan menghasilkan pergerakan terkawal. Ia juga mengekalkan postur, ' +
            'menstabilkan sendi dan menjana haba melalui menggigil.',
        'sys.dolasim.name': 'Sistem Kardiovaskular',
        'sys.dolasim.desc': 'Jantung dan salur darah. Mengangkut oksigen, nutrien, hormon dan haba, serta membawa bahan buangan ' +
            'ke organ perkumuhan. Dua litar: peredaran sistemik dan pulmonari.',
        'sys.sinir.name': 'Sistem Saraf',
        'sys.sinir.desc': 'Sistem saraf pusat (otak, saraf tunjang) dan periferi, serta organ deria. Menerima dan ' +
            'memproses maklumat serta menghasilkan tindak balas; menyelaraskan semua sistem lain.',
        'sys.ic-organlar.name': 'Organ Dalaman',
        'sys.ic-organlar.desc': 'Sistem pencernaan, pernafasan, urinari dan genital. Pencernaan makanan, pertukaran gas, ' +
            'penapisan darah dan pembiakan berlaku dalam organ-organ ini.',
        'sys.lenf.name': 'Sistem Limfa',
        'sys.lenf.desc': 'Nodus limfa, limpa, timus dan tonsil. Mengembalikan cecair tisu ke peredaran darah, terlibat dalam ' +
            'penyerapan lemak dan merupakan pusat gerak balas imun. ' +
            'NOTA: salur limfa dan duktus toraks dinamakan dalam atlas tetapi tidak dimodelkan dalam 3D; ' +
            'lapisan ini terdiri daripada organ dan nodus.'
    }
};

const STORAGE_KEY = 'anatomy360.lang';
const listeners = [];

function initialLang() {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (fromUrl && STRINGS[fromUrl]) return fromUrl;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && STRINGS[saved]) return saved;
    } catch (e) { /* storage blocked */ }
    return (navigator.language || '').toLowerCase().startsWith('ms') ? 'ms' : 'en';
}

let lang = initialLang();

export const getLang = () => lang;

export function t(key, vars) {
    let s = (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.en[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
    return s;
}

export function applyStatic(root = document) {
    document.documentElement.lang = lang;
    document.title = t('page.title');
    root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    root.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.dataset.i18nTitle);
        el.setAttribute('aria-label', el.title);
    });
}

export function setLang(next) {
    if (!STRINGS[next] || next === lang) return;
    lang = next;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* storage blocked */ }
    applyStatic();
    listeners.forEach(fn => fn(lang));
}

export const onLangChange = (fn) => listeners.push(fn);

/** Merge page-specific strings (e.g. the veterinary pages) into the shared table. */
export function addStrings(extra) {
    for (const l of Object.keys(extra)) Object.assign(STRINGS[l] ??= {}, extra[l]);
}
