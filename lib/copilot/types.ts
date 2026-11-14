export type DocKind = "pdf" | "docx" | "txt" | "csv";

/** One page of extracted text. Formats without pages (TXT, CSV) are a single page 1 unless marked. */
export type Page = { page: number; text: string };

export type DocRecord = {
  id: string;
  name: string;
  kind: DocKind;
  sizeBytes: number;
  pageCount: number;
  chunkCount: number;
  status: "ready" | "failed";
  error?: string;
  uploadedAt: number;
  indexedAt: number;
  /** Built-in demo document, not a real factory file. */
  sample?: boolean;
  /** Text that looks like instructions to the AI was found in it. */
  flagged?: boolean;
};

export type Chunk = {
  id: string;
  docId: string;
  docName: string;
  page: number;
  index: number;
  text: string;
  /** Embedding. Local embeddings are sparse term weights, others are dense. */
  vec: number[];
  /** Matched a prompt-injection pattern. Still searchable, but sent to the model as data with a warning. */
  suspicious?: boolean;
};

export type Source = {
  /** 1-based citation number the answer uses, like [1]. */
  n: number;
  chunkId: string;
  docId: string;
  docName: string;
  page: number;
  excerpt: string;
  text: string;
  score: number;
  suspicious: boolean;
};

export type AppContext = { label: string; lines: string[] };

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** One line of the chat stream. */
export type StreamEvent =
  | { t: "retrieval"; sources: Source[]; mode: "demo" | "llm"; query: string; docs: number }
  | { t: "delta"; text: string }
  | { t: "done"; grounded: boolean; cited: number[]; mode: "demo" | "llm" }
  | { t: "error"; message: string };
