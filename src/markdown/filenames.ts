// SPDX-License-Identifier: MIT OR Apache-2.0
const attachmentExtension =
  /\.(pdf|txt|csv|tsv|md|json|xml|docx?|xlsx?|pptx?|zip|svg|heic|png|jpe?g|webp|gif|mp[34]|wav|py|js|ts|css|rtf|odt)$/i;

export function pathFilename(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

/** Recognize the file path, never an extension in a query or a source HTML page. */
export function linkedFilename(href: string): string {
  if (!/^https?:\/\//i.test(href)) return "";
  try {
    const name = pathFilename(new URL(href).pathname);
    return attachmentExtension.test(name) ? name.replace(/\s+/g, " ") : "";
  } catch {
    return "";
  }
}
