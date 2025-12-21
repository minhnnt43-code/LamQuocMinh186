// ============================================================
// REPORT-GENERATOR.JS - Automated Report Generation
// Phase 5: Analytics & Insights
// ============================================================

/**
 * Report Generator - Creates formatted productivity reports
 */

import { analyticsEngine } from './analytics-engine.js';
import { trendAnalyzer } from './trend-analyzer.js';
import { insightEngine } from './insight-engine.js';

export class ReportGenerator {
    constructor() {
        this.reportTypes = ['daily', 'weekly', 'monthly', 'custom'];
        this.lastReports = new Map();
    }

    // ============================================================
    // REPORT GENERATION
    // ============================================================

    /**
     * Generate productivity report
     * @param {string} type - Report type
     * @param {Object} options - Report options
     * @returns {Object} Generated report
     */
    generateReport(type = 'weekly', options = {}) {
        const period = type === 'daily' ? 'day' : type === 'monthly' ? 'month' : 'week';

        const productivity = analyticsEngine.getProductivityAnalytics({ period });
        const trends = type !== 'daily' ? trendAnalyzer.analyzeProductivityTrends() : null;
        const insights = insightEngine.getTopInsights(5);

        const report = {
            type,
            generatedAt: new Date().toISOString(),
            period: {
                type: period,
                start: this._getPeriodStart(period),
                end: new Date().toISOString()
            },
            summary: this._generateSummary(productivity, trends),
            metrics: this._compileMetrics(productivity),
            highlights: this._compileHighlights(productivity, trends),
            insights: insights.slice(0, 3),
            charts: this._prepareChartData(productivity),
            recommendations: this._compileRecommendations(productivity, trends)
        };

        this.lastReports.set(type, report);
        return report;
    }

    _getPeriodStart(period) {
        const now = new Date();
        switch (period) {
            case 'day':
                return new Date(now.setHours(0, 0, 0, 0)).toISOString();
            case 'week':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            case 'month':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        }
    }

    _generateSummary(productivity, trends) {
        const tasksCompleted = productivity.completionMetrics.total;
        const onTimeRate = Math.round(productivity.completionMetrics.onTimeRate * 100);
        const trend = trends?.velocityTrend?.trend || 'stable';

        return {
            headline: `${tasksCompleted} tasks completed with ${onTimeRate}% on-time rate`,
            subheadline: trend === 'increasing'
                ? 'Productivity trending upward'
                : trend === 'decreasing'
                    ? 'Productivity trending downward'
                    : 'Steady productivity maintained',
            quickStats: [
                { label: 'Tasks Completed', value: tasksCompleted },
                { label: 'On-Time Rate', value: `${onTimeRate}%` },
                { label: 'Focus Hours', value: Math.round(productivity.focusMetrics.totalFocusMinutes / 60) },
                { label: 'Consistency', value: `${Math.round(productivity.velocityMetrics.consistency * 100)}%` }
            ]
        };
    }

    _compileMetrics(productivity) {
        return {
            completion: {
                total: productivity.completionMetrics.total,
                byPriority: productivity.completionMetrics.byPriority,
                onTimeRate: productivity.completionMetrics.onTimeRate,
                averagePerDay: productivity.completionMetrics.averagePerDay
            },
            velocity: {
                totalPoints: productivity.velocityMetrics.totalPoints,
                averageDaily: productivity.velocityMetrics.averageDaily,
                peakDay: productivity.velocityMetrics.peakDay,
                consistency: productivity.velocityMetrics.consistency
            },
            focus: {
                sessions: productivity.focusMetrics.totalFocusSessions,
                totalMinutes: productivity.focusMetrics.totalFocusMinutes,
                quality: productivity.focusMetrics.averageQuality
            },
            efficiency: productivity.efficiencyMetrics
        };
    }

    _compileHighlights(productivity, trends) {
        const highlights = [];

        // Best achievement
        if (productivity.completionMetrics.onTimeRate >= 0.9) {
            highlights.push({
                type: 'achievement',
                icon: '🏆',
                text: 'Excellent on-time completion!'
            });
        }

        // Trend highlight
        if (trends?.velocityTrend?.trend === 'increasing') {
            highlights.push({
                type: 'trend',
                icon: '📈',
                text: `Velocity up ${trends.velocityTrend.changeRate}%`
            });
        }

        // Focus highlight
        if (productivity.focusMetrics.averageQuality >= 0.8) {
            highlights.push({
                type: 'focus',
                icon: '🎯',
                text: 'High focus quality maintained'
            });
        }

        // Comparison
        if (productivity.comparison.change > 0) {
            highlights.push({
                type: 'comparison',
                icon: '⬆️',
                text: `${Math.round(productivity.comparison.change)}% more than last period`
            });
        }

        return highlights;
    }

