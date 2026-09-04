// ort-client.ts

let ortInstance: any = null;

/** Carga ONNX Runtime Web solo una vez */
export async function loadOrt() {
  if (!ortInstance) {
    ortInstance = await import("onnxruntime-web");
  }
  return ortInstance;
}

/** Crea una sesión WebGPU lista para usar */
export async function createOrtSession(modelBuffer: ArrayBuffer) {
  const ort = await loadOrt();

  const session = await ort.InferenceSession.create(modelBuffer, {
    executionProviders: ["webgpu"]
  });

  return session;
}
