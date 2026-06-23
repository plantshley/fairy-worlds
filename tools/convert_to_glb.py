"""
Convert a game-rip model (OBJ/FBX/DAE/glTF) to a single GLB with textures packed.

Run headless via Blender:
  blender --background --factory-startup --python convert_to_glb.py -- \
      <src> <out.glb> [--normals] [--no-alpha] [--keep-rig] [--exclude a,b,c]

Behavior (fixed-texture props, albedo + optional normals + alpha cutout):
  1. Import by extension. OBJ uses its .mtl; DAE may carry its own bindings.
  2. Strip non-mesh objects (armatures/lights/cameras/empties) unless --keep-rig.
     NOTE: Blender's glTF exporter emits a stray 2-unit "Icosphere" placeholder
     for an armature — removing the rig (these are static props) deletes it.
  3. Optionally drop meshes whose name contains any --exclude token (e.g. extra
     morph meshes like MouthFrown,MouthSmile that overlap the base mesh).
  4. For any material with NO base-color texture, match one by material-name
     convention, preferring albedo maps.
  5. Wire alpha cutout when the base-color image has a real alpha channel OR a
     sibling _a/_OP/_alpha mask exists (unless --no-alpha). Works even when the
     albedo was already bound on import (the OBJ+MTL case).
  6. Optionally wire a matching normal map (--normals).
  7. Export a packed .glb and print a per-material report + model dimensions.

Best-effort: rips differ wildly, so it reports what it could NOT bind.
"""
import bpy
import bmesh
import sys
import os
import re

ALBEDO_SUFFIXES = ["alb", "albedo", "basecolor", "base_color", "diff", "diffuse", "d", "col", "color"]
NORMAL_SUFFIXES = ["nrm", "normal", "norm", "n"]
ALPHA_SUFFIXES = ["op", "a", "alpha", "opacity", "mask"]
NON_COLOR_SUFFIXES = set(NORMAL_SUFFIXES + ALPHA_SUFFIXES + [
    "s", "spc", "spec", "specular", "mtl", "metal", "metallic",
    "rgh", "rough", "roughness", "ocl", "ao", "occlusion", "crv",
    "curv", "curvature", "edgcod", "mix_b", "snow", "emit", "emission",
])
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".tga", ".bmp", ".tif", ".tiff", ".dds"}


def log(msg):
    print(f"[convert] {msg}")


def parse_args():
    argv = sys.argv
    if "--" not in argv:
        raise SystemExit("Expected: -- <src> <out.glb> [flags]")
    a = argv[argv.index("--") + 1:]
    if len(a) < 2:
        raise SystemExit("Expected: -- <src> <out.glb> [flags]")
    exclude = []
    if "--exclude" in a:
        i = a.index("--exclude")
        if i + 1 < len(a):
            exclude = [t.strip() for t in a[i + 1].split(",") if t.strip()]
    pose_wings = None
    if "--pose-wings" in a:
        i = a.index("--pose-wings")
        if i + 1 < len(a):
            pose_wings = float(a[i + 1])
    return {
        "src": a[0],
        "out": a[1],
        "normals": "--normals" in a,
        "alpha": "--no-alpha" not in a,
        "alpha_blend": "--alpha-blend" in a,
        "keep_rig": "--keep-rig" in a,
        "recalc_normals": "--no-recalc-normals" not in a,
        "fill_holes": "--fill-holes" in a,
        "pose_wings": pose_wings,
        "exclude": exclude,
    }


def import_model(src):
    ext = os.path.splitext(src)[1].lower()
    if ext == ".obj":
        bpy.ops.wm.obj_import(filepath=src)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=src)
    elif ext == ".dae":
        bpy.ops.wm.collada_import(filepath=src)
    elif ext in (".gltf", ".glb"):
        bpy.ops.import_scene.gltf(filepath=src)
    else:
        raise SystemExit(f"Unsupported source extension: {ext}")


def list_images(root):
    out = []
    for dirpath, _dirs, files in os.walk(root):
        for f in files:
            if os.path.splitext(f)[1].lower() in IMAGE_EXTS:
                out.append((os.path.join(dirpath, f), os.path.splitext(f)[0]))
    return out


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def split_suffix(stem):
    s = re.sub(r"[._]\d+$", "", stem)  # strip trailing numeric variant (_03 / .0)
    m = re.search(r"[._]([A-Za-z]+)$", s)
    if m:
        return s[: m.start()], m.group(1).lower()
    return s, ""


