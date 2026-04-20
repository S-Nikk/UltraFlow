# Changelog

## [1.4.0] - 2026-04-20

### Added

#### New Integrated Tools

**Graphify Integration**
- Knowledge graph builder for code and documentation
- Auto-analyzes codebase on git commits
- 25+ language support via tree-sitter AST
- Multimodal processing (code, docs, PDFs, images, video/audio)
- Relationship transparency (EXTRACTED/INFERRED/AMBIGUOUS)
- 6+ MCP tools: `graph_query`, `graph_context`, `graph_communities`, `graph_analyze`, etc.
- Interactive web explorer for graph navigation

**MemPalace Integration**
- Local-first conversation memory system
- 29 MCP tools for full integration
- Semantic search with 96.6% R@5 accuracy
- Hierarchical organization (Wings/Rooms/Drawers)
- Session auto-indexing and context loading
- Multi-agent memory isolation support
- Temporal knowledge graph with validity windows

**GitNexus Code Intelligence**
- Execution flow analysis
- Impact radius assessment before changes
- Safe multi-file refactoring tools
- Pre-commit verification

#### Documentation & Skills

- 4 comprehensive Graphify skill files (.claude/skills/graphify/)
- 4 comprehensive MemPalace skill files (.claude/skills/mempalace/)
- Updated README with new tool sections
- Updated CLAUDE.md with tool references
- Updated AGENTS.md for all supported systems
- Tool-specific integration guides

#### Configuration

- MCP server registration for Graphify and MemPalace
- Post-commit hooks for auto-analysis and indexing
- SessionStart hooks for context loading
- Support for OpenCode, Claude Code, OpenClaw, OpenAI Codex

### Changed

- Updated architecture to include Graphify, MemPalace, and GitNexus
- Expanded MCP tools from 18 to 58+
- Enhanced README with integrated tools section
- Improved package.json keywords and description
- Updated feature comparison matrix

### Features

- **Total MCP Tools:** 58+ (up from 18)
  - Brain: 5 memory tools
  - DreamLord: 9 context/checkpoint/dashboard tools
  - Graphify: 6+ graph tools
  - MemPalace: 29 memory/retrieval tools
  - GitNexus: 5+ code intelligence tools

### Supported AI Systems

- ✅ Claude Code
- ✅ OpenCode (all models)
- ✅ OpenAI Codex
- ✅ OpenClaw

### Performance

- Graphify: 71.5x fewer tokens per query vs reading raw files
- MemPalace: 96.6% R@5 retrieval with zero API calls
- GitNexus: Real-time code intelligence and impact analysis

### Documentation

- Comprehensive skill files with examples
- CLI command references
- Integration guides for all platforms
- Architecture diagrams updated

---

## [1.3.1] - Previous Release

See git history for previous versions.
