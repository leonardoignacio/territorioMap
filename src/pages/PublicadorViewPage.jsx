import React from 'react';
import PublicadorView from '../../components/PublicadorView/PublicadorView'; // Adjust path as needed

function PublicadorViewPage() {
  // This page is public, so no auth checks needed here.
  // The PublicadorView component handles fetching data based on URL params.
  return (
    <div>
      {/* Minimal layout for public view, or reuse a general layout */}
      <PublicadorView />
    </div>
  );
}

export default PublicadorViewPage;

