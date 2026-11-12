"""
Real-looking people for the farm game, made in Blender with MakeHuman (MPFB2).

Every farmer and neighbour of the game (written by scripts/build/people_specs.mjs from src/game/regions.js and
src/game/places.js) becomes a rigged human: MakeHuman's body for their age, sex, build and the ethnic mix of the
place, a few individual face differences seeded from their id, realistic skin, eyes, brows, lashes and teeth, hair
for their age and headwear, a beard or moustache where they have one, and the clothes of their place, fitted from
the body's own surface (MakeHuman's skirt and tights helpers and the skin itself) so every garment bends with the
same game skeleton. Fabric patterns are painted from their colours. One GLB per person, before optimisation.

Run (Blender 4.2+ with the MPFB extension and the makehuman_system_assets pack installed):
  node scripts/build/people_specs.mjs /tmp/people.json
  blender -b -P scripts/build/build_people.py -- /tmp/people.json OUTDIR [id,id,...] [--preview]
then `npm run people:optimize` (gltf-transform) writes public/models/folk/<id>.glb.

Materials are named for the game to tint at runtime: skin, hair, brow, beard, eyes, and cloth_* for garments.
All MakeHuman assets used are CC0 (see public/models/folk/LICENSE.md).
"""
import bpy, bmesh, sys, os, json, math, random, importlib
import numpy as np
from mathutils import Vector


def dyn(pkg, key):
    for m in list(sys.modules):
        if m.endswith(pkg):
            return getattr(importlib.import_module(m), key)
    raise ValueError(f"MPFB not loaded: {pkg}")


HumanService = dyn("mpfb.services.humanservice", "HumanService")
TargetService = dyn("mpfb.services.targetservice", "TargetService")
AssetService = dyn("mpfb.services.assetservice", "AssetService")
LocationService = dyn("mpfb.services.locationservice", "LocationService")
HOP = dyn("mpfb.entities.objectproperties", "HumanObjectProperties")

args = sys.argv[sys.argv.index("--") + 1:]
SPECS, OUT = args[0], args[1]
ONLY = set(args[2].split(",")) if len(args) > 2 and not args[2].startswith("--") else None
PREVIEW = "--preview" in args
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- body
ETHNIC = {  # african, asian, caucasian: MakeHuman's three macro sliders, as a rough mix for each place
    "bangladesh": (0.18, 0.27, 0.55), "india": (0.12, 0.13, 0.75), "pakistan": (0.08, 0.1, 0.82), "nepal": (0.1, 0.35, 0.55),
    "bhutan": (0.03, 0.8, 0.17), "myanmar": (0.05, 0.75, 0.2), "usa": (0.0, 0.03, 0.97), "brazil": (0.35, 0.08, 0.57),
}


def age_value(y):
    return 0.1875 + (y - 11) / 14 * 0.3125 if y <= 25 else min(1.0, 0.5 + (y - 25) / 65 * 0.5)


def skin_file(p):
    eth = ETHNIC.get(p.get("country"), ETHNIC["bangladesh"])
    group = "young" if p["age"] < 36 else "middleage" if p["age"] < 58 else "old"
    race = "caucasian" if eth[2] > 0.9 else "asian"  # a lighter texture keeps its detail when the game tints it to their own skin
    sex = "female" if p["female"] else "male"
    return f"{group}_{race}_{sex}.mhmat"


def make_body(p):
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures):
        for d in list(coll):
            if d.users == 0:
                coll.remove(d)
    h = HumanService.create_human()
    l = p["look"]
    build = l.get("build", 1)
    eth = ETHNIC.get(p.get("country"), ETHNIC["bangladesh"])
    macros = {
        "gender": 0.0 if p["female"] else 1.0, "age": age_value(p["age"]),
        "muscle": 0.56 if not p["female"] else 0.5, "weight": max(0.25, min(0.8, 0.42 + (build - 1) * 1.4 + (0.06 if p["age"] > 45 else 0))),
        "height": 0.38 if p["female"] else 0.46, "proportions": 0.55,
        "african": eth[0], "asian": eth[1], "caucasian": eth[2],
    }
    for k, v in macros.items():
        HOP.set_value(k, v, entity_reference=h)
    TargetService.reapply_macro_details(h)
    # a face of their own: small seeded changes to nose, mouth, eyes, chin and cheeks
    rnd = random.Random(p["id"])
    troot = LocationService.get_mpfb_data("targets")
    for sub in ("nose", "mouth", "eyes", "chin", "cheek", "eyebrows"):
        d = os.path.join(troot, sub)
        if not os.path.isdir(d):
            continue
        files = sorted(f for f in os.listdir(d) if f.endswith(".target.gz"))
        for f in rnd.sample(files, min(3, len(files))):
            TargetService.load_target(h, os.path.join(d, f), weight=round(rnd.uniform(0.05, 0.4), 2))
    skin = AssetService.find_asset_absolute_path(skin_file(p), asset_subdir="skins")
    HumanService.set_character_skin(skin, h, skin_type="GAMEENGINE")
    rig = HumanService.add_builtin_rig(h, "game_engine")
    return h, rig


def add_asset(h, sub, name, kind):
    path = AssetService.find_asset_absolute_path(name, asset_subdir=sub)
    if not path:
        print("MISSING", sub, name)
        return None
    return HumanService.add_mhclo_asset(path, h, asset_type=kind, material_type="GAMEENGINE")


# ---------------------------------------------------------------- the body as data
def baked_copy(h, name):
    """A copy of the body with its shape keys applied: the person's own shape, still rigged."""
    o = h.copy(); o.data = h.data.copy(); o.name = name
    bpy.context.collection.objects.link(o)
    for m in list(o.modifiers):
        if m.type != "ARMATURE":
            o.modifiers.remove(m)
    if o.data.shape_keys:
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
    return o


class Body:
    def __init__(self, h):
        self.src = baked_copy(h, "_measure")
        me = self.src.data
        self.co = np.array([v.co[:] for v in me.vertices])
        self.names = [g.name for g in self.src.vertex_groups]
        self.w = {}  # group name -> weights array
        for i, v in enumerate(me.vertices):
            for g in v.groups:
                n = self.names[g.group]
                if n not in self.w:
                    self.w[n] = np.zeros(len(me.vertices))
                self.w[n][i] = g.weight
        body = self.w.get("body", np.zeros(len(self.co))) > 0.5
        self.H = self.co[body, 2].max()

    def wt(self, name):
        return self.w.get(name, np.zeros(len(self.co)))

    def joint(self, name):
        m = self.wt(name) > 0.5
        return self.co[m].mean(axis=0) if m.any() else None

    def region(self, name, keep):
        """A new rigged mesh of the body's vertices where keep[i] is true (faces kept only when all their vertices are)."""
        o = self.src.copy(); o.data = self.src.data.copy(); o.name = name
        bpy.context.collection.objects.link(o)
        bm = bmesh.new(); bm.from_mesh(o.data); bm.verts.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep[v.index]], context="VERTS")
        bm.to_mesh(o.data); bm.free()
        for slot in list(o.material_slots):
            pass
        o.data.materials.clear()
        return o


def offset(o, d, radial=None):
    """Push the surface outward by d metres: along its normals, or away from a vertical axis (x, y) for drapes."""
    bm = bmesh.new(); bm.from_mesh(o.data); bm.normal_update()
    for v in bm.verts:
        if radial is not None:
            r = Vector((v.co.x - radial[0], v.co.y - radial[1], 0))
            if r.length > 1e-6:
                v.co += r.normalized() * d
        else:
            v.co += v.normal * d
    bm.to_mesh(o.data); bm.free()


def cut(o, co, no, only=None):
    """Cut the garment cleanly along a plane and drop the side the normal points to, as a tailor cuts cloth.
    `only(v)` limits the cut to part of the garment (one sleeve), so the plane does not slice the body too."""
    bm = bmesh.new(); bm.from_mesh(o.data)
    if only is None:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    else:
        vs = {v for v in bm.verts if only(v.co)}
        geom = list(vs) + [e for e in bm.edges if all(v in vs for v in e.verts)] + [f for f in bm.faces if all(v in vs for v in f.verts)]
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=Vector(co), plane_no=Vector(no).normalized(), clear_outer=True)
    bm.to_mesh(o.data); bm.free()


