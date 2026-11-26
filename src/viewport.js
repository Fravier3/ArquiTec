import * as T from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { colors } from './model.js'

const presets = {
  iso: [1.14, 0.78, 1.26],
  top: [0, 1, 0.0001],
  front: [0, 0, 1],
  side: [1, 0, 0],
}
const radians = T.MathUtils.degToRad
const ink = 0x435bc5

function geometry(p) {
  if (!p.h && p.kind === 'rect')
    return new T.PlaneGeometry(p.w, p.d).rotateX(-Math.PI / 2).translate(0, 0.009, 0)
  if (p.kind === 'rect') return new T.BoxGeometry(p.w, p.h, p.d).translate(0, p.h / 2, 0)
  if (p.kind === 'circle' && p.h) {
    return new T.CylinderGeometry(0.5, 0.5, p.h, 56).scale(p.w, 1, p.d).translate(0, p.h / 2, 0)
  }
  if (p.kind === 'circle')
    return new T.CircleGeometry(0.5, 56)
      .scale(p.w, p.d, 1)
      .rotateX(-Math.PI / 2)
      .translate(0, 0.009, 0)
  const shape = new T.Shape()
  p.points.forEach(([x, z], i) => shape[i ? 'lineTo' : 'moveTo'](x * p.w, -z * p.d))
  shape.closePath()
  const mesh = p.h
    ? new T.ExtrudeGeometry(shape, { depth: p.h, bevelEnabled: false })
    : new T.ShapeGeometry(shape)
  return mesh.rotateX(-Math.PI / 2).translate(0, p.h ? 0 : 0.009, 0)
}

function materials() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#eee9e1'
  ctx.fillRect(0, 0, 128, 128)
  for (let i = 0; i < 180; i++) {
    const x = (i * 43.41) % 128
    ctx.fillStyle = i % 3 === 0 ? '#d8cbb9' : '#ece0d0'
    ctx.fillRect(x, 0, ((i % 3) + 1) * 0.35, 128)
  }
  const texture = new T.CanvasTexture(canvas)
  texture.colorSpace = T.SRGBColorSpace
  texture.anisotropy = 4
  return Object.fromEntries(
    Object.entries(colors).map(([name, color]) => [
      name,
      new T.MeshStandardMaterial({
        color,
        roughness: name === 'Vidrio' ? 0.28 : 0.77,
        metalness: name === 'Grafito' ? 0.14 : 0,
        transparent: name === 'Vidrio',
        opacity: name === 'Vidrio' ? 0.52 : 1,
        depthWrite: name !== 'Vidrio',
        side: T.DoubleSide,
        map: name === 'Roble' ? texture : null,
      }),
    ]),
  )
}

