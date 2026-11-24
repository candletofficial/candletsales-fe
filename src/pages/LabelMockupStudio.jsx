import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import Layout from '../components/Layout';
import { uploadService } from '../services/uploadService';
import { mockupService } from '../services/mockupService';

const DIAMETER = 70;
const HEIGHT = 84;
const finishOptions = [
  { id: 'frosted', name: 'Kính trắng mờ', color: '#e8e9e6' },
  { id: 'clear', name: 'Kính trong', color: '#dce7e8' },
  { id: 'amber', name: 'Kính hổ phách', color: '#87451f' },
  { id: 'black', name: 'Kính đen', color: '#161514' },
];
const lidOptions = [
  { id: 'none', name: 'Không nắp' },
  { id: 'gold', name: 'Nắp vàng' },
  { id: 'wood', name: 'Nắp gỗ' },
  { id: 'black', name: 'Nắp đen' },
];

function createSampleLabel() {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 760;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f5efe4';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#573128';
  ctx.lineWidth = 7;
  ctx.strokeRect(34, 34, 932, 692);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#34231e';
  ctx.font = '600 54px Georgia';
  ctx.fillText('CANDLET', 500, 220);
  ctx.font = 'italic 32px Georgia';
  ctx.fillText('custom candle', 500, 286);
  ctx.strokeStyle = '#c4a06b';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(290, 340); ctx.lineTo(710, 340); ctx.stroke();
  ctx.fillStyle = '#573128';
  ctx.font = '700 70px Georgia';
  ctx.fillText('YOUR BRAND', 500, 470);
  ctx.fillStyle = '#77665d';
  ctx.font = '25px Arial';
  ctx.fillText('HAND POURED · 200G', 500, 555);
  return canvas;
}

function createWoodTexture(width, height, side = false) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, side ? '#e8bd7c' : '#f3d39e');
  base.addColorStop(.42, side ? '#f0cd94' : '#efd0a0');
  base.addColorStop(1, side ? '#dca964' : '#e4b977');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  // Pale horizontal pine grain, matching the light unfinished 70 mm lid.
  let seed = side ? 9181 : 4717;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const grainCount = side ? 42 : 82;
  for (let row = 0; row < grainCount; row += 1) {
    const y = random() * height;
    const amplitude = (side ? .7 : 1.8) + random() * (side ? 2.2 : 5.2);
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= width; x += 12) {
      const wave = Math.sin(x * (.009 + random() * .002) + row * .7) * amplitude;
      ctx.lineTo(x, y + wave);
    }
    ctx.strokeStyle = `rgba(151, 84, 30, ${side ? .075 + random() * .13 : .055 + random() * .12})`;
    ctx.lineWidth = .8 + random() * (side ? 2.2 : 3.4);
    ctx.stroke();
  }

  // Broad growth bands are visible on both the face and the cut edge.
  const bands = side ? [.16, .43, .7, .89] : [.12, .3, .51, .72, .88];
  bands.forEach((ratio, index) => {
      const y = height * ratio;
      const spread = side ? 9 : 22;
      const band = ctx.createLinearGradient(0, y - spread, 0, y + spread);
      band.addColorStop(0, 'rgba(180, 111, 52, 0)');
      band.addColorStop(.42, `rgba(157, 86, 30, ${side ? .13 : index % 2 ? .075 : .115})`);
      band.addColorStop(.62, `rgba(255, 231, 190, ${side ? .12 : .08})`);
      band.addColorStop(1, 'rgba(180, 111, 52, 0)');
      ctx.save();
      ctx.translate(0, Math.sin(index * 1.7) * spread * .35);
      ctx.fillStyle = band;
      ctx.fillRect(0, y - spread, width, spread * 2);
      ctx.restore();
  });

  // Short darker streaks make the side read as real end grain instead of paint.
  if (side) {
    for (let index = 0; index < 34; index += 1) {
      const y = random() * height;
      const x = random() * width;
      const length = 35 + random() * 155;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + length * .45, y + random() * 4 - 2, x + length, y + random() * 3 - 1.5);
      ctx.strokeStyle = `rgba(120, 67, 27, ${.08 + random() * .11})`;
      ctx.lineWidth = .8 + random() * 1.8;
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  if (side) texture.repeat.set(1.6, 1);
  return texture;
}

function createFrostTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(256, 256);
  let seed = 78123;
  for (let index = 0; index < image.data.length; index += 4) {
    seed = (seed * 16807) % 2147483647;
    const grain = 168 + Math.floor((seed / 2147483647) * 78);
    image.data[index] = grain;
    image.data[index + 1] = grain;
    image.data[index + 2] = grain;
    image.data[index + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 4);
  return texture;
}

function disposeTree(root) {
  root.traverse((node) => {
    node.geometry?.dispose();
    if (Array.isArray(node.material)) node.material.forEach((material) => material.dispose());
    else node.material?.dispose();
  });
}

export function MockupViewport({ labelSource, labelWidth, labelHeight, labelTop, labelRotation, finish, lid, rendererRef, compact = false }) {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const groupRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, .1, 1000);
    camera.position.set(0, 9, window.innerWidth < 640 ? 390 : 208);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, .035).texture;
    room.dispose();
    const key = new THREE.DirectionalLight(0xffffff, 3.45);
    key.position.set(-70, 105, 90); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -100; key.shadow.camera.right = 100; key.shadow.camera.top = 120; key.shadow.camera.bottom = -100;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xe8edf0, 1.45);
    fill.position.set(80, 40, 70); scene.add(fill);
    const rimLight = new THREE.PointLight(0xffffff, 95, 260, 2);
    rimLight.position.set(0, 100, -40); scene.add(rimLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .06; controls.enablePan = false;
    controls.minPolarAngle = Math.PI * .32; controls.maxPolarAngle = Math.PI * .68;
    controls.target.set(0, 0, 0);
    const group = new THREE.Group(); scene.add(group);
    sceneRef.current = scene; groupRef.current = group;

    let fittedDistance = null;
    let userZoomRatio = 1;
    const rememberUserZoom = () => {
      if (!fittedDistance) return;
      const distance = camera.position.distanceTo(controls.target);
      userZoomRatio = THREE.MathUtils.clamp(distance / fittedDistance, .76, 2.15);
    };
    controls.addEventListener('end', rememberUserZoom);
    const resize = () => {
      const width = host.clientWidth; const height = host.clientHeight;
      if (!width || !height) return;
      const aspect = width / height;
      renderer.setSize(width, height, false);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();

      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
      const objectHeight = lid === 'none' ? 88 : 98;
      const objectWidth = 76;
      const narrowScreen = aspect < .72;
      const heightDistance = (objectHeight / 2) / Math.tan(verticalFov / 2) * (narrowScreen ? 1.24 : 1.2);
      const widthDistance = (objectWidth / 2) / Math.tan(horizontalFov / 2) * (narrowScreen ? 1.36 : 1.18);
      const fitDistance = Math.max(heightDistance, widthDistance);
      const nextDistance = fitDistance * userZoomRatio;
      const viewDirection = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(controls.target).add(viewDirection.multiplyScalar(nextDistance));
      controls.minDistance = fitDistance * .72;
      controls.maxDistance = fitDistance * 2.15;
      fittedDistance = fitDistance;
      controls.update();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    window.visualViewport?.addEventListener('resize', resize);
    resize();
    const firstLayoutFrame = requestAnimationFrame(() => resize());
    let settledInnerFrame;
    const settledLayoutFrame = requestAnimationFrame(() => { settledInnerFrame = requestAnimationFrame(() => resize()); });
    const shortLayoutTimer = window.setTimeout(resize, 120);
    const finalLayoutTimer = window.setTimeout(resize, 500);
    let frame;
    const animate = () => { controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(animate); };
    animate();
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(firstLayoutFrame);
      cancelAnimationFrame(settledLayoutFrame);
      if (settledInnerFrame) cancelAnimationFrame(settledInnerFrame);
      window.clearTimeout(shortLayoutTimer);
      window.clearTimeout(finalLayoutTimer);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      window.visualViewport?.removeEventListener('resize', resize);
      controls.removeEventListener('end', rememberUserZoom);
      controls.dispose(); disposeTree(group);
      pmrem.dispose(); renderer.dispose(); renderer.domElement.remove(); rendererRef.current = null;
    };
  }, [lid, rendererRef]);

  useEffect(() => {
    const scene = sceneRef.current; const group = groupRef.current;
    if (!scene || !group) return;
    while (group.children.length) { const child = group.children.pop(); disposeTree(child); }

    scene.background = null;
    const shadowCatcher = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.ShadowMaterial({ color: 0x18202a, transparent: true, opacity: .16 }),
    );
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.y = -42.7;
    shadowCatcher.receiveShadow = true;
    group.add(shadowCatcher);

    const materialSettings = {
      frosted: { color: 0xcbd2d0, roughness: .46, transmission: .52, opacity: 1, thickness: 2.1 },
      clear: { color: 0xe9f1f1, roughness: .08, transmission: .88, opacity: .65, thickness: 2.2 },
      amber: { color: 0x743314, roughness: .2, transmission: .42, opacity: .9, thickness: 3.5 },
      black: { color: 0x0a0909, roughness: .2, transmission: .03, opacity: 1, thickness: 3.5 },
    }[finish];
    const frostTexture = finish === 'frosted' ? createFrostTexture() : null;
    const glass = new THREE.MeshPhysicalMaterial({
      ...materialSettings, transparent: true, metalness: 0, ior: 1.5, clearcoat: finish === 'frosted' ? .11 : .42,
      clearcoatRoughness: finish === 'frosted' ? .43 : .2, side: THREE.FrontSide, attenuationColor: materialSettings.color,
      attenuationDistance: finish === 'frosted' ? 42 : 28, depthWrite: materialSettings.opacity > .8,
      roughnessMap: frostTexture,
      bumpMap: frostTexture,
      bumpScale: finish === 'frosted' ? .055 : 0,
    });

    // One continuous closed glass profile. The outer wall, thin rolled lip,
    // inner wall and heavy base are part of the same optical object so light
    // refracts through the rim and bottom like a real molded candle jar.
    const profile = [
      new THREE.Vector2(0, -42),
      new THREE.Vector2(31.5, -42),
      new THREE.Vector2(33.35, -41.35),
      new THREE.Vector2(34.55, -39.45),
      new THREE.Vector2(34.95, -37.1),
      new THREE.Vector2(35, -34),
      new THREE.Vector2(35, 38.9),
      new THREE.Vector2(34.82, 40.45),
      new THREE.Vector2(34.15, 41.55),
      new THREE.Vector2(33.35, 42),
      new THREE.Vector2(32.92, 41.75),
      new THREE.Vector2(32.72, 40.75),
      new THREE.Vector2(32.68, 39.2),
      new THREE.Vector2(32.68, -34.4),
      new THREE.Vector2(31.55, -36.3),
      new THREE.Vector2(0, -36.3),
      new THREE.Vector2(0, -42),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 192), glass);
    body.castShadow = true; body.receiveShadow = true; group.add(body);
    const rimHighlight = new THREE.Mesh(
      new THREE.TorusGeometry(33.3, .38, 16, 192),
      new THREE.MeshPhysicalMaterial({
        color: finish === 'amber' ? 0x8d4b27 : finish === 'black' ? 0x252321 : finish === 'frosted' ? 0xd5dcda : 0xf6f7f5,
        roughness: finish === 'frosted' ? .2 : .08,
        transmission: finish === 'frosted' ? .72 : finish === 'black' ? .05 : .7,
        transparent: true,
        opacity: finish === 'frosted' ? .72 : finish === 'black' ? .8 : .68,
        thickness: 1,
        ior: 1.5,
      }),
    );
    rimHighlight.rotation.x = Math.PI / 2;
    rimHighlight.position.y = 41.5;
    rimHighlight.castShadow = true;
    group.add(rimHighlight);
    const waxLevel = 31.2;
    const waxBottom = -35.9;
    const waxMaterial = new THREE.MeshPhysicalMaterial({ color: 0xf2ede3, roughness: .76, metalness: 0, clearcoat: .045, clearcoatRoughness: .82 });
    const waxFillMaterial = new THREE.MeshPhysicalMaterial({ color: 0xe8e1d5, roughness: .88, metalness: 0, transmission: .015, thickness: 8 });
    const waxFillHeight = waxLevel - waxBottom;
    const waxFill = new THREE.Mesh(new THREE.CylinderGeometry(32.38, 31.9, waxFillHeight, 160), waxFillMaterial);
    waxFill.position.y = waxBottom + waxFillHeight / 2;
    waxFill.castShadow = true;
    waxFill.receiveShadow = true;
    group.add(waxFill);
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(32.38, 32.38, .65, 160), waxMaterial);
    wax.position.y = waxLevel - .325;
    wax.receiveShadow = true;
    group.add(wax);
    const waxMeniscus = new THREE.Mesh(
      new THREE.TorusGeometry(32.08, .28, 12, 160),
      new THREE.MeshStandardMaterial({ color: 0xe4dccf, roughness: .85 }),
    );
    waxMeniscus.rotation.x = Math.PI / 2;
    waxMeniscus.position.y = waxLevel - .02;
    group.add(waxMeniscus);

    // White pre-waxed cotton wick, built from multiple fine twisted strands.
    const wickPoints = [
      new THREE.Vector3(0, waxLevel - .05, 0),
      new THREE.Vector3(.04, waxLevel + 3.1, -.03),
      new THREE.Vector3(-.08, waxLevel + 6.4, .05),
      new THREE.Vector3(.06, waxLevel + 9.5, 0),
    ];
    const wickCurve = new THREE.CatmullRomCurve3(wickPoints);
    const cottonWick = new THREE.Mesh(
      new THREE.TubeGeometry(wickCurve, 28, .4, 9, false),
      new THREE.MeshStandardMaterial({ color: 0xeee9df, roughness: 1, metalness: 0 }),
    );
    cottonWick.castShadow = true;
    group.add(cottonWick);
    const strandColors = [0xffffff, 0xd8d0c4, 0xf5f1e8];
    [[.27, 0], [-.14, .23], [-.14, -.23]].forEach(([x, z], index) => {
      const strandCurve = new THREE.CatmullRomCurve3(wickPoints.map((point, pointIndex) => new THREE.Vector3(
        point.x + x * (1 - pointIndex * .08),
        point.y,
        point.z + z * (1 - pointIndex * .08),
      )));
      const strand = new THREE.Mesh(
        new THREE.TubeGeometry(strandCurve, 24, .105, 6, false),
        new THREE.MeshStandardMaterial({ color: strandColors[index], roughness: 1 }),
      );
      group.add(strand);
    });

    if (labelSource) {
      const texture = new THREE.CanvasTexture(labelSource);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      const arc = Math.min(labelWidth / (Math.PI * DIAMETER) * Math.PI * 2, 2.9);
      const geometry = new THREE.CylinderGeometry(35.32, 35.32, labelHeight, 160, 1, true, -arc / 2, arc);
      const paper = new THREE.MeshBasicMaterial({
        map: texture,
        color: 0xffffff,
        side: THREE.DoubleSide,
        toneMapped: false,
        transparent: true,
        alphaTest: .001,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      });
      const label = new THREE.Mesh(geometry, paper);
      const top = Math.max(2, Math.min(labelTop, HEIGHT - labelHeight - 2));
      label.position.y = HEIGHT / 2 - top - labelHeight / 2;
      label.rotation.y = THREE.MathUtils.degToRad(labelRotation);
      label.castShadow = true; group.add(label);
    }

    if (lid !== 'none') {
      let lidMaterials;
      if (lid === 'wood') {
        const sideMap = createWoodTexture(1024, 256, true);
        const topMap = createWoodTexture(1024, 1024);
        const sideMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, map: sideMap, roughness: .72, metalness: 0 });
        const topMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, map: topMap, roughness: .76, metalness: 0 });
        lidMaterials = [sideMaterial, topMaterial, sideMaterial.clone()];
      } else {
        const material = lid === 'gold'
          ? new THREE.MeshPhysicalMaterial({ color: 0xb99155, metalness: .82, roughness: .18, clearcoat: .7 })
          : new THREE.MeshPhysicalMaterial({ color: 0x11100f, metalness: .52, roughness: .22, clearcoat: .65 });
        lidMaterials = [material, material.clone(), material.clone()];
      }

      // The pine lid has a softly rounded 70 mm disc and a silicone gasket
      // inserted inside the glass neck, as on the real candle jar.
      const isWoodLid = lid === 'wood';
      const capHeight = isWoodLid ? 5.8 : 4.8;
      const capY = isWoodLid ? 43.6 : 43.05;
      const capGeometry = isWoodLid
        ? new THREE.CylinderGeometry(35, 35.35, capHeight, 192, 3)
        : new THREE.CylinderGeometry(35.3, 35.3, capHeight, 192, 2);
      const cap = new THREE.Mesh(capGeometry, lidMaterials);
      cap.position.y = capY;
      cap.castShadow = true;
      cap.receiveShadow = true;
      group.add(cap);
      const edgeMaterial = lidMaterials[0].clone();
      const topEdge = new THREE.Mesh(new THREE.TorusGeometry(isWoodLid ? 34.65 : 34.92, isWoodLid ? .46 : .34, 14, 192), edgeMaterial);
      topEdge.rotation.x = Math.PI / 2;
      topEdge.position.y = isWoodLid ? 46.32 : 45.35;
      topEdge.castShadow = true;
      group.add(topEdge);
      const lowerEdge = new THREE.Mesh(new THREE.TorusGeometry(isWoodLid ? 35.02 : 34.9, isWoodLid ? .32 : .25, 12, 192), edgeMaterial.clone());
      lowerEdge.rotation.x = Math.PI / 2;
      lowerEdge.position.y = isWoodLid ? 40.82 : 40.75;
      group.add(lowerEdge);
      if (isWoodLid) {
        const gasketMaterial = new THREE.MeshPhysicalMaterial({
          color: 0xb89467,
          roughness: .72,
          metalness: 0,
          transparent: true,
          opacity: .58,
          transmission: .08,
          thickness: 1.2,
          depthWrite: false,
        });
        const gasket = new THREE.Mesh(new THREE.CylinderGeometry(32.95, 32.72, 2.8, 192, 1, true), gasketMaterial);
        gasket.position.y = 39.48;
        gasket.castShadow = true;
        group.add(gasket);
        const gasketLip = new THREE.Mesh(new THREE.TorusGeometry(32.72, .42, 12, 192), gasketMaterial.clone());
        gasketLip.rotation.x = Math.PI / 2;
        gasketLip.position.y = 38.2;
        group.add(gasketLip);
        const sealShadow = new THREE.Mesh(
          new THREE.TorusGeometry(33.05, .26, 10, 192),
          new THREE.MeshStandardMaterial({ color: 0x79573c, roughness: 1, transparent: true, opacity: .3 }),
        );
        sealShadow.rotation.x = Math.PI / 2;
        sealShadow.position.y = 40.72;
        group.add(sealShadow);
      }
    }
  }, [finish, labelHeight, labelRotation, labelSource, labelTop, labelWidth, lid]);

  return <div ref={hostRef} className={`h-full w-full cursor-grab touch-none active:cursor-grabbing ${compact ? 'min-h-0' : 'min-h-[540px] sm:min-h-[700px]'}`} />;
}

