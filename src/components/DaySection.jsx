import ArticleSection from './ArticleSection';
import { formatGameDate } from '../gameDate.js';

function DaySection({
  dayData,
  scoreData,
  appearanceDaysByTitle,
  highlightQuery,
  renderHighlight,
  onSelectDay
}) {
  const hasAnsweredQuestions = dayData.data.length > 0;

  return (
    <section className="day-section">
      <h1 className="day-header">
        <a href={`https://catfishing.net/game/${dayData.day}`} target="_blank" rel="noopener noreferrer">
          Day {dayData.day}
        </a>
        <span className="day-date">
          {formatGameDate(dayData.day)}
        </span>
        {Number.isFinite(scoreData?.score) && hasAnsweredQuestions && (
          <span className="day-score">
            Score: {scoreData.score}
          </span>
        )}
        {dayData.stats?.scoresMean !== undefined && (
          <span className="day-score">
            Avg: {dayData.stats.scoresMean.toFixed(1)}
          </span>
        )}
      </h1>
      {hasAnsweredQuestions && (
        <div className="articles-container">
          {dayData.data.map((article, index) => {
            const origIndex = article.originalIndex !== undefined ? article.originalIndex : index;
            const answerData = scoreData?.answers?.[origIndex];
            return (
              <ArticleSection
                key={origIndex}
                article={article}
                answerData={answerData}
                appearanceDays={appearanceDaysByTitle.get(article.title.trim().toLowerCase())}
                currentDay={dayData.day}
                highlightQuery={highlightQuery}
                renderHighlight={renderHighlight}
                onSelectDay={onSelectDay}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

export default DaySection;
