insert into strategies (id, name, description, active, variants, totals, sections)
values (
  'rb', 'Resistance Breakout',
  'Descending trendline · Horizontal resistance · Triangle/wedge · Ascending trendline',
  true,
  '[{"id":"a","label":"Type A — Descending trendline","col":"purple"},
    {"id":"b","label":"Type B — Horizontal resistance","col":"amber"},
    {"id":"c","label":"Type C — Triangle / wedge","col":"teal"},
    {"id":"d","label":"Type D — Ascending trendline","col":"blue"}]',
  '{"a":19,"b":20,"c":20,"d":20}',
  '[]'
)
on conflict (id) do nothing;