export default function LabelMockupStudio() {
  const rendererRef = useRef(null);
  const [labelSource, setLabelSource] = useState(() => createSampleLabel());
  const [fileName, setFileName] = useState('Tem mẫu Candlet');
  const [finish, setFinish] = useState('frosted');
  const [lid, setLid] = useState('none');
  const [labelWidth, setLabelWidth] = useState(52);
  const [labelHeight, setLabelHeight] = useState(42);
  const [labelTop, setLabelTop] = useState(23);
  const [labelRotation, setLabelRotation] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [shareItems, setShareItems] = useState([]);
  const [sharesLoading, setSharesLoading] = useState(true);
  const [deletingShareId, setDeletingShareId] = useState('');

  const loadShares = useCallback(async () => {
    try {
      const response = await mockupService.listShares();
      setShareItems(response.data?.data || []);
    } catch (listError) {
      setShareError(listError.response?.data?.message || 'Không thể tải danh sách link chia sẻ');
    } finally {
      setSharesLoading(false);
    }
  }, []);

  useEffect(() => { loadShares(); }, [loadShares]);

  const handleFile = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    setLoading(true); setError('');
    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const [{ getDocument, GlobalWorkerOptions }, { default: worker }] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
        GlobalWorkerOptions.workerSrc = worker;
        const pdf = await getDocument({ data: await file.arrayBuffer() }).promise;
        const page = await pdf.getPage(1); const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(3, 1800 / Math.max(base.width, base.height)) });
        const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise; setLabelSource(canvas);
      } else if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file); const image = new Image();
        await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
        setLabelSource(image); URL.revokeObjectURL(url);
      } else throw new Error('Chỉ hỗ trợ PNG, JPG, WEBP hoặc PDF.');
      setFileName(file.name);
    } catch (uploadError) { setError(uploadError.message || 'Không thể đọc file tem.'); }
    finally { setLoading(false); event.target.value = ''; }
  };

  const exportImage = () => {
    const canvas = rendererRef.current?.domElement; if (!canvas) return;
    const link = document.createElement('a'); link.download = `mockup-coc-nen-${Date.now()}.png`; link.href = canvas.toDataURL('image/png', 1); link.click();
  };

  const createShareLink = async () => {
    if (!labelSource || shareLoading) return;
    setShareLoading(true);
    setShareError('');
    try {
      const width = labelSource.naturalWidth || labelSource.width;
      const height = labelSource.naturalHeight || labelSource.height;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(labelSource, 0, 0, width, height);
      const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('Không thể xử lý ảnh tem'))), 'image/png', .96));
      const safeName = String(fileName || 'tem-custom').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 80) || 'tem-custom';
      const upload = await uploadService.uploadProductImage(new File([blob], `${safeName}.png`, { type: 'image/png' }));
      const labelUrl = upload.data?.data?.url || upload.data?.data?.path;
      if (!labelUrl) throw new Error('Không nhận được đường dẫn ảnh tem');
      const response = await mockupService.createShare({
        label_url: labelUrl,
        label_file_name: fileName,
        finish,
        lid,
        label_width: labelWidth,
        label_height: labelHeight,
        label_top: labelTop,
        label_rotation: labelRotation,
      });
      const token = response.data?.data?.token;
      if (!token) throw new Error('Không tạo được mã chia sẻ');
      setShareUrl(`${window.location.origin}/mockup/${token}`);
      await loadShares();
    } catch (shareRequestError) {
      setShareError(shareRequestError.response?.data?.message || shareRequestError.message || 'Không thể tạo link chia sẻ');
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
  };

  const deleteShare = async (share) => {
    if (!window.confirm(`Xoá link “${share.label_file_name}”? Ảnh tem trên Cloudinary cũng sẽ bị xoá vĩnh viễn.`)) return;
    setDeletingShareId(share._id);
    setShareError('');
    try {
      await mockupService.deleteShare(share._id);
      if (shareUrl.endsWith(`/mockup/${share.token}`)) setShareUrl('');
      await loadShares();
    } catch (deleteError) {
      setShareError(deleteError.response?.data?.message || 'Không thể xoá link chia sẻ');
    } finally {
      setDeletingShareId('');
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-lg shadow-slate-900/15"><span className="material-symbols-outlined text-[28px]">view_in_ar</span></span>
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2"><h1 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Studio mockup tem cốc</h1><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">3D trực tiếp</span></div>
                <p className="text-sm text-slate-500">Cốc kính mờ <strong className="font-bold text-slate-700">Ø70 × 84 mm</strong> · Tem giữ nguyên màu sRGB từ file gốc</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button onClick={exportImage} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200"><span className="material-symbols-outlined text-[19px]">download</span>Xuất PNG</button>
              <button onClick={createShareLink} disabled={shareLoading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"><span className="material-symbols-outlined text-[19px]">share</span>{shareLoading ? 'Đang tạo…' : 'Chia sẻ 3D'}</button>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-200 border-t border-slate-100 bg-slate-50/80">
            <div className="px-4 py-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tem hiện tại</p><p className="mt-1 truncate text-xs font-extrabold text-slate-700">{fileName}</p></div>
            <div className="px-4 py-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kích thước</p><p className="mt-1 text-xs font-extrabold text-slate-700">{labelWidth} × {labelHeight} mm</p></div>
            <div className="px-4 py-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Đầu ra</p><p className="mt-1 text-xs font-extrabold text-slate-700">PNG trong suốt</p></div>
          </div>
        </header>
        {shareUrl && (
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm sm:flex-row sm:items-center">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white"><span className="material-symbols-outlined">link</span></span>
            <div className="min-w-0 flex-1"><p className="text-sm font-extrabold text-emerald-950">Link xem 3D đã sẵn sàng</p><p className="mt-0.5 truncate text-xs text-emerald-700">{shareUrl}</p></div>
            <div className="grid grid-cols-2 gap-2"><button type="button" onClick={copyShareLink} className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">Sao chép</button><a href={shareUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-700 px-3.5 py-2 text-center text-xs font-bold text-white hover:bg-emerald-800">Xem thử</a></div>
          </div>
        )}
        {shareError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{shareError}</div>}
        <div className="grid items-start gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="order-2 space-y-4 xl:order-1">
            <Panel step="01" title="Tải thiết kế tem" subtitle="PNG, JPG, WEBP hoặc trang đầu PDF" icon="upload_file">
              <label className="group flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-center transition hover:border-blue-300 hover:bg-blue-50/50">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200 transition group-hover:scale-105"><span className="material-symbols-outlined">add_photo_alternate</span></span>
                <span className="mt-3 max-w-full truncate text-sm font-extrabold text-slate-800">{loading ? 'Đang xử lý file…' : fileName}</span>
                <span className="mt-1 text-xs text-slate-400">Bấm để chọn hoặc thay file tem</span>
                <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf,.pdf" onChange={handleFile} className="hidden" />
              </label>
              {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
            </Panel>
            <Panel step="02" title="Kích thước & vị trí" subtitle="Đơn vị theo kích thước in thực tế" icon="straighten">
              <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
                {[[40, 30], [50, 40], [60, 45]].map(([width, height]) => (
                  <button key={`${width}-${height}`} type="button" onClick={() => { setLabelWidth(width); setLabelHeight(height); }} className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold ring-1 transition ${labelWidth === width && labelHeight === height ? 'bg-blue-600 text-white ring-blue-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-blue-300'}`}>{width} × {height}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3"><NumberField label="Rộng tem" value={labelWidth} setValue={setLabelWidth} min={10} max={100} suffix="mm" /><NumberField label="Cao tem" value={labelHeight} setValue={setLabelHeight} min={10} max={80} suffix="mm" /><NumberField label="Cách miệng" value={labelTop} setValue={setLabelTop} min={2} max={70} suffix="mm" /><NumberField label="Xoay tem" value={labelRotation} setValue={setLabelRotation} min={-90} max={90} suffix="°" /></div>
              <div className="mt-4 rounded-xl bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between text-[11px] font-bold"><span className="text-slate-500">Xoay quanh thân cốc</span><span className="text-blue-700">{labelRotation}°</span></div><input type="range" min="-90" max="90" value={labelRotation} onChange={(event) => setLabelRotation(Number(event.target.value))} className="w-full accent-blue-600" /></div>
            </Panel>
            <Panel step="03" title="Hoàn thiện sản phẩm" subtitle="Chọn vật liệu cốc và loại nắp" icon="tune">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Vật liệu cốc</p>
              <div className="grid grid-cols-2 gap-2">{finishOptions.map((item) => <Choice key={item.id} active={finish === item.id} onClick={() => setFinish(item.id)}><span className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: item.color }} />{item.name}</Choice>)}</div>
              <p className="mb-2 mt-5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Nắp cốc</p><div className="grid grid-cols-2 gap-2">{lidOptions.map((item) => <Choice key={item.id} active={lid === item.id} onClick={() => setLid(item.id)}>{item.name}</Choice>)}</div>
            </Panel>
          </aside>
          <section className="order-1 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm xl:sticky xl:top-4 xl:order-2">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5"><div className="min-w-0"><p className="text-sm font-extrabold text-slate-900">Bản xem trước</p><p className="mt-0.5 truncate text-xs text-slate-400">Màu tem được giữ nguyên theo file gốc</p></div><div className="flex items-center gap-2"><span className="hidden rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 sm:inline">Ø70 × 84 mm</span><span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Đang hiển thị</span></div></div>
            <div className="relative overflow-hidden bg-[#91969a]"><MockupViewport {...{ labelSource, labelWidth, labelHeight, labelTop, labelRotation, finish, lid, rendererRef }} /><div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-white/85 px-3.5 py-2 text-[10px] font-bold text-slate-600 shadow-lg backdrop-blur"><span className="material-symbols-outlined text-[15px]">360</span>Kéo xoay · Cuộn phóng to</div><span className="pointer-events-none absolute left-4 top-4 rounded-lg bg-slate-900/70 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur">Nền xuất trong suốt</span></div>
          </section>
        </div>
        <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><span className="material-symbols-outlined">link</span></span><div><h2 className="text-sm font-extrabold text-slate-900">Link đang chia sẻ</h2><p className="mt-0.5 text-xs text-slate-500">Quản lý các bản xem 3D đã gửi khách.</p></div></div>
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{shareItems.length} link</span>
          </div>
          {sharesLoading ? (
            <div className="p-8 text-center text-sm font-semibold text-slate-400">Đang tải danh sách…</div>
          ) : shareItems.length === 0 ? (
            <div className="p-8 text-center"><span className="material-symbols-outlined text-4xl text-slate-200">link_off</span><p className="mt-2 text-sm font-semibold text-slate-400">Chưa có link mockup nào</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {shareItems.map((share) => {
                const url = `${window.location.origin}/mockup/${share.token}`;
                return (
                  <div key={share._id} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-center">
                    <img src={share.label_url} alt="" className="h-14 w-16 shrink-0 rounded-xl border border-slate-200 bg-white object-contain shadow-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{share.label_file_name}</p>
                      <p className="mt-1 truncate text-xs text-slate-400">{url}</p>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500"><span>{share.label_width} × {share.label_height} mm</span><span>{share.view_count || 0} lượt xem</span><span>{new Date(share.createdAt).toLocaleDateString('vi-VN')}</span></div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => navigator.clipboard.writeText(url)} className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100">Sao chép</button>
                      <a href={url} target="_blank" rel="noreferrer" className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100">Mở</a>
                      <button type="button" disabled={deletingShareId === share._id} onClick={() => deleteShare(share)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-100 disabled:cursor-wait disabled:opacity-50">{deletingShareId === share._id ? 'Đang xoá…' : 'Xoá'}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function Panel({ step, title, subtitle, icon, children }) {
  return <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center gap-3">{icon && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100"><span className="material-symbols-outlined text-[20px]">{icon}</span></span>}<div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-extrabold text-slate-900">{title}</h2>{step && <span className="text-[10px] font-black tracking-widest text-slate-300">{step}</span>}</div>{subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}</div></div><div className="mt-4">{children}</div></section>;
}
function Choice({ active, onClick, children }) {
  return <button type="button" onClick={onClick} className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ring-1 transition ${active ? 'bg-blue-600 text-white ring-blue-600 shadow-sm shadow-blue-600/20' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:ring-blue-300'}`}>{children}</button>;
}
function NumberField({ label, value, setValue, min, max, suffix }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  const commit = () => {
    const parsed = Number(String(draft).replace(',', '.'));
    if (!Number.isFinite(parsed)) { setDraft(String(value)); return; }
    const next = Math.max(min, Math.min(max, Math.round(parsed * 10) / 10));
    setValue(next);
    setDraft(String(next));
  };
  const adjust = (amount) => {
    const next = Math.max(min, Math.min(max, Math.round((Number(value) + amount) * 10) / 10));
    setValue(next);
    setDraft(String(next));
  };
  return (
    <label>
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="flex h-11 items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-amber-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-100">
        <button type="button" onClick={() => adjust(-1)} className="grid h-full w-9 shrink-0 place-items-center border-r border-slate-200 text-lg font-medium text-slate-400 transition hover:bg-white hover:text-slate-800" aria-label={`Giảm ${label}`}>−</button>
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(event) => setDraft(event.target.value.replace(/[^0-9.,-]/g, ''))}
          onFocus={(event) => event.target.select()}
          onBlur={commit}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
          className="min-w-0 flex-1 bg-transparent px-2 text-center text-sm font-extrabold text-slate-800 outline-none"
          aria-label={label}
        />
        <span className="shrink-0 text-[11px] font-bold text-slate-400">{suffix}</span>
        <button type="button" onClick={() => adjust(1)} className="ml-2 grid h-full w-9 shrink-0 place-items-center border-l border-slate-200 text-lg font-medium text-slate-400 transition hover:bg-white hover:text-slate-800" aria-label={`Tăng ${label}`}>+</button>
      </span>
    </label>
  );
}
