import { Effect, EffectComposer, EffectPass, RenderPass } from "postprocessing";
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface PixelBlastProps {
  variant?: "square" | "circle";
  pixelSize?: number;
  color?: string;
  speed?: number;
  transparent?: boolean;
  edgeFade?: boolean;
  liquid?: boolean;
  liquidStrength?: number;
  pixelSizeJitter?: number;
  enableRipples?: boolean;
  rippleIntensityScale?: number;
  rippleThickness?: number;
  rippleSpeed?: number;
  liquidWobbleSpeed?: number;
  autoPauseOffscreen?: boolean;
  noiseAmount?: number;
  patternScale?: number;
  patternDensity?: number;
  antialias?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Build the fragment shader
function buildFragmentShader(variant: "square" | "circle"): string {
  const shapeTest =
    variant === "circle"
      ? "float d = length(local - 0.5); if (d > 0.5 * jitter) discard;"
      : "vec2 local_ = abs(local - 0.5); if (local_.x > 0.5 * jitter || local_.y > 0.5 * jitter) discard;";

  return `
    uniform vec3 uColor;
    uniform float uTime;
    uniform float uPixelSize;
    uniform float uAlpha;
    uniform float uSpeed;
    uniform bool uEdgeFade;
    uniform float uNoiseAmount;
    uniform float uPatternScale;
    uniform float uPatternDensity;
    uniform float uPixelSizeJitter;

    float hash(vec2 p) {
      p = fract(p * vec2(234.34, 435.345));
      p += dot(p, p + 34.23);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
      vec2 uv = vUv;
      vec2 grid = floor(uv * uPatternScale) / uPatternScale;
      float n = noise(grid * uPatternDensity + uTime * uSpeed * 0.3);
      float threshold = 0.5;
      if (n < threshold) discard;
      vec2 cell = fract(uv * uPatternScale);
      float jitter = 1.0 - uPixelSizeJitter * hash(grid * 7.3);
      vec2 local = cell;
      ${shapeTest}
      float alpha = uAlpha;
      if (uEdgeFade) {
        vec2 center = abs(uv - 0.5) * 2.0;
        float edgeDist = max(center.x, center.y);
        alpha *= 1.0 - smoothstep(0.6, 1.0, edgeDist);
      }
      if (uNoiseAmount > 0.0) {
        float grain = (hash(uv * 1000.0 + uTime) - 0.5) * uNoiseAmount;
        alpha = clamp(alpha + grain, 0.0, 1.0);
      }
      gl_FragColor = vec4(uColor, alpha);
    }
  `;
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Liquid post-processing effect
function createLiquidEffect(
  texture: THREE.Texture,
  opts?: { strength?: number; wobbleSpeed?: number },
): Effect {
  const fragment = `
    uniform sampler2D uTexture;
    uniform float uStrength;
    uniform float uTime;
    uniform float uFreq;

    void mainUv(inout vec2 uv) {
      vec4 tex = texture2D(uTexture, uv);
      float vx = tex.r * 2.0 - 1.0;
      float vy = tex.g * 2.0 - 1.0;
      float intensity = tex.b;
      float wave = 0.5 + 0.5 * sin(uTime * uFreq + intensity * 6.2831853);
      float amt = uStrength * intensity * wave;
      uv += vec2(vx, vy) * amt;
    }
  `;
  const effect = new Effect("LiquidEffect", fragment, {
    uniforms: new Map<string, THREE.Uniform<unknown>>([
      ["uTexture", new THREE.Uniform(texture)],
      ["uStrength", new THREE.Uniform(opts?.strength ?? 0.025)],
      ["uTime", new THREE.Uniform(0)],
      ["uFreq", new THREE.Uniform(opts?.wobbleSpeed ?? 1.5)],
    ]),
  });
  return effect;
}

// Ripple effect
function createRippleEffect(opts?: {
  intensityScale?: number;
  thickness?: number;
  speed?: number;
}): Effect {
  const fragment = `
    uniform float uTime;
    uniform float uIntensity;
    uniform float uThickness;
    uniform float uSpeed;

    void mainUv(inout vec2 uv) {
      vec2 center = uv - 0.5;
      float dist = length(center);
      float wave = sin(dist * 20.0 - uTime * uSpeed) * uIntensity;
      float mask = smoothstep(uThickness, 0.0, abs(fract(dist * 8.0 - uTime * uSpeed * 0.5) - 0.5));
      uv += normalize(center) * wave * mask * 0.01;
    }
  `;
  const effect = new Effect("RippleEffect", fragment, {
    uniforms: new Map([
      ["uTime", new THREE.Uniform(0)],
      ["uIntensity", new THREE.Uniform(opts?.intensityScale ?? 1.0)],
      ["uThickness", new THREE.Uniform(opts?.thickness ?? 0.1)],
      ["uSpeed", new THREE.Uniform(opts?.speed ?? 2.0)],
    ]),
  });
  return effect;
}

export default function PixelBlast({
  variant = "square",
  pixelSize = 20,
  color = "#ffffff",
  speed = 1,
  transparent = false,
  edgeFade = true,
  liquid = false,
  liquidStrength = 0.025,
  pixelSizeJitter = 0.2,
  enableRipples = false,
  rippleIntensityScale = 1.0,
  rippleThickness = 0.1,
  rippleSpeed = 2.0,
  liquidWobbleSpeed = 1.5,
  autoPauseOffscreen = true,
  noiseAmount = 0.0,
  patternScale = 30,
  patternDensity = 4,
  antialias = false,
  className = "",
  style,
}: PixelBlastProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const colorObj = new THREE.Color(color);

    const renderer = new THREE.WebGLRenderer({ antialias, alpha: transparent });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, transparent ? 0 : 1);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
    camera.position.z = 1;

    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: buildFragmentShader(variant),
      uniforms: {
        uColor: { value: colorObj },
        uTime: { value: 0 },
        uPixelSize: { value: pixelSize },
        uAlpha: { value: 1.0 },
        uSpeed: { value: speed },
        uEdgeFade: { value: edgeFade },
        uNoiseAmount: { value: noiseAmount },
        uPatternScale: { value: patternScale },
        uPatternDensity: { value: patternDensity },
        uPixelSizeJitter: { value: pixelSizeJitter },
      },
      transparent: true,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Optional: liquid render target
    let renderTarget: THREE.WebGLRenderTarget | null = null;
    let composer: EffectComposer | null = null;
    let liquidEffect: Effect | null = null;
    let rippleEffect: Effect | null = null;

    if (liquid || enableRipples) {
      renderTarget = new THREE.WebGLRenderTarget(
        container.clientWidth,
        container.clientHeight,
      );
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const effects: Effect[] = [];
      if (liquid) {
        const rt = new THREE.WebGLRenderTarget(
          container.clientWidth,
          container.clientHeight,
        );
        renderer.setRenderTarget(rt);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        liquidEffect = createLiquidEffect(rt.texture, {
          strength: liquidStrength,
          wobbleSpeed: liquidWobbleSpeed,
        });
        effects.push(liquidEffect);
      }
      if (enableRipples) {
        rippleEffect = createRippleEffect({
          intensityScale: rippleIntensityScale,
          thickness: rippleThickness,
          speed: rippleSpeed,
        });
        effects.push(rippleEffect);
      }
      if (effects.length > 0) {
        composer.addPass(new EffectPass(camera, ...effects));
      }
    }

    // Resize
    const setSize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h, false);
      if (composer) composer.setSize(w, h);
      if (renderTarget) renderTarget.setSize(w, h);
    };
    setSize();
    const resizeObserver = new ResizeObserver(setSize);
    resizeObserver.observe(container);

    // Animation
    let raf = 0;
    const clock = new THREE.Clock();
    let paused = false;

    const observer = autoPauseOffscreen
      ? new IntersectionObserver(
          ([entry]) => {
            paused = !entry.isIntersecting;
          },
          { threshold: 0.01 },
        )
      : null;
    observer?.observe(container);

    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (paused) return;
      const t = clock.getElapsedTime();
      material.uniforms.uTime.value = t;
      if (liquidEffect) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = (liquidEffect as any).uniforms as
          | Map<string, THREE.Uniform<number>>
          | undefined;
        if (u?.get("uTime"))
          (u.get("uTime") as THREE.Uniform<number>).value = t;
      }
      if (rippleEffect) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = (rippleEffect as any).uniforms as
          | Map<string, THREE.Uniform<number>>
          | undefined;
        if (u?.get("uTime"))
          (u.get("uTime") as THREE.Uniform<number>).value = t;
      }
      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      observer?.disconnect();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      renderTarget?.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [
    variant,
    pixelSize,
    color,
    speed,
    transparent,
    edgeFade,
    liquid,
    liquidStrength,
    pixelSizeJitter,
    enableRipples,
    rippleIntensityScale,
    rippleThickness,
    rippleSpeed,
    liquidWobbleSpeed,
    autoPauseOffscreen,
    noiseAmount,
    patternScale,
    patternDensity,
    antialias,
  ]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}
    />
  );
}
