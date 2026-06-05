# Contributing

OpenMark should feel small, stable, and easy to understand. Contributions should protect that shape.

## Principles

- Prefer focused changes over broad rewrites.
- Keep editor behavior predictable before adding new features.
- Avoid coupling file-system code to editor rendering code.
- Add tests when a change affects parsing, export, or persistence.
- Keep UI copy short and direct.

## Local Setup

```bash
npm install
npm run dev
```

## Before Opening a Pull Request

```bash
npm run lint
npm run build
```

## Good First Areas

- Keyboard shortcuts
- Export styling
- Markdown edge cases
- Accessibility polish
- Documentation examples
