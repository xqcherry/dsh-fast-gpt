/**
 * Host half of Fast GPT.
 *
 * The plugin only adds a Client-side composer button, so the Host entry has no
 * behavior of its own; it exists so the bundle has a Loader row and the
 * `dsh.client` declaration can load the browser half.
 */
export function apply(): void {}
