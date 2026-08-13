export async function getRuntimeValue(key: string) {
  const value = process.env[key];
  return typeof value === "string" ? value : "";
}
