# SKU_Lookup
Internal SKU lookup tool for company use.

Matches a customer's product titles to our SKUs by fuzzy text matching, lets you
review and correct the matches, and exports the result as a CSV.

## Usage

Open `index.html` in a browser. No build step, server, or install needed.

1. **Import Product Dictionary**: CSV with the SKU in column 1 and the product title in column 2.
2. **Import Customer Titles**: CSV with the customer's product titles in column 1.
3. **Match Settings & Run**: pick an algorithm and how loose the matching should be.
4. **Results & Review**: fix any wrong matches with **Edit**, then **Export CSV**.

## Project layout

| File | Purpose |
| --- | --- |
| `index.html` | Page markup only |
| `css/styles.css` | All styling |
| `js/csv.js` | Reading and writing CSV text |
| `js/matching.js` | Matching logic (normalizing, edit distance, trigram similarity). No DOM code |
| `js/app.js` | UI: file import, running the match, review/edit table, export |

The scripts are plain `<script>` files (not ES modules) so the page keeps working
when opened directly from disk.
