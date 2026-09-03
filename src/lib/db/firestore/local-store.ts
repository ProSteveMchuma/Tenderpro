import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import {
  DbDoc,
  DocumentStore,
  QueryOptions,
  matchesWhere,
  sortDocs,
} from "@/lib/db/types";

type StoreShape = Record<string, Record<string, DbDoc>>;

type GlobalLocal = {
  store?: StoreShape;
  ready?: Promise<StoreShape>;
  writeQueue?: Promise<void>;
};

const globalForLocal = globalThis as typeof globalThis & { __supplierosLocalFs?: GlobalLocal };

function dataPath() {
  return process.env.FIRESTORE_LOCAL_PATH || path.join(process.cwd(), ".data", "firestore", "db.json");
}

async function loadStore(): Promise<StoreShape> {
  if (globalForLocal.__supplierosLocalFs?.store) return globalForLocal.__supplierosLocalFs.store;
  if (!globalForLocal.__supplierosLocalFs) globalForLocal.__supplierosLocalFs = {};
  if (!globalForLocal.__supplierosLocalFs.ready) {
    globalForLocal.__supplierosLocalFs.ready = (async () => {
      const file = dataPath();
      await fs.mkdir(path.dirname(file), { recursive: true });
      try {
        const raw = await fs.readFile(file, "utf8");
        return JSON.parse(raw) as StoreShape;
      } catch {
        return {};
      }
    })();
  }
  const store = await globalForLocal.__supplierosLocalFs.ready;
  globalForLocal.__supplierosLocalFs.store = store;
  return store;
}

async function persist(store: StoreShape) {
  const g = globalForLocal.__supplierosLocalFs!;
  g.writeQueue = (g.writeQueue ?? Promise.resolve()).then(async () => {
    const file = dataPath();
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(store), "utf8");
    await fs.rename(tmp, file);
  });
  await g.writeQueue;
}

export function createLocalDocumentStore(): DocumentStore {
  return {
    async get(collection, id) {
      const store = await loadStore();
      return store[collection]?.[id] ?? null;
    },
    async set(collection, id, data) {
      const store = await loadStore();
      if (!store[collection]) store[collection] = {};
      store[collection][id] = { ...data, id } as DbDoc;
      await persist(store);
    },
    async update(collection, id, data) {
      const store = await loadStore();
      const current = store[collection]?.[id];
      if (!current) throw new Error(`Document ${collection}/${id} not found`);
      store[collection][id] = { ...current, ...data, id };
      await persist(store);
    },
    async delete(collection, id) {
      const store = await loadStore();
      if (store[collection]?.[id]) {
        delete store[collection][id];
        await persist(store);
      }
    },
    async query(collection, options: QueryOptions = {}) {
      const store = await loadStore();
      let docs = Object.values(store[collection] ?? {});
      docs = docs.filter((doc) => matchesWhere(doc, options.where));
      docs = sortDocs(docs, options.orderBy);
      if (options.limit != null) docs = docs.slice(0, options.limit);
      return docs;
    },
  };
}

export async function resetLocalDocumentStore() {
  const file = dataPath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, "{}", "utf8");
  if (globalForLocal.__supplierosLocalFs) {
    globalForLocal.__supplierosLocalFs.store = {};
    globalForLocal.__supplierosLocalFs.ready = Promise.resolve({});
  }
}