export function createViewport(host) {
  const scene = new T.Scene()
  scene.background = new T.Color(0xe9edf2)
  scene.fog = new T.FogExp2(0xe9edf2, 0.012)
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFShadowMap
  renderer.setClearColor(0xe9edf2)
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.25
  const canvas = renderer.domElement
  canvas.setAttribute('aria-label', 'Área de modelado 3D')
  host.prepend(canvas)
  const camera = new T.PerspectiveCamera(39, 1, 0.02, 1800)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = false
  controls.maxPolarAngle = Math.PI * 0.498
  controls.minDistance = 0.09
  controls.maxDistance = 790
  controls.zoomToCursor = true

  scene.add(new T.HemisphereLight(0xf6f9ff, 0xa99988, 2.45))
  const light = new T.DirectionalLight(0xfff0d9, 2.35)
  light.position.set(-5, 10, 5)
  light.castShadow = true
  light.shadow.mapSize.set(2048, 2048)
  light.shadow.camera.left = -12
  light.shadow.camera.right = 12
  light.shadow.camera.top = 12
  light.shadow.camera.bottom = -12
  light.shadow.normalBias = 0.025
  light.shadow.bias = -0.0002
  light.shadow.radius = 3
  scene.add(light, light.target)
  const floor = new T.Mesh(
    new T.PlaneGeometry(2400, 2400),
    new T.MeshStandardMaterial({ color: 0xdce3eb, roughness: 1 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.014
  floor.receiveShadow = true
  scene.add(floor)
  const grid = new T.Group()
  for (const [size, divisions, color, opacity] of [
    [160, 80, 0x8f9fb7, 0.35],
    [36, 72, 0x9cadc4, 0.5],
  ]) {
    const lines = new T.GridHelper(size, divisions, color, color)
    lines.position.y = 0.006
    lines.material.transparent = true
    lines.material.depthWrite = false
    lines.material.toneMapped = false
    lines.material.opacity = opacity
    grid.add(lines)
  }
  scene.add(grid)
  const axes = new T.Group()
  for (const [start, dest, color] of [
    [[-80, 0.012, 0], [80, 0.012, 0], 0xb56e69],
    [[0, 0.012, -80], [0, 0.012, 80], 0x61947f],
    [[0, 0, 0], [0, 12, 0], 0x6884ba],
  ]) {
    const line = new T.Line(
      new T.BufferGeometry().setFromPoints([new T.Vector3(...start), new T.Vector3(...dest)]),
      new T.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.56,
        toneMapped: false,
      }),
    )
    axes.add(line)
  }
  scene.add(axes)
  const models = new T.Group()
  scene.add(models)
  const material = materials()
  const edgeInk = new T.LineBasicMaterial({
    color: 0x28384a,
    transparent: true,
    opacity: 0.26,
  })
  const selectedInk = new T.LineBasicMaterial({
    color: ink,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  })
  const ghostInk = new T.LineBasicMaterial({
    color: ink,
    depthTest: false,
    transparent: true,
    opacity: 0.86,
  })
  const ghostSurface = new T.MeshBasicMaterial({
    color: ink,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
    side: T.DoubleSide,
  })
  const objects = new Map()
  const ray = new T.Raycaster()
  let ghost
  let selected
  let frame = 0

  function render() {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      renderer.render(scene, camera)
    })
  }
  controls.addEventListener('change', render)
  new ResizeObserver(() => {
    const w = host.clientWidth,
      h = host.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    render()
  }).observe(host)

  function meshOf(p, preview = false) {
    const mesh = new T.Mesh(geometry(p), preview ? ghostSurface : material[p.material])
    const edge = new T.LineSegments(new T.EdgesGeometry(mesh.geometry, 20), preview ? ghostInk : edgeInk)
    edge.renderOrder = preview ? 5 : 0
    mesh.add(edge)
    mesh.position.set(p.x, p.y, p.z)
    mesh.rotation.y = radians(p.rotation)
    mesh.castShadow = !preview && p.h > 0 && p.material !== 'Vidrio'
    mesh.receiveShadow = !preview
    mesh.visible = !p.hidden
    mesh.userData.id = p.id
    return mesh
  }

  function drop(mesh) {
    mesh.removeFromParent()
    mesh.geometry.dispose()
    mesh.children.forEach((edge) => edge.geometry.dispose())
  }

  function highlight() {
    for (const [id, { mesh }] of objects) {
      mesh.children[0].material = id === selected ? selectedInk : edgeInk
      mesh.children[0].renderOrder = id === selected ? 6 : 0
    }
    render()
  }

  function sync(items, selection) {
    selected = selection
    const next = new Set(items.map((p) => p.id))
    for (const [id, { mesh }] of objects)
      if (!next.has(id)) {
        drop(mesh)
        objects.delete(id)
      }
    for (const p of items) {
      const key = JSON.stringify(p)
      const old = objects.get(p.id)
      if (old?.key === key) continue
      if (old) drop(old.mesh)
      const mesh = meshOf(p)
      models.add(mesh)
      objects.set(p.id, { mesh, key })
    }
    highlight()
  }

  function preview(item, points = []) {
    if (ghost) {
      drop(ghost)
      ghost = null
    }
    if (item) ghost = meshOf(item, true)
    else if (points.length > 1) {
      ghost = new T.Line(
        new T.BufferGeometry().setFromPoints(points.map((p) => new T.Vector3(p.x, 0.018, p.z))),
        ghostInk,
      )
      ghost.renderOrder = 5
    }
    if (ghost) scene.add(ghost)
    render()
  }

  function cast(event) {
    const bounds = canvas.getBoundingClientRect()
    camera.updateMatrixWorld()
    ray.setFromCamera(
      new T.Vector2(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        (-(event.clientY - bounds.top) / bounds.height) * 2 + 1,
      ),
      camera,
    )
  }

  function ground(event, y = 0) {
    cast(event)
    const p = ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -y), new T.Vector3())
    return p && Math.abs(p.x) <= 1000 && Math.abs(p.z) <= 1000 ? p : null
  }

  function pick(event) {
    cast(event)
    return ray.intersectObjects(
      [...objects.values()].map((o) => o.mesh).filter((m) => m.visible),
      false,
    )[0]?.object.userData.id
  }

  function view(name = 'iso', fit = false) {
    const dir = new T.Vector3(...presets[name])
    if (fit || !camera.position.distanceTo(controls.target)) {
      const bounds = new T.Box3()
      models.updateMatrixWorld(true)
      for (const { mesh } of objects.values()) if (mesh.visible) bounds.expandByObject(mesh)
      if (bounds.isEmpty()) bounds.set(new T.Vector3(-3, 0, -3), new T.Vector3(3, 2, 3))
      bounds.getCenter(controls.target)
      const s = bounds.getBoundingSphere(new T.Sphere()).radius
      const angle = T.MathUtils.degToRad(camera.fov / 2)
      const limitingAngle = camera.aspect < 1 ? Math.atan(Math.tan(angle) * camera.aspect) : angle
      camera.position
        .copy(controls.target)
        .addScaledVector(dir.normalize(), Math.min(780, (s / Math.sin(limitingAngle)) * 1.09))
      light.target.position.copy(controls.target)
      light.position.copy(controls.target).add(new T.Vector3(-6, 12, 5))
    } else {
      camera.position
        .copy(controls.target)
        .addScaledVector(dir.normalize(), camera.position.distanceTo(controls.target))
    }
    controls.update()
    render()
  }

  function tool(name) {
    controls.mouseButtons.LEFT = ['smart', 'orbit'].includes(name)
      ? T.MOUSE.ROTATE
      : name === 'pan'
        ? T.MOUSE.PAN
        : null
    controls.mouseButtons.MIDDLE = T.MOUSE.ROTATE
    controls.mouseButtons.RIGHT = T.MOUSE.PAN
    controls.touches.ONE = ['smart', 'orbit'].includes(name)
      ? T.TOUCH.ROTATE
      : name === 'pan'
        ? T.TOUCH.PAN
        : null
    controls.touches.TWO = T.TOUCH.DOLLY_PAN
    canvas.style.cursor =
      ['smart', 'orbit'].includes(name) || name === 'pan'
        ? 'grab'
        : name === 'select'
          ? 'default'
          : 'crosshair'
  }

  function verticalScale() {
    const distance = camera.position.distanceTo(controls.target)
    return (2 * distance * Math.tan(radians(camera.fov / 2))) / host.clientHeight
  }

  function guides(next) {
    grid.visible = axes.visible = next
    render()
  }

  return {
    canvas,
    sync,
    preview,
    ground,
    pick,
    view,
    tool,
    guides,
    verticalScale,
  }
}
