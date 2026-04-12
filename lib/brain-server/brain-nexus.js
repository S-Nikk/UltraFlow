/**
 * Brain GitNexus: Memory Knowledge Graph
 *
 * Mirrors GitNexus architecture but indexes memory files instead of code.
 * Provides:
 *   - Memory-to-memory relationship graph
 *   - Topic clustering (Leiden-inspired)
 *   - Session traces (co-access patterns)
 *   - Predictive context loading
 *
 * Storage: ~/.claude/memory/.brain-nexus/
 *   - graph.json: nodes + edges
 *   - clusters.json: topic groupings
 *   - sessions.json: access patterns + predictions
 *   - meta.json: index metadata
 */

import fs from 'fs';
import path from 'path';

export class BrainNexus {
  constructor(memoryDir) {
    this.memoryDir = memoryDir;
    this.nexusDir = path.join(memoryDir, '.brain-nexus');
    this.graph = { nodes: {}, edges: [] };
    this.clusters = { topics: [] };
    this.sessions = { sequences: [], code_to_memory: [] };
    this.meta = { lastIndexed: null, memoryCount: 0, edgeCount: 0 };

    this.ensureDir();
    this.load();
  }

  ensureDir() {
    if (!fs.existsSync(this.nexusDir)) {
      fs.mkdirSync(this.nexusDir, { recursive: true });
    }
  }

  load() {
    try {
      const graphPath = path.join(this.nexusDir, 'graph.json');
      const clustersPath = path.join(this.nexusDir, 'clusters.json');
      const sessionsPath = path.join(this.nexusDir, 'sessions.json');
      const metaPath = path.join(this.nexusDir, 'meta.json');

      if (fs.existsSync(graphPath)) this.graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
      if (fs.existsSync(clustersPath)) this.clusters = JSON.parse(fs.readFileSync(clustersPath, 'utf-8'));
      if (fs.existsSync(sessionsPath)) this.sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'));
      if (fs.existsSync(metaPath)) this.meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch (error) {
      // Start fresh on error
    }
  }

  save() {
    fs.writeFileSync(path.join(this.nexusDir, 'graph.json'), JSON.stringify(this.graph, null, 2));
    fs.writeFileSync(path.join(this.nexusDir, 'clusters.json'), JSON.stringify(this.clusters, null, 2));
    fs.writeFileSync(path.join(this.nexusDir, 'sessions.json'), JSON.stringify(this.sessions, null, 2));
    fs.writeFileSync(path.join(this.nexusDir, 'meta.json'), JSON.stringify(this.meta, null, 2));
  }

  /**
   * Index all memory files — builds the graph from scratch
   * Called by swarm or on checkpoint when memories changed
   */
  index(memories) {
    // Reset graph
    this.graph = { nodes: {}, edges: [] };

    // Build nodes
    for (const [name, memory] of Object.entries(memories)) {
      this.graph.nodes[name] = {
        type: 'Memory',
        memoryType: memory.type,
        tokens: memory.tokens || Math.ceil((memory.content || '').length / 4),
        concepts: memory.keywords ? memory.keywords.slice(0, 20) : [],
        lastAccessed: memory.lastAccessed || null,
        accessCount: memory.accessCount || 0,
      };
    }

    // Build edges based on keyword overlap (REFERENCES)
    const names = Object.keys(memories);
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = memories[names[i]];
        const b = memories[names[j]];

        const overlap = this.computeOverlap(a.keywords || [], b.keywords || []);
        if (overlap.score > 0.1) {
          this.graph.edges.push({
            source: names[i],
            target: names[j],
            type: 'REFERENCES',
            confidence: overlap.score,
            reason: `shared concepts: ${overlap.shared.slice(0, 3).join(', ')}`,
          });
        }
      }
    }

    // Detect clusters
    this.detectClusters();

    // Update meta
    this.meta.lastIndexed = new Date().toISOString();
    this.meta.memoryCount = names.length;
    this.meta.edgeCount = this.graph.edges.length;

    this.save();

