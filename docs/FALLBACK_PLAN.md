# Fallback UI Restoration Plan (Vanilla Frontend)

> **STATUS: PREPARED ONLY ? DO NOT EXECUTE UNLESS REQUIRED**  
> This fallback plan provides a zero-risk escape hatch to restore the original 100% bespoke vanilla ES6 frontend if any licensing dispute arises regarding the `sentinel-ui/` Next.js console.

---

## 1. Commit Identifying the Deletion of `frontend/`

The original vanilla frontend was retired in commit:
- **Commit Hash**: `a928aaf37c99b8a0391b911fb063b1fccd50053b` (short: `a928aaf`)
- **Author**: `imohammedyasin05 <nottouchmymail@gmail.com>`
- **Date**: `Fri Oct 23 16:37:07 2026 +0530`
- **Commit Message**: `refactor: remove vanilla Analyst Command Center; Sentinel UI is the main UI`
- **Deleted Files (5,917 lines of code)**:
  - `frontend/index.html` (933 lines)
  - `frontend/css/style.css` (2,095 lines)
  - `frontend/js/app.js` (1,896 lines)
  - `frontend/js/graph.js` (815 lines)
  - `frontend/js/api.js` (178 lines)

---

## 2. Steps to Restore `frontend/`

To restore the vanilla UI directory cleanly into the working tree without rewriting git history:

```bash
# 1. Check out the frontend directory from the parent commit of a928aaf
git checkout a928aaf~1 -- frontend/

# 2. Re-enable the StaticFiles mount in backend/main.py
```

### Required modification in `backend/main.py`:
```python
# Add StaticFiles import if needed:
from fastapi.staticfiles import StaticFiles

# Mount frontend directory to root:
app.mount("/", StaticFiles(directory=ROOT / "frontend", html=True), name="frontend")
```

### Required modification in `Dockerfile`:
```dockerfile
# Replace the multi-stage ui-build and standalone copy with:
COPY frontend ./frontend
```

---

## 3. Plan to Port Nemotron Capabilities into Vanilla `frontend/`

If restored, `frontend/` requires three UI components to match the features in `sentinel-ui`:

### Component A: Nemotron Advisory Proposal Panel
1. **HTML (`frontend/index.html`)**:
   Add an advisory container inside the case dossier pane:
   ```html
   <div id="nemotron-advisory-panel" class="dossier-card">
     <div class="card-header">
       <span class="badge badge-nemotron">NVIDIA Nemotron 3 Nano</span>
       <span id="nemotron-agreement-chip" class="chip">AGREED</span>
     </div>
     <div class="card-body">
       <h4>Proposed Typology: <span id="nemotron-proposed-pattern">?</span></h4>
       <p id="nemotron-rationale" class="prose"></p>
       <div id="nemotron-evidence-citations" class="tag-list"></div>
     </div>
   </div>
   ```
2. **JavaScript (`frontend/js/app.js`)**:
   In `renderCaseDetails(caseData)`:
   - Extract `caseData.nemotron`.
   - Populate `#nemotron-proposed-pattern`, `#nemotron-rationale`, and render chip indicating whether the deterministic policy decision matches `caseData.nemotron.policy_decision`.

### Component B: FinCEN SAR Narrative Card
1. **HTML (`frontend/index.html`)**:
   Add a dedicated SAR narrative tab or section:
   ```html
   <div id="sar-narrative-panel" class="dossier-card">
     <h3>Suspicious Activity Report (SAR) Narrative</h3>
     <div class="sar-meta">
       <span>Prepared by: NVIDIA Nemotron 3 Ultra</span>
       <span id="sar-filing-status"></span>
     </div>
     <div id="sar-narrative-text" class="sar-body"></div>
   </div>
   ```
2. **JavaScript (`frontend/js/app.js`)**:
   - Extract `caseData.sar.narrative` and format paragraphs into `#sar-narrative-text`.

### Component C: Interactive Analyst Q&A Box
1. **HTML (`frontend/index.html`)**:
   Add an interactive prompt box at the bottom of the case file:
   ```html
   <div id="analyst-qa-container" class="qa-box">
     <form id="analyst-qa-form">
       <input type="text" id="qa-question-input" placeholder="Ask the analyst a question about this case..." required />
       <button type="submit" id="qa-submit-btn">Ask</button>
     </form>
     <div id="qa-answer-card" class="qa-response hidden">
       <span class="model-tag">Nemotron Ultra</span>
       <p id="qa-answer-text"></p>
     </div>
   </div>
   ```
2. **JavaScript (`frontend/js/app.js` and `frontend/js/api.js`)**:
   - Add API helper in `api.js`:
     ```javascript
     async function askAnalyst(caseId, question) {
       const resp = await fetch(`/api/cases/${caseId}/ask`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ question })
       });
       return await resp.json();
     }
     ```
   - Wire form submission to call `askAnalyst()`, display spinner, and render the grounded response card.

---

## 4. Verification Check After Execution

If this plan is ever executed:
1. `python -m backend.scripts.prepare_data`
2. `uvicorn backend.main:app --port 8008`
3. Verify `http://localhost:8008/` loads the vanilla frontend directly without Node.js dependencies.
4. Run `pytest tests/` to confirm all 354 tests pass.
