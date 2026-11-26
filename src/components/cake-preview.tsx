"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material: THREE.Material) => material.dispose());
    }
  });
}

// 書き出し時の原点に依存せず、底面中心を配置基準にする。
function groundModel(object: THREE.Object3D) {
  const bounds = new THREE.Box3().setFromObject(object);
  const center = bounds.getCenter(new THREE.Vector3());
  object.position.sub(new THREE.Vector3(center.x, bounds.min.y, center.z));
  const group = new THREE.Group();
  group.add(object);
  return { group, height: bounds.max.y - bounds.min.y };
}

export function CakePreview() {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<{ cream: THREE.Group; render: () => void; reset: () => void } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [showCream, setShowCream] = useState(true);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      // WebGL非対応時も画面全体を落とさずに案内を表示する。
      queueMicrotask(() => { if (!disposed) setStatus("error"); });
      return () => { disposed = true; };
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.setAttribute("aria-label", "チョコケーキと絞りクリームの3D表示");
    renderer.domElement.style.touchAction = "none";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 3.2;
    controls.maxDistance = 9;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    const render = () => { if (!disposed) renderer.render(scene, camera); };
    const reset = () => {
      camera.position.set(3.4, 2.8, 4.2);
      controls.target.set(0, 0.5, 0);
      controls.update();
      render();
    };
    controls.addEventListener("change", render);

    scene.add(new THREE.HemisphereLight(0xfff7ee, 0x928578, 3));
    const keyLight = new THREE.DirectionalLight(0xfff4e7, 4);
    keyLight.position.set(3, 6, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -3;
    keyLight.shadow.camera.right = 3;
    keyLight.shadow.camera.top = 3;
    keyLight.shadow.camera.bottom = -3;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 2);
    fillLight.position.set(-4, 3, -2);
    scene.add(fillLight);

    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(1.22, 1.22, 0.06, 96),
      new THREE.MeshStandardMaterial({ color: 0xfaf5ef, roughness: 0.35 }),
    );
    plate.position.y = -0.03;
    plate.receiveShadow = true;
    plate.castShadow = true;
    scene.add(plate);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ opacity: 0.13 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.065;
    floor.receiveShadow = true;
    scene.add(floor);

    const resize = new ResizeObserver(() => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      render();
    });
    resize.observe(host);
    reset();

    const draco = new DRACOLoader();
    draco.setDecoderPath("/draco/");
    const loader = new GLTFLoader().setDRACOLoader(draco);
    const loadModel = async (url: string) => {
      const gltf = await loader.loadAsync(url);
      if (disposed) {
        disposeObject(gltf.scene);
        return null;
      }
      scene.add(gltf.scene);
      return gltf.scene;
    };
    void Promise.all([
      loadModel("/models/bases/cake-base-chocolate.glb"),
      loadModel("/models/cream/cream_dec_1.glb"),
    ]).then(([cake, cream]) => {
      if (disposed || !cake || !cream) return;
      // 元モデルに色指定がないため、プレビュー用の色を設定する。
      cake.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material: THREE.MeshStandardMaterial) => material.color.set("#593020"));
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      cream.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // ジオメトリは引き続き使うので、元マテリアルのみ交換する。
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material: THREE.Material) => material.dispose());
          child.material = new THREE.MeshStandardMaterial({ color: "#fff5e5", roughness: 0.55 });
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      const cakeModel = groundModel(cake);
      const creamModel = groundModel(cream);
      creamModel.group.position.y = cakeModel.height;
      scene.add(cakeModel.group, creamModel.group);
      viewerRef.current = { cream: creamModel.group, render, reset };
      render();
      setStatus("ready");
    }).catch((error: unknown) => {
      if (!disposed) {
        console.error("ケーキモデルの読み込みに失敗しました", error);
        setStatus("error");
      }
    });

    return () => {
      disposed = true;
      viewerRef.current = null;
      resize.disconnect();
      controls.dispose();
      draco.dispose();
      disposeObject(scene);
      keyLight.shadow.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm" aria-label="ケーキのプレビュー">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 px-6 py-4">
        <div>
          <h2 className="font-semibold">チョコケーキ ＋ 絞りクリーム</h2>
          <p className="mt-1 text-sm text-stone-500">ドラッグで回転・スクロールで拡大縮小</p>
        </div>
        <button type="button" disabled={status !== "ready"} onClick={() => viewerRef.current?.reset()} className="rounded-xl border border-stone-300 px-4 py-2 text-sm hover:bg-stone-50 disabled:opacity-40">視点を戻す</button>
      </div>
      <div className="relative bg-[#f4eee7]">
        <div ref={hostRef} className="h-[420px] w-full sm:h-[540px]" />
        {status !== "ready" && (
          <p role={status === "error" ? "alert" : "status"} className="absolute inset-0 flex items-center justify-center bg-stone-50/90 px-6 text-center text-stone-600">
            {status === "loading" ? "3Dモデルを読み込んでいます…" : "3Dモデルを表示できませんでした。WebGL対応のブラウザでページを再読み込みしてください。"}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={showCream} disabled={status !== "ready"} onChange={(event) => {
            const visible = event.target.checked;
            setShowCream(visible);
            if (viewerRef.current) {
              viewerRef.current.cream.visible = visible;
              viewerRef.current.render();
            }
          }} className="h-4 w-4 accent-rose-700" />
          絞りクリームを表示
        </label>
        <p aria-live="polite" className="text-sm text-stone-500">{status === "ready" ? "2つのモデルを読み込み済み" : "プレビュー準備中"}</p>
      </div>
    </section>
  );
}