    return {
      nodes: names.length,
      edges: this.graph.edges.length,
      clusters: this.clusters.topics.length,
    };
  }

  /**
   * Compute keyword overlap between two memories (Jaccard-like)
   */
  computeOverlap(keywordsA, keywordsB) {
    const setA = new Set(keywordsA);
    const setB = new Set(keywordsB);
    const shared = [...setA].filter(k => setB.has(k));
    const union = new Set([...setA, ...setB]);

    return {
      score: union.size > 0 ? shared.length / union.size : 0,
      shared,
    };
  }

  /**
   * Simple community detection (Leiden-inspired greedy modularity)
   * Groups memories with high REFERENCES connectivity
   */
  detectClusters() {
    const nodes = Object.keys(this.graph.nodes);
    if (nodes.length === 0) {
      this.clusters = { topics: [] };
      return;
    }

    // Build adjacency map
    const adj = {};
    for (const node of nodes) adj[node] = [];
    for (const edge of this.graph.edges) {
      if (edge.confidence > 0.15) {
        adj[edge.source]?.push({ target: edge.target, weight: edge.confidence });
        adj[edge.target]?.push({ target: edge.source, weight: edge.confidence });
      }
    }

    // Greedy clustering: assign each node to highest-affinity neighbor's cluster
    const clusterOf = {};
    let clusterId = 0;

    // Seed: unassigned nodes start their own cluster
    for (const node of nodes) {
      clusterOf[node] = null;
    }

    // Pass 1: nodes with most connections seed clusters
    const sorted = nodes.sort((a, b) => (adj[b]?.length || 0) - (adj[a]?.length || 0));
    for (const node of sorted) {
      if (clusterOf[node] !== null) continue;

      // Check if any neighbor already has a cluster
      const neighborClusters = adj[node]
        .filter(n => clusterOf[n.target] !== null)
        .map(n => ({ cluster: clusterOf[n.target], weight: n.weight }));

      if (neighborClusters.length > 0) {
        // Join highest-weight neighbor's cluster
        const best = neighborClusters.sort((a, b) => b.weight - a.weight)[0];
        clusterOf[node] = best.cluster;
      } else {
        // Start new cluster
        clusterOf[node] = clusterId++;
      }
    }

    // Build cluster objects
    const clusterMap = {};
    for (const [node, cid] of Object.entries(clusterOf)) {
      if (cid === null) continue;
      if (!clusterMap[cid]) clusterMap[cid] = [];
      clusterMap[cid].push(node);
    }

    // Convert to topics with labels
    this.clusters.topics = Object.entries(clusterMap)
      .filter(([_, members]) => members.length > 1) // Only clusters with 2+ members
      .map(([id, members]) => {
        // Generate label from shared keywords
        const allKeywords = members.flatMap(m => this.graph.nodes[m]?.concepts || []);
        const keywordCounts = {};
        for (const k of allKeywords) keywordCounts[k] = (keywordCounts[k] || 0) + 1;
        const topKeywords = Object.entries(keywordCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([k]) => k);

        const totalTokens = members.reduce(
          (sum, m) => sum + (this.graph.nodes[m]?.tokens || 0), 0
        );

        return {
          id: `topic_${id}`,
          label: topKeywords.join(' & ') || `Cluster ${id}`,
          members,
          totalTokens,
          keywords: topKeywords,
        };
      });
  }

  /**
   * Get context for a memory (like GitNexus context())
   * Returns connected memories and cluster membership
   */
  context(memoryName) {
    const node = this.graph.nodes[memoryName];
    if (!node) return { error: `Memory "${memoryName}" not in graph` };

    const incoming = this.graph.edges
      .filter(e => e.target === memoryName)
      .map(e => ({ name: e.source, type: e.type, confidence: e.confidence }));

    const outgoing = this.graph.edges
      .filter(e => e.source === memoryName)
      .map(e => ({ name: e.target, type: e.type, confidence: e.confidence }));

    const cluster = this.clusters.topics.find(t => t.members.includes(memoryName));

    return {
      name: memoryName,
      node,
      incoming,
      outgoing,
      cluster: cluster ? { id: cluster.id, label: cluster.label, members: cluster.members } : null,
    };
  }

  /**
   * Impact analysis (like GitNexus impact())
   * BFS traversal to find related memories by depth
   */
  impact(memoryName, { depth = 2 } = {}) {
    const visited = new Set([memoryName]);
    const byDepth = {};

    let frontier = [memoryName];
    for (let d = 1; d <= depth; d++) {
      const nextFrontier = [];
      for (const node of frontier) {
        const neighbors = this.graph.edges
          .filter(e => e.source === node || e.target === node)
          .map(e => e.source === node ? e.target : e.source)
          .filter(n => !visited.has(n));

        for (const neighbor of neighbors) {
          visited.add(neighbor);
          nextFrontier.push(neighbor);
          if (!byDepth[d]) byDepth[d] = [];
          byDepth[d].push({
            name: neighbor,
            tokens: this.graph.nodes[neighbor]?.tokens || 0,
          });
        }
      }
      frontier = nextFrontier;
    }

    return { target: memoryName, byDepth };
  }

  /**
   * Get a full cluster by ID or label
   */
  cluster(clusterIdOrLabel) {
    const topic = this.clusters.topics.find(
      t => t.id === clusterIdOrLabel || t.label.toLowerCase().includes(clusterIdOrLabel.toLowerCase())
    );
    if (!topic) return { error: `Cluster "${clusterIdOrLabel}" not found` };
    return topic;
  }

  /**
   * Record a memory access (for session pattern learning)
   */
  recordAccess(memoryName) {
    if (this.graph.nodes[memoryName]) {
      this.graph.nodes[memoryName].lastAccessed = new Date().toISOString();
      this.graph.nodes[memoryName].accessCount = (this.graph.nodes[memoryName].accessCount || 0) + 1;
    }
  }

  /**
   * Record a session sequence (memories accessed together)
   */
  recordSessionSequence(memoryNames) {
    if (memoryNames.length < 2) return;

    // Check if this sequence already exists
    const existing = this.sessions.sequences.find(
      s => JSON.stringify(s.memories) === JSON.stringify(memoryNames)
    );

    if (existing) {
      existing.count++;
      existing.confidence = Math.min(1, existing.count / 10);
    } else {
      this.sessions.sequences.push({
        memories: memoryNames,
        count: 1,
        confidence: 0.1,
        lastSeen: new Date().toISOString(),
      });
    }

    // Add CO_ACCESSED edges
    for (let i = 0; i < memoryNames.length; i++) {
      for (let j = i + 1; j < memoryNames.length; j++) {
        const existingEdge = this.graph.edges.find(
          e => e.type === 'CO_ACCESSED' &&
            ((e.source === memoryNames[i] && e.target === memoryNames[j]) ||
             (e.source === memoryNames[j] && e.target === memoryNames[i]))
        );

        if (existingEdge) {
          existingEdge.confidence = Math.min(1, (existingEdge.confidence || 0.5) + 0.1);
        } else {
          this.graph.edges.push({
            source: memoryNames[i],
            target: memoryNames[j],
            type: 'CO_ACCESSED',
            confidence: 0.3,
            count: 1,
          });
        }
      }
    }

    this.save();
  }

  /**
   * Record code→memory correlation
   */
  recordCodeToMemory(filesChanged, memoriesAccessed) {
    if (!filesChanged.length || !memoriesAccessed.length) return;

    const existing = this.sessions.code_to_memory.find(
      c => JSON.stringify(c.files_changed.sort()) === JSON.stringify(filesChanged.sort())
    );

    if (existing) {
      existing.count++;
      existing.confidence = Math.min(1, existing.count / 5);
      // Merge memories
      for (const m of memoriesAccessed) {
        if (!existing.memories_accessed.includes(m)) {
          existing.memories_accessed.push(m);
        }
      }
    } else {
      this.sessions.code_to_memory.push({
        files_changed: filesChanged,
        memories_accessed: memoriesAccessed,
        count: 1,
        confidence: 0.2,
      });
    }

    this.save();
  }

  /**
   * Predict next memories based on session patterns
   */
  predictNext(currentMemory) {
    const predictions = [];

    // Check session sequences
    for (const seq of this.sessions.sequences) {
      const idx = seq.memories.indexOf(currentMemory);
      if (idx >= 0 && idx < seq.memories.length - 1) {
        const next = seq.memories[idx + 1];
        predictions.push({
          name: next,
          confidence: seq.confidence,
          reason: `session pattern (seen ${seq.count}x)`,
        });
      }
    }

    // Check CO_ACCESSED edges
    const coAccessed = this.graph.edges
      .filter(e => e.type === 'CO_ACCESSED' &&
        (e.source === currentMemory || e.target === currentMemory))
      .map(e => ({
        name: e.source === currentMemory ? e.target : e.source,
        confidence: e.confidence,
        reason: 'co-accessed',
      }));

    predictions.push(...coAccessed);

    // Deduplicate and sort
    const seen = new Set();
    return predictions
      .filter(p => {
        if (seen.has(p.name)) return false;
        seen.add(p.name);
        return true;
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  /**
   * Find memories related to code changes
   */
  findByCodeChanges(filesChanged) {
    const results = [];

    for (const mapping of this.sessions.code_to_memory) {
      const matchingFiles = mapping.files_changed.filter(f =>
        filesChanged.some(changed => changed.includes(f) || f.includes(changed))
      );

      if (matchingFiles.length > 0) {
        for (const memory of mapping.memories_accessed) {
          results.push({
            name: memory,
            confidence: mapping.confidence * (matchingFiles.length / mapping.files_changed.length),
            reason: `code pattern: ${matchingFiles.join(', ')}`,
          });
        }
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Check if index is stale
   */
  isStale(currentMemoryCount) {
    if (!this.meta.lastIndexed) return true;
    if (this.meta.memoryCount !== currentMemoryCount) return true;

    // Stale if older than 1 hour
    const age = Date.now() - new Date(this.meta.lastIndexed).getTime();
    return age > 3600000;
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      ...this.meta,
      clusters: this.clusters.topics.length,
      sessions: this.sessions.sequences.length,
      codePatterns: this.sessions.code_to_memory.length,
    };
  }
}

export default BrainNexus;
