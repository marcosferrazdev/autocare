'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { PartModel } from '@/lib/parts';

/*
 * Peças desenhadas com primitivas do three.js: não dependem de arquivo de modelo,
 * então qualquer peça do catálogo tem uma representação na hora.
 */

type Mats = {
  accent: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  light: THREE.MeshStandardMaterial;
};

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, setup?: (m: THREE.Mesh) => void) {
  const m = new THREE.Mesh(geometry, material);
  setup?.(m);
  return m;
}

function lathe(points: [number, number][], material: THREE.Material, segments = 64) {
  return mesh(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments), material);
}

const builders: Record<PartModel, (m: Mats) => THREE.Group> = {
  oil: (m) => {
    const g = new THREE.Group();
    g.add(lathe([[0, -1], [0.62, -1], [0.7, -0.92], [0.7, 0.55], [0.5, 0.82], [0.24, 0.9], [0.24, 1.05], [0, 1.05]], m.accent));
    g.add(mesh(new THREE.CylinderGeometry(0.712, 0.712, 0.75, 64, 1, true), m.light, (x) => (x.position.y = -0.15)));
    g.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.26, 32), m.dark, (x) => (x.position.y = 1.15)));
    return g;
  },
  filter: (m) => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.4, 64), m.accent));
    for (let i = 0; i < 7; i++) {
      g.add(mesh(new THREE.TorusGeometry(0.76, 0.025, 8, 64), m.accent, (x) => {
        x.rotation.x = Math.PI / 2;
        x.position.y = -0.5 + i * 0.16;
      }));
    }
    g.add(mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.1, 64), m.metal, (x) => (x.position.y = 0.75)));
    g.add(mesh(new THREE.TorusGeometry(0.55, 0.06, 12, 48), m.rubber, (x) => {
      x.rotation.x = Math.PI / 2;
      x.position.y = 0.82;
    }));
    g.add(mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 32), m.dark, (x) => (x.position.y = 0.8)));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.13, 16), m.dark, (x) => x.position.set(Math.cos(a) * 0.36, 0.8, Math.sin(a) * 0.36)));
    }
    return g;
  },
  airFilter: (m) => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(2.2, 0.2, 1.4), m.accent, (x) => (x.position.y = -0.05)));
    for (let i = 0; i < 22; i++) {
      g.add(mesh(new THREE.BoxGeometry(0.035, 0.36, 1.3), m.light, (x) => {
        x.position.set(-1 + i * 0.095, 0.16, 0);
        x.rotation.z = i % 2 === 0 ? 0.28 : -0.28;
      }));
    }
    return g;
  },
  brake: (m) => {
    const g = new THREE.Group();
    const disc = new THREE.Group();
    disc.add(mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.14, 72), m.metal));
    disc.add(mesh(new THREE.CylinderGeometry(0.52, 0.56, 0.4, 48), m.metal, (x) => (x.position.y = 0.2)));
    disc.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 32), m.dark, (x) => (x.position.y = 0.21)));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      disc.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 16), m.dark, (x) => x.position.set(Math.cos(a) * 0.36, 0.21, Math.sin(a) * 0.36)));
    }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      disc.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12), m.dark, (x) => x.position.set(Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85)));
    }
    disc.rotation.x = Math.PI / 2;
    g.add(disc);
    // pinça abraçando a borda do disco
    g.add(mesh(new THREE.TorusGeometry(1.0, 0.2, 16, 32, Math.PI / 2.6), m.accent, (x) => {
      x.rotation.z = Math.PI / 3.2;
      x.scale.z = 1.6;
    }));
    return g;
  },
  tire: (m) => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.TorusGeometry(1, 0.4, 32, 96), m.rubber));
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      g.add(mesh(new THREE.BoxGeometry(0.07, 0.12, 0.7), m.rubber, (x) => {
        x.position.set(Math.cos(a) * 1.37, Math.sin(a) * 1.37, 0);
        x.rotation.z = a;
      }));
    }
    g.add(mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.5, 64, 1, true), m.metal, (x) => (x.rotation.x = Math.PI / 2)));
    for (let i = 0; i < 5; i++) {
      g.add(mesh(new THREE.BoxGeometry(0.16, 0.66, 0.08), m.metal, (x) => {
        x.rotation.z = (i / 5) * Math.PI * 2;
        x.translateY(0.38);
        x.position.z = 0.12;
      }));
    }
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 32), m.accent, (x) => {
      x.rotation.x = Math.PI / 2;
      x.position.z = 0.1;
    }));
    return g;
  },
  shock: (m) => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.3, 32), m.accent, (x) => (x.position.y = -0.45)));
    g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 16), m.metal, (x) => (x.position.y = 0.6)));
    // mola: hélice de 7 voltas ao redor do corpo
    const helix = new THREE.CatmullRomCurve3(
      Array.from({ length: 141 }, (_, i) => {
        const t = i / 140;
        const a = t * Math.PI * 2 * 7;
        return new THREE.Vector3(Math.cos(a) * 0.42, -0.9 + t * 2, Math.sin(a) * 0.42);
      })
    );
    g.add(mesh(new THREE.TubeGeometry(helix, 400, 0.05, 10, false), m.dark));
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 48), m.metal, (x) => (x.position.y = 1.08)));
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 48), m.metal, (x) => (x.position.y = -0.92)));
    g.add(mesh(new THREE.TorusGeometry(0.16, 0.06, 12, 32), m.metal, (x) => (x.position.y = 1.32)));
    g.add(mesh(new THREE.TorusGeometry(0.16, 0.06, 12, 32), m.metal, (x) => (x.position.y = -1.22)));
    return g;
  },
  battery: (m) => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(1.9, 1.1, 1.1), m.dark));
    g.add(mesh(new THREE.BoxGeometry(1.94, 0.16, 1.14), m.accent, (x) => (x.position.y = 0.6)));
    g.add(mesh(new THREE.BoxGeometry(1.2, 0.5, 0.02), m.light, (x) => x.position.set(0, -0.05, 0.56)));
    const red = new THREE.MeshStandardMaterial({ color: '#d0452c', roughness: 0.4 });
    g.add(mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.22, 24), red, (x) => x.position.set(-0.6, 0.78, 0.2)));
    g.add(mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.22, 24), m.dark, (x) => x.position.set(0.6, 0.78, 0.2)));
    return g;
  },
  sparkPlug: (m) => {
    const g = new THREE.Group();
    g.add(lathe([[0, 1.2], [0.12, 1.2], [0.12, 1.05], [0.2, 1.0], [0.24, 0.55], [0.28, 0.35], [0.3, 0.3], [0, 0.3]], m.light));
    g.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.32, 6), m.metal, (x) => (x.position.y = 0.12)));
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.62, 32), m.metal, (x) => (x.position.y = -0.36)));
    for (let i = 0; i < 9; i++) {
      g.add(mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 32), m.metal, (x) => {
        x.rotation.x = Math.PI / 2;
        x.position.y = -0.62 + i * 0.065;
      }));
    }
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 12), m.metal, (x) => (x.position.y = -0.76)));
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.04, 0.05), m.metal, (x) => x.position.set(0.05, -0.86, 0)));
    g.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 24), m.accent, (x) => (x.position.y = 1.25)));
    return g;
  },
  bulb: (m) => {
    const g = new THREE.Group();
    const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, transmission: 0.9, thickness: 0.4, transparent: true, opacity: 0.55 });
    g.add(lathe([[0, 1.1], [0.42, 1.02], [0.62, 0.7], [0.6, 0.35], [0.34, 0.0], [0.3, -0.2], [0, -0.2]], glass));
    g.add(mesh(new THREE.CylinderGeometry(0.31, 0.27, 0.6, 32), m.metal, (x) => (x.position.y = -0.5)));
    for (let i = 0; i < 4; i++) {
      g.add(mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 32), m.metal, (x) => {
        x.rotation.x = Math.PI / 2;
        x.position.y = -0.3 - i * 0.14;
      }));
    }
    g.add(mesh(new THREE.SphereGeometry(0.1, 16, 16), m.accent, (x) => (x.position.y = 0.5)));
    return g;
  },
  radiator: (m) => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(2.2, 0.22, 0.5), m.accent, (x) => (x.position.y = 0.72)));
    g.add(mesh(new THREE.BoxGeometry(2.2, 0.22, 0.5), m.accent, (x) => (x.position.y = -0.72)));
    for (let i = 0; i < 26; i++) {
      g.add(mesh(new THREE.BoxGeometry(0.03, 1.24, 0.34), m.metal, (x) => (x.position.x = -1.0 + i * 0.08)));
    }
    g.add(mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 24), m.dark, (x) => x.position.set(0.8, 0.9, 0)));
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 16), m.rubber, (x) => {
      x.rotation.z = Math.PI / 2;
      x.position.set(-1.25, 0.72, 0);
    }));
    return g;
  },
  belt: (m) => {
    const g = new THREE.Group();
    const pulley = (x: number, y: number, r: number) =>
      g.add(mesh(new THREE.CylinderGeometry(r, r, 0.32, 48), m.metal, (p) => {
        p.rotation.x = Math.PI / 2;
        p.position.set(x, y, 0);
      }));
    pulley(-0.7, 0.55, 0.45);
    pulley(0.75, -0.5, 0.32);
    pulley(0.6, 0.75, 0.22);
    const path = new THREE.CatmullRomCurve3(
      [
        [-0.7, 1.05], [0.1, 1.02], [0.6, 1.0], [0.85, 0.75], [1.1, -0.45], [0.75, -0.85], [0.2, -0.6], [-0.75, 0.06], [-1.16, 0.5], [-1.05, 0.92],
      ].map(([x, y]) => new THREE.Vector3(x, y, 0)),
      true,
      'catmullrom',
      0.4
    );
    g.add(mesh(new THREE.TubeGeometry(path, 300, 0.07, 12, true), m.rubber, (b) => (b.scale.z = 2.2)));
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.36, 24), m.accent, (p) => {
      p.rotation.x = Math.PI / 2;
      p.position.set(-0.7, 0.55, 0.02);
    }));
    return g;
  },
  gear: (m) => {
    const g = new THREE.Group();
    const shape = new THREE.Shape();
    const teeth = 14;
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? 1.05 : 0.86;
      const a2 = a + Math.PI / (teeth * 2);
      if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      shape.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
    }
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.3, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    g.add(mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2 }), m.metal, (x) => (x.position.z = -0.16)));
    g.add(mesh(new THREE.TorusGeometry(0.42, 0.05, 12, 48), m.accent, (x) => (x.position.z = 0.22)));
    return g;
  },
};

