export type PublicEnvironmentVariableName = `NEXT_PUBLIC_${string}`;

function readRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function readRequiredPublicEnvironmentVariable(
  name: PublicEnvironmentVariableName,
): string {
  return readRequiredEnvironmentVariable(name);
}

export function readRequiredServerEnvironmentVariable(name: string): string {
  if (name.startsWith("NEXT_PUBLIC_")) {
    throw new Error(
      `Server-only environment variable must not use the NEXT_PUBLIC_ prefix: ${name}`,
    );
  }

  return readRequiredEnvironmentVariable(name);
}
