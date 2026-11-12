// SPDX-License-Identifier: MIT OR Apache-2.0
import { strToU8, Zip, ZipPassThrough } from "fflate";
import { download, downloadBlob, makeZip } from "./export";

const zipSizeLimit = 0xffffffff;
const zipEntryLimit = 0xffff;
export type SaveZipPart = (
  bytes: Uint8Array,
  name: string,
  signal: AbortSignal,
) => Promise<void>;
const partLimit = 32 * 1024 * 1024;
const partInstructions =
  "Save every numbered ZIP part and extract them all into the same folder. " +
  "The last part contains the export manifest when enabled. Keep the original chats until you verify the extracted documents and media.";

async function temporaryFile() {
  if (typeof crypto.randomUUID !== "function") return undefined;
  let root: FileSystemDirectoryHandle | undefined;
  const name = `ai-chat-export-${crypto.randomUUID()}.zip`;
  try {
    root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(name, { create: true });
    const stream = await handle.createWritable();
    return { root, name, handle, stream };
  } catch {
    await root?.removeEntry(name).catch(() => {});
    return undefined;
  }
}

export class SeparateArchive {
  static async open(name: string, signal: AbortSignal, savePart?: SaveZipPart) {
    return new SeparateArchive(name, await temporaryFile(), signal, savePart);
  }

  private readonly zip?: Zip;
  private pending = Promise.resolve();
  private zipSize = 0;
  private entryCount = 0;
  private downloadStarted = false;
  private readonly files = new Map<string, string | Uint8Array>();
  private bytes = 0;
  private part = 0;

  private constructor(
    private readonly name: string,
    private readonly file: Awaited<ReturnType<typeof temporaryFile>>,
    private readonly signal: AbortSignal,
    private readonly savePart?: SaveZipPart,
  ) {
    if (file) {
      this.zip = new Zip((error, bytes) => {
        this.pending = this.pending.then(() => {
          if (error) throw error;
          return file.stream.write(new Uint8Array(bytes));
        });
      });
    }
  }

  async add(path: string, content: string | Uint8Array): Promise<void> {
    this.signal.throwIfAborted();
    const bytes = typeof content === "string" ? strToU8(content) : content;
    // Local header, descriptor, central header, name and final directory record.
    const size = bytes.byteLength + 92 + strToU8(path).length * 2;
    if (this.zip) {
      if (
        this.entryCount >= zipEntryLimit ||
        this.zipSize + size >= zipSizeLimit
      )
        throw new Error(
          "Archive exceeds the ZIP format limit. Export fewer chats at once.",
        );
      const entry = new ZipPassThrough(path);
      this.zip.add(entry);
      entry.push(bytes, true);
      await this.pending;
      this.zipSize += size;
      this.entryCount++;
      return;
    }
    if (size > partLimit)
      throw new Error(
        "A ZIP entry exceeds the fallback part size. Use a browser with writable private storage.",
      );
    if (this.bytes + size > partLimit || this.files.size >= zipEntryLimit - 2) {
      if (!this.savePart)
        throw new Error(
          "The backup needs writable browser storage to save a single ZIP. No native action was started.",
        );
      await this.downloadPart(this.savePart);
    }
    this.files.set(path, bytes);
    this.bytes += size;
  }

  private async downloadPart(save: SaveZipPart) {
    const number = String(++this.part).padStart(3, "0");
    this.files.set(`README-zip-part-${number}.txt`, partInstructions);
    const name = this.name.replace(/\.zip$/i, `-part-${number}.zip`);
    const bytes = makeZip(this.files, undefined, 0);
    this.files.clear();
    this.bytes = 0;
    await save(bytes, name, this.signal);
  }

  async finish(manifest: unknown): Promise<boolean> {
    this.signal.throwIfAborted();
    if (manifest !== undefined)
      await this.add("manifest.json", JSON.stringify(manifest, null, 2));
    this.signal.throwIfAborted();
    if (this.file && this.zip) {
      const { root, name, handle, stream } = this.file;
      this.zip.end();
      await this.pending;
      await stream.close();
      const blob = await handle.getFile();
      this.signal.throwIfAborted();
      downloadBlob(
        blob,
        this.name,
        () => void root.removeEntry(name).catch(() => {}),
      );
      this.downloadStarted = true;
    } else if (this.part && this.savePart) {
      if (this.files.size) await this.downloadPart(this.savePart);
    } else {
      download(makeZip(this.files, undefined, 0), this.name, "application/zip");
    }
    return this.part === 0;
  }

  async dispose(): Promise<void> {
    this.files.clear();
    if (!this.file || this.downloadStarted) return;
    this.zip?.terminate();
    await this.pending.catch(() => {});
    await this.file.stream.abort().catch(() => {});
    await this.file.root.removeEntry(this.file.name).catch(() => {});
  }
}
