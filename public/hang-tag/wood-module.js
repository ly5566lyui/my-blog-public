/* 藤蔓木牌 · 可挂载模块（由 wood-app.js 改造）
 * 依赖：globalThis.THREE / globalThis.RoundedBoxGeometry（由 three.bundle.js 提供）
 * 用法：const api = mountWoodBadge(canvasEl, { title, onPick, ... })
 */
function mountWoodBadge(canvas, opts) {
  const THREE = globalThis.THREE
  const RoundedBoxGeometry = globalThis.RoundedBoxGeometry
  if (!THREE || !RoundedBoxGeometry) return null
  const o = opts || {}
  const TITLE = o.title || '森屿'
  const SUBTITLE = o.subtitle || 'LIN YU / FIELD KEEPER'
  const EYEBROW = o.eyebrow || 'MOSS & GRAIN'
  const onPick = typeof o.onPick === 'function' ? o.onPick : null
  const widget = o.widget !== false
  const prefersReducedMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)').matches : false
  const clamp = THREE.MathUtils.clamp

  const CFG = {
    ropeSegments: 42,
    ropeLength: 3.05,
    ropeRestStretch: 0.012,
    ropeSafetyStretch: 2.6,
    ropeVisualStretch: 0.72,
    ropeElasticity: 42,
    ropeElasticDamping: 2.65,
    anchor: new THREE.Vector3(0, 4.35, 0),
    gravity: -12.8,
    damping: 0.982,
    iterations: 13,
    fixedStep: 1 / 120,
    plaqueW: 2.72,
    plaqueH: 3.82,
    plaqueD: 0.28,
    eyeY: 1.58,
    maxPixelRatio: 2,
  }

  /* Scene ------------------------------------------------------------ */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, CFG.maxPixelRatio))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  if (widget) renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  if (!widget) {
    scene.background = new THREE.Color(0x101710)
    scene.fog = new THREE.FogExp2(0x101710, 0.031)
  }

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80)
  const cameraBase = new THREE.Vector3(0, widget ? 0.75 : 0.38, 14)
  const lookTarget = new THREE.Vector3(0, widget ? 0.75 : 0.2, 0)
  camera.position.copy(cameraBase)
  camera.lookAt(lookTarget)

  function buildEnvironment() {
    const env = new THREE.Scene()
    env.background = new THREE.Color(0x7d8068)
    env.add(new THREE.Mesh(
      new THREE.SphereGeometry(28, 18, 18),
      new THREE.MeshBasicMaterial({ color: 0x8f9277, side: THREE.BackSide })
    ))
    const panel = (w, h, color, position, rotation) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }))
      mesh.position.set(...position); mesh.rotation.set(...rotation); env.add(mesh)
    }
    panel(12, 16, 0xfff2cf, [-9, 5, 5], [0, Math.PI / 2.6, 0])
    panel(10, 12, 0xa7ba78, [9, 4, 0], [0, -Math.PI / 2.5, 0])
    panel(14, 8, 0x6a3f22, [0, -9, 2], [Math.PI / 2, 0, 0])
    const pmrem = new THREE.PMREMGenerator(renderer)
    const target = pmrem.fromScene(env, .04)
    pmrem.dispose()
    env.traverse((item) => { item.geometry && item.geometry.dispose(); item.material && item.material.dispose() })
    return target.texture
  }
  scene.environment = buildEnvironment()

  let backdrop = null, shadowSurface = null
  if (!widget) {
    backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 24),
      new THREE.ShaderMaterial({
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uAspect: { value: 1 } },
        vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: [
          'varying vec2 vUv; uniform float uTime; uniform float uAspect;',
          'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
          'void main(){',
          'vec2 p=vUv-.5; p.x*=uAspect;',
          'float warm=exp(-dot(p-vec2(-.28,.12),p-vec2(-.28,.12))*5.0);',
          'float moss=exp(-dot(p-vec2(.45,-.3),p-vec2(.45,-.3))*11.0);',
          'float grain=(hash(gl_FragCoord.xy+floor(uTime*1.5))-.5)*.012;',
          'vec3 base=vec3(.041,.068,.043);',
          'vec3 color=base+vec3(.15,.105,.055)*warm*.28+vec3(.09,.15,.055)*moss*.18+grain;',
          'gl_FragColor=vec4(color,1.0);}'
        ].join('\n'),
      })
    )
    backdrop.position.z = -8
    scene.add(backdrop)

    shadowSurface = new THREE.Mesh(new THREE.PlaneGeometry(15, 13), new THREE.ShadowMaterial({ color: 0x000000, opacity: .17 }))
    shadowSurface.position.z = -2.08; shadowSurface.receiveShadow = true; scene.add(shadowSurface)
  }

  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(7.8, 7.8),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uStrength: { value: widget ? .1 : .13 } },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'varying vec2 vUv;uniform float uStrength;void main(){vec2 p=(vUv-.5)*2.;float a=pow(smoothstep(1.,0.,length(p)),2.8)*uStrength;gl_FragColor=vec4(.36,.52,.20,a);}',
    })
  )
  halo.position.set(.5, widget ? .6 : -.3, -2.2)
  scene.add(halo)

  const dustCount = 100
  const dustGeometry = new THREE.BufferGeometry()
  const dustPositions = new Float32Array(dustCount * 3)
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - .5) * 18
    dustPositions[i * 3 + 1] = (Math.random() - .5) * 13
    dustPositions[i * 3 + 2] = -4 + Math.random() * 6
  }
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xd8cfad, size: .019, transparent: true, opacity: .27, depthWrite: false }))
  scene.add(dust)

  scene.add(new THREE.HemisphereLight(0xfff2d0, 0x11180e, 1.15))
  const keyLight = new THREE.DirectionalLight(0xffeed0, 3.6)
  keyLight.position.set(-4.5, 7, 6.5)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(1536, 1536)
  keyLight.shadow.camera.left = -5; keyLight.shadow.camera.right = 5
  keyLight.shadow.camera.top = 6; keyLight.shadow.camera.bottom = -6
  keyLight.shadow.camera.near = 1; keyLight.shadow.camera.far = 24
  keyLight.shadow.bias = -.0007; keyLight.shadow.normalBias = .025; keyLight.shadow.radius = 3
  scene.add(keyLight)
  const rimLight = new THREE.DirectionalLight(0xa7c56d, 2.5)
  rimLight.position.set(5, 1, -4); scene.add(rimLight)
  const warmLight = new THREE.PointLight(0xe2a25e, 18, 18, 2)
  warmLight.position.set(4, -.5, 5); scene.add(warmLight)

  /* Wood textures ------------------------------------------------------ */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
  }

  function seeded(seed) {
    let state = seed >>> 0
    return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296 }
  }

  function drawLeafMark(ctx, x, y, scale, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.strokeStyle = color
    ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(0, 72); ctx.bezierCurveTo(-3, 40, 8, 12, 38, -30); ctx.stroke()
    ;[[4, 38, -27, 17], [10, 16, -30, -3], [18, -6, 47, -28], [0, 53, 28, 34]].forEach(([sx, sy, ex, ey]) => {
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + ex) * .4, (sy + ey) * .45, ex, ey); ctx.stroke()
    })
    ctx.restore()
  }

  function makeWoodTexture(side) {
    const W = 900, H = 1260, c = document.createElement('canvas')
    c.width = W; c.height = H
    const ctx = c.getContext('2d')
    const rnd = seeded(side === 'front' ? 1709 : 1717)
    const gradient = ctx.createLinearGradient(0, 0, W, H)
    gradient.addColorStop(0, '#9a6a3b'); gradient.addColorStop(.48, '#81532e'); gradient.addColorStop(1, '#684021')
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H)

    ctx.globalAlpha = .24
    for (let i = 0; i < 88; i++) {
      const y = rnd() * H, amp = 4 + rnd() * 17, freq = .008 + rnd() * .018
      ctx.beginPath(); ctx.moveTo(-20, y)
      for (let x = -20; x <= W + 20; x += 12) ctx.lineTo(x, y + Math.sin(x * freq + rnd() * 1.8) * amp + Math.sin(x * .004) * 7)
      ctx.strokeStyle = i % 3 === 0 ? '#3a1f0d' : '#c89960'; ctx.lineWidth = .8 + rnd() * 2.4; ctx.stroke()
    }
    ctx.globalAlpha = .18
    for (let i = 0; i < 5; i++) {
      const x = 120 + rnd() * 660, y = 120 + rnd() * 1020
      for (let r = 10; r < 58; r += 8) {
        ctx.beginPath(); ctx.ellipse(x, y, r * 1.7, r * .55, -.18, 0, Math.PI * 2)
        ctx.strokeStyle = '#351b0b'; ctx.lineWidth = 2; ctx.stroke()
      }
    }
    ctx.globalAlpha = 1

    const ink = '#25170d', pale = '#e5d3ab', green = '#243a20'
    ctx.strokeStyle = 'rgba(42,23,10,.42)'; ctx.lineWidth = 3; roundRect(ctx, 34, 34, W - 68, H - 68, 34); ctx.stroke()
    ctx.strokeStyle = 'rgba(229,211,171,.18)'; ctx.lineWidth = 1; roundRect(ctx, 48, 48, W - 96, H - 96, 30); ctx.stroke()

    if (side === 'front') {
      ctx.fillStyle = pale; ctx.font = '600 22px Georgia, serif'; ctx.fillText('SUI XIN JI', 68, 92)
      ctx.fillStyle = ink; ctx.font = '500 17px monospace'; ctx.fillText('FIELD NOTES / BLOG', 68, 128)
      ctx.strokeStyle = 'rgba(37,23,13,.55)'; ctx.beginPath(); ctx.moveTo(68, 157); ctx.lineTo(832, 157); ctx.stroke()
      drawLeafMark(ctx, 648, 315, 2.05, green)
      ctx.fillStyle = pale; ctx.font = 'italic 42px Georgia, serif'; ctx.fillText('Write as you please.', 68, 470)
      ctx.fillStyle = ink; ctx.font = '700 92px "Noto Serif SC", "Songti SC", "STSong", serif'; ctx.fillText('随心记', 62, 660)
      ctx.font = '500 25px monospace'; ctx.fillText('随笔 · 灵感 · 日常', 68, 730)
      ctx.strokeStyle = 'rgba(37,23,13,.52)'; ctx.beginPath(); ctx.moveTo(68, 790); ctx.lineTo(832, 790); ctx.stroke()
      ctx.fillStyle = pale; ctx.font = '600 18px monospace'; ctx.fillText('RECORD', 68, 852); ctx.fillText('MOOD', 360, 852); ctx.fillText('SEASON', 650, 852)
      ctx.fillStyle = ink; ctx.font = '500 23px monospace'; ctx.fillText('VOL—01', 68, 894); ctx.fillText('CALM', 360, 894); ctx.fillText('AUTUMN', 650, 894)
      ctx.fillStyle = green; ctx.fillRect(68, 1080, 330, 3)
      ctx.font = '600 17px monospace'; ctx.fillText('KEEP CLOSE TO THE WILD', 68, 1126)
    } else {
      ctx.fillStyle = pale; ctx.font = '600 21px Georgia, serif'; ctx.fillText('FIELD NOTES', 68, 94)
      ctx.fillStyle = ink; ctx.font = 'italic 34px Georgia, serif'; ctx.fillText('Casual archive', 68, 158)
      ctx.strokeStyle = 'rgba(37,23,13,.55)'; ctx.beginPath(); ctx.moveTo(68, 190); ctx.lineTo(832, 190); ctx.stroke()
      drawLeafMark(ctx, 716, 345, 1.45, green)
      ctx.font = '700 30px "Noto Serif SC", "Songti SC", serif'; ctx.fillText('随心 / FREE MIND', 68, 304)
      ctx.font = '500 19px monospace'; ctx.fillText('TYPE     NOTES', 68, 362); ctx.fillText('SCOPE    EVERYDAY', 68, 406); ctx.fillText('STATUS   ALIVE', 68, 450)
      ctx.fillStyle = 'rgba(229,211,171,.78)'; roundRect(ctx, 62, 535, 776, 248, 18); ctx.fill()
      ctx.fillStyle = ink; ctx.font = 'italic 26px Georgia, serif'
      ctx.fillText('"Let the line follow the light,', 94, 607); ctx.fillText('and let the leaf remember rain."', 94, 648)
      ctx.font = '500 17px monospace'; ctx.fillText('PENNED BY THE BLOG OWNER', 94, 724)
      ctx.fillStyle = green; ctx.fillRect(68, 1026, 390, 3)
      ctx.font = '600 17px monospace'; ctx.fillText('CLICK THE PLAQUE TO READ', 68, 1070)
    }
    const texture = new THREE.CanvasTexture(c)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    return texture
  }

  /* Plaque ------------------------------------------------------------- */
  const plaqueRig = new THREE.Group()
  scene.add(plaqueRig)

  const woodMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x704522, roughness: .62, metalness: .01, clearcoat: .16, clearcoatRoughness: .58, envMapIntensity: .8,
  })
  const shell = new THREE.Mesh(new RoundedBoxGeometry(CFG.plaqueW, CFG.plaqueH, CFG.plaqueD, 7, .18), woodMaterial)
  shell.castShadow = true; shell.receiveShadow = true; plaqueRig.add(shell)

  const faceGeometry = new THREE.PlaneGeometry(CFG.plaqueW - .15, CFG.plaqueH - .15)
  const frontFace = new THREE.Mesh(faceGeometry, new THREE.MeshStandardMaterial({ map: makeWoodTexture('front'), roughness: .68, metalness: 0, envMapIntensity: .65 }))
  frontFace.position.z = CFG.plaqueD / 2 + .004
  const backFace = new THREE.Mesh(faceGeometry, new THREE.MeshStandardMaterial({ map: makeWoodTexture('back'), roughness: .68, metalness: 0, envMapIntensity: .65 }))
  backFace.position.z = -CFG.plaqueD / 2 - .004; backFace.rotation.y = Math.PI
  plaqueRig.add(frontFace, backFace)

  const brass = new THREE.MeshPhysicalMaterial({ color: 0xa98245, roughness: .28, metalness: .82, clearcoat: .35, envMapIntensity: 1.2 })
  const darkHole = new THREE.MeshStandardMaterial({ color: 0x160d07, roughness: .9 })
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(.145, .145, CFG.plaqueD + .05, 28), darkHole)
  hole.rotation.x = Math.PI / 2; hole.position.set(0, CFG.eyeY, 0); plaqueRig.add(hole)
  const eyeletFront = new THREE.Mesh(new THREE.TorusGeometry(.19, .047, 12, 36), brass)
  eyeletFront.position.set(0, CFG.eyeY, CFG.plaqueD / 2 + .055)
  const eyeletBack = eyeletFront.clone(); eyeletBack.position.z = -CFG.plaqueD / 2 - .055
  plaqueRig.add(eyeletFront, eyeletBack)

  /* Leaf and vine builders --------------------------------------------- */
  const leafShape = new THREE.Shape()
  leafShape.moveTo(0, 0)
  leafShape.bezierCurveTo(.16, .06, .24, .22, 0, .43)
  leafShape.bezierCurveTo(-.24, .22, -.16, .06, 0, 0)
  const leafGeometry = new THREE.ShapeGeometry(leafShape, 8)
  leafGeometry.computeVertexNormals()
  const leafMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x456d31, roughness: .74, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: 0x6f8d42, roughness: .72, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: 0x294d29, roughness: .78, side: THREE.DoubleSide }),
  ]
  const vineMaterial = new THREE.MeshStandardMaterial({ color: 0x36582c, roughness: .82, metalness: 0 })
  const youngVineMaterial = new THREE.MeshStandardMaterial({ color: 0x658144, roughness: .78, metalness: 0 })

  function addStaticVine(points, radius, material, phase) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 72, radius, 7, false), material)
    tube.castShadow = true; plaqueRig.add(tube)
    const leaves = []
    for (let i = 1; i <= 7; i++) {
      const t = .08 + i * .115
      const p = curve.getPointAt(t), tangent = curve.getTangentAt(t).normalize()
      const holder = new THREE.Group(); holder.position.copy(p)
      holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
      const leaf = new THREE.Mesh(leafGeometry, leafMaterials[(i + phase) % leafMaterials.length])
      leaf.rotation.z = (i % 2 ? 1 : -1) * (.72 + (i % 3) * .13)
      leaf.rotation.y = Math.sin(i * 1.7 + phase) * .45
      leaf.scale.setScalar(.72 + (i % 3) * .12); leaf.castShadow = true
      holder.add(leaf); plaqueRig.add(holder); leaves.push({ holder, leaf, phase: i * 1.9 + phase })
    }
    return leaves
  }

  const plaqueLeaves = []
  plaqueLeaves.push(...addStaticVine([
    new THREE.Vector3(-1.12, -1.75, .19), new THREE.Vector3(-1.34, -1.2, .18),
    new THREE.Vector3(-1.18, -.65, -.19), new THREE.Vector3(-1.34, -.08, .2),
    new THREE.Vector3(-1.19, .55, .2), new THREE.Vector3(-1.31, 1.12, -.18),
    new THREE.Vector3(-.86, 1.74, .2), new THREE.Vector3(-.28, 1.83, .2),
  ], .035, vineMaterial, 0))
  plaqueLeaves.push(...addStaticVine([
    new THREE.Vector3(1.14, -1.67, -.18), new THREE.Vector3(1.31, -1.12, .19),
    new THREE.Vector3(1.18, -.48, .2), new THREE.Vector3(1.31, .12, -.18),
    new THREE.Vector3(1.17, .72, .2), new THREE.Vector3(.95, 1.15, .2),
  ], .03, youngVineMaterial, 1))

  /* Anchor ------------------------------------------------------------- */
  const anchorGroup = new THREE.Group(); anchorGroup.position.copy(CFG.anchor)
  const branchMaterial = new THREE.MeshStandardMaterial({ color: 0x5a371d, roughness: .86 })
  const anchorBar = new THREE.Mesh(new THREE.CylinderGeometry(.075, .095, 1.12, 14), branchMaterial)
  anchorBar.rotation.z = Math.PI / 2; anchorBar.rotation.y = .15; anchorBar.castShadow = true
  const knot = new THREE.Mesh(new THREE.TorusGeometry(.13, .035, 9, 28), vineMaterial); knot.rotation.x = Math.PI / 2; knot.position.y = -.04
  anchorGroup.add(anchorBar, knot); scene.add(anchorGroup)/* Elastic rope --------------------------------------------------------- */
  class Cord {
    constructor() {
      this.count = CFG.ropeSegments + 1
      this.baseSegment = CFG.ropeLength / CFG.ropeSegments
      this.segment = this.baseSegment
      this.stretch = CFG.ropeRestStretch
      this.stretchVelocity = 0
      this.peakStretch = this.stretch
      this.points = Array.from({ length: this.count }, () => new THREE.Vector3())
      this.previous = Array.from({ length: this.count }, () => new THREE.Vector3())
      this.reset(true)
    }
    reset(entrance) {
      this.stretch = CFG.ropeRestStretch; this.stretchVelocity = 0; this.peakStretch = this.stretch
      this.segment = this.baseSegment * (1 + this.stretch)
      for (let i = 0; i < this.count; i++) {
        const t = i / (this.count - 1)
        const x = entrance ? Math.sin(t * Math.PI) * .22 + t * .42 : 0
        this.points[i].set(CFG.anchor.x + x, CFG.anchor.y - CFG.ropeLength * (1 + this.stretch) * t, Math.sin(t * Math.PI) * .05)
        this.previous[i].copy(this.points[i])
      }
      if (entrance && !prefersReducedMotion) this.previous[this.count - 1].x += .12
    }
    updateElasticity(dt, dragTarget) {
      let target = CFG.ropeRestStretch
      if (dragTarget) {
        const pulled = Math.max(0, CFG.anchor.distanceTo(dragTarget) - CFG.ropeLength) / CFG.ropeLength
        target = Math.min(CFG.ropeRestStretch + pulled, CFG.ropeSafetyStretch)
      }
      const force = (target - this.stretch) * CFG.ropeElasticity - this.stretchVelocity * CFG.ropeElasticDamping
      this.stretchVelocity += force * dt; this.stretch += this.stretchVelocity * dt
      if (this.stretch < -.035) { this.stretch = -.035; if (this.stretchVelocity < 0) this.stretchVelocity *= -.22 }
      if (this.stretch > CFG.ropeSafetyStretch) { this.stretch = CFG.ropeSafetyStretch; if (this.stretchVelocity > 0) this.stretchVelocity *= -.18 }
      this.segment = this.baseSegment * (1 + this.stretch)
      this.peakStretch = Math.max(this.peakStretch, this.stretch)
    }
    integrate(dt, dragTarget) {
      const dt2 = dt * dt
      for (let i = 1; i < this.count; i++) {
        const p = this.points[i], ox = p.x, oy = p.y, oz = p.z
        p.x += (p.x - this.previous[i].x) * CFG.damping
        p.y += (p.y - this.previous[i].y) * CFG.damping + CFG.gravity * dt2
        p.z += (p.z - this.previous[i].z) * CFG.damping
        this.previous[i].set(ox, oy, oz)
      }
      if (dragTarget) this.tip.lerp(dragTarget, .42)
    }
    constrain() {
      this.points[0].copy(CFG.anchor)
      for (let pass = 0; pass < CFG.iterations; pass++) {
        for (let i = 0; i < this.count - 1; i++) {
          const a = this.points[i], b = this.points[i + 1]
          const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z
          const length = Math.hypot(dx, dy, dz) || 1
          const correction = (length - this.segment) / length
          if (i === 0) { b.x -= dx * correction; b.y -= dy * correction; b.z -= dz * correction }
          else {
            const weight = i === this.count - 2 ? .35 : .5
            a.x += dx * correction * (1 - weight); a.y += dy * correction * (1 - weight); a.z += dz * correction * (1 - weight)
            b.x -= dx * correction * weight; b.y -= dy * correction * weight; b.z -= dz * correction * weight
          }
        }
        this.points[0].copy(CFG.anchor)
      }
    }
    step(dt, target) { this.updateElasticity(dt, target); this.integrate(dt, target); this.constrain() }
    pluck(strength) { this.stretchVelocity += strength }
    kick(x, y, z) {
      for (let i = 1; i < this.count; i++) {
        const t = i / (this.count - 1)
        this.previous[i].x -= x * t * CFG.fixedStep; this.previous[i].y -= y * t * CFG.fixedStep; this.previous[i].z -= z * t * CFG.fixedStep
      }
    }
    get tip() { return this.points[this.count - 1] }
  }
  const cord = new Cord()

  function makeHempTexture() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128
    const ctx = c.getContext('2d'); ctx.fillStyle = '#8c724d'; ctx.fillRect(0, 0, 64, 128)
    ctx.strokeStyle = '#c2a774'; ctx.lineWidth = 10
    for (let x = -128; x < 128; x += 20) { ctx.beginPath(); ctx.moveTo(x, 128); ctx.lineTo(x + 128, 0); ctx.stroke() }
    ctx.strokeStyle = '#554127'; ctx.lineWidth = 3
    for (let x = -128; x < 128; x += 20) { ctx.beginPath(); ctx.moveTo(x + 8, 128); ctx.lineTo(x + 136, 0); ctx.stroke() }
    const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(1.2, 12); return texture
  }

  function createTube(count, radial, material) {
    const positions = new Float32Array(count * radial * 3), normals = new Float32Array(count * radial * 3), uvs = new Float32Array(count * radial * 2), indices = []
    for (let i = 0; i < count; i++) for (let j = 0; j < radial; j++) {
      const k = i * radial + j; uvs[k * 2] = j / radial; uvs[k * 2 + 1] = i / (count - 1)
    }
    for (let i = 0; i < count - 1; i++) for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + (j + 1) % radial, c = (i + 1) * radial + (j + 1) % radial, d = (i + 1) * radial + j
      indices.push(a, b, d, b, c, d)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2)); geometry.setIndex(indices)
    const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.frustumCulled = false; scene.add(mesh)
    return { geometry, mesh, radial }
  }

  const ropeMaterial = new THREE.MeshStandardMaterial({ map: makeHempTexture(), color: 0xc1a373, roughness: .88, metalness: 0, envMapIntensity: .48 })
  const ropeTube = createTube(cord.count, 9, ropeMaterial)
  const ropeVineTube = createTube(cord.count, 6, youngVineMaterial)
  const vineCenters = Array.from({ length: cord.count }, () => new THREE.Vector3())
  const ropeNormals = Array.from({ length: cord.count }, () => new THREE.Vector3(1, 0, 0))
  const ropeBinormals = Array.from({ length: cord.count }, () => new THREE.Vector3(0, 0, 1))

  const ropeLeaves = []
  for (let i = 6; i < cord.count - 3; i += 5) {
    const holder = new THREE.Group()
    const leaf = new THREE.Mesh(leafGeometry, leafMaterials[(i / 5) % leafMaterials.length | 0])
    leaf.rotation.z = (i % 2 ? 1 : -1) * .9; leaf.scale.setScalar(.62 + (i % 3) * .08); leaf.castShadow = true
    holder.add(leaf); scene.add(holder); ropeLeaves.push({ index: i, holder, leaf, phase: i * .71 })
  }

  const workTangent = new THREE.Vector3(), workNormal = new THREE.Vector3(), workBinormal = new THREE.Vector3(), workOffset = new THREE.Vector3(), workTemp = new THREE.Vector3()
  function updateTube(geometry, radial, centers, radius, initialNormal, captureFrames) {
    const positions = geometry.attributes.position, normals = geometry.attributes.normal
    workNormal.copy(initialNormal)
    for (let i = 0; i < centers.length; i++) {
      const prev = centers[Math.max(0, i - 1)], next = centers[Math.min(centers.length - 1, i + 1)]
      workTangent.subVectors(next, prev).normalize()
      workNormal.addScaledVector(workTemp.copy(workTangent), -workNormal.dot(workTangent))
      if (workNormal.lengthSq() < 1e-6) workNormal.set(1, 0, 0)
      workNormal.normalize(); workBinormal.crossVectors(workTangent, workNormal).normalize()
      if (captureFrames) { ropeNormals[i].copy(workNormal); ropeBinormals[i].copy(workBinormal) }
      const r = typeof radius === 'function' ? radius(i) : radius
      for (let j = 0; j < radial; j++) {
        const angle = j / radial * Math.PI * 2
        workOffset.copy(workNormal).multiplyScalar(Math.cos(angle) * r).addScaledVector(workBinormal, Math.sin(angle) * r)
        const k = i * radial + j
        positions.setXYZ(k, centers[i].x + workOffset.x, centers[i].y + workOffset.y, centers[i].z + workOffset.z)
        normals.setXYZ(k, workOffset.x / r, workOffset.y / r, workOffset.z / r)
      }
    }
    positions.needsUpdate = true; normals.needsUpdate = true; geometry.computeBoundingSphere()
  }

  function updateRopeGeometry(elapsed) {
    updateTube(ropeTube.geometry, ropeTube.radial, cord.points, (i) => clamp(.052 * (1 - cord.stretch * 1.35), .036, .053), new THREE.Vector3(1, 0, 0), true)
    for (let i = 0; i < cord.count; i++) {
      const phase = i * .84
      vineCenters[i].copy(cord.points[i])
        .addScaledVector(ropeNormals[i], Math.cos(phase) * .077)
        .addScaledVector(ropeBinormals[i], Math.sin(phase) * .077)
    }
    updateTube(ropeVineTube.geometry, ropeVineTube.radial, vineCenters, .021, new THREE.Vector3(1, 0, 0), false)
    ropeLeaves.forEach((entry) => {
      const i = entry.index, a = vineCenters[Math.max(0, i - 1)], b = vineCenters[Math.min(cord.count - 1, i + 1)]
      entry.holder.position.copy(vineCenters[i])
      workTangent.subVectors(b, a).normalize()
      entry.holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), workTangent)
      entry.leaf.rotation.y = Math.sin(elapsed * 1.35 + entry.phase) * .16
    })
  }/* Interaction ---------------------------------------------------------- */
  const motion = {
    angleZ: 0, velocityZ: 0, angleX: 0, velocityX: 0,
    flip: 0, flipTarget: 0, flipVelocity: 0,
    hover: 0, hoverTarget: 0, dragging: false,
    dragCenter: new THREE.Vector3(), dragPrevious: new THREE.Vector3(), dragVelocity: new THREE.Vector3(),
  }
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), dragPlane = new THREE.Plane()
  const dragHit = new THREE.Vector3(), dragOffset = new THREE.Vector3(), planeNormal = new THREE.Vector3(), eyeWorldOffset = new THREE.Vector3()
  const euler = new THREE.Euler(0, 0, 0, 'XYZ'), plaqueQuaternion = new THREE.Quaternion(), lastTip = cord.tip.clone()

  function updatePointer(x, y) {
    const rect = canvas.getBoundingClientRect()
    pointer.x = ((x - rect.left) / rect.width) * 2 - 1
    pointer.y = -((y - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
  }
  function pickPlaque(x, y) {
    updatePointer(x, y)
    return raycaster.intersectObjects([shell, frontFace, backFace, eyeletFront, eyeletBack], false)[0] || null
  }
  function plaqueCenterFromTip(out) {
    eyeWorldOffset.set(0, CFG.eyeY, 0).applyQuaternion(plaqueRig.quaternion)
    return out.copy(cord.tip).sub(eyeWorldOffset)
  }

  let downPos = null, downTime = 0, movedFar = false

  function beginDrag(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (!pickPlaque(event.clientX, event.clientY)) return
    motion.dragging = true
    motion.dragCenter.copy(plaqueRig.position)
    motion.dragPrevious.copy(motion.dragCenter)
    motion.dragVelocity.set(0, 0, 0)
    camera.getWorldDirection(planeNormal)
    dragPlane.setFromNormalAndCoplanarPoint(planeNormal.negate(), plaqueRig.position)
    updatePointer(event.clientX, event.clientY)
    if (raycaster.ray.intersectPlane(dragPlane, dragHit)) dragOffset.subVectors(plaqueRig.position, dragHit); else dragOffset.set(0, 0, 0)
    canvas.setPointerCapture && canvas.setPointerCapture(event.pointerId)
    canvas.style.cursor = 'grabbing'
    downPos = { x: event.clientX, y: event.clientY }; movedFar = false; downTime = performance.now()
    event.preventDefault()
  }
  function moveDrag(event) {
    if (!motion.dragging) {
      const hit = pickPlaque(event.clientX, event.clientY)
      motion.hoverTarget = hit ? 1 : 0
      canvas.style.cursor = hit ? 'grab' : 'default'
      return
    }
    if (downPos && Math.hypot(event.clientX - downPos.x, event.clientY - downPos.y) > 6) movedFar = true
    updatePointer(event.clientX, event.clientY)
    if (!raycaster.ray.intersectPlane(dragPlane, dragHit)) return
    motion.dragPrevious.copy(motion.dragCenter)
    motion.dragCenter.copy(dragHit).add(dragOffset)
    const xLimit = widget ? 3.2 : 5.3
    motion.dragCenter.x = clamp(motion.dragCenter.x, -xLimit, xLimit)
    motion.dragCenter.y = clamp(motion.dragCenter.y, -5.9, CFG.anchor.y - .3)
    motion.dragCenter.z = clamp(motion.dragCenter.z, -3.6, 4.2)
    motion.dragVelocity.subVectors(motion.dragCenter, motion.dragPrevious).multiplyScalar(60)
  }
  function endDrag(event) {
    if (!motion.dragging) return
    motion.dragging = false
    cord.kick(clamp(motion.dragVelocity.x, -12, 12), clamp(motion.dragVelocity.y, -8, 8), clamp(motion.dragVelocity.z, -8, 8))
    motion.velocityZ += clamp(-motion.dragVelocity.x * .036, -.46, .46)
    canvas.releasePointerCapture && event.pointerId != null && canvas.releasePointerCapture(event.pointerId)
    canvas.style.cursor = 'grab'
    const quick = performance.now() - downTime < 450
    if (onPick && !movedFar && quick) onPick()
    downPos = null
  }
  canvas.addEventListener('pointerdown', beginDrag, { passive: false })
  canvas.addEventListener('pointermove', moveDrag)
  canvas.addEventListener('pointerup', endDrag)
  canvas.addEventListener('pointercancel', endDrag)

  function spring(value, velocity, target, stiffness, damping, dt) {
    velocity += (target - value) * stiffness * dt
    velocity *= Math.exp(-damping * dt)
    value += velocity * dt
    return [value, velocity]
  }
  function updatePlaqueMotion(dt, elapsed) {
    const tipVelocity = workTemp.subVectors(cord.tip, lastTip).multiplyScalar(1 / Math.max(dt, .0001))
    lastTip.copy(cord.tip)
    const beforeTip = cord.points[cord.count - 2]
    const segmentX = cord.tip.x - beforeTip.x, segmentZ = cord.tip.z - beforeTip.z
    const targetZ = clamp(-tipVelocity.x * .035 - segmentX * 1.8, -.62, .62)
    const targetX = clamp(tipVelocity.z * .025 + segmentZ * 1.2, -.38, .38)
    ;[motion.angleZ, motion.velocityZ] = spring(motion.angleZ, motion.velocityZ, targetZ, 47, 8.5, dt)
    ;[motion.angleX, motion.velocityX] = spring(motion.angleX, motion.velocityX, targetX, 41, 8.8, dt)
    ;[motion.flip, motion.flipVelocity] = spring(motion.flip, motion.flipVelocity, motion.flipTarget, 62, 10.8, dt)
    euler.set(motion.angleX, motion.flip, motion.angleZ, 'XYZ')
    plaqueQuaternion.setFromEuler(euler)
    plaqueRig.quaternion.copy(plaqueQuaternion)
    plaqueCenterFromTip(plaqueRig.position)
    motion.hover += (motion.hoverTarget - motion.hover) * (1 - Math.exp(-dt * 12))
    plaqueRig.scale.setScalar(1 + motion.hover * .018)
    woodMaterial.clearcoat = .16 + motion.hover * .12
    plaqueLeaves.forEach((entry) => { entry.leaf.rotation.x = Math.sin(elapsed * 1.2 + entry.phase) * .08 })
  }
  function targetEyePosition() {
    if (!motion.dragging) return null
    eyeWorldOffset.set(0, CFG.eyeY, 0).applyQuaternion(plaqueRig.quaternion)
    return workTemp.copy(motion.dragCenter).add(eyeWorldOffset)
  }

  /* Loop --------------------------------------------------------------- */
  let accumulator = 0, elapsed = 0
  const clock = new THREE.Clock()

  function resize() {
    const parent = canvas.parentElement
    const width = Math.max(1, parent ? parent.clientWidth : innerWidth)
    const height = Math.max(1, parent ? parent.clientHeight : innerHeight)
    renderer.setSize(width, height, false)
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, CFG.maxPixelRatio))
    camera.aspect = width / height
    if (widget) {
      camera.fov = 35
      const dist = Math.max(7.0 / camera.aspect, 12.4)
      cameraBase.z = dist
      camera.position.z = dist
    } else {
      camera.fov = width / height < .72 ? 40 : width / height < 1 ? 38 : 35
      const dist = width / height < .72 ? 14.2 : width / height < 1 ? 14.2 : 13.7
      cameraBase.set(0, .34, dist); camera.position.z = dist
    }
    camera.lookAt(lookTarget)
    camera.updateProjectionMatrix()
    if (backdrop) backdrop.material.uniforms.uAspect.value = width / height
  }
  let ro = null
  if (widget && typeof ResizeObserver === 'function') {
    ro = new ResizeObserver(() => resize())
    if (canvas.parentElement) ro.observe(canvas.parentElement)
  } else {
    addEventListener('resize', resize)
  }

  function frame() {
    let dt = Math.min(clock.getDelta(), .05)
    if (!Number.isFinite(dt)) dt = CFG.fixedStep
    elapsed += dt
    accumulator += dt
    let steps = 0
    while (accumulator >= CFG.fixedStep && steps < 8) { cord.step(CFG.fixedStep, targetEyePosition()); accumulator -= CFG.fixedStep; steps++ }
    if (steps === 8) accumulator = 0
    updateRopeGeometry(elapsed)
    updatePlaqueMotion(dt, elapsed)
    const tensionRatio = clamp(cord.stretch / CFG.ropeVisualStretch, 0, 1)
    ropeMaterial.map.repeat.y = 12 / (1 + cord.stretch)
    halo.material.uniforms.uStrength.value = (widget ? .1 : .13) + tensionRatio * .045
    if (backdrop) backdrop.material.uniforms.uTime.value = elapsed
    if (!prefersReducedMotion && !motion.dragging) {
      camera.position.x += (Math.sin(elapsed * .16) * .1 - camera.position.x) * .012
      camera.position.y += (cameraBase.y + Math.sin(elapsed * .2) * .05 - camera.position.y) * .012
      camera.lookAt(lookTarget)
      dust.rotation.y = elapsed * .006
      warmLight.intensity = 17.5 + Math.sin(elapsed * .65) * 1.2
    }
    renderer.render(scene, camera)
  }

  resize()
  updateRopeGeometry(0)
  updatePlaqueMotion(CFG.fixedStep, 0)
  renderer.compile(scene, camera)
  requestAnimationFrame(() => renderer.setAnimationLoop(frame))

  const onVis = () => { if (document.hidden) { clock.stop(); renderer.setAnimationLoop(null) } else { clock.start(); accumulator = 0; renderer.setAnimationLoop(frame) } }
  document.addEventListener('visibilitychange', onVis)

  return {
    pulse() {
      const direction = Math.random() > .5 ? 1 : -1
      cord.pluck(prefersReducedMotion ? .2 : 1.08)
      cord.kick(direction * 1.2, -1.8, .75)
      motion.velocityZ -= direction * .1
      motion.velocityX += .06
    },
    flip() { motion.flipTarget += Math.PI; motion.flipVelocity += .68; cord.kick(.6, 0, 1.15) },
    reset() {
      cord.reset(false)
      motion.angleZ = motion.velocityZ = motion.angleX = motion.velocityX = 0
      motion.flip = motion.flipTarget = motion.flipVelocity = 0
      motion.dragging = false; motion.hover = motion.hoverTarget = 0
    },
    dispose() {
      renderer.setAnimationLoop(null)
      document.removeEventListener('visibilitychange', onVis)
      if (ro) ro.disconnect(); else removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', beginDrag)
      canvas.removeEventListener('pointermove', moveDrag)
      canvas.removeEventListener('pointerup', endDrag)
      canvas.removeEventListener('pointercancel', endDrag)
      renderer.dispose()
    },
  }
}

if (typeof window !== 'undefined') window.mountWoodBadge = mountWoodBadge