    _prepareChartData(productivity) {
        return {
            completionByDay: {
                type: 'bar',
                data: analyticsEngine.getDashboardData().charts.completionByDay
            },
            productivityByHour: {
                type: 'line',
                data: productivity.peakPerformance.productivityByHour
            },
            categoryBreakdown: {
                type: 'pie',
                data: productivity.timeDistribution
            },
            priorityDistribution: {
                type: 'donut',
                data: productivity.completionMetrics.byPriority
            }
        };
    }

    _compileRecommendations(productivity, trends) {
        const recs = [];

        if (productivity.efficiencyMetrics.hasData && productivity.efficiencyMetrics.bias === 'underestimate') {
            recs.push({
                priority: 'high',
                text: 'Add buffer to time estimates',
                detail: `Tasks take ${Math.round(productivity.efficiencyMetrics.averageOverrun)}% longer than estimated`
            });
        }

        if (trends?.velocityTrend?.trend === 'decreasing') {
            recs.push({
                priority: 'medium',
                text: 'Review workflow for blockers',
                detail: 'Velocity has been declining'
            });
        }

        if (productivity.focusMetrics.focusHoursPerDay < 3) {
            recs.push({
                priority: 'medium',
                text: 'Increase focus time',
                detail: 'Less than 3 hours of focused work per day'
            });
        }

        return recs;
    }

    // ============================================================
    // FORMATTED OUTPUT
    // ============================================================

    /**
     * Get report as formatted text
     * @param {string} type - Report type
     * @returns {string} Formatted report
     */
    getFormattedReport(type = 'weekly') {
        const report = this.lastReports.get(type) || this.generateReport(type);

        let output = [];

        output.push(`📊 ${type.toUpperCase()} PRODUCTIVITY REPORT`);
        output.push(`Generated: ${new Date(report.generatedAt).toLocaleDateString()}\n`);

        output.push(`📌 SUMMARY`);
        output.push(report.summary.headline);
        output.push(report.summary.subheadline + '\n');

        output.push(`📈 KEY METRICS`);
        for (const stat of report.summary.quickStats) {
            output.push(`  • ${stat.label}: ${stat.value}`);
        }
        output.push('');

        if (report.highlights.length > 0) {
            output.push(`✨ HIGHLIGHTS`);
            for (const h of report.highlights) {
                output.push(`  ${h.icon} ${h.text}`);
            }
            output.push('');
        }

        if (report.recommendations.length > 0) {
            output.push(`💡 RECOMMENDATIONS`);
            for (const rec of report.recommendations) {
                output.push(`  • ${rec.text}`);
            }
        }

        return output.join('\n');
    }

    /**
     * Get report as HTML
     * @param {string} type - Report type
     * @returns {string} HTML report
     */
    getHtmlReport(type = 'weekly') {
        const report = this.lastReports.get(type) || this.generateReport(type);

        return `
        <div class="productivity-report">
            <header>
                <h1>📊 ${type.charAt(0).toUpperCase() + type.slice(1)} Report</h1>
                <p class="date">${new Date(report.generatedAt).toLocaleDateString()}</p>
            </header>
            
            <section class="summary">
                <h2>${report.summary.headline}</h2>
                <p>${report.summary.subheadline}</p>
                <div class="quick-stats">
                    ${report.summary.quickStats.map(s =>
            `<div class="stat"><span class="value">${s.value}</span><span class="label">${s.label}</span></div>`
        ).join('')}
                </div>
            </section>
            
            ${report.highlights.length > 0 ? `
            <section class="highlights">
                <h3>Highlights</h3>
                <ul>
                    ${report.highlights.map(h => `<li>${h.icon} ${h.text}</li>`).join('')}
                </ul>
            </section>
            ` : ''}
            
            ${report.recommendations.length > 0 ? `
            <section class="recommendations">
                <h3>Recommendations</h3>
                <ul>
                    ${report.recommendations.map(r => `<li><strong>${r.text}</strong> - ${r.detail}</li>`).join('')}
                </ul>
            </section>
            ` : ''}
        </div>
        `;
    }

    // ============================================================
    // SCHEDULED REPORTS
    // ============================================================

    /**
     * Get report schedule
     * @returns {Object} Schedule configuration
     */
    getSchedule() {
        return {
            daily: { time: '17:00', enabled: false },
            weekly: { day: 'Friday', time: '16:00', enabled: true },
            monthly: { day: 1, time: '09:00', enabled: true }
        };
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const reportGenerator = new ReportGenerator();

export function initReportGenerator() {
    console.log('📄 [Report Generator] Initialized');
    return reportGenerator;
}