def pick_texture(mat_name, images, kind):
    want = {"albedo": ALBEDO_SUFFIXES, "normal": NORMAL_SUFFIXES, "alpha": ALPHA_SUFFIXES}[kind]
    mn = norm(mat_name)
    scored = []
    for path, stem in images:
        core, suffix = split_suffix(stem)
        cn = norm(core)
        name_match = bool(mn) and (cn == mn or cn.endswith(mn) or mn.endswith(cn) or mn in cn or cn in mn)
        if kind == "albedo":
            suffix_ok = (suffix in want or suffix == "") and suffix not in NON_COLOR_SUFFIXES
        else:
            suffix_ok = suffix in want
        if not suffix_ok:
            continue
        score = (10 if name_match else 0) + (5 if suffix in want else 0) - len(stem) * 0.001
        scored.append((score, path))
    if not scored:
        return None
    scored.sort(reverse=True)
    return scored[0][1] if scored[0][0] >= 5 else None


def image_alpha_varies(img, threshold=0.996):
    """True if the image has an alpha channel that isn't effectively all-opaque.
    Samples up to ~4000 alpha values to stay fast on large textures."""
    if img is None or img.channels < 4:
        return False
    px = img.pixels
    n = len(px)
    if n == 0:
        return False
    step = max(4, ((n // 4) // 4000) * 4)  # multiple of 4 so we land on the A channel
    for i in range(3, n, step):
        if px[i] < threshold:
            return True
    return False


def get_bsdf(mat):
    if not mat.use_nodes:
        mat.use_nodes = True
    for n in mat.node_tree.nodes:
        if n.type == "BSDF_PRINCIPLED":
            return n
    nt = mat.node_tree
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    out = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None) or nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return bsdf


def base_color_image_node(bsdf):
    inp = bsdf.inputs.get("Base Color")
    if inp and inp.is_linked:
        n = inp.links[0].from_node
        if n.type == "TEX_IMAGE":
            return n
    return None


def add_image_node(nt, path, non_color):
    img = bpy.data.images.load(path, check_existing=True)
    try:
        img.colorspace_settings.name = "Non-Color" if non_color else "sRGB"
    except Exception:
        pass
    node = nt.nodes.new("ShaderNodeTexImage")
    node.image = img
    return node


def set_alpha_mode(mat, blend):
    # blend=False → CLIP/MASK (hard cutout, no depth sorting; good for dense
    # foliage). blend=True → BLEND (feathered edges, glTF alphaMode BLEND).
    # Attr names differ across Blender versions; set whatever exists.
    settings = (("blend_method", "BLEND"), ("surface_render_method", "BLENDED")) if blend else (
        ("blend_method", "CLIP"), ("alpha_threshold", 0.5), ("surface_render_method", "DITHERED"))
    for attr, val in settings:
        try:
            setattr(mat, attr, val)
        except Exception:
            pass


def recalc_normals_outside(obj):
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    me.update()


def fill_holes(obj):
    """Cap open boundaries (e.g. an open back-of-head in a rip). Only safe on
    closed-ish character meshes — flat-card props have boundary edges by design,
    so this is opt-in via --fill-holes. New faces inherit nearby UVs/material."""
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    boundary = [e for e in bm.edges if e.is_boundary]
    filled = 0
    if boundary:
        res = bmesh.ops.holes_fill(bm, edges=boundary, sides=0)
        filled = len(res.get("faces", []))
    bm.to_mesh(me)
    bm.free()
    me.update()
    return filled


def pose_wings_down(angle_deg):
    """Rotate AC-rig upper-arm bones (Arm_1_L → +deg, Arm_1_R → −deg) down about
    the world front-back (Y) axis and bake the pose into the meshes, so the
    static export isn't stuck in T-pose. Must run BEFORE the rig is stripped.
    No-op (returns False) if the rig lacks those bones."""
    import math
    import mathutils

    arm = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
    if arm is None:
        return False
    targets = {n: (angle_deg if n.endswith("_L") else -angle_deg)
               for n in ("Arm_1_L", "Arm_1_R") if arm.pose.bones.get(n)}
    if not targets:
        return False
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="POSE")
    for name, deg in targets.items():
        pb = arm.pose.bones[name]
        head = pb.matrix.translation.copy()
        R = mathutils.Matrix.Rotation(math.radians(deg), 4, "Y")
        T = mathutils.Matrix.Translation(head)
        pb.matrix = T @ R @ T.inverted() @ pb.matrix
    bpy.ops.object.mode_set(mode="OBJECT")
    # Bake the pose into geometry by applying each Armature modifier.
    for o in [o for o in bpy.data.objects if o.type == "MESH"]:
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers):
            if m.type == "ARMATURE":
                try:
                    bpy.ops.object.modifier_apply(modifier=m.name)
                except Exception:
                    pass
    return True


