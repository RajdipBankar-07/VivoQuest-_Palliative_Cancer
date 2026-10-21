import { IDailyVitals, IRiskIndicator } from '../models/DailyHealthUpdate.js';

export interface EvaluatedRiskResult {
  overallLevel: 'high' | 'medium' | 'low' | 'unclassified';
  requiresReview: boolean;
  indicators: IRiskIndicator[];
  primaryReason: string;
  source: string;
  timestamp: Date;
}

const RED_FLAG_SYMPTOMS = [
  'chest pain',
  'severe shortness of breath',
  'breathlessness',
  'loss of consciousness',
  'severe dyspnea',
  'unresponsive',
  'hemoptysis',
  'coughing blood',
  'acute confusion',
  'severe dizziness',
];

/**
 * Objective, explainable clinical rule engine based on approved clinical safety guidelines.
 * NO black-box AI diagnosis or hallucinated scores. Every flag explicitly explains its clinical reason and source.
 */
export function evaluateClinicalRisk(
  vitals?: IDailyVitals,
  symptoms?: string[],
  overdueDays: number = 0
): EvaluatedRiskResult {
  const indicators: IRiskIndicator[] = [];
  const now = new Date();
  const source = 'VivoQuest Clinical Safety Protocols (Approved Guideline)';

  // 1. Oxygen Saturation (SpO2)
  if (vitals?.spO2 !== undefined && vitals.spO2 !== null) {
    if (vitals.spO2 < 90) {
      indicators.push({
        level: 'high',
        reason: `Severe Hypoxemia: SpO2 recorded at ${vitals.spO2}% (clinical safety threshold is ≥ 92%).`,
        source,
        flaggedAt: now,
      });
    } else if (vitals.spO2 < 92) {
      indicators.push({
        level: 'high',
        reason: `Moderate Hypoxemia: SpO2 recorded at ${vitals.spO2}% (below 92% clinical target).`,
        source,
        flaggedAt: now,
      });
    } else if (vitals.spO2 <= 94) {
      indicators.push({
        level: 'medium',
        reason: `Borderline Oxygen Saturation: SpO2 at ${vitals.spO2}% warrants active clinician monitoring.`,
        source,
        flaggedAt: now,
      });
    }
  }

  // 2. Blood Pressure (BP)
  if (vitals?.bloodPressure) {
    const parts = vitals.bloodPressure.split('/').map((p) => parseInt(p.trim(), 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const [sys, dia] = parts;
      if (sys >= 170 || dia >= 105) {
        indicators.push({
          level: 'high',
          reason: `Severe Hypertensive Range: BP ${vitals.bloodPressure} mmHg requires immediate clinical triage.`,
          source,
          flaggedAt: now,
        });
      } else if (sys >= 160 || dia >= 100) {
        indicators.push({
          level: 'high',
          reason: `Stage 2 Hypertension: BP ${vitals.bloodPressure} mmHg exceeded upper safety limit.`,
          source,
          flaggedAt: now,
        });
      } else if (sys < 90 || dia < 60) {
        indicators.push({
          level: 'high',
          reason: `Hypotension Alert: BP ${vitals.bloodPressure} mmHg below minimal perfusion threshold.`,
          source,
          flaggedAt: now,
        });
      } else if (sys >= 140 || dia >= 90) {
        indicators.push({
          level: 'medium',
          reason: `Elevated Blood Pressure: BP ${vitals.bloodPressure} mmHg (pre-hypertensive/stage 1).`,
          source,
          flaggedAt: now,
        });
      }
    }
  }

  // 3. Heart Rate / Pulse
  if (vitals?.pulse !== undefined && vitals.pulse !== null) {
    if (vitals.pulse > 130) {
      indicators.push({
        level: 'high',
        reason: `Marked Tachycardia: Pulse ${vitals.pulse} bpm significantly exceeds resting baseline (> 130 bpm).`,
        source,
        flaggedAt: now,
      });
    } else if (vitals.pulse > 110) {
      indicators.push({
        level: 'medium',
        reason: `Elevated Heart Rate: Pulse ${vitals.pulse} bpm (> 110 bpm).`,
        source,
        flaggedAt: now,
      });
    } else if (vitals.pulse < 50) {
      indicators.push({
        level: 'medium',
        reason: `Bradycardia Alert: Pulse ${vitals.pulse} bpm (< 50 bpm).`,
        source,
        flaggedAt: now,
      });
    }
  }

  // 4. Blood Glucose
  if (vitals?.glucose !== undefined && vitals.glucose !== null) {
    if (vitals.glucose > 280) {
      indicators.push({
        level: 'high',
        reason: `Severe Hyperglycemia: Blood glucose ${vitals.glucose} mg/dL requires urgent medical review.`,
        source,
        flaggedAt: now,
      });
    } else if (vitals.glucose < 65) {
      indicators.push({
        level: 'high',
        reason: `Hypoglycemia Warning: Blood glucose ${vitals.glucose} mg/dL below safe glycemic threshold (< 65 mg/dL).`,
        source,
        flaggedAt: now,
      });
    } else if (vitals.glucose > 200 || vitals.glucose < 75) {
      indicators.push({
        level: 'medium',
        reason: `Unstable Glycemia: Blood glucose documented at ${vitals.glucose} mg/dL.`,
        source,
        flaggedAt: now,
      });
    }
  }

  // 5. Severe Pain Scale
  if (vitals?.painScale !== undefined && vitals.painScale !== null) {
    if (vitals.painScale >= 8) {
      indicators.push({
        level: 'high',
        reason: `Severe Breakthrough Pain: Reported pain score ${vitals.painScale}/10 requires prompt analgesic adjustment.`,
        source,
        flaggedAt: now,
      });
    } else if (vitals.painScale >= 6) {
      indicators.push({
        level: 'medium',
        reason: `Moderate Pain: Reported pain score ${vitals.painScale}/10.`,
        source,
        flaggedAt: now,
      });
    }
  }

  // 6. Body Temperature
  if (vitals?.temperature !== undefined && vitals.temperature !== null) {
    if (vitals.temperature >= 102) {
      indicators.push({
        level: 'medium',
        reason: `Febrile Temperature: Body temp ${vitals.temperature}°F indicates potential infection/fever spike.`,
        source,
        flaggedAt: now,
      });
    }
  }

  // 7. Red Flag Symptoms
  if (symptoms && symptoms.length > 0) {
    for (const symptom of symptoms) {
      const lower = symptom.toLowerCase();
      for (const flag of RED_FLAG_SYMPTOMS) {
        if (lower.includes(flag)) {
          indicators.push({
            level: 'high',
            reason: `Urgent Clinical Symptom Reported: "${symptom}". Immediate clinician review recommended.`,
            source,
            flaggedAt: now,
          });
          break;
        }
      }
    }
  }

  // 8. Overdue Follow-up Care
  if (overdueDays > 7) {
    indicators.push({
      level: 'medium',
      reason: `Care Plan Overdue: Patient follow-up is overdue by ${overdueDays} days.`,
      source,
      flaggedAt: now,
    });
  }

  // Determine overall risk
  let overallLevel: 'high' | 'medium' | 'low' | 'unclassified' = 'low';
  let primaryReason = 'Vital signs and symptoms are within documented baseline limits.';

  if (indicators.some((i) => i.level === 'high')) {
    overallLevel = 'high';
    primaryReason = indicators.find((i) => i.level === 'high')!.reason;
  } else if (indicators.some((i) => i.level === 'medium')) {
    overallLevel = 'medium';
    primaryReason = indicators.find((i) => i.level === 'medium')!.reason;
  } else if (!vitals && (!symptoms || symptoms.length === 0)) {
    overallLevel = 'unclassified';
    primaryReason = 'No recent vitals or daily updates recorded. Needs clinician review.';
  }

  return {
    overallLevel,
    requiresReview: overallLevel === 'high' || overallLevel === 'medium' || overdueDays > 0,
    indicators,
    primaryReason,
    source,
    timestamp: now,
  };
}