def flare(o, axis_fn, k_fn):
    """Widen a garment away from a per-height axis: shalwar legs, a ghagra's flare, a kurta's hem."""
    me = o.data
    for v in me.vertices:
        ax, ay = axis_fn(v.co)
        k = k_fn(v.co.z)
        v.co.x = ax + (v.co.x - ax) * k
        v.co.y = ay + (v.co.y - ay) * k


def cyl_uv(o, z0, z1, cx=0.0, cy=0.0, wraps=1.0):
    """Wrap the garment's UVs round its body: u round the circumference, v up from the hem (0) to the top (1)."""
    me = o.data
    if not me.uv_layers:
        me.uv_layers.new()
    uv = me.uv_layers.active.data
    for poly in me.polygons:
        us = []
        for li in poly.loop_indices:
            c = me.vertices[me.loops[li].vertex_index].co
            us.append((math.atan2(c.x - cx, -(c.y - cy)) / (2 * math.pi) + 0.5) * wraps)
        lo = min(us)
        for li, u in zip(poly.loop_indices, us):
            if u - lo > 0.5 * wraps:
                u -= wraps  # keep a face that crosses the back seam from smearing the whole texture
            c = me.vertices[me.loops[li].vertex_index].co
            uv[li].uv = (u, (c.z - z0) / max(1e-6, z1 - z0))


