export const omit = <T extends object>(obj: T, keys: Array<keyof T>) => {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
};

export const fmt = (obj: Record<string, any>) => {
  let s = "";

  for (const [k, v] of Object.entries(obj)) {
    s += `${k} = ${JSON.stringify(v, null, 2)}\n`;
  }

  return s.trim();
};
