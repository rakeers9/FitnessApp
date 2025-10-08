import { supabase } from '../supabase';

export interface ReadinessPillars {
  sleep: number;
  recovery: number;
  strain_balance: number;
  environmental: number;
}

export interface ReadinessScore {
  overall_score: number;
  sleep_score: number;
  recovery_score: number;
  strain_balance_score: number;
  environmental_score: number;
  recommendation: 'full_intensity' | 'moderate' | 'recovery' | 'rest';
  limiting_factor: string;
  insights: string[];
}

export interface SleepData {
  duration_hours: number;
  quality_score?: number;
  rem_minutes?: number;
  deep_minutes?: number;
  interruptions?: number;
  sleep_debt?: number;
}

export interface RecoveryData {
  hrv: number;
  hrv_baseline?: number;
  resting_hr: number;
  resting_hr_baseline?: number;
  muscle_soreness?: number;
  perceived_energy?: number;
}

export interface StrainData {
  recent_workouts: {
    date: string;
    intensity: number;
    duration: number;
    muscle_groups: string[];
  }[];
  weekly_volume: number;
  acute_chronic_ratio?: number;
}

export interface EnvironmentalData {
  stress_level?: number;
  nutrition_quality?: number;
  hydration_level?: number;
  weather_impact?: number;
  schedule_conflicts?: boolean;
}

export class ReadinessCalculator {
  private readonly weights = {
    sleep: 0.35,
    recovery: 0.35,
    strain_balance: 0.20,
    environmental: 0.10,
  };

  async calculateDailyReadiness(userId: string, date?: Date): Promise<ReadinessScore> {
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    const existingScore = await this.getExistingScore(userId, dateStr);
    if (existingScore) {
      return existingScore;
    }

    const [sleepData, recoveryData, strainData, environmentalData] = await Promise.all([
      this.getSleepData(userId, targetDate),
      this.getRecoveryData(userId, targetDate),
      this.getStrainData(userId, targetDate),
      this.getEnvironmentalData(userId, targetDate),
    ]);

    const sleepScore = this.calculateSleepScore(sleepData);
    const recoveryScore = this.calculateRecoveryScore(recoveryData);
    const strainScore = this.calculateStrainScore(strainData);
    const environmentalScore = this.calculateEnvironmentalScore(environmentalData);

    const overallScore = Math.round(
      sleepScore * this.weights.sleep +
      recoveryScore * this.weights.recovery +
      strainScore * this.weights.strain_balance +
      environmentalScore * this.weights.environmental
    );

    const limitingFactor = this.identifyLimitingFactor({
      sleep: sleepScore,
      recovery: recoveryScore,
      strain_balance: strainScore,
      environmental: environmentalScore,
    });

    const insights = this.generateInsights(
      sleepScore,
      recoveryScore,
      strainScore,
      environmentalScore,
      sleepData,
      recoveryData,
      strainData
    );

    const recommendation = this.getRecommendation(overallScore, limitingFactor);

    const readinessScore: ReadinessScore = {
      overall_score: overallScore,
      sleep_score: sleepScore,
      recovery_score: recoveryScore,
      strain_balance_score: strainScore,
      environmental_score: environmentalScore,
      recommendation,
      limiting_factor: limitingFactor,
      insights,
    };

    await this.saveReadinessScore(userId, dateStr, readinessScore);

    return readinessScore;
  }

  private async getSleepData(userId: string, date: Date): Promise<SleepData> {
    const dateStr = date.toISOString().split('T')[0];

    const { data: metrics } = await supabase
      .from('user_health_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_at', new Date(date.getTime() - 24 * 60 * 60 * 1000).toISOString())
      .lte('recorded_at', date.toISOString())
      .order('recorded_at', { ascending: false })
      .limit(1);

    if (metrics && metrics.length > 0) {
      const metric = metrics[0];
      return {
        duration_hours: metric.sleep_hours || 7,
        quality_score: metric.sleep_quality,
        rem_minutes: metric.rem_sleep_minutes,
        deep_minutes: metric.deep_sleep_minutes,
        interruptions: metric.sleep_interruptions,
        sleep_debt: await this.calculateSleepDebt(userId),
      };
    }

    return {
      duration_hours: 7,
      quality_score: 75,
    };
  }