# ---------------------------------------------------------------- fabric, painted from their colours
def rgb(hexs, fallback="#888888"):
    h = (hexs or fallback).lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def fabric(name, kind, A, B=None, C=None, W=512, Hh=512, seed=1):
    a, b = rgb(A), rgb(B or A)
    c = rgb(C) if C else b
    u = np.linspace(0, 1, W, endpoint=False)[None, :].repeat(Hh, 0)
    v = np.linspace(0, 1, Hh, endpoint=False)[:, None].repeat(W, 1)
    rng = np.random.default_rng(seed)
    img = np.empty((Hh, W, 3)); img[:] = a
    if kind == "check":  # a lungi or longyi check, or a work shirt's plaid: two colours of yarn crossing
        n = 14
        su = (np.sin(u * n * 2 * np.pi) > 0.35).astype(float); sv = (np.sin(v * n * 2 * np.pi * 1.2) > 0.35).astype(float)
        fine = ((np.sin(u * n * 8 * np.pi) > 0.85) | (np.sin(v * n * 9 * np.pi) > 0.85)).astype(float)
        m = np.clip((su + sv) * 0.45 + fine * 0.25, 0, 1)[..., None]
        img = a * (1 - m) + b * m
    elif kind == "bands":  # a ghagra's or kira's woven bands, brightest at the hem
        band = ((np.sin(v * 2 * np.pi * 9) > 0.55) | (v < 0.08)).astype(float)[..., None]
        motif = ((np.sin(u * 2 * np.pi * 60) * np.sin(v * 2 * np.pi * 70) > 0.6) & (band[..., 0] > 0)).astype(float)[..., None]
        img = a * (1 - band) + b * band; img = img * (1 - motif) + c * motif
    elif kind == "border":  # a sari or dhoti: plain ground with a woven border at the hem
        m = ((v < 0.09) & (v > 0.02)).astype(float)[..., None]
        thin = ((v > 0.11) & (v < 0.125)).astype(float)[..., None]
        img = a * (1 - np.maximum(m, thin)) + b * np.maximum(m, thin)
    elif kind == "knit":  # a hand-knitted sweater: ribs and a little fuzz
        rib = (0.86 + 0.14 * np.sin(u * 2 * np.pi * 110))[..., None]
        img = a * rib
    elif kind == "print":  # an ajrak-like block print: rosettes in rows
        g = ((np.sin(u * 2 * np.pi * 26) * np.sin(v * 2 * np.pi * 26)) > 0.45).astype(float)[..., None]
        dots = ((np.sin(u * 2 * np.pi * 52 + 1.5) * np.sin(v * 2 * np.pi * 52 + 1.5)) > 0.8).astype(float)[..., None]
        img = a * (1 - g) + b * g; img = img * (1 - dots) + np.array([0.95, 0.93, 0.88]) * dots
    # the weave: fine thread noise and a soft light/dark, so cloth never looks like plastic
    weave = 1 + 0.06 * (np.sin(u * 2 * np.pi * 256) * np.sin(v * 2 * np.pi * 256)) + rng.normal(0, 0.025, (Hh, W))
    img = np.clip(img * weave[..., None], 0, 1)
    im = bpy.data.images.new(name, W, Hh)
    px = np.concatenate([img, np.ones((Hh, W, 1))], axis=2)
    im.pixels.foreach_set(px.astype(np.float32).ravel())
    im.pack()
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = im
    nt.links.new(t.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.88
    m.use_backface_culling = False
    return m


def solid(name, color, rough=0.6, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb(color), 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    return m


def finish(o, mat):
    o.data.materials.clear(); o.data.materials.append(mat)
    for poly in o.data.polygons:
        poly.use_smooth = True
    return o


# ---------------------------------------------------------------- MakeHuman's own garments, repainted
LEG_BONES = ("thigh_", "calf_", "foot_", "ball_")


def uv_islands(o):
    """Faces grouped by UV island (connected across edges whose UVs agree on both sides)."""
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    uvl = bm.loops.layers.uv.active
    parent = list(range(len(bm.faces)))
    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]; i = parent[i]
        return i
    for e in bm.edges:
        if len(e.link_faces) != 2:
            continue
        f0, f1 = e.link_faces
        def uvs(f):
            return {l.vert.index: tuple(round(c, 5) for c in l[uvl].uv) for l in f.loops if l.vert in e.verts}
        if uvs(f0) == uvs(f1):
            parent[find(f0.index)] = find(f1.index)
    groups = {}
    for f in bm.faces:
        groups.setdefault(find(f.index), []).append(f.index)
    bm.free()
    return list(groups.values())


def leg_share(o, verts):
    names = {g.index: g.name for g in o.vertex_groups}
    leg = tot = 0.0
    for vi in verts:
        for g in o.data.vertices[vi].groups:
            n = names.get(g.group, "")
            if n in ("body",) or n.startswith(("joint", "helper")):
                continue
            tot += g.weight
            if n.startswith(LEG_BONES):
                leg += g.weight
    return leg / tot if tot else 0.0


def split_suit(o):
    """A MakeHuman suit is one mesh: return (top, bottom) as two objects, split cleanly at the waistband."""
    names = {g.index: g.name for g in o.vertex_groups}
    max_z = max(v.co.z for v in o.data.vertices)
    bottom_faces = set()
    for f in o.data.polygons:
        vs = list(f.vertices)
        z = sum(o.data.vertices[v].co.z for v in vs) / len(vs)
        bot_w = top_w = 0.0
        for vi in vs:
            for g in o.data.vertices[vi].groups:
                n = names.get(g.group, "")
                if n.startswith(LEG_BONES) or "pelvis" in n or "root" in n:
                    bot_w += g.weight
                elif "spine" in n or "chest" in n or "arm" in n or "neck" in n or "head" in n:
                    top_w += g.weight
        total = bot_w + top_w
        share = bot_w / total if total else 0.0
        if z < 0.63 * max_z and (share > 0.35 or z < 0.50 * max_z):
            bottom_faces.add(f.index)
    top = o; bot = o.copy(); bot.data = o.data.copy(); bpy.context.collection.objects.link(bot)
    for ob, drop_bottom in ((top, True), (bot, False)):
        bm = bmesh.new(); bm.from_mesh(ob.data); bm.faces.ensure_lookup_table()
        kill = [f for f in bm.faces if (f.index in bottom_faces) == drop_bottom]
        bmesh.ops.delete(bm, geom=kill, context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        bm.to_mesh(ob.data); bm.free()
    top.name = o.name + "_top"; bot.name = o.name + "_bottom"
    return top, bot


def garment_maps(asset_path):
    d = os.path.dirname(asset_path); n = os.path.splitext(os.path.basename(asset_path))[0]
    f = lambda suf: next((os.path.join(d, x) for x in os.listdir(d) if x.lower() == f"{n}_{suf}.png"), None)
    return f("diffuse"), f("ao"), f("normal")


def load_px(path, size):
    im = bpy.data.images.load(path, check_existing=True)
    if tuple(im.size) != (size, size):
        im = im.copy(); im.scale(size, size)
    return np.array(im.pixels[:], np.float32).reshape(size, size, 4)


def repaint(o, asset_path, kind, A, B=None, C=None, use_shading=True, name="cloth", size=1024, seed=1):
    """Paint the garment in the person's own fabric, keeping MakeHuman's creases: the fold map, and (for plain
    garments with no logo) the light and shade of the original cloth."""
    diff, ao, nrm = garment_maps(asset_path)
    fab = fabric(name + "_tmp", kind, A, B, C, W=size, Hh=size, seed=seed)
    fpx = np.array(fab.node_tree.nodes["Image Texture"].image.pixels[:], np.float32).reshape(size, size, 4)
    shade = np.ones((size, size), np.float32)
    if ao:
        shade *= np.clip(load_px(ao, size)[..., 0] * 1.05, 0, 1) ** 0.9
    if use_shading and diff:
        d = load_px(diff, size)[..., :3].mean(axis=2)
        m = d[d > 0.03].mean() if (d > 0.03).any() else 0.5
        shade *= np.clip(d / max(1e-3, m), 0.35, 1.5) ** 0.75
    px = fpx.copy(); px[..., :3] = np.clip(fpx[..., :3] * shade[..., None], 0, 1); px[..., 3] = 1
    im = bpy.data.images.new(name, size, size); im.pixels.foreach_set(px.ravel()); im.pack()
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = im; nt.links.new(t.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.86
    if nrm:
        nt_ = nt.nodes.new("ShaderNodeTexImage"); nt_.image = bpy.data.images.load(nrm, check_existing=True); nt_.image.colorspace_settings.name = "Non-Color"
        nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(nt_.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    bpy.data.materials.remove(fab)
    o.data.materials.clear(); o.data.materials.append(m)
    return o


# garments by name: (MakeHuman suit, which half, keep its own shading?)
TOP_SUIT = {
    "shirt": ("male_casualsuit01", True), "eingyi": ("male_casualsuit01", True), "tego": ("male_casualsuit01", True),
    "kurta": ("male_casualsuit02", False), "kameez": ("male_casualsuit02", False), "sweater": ("male_casualsuit02", False),
    "polo": ("male_casualsuit04", False), "fotua": ("male_casualsuit04", False), "genji": ("male_casualsuit06", False),
}
TOP_SUIT_F = {"shirt": ("female_elegantsuit01", False), "blouse": ("female_casualsuit01", False), "choli": ("female_casualsuit01", False),
              "tego": ("female_elegantsuit01", False), "kameez": ("female_elegantsuit01", False)}
LOW_SUIT = {"cargo": ("male_casualsuit01", True), "pyjama": ("male_casualsuit01", False), "shalwar": ("male_casualsuit01", False)}
LOW_SUIT_F = {"cargo": ("female_casualsuit01", True), "pyjama": ("female_casualsuit01", False), "shalwar": ("female_casualsuit01", False)}


def suit_half(h, B, suit, half):
    path = AssetService.find_asset_absolute_path(suit + ".mhclo", asset_subdir="clothes")
    o = HumanService.add_mhclo_asset(path, h, asset_type="Clothes", material_type="GAMEENGINE")
    for m in list(o.modifiers):  # keep the cloth as built: the subdivision is applied by the game's normals instead
        if m.type == "SUBSURF":
            o.modifiers.remove(m)
    top, bot = split_suit(o)
    keep, drop = (top, bot) if half == "top" else (bot, top)
    bpy.data.objects.remove(drop, do_unlink=True)
    unhide_uncovered(h, keep)
    return keep, path


def unhide_uncovered(h, garment, reach=0.06):
    """MakeHuman hides the skin under a whole suit; we keep half of one, so give back the skin it no longer covers
    (Razib's arms under a shirt we did not use)."""
    from mathutils.bvhtree import BVHTree
    bm = bmesh.new(); bm.from_mesh(garment.data); bm.transform(garment.matrix_world)
    tree = BVHTree.FromBMesh(bm); bm.free()
    class _KD:  # distance to the garment's surface, not to its nearest vertex
        def find(self, co):
            hit = tree.find_nearest(co)
            return (None, None, hit[3] if hit[0] is not None else 1e9)
    kd = _KD()
    for g in h.vertex_groups:
        if not g.name.lower().startswith("delete") and "male_casualsuit" not in g.name and "female_" not in g.name:
            continue
        free = [v.index for v in h.data.vertices if any(x.group == g.index and x.weight > 0 for x in v.groups) and kd.find(h.matrix_world @ v.co)[2] > reach]
        if free:
            g.remove(free)


# ---------------------------------------------------------------- garments
TOP = {  # length, sleeve, looseness (m), pattern
    "shirt": ("hip", "short", 0.012, "check"), "polo": ("hip", "short", 0.01, "solid"), "kurta": ("knee", "long", 0.014, "solid"),
    "kameez": ("knee", "long", 0.014, "solid"), "fotua": ("hip", "short", 0.013, "solid"), "genji": ("waist", "none", 0.006, "solid"),
    "blouse": ("crop", "short", 0.006, "solid"), "choli": ("crop", "short", 0.005, "solid"), "sweater": ("hip", "long", 0.016, "knit"),
    "tego": ("hip", "long", 0.016, "bands"), "eingyi": ("hip", "long", 0.012, "solid"),
}
LOWER = {  # shape, length, pattern
    "lungi": ("wrap", "ankle", "check"), "longyi": ("wrap", "ankle", "check"), "sari": ("wrap", "ankle", "border"),
    "kira": ("wrap", "ankle", "bands"), "ghagra": ("flare", "ankle", "bands"), "dhoti": ("shalwar", "shin", "border"),  # passed between the legs: two loose legs, not a skirt
    "pyjama": ("trouser", "ankle", "solid"), "shalwar": ("shalwar", "ankle", "solid"), "cargo": ("trouser", "ankle", "solid"),
}


def make_top(B, kind, l, h=None, female=False):
    length, sleeve, loose, pat = TOP.get(kind, TOP["shirt"])
    H = B.H
    suit, shading = (TOP_SUIT_F if female else TOP_SUIT).get(kind) or TOP_SUIT.get(kind) or ("male_casualsuit04", False)
    o, path = suit_half(h, B, suit, "top")
    pieces = [o]
    for side in ("l", "r"):
        sh = B.joint(f"joint-{side}-shoulder"); el = B.joint(f"joint-{side}-elbow")
        if sh is None or el is None:
            continue
        sg = 1 if side == "l" else -1
        d = el - sh
        u = Vector(d).normalized()
        sh_vec = Vector(sh)
        arm_side = (lambda c, u_=u, sh_=sh_vec, s_=sg: c.x * s_ > 0.04 and ((c - sh_) - u_ * ((c - sh_).dot(u_))).length < 0.16)
        if sleeve == "none":
            cut(o, sh + d * 0.02, d, arm_side)
            # a genji has narrow straps over the shoulder and deep armholes: cut the outer shoulder away down the side
            inner = abs(sh[0]) - 0.05
            cut(o, (sg * inner, 0, 0), (sg, 0, 0), only=lambda c, sz=sh[2]: c.z > sz - 0.2)
            relax_edges(o, 10)  # a vest's armhole is a smooth curve, not a stepped cut
        elif sleeve == "short" and "casualsuit01" in suit or (sleeve == "short" and "elegant" in suit):
            cut(o, sh + d * 0.55, d, arm_side)
    if length == "crop":
        cut(o, (0, 0, 0.56 * H), (0, 0, -1))
    # Give the garment tailored thickness and outward clearance over the skin
    # a close, real fit: a few millimetres off the skin (the body's chest is tucked in build() so it never pokes
    # through); 2 cm all round plus a pushed-out chest made every shirt look inflated
    offset(o, 0.009)
    bm = bmesh.new(); bm.from_mesh(o.data)
    for v in bm.verts:
        if abs(v.co.x) < 0.28 and 0.50 * H < v.co.z < 0.90 * H and v.co.y < 0:
            v.co.y -= 0.006
    bm.normal_update(); bm.to_mesh(o.data); bm.free()
    repaint(o, path, "check" if pat == "check" else pat, l.get("topA"), l.get("topB"), l.get("topC"), use_shading=shading and pat != "check",
            name=f"cloth_top_{kind}", seed=hash(kind) % 1000)
    if length == "knee":  # the long tunic: the skirt helper from the shirt's hem to the knee, flaring a little
        z = B.co[:, 2]
        shirt_low = min((o.matrix_world @ v.co).z for v in o.data.vertices)
        cut(o, (0, 0, shirt_low + 0.06), (0, 0, -1))  # the suit's belt and hem band go: the long hem takes over
        hem = min(0.56 * H, shirt_low + 0.11)  # into the shirt body
        skirt = (B.wt("helper-skirt") > 0.5) & (z > 0.27 * H) & (z <= hem + 0.06)
        sk = B.region(f"hem_{kind}", skirt)
        cut(sk, (0, 0, 0.3 * H), (0, 0, -1)); cut(sk, (0, 0, hem + 0.05), (0, 0, 1))
        flare(sk, lambda c: (0.0, 0.0), lambda zz: 1.06 + (hem - zz) / H * 0.25)
        cyl_uv(sk, 0.3 * H, 0.84 * H)
        finish(sk, fabric(f"cloth_hem_{kind}", pat, l.get("topA"), l.get("topB"), l.get("topC"), seed=hash(kind) % 1000))
        pieces.append(sk)
    return pieces


def make_lower(B, kind, l, h=None, female=False):
    shape, length, pat = LOWER.get(kind, LOWER["pyjama"])
    H = B.H
    z = B.co[:, 2]
    waist = 0.62 * H if shape in ("wrap", "flare") else 0.58 * H
    if kind == "sari":
        waist = 0.585 * H  # tucked just under the blouse's hem (cut at 0.56–0.66 H): never through it
    if shape in ("wrap", "flare") and TOP.get(l.get("top"), ("hip",))[0] == "knee":
        waist = 0.37 * H  # under a kurta or kameez: the wrap starts just inside its hem, so the two never fight
    foot = {"ankle": 0.06, "shin": 0.2}[length] * H
    pieces = []
    if shape in ("wrap", "flare"):
        keep = (B.wt("helper-skirt") > 0.5) & (z > foot - 0.04) & (z < waist + 0.04)
        o = B.region(f"low_{kind}", keep)
        if shape == "flare":
            flare(o, lambda c: (0.0, 0.0), lambda zz: 1.0 + max(0.0, waist - zz) / H * 0.55)
        else:
            flare(o, lambda c: (0.0, 0.0), lambda zz: 1.02 + max(0.0, waist - zz) / H * 0.06)
        cut(o, (0, 0, foot), (0, 0, -1)); cut(o, (0, 0, waist), (0, 0, 1))
        offset(o, 0.008)
        relax_edges(o, 8)  # the waist and hem edges run smooth, with no stepped teeth
        cyl_uv(o, foot, waist, wraps=4 if pat == "check" else 2)
        pieces.append(o)
    else:
        suit, shading = (LOW_SUIT_F if female else LOW_SUIT).get(kind, ("male_casualsuit01", False))
        o, path = suit_half(h, B, suit, "bottom")
        offset(o, 0.008)
        if shape == "shalwar" or kind == "pyjama":  # loose cotton: wider through the leg, gathered at the ankle
            thl, thr = B.joint("joint-l-upper-leg"), B.joint("joint-r-upper-leg")
            anl, anr = B.joint("joint-l-ankle"), B.joint("joint-r-ankle")
            def axis(c):
                a, b = (thl, anl) if c.x > 0 else (thr, anr)
                t = (a[2] - c.z) / max(1e-6, a[2] - b[2])
                return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
            amt = 0.3 if kind == "dhoti" else 0.55 if shape == "shalwar" else 0.2  # a dhoti hangs loose but not puffed
            crotch = min(thl[2], thr[2]) - 0.02
            if TOP.get(l.get("top"), ("hip",))[0] == "knee":
                # under a long kameez or kurta the trousers stay slim up to its hem, so the hem hangs outside them
                crotch = 0.33 * H
            flare(o, lambda c: axis(c) if c.z < crotch else (0.0, 0.0),
                  lambda zz: (1.0 + amt * math.sin(min(1.0, max(0.0, (zz - 0.06 * H) / max(1e-6, crotch - 0.06 * H))) * math.pi * 0.62)) if zz < crotch else 1.03)
        if kind == "dhoti":  # it ends at mid-calf; the woven border runs round each leg's hem
            cut(o, (0, 0, 0.13 * H), (0, 0, -1))
            relax_edges(o, 6)
            cyl_uv(o, 0.13 * H, 0.58 * H, wraps=2)
            finish(o, fabric(f"cloth_low_{kind}", pat, l.get("lowA"), l.get("lowB"), l.get("lowC"), seed=31))
            return [o]
        repaint(o, path, pat, l.get("lowA"), l.get("lowB"), l.get("lowC"), use_shading=shading, name=f"cloth_low_{kind}", seed=hash(kind) % 997)
        return [o]
    mat = fabric(f"cloth_low_{kind}", pat, l.get("lowA"), l.get("lowB"), l.get("lowC"), seed=hash(kind) % 997)
    for pc in pieces:
        finish(pc, mat)
    return pieces


def sari_pallu(B, l, over=None):
    """The sari's end, from the body's own surface: a band from the right hip up across the chest, over the left
    shoulder and down the back, a little off the blouse, with its woven border along both edges."""
    H = B.H; co = B.co; z = co[:, 2]
    sh = B.joint("joint-l-shoulder"); sh = sh if sh is not None else np.array([0.17, 0.0, 0.82 * H])
    a = np.array([-0.13, 0.55 * H]); b = np.array([sh[0] - 0.03, sh[2] + 0.04]); w = 0.095
    p = np.stack([co[:, 0], z], axis=1); ab = b - a
    t = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1)
    front_d = np.linalg.norm(p - (a + t[:, None] * ab), axis=1)
    back_d = np.abs(co[:, 0] - (sh[0] - 0.03))
    skin = (B.wt("body") > 0.5) & (B.wt("upperarm_l") < 0.4) & (B.wt("head") < 0.2) & (B.wt("neck_01") < 0.5)
    front = co[:, 1] < -0.0
    across = np.where(front, front_d, np.where(z > sh[2] - 0.02, np.minimum(front_d, back_d), back_d))
    keep = skin & (across < w) & (z > 0.5 * H) & ((front & (z < sh[2] + 0.08)) | (~front & (z > 0.45 * H)))
    o = B.region("pallu", keep)
    offset(o, 0.02)
    if over is not None:
        wrap_outside(o, over, 0.012)
    relax_edges(o, 14)  # a woven edge is a straight line, not the body's mesh steps
    sm = o.modifiers.new("smooth", "CORRECTIVE_SMOOTH"); sm.iterations = 6
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="smooth")
    me = o.data
    if not me.uv_layers:
        me.uv_layers.new()
    uv = me.uv_layers.active.data
    for li, loop in enumerate(me.loops):  # v from the band's edge (0) to its middle (1): the border on both edges
        c = me.vertices[loop.vertex_index].co
        q = np.array([c.x, c.z]); tt = np.clip(((q - a) @ ab) / (ab @ ab), 0, 1)
        dd = np.linalg.norm(q - (a + tt * ab)) if c.y < 0 else abs(c.x - (sh[0] - 0.03))
        uv[li].uv = (c.z * 2.0, max(0.0, 1 - dd / w))
    return finish(o, fabric("cloth_pallu", "border", l.get("lowA"), l.get("lowB"), seed=7))


def strip(name, pts, width, segs=40):
    """A cloth strip along a path of points (a pallu, a gamcha over the shoulder), as a flat ribbon to lay on the body."""
    pts = [Vector(p) for p in pts]
    bm = bmesh.new(); rows = []
    tot = sum((pts[i + 1] - pts[i]).length for i in range(len(pts) - 1))
    for k in range(segs + 1):
        t = k / segs * tot; acc = 0; i = 0
        while i < len(pts) - 2 and acc + (pts[i + 1] - pts[i]).length < t:
            acc += (pts[i + 1] - pts[i]).length; i += 1
        seg = pts[i + 1] - pts[i]; f = (t - acc) / max(1e-6, seg.length)
        c = pts[i] + seg * f
        side = seg.cross(Vector((0, 1, 0))).normalized() * (width / 2)
        rows.append([bm.verts.new(c - side + side * (2 * q / ACROSS)) for q in range(ACROSS + 1)])
    for k in range(segs):
        for q in range(ACROSS):
            bm.faces.new((rows[k][q], rows[k][q + 1], rows[k + 1][q + 1], rows[k + 1][q]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    uv = me.uv_layers.new().data
    for li, loop in enumerate(me.loops):
        vi = loop.vertex_index; uv[li].uv = ((vi % (ACROSS + 1)) / ACROSS, (vi // (ACROSS + 1)) / segs)
    return o


ACROSS = 10


def lay_on(o, target, gap):
    """Shrink-wrap a piece onto the body surface with a small gap, then bind it to the body's bones."""
    m = o.modifiers.new("wrap", "SHRINKWRAP"); m.target = target; m.offset = gap; m.wrap_method = "NEAREST_SURFACEPOINT"
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.modifier_apply(modifier="wrap")
    if len(o.data.vertices) < 2000:
        m = o.modifiers.new("subd", "SUBSURF"); m.levels = 1
        bpy.ops.object.modifier_apply(modifier="subd")
    dt = o.modifiers.new("weights", "DATA_TRANSFER"); dt.object = target; dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}
    dt.vert_mapping = "NEAREST"; dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
    bpy.ops.object.datalayout_transfer(modifier="weights")
    bpy.ops.object.modifier_apply(modifier="weights")
    return o


def relax_edges(o, iters=6):
    """Smooth the open edges of a cut-out (a face opening, a hem), so they curve instead of stepping."""
    bm = bmesh.new(); bm.from_mesh(o.data)
    edge = [v for v in bm.verts if v.is_boundary]
    for _ in range(iters):
        new = {}
        for v in edge:
            nb = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
            if len(nb) == 2:
                new[v] = v.co * 0.5 + (nb[0].co + nb[1].co) * 0.25
        for v, c in new.items():
            v.co = c
    bm.to_mesh(o.data); bm.free()


def wrap_outside(o, target, gap):
    """Push any part of a piece that lies inside another garment out over it (a pallu over a loose blouse)."""
    m = o.modifiers.new("over", "SHRINKWRAP"); m.target = target; m.wrap_method = "NEAREST_SURFACEPOINT"
    m.wrap_mode = "OUTSIDE_SURFACE"; m.offset = gap
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="over")


def head_frame(B):
    scalp = B.wt("scalp") > 0.5
    hc = B.co[scalp]
    top = B.co[B.wt("head") > 0.5][:, 2].max()
    eye = B.joint("joint-l-eye"); mouth = B.joint("joint-mouth"); jaw = B.joint("joint-jaw")
    cx, cy = hc[:, 0].mean(), hc[:, 1].mean()
    r = max(hc[:, 0].max() - hc[:, 0].min(), hc[:, 1].max() - hc[:, 1].min()) / 2
    return dict(cx=cx, cy=cy, top=top, r=r, eye=eye, mouth=mouth, jaw=jaw)


def rigid_to(o, rig, bone="head"):
    """Bind a rigid piece (a cap, a turban) wholly to one bone, so it moves with the head."""
    g = o.vertex_groups.new(name=bone); g.add(range(len(o.data.vertices)), 1.0, "REPLACE")
    m = o.modifiers.new("Armature", "ARMATURE"); m.object = rig
    return o


def prim_sphere(name, r, rings=16, segs=32, cap=None):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=r)
    if cap is not None:
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < cap], context="VERTS")
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); return o


