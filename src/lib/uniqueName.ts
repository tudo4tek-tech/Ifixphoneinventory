// Generates "X Copy", "X Copy 2", "X Copy 3"... until `exists` says the
// candidate is free, for duplicate actions across lines/models/categories.
export async function uniqueCopyName(
  baseName: string,
  exists: (name: string) => Promise<boolean>
): Promise<string> {
  let candidate = `${baseName} Copy`;
  let n = 2;
  while (await exists(candidate)) {
    candidate = `${baseName} Copy ${n}`;
    n++;
  }
  return candidate;
}
