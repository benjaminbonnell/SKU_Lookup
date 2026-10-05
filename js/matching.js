// Fuzzy matching of customer titles against the product dictionary.
// No DOM access here: everything takes plain data and returns plain data.

// Lowercase, turn punctuation into spaces, collapse whitespace.
function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Number of single-character edits (insert, delete, substitute) to turn a into b.
// With allowTransposition, swapping two adjacent characters also counts as one
// edit (Damerau-Levenshtein, optimal string alignment variant).
function editDistance(a, b, allowTransposition) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      if (allowTransposition && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
    }
  }
  return dp[a.length][b.length];
}

// Share of three-character chunks the two strings have in common, from 0 to 1.
function trigramSimilarity(a, b) {
  const trigrams = s => {
    const padded = '  ' + s + '  ';
    const set = new Set();
    for (let i = 0; i < padded.length - 2; i++) set.add(padded.slice(i, i + 3));
    return set;
  };
  const ta = trigrams(a), tb = trigrams(b);
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / (ta.size + tb.size - shared || 1);
}

// Finds the closest dictionary entry for each customer title.
//   algo:      'damerau' | 'levenshtein' | 'trigram'
//   threshold: 1-10. For edit distance it is the max number of edits allowed;
//              for trigram it maps to a minimum similarity of 1 - threshold * 0.08.
// Each result's status is 'exact', 'fuzzy' (within threshold) or 'none'.
function matchTitles(dictionary, customerTitles, algo, threshold) {
  const isTrigram = algo === 'trigram';
  const dictNorm = dictionary.map(d => normalize(d.title));

  return customerTitles.map(c => {
    const custNorm = normalize(c.title);

    // Edit distance: lower is better. Trigram similarity: higher is better.
    // On ties the first dictionary entry wins.
    let best = isTrigram ? -1 : Infinity;
    let bestIdx = -1;
    dictNorm.forEach((dictTitle, i) => {
      const score = isTrigram
        ? trigramSimilarity(custNorm, dictTitle)
        : editDistance(custNorm, dictTitle, algo === 'damerau');
      if (isTrigram ? score > best : score < best) {
        best = score;
        bestIdx = i;
      }
    });

    const isExact = isTrigram ? best > 0.97 : best === 0;
    const withinThreshold = isTrigram ? best >= 1 - threshold * 0.08 : best <= threshold;
    const matched = bestIdx >= 0 && withinThreshold;
    const confidence = isTrigram
      ? Math.round(best * 100)
      : Math.max(0, Math.round((1 - best / Math.max(custNorm.length, 1)) * 100));

    return {
      idx: c.idx,
      customerTitle: c.title,
      sku: matched ? dictionary[bestIdx].sku : '',
      title: matched ? dictionary[bestIdx].title : 'No match found',
      confidence: matched ? confidence : 0,
      status: isExact ? 'exact' : matched ? 'fuzzy' : 'none',
      edited: false
    };
  });
}