def prim_torus(name, R, r, segs=40, ring=10):
    bm = bmesh.new()
    verts = []
    for i in range(segs):
        a = i / segs * 2 * math.pi
        for j in range(ring):
            b = j / ring * 2 * math.pi
            verts.append(bm.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b))))
    for i in range(segs):
        for j in range(ring):
            a0 = i * ring + j; a1 = i * ring + (j + 1) % ring; b0 = ((i + 1) % segs) * ring + j; b1 = ((i + 1) % segs) * ring + (j + 1) % ring
            bm.faces.new((verts[a0], verts[b0], verts[b1], verts[a1]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); return o


def make_head(B, rig, kind, l, female):
    """Headwear sized to the person's own head. Returns (pieces, wants_hair)."""
    f = head_frame(B); H = B.H
    z = B.co[:, 2]; head = B.wt("head") > 0.5
    A, Bc = l.get("headA"), l.get("headB")
    brow = f["eye"][2] + 0.03 if f["eye"] is not None else f["top"] - 0.09
    pieces = []
    if kind == "cap":
        # Remove unnatural primitive sphere cap: give full realistic human hairstyle
        return pieces, True
    if kind in ("tupi", "sindhi", "monkeycap"):
        # a cap made from the head's own surface, a few millimetres off the scalp, so it fits this head exactly
        # (a topi on the crown, a Sindhi cap lower round the forehead, a monkey cap down over the ears)
        lift = {"tupi": 0.035, "sindhi": 0.012, "monkeycap": -0.02}[kind]
        crown = (B.wt("head") > 0.5) & (B.wt("body") > 0.5) & (z > brow + lift - 0.03)  # the skin, not the hair helper shell
        cap = B.region(f"hat_{kind}", crown)
        cut(cap, (0, 0, brow + lift), (0, 0, -1))
        offset(cap, 0.012 if kind == "sindhi" else 0.016 if kind == "tupi" else 0.012)  # over the hair, not under it
        if kind == "sindhi":
            # a Sindhi cap is a stiff embroidered drum with a flat top, the arch over the forehead cut away
            z0, zt, cx, cy, r = brow + lift, f["top"] + 0.016, f["cx"], f["cy"], f["r"]
            bm = bmesh.new(); bm.from_mesh(cap.data)
            for v in bm.verts:
                if v.co.z > zt - 0.035:  # the crown: a flat top
                    v.co.z = zt
                else:  # straighten the sides into a drum
                    rr = math.hypot(v.co.x - cx, v.co.y - cy)
                    if rr > 1e-6 and v.co.z > z0 + 0.01:
                        k = (r * 0.98) / rr if rr < r * 0.98 else 1.0
                        v.co.x = cx + (v.co.x - cx) * k; v.co.y = cy + (v.co.y - cy) * k
            arch = [v for v in bm.verts if v.co.y < cy - r * 0.55 and abs(v.co.x - cx) < r * (0.36 - (v.co.z - z0) * 5.0) and v.co.z < z0 + 0.035]
            bmesh.ops.delete(bm, geom=arch, context="VERTS")
            bm.to_mesh(cap.data); bm.free()
        cyl_uv(cap, brow + lift, f["top"] + 0.02, cx=f["cx"], cy=f["cy"], wraps=2 if kind == "sindhi" else 1)
        mat = fabric("cloth_hat", "knit" if kind != "sindhi" else "bands", A or ("#f4f1ea" if kind == "tupi" else "#4a6a8a"), Bc or "#e2b84a", l.get("headC"))
        pieces.append(finish(cap, mat))
        return pieces, kind != "monkeycap"
    if kind in ("turban", "gamcha", "gaungbaung"):
        # cloth wound round the head, made from the head's own surface so it fits it: a gamcha or gaungbaung is a
        # twisted band round the brow; a turban covers the crown in layered, overlapping folds
        skin = (B.wt("head") > 0.5) & (B.wt("body") > 0.5)
        if kind == "turban":
            keep = skin & (z > brow - 0.012)
        else:
            keep = skin & (z > brow - 0.008) & (z < brow + 0.06)
        o = B.region(f"wrap_{kind}", keep)
        relax_edges(o, 6)
        bm = bmesh.new(); bm.from_mesh(o.data); bm.normal_update()
        z0 = brow - 0.012
        for v in bm.verts:
            h_ = v.co.z - z0
            ang = math.atan2(v.co.x - f["cx"], -(v.co.y - f["cy"]))
            if kind == "turban":
                # each wind of cloth is a rounded ridge, slanting up from the front; the crown gets a flat-ish top
                ph = (h_ - ang * 0.012) / 0.026
                ridge = 0.5 + 0.5 * math.cos(ph * 2 * math.pi)
                d = 0.022 + 0.012 * ridge + max(0.0, 0.035 - h_) * 0.3
            else:
                # a twisted roll: thickest in the middle of the band, a twist every few centimetres round the head
                mid = 1 - abs((h_ - 0.034) / 0.036)
                d = 0.012 + 0.02 * max(0.0, mid) ** 0.6 * (0.8 + 0.2 * math.cos(ang * 9))
            v.co += v.normal * d
        bm.to_mesh(o.data); bm.free()
        sm = o.modifiers.new("smooth", "CORRECTIVE_SMOOTH"); sm.iterations = 3
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="smooth")
        cyl_uv(o, brow - 0.02, f["top"] + 0.05, cx=f["cx"], cy=f["cy"], wraps=3 if kind == "gamcha" else 2)
        mat = fabric("cloth_wrap", "check" if kind == "gamcha" else "solid", A or "#e2a83a", Bc or "#c0392b")
        pieces.append(finish(o, mat))
        return pieces, kind != "turban"
    if kind in ("orhni", "aanchal", "hijab"):
        # a cloth from the body's own head, neck and shoulders, a little off the skin, so it follows this person
        # exactly; an oval opening for the face. A hijab closes under the chin; an orhni or aanchal covers the head
        # and falls down the back and over the shoulders, open at the throat.
        chin = f["jaw"][2] - 0.045 if f["jaw"] is not None else brow - 0.15
        skin = B.wt("body") > 0.5
        upper = B.wt("upperarm_l") + B.wt("upperarm_r")
        shoulders = (B.wt("spine_03") + B.wt("clavicle_l") + B.wt("clavicle_r") + B.wt("neck_01")) > 0.3
        low = (0.79 if kind == "hijab" else 0.7) * H
        keep = skin & (z > low) & ((B.wt("head") > 0.3) | shoulders) & (upper < 0.35)
        if kind != "hijab":  # down the back further than the front
            keep &= (B.co[:, 1] > f["cy"] - f["r"] * 0.2) | (z > 0.78 * H)
        zc, hh = (brow + chin) / 2 + 0.006, (brow - chin) / 2 + 0.012
        dxf = (B.co[:, 0] - f["cx"]) / (f["r"] * 0.74); dzf = (z - zc) / hh
        face = (B.co[:, 1] < f["cy"] - f["r"] * 0.15) & (dxf ** 2 + dzf ** 2 < 1.0)
        if kind != "hijab":
            face |= (B.co[:, 1] < f["cy"] - f["r"] * 0.3) & (z < chin + 0.02) & (np.abs(B.co[:, 0] - f["cx"]) < f["r"] * 0.9)
        keep &= ~face
        o = B.region(f"scarf_{kind}", keep)
        # the cloth goes over the ears, not round them: pull the ears in to the head's own curve first
        ears = B.wt("ears") > 0.05
        names = {g.index: g.name for g in o.vertex_groups}
        for v in o.data.vertices:
            if any(names.get(g.group) == "ears" and g.weight > 0.05 for g in v.groups):
                # every fold of the ear lands on one smooth curve round the head, so the cloth lies flat over it
                rr = math.hypot(v.co.x - f["cx"], v.co.y - f["cy"])
                if rr > 1e-6:
                    lim = f["r"] * 0.93
                    v.co.x = f["cx"] + (v.co.x - f["cx"]) * lim / rr; v.co.y = f["cy"] + (v.co.y - f["cy"]) * lim / rr
        relax_edges(o, 8)
        sm0 = o.modifiers.new("ears", "SMOOTH"); sm0.factor = 0.8; sm0.iterations = 6
        sm0.vertex_group = "ears" if "ears" in o.vertex_groups else ""
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="ears")
        offset(o, 0.018 if kind == "hijab" else 0.02)
        sm = o.modifiers.new("smooth", "CORRECTIVE_SMOOTH"); sm.iterations = 10; sm.scale = 1.0
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="smooth")
        cyl_uv(o, low, f["top"] + 0.02, cx=f["cx"], cy=f["cy"])
        pieces.append(finish(o, fabric("cloth_scarf", "border", A or "#c0392b", Bc or "#e2b84a")))
        return pieces, kind != "hijab"
    return pieces, True  # 'bare', 'short': their own hair