export default function PartViewer3D({ model, color }: { model: PartModel; color: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    const key = new THREE.DirectionalLight('#ffffff', 1.4);
    key.position.set(3, 4, 5);
    scene.add(key, new THREE.AmbientLight('#ffffff', 0.35));

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    // distância cabe a esfera da peça (raio 1,6) no campo vertical de 35°
    camera.position.set(3.0, 2.1, 4.3);

    const mats: Mats = {
      accent: new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.4 }),
      metal: new THREE.MeshStandardMaterial({ color: '#c3c9d0', metalness: 0.95, roughness: 0.28 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2f36', metalness: 0.4, roughness: 0.5 }),
      rubber: new THREE.MeshStandardMaterial({ color: '#1b1e22', metalness: 0, roughness: 0.92 }),
      light: new THREE.MeshStandardMaterial({ color: '#f1f3f5', metalness: 0, roughness: 0.55 }),
    };

    // Centraliza e ajusta a peça para caber no mesmo tamanho, seja qual for o modelo
    const part = builders[model](mats);
    const box = new THREE.Box3().setFromObject(part);
    const size = box.getSize(new THREE.Vector3()).length();
    part.position.sub(box.getCenter(new THREE.Vector3()));
    const pivot = new THREE.Group();
    pivot.add(part);
    pivot.scale.setScalar(3.2 / size);
    scene.add(pivot);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 9;
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 1.6;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    // Entrada: a peça cresce girando até o lugar
    const start = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      const t = reduced ? 1 : Math.min(1, (now - start) / 1100);
      const eased = 1 - Math.pow(1 - t, 4);
      pivot.rotation.y = (1 - eased) * -Math.PI * 1.2;
      pivot.scale.setScalar((3.2 / size) * (0.55 + 0.45 * eased));
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach((mat) => mat.dispose());
        }
      });
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [model, color]);

  return <div ref={hostRef} className="h-full w-full cursor-grab active:cursor-grabbing" aria-label="Peça em 3D: arraste para girar" role="img" />;
}
