# PDF Viewing Solutions - Attempted Approaches

This document summarizes all the approaches tried to fix PDF viewing across browsers (OperaGX, Edge, Firefox) for the Terms of Use and Privacy Notice pages.

## Summary

| Attempt | Approach | Libraries/Tools | Outcome |
|---------|----------|-----------------|---------|
| 1 | Direct static links | Flask static files, browser PDF viewer | Firefox OK, OperaGX shows only filename, Edge sometimes fails |
| 2 | send_file with headers | Flask `send_file`, `os` module | Black screen on all browsers |
| 3 | HTML + iframe | Flask `render_template`, browser PDF viewer | Still not working on OperaGX/Edge |
| 4 | HTML + object/embed | Flask `render_template`, browser PDF viewer | Not working on OperaGX/Edge |
| 5 | PDF.js viewer | Flask, PDF.js (pdfjs-dist v4.0.379) | Current implementation |

---

## Attempt 1: Direct Static Links (Original)

**Approach:** Links directly to static PDF files via `/static/docs/TermsofUse.pdf`

**Libraries/Tools Used:**
- Flask's built-in static file serving
- Browser's native PDF viewer/plugin

**Code (footer.html):**
```html
<a href="/static/docs/PrivacyNotice.pdf" target="_blank">Privacy Notice</a>
<a href="/static/docs/TermsofUse.pdf" target="_blank">Terms of Use</a>
```

**Outcome:**
- Firefox: Works correctly
- OperaGX: Shows only the filename, not the PDF content
- Edge: Sometimes doesn't load at all

---

## Attempt 2: Flask send_file with Explicit Headers

**Approach:** Created Flask routes that use `send_file` with explicit MIME type and Content-Disposition headers

**Libraries/Tools Used:**
- Flask `send_file` function
- Python `os` module for path handling

**Code (app.py):**
```python
from flask import send_file
import os

@app.route('/terms_of_use', methods=['GET'])
def terms_of_use():
    pdf_path = os.path.join(app.static_folder, 'docs', 'TermsofUse.pdf')
    response = send_file(
        pdf_path,
        mimetype='application/pdf',
        as_attachment=False,
        download_name='TermsOfUse.pdf'
    )
    response.headers["Content-Disposition"] = "inline; filename=TermsOfUse.pdf"
    return response
```

**Outcome:**
- All browsers: Black screen instead of PDF content
- Possible cause: HTTP 304 (Not Modified) responses with no body, causing PDF viewers to show blank canvas

---

## Attempt 3: HTML Template with iframe

**Approach:** Render an HTML page with the PDF embedded in an iframe, plus a download link fallback

**Libraries/Tools Used:**
- Flask `render_template` function
- Jinja2 templating
- Browser's native PDF viewer (via iframe)

**Code (app.py):**
```python
@app.route('/terms_of_use', methods=['GET'])
def terms_of_use():
    return render_template('terms_of_use.html')
```

**Code (terms_of_use.html):**
```html
<h2>Terms of Use</h2>
<p>If the document does not load properly, you can 
    <a href="{{ url_for('static', filename='docs/TermsofUse.pdf') }}">download it here</a>.
</p>
<iframe 
    src="{{ url_for('static', filename='docs/TermsofUse.pdf') }}" 
    width="100%" 
    height="800px">
</iframe>
```

**Outcome:**
- User reported this still doesn't work on any browser
- Flask logs showed 200 OK responses for both the HTML page and the PDF file
- Issue appears to be browser-side PDF rendering, not server-side

---

## Attempt 4: HTML Template with object/embed (Current)

**Approach:** Use the standard `<object>` + `<embed>` pattern which gives browsers two chances to render the PDF, plus a prominent download button as primary fallback

**Libraries/Tools Used:**
- Flask `render_template` function
- Jinja2 templating
- Browser's native PDF viewer (via object/embed)
- No additional Python or JavaScript libraries

