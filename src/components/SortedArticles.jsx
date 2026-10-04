import ArticleSection from './ArticleSection';

function SortedArticles({
  articles,
  scoresData,
  appearanceDaysByTitle,
  highlightQuery,
  renderHighlight,
  onSelectDay
}) {
  return (
    <div className="sorted-articles">
      {articles.map((article, index) => {
        const scoreData = scoresData.find(s => s?.day === article.day);
        const answerData = scoreData?.answers?.[article.originalIndex];
        return (
          <ArticleSection 
            key={index} 
            article={article}
            answerData={answerData}
            appearanceDays={appearanceDaysByTitle.get(article.title.trim().toLowerCase())}
            currentDay={article.day}
            highlightQuery={highlightQuery}
            renderHighlight={renderHighlight}
            onSelectDay={onSelectDay}
            showDay={true}
          />
        );
      })}
    </div>
  );
}

export default SortedArticles;