  private async getRecoveryData(userId: string, date: Date): Promise<RecoveryData> {
    const { data: metrics } = await supabase
      .from('user_health_metrics')
      .select('*')
      .eq('user_id', userId)
      .lte('recorded_at', date.toISOString())
      .order('recorded_at', { ascending: false })
      .limit(7);

    if (metrics && metrics.length > 0) {
      const latest = metrics[0];
      const hrvBaseline = metrics.length >= 3
        ? metrics.slice(0, 3).reduce((acc, m) => acc + (m.hrv || 0), 0) / 3
        : latest.hrv;

      const hrBaseline = metrics.length >= 3
        ? metrics.slice(0, 3).reduce((acc, m) => acc + (m.resting_hr || 0), 0) / 3
        : latest.resting_hr;

      return {
        hrv: latest.hrv || 50,
        hrv_baseline: hrvBaseline,
        resting_hr: latest.resting_hr || 60,
        resting_hr_baseline: hrBaseline,
        muscle_soreness: latest.muscle_soreness,
        perceived_energy: latest.perceived_energy,
      };
    }

    return {
      hrv: 50,
      resting_hr: 60,
    };
  }

  private async getStrainData(userId: string, date: Date): Promise<StrainData> {
    const weekAgo = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data: workouts } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', weekAgo.toISOString())
      .lte('created_at', date.toISOString())
      .order('created_at', { ascending: false });

    const recentWorkouts = (workouts || []).map(w => ({
      date: w.created_at,
      intensity: w.intensity_level || 5,
      duration: w.duration_minutes || 0,
      muscle_groups: w.muscle_groups || [],
    }));

    const weeklyVolume = recentWorkouts.reduce((acc, w) => acc + w.duration, 0);

    const acuteLoad = this.calculateAcuteLoad(recentWorkouts);
    const chronicLoad = await this.calculateChronicLoad(userId, date);
    const acuteChronicRatio = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;