def smooth01(x):
    x = np.clip(x, 0.0, 1.0); return x * x * (3 - 2 * x)


def paint_beard(h, B, l, f, rng_seed=5):
    """Grow the beard or moustache in the skin itself: a density over the face (the line from the sideburns down
    the cheek to the mouth corners, the moustache over the lip, under the chin into the neck), painted into the
    skin texture through the face's own UVs, with hair grain. No separate mesh, so no edges that show."""
    m, j, e = f["mouth"], f["jaw"], f["eye"]
    if m is None or j is None or e is None:
        return
    co = B.co; head = B.wt("head") + B.wt("neck_01") * 0.6
    dx = np.abs(co[:, 0] - f["cx"]); zz = co[:, 2]; r = f["r"]
    only_tache = not l.get("beard")
    # the cheek line stays low across the cheek and rises only near the ear, to the sideburn
    t = np.clip((dx - 0.026) / max(1e-6, r - 0.026), 0, 1)
    top_line = np.where(dx < 0.028, m[2] + 0.021, m[2] + 0.012) + t ** 2.4 * max(0.0, (e[2] - 0.035) - (m[2] + 0.012))
    d = smooth01((top_line - zz) / 0.016)  # a soft edge into the cheek                                   # below the cheek line
    d *= smooth01((zz - (j[2] - 0.05)) / 0.025)                              # down under the chin, fading into the neck
    d *= smooth01((f["cy"] + r * 0.1 - co[:, 1]) / 0.03)                     # not behind the jaw
    d *= smooth01((r * 1.02 - dx) / 0.02)                                     # not past the ears
    lips = smooth01((0.0095 - np.abs(zz - m[2])) / 0.004) * smooth01((0.03 - dx) / 0.008)
    d *= 1 - lips
    if only_tache:
        d *= smooth01((zz - (m[2] + 0.005)) / 0.003) * smooth01((0.034 - dx) / 0.008)
    d *= np.clip(head, 0, 1)
    if d.max() < 0.05:
        return
    mat = next((s.material for s in h.material_slots if s.material and s.material.name.startswith("skin")), None)
    img = None
    if mat and mat.use_nodes:
        bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if bsdf and bsdf.inputs["Base Color"].is_linked:
            nd = bsdf.inputs["Base Color"].links[0].from_node
            while nd and nd.type != "TEX_IMAGE":
                nd = next((i.links[0].from_node for i in nd.inputs if i.is_linked), None)
            img = nd.image if nd else None
    if not img:
        print("BEARD: no skin image"); return
    W, Hh = img.size
    D = np.zeros((Hh, W), np.float32)
    me = h.data; uvl = me.uv_layers.active.data
    me.calc_loop_triangles()
    for tri in me.loop_triangles:
        vd = d[list(tri.vertices)]
        if vd.max() < 0.02:
            continue
        P = np.array([uvl[li].uv[:] for li in tri.loops]) * np.array([W, Hh])
        x0, y0 = np.floor(P.min(axis=0)).astype(int); x1, y1 = np.ceil(P.max(axis=0)).astype(int)
        x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(W - 1, x1), min(Hh - 1, y1)
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, ay), (bx, by), (cx_, cy_) = P
        den = (by - cy_) * (ax - cx_) + (cx_ - bx) * (ay - cy_)
        if abs(den) < 1e-9:
            continue
        w0 = ((by - cy_) * (gx - cx_) + (cx_ - bx) * (gy - cy_)) / den
        w1 = ((cy_ - ay) * (gx - cx_) + (ax - cx_) * (gy - cy_)) / den
        w2 = 1 - w0 - w1
        inside = (w0 >= -0.02) & (w1 >= -0.02) & (w2 >= -0.02)
        val = w0 * vd[0] + w1 * vd[1] + w2 * vd[2]
        blk = D[y0:y1 + 1, x0:x1 + 1]
        np.maximum(blk, np.where(inside, val, 0), out=blk)
    rng = np.random.default_rng(rng_seed)
    grain = rng.random((Hh, W)).astype(np.float32)
    grain = (grain + np.roll(grain, 1, 0) + np.roll(grain, 2, 0) + np.roll(grain, -1, 0)) / 4  # short strands growing down
    hair = rgb(l.get("beard") or l.get("moustache") or l.get("hair") or "#222")
    light = hair.mean() > 0.6
    g2 = np.clip((grain - 0.32) * 2.2, 0, 1)  # strands and skin between them, not a painted patch
    a = np.clip(D * ((0.15 + 0.5 * g2) if light else (0.18 + 0.52 * g2)) * 0.8, 0, 1)[..., None]  # a short, trimmed beard: strands with skin between them, never a solid mask
    px = np.array(img.pixels[:], np.float32).reshape(Hh, W, 4)
    shade = px[..., :3] * (1 - 0.04 * D[..., None])  # the shadow of hair on skin, even between the strands
    col = hair * (0.7 + 0.55 * grain[..., None]) if not light else hair * (0.85 + 0.2 * grain[..., None])
    px[..., :3] = np.clip(shade * (1 - a) + col * a, 0, 1)
    img.pixels.foreach_set(px.ravel()); img.pack()
    print("BEARD painted", int((D > 0.1).sum()), "px")


