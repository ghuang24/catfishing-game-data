import { useState } from 'react';
import globeIcon from '../Assets/globe.svg';
import checkCircle from '../Assets/check-circle.svg';
import closeEnough from '../Assets/close-enough.svg';
import skipCircle from '../Assets/skip-circle.svg';
import xCircle from '../Assets/x-circle.svg';
import { AnswerCorrectness } from '../input.types.ts';

function ArticleSection({
  article,
  answerData,
  appearanceDays,
  currentDay,
  highlightQuery,
  renderHighlight,
  onSelectDay,
  showDay
}) {
  const [isOpen, setIsOpen] = useState(false);
  const otherDays = appearanceDays?.filter(day => day !== currentDay) ?? [];

  const getAnswerIcon = () => {
    if (!answerData || article.hidden) return null;
    
    const { correctness } = answerData;
    if (correctness === AnswerCorrectness.CORRECT) {
      return <img src={checkCircle} alt="Correct" className="answer-icon" title="Correct" />;
    } else if (correctness === AnswerCorrectness.CLOSE) {
      return <img src={closeEnough} alt="Close enough" className="answer-icon" title="Close enough" />;
    } else if (correctness === AnswerCorrectness.SKIPPED) {
      return <img src={skipCircle} alt="Skipped" className="answer-icon" title="Skipped" />;
    } else if (correctness === AnswerCorrectness.INCORRECT) {
      return <img src={xCircle} alt="Incorrect" className="answer-icon" title="Incorrect" />;
    }
    return null;
  };
  
  const wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(article.title)}`;

  return (
    <div className={`article-section ${article.hidden ? 'article-hidden' : ''}`}>
      <h2 className="article-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="article-status">
          {getAnswerIcon()}
        </span>
        <span className="article-title">
          {renderHighlight(article.title, highlightQuery)}
          {otherDays.length > 0 && (
            <span className="other-appearances">
              Also{' '}
              {otherDays.map((day, index) => (
                <span key={day}>
                  {index > 0 && ', '}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectDay(day);
                    }}
                  >
                    Day {day}
                  </button>
                </span>
              ))}
            </span>
          )}
        </span>
        {answerData?.guess && !article.hidden && (
          <span className="user-guess">{answerData.guess}</span>
        )}
        {showDay && (
          <a 
            href={`https://catfishing.net/game/${article.day}`}
            target="_blank"
            rel="noopener noreferrer"
            className="article-day-link"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="article-day">Day {article.day}</span>
          </a>
        )}
        <a 
          href={wikipediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="wikipedia-link"
          onClick={(e) => e.stopPropagation()}
          title="View on Wikipedia"
        >
          <img src={globeIcon} alt="" />
        </a>
        <span className="correct-rate">{article.correctRate.toFixed(2)}%</span>
      </h2>
      {isOpen && (
        <div className="categories-content">
          <p className="categories-list">
            {article.categories.map((category, index) => (
              <span key={`${category}-${index}`}>
                {index > 0 && <span className="category-separator"> ✦ </span>}
                {category}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}

export default ArticleSection;
