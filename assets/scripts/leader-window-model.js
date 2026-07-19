export const DEFAULT_LEADER_WINDOW_PARAMS = Object.freeze({
    maxLeaderGapMin: 5,
    maxTargetRecoveryGapMin: 16,
    targetGapCandidatesMin: Object.freeze([16, 20, 30]),
    minLeaderMessages: 5,
    contextMin: 10,
    denseBucketMin: 5,
    minDenseMessages: 20,
    minDenseParticipants: 8,
    minDenseSwitchRate: 0.75,
    visibleWindowLimitPerDay: 5
});

export const LEADER_WINDOW_KIND_META = Object.freeze({
    semantic_long_explanation: Object.freeze({
        label: '긴 설명 후보',
        shortLabel: '긴설명',
        className: 'semantic-long'
    }),
    semantic_short_principle: Object.freeze({
        label: '원칙 발화 후보',
        shortLabel: '원칙',
        className: 'semantic-short'
    }),
    semantic_balanced: Object.freeze({
        label: '의미 후보',
        shortLabel: '의미',
        className: 'semantic-balanced'
    }),
    semantic_context_review: Object.freeze({
        label: '문맥 확인',
        shortLabel: '문맥',
        className: 'semantic-context'
    }),
    dense_context_trigger: Object.freeze({
        label: '반응량 참고',
        shortLabel: '반응',
        className: 'dense-context'
    }),
    target_floor_stable: Object.freeze({
        label: '긴 설명 후보',
        shortLabel: '긴설명',
        className: 'semantic-long'
    }),
    target_floor_recovery: Object.freeze({
        label: '의미 후보',
        shortLabel: '의미',
        className: 'semantic-balanced'
    }),
    target_floor_sparse: Object.freeze({
        label: '문맥 확인',
        shortLabel: '문맥',
        className: 'semantic-context'
    }),
    dense_switching: Object.freeze({
        label: '반응량 참고',
        shortLabel: '반응',
        className: 'dense-context'
    }),
    grace_candidate: Object.freeze({
        label: '긴 설명 후보',
        shortLabel: '긴설명',
        className: 'semantic-long'
    }),
    revival_candidate: Object.freeze({
        label: '반응량 참고',
        shortLabel: '반응',
        className: 'dense-context'
    }),
    mixed_candidate: Object.freeze({
        label: '문맥 확인',
        shortLabel: '문맥',
        className: 'semantic-context'
    }),
    review_candidate: Object.freeze({
        label: '검토 후보',
        shortLabel: '검토',
        className: 'review'
    })
});

export const LEADER_WINDOW_STRENGTH_META = Object.freeze({
    strong: Object.freeze({
        label: '강',
        className: 'strong'
    }),
    medium: Object.freeze({
        label: '중',
        className: 'medium'
    }),
    weak: Object.freeze({
        label: '약',
        className: 'weak'
    }),
    review: Object.freeze({
        label: '검토',
        className: 'review'
    })
});

export function round(value, digits = 4) {
    if (!Number.isFinite(value)) return 0;
    const scale = 10 ** digits;
    return Math.round(value * scale) / scale;
}

export function average(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function quantile(values, percentile) {
    if (!values.length) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * percentile))];
}