def make_beard(B, l, f):
    """A short beard (or moustache) cut from the skin of the jaw and lip, with a hairy, broken edge."""
    co = B.co; head = B.wt("head") > 0.9
    m, j = f["mouth"], f["jaw"]
    if m is None or j is None:
        return None
    front = co[:, 1] < f["cy"] - f["r"] * 0.15
    chin_z = j[2] - 0.06
    keep = head & front & (co[:, 2] < m[2] + 0.012) & (co[:, 2] > chin_z)
    lips = (np.abs(co[:, 2] - m[2]) < 0.008) & (np.abs(co[:, 0]) < 0.022)
    keep &= ~lips
    o = B.region("beard", keep)
    offset(o, 0.0025)
    me = o.data
    if not me.uv_layers:
        me.uv_layers.new()
    # beard texture: fine strands growing down, dense at the chin and jaw, thinning out towards the cheeks, the
    # lip line and the neck, so its edge breaks up like real hair instead of a patch
    W = 512; rng = np.random.default_rng(3)
    u = np.linspace(0, 1, W)[None, :].repeat(W, 0); v = np.linspace(0, 1, W)[:, None].repeat(W, 1)
    strands = np.clip(rng.random((W, W)) * 1.3 - 0.15, 0, 1)
    strands = (strands + np.roll(strands, 1, 0) + np.roll(strands, 2, 0) + np.roll(strands, 3, 0)) / 4  # streaks downward
    side = np.clip(1 - np.abs(u - 0.5) * 2, 0, 1) ** 0.6      # thinner at the far cheeks
    height = np.clip(1.25 - v * 1.25, 0, 1) ** 0.7              # densest low on the chin, fading up the cheek
    lipline = np.clip((0.97 - v) * 12, 0, 1)                     # a soft gap under the lip
    edge = np.clip(np.minimum.reduce([u, 1 - u, v * 1.0]) * 9, 0, 1)  # the hair thins out at every edge into the skin
    alpha = np.clip(strands * side * height * lipline * edge * 1.7, 0, 1)
    alpha = (alpha > 0.38).astype(float) * np.clip(alpha * 1.4, 0, 1)
    col = np.zeros((W, W, 4)); base = rgb(l.get("beard") or l.get("hair") or "#222")
    light = base.mean() > 0.6
    if light:  # a white or grey beard: finer and sparser, the skin showing through, darker at the roots
        alpha *= 0.62
    col[..., :3] = base[None, None, :] * ((0.6 if light else 0.75) + 0.5 * strands[..., None]); col[..., 3] = alpha
    im = bpy.data.images.new("beard", W, W, alpha=True); im.pixels.foreach_set(col.astype(np.float32).ravel()); im.pack()
    mat = bpy.data.materials.new("beard"); mat.use_nodes = True
    nt = mat.node_tree; b = nt.nodes["Principled BSDF"]; t = nt.nodes.new("ShaderNodeTexImage"); t.image = im
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"]); nt.links.new(t.outputs["Alpha"], b.inputs["Alpha"])
    b.inputs["Roughness"].default_value = 0.85
    try:
        mat.surface_render_method = "DITHERED"
    except Exception:
        pass
    xs = [v.co.x for v in me.vertices]; zs = [v.co.z for v in me.vertices]
    x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
    uv = me.uv_layers.active.data
    for li, loop in enumerate(me.loops):
        c = me.vertices[loop.vertex_index].co
        uv[li].uv = ((c.x - x0) / max(1e-6, x1 - x0), (c.z - z0) / max(1e-6, z1 - z0))
    return finish(o, mat)


