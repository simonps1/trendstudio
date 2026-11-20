import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { ease, progress, rng } from "../../core/anim";
import { T } from "./timeline";

/**
 * Accretion-disk black hole. All motion is computed in shaders from a time
 * uniform, so every frame is deterministic and independent.
 */
const diskVertex = /* glsl */ `
  attribute float aRadius; attribute float aAngle; attribute float aSeed;
  uniform float uTime; uniform float uSize; uniform float uLensed; uniform vec3 uCamDir; uniform float uScale;
  varying float vHeat; varying float vAlpha;
  void main() {
    float omega = 1.6 * pow(aRadius / 1.6, -1.5);
    float a = aAngle + uTime * omega;
    vec3 p;
    if (uLensed > 0.5) {
      p = vec3(cos(a) * aRadius, sin(a) * aRadius, (aSeed - 0.5) * 0.04);
    } else {
      p = vec3(cos(a) * aRadius, (aSeed - 0.5) * 0.06 * aRadius, sin(a) * aRadius);
    }
    // relativistic beaming: material moving toward the camera is brighter
    vec3 vel = normalize(vec3(-sin(a), 0.0, cos(a)));
    float beam = uLensed > 0.5 ? 1.0 : 0.45 + 0.9 * max(0.0, dot(vel, -uCamDir));
    vHeat = clamp(1.0 - (aRadius - 1.6) / 4.4, 0.0, 1.0);
    vAlpha = beam * (0.6 + 0.4 * fract(aSeed * 91.7));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.6 + vHeat) * (10.0 / -mv.z) * uScale;
    gl_Position = projectionMatrix * mv;
  }`;
const diskFragment = /* glsl */ `
  uniform float uOpacity;
  varying float vHeat; varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    vec3 cold = vec3(0.85, 0.18, 0.05), warm = vec3(1.0, 0.55, 0.15), hot = vec3(1.0, 0.93, 0.8);
    vec3 col = mix(cold, warm, smoothstep(0.0, 0.5, vHeat));
    col = mix(col, hot, smoothstep(0.55, 1.0, vHeat));
    gl_FragColor = vec4(col * vAlpha * soft * 0.9 * uOpacity, 1.0);
  }`;
const ringFragment = /* glsl */ `
  uniform float uOpacity; uniform float uTime;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0; // 0 center .. 1 edge (plane is 4 units -> d*2 = radius)
    float r = d * 2.0;
    float ring = exp(-pow((r - 1.07) / 0.025, 2.0)) * 1.4;
    float glow = exp(-pow((r - 1.1) / 0.35, 2.0)) * 0.35;
    float flicker = 0.92 + 0.08 * sin(uTime * 7.0 + atan(vUv.y - 0.5, vUv.x - 0.5) * 5.0);
    vec3 col = vec3(1.0, 0.75, 0.45) * (ring + glow) * flicker;
    gl_FragColor = vec4(col, (ring + glow) * uOpacity);
  }`;
const ringVertex = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `;

function makeDisk(count: number, rMin: number, rMax: number, seed: number) {
  const r = rng(seed);
  const radius = new Float32Array(count), angle = new Float32Array(count), s = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    radius[i] = rMin + Math.pow(r(), 1.8) * (rMax - rMin);
    angle[i] = r() * Math.PI * 2;
    s[i] = r();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute("aRadius", new THREE.BufferAttribute(radius, 1));
  g.setAttribute("aAngle", new THREE.BufferAttribute(angle, 1));
  g.setAttribute("aSeed", new THREE.BufferAttribute(s, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), rMax * 1.5);
  return g;
}

export const BlackHole: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = frame / fps; // absolute composition time (component is not inside a Sequence)
  const local = t - T.blackHole;
  const opacity = progress(t, T.blackHole - 0.6, T.blackHole + 0.8) * (1 - progress(t, T.end - 3.0, T.end - 0.4));

  const diskGeo = useMemo(() => makeDisk(60000, 1.6, 6.0, 5), []);
  const haloGeo = useMemo(() => makeDisk(16000, 1.25, 2.6, 6), []);
  const diskMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: diskVertex, fragmentShader: diskFragment, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uScale: { value: 1 }, uTime: { value: 0 }, uSize: { value: 3.2 }, uLensed: { value: 0 }, uOpacity: { value: 1 }, uCamDir: { value: new THREE.Vector3() } },
  }), []);
  const haloMat = useMemo(() => {
    const m = diskMat.clone();
    m.uniforms.uLensed.value = 1; m.uniforms.uSize.value = 2.6;
    return m;
  }, [diskMat]);
  const ringMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: ringVertex, fragmentShader: ringFragment, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, uniforms: { uOpacity: { value: 1 }, uTime: { value: 0 } },
  }), []);

  // camera: slow orbit + push-in, then pull back for the ending
  const az = 0.5 + local * 0.06;
  const el = 0.16 + 0.05 * Math.sin(local * 0.4);
  const portrait = height > width;
  const dist = (portrait ? 11.5 : 8.5) - 2.2 * ease.outCubic(progress(t, T.blackHole, T.dust)) + 9 * ease.inCubic(progress(t, T.dust, T.end));
  const cam = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(dist);
  const camDir = cam.clone().negate().normalize();
  for (const m of [diskMat, haloMat]) {
    m.uniforms.uScale.value = Math.min(width, height) / 1080; m.uniforms.uTime.value = local; m.uniforms.uCamDir.value.copy(camDir);
  }
  haloMat.uniforms.uOpacity.value = 0.75;
  ringMat.uniforms.uTime.value = local;
  const billboard = new THREE.Euler(-el, az, 0, "YXZ");

  if (opacity <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity }}>
      <ThreeCanvas width={width} height={height} camera={{ fov: 40, position: [cam.x, cam.y, cam.z], near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: true }} onCreated={({ camera }) => camera.lookAt(0, 0, 0)}>
        <CameraRig pos={cam} />
        <group rotation={[0.18, 0, 0.1]}>
          <points geometry={diskGeo} material={diskMat} />
        </group>
        <group rotation={billboard}>
          <points geometry={haloGeo} material={haloMat} position={[0, 0, -0.4]} />
          <mesh material={ringMat}><planeGeometry args={[4, 4]} /></mesh>
        </group>
        <mesh renderOrder={-1}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

const CameraRig: React.FC<{ pos: THREE.Vector3 }> = ({ pos }) => {
  const camera = useThree((s) => s.camera);
  camera.position.copy(pos);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return null;
};