function adaptiveBenchmark(stats, key, fallback) {
    const value = Number(stats?.[key]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function cappedRatio(value, benchmark) {
    return Math.min(1, (Number(value) || 0) / Math.max(1, benchmark));
}

export function scoreTargetFloorWindow(features) {
    const duration = Math.min(1, features.durationMin / 20);
    const volume = Math.min(1, features.leaderMessages / 30);
    const density = Math.min(1, features.leaderDensityPerMin / 2);
    const charDensity = Math.min(1, features.leaderCharDensityPerMin / 120);
    const run = Math.min(1, features.maxLeaderRun / 15);
    const lowInterruption = 1 - Math.min(1, features.interruptionRate);
    const recovery = 1 - Math.min(1, features.leaderGapP90Sec / 960);

    return round(
        features.leaderMessageShare * 0.20 +
        features.leaderCharShare * 0.18 +
        duration * 0.13 +
        volume * 0.14 +
        density * 0.13 +
        charDensity * 0.10 +
        run * 0.06 +
        lowInterruption * 0.03 +
        recovery * 0.03
    );
}

export function scoreDenseSwitchingWindow(features) {
    const crowd = Math.min(1, features.participants / 25);
    const density = Math.min(1, features.messageDensityPerMin / 8);
    const switching = Math.min(1, features.speakerSwitchRate);
    const multiSpeaker = Math.min(1, features.nonLeaderParticipants / 12);
    const targetNotDominant = 1 - Math.min(1, Math.max(0, features.leaderMessageShare - 0.55) / 0.45);
    const afterWave = Math.min(1, features.afterContextNonLeaderMessages / 40);

    return round(crowd * 0.22 + density * 0.25 + switching * 0.22 + multiSpeaker * 0.14 + targetNotDominant * 0.10 + afterWave * 0.07);
}

export function scoreMeaningPotentialWindow(features, stats = {}) {
    if (features.analysisKind === 'dense_switching') {
        return scoreDenseSwitchingWindow(features);
    }

    const duration = cappedRatio(features.durationMin, adaptiveBenchmark(stats, 'durationP80', 35));
    const volume = cappedRatio(features.leaderMessages, adaptiveBenchmark(stats, 'leaderMessagesP80', 24));
    const charVolume = cappedRatio(features.leaderChars, adaptiveBenchmark(stats, 'leaderCharsP80', 1000));
    const density = cappedRatio(features.leaderDensityPerMin, adaptiveBenchmark(stats, 'leaderDensityP70', 1.2));
    const charDensity = cappedRatio(features.leaderCharDensityPerMin, adaptiveBenchmark(stats, 'leaderCharDensityP70', 70));
    const purity = Math.max(features.leaderMessageShare || 0, features.leaderCharShare || 0);
    const lowInterruption = 1 - Math.min(1, (features.maxInterruptionBurstMessages || 0) / 8);
    const shortPrincipleBonus = features.durationMin <= 8 &&
        features.leaderMessages >= 5 &&
        features.leaderMessageShare >= 0.70 &&
        features.leaderCharDensityPerMin >= 30
        ? 0.08
        : 0;

    return round(Math.min(1,
        purity * 0.18 +
        duration * 0.16 +
        volume * 0.16 +
        charVolume * 0.16 +
        density * 0.12 +
        charDensity * 0.12 +
        lowInterruption * 0.06 +
        shortPrincipleBonus
    ));
}

export function scoreBoundaryConfidenceWindow(features) {
    if (features.analysisKind === 'dense_switching') {
        return round(Math.min(1,
            Math.min(1, features.messageDensityPerMin / 8) * 0.35 +
            Math.min(1, features.speakerSwitchRate || 0) * 0.35 +
            Math.min(1, features.participants / 25) * 0.30
        ));
    }

    const gapLimitSec = Math.max(60, (features.sourceGapMin || features.maxTargetRecoveryGapMin || 16) * 60);
    const gapStability = 1 - Math.min(1, (features.leaderGapP90Sec || 0) / gapLimitSec);
    const interruption = 1 - Math.min(1, (features.maxInterruptionBurstMessages || 0) / 10);
    const duration = Number(features.durationMin) || 0;
    const durationBand = duration >= 8 && duration <= 45
        ? 1
        : duration > 45 && duration <= 90
            ? 0.72
            : duration > 90
                ? 0.42
                : 0.62;
    const gapPenalty = (features.sourceGapMin || 0) >= 30 ? 0.08 : 0;

    return round(Math.max(0, Math.min(1,
        durationBand * 0.34 +
        gapStability * 0.28 +
        interruption * 0.22 +
        (features.leaderMessageShare || 0) * 0.16 -
        gapPenalty
    )));
}

export function scoreContextExpansionWindow(features) {
    const before = Math.min(1, (features.beforeContextNonLeaderMessages || 0) / 30);
    const after = Math.min(1, (features.afterContextNonLeaderMessages || 0) / 40);
    const participants = Math.min(1, (features.nonLeaderParticipants || 0) / 16);
    const switching = Math.min(1, features.speakerSwitchRate || 0);

    if (features.analysisKind === 'dense_switching') {
        return round(Math.max(scoreDenseSwitchingWindow(features), before * 0.15 + after * 0.30 + participants * 0.25 + switching * 0.30));
    }

    return round(before * 0.16 + after * 0.34 + participants * 0.22 + switching * 0.18 + Math.min(1, (features.maxInterruptionBurstMessages || 0) / 12) * 0.10);
}

export function classifyLeaderWindow(features, stats = {}) {
    if (features.analysisKind === 'dense_switching') {
        if (
            features.contextExpansionScore >= 0.55 &&
            features.totalMessages >= 20 &&
            features.participants >= 8 &&
            features.speakerSwitchRate >= 0.75
        ) return 'dense_context_trigger';
        return 'review_candidate';
    }

    const targetOwned = features.leaderMessages >= 5 && features.leaderMessageShare >= 0.60;
    if (!targetOwned || features.meaningPotentialScore < 0.48) return 'review_candidate';

    const shortPrinciple = (
        features.durationMin <= 8 &&
        features.leaderMessages >= 5 &&
        features.leaderMessageShare >= 0.70 &&
        features.meaningPotentialScore >= 0.55 &&
        features.boundaryConfidenceScore >= 0.45
    );
    if (shortPrinciple) return 'semantic_short_principle';

    const longThreshold = Math.max(16, adaptiveBenchmark(stats, 'durationP70', 18));
    const longExplanation = (
        features.durationMin >= longThreshold &&
        features.leaderMessages >= Math.max(8, Math.min(14, adaptiveBenchmark(stats, 'leaderMessagesP60', 10))) &&
        features.meaningPotentialScore >= 0.56
    );
    if (longExplanation && features.boundaryConfidenceScore >= 0.42) return 'semantic_long_explanation';

    const sparseByDensity = features.durationMin >= 15 && (
        features.leaderDensityPerMin < 0.60 ||
        features.leaderMessages < 15 ||
        (features.leaderDensityPerMin < 0.75 && features.leaderCharDensityPerMin < 40)
    );
    if (features.leaderMessageShare >= 0.75 && sparseByDensity) return 'semantic_context_review';

    if (features.boundaryConfidenceScore < 0.45 || features.contextExpansionScore >= 0.45) {
        return 'semantic_context_review';
    }

    if (features.durationMin >= 8 && features.leaderMessages >= 8 && features.meaningPotentialScore >= 0.52) {
        return 'semantic_balanced';
    }

    return 'review_candidate';
}

export function isLeaderWindowCandidate(window) {
    return window && window.kindHint !== 'review_candidate';
}

export function getLeaderWindowKindMeta(kindHint) {
    return LEADER_WINDOW_KIND_META[kindHint] || LEADER_WINDOW_KIND_META.review_candidate;
}

export function getLeaderWindowStrengthMeta(strength) {
    return LEADER_WINDOW_STRENGTH_META[strength] || LEADER_WINDOW_STRENGTH_META.review;
}

export function classifyLeaderWindowStrength(window) {
    const score = getLeaderWindowPrimaryScore(window);
    if (window?.kindHint === 'semantic_context_review' || window?.kindHint === 'target_floor_sparse') {
        if (score >= 0.72) return 'medium';
        return 'weak';
    }
    if (window?.kindHint === 'dense_context_trigger' || window?.kindHint === 'dense_switching') {
        if (score >= 0.82) return 'strong';
        if (score >= 0.65) return 'medium';
        return 'weak';
    }
    if (score >= 0.75) return 'strong';
    if (score >= 0.60) return 'medium';
    if (score >= 0.45) return 'weak';
    return 'review';
}

export function getLeaderWindowPrimaryScore(window) {
    if (!window) return 0;
    if (window.kindHint === 'dense_context_trigger' || window.kindHint === 'dense_switching' || window.kindHint === 'revival_candidate') {
        return window.contextExpansionScore || window.denseSwitchingScore || window.revivalScore || 0;
    }
    if (window.kindHint === 'semantic_context_review' || window.kindHint === 'mixed_candidate') {
        return Math.max(window.meaningPotentialScore || 0, window.contextExpansionScore || 0, window.targetFloorScore || window.graceScore || 0);
    }
    return window.meaningPotentialScore || window.targetFloorScore || window.graceScore || 0;
}

export const scoreGraceWindow = scoreTargetFloorWindow;
export const scoreRevivalWindow = scoreDenseSwitchingWindow;