HAIR_M = {"young": "short02", "middle": "short04", "old": "short03"}
HAIR_F = {"young": "braid01", "middle": "ponytail01", "old": "bob02"}


def name_materials(h):
    for o in h.children_recursive if hasattr(h, "children_recursive") else []:
        pass


def recolour(o, target_hex, keep_light=0.0):
    """Repaint an object's textures to a person's own colour: scale the texture so its average comes out at the
    target, keeping the pores, freckles and strands that make it real."""
    t = rgb(target_hex)
    seen = set()
    for slot in o.material_slots:
        m = slot.material
        if not m or not m.use_nodes:
            continue
        for n in m.node_tree.nodes:
            if n.type == "TEX_IMAGE" and n.image and n.image.name not in seen and n.image.size[0] > 0:
                seen.add(n.image.name)
                im = n.image; px = np.array(im.pixels[:]).reshape(-1, 4)
                a = px[:, 3] > 0.5
                if not a.any():
                    continue
                mean = px[a, :3].mean(axis=0)
                k = t / np.maximum(mean, 1e-3)
                px[:, :3] = np.clip(px[:, :3] * (k * (1 - keep_light) + keep_light), 0, 1)
                im.pixels.foreach_set(px.astype(np.float32).ravel()); im.pack()
            if n.type == "BSDF_PRINCIPLED" and not n.inputs["Base Color"].is_linked:
                n.inputs["Base Color"].default_value = (*t, 1)


