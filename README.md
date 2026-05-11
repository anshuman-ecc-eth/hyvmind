# Hyvmind

A knowledge management application built on the Internet Computer.

## Pages

- **Notes** — A markdown editor with Obsidian-compatible syntax, file tree sidebar, cross-references (`{@` syntax), and frontmatter support for organizing hierarchical notes (curations, swarms, locations, law entities, interpretation entities).
- **Graphs** — A force-directed graph visualization of your knowledge base. Browse nodes and edges, inspect attributes and cross-reference counts, and open detailed node information modals.
- **Public** — Browse and explore graphs published by other users across the platform.

## Backend Tech Stack

- **Motoko** — The backend is written in Motoko, a language designed for the Internet Computer, and compiled with `moc` (v1.3.0).
- **mops** — Dependency management and builds are handled by mops, which pulls packages from the Motoko package registry.
- **ICP** — The canister runs on the Internet Computer blockchain, providing authentication via Internet Identity and data persistence through stable memory.
- **Key dependencies** — `core` (standard library), `caffeineai-authorization` (access control for user-owned data), and `caffeineai-user-approval` (plugin binding approvals).

## License

GNU General Public License v3.0 — see [LICENSE](./LICENSE).