**Code (terms_of_use.html):**
```html
<h2>Terms of Use</h2>

<p>
    <a href="{{ url_for('static', filename='docs/TermsofUse.pdf') }}" 
       target="_blank" 
       class="btn btn-primary">
        Download PDF
    </a>
    <span>Click to download if the document does not display below.</span>
</p>

<object
    data="{{ url_for('static', filename='docs/TermsofUse.pdf') }}"
    type="application/pdf"
    width="100%"
    height="800px">
    <embed
        src="{{ url_for('static', filename='docs/TermsofUse.pdf') }}"
        type="application/pdf"
        width="100%"
        height="800px" />
    <p>
        Your browser does not support embedded PDFs.
        Please <a href="{{ url_for('static', filename='docs/TermsofUse.pdf') }}">download the PDF</a> to view it.
    </p>
</object>
```

**Rationale:**
- `<object>` is the primary embedding method
- `<embed>` is a fallback inside `<object>` for browsers that don't support object
- Plain HTML message with download link is the final fallback
- Prominent "Download PDF" button at the top ensures users can always access the file

---

## Attempt 5: PDF.js Viewer (Current Implementation)

**Approach:** Use PDF.js (Mozilla's JavaScript PDF renderer) which takes full control of rendering instead of relying on browser plugins. Self-hosted viewer in `static/pdfjs/` with custom viewer.html.

**Libraries/Tools Used:**
- Flask `render_template` function
- Jinja2 templating
- **PDF.js** (`pdfjs-dist` v4.0.379 via npm)
- Custom viewer.html with PDF.js canvas rendering

**Installation:**
```bash
cd static
npm pack pdfjs-dist@4.0.379
tar -xzf pdfjs-dist-4.0.379.tgz
mv package pdfjs
```

**Files Added:**
- `static/pdfjs/build/pdf.mjs` - Main PDF.js library
- `static/pdfjs/build/pdf.worker.mjs` - Web worker for PDF processing
- `static/pdfjs/web/viewer.html` - Custom viewer page
- `static/pdfjs/web/pdf_viewer.css` - Viewer styles

**Code (terms_of_use.html):**
```html
<h2>Terms of Use</h2>

<p>
    <a href="{{ url_for('static', filename='docs/TermsofUse.pdf') }}" 
       target="_blank" 
       class="btn btn-primary">
        Download PDF
    </a>
    <span>Click to download if the document does not display below.</span>
</p>

<iframe
    src="{{ url_for('static', filename='pdfjs/web/viewer.html') }}?file={{ url_for('static', filename='docs/TermsofUse.pdf') | urlencode }}"
    width="100%"
    height="800px"
    style="border: 1px solid #ccc; border-radius: 4px;">
</iframe>
```

**Custom Viewer Features:**
- Page navigation (Prev/Next buttons)
- Zoom controls (50% - 200%)
- Download button
- Current page indicator
- Scroll-based page tracking
- Error handling with download fallback link

**Pros:**
- Consistent PDF rendering across all browsers (OperaGX, Edge, Firefox, Chrome)
- Not dependent on browser's built-in PDF viewer plugins
- Full control over the viewer UI
- Same-origin serving avoids CORS issues

**Cons:**
- Adds ~2MB of JavaScript assets to the static folder
- Slightly heavier front-end code
- Requires maintaining the PDF.js version

---

## Technical Notes

### Headers Check
The app has `X-Frame-Options: SAMEORIGIN` set (in `app.py` line 274), which should not block PDF embedding since PDFs are served from the same origin.

### Server-Side Verification
Flask logs consistently show:
- `/privacy_notice` returns 200 OK
- `/static/docs/PrivacyNotice.pdf` returns 200 OK

This confirms the PDFs are being served correctly; the issue is browser-side rendering.

### Browser Compatibility
- **Firefox:** Generally works with all approaches
- **OperaGX:** Has issues with native PDF viewing
- **Edge:** Inconsistent behavior with embedded PDFs

---

## Recommendations

1. **Always provide a download button** - This is the most reliable cross-browser solution
2. **Use object/embed pattern** - More robust than iframe for PDF embedding
3. **Consider PDF.js** - If native embedding continues to fail, this provides consistent rendering
4. **Test in actual browsers** - The development environment (Chrome for Testing) may not replicate user's browser behavior
