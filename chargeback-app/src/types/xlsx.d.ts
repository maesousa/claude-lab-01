// Module declaration so TypeScript can resolve 'xlsx' under moduleResolution: bundler.
// The xlsx package ships its own types at types/index.d.ts but has no "exports" field,
// which prevents bundler-mode resolution from finding them automatically.
// We re-export everything from the bundled declaration file as a workaround.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module 'xlsx' {
  // Re-use the types that xlsx itself ships
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const xlsx: typeof import('../../node_modules/xlsx/types/index')
  export = xlsx
}