def build(p):
    l = p["look"]
    h, rig = make_body(p)
    female = p["female"]
    for sub, name, t in [("eyes", "high-poly.mhclo", "Eyes"), ("eyebrows", "eyebrow001.mhclo" if not female else "eyebrow006.mhclo", "Eyebrows"),
                         ("eyelashes", "eyelashes01.mhclo", "Eyelashes"), ("teeth", "teeth_base.mhclo", "Teeth")]:
        add_asset(h, sub, name, t)
    B = Body(h)
    pieces = []
    tops = make_top(B, l.get("top", "shirt"), l, h, female)
    pieces += tops
    pieces += make_lower(B, l.get("lower", "pyjama"), l, h, female)
    if l.get("lower") == "sari" or l.get("sari"):
        pieces.append(sari_pallu(B, l, tops[0] if tops else None))
    hp, wants_hair = make_head(B, rig, l.get("head", "bare"), l, female)
    pieces += hp
    if wants_hair:
        g = "young" if p["age"] < 36 else "middle" if p["age"] < 58 else "old"
        hair = add_asset(h, "hair", (HAIR_F if female else HAIR_M)[g] + ".mhclo", "Hair")
        lift = {"tupi": 0.035, "sindhi": 0.012, "monkeycap": -0.02}.get(l.get("head"))
        if hair:  # no fringe hanging over the eyes: farmers keep it off the face
            fr = head_frame(B); b0 = (fr["eye"][2] + 0.03 if fr["eye"] is not None else fr["top"] - 0.09)
            bm = bmesh.new(); bm.from_mesh(hair.data)
            bad = [v for v in bm.verts if (hair.matrix_world @ v.co).z < b0 - 0.004 and (hair.matrix_world @ v.co).y < fr["cy"] - fr["r"] * 0.55]
            bmesh.ops.delete(bm, geom=bad, context="VERTS"); bm.to_mesh(hair.data); bm.free()
        if hair and l.get("head") in ("gamcha", "gaungbaung"):  # hair inside the band is squashed under it
            fr = head_frame(B); b0 = (fr["eye"][2] + 0.03 if fr["eye"] is not None else fr["top"] - 0.09)
            for v in hair.data.vertices:
                w = hair.matrix_world @ v.co
                if b0 - 0.01 < w.z < b0 + 0.07:
                    rr = math.hypot(w.x - fr["cx"], w.y - fr["cy"])
                    if rr > fr["r"] * 0.98:
                        k = fr["r"] * 0.98 / rr; w.x = fr["cx"] + (w.x - fr["cx"]) * k; w.y = fr["cy"] + (w.y - fr["cy"]) * k
                        v.co = hair.matrix_world.inverted() @ w
        if hair and lift is not None:  # hair shows only below a cap's edge
            fr = head_frame(B); edge = (fr["eye"][2] + 0.03 if fr["eye"] is not None else fr["top"] - 0.09) + lift + 0.008  # ends tucked under the rim
            bm = bmesh.new(); bm.from_mesh(hair.data)
            bmesh.ops.delete(bm, geom=[v for v in bm.verts if (hair.matrix_world @ v.co).z > edge], context="VERTS")
            bm.to_mesh(hair.data); bm.free()
    beard_frame = head_frame(B) if (l.get("beard") or l.get("moustache")) else None
    bpy.data.objects.remove(B.src, do_unlink=True)
    for pc in pieces:  # every garment rides the same skeleton
        if not any(m.type == "ARMATURE" for m in pc.modifiers):
            m = pc.modifiers.new("Armature", "ARMATURE"); m.object = rig
        else:
            for m in pc.modifiers:
                if m.type == "ARMATURE":
                    m.object = rig
        pc.parent = rig
    # name the MakeHuman materials for the game's tints
    for o in bpy.data.objects:
        if o.type != "MESH":
            continue
        n = o.name.lower()
        role = "skin" if o is h else "hair" if any(k in n for k in ("short0", "braid", "ponytail", "bob0", "long0", "afro")) else \
            "brow" if "eyebrow" in n else "lash" if "eyelash" in n else "eyes" if ("high-poly" in n or "low-poly" in n) else "teeth" if "teeth" in n else None
        if role:
            for s in o.material_slots:
                if s.material:
                    s.material.name = role
    hair_hex = l.get("hair") or "#1a1411"
    for o in bpy.data.objects:
        if o.type != "MESH" or not o.material_slots or not o.material_slots[0].material:
            continue
        role = o.material_slots[0].material.name.split(".")[0]
        if role == "skin":
            recolour(o, l.get("skin") or "#a8704a")
            if beard_frame:
                paint_beard(o, B, l, beard_frame)
        elif role in ("hair", "brow"):
            recolour(o, hair_hex if role == "hair" else (l.get("beard") or l.get("moustache") or hair_hex))
    # feet: bare soles for sandals and bare feet are the skin; shoes from the pack for shoes, sneakers and boots
    if l.get("feet") in ("shoe", "sneaker", "boot"):
        add_asset(h, "clothes", "shoes02.mhclo" if l.get("feet") != "sneaker" else "shoes06.mhclo", "Clothes")
    # Under garments, tuck the chest vertices on h slightly inward so dynamic bone motion never penetrates
    # The tuck fades in and out smoothly and stops well below the collar: a hard cut at 0.9 of the height fell under
    # the eyes, pushed the lower face back 3 cm and tore the skin across the cheeks and nose.
    neck = B.joint("joint-neck"); top_z = (neck[2] if neck is not None else 0.84 * B.H) - 0.07
    bm = bmesh.new(); bm.from_mesh(h.data)
    for v in bm.verts:
        if abs(v.co.x) < 0.28 and v.co.y < 0:
            w = max(0.0, min(1.0, (top_z - v.co.z) / 0.06)) * max(0.0, min(1.0, (v.co.z - 0.52 * B.H) / 0.05))
            v.co.y += 0.018 * w
    bm.normal_update(); bm.to_mesh(h.data); bm.free(); h.data.update()
    # MPFB and Blender can leave viewport primitives in the scene. Remove any object not part of the person.
    valid_keep = {h, rig} | set(pieces)
    for o in list(bpy.data.objects):
        if o.type == "MESH":
            has_rig = any(m.type == "ARMATURE" for m in o.modifiers)
            is_valid = o in valid_keep or has_rig or (o.parent == rig) or o.name.startswith("Human") or o.name.startswith("low_") or o.name.startswith("scarf_") or o.name.startswith("pallu")
            if not is_valid:
                bpy.data.objects.remove(o, do_unlink=True)
    # Keep the base human body 100% solid, continuous and intact: remove destructive MASK modifiers
    for m in list(h.modifiers):
        if m.type == "MASK" and m.name.startswith("Delete"):
            h.modifiers.remove(m)
    # Ensure skin and teeth materials are 100% opaque in GLTF (avoid alpha sorting / see-through defects)
    for mat in bpy.data.materials:
        if mat.name in ("skin", "teeth") or mat.name.startswith("skin"):
            mat.blend_method = "OPAQUE"
            if hasattr(mat, "shadow_method"):
                mat.shadow_method = "OPAQUE"
            if mat.use_nodes:
                for node in mat.node_tree.nodes:
                    if node.type == "BSDF_PRINCIPLED":
                        for link in list(node.inputs["Alpha"].links):
                            mat.node_tree.links.remove(link)
                        node.inputs["Alpha"].default_value = 1.0
    arms_down_rest(rig)
    print("EXPORT OBJECTS", [o.name for o in bpy.data.objects if o.type in ("MESH", "ARMATURE")])
    print("HUMAN MODIFIERS:", [(m.name, m.type) for m in h.modifiers])
    out = os.path.join(OUT, f"{p['id']}.glb")
    bpy.ops.object.select_all(action="DESELECT")
    for o in bpy.data.objects:
        if o.type in ("MESH", "ARMATURE"):
            o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=out, use_selection=True, export_format="GLB", export_apply=True, export_animations=False)
    print("WROTE", out)
    if PREVIEW:
        preview(p["id"])


def arms_down_rest(rig, drop_deg=None):
    """MakeHuman builds people in an A-pose, arms out at ~45 degrees; the game holds them down by the sides, and
    bending skinned cloth that far folds the shoulder into a box. Lower the arms here, bake every mesh into that
    pose, and make it the new rest pose, so the game only bends the shoulder a little."""
    from mathutils import Quaternion
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    for side, sx in (("l", 1), ("r", -1)):
        pb = rig.pose.bones.get(f"upperarm_{side}")
        if not pb:
            continue
        bone = pb.bone
        cur = (bone.tail_local - bone.head_local).normalized()
        want = Vector((sx * 0.2, cur.y * 0.3 + 0.04, -1.0)).normalized()  # down, a little out and forward
        q = cur.rotation_difference(want)
        M = bone.matrix_local.to_quaternion()
        pb.rotation_mode = "QUATERNION"
        pb.rotation_quaternion = M.inverted() @ q @ M
    bpy.context.view_layer.update()
    bpy.ops.object.mode_set(mode="OBJECT")
    for o in list(bpy.data.objects):
        if o.type != "MESH":
            continue
        arm = next((m for m in o.modifiers if m.type == "ARMATURE"), None)
        if not arm:
            continue
        arm.object = rig
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
        if o.data.shape_keys:
            bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
        others = [m for m in o.modifiers if m is not arm]
        for m in others:
            m.show_viewport = False
        name = arm.name
        bpy.ops.object.modifier_move_to_index(modifier=name, index=0)
        bpy.ops.object.modifier_apply(modifier=name)
        for m in others:
            m.show_viewport = True
        nm = o.modifiers.new("Armature", "ARMATURE"); nm.object = rig
        bpy.ops.object.modifier_move_to_index(modifier=nm.name, index=0)
    bpy.ops.object.select_all(action="DESELECT"); rig.select_set(True); bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.armature_apply(selected=False)
    bpy.ops.object.mode_set(mode="OBJECT")


def preview(pid):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"; scene.cycles.samples = 40
    scene.render.resolution_x, scene.render.resolution_y = 640, 1000
    if not scene.world:
        scene.world = bpy.data.worlds.new("w")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.78, 0.84, 0.9, 1); bg.inputs[1].default_value = 0.9
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); bpy.context.collection.objects.link(sun)
    sun.data.energy = 3.2; sun.rotation_euler = (math.radians(55), 0, math.radians(35))
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); bpy.context.collection.objects.link(cam); scene.camera = cam
    cam.location = (0.9, -3.0, 1.05); cam.rotation_euler = (math.radians(88), 0, math.radians(17)); cam.data.lens = 48
    scene.render.filepath = os.path.join(OUT, f"{pid}.png")
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    people = json.load(open(SPECS))
    for p in people:
        if ONLY and p["id"] not in ONLY:
            continue
        try:
            build(p)
        except Exception as e:
            import traceback; traceback.print_exc(); print("FAILED", p["id"], e)