def patch_glb_alpha(path, mask_mats, blend):
    """Force alphaMode in the exported GLB. Blender's glTF exporter derives
    alphaMode from version-specific material flags (and the FBX importer can
    leave stray BLEND on opaque mats), so we set it deterministically here:
    materials we cut → MASK (or BLEND if --alpha-blend); everything else OPAQUE.
    MASK renders in the opaque pass with depth write, which survives Spark's
    global blend-state changes; stray BLEND does not."""
    import json
    import struct

    JSON_CHUNK = 0x4E4F534A
    with open(path, "rb") as f:
        data = f.read()
    magic, ver, length = struct.unpack("<III", data[:12])
    off, chunks = 12, []
    while off < length:
        clen, ctype = struct.unpack("<II", data[off:off + 8])
        chunks.append([ctype, bytearray(data[off + 8:off + 8 + clen])])
        off += 8 + clen
    jchunk = next(c for c in chunks if c[0] == JSON_CHUNK)
    j = json.loads(bytes(jchunk[1]).decode("utf-8"))
    mode = "BLEND" if blend else "MASK"
    for m in j.get("materials", []):
        if m.get("name") in mask_mats:
            m["alphaMode"] = mode
            if not blend:
                m["alphaCutoff"] = 0.5
        else:
            m.pop("alphaMode", None)
            m.pop("alphaCutoff", None)
    newjson = json.dumps(j, separators=(",", ":")).encode("utf-8")
    newjson += b" " * ((4 - len(newjson) % 4) % 4)
    jchunk[1] = bytearray(newjson)
    body = bytearray()
    for ctype, cdata in chunks:
        body += struct.pack("<II", len(cdata), ctype) + cdata
    with open(path, "wb") as f:
        f.write(struct.pack("<III", magic, ver, 12 + len(body)) + body)


