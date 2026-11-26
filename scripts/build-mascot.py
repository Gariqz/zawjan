"""Build Zawjan posters (cwebp) or animated GLB with Blender 5.x.

Blender -b --factory-startup --python-exit-code 1 --python scripts/build-mascot.py -- --scratch /path/to/opencode [--glb]
"""

import argparse
import json
import math
from pathlib import Path
import struct
import subprocess
import sys
import tempfile

import bpy
from mathutils import Vector

SIZE = 512
BUDGET = 60_000
GLB_BUDGET = 250_000
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--scratch", type=Path, required=True)
parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "public/media")
parser.add_argument("--glb", action="store_true", help="Export GLB only; do not regenerate posters.")
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])
args.output.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
mascot = bpy.data.collections.new("Zawjan • Foldlight")
scene.collection.children.link(mascot)


def enamel(name, srgb, roughness=.35, metallic=0, emission=0):
    def linear(c):
        return c / 12.92 if c < .04045 else ((c + .055) / 1.055) ** 2.4

    color = tuple(linear(int(srgb[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1,)
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    p = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    p.inputs["Base Color"].default_value = color
    p.inputs["Roughness"].default_value = roughness
    p.inputs["Metallic"].default_value = metallic
    p.inputs["Coat Weight"].default_value = .22
    p.inputs["Emission Color"].default_value = color
    p.inputs["Emission Strength"].default_value = emission
    return mat


mint = enamel("Jade milk enamel", "9DD7BA")
light_mint = enamel("Fresh mint trim", "BCE5CB")
forest = enamel("Deep spruce seams", "254E40", .43)
edge = enamel("Sage hardware", "5D9980", .33, .35)
wing = enamel("Fold-out inner mint", "A5D1AE", .49)
brass = enamel("Champagne hardware", "D7A360", .33, .43)
button = enamel("Candlewick indicator", "FFB455", .38, emission=.35)
ink = enamel("Dark tea glass", "413026", .43)
glint = enamel("Soft catchlight", "FFF1CD", .4, emission=.32)
shade = enamel("Opal, honey at the rim", "FFCF82", .55, emission=.74)
# Soft, self-lit gradient on the inner glass. Keep the edges richer than the center.
nodes, links = shade.node_tree.nodes, shade.node_tree.links
p = next(node for node in nodes if node.type == "BSDF_PRINCIPLED")
coord = nodes.new("ShaderNodeTexCoord")
distance = nodes.new("ShaderNodeVectorMath")
distance.operation = "DISTANCE"
distance.inputs[1].default_value = (.48, 0, .57)
ramp = nodes.new("ShaderNodeValToRGB")
for element, pos, color in zip(ramp.color_ramp.elements, (.11, .69), ((1, .78, .41, 1), (.75, .23, .045, 1))):
    element.position, element.color = pos, color
ramp.color_ramp.interpolation = "EASE"
links.new(coord.outputs["Generated"], distance.inputs[0])
links.new(distance.outputs["Value"], ramp.inputs[0])
for socket in ("Base Color", "Emission Color"):
    links.new(ramp.outputs["Color"], p.inputs[socket])


def place(obj, name, parent, mat=None):
    obj.name = name
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    mascot.objects.link(obj)
    obj.parent = parent
    if mat:
        obj.data.materials.append(mat)
    return obj


def empty(name, location, parent=None):
    obj = place(bpy.data.objects.new(name, None), name, parent)
    obj.location = location
    return obj


def round_edges(obj, width, segments=5):
    bevel = obj.modifiers.new("Soft enamel edges", "BEVEL")
    bevel.width, bevel.segments = width, min(segments, 3) if args.glb else segments
    bevel.harden_normals = True
    obj.modifiers.new("Even panel highlights", "WEIGHTED_NORMAL")
    return obj


def box(name, xyz, size, radius, mat, parent):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return round_edges(place(obj, "SM_" + name, parent, mat), radius)


def plate(name, outline, y, depth, radius, mat, parent):
    """Extrude counterclockwise XZ outline toward the front of the lantern."""
    n = len(outline)
    verts = [(x, face, z) for face in (y - depth / 2, y + depth / 2) for x, z in outline]
    faces = [tuple(range(n)), tuple(reversed(range(n, n * 2)))]
    faces += [(i, i + n, (i + 1) % n + n, (i + 1) % n) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    for poly in mesh.polygons:
        poly.use_smooth = True
    obj = place(bpy.data.objects.new(name, mesh), "SM_" + name, parent, mat)
    return round_edges(obj, radius)


def bead(name, xyz, size, mat, parent):
    segments, rings = ((14, 7) if name == "Tea glass eye" else (8, 5)) if args.glb else (24, 12)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1, location=xyz)
    obj = place(bpy.context.object, "SM_" + name, parent, mat)
    obj.scale = size
    if args.glb:
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def trace(name, coords, radius, mat, parent):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 4 if args.glb else 12
    curve.bevel_depth = radius
    curve.bevel_resolution = 2 if args.glb else 4
    curve.use_fill_caps = args.glb
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(coords) - 1)
    for point, xyz in zip(spline.bezier_points, coords):
        point.co = xyz
        point.handle_left_type = point.handle_right_type = "AUTO"
    return place(bpy.data.objects.new(name, curve), name, parent, mat)


root = empty("Lantern pose", (0, 0, 0))
box("Enamel body", (0, .035, 1.09), (1.63, 1.15, 1.89), .26, mint, root)
box("Top compression gasket", (0, .025, 1.925), (1.64, 1.16, .145), .07, forest, root)
box("Soft shoulder cap", (0, .025, 2.04), (1.77, 1.24, .29), .143, mint, root)
box("Crown highlight", (0, .025, 2.16), (1.53, 1.02, .095), .046, light_mint, root)
box("Base compression gasket", (0, .015, .28), (1.69, 1.22, .135), .067, forest, root)
box("Soft bumper base", (0, .015, .177), (1.80, 1.28, .28), .137, mint, root)
box("Inset spruce foot", (0, .025, .047), (1.51, 1.01, .085), .041, forest, root)

# Obround lens: broad floor, straighter sides and soft chamfered shoulders.
lens = [(-.43, .41), (.43, .41), (.59, .46), (.687, .59), (.71, .75), (.71, 1.44),
        (.672, 1.64), (.56, 1.79), (.38, 1.865), (-.38, 1.865), (-.56, 1.79),
        (-.672, 1.64), (-.71, 1.44), (-.71, .75), (-.687, .59), (-.59, .46)]


def scaled(outline, sx, sz, cx=0, cz=0):
    return [(cx + (x - cx) * sx, cz + (z - cz) * sz) for x, z in outline]


plate("Forest lens gasket", lens, -.534, .19, .064, forest, root)
plate("Spun lip", scaled(lens, .903, .909, cz=1.135), -.615, .085, .038, brass, root)
diffuser = plate("Glowing opal diffuser", scaled(lens, .842, .855, cz=1.135), -.658, .073, .035, shade, root)

# Face sits in the glowing panel, not on a separate screen.
eyes = []
for sign in (-1, 1):
    eye = empty(f"{'Left' if sign < 0 else 'Right'} eye", (sign * .208, -.702, 1.24), root)
    eyes.append(eye)
    bead("Tea glass eye", (0, 0, 0), (.066, .025, .091), ink, eye)
    bead("Single soft eye highlight", (-.017, -.022, .028), (.014, .007, .018), glint, eye)
    bead("Amber cheek", (sign * .303, -.694, 1.106), (.042, .010, .016), button, root)
mouth = trace("Quiet smile", [(-.067, -.709, 1.127), (0, -.713, 1.095), (.067, -.709, 1.127)], .013, ink, root)

# Handle is an arched carry loop with concealed pivots on the crown.
handle = empty("Carry-loop pivot", (0, .01, 2.155), root)
trace("Flexible enamel carry loop", [(-.46, 0, .015), (-.43, 0, .22), (-.285, 0, .398),
                                    (0, 0, .452), (.285, 0, .398), (.43, 0, .22), (.46, 0, .015)], .060, forest, handle)
trace("Soft mint grip", [(-.238, -.001, .416), (-.126, -.001, .445), (0, -.001, .451),
                         (.126, -.001, .445), (.238, -.001, .416)], .075, edge, handle)
for sign in (-1, 1):
    box("Handle cleat", (sign * .46, .01, 2.167), (.239, .26, .12), .052, edge, root)
    bead("Cleat rivet", (sign * .46, -.105, 2.184), (.047, .026, .039), brass, root)

# Front foot: raised latch and a tiny warm status indicator.
box("Fold release inset", (0, -.627, .187), (.30, .086, .106), .042, edge, root)
box("Fold release", (0, -.674, .191), (.20, .057, .067), .027, forest, root)
bead("Ready lamp", (0, -.702, .191), (.026, .014, .021), button, root)

# Two real hinged shells, each with a slimmer inner reflector and softened rail.
wing_outline = [(.014, -.545), (.32, -.580), (.53, -.517), (.641, -.371), (.683, -.194),
                (.683, .293), (.615, .458), (.464, .566), (.28, .607), (.014, .544),
                (-.056, .413), (-.056, -.414)]
wings = []
for sign in (-1, 1):
    pivot = empty(f"{'Left' if sign < 0 else 'Right'} leaf pivot", (sign * .733, -.444, 1.095), root)
    wings.append(pivot)
    orient = (lambda pts: pts) if sign == 1 else (lambda pts: [(-x, z) for x, z in reversed(pts)])
    plate("Rounded fold-out shell", orient(wing_outline), 0, .156, .068, mint, pivot)
    plate("Leaf seam", orient(scaled(wing_outline, .82, .838, .31, .01)), -.073, .032, .015, edge, pivot)
    plate("Mint reflector", orient(scaled(wing_outline, .766, .777, .31, .01)), -.093, .036, .017, wing, pivot)
    for z in (-.31, .31):
        bead("Hinge knuckle", (0, -.01, z), (.081, .079, .136), forest, pivot)
        bead("Brass hinge cap", (0, -.009, z + .111), (.057, .057, .029), brass, pivot)
    trace("Pressed reflector rib", [(sign * .48, -.114, -.27), (sign * .508, -.114, -.14),
                                   (sign * .508, -.114, .14), (sign * .48, -.114, .27)], .011, light_mint, pivot)


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def area(name, location, target, watts, size, color):
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.shape, data.size, data.color = watts, "DISK", size, color
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    aim(obj, target)


area("Large softbox", (-3.8, -4.5, 6), (0, 0, 1.2), 430, 4.6, (1, .91, .79))
area("Cool daylight fill", (4, -2.1, 3.5), (0, 0, 1.2), 245, 4, (.73, .94, 1))
area("Mint edge", (1.4, 3.2, 4.7), (0, 0, 1.4), 560, 3.6, (.70, 1, .89))
area("Warm glass bounce", (0, -2, .4), (0, 0, 1.2), 22, 2, (1, .68, .34))
scene.world = bpy.data.worlds.new("Low studio ambience")
scene.world.use_nodes = True
bg = next(node for node in scene.world.node_tree.nodes if node.type == "BACKGROUND")
bg.inputs[0].default_value = (.39, .46, .43, 1)
bg.inputs[1].default_value = .33
cam = bpy.data.objects.new("Poster camera", bpy.data.cameras.new("Poster camera"))
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.type = "ORTHO"
cam.data.ortho_scale = 3.26

# Each pose shares the same camera scale and body center for stable swaps.
poses = {
    "welcome": dict(camera=(1.68, -8, 3.40), root=(-3, 5, -2), leaves=(20, 28), cant=(-7, 4), handle=-19, gaze=(-.005, .0), smile=1.0),
    "guide": dict(camera=(2.34, -8, 3.41), root=(1, -6, -3), leaves=(77, 10), cant=(-2, 17), handle=22, gaze=(.024, .020), smile=.80),
    "ready": dict(camera=(1.9, -8, 3.36), root=(-2, 0, 1), leaves=(83, 83), cant=(0, 0), handle=1, gaze=(0, .02), smile=1.16),
}
scene.render.engine = "CYCLES"
scene.cycles.samples = 96
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.render.resolution_x = scene.render.resolution_y = SIZE
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "AgX"


def webp_check(file):
    header = file.read_bytes()[:30]
    # Extended WebP header: alpha flag and two 24-bit dimensions, minus one.
    assert header[:4] == b"RIFF" and header[8:16] == b"WEBPVP8X" and header[20] & 0x10, file
    assert all(int.from_bytes(header[i : i + 3], "little") + 1 == SIZE for i in (24, 27)), file
    assert file.stat().st_size <= BUDGET, file


def set_pose(pose, flex=0):
    root.rotation_euler = tuple(map(math.radians, pose["root"]))
    root.rotation_euler.y += math.radians(2 * flex)
    for side, pivot, sweep, cant in zip((-1, 1), wings, pose["leaves"], pose["cant"]):
        pivot.rotation_euler = (0, math.radians(-cant), math.radians(side * (sweep - (8 if sweep < 65 else 1) * flex)))
    handle.rotation_euler.x = math.radians(pose["handle"] + 6 * flex)
    for side, eye in zip((-1, 1), eyes):
        eye.location.x = side * .208 + pose["gaze"][0] + .012 * flex
        eye.location.z = 1.24 + pose["gaze"][1]
    mouth.scale.x = pose["smile"] + .035 * flex


def glb_glass():
    # Bake only the unsupported procedural diffuser shader, not studio light or shadows.
    size = 64
    image = bpy.data.images.new("Honey opal ramp", size, size, alpha=False, float_buffer=True)
    colors = [element.color[:] for element in ramp.color_ramp.elements]
    pixels = []
    for row in range(size):
        for col in range(size):
            t = (math.hypot(col / (size - 1) - .48, row / (size - 1) - .57) - .11) / .58
            t = min(1, max(0, t))
            t = t * t * (3 - 2 * t)
            pixels.extend(a + (b - a) * t for a, b in zip(*colors))
    image.pixels.foreach_set(pixels)
    image.pack()
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = image
    for socket in ("Base Color", "Emission Color"):
        links.new(tex.outputs["Color"], p.inputs[socket])
    uv = diffuser.data.uv_layers.new(name="Diffuser front projection")
    bounds = [(min(v.co[i] for v in diffuser.data.vertices), max(v.co[i] for v in diffuser.data.vertices)) for i in (0, 2)]
    for loop in diffuser.data.loops:
        xyz = diffuser.data.vertices[loop.vertex_index].co
        uv.uv[loop.index].vector = [(xyz[i] - lo) / (hi - lo) for i, (lo, hi) in zip((0, 2), bounds)]


def glb_export(file):
    glb_glass()
    for obj in mascot.objects:
        if obj.type == "MESH" and obj != diffuser:
            for uv in list(obj.data.uv_layers):
                obj.data.uv_layers.remove(uv)

    channels = [(obj, "rotation_euler") for obj in (root, handle, *wings)]
    channels += [(eye, "location") for eye in eyes] + [(mouth, "scale")]
    for name, pose in poses.items():
        for frame, flex in ((0, 0), (12, 1), (24, 0)):
            set_pose(pose, flex)
            for obj, path in channels:
                obj.keyframe_insert(data_path=path, frame=frame)
        for obj, _ in channels:
            data = obj.animation_data
            action = data.action
            data.action = None
            track = data.nla_tracks.new()
            track.name = name
            track.strips.new(name, 0, action)
            track.mute = True
    set_pose(poses["ready"])
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action="DESELECT")
    for obj in mascot.objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(file), export_format="GLB", use_selection=True, export_apply=True,
        export_current_frame=True, export_merge_animation="NLA_TRACK", export_frame_step=3,
    )
    payload = file.read_bytes()
    magic, version, total, json_size, chunk = struct.unpack_from("<4sIII4s", payload)
    assert (magic, version, total, chunk) == (b"glTF", 2, len(payload), b"JSON"), file
    bin_size, chunk = struct.unpack_from("<I4s", payload, 20 + json_size)
    assert chunk == b"BIN\0" and 28 + json_size + bin_size == total <= GLB_BUDGET, (file, total)
    model = json.loads(payload[20:20 + json_size])
    assert model["meshes"] and {clip["name"] for clip in model["animations"]} == poses.keys(), file
    assert all(len(clip["channels"]) == len(channels) for clip in model["animations"]), file
    assert all(material.get("alphaMode", "OPAQUE") == "OPAQUE" for material in model["materials"]), file
    return payload


with tempfile.TemporaryDirectory(prefix="zawjan-mascot-", dir=args.scratch) as scratch:
    if args.glb:
        file = Path(scratch) / "zawjan-mascot.glb"
        (args.output / file.name).write_bytes(glb_export(file))
    else:
        for name, pose in poses.items():
            set_pose(pose)
            cam.location = pose["camera"]
            aim(cam, (0, -.04, 1.31))
            png = Path(scratch) / f"{name}.png"
            webp = png.with_suffix(".webp")
            scene.render.filepath = str(png)
            bpy.ops.render.render(write_still=True)
            subprocess.run(["cwebp", "-q", "95", "-m", "6", "-sharp_yuv", str(png), "-o", str(webp)], check=True)
            webp_check(webp)
            (args.output / f"zawjan-mascot-{name}.webp").write_bytes(webp.read_bytes())
