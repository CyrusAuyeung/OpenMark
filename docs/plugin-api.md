# Plugin API Design

OpenMark should support plugins only after the editor core is stable enough to keep third-party extensions predictable. The first plugin API should be small, permissioned, and easy to disable.

## Goals

- Let contributors extend commands, Markdown transforms, export steps, and workspace UI without changing the app core.
- Keep local documents private by default; plugins should only receive data they explicitly need.
- Make every plugin capability visible in a manifest so users and reviewers can understand the risk.
- Keep plugin failure isolated from the editor session.

## Non-Goals

- No arbitrary Node.js access from renderer plugins.
- No package manager inside OpenMark for the first version.
- No WYSIWYG editor replacement API until the Markdown pipeline is separated.
- No background network access unless a future permission model and review process exist.

## Plugin Package Shape

A plugin is a folder or packaged archive with a manifest and a browser-compatible entry module.

```text
openmark-plugin-example/
  openmark.plugin.json
  dist/index.js
  README.md
```

Example manifest:

```json
{
  "id": "example.word-tools",
  "name": "Word Tools",
  "version": "0.1.0",
  "openmark": ">=0.4.0 <1.0.0",
  "entry": "dist/index.js",
  "permissions": ["document:read", "document:edit"],
  "contributes": {
    "commands": [
      {
        "id": "wordTools.insertSummary",
        "title": "Insert Summary Block"
      }
    ],
    "markdownTransforms": [
      {
        "id": "wordTools.normalizeTables",
        "title": "Normalize Markdown Tables"
      }
    ]
  }
}
```

## Runtime Model

Plugins should run in a sandboxed browser execution context, separate from the main React tree and Electron preload bridge.

Recommended layers:

```text
Plugin Host
  Loads manifests, validates permissions, registers contributions

Plugin Sandbox
  Executes browser-compatible plugin modules with a restricted API object

Contribution Registry
  Stores commands, transforms, export hooks, and UI panels

Editor Core Bridge
  Applies safe document reads and edits through explicit methods
```

The plugin host should never hand the full app state object to a plugin. It should expose small methods that can be validated, logged, and revoked.

## Activation Lifecycle

```ts
export interface OpenMarkPlugin {
  activate(context: PluginContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}

export interface PluginContext {
  readonly pluginId: string;
  readonly subscriptions: Disposable[];
  readonly commands: CommandRegistry;
  readonly workspace: WorkspaceApi;
  readonly markdown: MarkdownApi;
  readonly export: ExportApi;
}
```

Activation should happen lazily when a contribution is needed:

- App startup validates manifests and builds a contribution index.
- Opening the command palette activates plugins that contribute matching commands.
- Running an export activates plugins that contribute export hooks.
- Closing the app calls `deactivate` and disposes subscriptions.

## MVP Extension Points

### Commands

Commands are the safest first extension point because they fit the existing command palette.

```ts
interface CommandRegistry {
  registerCommand(id: string, title: string, handler: CommandHandler): Disposable;
}

type CommandHandler = (context: CommandRunContext) => void | Promise<void>;
```

### Document Access

Document APIs should be explicit and permission-gated.

```ts
interface WorkspaceApi {
  getDocumentText(): string;
  getDocumentInfo(): DocumentInfo;
  applyEdit(edit: DocumentEdit): void;
}

interface DocumentEdit {
  range?: { from: number; to: number };
  text: string;
}
```

Required permissions:

- `document:read` for `getDocumentText` and `getDocumentInfo`.
- `document:edit` for `applyEdit`.

### Markdown Transforms

Markdown transforms let plugins format or enrich source text before export or on explicit command.

```ts
interface MarkdownApi {
  registerTransform(transform: MarkdownTransform): Disposable;
}

interface MarkdownTransform {
  id: string;
  title: string;
  run(input: MarkdownTransformInput): MarkdownTransformOutput | Promise<MarkdownTransformOutput>;
}
```

Transforms must be deterministic and should not mutate editor state directly.

### Export Hooks

Export hooks let plugins modify rendered HTML metadata or add assets before HTML/PDF output.

```ts
interface ExportApi {
  registerHtmlHook(hook: HtmlExportHook): Disposable;
}

interface HtmlExportHook {
  id: string;
  title: string;
  run(input: HtmlExportInput): HtmlExportOutput | Promise<HtmlExportOutput>;
}
```

The export pipeline should sanitize plugin output before writing files.

### Workspace Panels

Workspace panels are useful, but they should be a later MVP item after command and transform APIs prove stable. Panels should render in iframe-like isolation and receive only a small message API.

## Permission Model

Start with a small permission list:

| Permission | Allows |
| --- | --- |
| `document:read` | Read current Markdown text and document metadata. |
| `document:edit` | Apply explicit text edits to the current document. |
| `export:html` | Register HTML export hooks. |
| `workspace:panel` | Contribute a sandboxed sidebar panel. |

Future permissions should be reviewed carefully before being added. File system, shell, clipboard, and network access should stay unavailable until OpenMark has a stronger trust and review story.

## Security Rules

- Validate every manifest with a schema before loading it.
- Require globally unique plugin and contribution IDs.
- Disable a plugin after repeated activation or runtime errors.
- Sanitize all HTML created by plugins with the existing Markdown preview/export sanitizer.
- Keep Electron IPC private; plugins should not access `window.openmark` directly.
- Store plugin enablement and permissions in local settings, not inside Markdown files.

## Implementation Phases

1. Define TypeScript interfaces and manifest schema under a future `packages/plugin-api` package.
2. Add a plugin host that can load built-in sample plugins from a local development folder.
3. Register plugin commands in the existing command palette.
4. Add permission checks for document read/edit and Markdown transforms.
5. Add export hooks after the HTML/PDF export pipeline has typed inputs and outputs.
6. Add a plugin manager UI for enable, disable, inspect permissions, and view errors.

## First Sample Plugins

- Word count enhancer: adds reading time and sentence count commands.
- Table cleaner: normalizes Markdown table spacing.
- Front matter helper: inserts and updates YAML front matter.
- Export metadata helper: injects title, description, and print CSS into HTML/PDF exports.

## Review Checklist

- Does the plugin need document access, or can it work from selected text only?
- Can this extension point be implemented as a command before adding UI surface area?
- Can plugin failure be shown without interrupting writing?
- Can users disable the plugin from settings?
- Is every output sanitized before preview or export?
