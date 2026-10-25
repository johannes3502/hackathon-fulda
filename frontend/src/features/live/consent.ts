export const LOCAL_SERVER_LABEL = "this local server";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function isRelative(value: string) {
  return !/^[a-z][a-z\d+.-]*:/i.test(value) && !value.startsWith("//");
}

export function consentTarget(value: string) {
  if (isRelative(value)) return LOCAL_SERVER_LABEL;
  try {
    const url = new URL(value);
    if (LOCAL_HOSTS.has(url.hostname)) return LOCAL_SERVER_LABEL;
    return url.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
}