    return {
      recent_workouts: recentWorkouts,
      weekly_volume: weeklyVolume,
      acute_chronic_ratio: acuteChronicRatio,
    };
  }

  private async getEnvironmentalData(userId: string, date: Date): Promise<EnvironmentalData> {
    const { data: settings } = await supabase
      .from('user_ai_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    return {
      stress_level: settings?.contextual_factors?.stress_level || 5,
      nutrition_quality: settings?.contextual_factors?.nutrition_quality || 7,
      hydration_level: settings?.contextual_factors?.hydration_level || 7,
      weather_impact: 0,
      schedule_conflicts: false,
    };
  }

  private calculateSleepScore(data: SleepData): number {
    let score = 0;

    const durationScore = this.scoreSleepDuration(data.duration_hours);
    score += durationScore * 0.4;

    if (data.quality_score !== undefined) {
      score += data.quality_score * 0.3;
    } else {
      score += 75 * 0.3;
    }

    if (data.deep_minutes !== undefined && data.rem_minutes !== undefined) {
      const deepScore = Math.min(100, (data.deep_minutes / 90) * 100);
      const remScore = Math.min(100, (data.rem_minutes / 90) * 100);
      score += ((deepScore + remScore) / 2) * 0.2;
    } else {
      score += 75 * 0.2;
    }

    if (data.sleep_debt !== undefined) {
      const debtPenalty = Math.min(20, data.sleep_debt * 2);
      score -= debtPenalty * 0.1;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private scoreSleepDuration(hours: number): number {
    if (hours >= 7 && hours <= 9) return 100;
    if (hours >= 6 && hours < 7) return 85;
    if (hours > 9 && hours <= 10) return 90;
    if (hours >= 5 && hours < 6) return 70;
    if (hours > 10) return 80;
    return 50;
  }

  private calculateRecoveryScore(data: RecoveryData): number {
    let score = 0;

    if (data.hrv_baseline) {
      const hrvRatio = data.hrv / data.hrv_baseline;
      if (hrvRatio >= 1.0) {
        score += Math.min(100, 75 + (hrvRatio - 1) * 100) * 0.4;
      } else {
        score += Math.max(25, hrvRatio * 75) * 0.4;
      }
    } else {
      score += 75 * 0.4;
    }

    if (data.resting_hr_baseline) {
      const hrRatio = data.resting_hr / data.resting_hr_baseline;
      if (hrRatio <= 1.0) {
        score += Math.min(100, 75 + (1 - hrRatio) * 100) * 0.3;
      } else {
        score += Math.max(25, (2 - hrRatio) * 75) * 0.3;
      }
    } else {
      score += 75 * 0.3;
    }

    if (data.muscle_soreness !== undefined) {
      score += (10 - data.muscle_soreness) * 10 * 0.15;
    } else {
      score += 75 * 0.15;
    }

    if (data.perceived_energy !== undefined) {
      score += data.perceived_energy * 10 * 0.15;
    } else {
      score += 75 * 0.15;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private calculateStrainScore(data: StrainData): number {
    let score = 75;

    const daysSinceLastWorkout = data.recent_workouts.length > 0
      ? Math.floor((Date.now() - new Date(data.recent_workouts[0].date).getTime()) / (1000 * 60 * 60 * 24))
      : 3;

    if (daysSinceLastWorkout === 0) {
      score = 50;
    } else if (daysSinceLastWorkout === 1) {
      score = 75;
    } else if (daysSinceLastWorkout === 2) {
      score = 90;
    } else if (daysSinceLastWorkout >= 3) {
      score = 100;
    }

    if (data.acute_chronic_ratio !== undefined) {
      if (data.acute_chronic_ratio > 1.5) {
        score -= 25;
      } else if (data.acute_chronic_ratio > 1.3) {
        score -= 15;
      } else if (data.acute_chronic_ratio < 0.8) {
        score -= 10;
      }
    }

    const consecutiveHighIntensity = this.countConsecutiveHighIntensity(data.recent_workouts);
    if (consecutiveHighIntensity >= 3) {
      score -= 20;
    } else if (consecutiveHighIntensity >= 2) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private calculateEnvironmentalScore(data: EnvironmentalData): number {
    let score = 0;

    if (data.stress_level !== undefined) {
      score += (10 - data.stress_level) * 10 * 0.4;
    } else {
      score += 75 * 0.4;
    }

    if (data.nutrition_quality !== undefined) {
      score += data.nutrition_quality * 10 * 0.3;
    } else {
      score += 75 * 0.3;
    }

    if (data.hydration_level !== undefined) {
      score += data.hydration_level * 10 * 0.2;
    } else {
      score += 75 * 0.2;
    }

    if (data.schedule_conflicts) {
      score -= 20 * 0.1;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private identifyLimitingFactor(scores: ReadinessPillars): string {
    const entries = Object.entries(scores);
    const [worstPillar, worstScore] = entries.reduce((min, curr) =>
      curr[1] < min[1] ? curr : min
    );

    if (worstScore < 50) {
      const pillarNames: any = {
        sleep: 'Sleep quality',
        recovery: 'Physical recovery',
        strain_balance: 'Training load balance',
        environmental: 'Lifestyle factors',
      };
      return pillarNames[worstPillar];
    }

    return 'None - all systems ready';
  }

  private generateInsights(
    sleep: number,
    recovery: number,
    strain: number,
    environmental: number,
    sleepData: SleepData,
    recoveryData: RecoveryData,
    strainData: StrainData
  ): string[] {
    const insights = [];

    if (sleep < 60) {
      insights.push(`Sleep score is low (${sleep}%). Aim for 7-9 hours tonight.`);
    } else if (sleep > 90) {
      insights.push(`Excellent sleep recovery (${sleep}%). Ready for high intensity.`);
    }

    if (recovery < 60) {
      if (recoveryData.hrv < (recoveryData.hrv_baseline || 50) * 0.9) {
        insights.push('HRV below baseline. Consider recovery-focused training.');
      }
      if (recoveryData.resting_hr > (recoveryData.resting_hr_baseline || 60) * 1.1) {
        insights.push('Elevated resting heart rate indicates stress or fatigue.');
      }
    }

    if (strain < 60) {
      if (strainData.acute_chronic_ratio && strainData.acute_chronic_ratio > 1.3) {
        insights.push('Training load spike detected. Recovery priority today.');
      }
      const consecutiveDays = this.countConsecutiveDays(strainData.recent_workouts);
      if (consecutiveDays >= 4) {
        insights.push(`${consecutiveDays} consecutive training days. Rest recommended.`);
      }
    } else if (strain > 90) {
      insights.push('Well recovered. Ideal day for challenging workout.');
    }

    if (environmental < 60) {
      insights.push('Lifestyle stress is high. Consider lighter training.');
    }

    if (insights.length === 0 && sleep >= 75 && recovery >= 75) {
      insights.push('All systems optimal. Ready for peak performance.');
    }

    return insights;
  }

  private getRecommendation(
    overallScore: number,
    limitingFactor: string
  ): 'full_intensity' | 'moderate' | 'recovery' | 'rest' {
    if (overallScore >= 80) {
      return 'full_intensity';
    } else if (overallScore >= 60) {
      return 'moderate';
    } else if (overallScore >= 40) {
      return 'recovery';
    } else {
      return 'rest';
    }
  }

  private async calculateSleepDebt(userId: string): Promise<number> {
    const { data: metrics } = await supabase
      .from('user_health_metrics')
      .select('sleep_hours')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(7);

    if (!metrics || metrics.length === 0) return 0;

    const totalSleep = metrics.reduce((acc, m) => acc + (m.sleep_hours || 0), 0);
    const targetSleep = 7 * 8; // 8 hours per night for 7 days
    const debt = Math.max(0, targetSleep - totalSleep);

    return debt;
  }

  private calculateAcuteLoad(workouts: any[]): number {
    const sevenDays = workouts.filter(w => {
      const daysAgo = Math.floor((Date.now() - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24));
      return daysAgo < 7;
    });

    return sevenDays.reduce((acc, w) => acc + (w.duration * w.intensity), 0);
  }

  private async calculateChronicLoad(userId: string, date: Date): Promise<number> {
    const fourWeeksAgo = new Date(date.getTime() - 28 * 24 * 60 * 60 * 1000);

    const { data: workouts } = await supabase
      .from('workout_sessions')
      .select('duration_minutes, intensity_level')
      .eq('user_id', userId)
      .gte('created_at', fourWeeksAgo.toISOString())
      .lte('created_at', date.toISOString());

    if (!workouts || workouts.length === 0) return 100;

    const totalLoad = workouts.reduce((acc, w) =>
      acc + ((w.duration_minutes || 0) * (w.intensity_level || 5)), 0
    );

    return totalLoad / 4; // Average over 4 weeks
  }

  private countConsecutiveHighIntensity(workouts: any[]): number {
    let count = 0;
    for (const workout of workouts) {
      if (workout.intensity >= 7) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  private countConsecutiveDays(workouts: any[]): number {
    if (workouts.length === 0) return 0;

    let count = 1;
    for (let i = 0; i < workouts.length - 1; i++) {
      const current = new Date(workouts[i].date);
      const next = new Date(workouts[i + 1].date);
      const daysDiff = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  private async getExistingScore(userId: string, dateStr: string): Promise<ReadinessScore | null> {
    const { data } = await supabase
      .from('daily_readiness_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .single();

    if (data) {
      return {
        overall_score: data.overall_score,
        sleep_score: data.sleep_score,
        recovery_score: data.recovery_score,
        strain_balance_score: data.strain_balance_score,
        environmental_score: data.environmental_score,
        recommendation: data.recommendation,
        limiting_factor: data.limiting_factor,
        insights: data.insights || [],
      };
    }

    return null;
  }

  private async saveReadinessScore(userId: string, dateStr: string, score: ReadinessScore): Promise<void> {
    try {
      await supabase
        .from('daily_readiness_scores')
        .upsert({
          user_id: userId,
          date: dateStr,
          overall_score: score.overall_score,
          sleep_score: score.sleep_score,
          recovery_score: score.recovery_score,
          strain_balance_score: score.strain_balance_score,
          environmental_score: score.environmental_score,
          recommendation: score.recommendation,
          limiting_factor: score.limiting_factor,
          insights: score.insights,
          calculated_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error saving readiness score:', error);
    }
  }

  async recalculateHistoricalReadiness(userId: string, days: number = 30): Promise<void> {
    const dates = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date);
    }

    for (const date of dates) {
      await this.calculateDailyReadiness(userId, date);
    }
  }
}

export const readinessCalculator = new ReadinessCalculator();