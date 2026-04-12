#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

export class DreamLordLearner {
  constructor(memoryDir) {
    this.memoryDir = memoryDir;
    this.learningPath = path.join(memoryDir, 'dreamlord-learning.json');
    this.learning = this.loadLearning();
  }

  loadLearning() {
    if (fs.existsSync(this.learningPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.learningPath, 'utf-8'));
      } catch (e) {
        return this.defaultLearning();
      }
    }
    return this.defaultLearning();
  }

  defaultLearning() {
    return {
      consolidations: 0,
      predictions: { total: 0, accurate: 0 },
      threshold_adjustments: [],
      lastConsolidation: null,
    };
  }

  trackConsolidation(consolidationData) {
    this.learning.consolidations += 1;
    this.learning.lastConsolidation = {
      timestamp: new Date().toISOString(),
      reason: consolidationData.reason,
      archived: consolidationData.memoriesToArchive ? consolidationData.memoriesToArchive.length : 0,
      reduction: consolidationData.reduction || 0,
    };
    this.saveLearning();
    return this.learning.consolidations;
  }

  calculateUsefulnessScore(memories) {
    if (!Array.isArray(memories) || memories.length === 0) return 0;

    let score = 0;
    for (const memory of memories) {
      if (memory.tokens) score += Math.min(memory.tokens / 100, 1) * 10;
      if (memory.accessCount) score += Math.min(memory.accessCount / 5, 1) * 5;
    }

    return Math.round(score);
  }

  recordPrediction(predicted, actual, confidence) {
    this.learning.predictions.total += 1;
    if (predicted === actual) {
      this.learning.predictions.accurate += 1;
    }
    this.saveLearning();
    return { accuracy: (this.learning.predictions.accurate / this.learning.predictions.total * 100).toFixed(1) };
  }

  recommendThresholdAdjustment(contextSize, currentThreshold, consolidationResult) {
    const utilizationRate = contextSize / currentThreshold;
    const recommendation = { newThreshold: currentThreshold, reason: 'stable', confidence: 0 };

    if (utilizationRate > 0.9) {
      recommendation.newThreshold = Math.ceil(currentThreshold * 1.15);
      recommendation.reason = 'high_utilization';
      recommendation.confidence = 0.8;
    } else if (utilizationRate < 0.5 && consolidationResult?.status === 'not_needed') {
      recommendation.newThreshold = Math.ceil(currentThreshold * 0.85);
      recommendation.reason = 'low_utilization';
      recommendation.confidence = 0.7;
    } else if (consolidationResult?.consolidationScore > 50) {
      recommendation.newThreshold = Math.ceil(currentThreshold * 1.08);
      recommendation.reason = 'high_consolidation_value';
      recommendation.confidence = 0.75;
    }

    return recommendation;
  }

  updateThreshold(oldThreshold, newThreshold, reason) {
    const adjustment = {
      timestamp: new Date().toISOString(),
      from: oldThreshold,
      to: newThreshold,
      delta: newThreshold - oldThreshold,
      reason,
    };

    this.learning.threshold_adjustments.push(adjustment);
    if (this.learning.threshold_adjustments.length > 50) {
      this.learning.threshold_adjustments.shift();
    }

    this.saveLearning();
    return adjustment;
  }

  getAccuracy() {
    if (this.learning.predictions.total === 0) return 0;
    return (this.learning.predictions.accurate / this.learning.predictions.total * 100).toFixed(1);
  }

  getStats() {
    return {
      consolidations: this.learning.consolidations,
      predictions: this.learning.predictions,
      accuracy: this.getAccuracy(),
      lastConsolidation: this.learning.lastConsolidation,
      adjustmentCount: this.learning.threshold_adjustments.length,
    };
  }

  saveLearning() {
    fs.mkdirSync(path.dirname(this.learningPath), { recursive: true });
    fs.writeFileSync(this.learningPath, JSON.stringify(this.learning, null, 2));
  }
}