def main():
    args = parse_args()
    src = os.path.abspath(args["src"])
    out = os.path.abspath(args["out"])
    src_dir = os.path.dirname(src)
    os.makedirs(os.path.dirname(out), exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    log(f"importing {src}")
    import_model(src)

    # Pose wings/arms down (and bake) BEFORE stripping the rig.
    posed = False
    if args["pose_wings"] is not None:
        posed = pose_wings_down(args["pose_wings"])

    # Strip the rig (and any other non-mesh) — removes the glTF exporter's stray
    # icosphere placeholder, and these are static props anyway. Unparent meshes
    # while KEEPING their world transform first: meshes are often children of a
    # scaled armature, so a naive remove() drops that scale and resizes the model.
    removed_nonmesh = []
    if not args["keep_rig"]:
        for o in bpy.data.objects:
            if o.type == "MESH" and o.parent is not None:
                mw = o.matrix_world.copy()
                o.parent = None
                o.matrix_world = mw
        for o in list(bpy.data.objects):
            if o.type != "MESH":
                removed_nonmesh.append(f"{o.type}:{o.name}")
                bpy.data.objects.remove(o, do_unlink=True)

    # Drop excluded meshes (e.g. overlapping morph variants).
    removed_meshes = []
    if args["exclude"]:
        low = [p.lower() for p in args["exclude"]]
        for o in list(bpy.data.objects):
            if o.type == "MESH" and any(p in o.name.lower() for p in low):
                removed_meshes.append(o.name)
                bpy.data.objects.remove(o, do_unlink=True)

    # Cap open holes (opt-in) BEFORE recalc so the new faces get oriented too.
    filled_total = 0
    if args["fill_holes"]:
        for o in bpy.data.objects:
            if o.type == "MESH":
                filled_total += fill_holes(o)

    # Fix inward/flipped normals (common in rips) — faces with inward normals
    # shade black under any lighting in both Blender and three.js.
    if args["recalc_normals"]:
        for o in bpy.data.objects:
            if o.type == "MESH":
                recalc_normals_outside(o)

    images = list_images(src_dir)
    log(f"found {len(images)} image files under {src_dir}")

    mats, seen = [], set()
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        for slot in obj.material_slots:
            m = slot.material
            if m and m.name not in seen:
                seen.add(m.name)
                mats.append(m)

    report = []
    mask_mats = set()  # materials we cut → forced to MASK/BLEND in patch_glb_alpha
    for mat in mats:
        bsdf = get_bsdf(mat)
        nt = mat.node_tree
        status = {"mat": mat.name, "albedo": None, "normal": None, "alpha": None}

        # Game-rip importers default Metallic=1.0. Fully-metallic PBR renders
        # near-black without an environment/IBL map (this app lights with lamps
        # only, no env), which makes every prop look dark. These are matte props
        # and we never wire a metallic map, so force non-metal.
        try:
            bsdf.inputs["Metallic"].default_value = 0.0
        except Exception:
            pass

        base_node = base_color_image_node(bsdf)
        if base_node:
            status["albedo"] = "(pre-bound)"
        else:
            tex = pick_texture(mat.name, images, "albedo")
            if tex:
                base_node = add_image_node(nt, tex, non_color=False)
                nt.links.new(base_node.outputs["Color"], bsdf.inputs["Base Color"])
                status["albedo"] = os.path.basename(tex)

        # ---- alpha cutout: ONLY from the albedo's own alpha channel ----
        # Separate _a/_OP masks are too ambiguous in rips — e.g. AC "_OP" maps
        # carry holes that, applied as base-material alpha, cut through solid
        # cloth (Gulliver's shirt vanished). The albedo's OWN alpha channel is
        # the reliable cutout signal (flower leaves have it; solid cloth doesn't).
        # Default mode is MASK/CLIP (alphaTest): it renders in the opaque pass and
        # writes depth, so it survives Spark's global blend-state changes. BLEND
        # (--alpha-blend) gives soft edges but breaks once the splat loads.
        if args["alpha"] and base_node and not bsdf.inputs["Alpha"].is_linked:
            if image_alpha_varies(base_node.image):
                nt.links.new(base_node.outputs["Alpha"], bsdf.inputs["Alpha"])
                set_alpha_mode(mat, args["alpha_blend"])
                status["alpha"] = "(own channel)"
                mask_mats.add(mat.name)

        if args["normals"]:
            npath = pick_texture(mat.name, images, "normal")
            if npath:
                nnode = add_image_node(nt, npath, non_color=True)
                nmap = nt.nodes.new("ShaderNodeNormalMap")
                nt.links.new(nnode.outputs["Color"], nmap.inputs["Color"])
                nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
                status["normal"] = os.path.basename(npath)

        report.append(status)

    bpy.context.view_layer.update()
    dims = [0.0, 0.0, 0.0]
    for obj in bpy.data.objects:
        if obj.type == "MESH":
            for i in range(3):
                dims[i] = max(dims[i], obj.dimensions[i])

    log("exporting GLB")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_apply=True, export_yup=True)
    patch_glb_alpha(out, mask_mats, args["alpha_blend"])

    print("\n==== CONVERT REPORT ====")
    print(f"src: {src}")
    print(f"out: {out}")
    print(f"approx dimensions (x,y,z): {dims[0]:.2f}, {dims[1]:.2f}, {dims[2]:.2f}")
    if removed_nonmesh:
        print(f"removed non-mesh: {', '.join(removed_nonmesh)}")
    if removed_meshes:
        print(f"removed meshes: {', '.join(removed_meshes)}")
    if args["fill_holes"]:
        print(f"hole-fill faces added: {filled_total}")
    if args["pose_wings"] is not None:
        print(f"pose wings down {args['pose_wings']}deg: {'applied' if posed else 'no matching bones'}")
    print(f"materials: {len(report)}")
    unbound = []
    for r in report:
        flag = "" if r["albedo"] else "  <-- NO ALBEDO"
        if not r["albedo"]:
            unbound.append(r["mat"])
        print(f"  - {r['mat']}: albedo={r['albedo']} normal={r['normal']} alpha={r['alpha']}{flag}")
    print("UNBOUND: " + (", ".join(unbound) if unbound else "none"))
    print("==== END REPORT ====\n")


main()
