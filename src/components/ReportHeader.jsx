import { useEffect, useRef, useState } from 'react';
import FiltersPanel from './FiltersPanel.jsx';

function ReportHeader({
  scoreSummary,
  correctRateSummary,
  filterProps
}) {
  const summariesRef = useRef(null);
  const [summaryHeight, setSummaryHeight] = useState(0);
  const dateFilterApplied = Boolean(
    filterProps.dayFilter?.trim() ||
    filterProps.dateRange ||
    filterProps.gotHardestQuestion ||
    filterProps.missedEasiestQuestion
  );

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setSummaryHeight(entry.contentRect.height);
    });
    observer.observe(summariesRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className="report-toolbar"
      style={{ '--report-summary-height': `${summaryHeight}px` }}
    >
      <div className="report-summaries" ref={summariesRef}>
        {scoreSummary && (
          <p className="header-score-summary">
            <span className="summary-line">
              <span className="summary-segment">
                Your daily avg <strong>{scoreSummary.userAverage.toFixed(2)}</strong>
              </span>
              <span aria-hidden="true" className="summary-divider"> · </span>
              <span className="summary-segment">
                Global daily avg <strong>{scoreSummary.globalAverage.toFixed(2)}</strong>
              </span>
            </span>
            <span className="summary-line summary-secondary-line">
              {dateFilterApplied
                ? `Across ${scoreSummary.dayCount}/${scoreSummary.totalDayCount} days played`
                : `Across ${scoreSummary.dayCount} ${scoreSummary.dayCount === 1 ? 'day' : 'days'}`}
            </span>
          </p>
        )}
        {correctRateSummary && (
          <p className="header-correct-summary">
            <span className="summary-line">
              <span className="summary-segment">
                Your correct rate <strong>{correctRateSummary.userRate.toFixed(1)}%</strong>
              </span>
              <span aria-hidden="true" className="summary-divider"> · </span>
              <span className="summary-segment">
                Global correct rate <strong>{correctRateSummary.globalRate.toFixed(1)}%</strong>
              </span>
            </span>
            <span className="summary-line summary-secondary-line">
              <span className="summary-segment">
                {correctRateSummary.questionCount}{' '}
                {correctRateSummary.questionCount === 1 ? 'question' : 'questions'}
              </span>
              <span aria-hidden="true" className="summary-divider"> · </span>
              <span className="summary-segment">
                <strong
                  className={
                    correctRateSummary.difference >= 0 ? 'rate-positive' : 'rate-negative'
                  }
                >
                  {correctRateSummary.difference > 0 ? '+' : ''}
                  {correctRateSummary.difference.toFixed(1)} pts
                </strong>
              </span>
            </span>
          </p>
        )}
      </div>
      <FiltersPanel {...filterProps} />
    </header>
  );
}

export default ReportHeader;
