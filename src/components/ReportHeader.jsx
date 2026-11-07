import { useEffect, useRef, useState } from 'react';
import FiltersPanel from './FiltersPanel.jsx';

function ReportHeader({
  scoreSummary,
  correctRateSummary,
  filterProps
}) {
  const summariesRef = useRef(null);
  const [summaryHeight, setSummaryHeight] = useState(0);

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
            Your daily avg <strong>{scoreSummary.userAverage.toFixed(2)}</strong>
            <span aria-hidden="true"> · </span>
            Global daily avg <strong>{scoreSummary.globalAverage.toFixed(2)}</strong>
            <span aria-hidden="true"> · </span>
            Across {scoreSummary.dayCount} {scoreSummary.dayCount === 1 ? 'day' : 'days'}
          </p>
        )}
        {correctRateSummary && (
          <p className="header-correct-summary">
            Your correct rate <strong>{correctRateSummary.userRate.toFixed(1)}%</strong>
            <span aria-hidden="true"> · </span>
            Global correct rate <strong>{correctRateSummary.globalRate.toFixed(1)}%</strong>
            <span aria-hidden="true"> · </span>
            {correctRateSummary.questionCount}{' '}
            {correctRateSummary.questionCount === 1 ? 'question' : 'questions'}
            <span aria-hidden="true"> · </span>
            <strong
              className={
                correctRateSummary.difference >= 0 ? 'rate-positive' : 'rate-negative'
              }
            >
              {correctRateSummary.difference > 0 ? '+' : ''}
              {correctRateSummary.difference.toFixed(1)} pts
            </strong>
          </p>
        )}
      </div>
      <FiltersPanel {...filterProps} />
    </header>
  );
}

export default ReportHeader;
