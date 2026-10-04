import { useEffect, useMemo, useRef, useState } from 'react';
import DaySection from './components/DaySection.jsx';
import PageRailNavigation from './components/PageRailNavigation.jsx';
import Pagination from './components/Pagination.jsx';
import ReportHeader from './components/ReportHeader.jsx';
import ResultsSortHeader from './components/ResultsSortHeader.jsx';
import SortedArticles from './components/SortedArticles.jsx';
import {
  buildAppearanceDays,
  filterReportData,
  paginateReportData,
  summarizeReportData
} from './reportData.js';
import { getHighlightSegments } from './utils';

function RawDataDisplay({ data, scoresData }) {
  const [dayFilter, setDayFilter] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [articleSortBy, setArticleSortBy] = useState('none');
  const [daySortBy, setDaySortBy] = useState('none');
  const [showHidden, setShowHidden] = useState(false);
  const [answerFilters, setAnswerFilters] = useState([]);
  const [correctRateFilter, setCorrectRateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [showPageRails, setShowPageRails] = useState(false);
  const topPaginationRef = useRef(null);
  const bottomPaginationRef = useRef(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(searchInput.trim().replace(/\s+/g, ' '));
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    dayFilter,
    dateRange,
    searchQuery,
    articleSortBy,
    daySortBy,
    showHidden,
    answerFilters,
    correctRateFilter
  ]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    if (articleSortBy !== 'none') setDaySortBy('none');
  }, [articleSortBy]);

  useEffect(() => {
    if (daySortBy !== 'none') setArticleSortBy('none');
  }, [daySortBy]);

  const appearanceDaysByTitle = useMemo(() => buildAppearanceDays(data), [data]);
  const filteredData = filterReportData({
    data,
    scoresData,
    dayFilter,
    dateRange,
    searchQuery,
    showHidden,
    answerFilters,
    correctRateFilter,
    articleSortBy,
    daySortBy
  });
  const {
    scoreSummary,
    correctRateSummary,
    filteredArticles,
    filteredDays
  } = summarizeReportData({ data, scoresData, filteredData, articleSortBy });
  const {
    paginatedData,
    totalPages,
    totalArticles: totalFilteredArticles
  } = paginateReportData(filteredData, articleSortBy, currentPage);
  const totalArticles = data.reduce((sum, day) => sum + day.data.length, 0);

  useEffect(() => {
    function updatePageRailVisibility() {
      const topPagination = topPaginationRef.current;
      const bottomPagination = bottomPaginationRef.current;
      setShowPageRails(Boolean(
        topPagination &&
        bottomPagination &&
        topPagination.getBoundingClientRect().bottom < 0 &&
        bottomPagination.getBoundingClientRect().top > window.innerHeight
      ));
    }

    updatePageRailVisibility();
    window.addEventListener('scroll', updatePageRailVisibility, { passive: true });
    window.addEventListener('resize', updatePageRailVisibility);
    return () => {
      window.removeEventListener('scroll', updatePageRailVisibility);
      window.removeEventListener('resize', updatePageRailVisibility);
    };
  }, [totalPages]);

  function clearAllFilters() {
    setSearchInput('');
    setSearchQuery('');
    setDayFilter('');
    setDateRange(null);
    setShowHidden(false);
    setAnswerFilters([]);
    setCorrectRateFilter('');
  }

  function selectDay(day) {
    setDayFilter(String(day));
    setDateRange(null);
  }

  function cycleArticleSort() {
    setArticleSortBy(current => {
      if (current === 'none') return 'asc';
      if (current === 'asc') return 'desc';
      return 'none';
    });
  }

  function cycleDaySort(column) {
    setDaySortBy(current => {
      if (current === `${column}-asc`) return `${column}-desc`;
      if (current === `${column}-desc`) return 'none';
      return `${column}-asc`;
    });
  }

  function renderHighlight(title, query) {
    return getHighlightSegments(title, query).map((segment, index) =>
      segment.type === 'matched'
        ? <mark className="highlight" key={index}>{segment.text}</mark>
        : <span key={index}>{segment.text}</span>
    );
  }

  const paginationProps = {
    currentPage,
    setCurrentPage,
    pageInput,
    setPageInput,
    totalPages,
    itemCount: totalFilteredArticles,
    itemType: 'answers'
  };
  const filterProps = {
    searchInput,
    setSearchInput,
    dayFilter,
    setDayFilter,
    dateRange,
    setDateRange,
    showHidden,
    setShowHidden,
    answerFilters,
    setAnswerFilters,
    correctRateFilter,
    setCorrectRateFilter,
    onClearAll: clearAllFilters,
    filteredDays,
    totalDays: data.length,
    filteredArticles,
    totalArticles
  };

  return (
    <>
      <ReportHeader
        scoreSummary={scoreSummary}
        correctRateSummary={correctRateSummary}
        filterProps={filterProps}
      />
      <PageRailNavigation
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        isVisible={showPageRails}
      />
      <div ref={topPaginationRef}>
        <Pagination {...paginationProps} />
      </div>
      <ResultsSortHeader
        articleSortBy={articleSortBy}
        daySortBy={daySortBy}
        onCycleArticleSort={cycleArticleSort}
        onCycleDaySort={cycleDaySort}
      />
      <section id="raw-data-container">
        {articleSortBy !== 'none' ? (
          <SortedArticles
            articles={paginatedData}
            scoresData={scoresData}
            appearanceDaysByTitle={appearanceDaysByTitle}
            highlightQuery={searchQuery}
            renderHighlight={renderHighlight}
            onSelectDay={selectDay}
          />
        ) : (
          paginatedData.map(dayData => (
            <DaySection
              key={dayData.day}
              dayData={dayData}
              scoreData={scoresData.find(score => score?.day === dayData.day)}
              appearanceDaysByTitle={appearanceDaysByTitle}
              highlightQuery={searchQuery}
              renderHighlight={renderHighlight}
              onSelectDay={selectDay}
            />
          ))
        )}
        <div ref={bottomPaginationRef}>
          <Pagination {...paginationProps} />
        </div>
      </section>
    </>
  );
}

export default RawDataDisplay;
