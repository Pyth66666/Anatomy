/**
 * Veterinary page strings, merged into the shared i18n table (../../i18n.js)
 * so the EN/BM choice carries over between the human and vet sections.
 * Structure names come from the VT-ARIES files and stay in English.
 */
import { addStrings } from '../../i18n.js';

addStrings({
    en: {
        'page.title': 'Anatomy 360 | Veterinary Anatomy',
        'vet.brandSub': 'Veterinary Anatomy · VT-ARIES Models',
        'vet.human': 'Human',
        'vet.vet': 'Veterinary',
        'vet.loading': 'Loading {name}…',
        'vet.loadingCount': '{done} / {total} model files',
        'vet.loadFailed': 'Could not load the model. Check your connection and reload.',
        'vet.missing': '{n} model file(s) failed to load and are skipped.',

        'sp.Canine': 'Dog', 'sp.Equine': 'Horse', 'sp.Bovine': 'Cow', 'sp.Feline': 'Cat',
        'sp.Canine.desc': 'Full skeleton (skull, spine, all four limbs, pelvis and tail) plus the main thoracic and abdominal organs.',
        'sp.Equine.desc': 'Skeleton and teeth, plus cranial muscles and nerves, laryngeal cartilages, brain, and leg vessels and nerves.',
        'sp.Bovine.desc': 'Skeletal collection: skull, cervical and thoracolumbar spine, ribs, and fore and hind limbs.',
        'sp.Feline.desc': 'No open, labelled cat model exists yet. We\'re asking an author for permission to use one.',
        'sp.soon': 'Coming soon',
        'sp.structures': '{n} structures',
        'sp.explore': 'Explore in 3D →',

        'home.eyebrow': 'VETERINARY ATLAS',
        'home.title': 'Comparative anatomy, in 3D.',
        'home.lead': 'Rotate, search and isolate every bone and organ of the dog, horse and cow. Free for students, in English and Malay.',
        'home.note': 'Models load only when you open a species, and the larger ones can take a moment on mobile data.',
        'home.coverageTitle': 'Know the coverage',
        'home.coverage': 'The three collections differ: the cow is skeleton-only, the dog adds organs, and the horse adds teeth, cranial muscles and nerves. A 3D atlas supports practical study but doesn\'t replace dissection, histology or your lecture notes.',

        'panel.regions': 'REGIONS',
        'panel.regionsHint': 'Click: focus that region · Eye: show/hide',
        'panel.view': 'VIEW',
        'ctl.dim': 'Opacity of other regions',
        'ctl.xray': 'X-ray mode',
        'ctl.hover': 'Show structure name (hover)',
        'btn.showAll': 'Show all',
        'cam.top': 'Top',

        'info.selected': 'Selected Structure',
        'info.none': 'Click the model or pick from the list.',
        'act.focus': 'Focus', 'act.isolate': 'Isolate', 'act.hide': 'Hide', 'act.clear': 'Clear',
        'browse.title': 'Structures',
        'browse.search': 'Search structures…',
        'browse.prev': 'Previous structure', 'browse.next': 'Next structure',
        'browse.none': 'No matching structure',
        'info.coverage': 'Source labels from VT-ARIES are kept; some may need correction.',
        'info.parts': 'Made of {n} model parts',

        'side.Left_Front': 'Left forelimb', 'side.Right_Front': 'Right forelimb',
        'side.Left_Back': 'Left hindlimb', 'side.Right_Back': 'Right hindlimb',

        'region.Legs': 'Limbs', 'region.Back Legs': 'Hindlimbs', 'region.Front_Legs': 'Forelimbs',
        'region.Neck': 'Neck', 'region.Organs': 'Organs', 'region.Pelvis_Tail': 'Pelvis & Tail',
        'region.Ribs': 'Ribs & Sternum', 'region.Skull': 'Skull', 'region.Spine': 'Spine',
        'region.Ribs_Spine': 'Ribs & Spine', 'region.Skull_Cervical': 'Skull & Cervical Spine',
        'region.Cartilage': 'Cartilage', 'region.Cavities': 'Nasal Cavity', 'region.Muscles': 'Muscles',
        'region.Nervous_System': 'Nervous System', 'region.Teeth': 'Teeth', 'region.Vascular_System': 'Vascular System',

        'footer.rotate': '<strong>Drag:</strong> rotate',
        'footer.pan': '<strong>Right-drag:</strong> pan',
        'footer.zoom': '<strong>Scroll / pinch:</strong> zoom',
        'footer.credit': 'Models: <a href="https://github.com/VT-ARIES/Anatomy" target="_blank" rel="noopener">Virginia Tech Virtual Animal Project / VT-ARIES</a> — <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a> · Non-commercial educational use · <a href="ATTRIBUTION.md">Credits</a>',
        'mob.regions': '◧ Regions &amp; View',
        'mob.info': '◨ Structures'
    },
    ms: {
        'page.title': 'Anatomi 360 | Anatomi Veterinar',
        'vet.brandSub': 'Anatomi Veterinar · Model VT-ARIES',
        'vet.human': 'Manusia',
        'vet.vet': 'Veterinar',
        'vet.loading': 'Memuatkan {name}…',
        'vet.loadingCount': '{done} / {total} fail model',
        'vet.loadFailed': 'Model gagal dimuatkan. Semak sambungan anda dan muat semula.',
        'vet.missing': '{n} fail model gagal dimuatkan dan dilangkau.',

        'sp.Canine': 'Anjing', 'sp.Equine': 'Kuda', 'sp.Bovine': 'Lembu', 'sp.Feline': 'Kucing',
        'sp.Canine.desc': 'Rangka penuh (tengkorak, tulang belakang, keempat-empat anggota, pelvis dan ekor) serta organ utama toraks dan abdomen.',
        'sp.Equine.desc': 'Rangka dan gigi, serta otot dan saraf kranium, rawan larinks, otak, dan salur darah serta saraf kaki.',
        'sp.Bovine.desc': 'Koleksi rangka: tengkorak, tulang belakang serviks dan torakolumbar, rusuk, serta anggota depan dan belakang.',
        'sp.Feline.desc': 'Belum ada model kucing terbuka yang berlabel. Kami sedang memohon kebenaran daripada seorang pembuat model.',
        'sp.soon': 'Akan datang',
        'sp.structures': '{n} struktur',
        'sp.explore': 'Teroka dalam 3D →',

        'home.eyebrow': 'ATLAS VETERINAR',
        'home.title': 'Anatomi perbandingan, dalam 3D.',
        'home.lead': 'Putar, cari dan asingkan setiap tulang dan organ anjing, kuda dan lembu. Percuma untuk pelajar, dalam Bahasa Inggeris dan Melayu.',
        'home.note': 'Model hanya dimuatkan apabila anda membuka satu spesies, dan model yang besar mungkin mengambil masa dengan data mudah alih.',
        'home.coverageTitle': 'Ketahui liputannya',
        'home.coverage': 'Ketiga-tiga koleksi berbeza: lembu hanya rangka, anjing ditambah organ, dan kuda ditambah gigi, otot dan saraf kranium. Atlas 3D membantu pembelajaran amali tetapi tidak menggantikan diseksi, histologi atau nota kuliah anda.',

        'panel.regions': 'KAWASAN',
        'panel.regionsHint': 'Klik: fokus kawasan itu · Mata: tunjuk/sorok',
        'panel.view': 'PAPARAN',
        'ctl.dim': 'Kelegapan kawasan lain',
        'ctl.xray': 'Mod X-ray',
        'ctl.hover': 'Tunjuk nama struktur (hover)',
        'btn.showAll': 'Tunjuk semua',
        'cam.top': 'Atas',

        'info.selected': 'Struktur Dipilih',
        'info.none': 'Klik model atau pilih daripada senarai.',
        'act.focus': 'Fokus', 'act.isolate': 'Asingkan', 'act.hide': 'Sorok', 'act.clear': 'Kosongkan',
        'browse.title': 'Struktur',
        'browse.search': 'Cari struktur…',
        'browse.prev': 'Struktur sebelumnya', 'browse.next': 'Struktur seterusnya',
        'browse.none': 'Tiada struktur sepadan',
        'info.coverage': 'Label asal daripada VT-ARIES dikekalkan; sesetengahnya mungkin perlu dibetulkan.',
        'info.parts': 'Terdiri daripada {n} bahagian model',

        'side.Left_Front': 'Kaki depan kiri', 'side.Right_Front': 'Kaki depan kanan',
        'side.Left_Back': 'Kaki belakang kiri', 'side.Right_Back': 'Kaki belakang kanan',

        'region.Legs': 'Anggota', 'region.Back Legs': 'Kaki belakang', 'region.Front_Legs': 'Kaki depan',
        'region.Neck': 'Leher', 'region.Organs': 'Organ', 'region.Pelvis_Tail': 'Pelvis & Ekor',
        'region.Ribs': 'Rusuk & Sternum', 'region.Skull': 'Tengkorak', 'region.Spine': 'Tulang Belakang',
        'region.Ribs_Spine': 'Rusuk & Tulang Belakang', 'region.Skull_Cervical': 'Tengkorak & Serviks',
        'region.Cartilage': 'Rawan', 'region.Cavities': 'Rongga Hidung', 'region.Muscles': 'Otot',
        'region.Nervous_System': 'Sistem Saraf', 'region.Teeth': 'Gigi', 'region.Vascular_System': 'Sistem Vaskular',

        'footer.rotate': '<strong>Seret:</strong> putar',
        'footer.pan': '<strong>Seret kanan:</strong> anjak',
        'footer.zoom': '<strong>Tatal / cubit:</strong> zum',
        'footer.credit': 'Model: <a href="https://github.com/VT-ARIES/Anatomy" target="_blank" rel="noopener">Virginia Tech Virtual Animal Project / VT-ARIES</a> — <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a> · Kegunaan pendidikan bukan komersial · <a href="ATTRIBUTION.md">Kredit</a>',
        'mob.regions': '◧ Kawasan &amp; Paparan',
        'mob.info': '◨ Struktur'
    }
});

export const SPECIES = {
    Canine: { latin: 'Canis lupus familiaris', hex: '#e6c79c' },
    Equine: { latin: 'Equus ferus caballus', hex: '#c9a27a' },
    Bovine: { latin: 'Bos taurus', hex: '#d8d0c0' },
    Feline: { latin: 'Felis catus', hex: '#9fb7c9', soon: true }
};
