# Atıf / Attribution

Bu depodaki 3B anatomi verisi bize ait değildir. Aşağıdaki açık kaynak projelerden
türetilmiştir ve **CC BY-SA** lisansı gereği atıf zorunludur.

The 3D anatomical data in this repository is **not ours**. It is derived from the
open-source projects below. Attribution is **required** under CC BY-SA.

---

## 1. BodyParts3D

> **BodyParts3D, © The Database Center for Life Science (DBCLS)**
> licensed under **CC BY-SA 2.1 Japan**

- https://lifesciencedb.jp/bp3d/
- İnsan anatomisinin özgün 3B rekonstrüksiyonu (2003→).

## 2. Z-Anatomy

> **Z-Anatomy — The libre 3D atlas of anatomy**
> licensed under **CC BY-SA 4.0**

- https://www.z-anatomy.com/
- https://github.com/Z-Anatomy/Models-of-human-anatomy
- BodyParts3D verisinin yeniden düzenlenmiş, adlandırılmış ve Terminologia
  Anatomica (TA2) ile eşleştirilmiş Blender atlası.

`systems/*.glb` dosyaları Z-Anatomy `Startup.blend` dosyasından
`tools/export_systems.py` ile üretilmiştir (koleksiyon seçimi + decimate + glTF).
Geometri **indirgenmiştir**, anatomik içerik değiştirilmemiştir.

## 2b. Human Reference Atlas — female body

> **Kristen Browne and Heidi Schlehlein, Human Reference Atlas / HuBMAP,
> *3D Reference Organ Set for Female*, v1.10 and v1.5**
> licensed under **CC BY 4.0** — https://creativecommons.org/licenses/by/4.0/

- Reference library: https://humanatlas.io/3d-reference-library
- v1.10: https://cdn.humanatlas.io/digital-objects/ref-organ/united-female/v1.10/assets/3d-vh-f-united.glb
- v1.5 (ischium and pubis only, dropped from v1.10; same coordinate frame):
  https://cdn.humanatlas.io/digital-objects/ref-organ/united-female/v1.5/assets/3d-vh-f-united.glb
- Built on the Visible Human Dataset, U.S. National Library of Medicine.

`systems-female/*.glb` are produced by `tools/female/build.mjs`: transforms baked,
coincident vertices welded, geometry simplified (meshoptimizer, ≤1% relative error
per structure, 7.7M → 2.1M triangles), names cleaned and a few source spelling
errors corrected for display (e.g. "Jejenum" → "Jejunum").

The female source has no skull, ribs, shoulder girdle, arm, hand or foot bones.
These are **borrowed from the male atlas above** (BodyParts3D / Z-Anatomy), placed
by a least-squares uniform scale + translation onto landmarks both bodies share
(head: C1–C2, eyes, upper teeth and the cranial vault inside the female head skin;
thorax: T1–T12, manubrium, sternum; feet: tibia and fibula), with each arm turned
about the shoulder to follow the female arm. Fit parameters: `data/female-fit.json`.
They are tagged `[male-derived]`, drawn blue-grey, and can be switched off. They
carry none of the skeletal differences between the sexes outside the pelvis.

Because they include those CC BY-SA bones, the `systems-female/*.glb` files as a
whole are distributed under **CC BY-SA 4.0**, with attribution to both sources.

---

## 3. three.js

MIT License — https://github.com/mrdoob/three.js
`vendor/three/` altında sürüm **r185** yerel olarak tutulur (CDN bağımlılığı yok).
Lisans metni: `vendor/three/LICENSE`.

three-mesh-bvh 0.9.17 (Garrett Johnson, MIT) — `vendor/three-mesh-bvh/`, used for
fast hover picking. License text: `vendor/three-mesh-bvh/LICENSE`.

---

## Türetilmiş çalışma bildirimi / Derivative notice

`systems/` klasöründeki tüm `.glb` dosyaları yukarıdaki CC BY-SA kaynaklarından
**türetilmiş çalışmalardır** ve aynı lisansla (**CC BY-SA 4.0**) dağıtılmaktadır.
Bu dosyaları kullanan/yeniden dağıtan herkes aynı yükümlülüğü üstlenir.

All `.glb` files under `systems/` are **derivative works** of the CC BY-SA sources
above and are distributed under the same license (**CC BY-SA 4.0**). Anyone
redistributing them assumes the same obligation.

---

## Marka / Trademark

`assets/yzo-mark.png` — Yapay Zekâ Okulum logosu. **Bu depodaki lisanslar logoyu
kapsamaz**; marka hakları saklıdır. Çatallarsanız (fork) lütfen kendi logonuzla
değiştirin veya kaldırın.

`assets/yzo-mark.png` is the Yapay Zekâ Okulum brand mark. It is **not covered** by
the licenses in this repository; all rights reserved. Please replace or remove it
in forks.
