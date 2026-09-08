/**
 * Barrel for the typed Firestore query layer.
 *
 * Components import from here (or the individual modules) — never from
 * `firebase/firestore` directly, and never using an untyped snapshot.
 *
 * Discipline enforced by this layer:
 *  - one exported function per query
 *  - every query carries a Firestore converter (see `./converters`)
 *  - list queries are cursor-paginated (`Page<T>` / `PageParams`, `startAfter`)
 *  - no query inside a `.map()` — callers batch or denormalise instead
 *  - `onSnapshot` lives in `./listeners`, single active view, always unsubscribed
 *  - dashboards read `./dashboard` (denormalised doc), never live aggregation
 */
export * from "./paths";
export * from "./pagination";
export * from "./converters";
export * from "./users";
export * from "./projects";
export * from "./tickets";
export * from "./submissions";
export * from "./comments";
export * from "./dashboard";
export * from "./listeners";
export * from "./notifications";
