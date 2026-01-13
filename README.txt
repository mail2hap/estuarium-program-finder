Puget Sound Estuarium - Program Finder (static web app)

What this is
- A lightweight, customer-facing finder tool for teachers.
- Works as a static site: no database, no server, no logins.

Files
- index.html
- styles.css
- app.js
- data.json

How to use
1) Update the call-to-action links in data.json:
   - ctaEstimateUrl
   - ctaInquiryUrl

2) Add/edit programs in data.json:
   - name
   - grades (use: PreK, PreK–1, K–1, 2–5, 6–8, 8–10, 10–12, 13+, Adult, All Ages)
   - category (School or Community/Adult)
   - formats: set true/false for the four formats

How to publish (two easy options)
Option A: GitHub Pages (recommended)
- Create a new repo
- Upload these four files
- Enable Pages in repo settings

Option B: WordPress embed
- Host the files somewhere public (GitHub Pages works)
- Link to the finder page from your Education page

Notes
- The tool filters by grade intersection. Example: selecting 10–12 will show a program listed as 8–10, 10–12.
