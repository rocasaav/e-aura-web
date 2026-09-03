export async function loadOrt() {
  const ort = await import("onnxruntime-web/webgpu");
  return ort;
}