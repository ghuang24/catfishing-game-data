function PageHeader() {
  return (
    <header className="page-header">
      <img
        className="page-header-mascot"
        src={`${import.meta.env.BASE_URL}catfish-explorer.svg`}
        alt=""
        width="64"
        height="44"
      />
      <div className="page-header-copy">
        <h1>Catfishing Explorer</h1>
        <p>
          Game data from your{' '}
          <a href="https://catfishing.net" target="_blank" rel="noopener noreferrer">
            catfishing.net
          </a>
        </p>
      </div>
    </header>
  );
}

export default PageHeader;
