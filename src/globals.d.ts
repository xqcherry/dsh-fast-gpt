/**
 * Globals provided by the DeepSeek Harness Web shell.
 *
 * Declared without imports/exports so `src/client.ts` stays a classic script
 * after `tsc` emits it; the shell loads that file and hands it the loader.
 */
interface Window {
  __ModuleLoader__: {
    load(input: {
      id: string;
      factory(require: (id: string) => unknown): unknown;
    }): void;
  };
}
