# PDF.js Toolbar Capabilities and Features

This document provides a comprehensive overview of all possible features that can be incorporated into a PDF.js toolbar, including variations and functionality options.

## Currently Implemented Features

Our custom PDF.js viewer (`static/pdfjs/web/viewer.html`) currently includes:

| Feature | Description | Status |
|---------|-------------|--------|
| Previous/Next Page | Navigate between pages | Implemented |
| Page Counter | Shows "Page X of Y" | Implemented |
| Zoom Dropdown | Page Width, 50%, 75%, 100%, 125%, 150%, 200% | Implemented |
| Download Button | Downloads the PDF file | Implemented |

---

## Navigation Features

### Page Navigation

**Previous/Next Page Buttons**
- Basic navigation to go to page N+1 or N-1
- Variations:
  - Disable buttons at first/last page
  - Show tooltips with target page number
  - Keyboard shortcuts (Arrow keys, Page Up/Down)

**Direct Page Jump**
- Text input field to type a specific page number
- Variations:
  - Page number input with Enter key submission
  - Slider control for quick navigation in long documents
  - Support for page labels (Roman numerals, custom labels)

**First/Last Page Buttons**
- Jump directly to the beginning or end of the document
- Useful for long documents

### Thumbnail Sidebar

**Page Thumbnails Panel**
- Sidebar showing miniature previews of each page
- Click a thumbnail to jump to that page
- Variations:
  - Toggle sidebar visibility with a button
  - Adjustable thumbnail size
  - Highlight current page in sidebar
  - Drag to reorder pages (advanced)

### Document Outline/Bookmarks

**Outline Panel**
- Tree view of document headings/sections (when PDF contains outlines)
- Click a bookmark to jump to that section
- Variations:
  - Expand/collapse controls for nested sections
  - Search within outline
  - Highlight current section

### Attachments Panel

**Embedded Files**
- List of files embedded within the PDF
- Click to open or download attachments
- Shows file name, size, and type

### Layers Panel

**Optional Content Groups**
- Toggle visibility of different layers in the PDF
- Common in technical drawings, maps, and CAD documents
- Variations:
  - Show/hide individual layers
  - Layer opacity controls (advanced)

---

## Zoom and View Scaling

### Zoom Controls

**Zoom In/Out Buttons**
- Increase or decrease zoom by a fixed percentage (typically 10-25%)
- Variations:
  - Plus/minus icons
  - Keyboard shortcuts (Ctrl/Cmd + Plus/Minus)
  - Mouse wheel zoom (with Ctrl/Cmd held)

**Preset Zoom Levels**
- Dropdown or button group with common zoom values:
  - 50%, 75%, 100%, 125%, 150%, 200%, 300%, 400%
  - Custom percentage input field

**Fit Modes**
- **Page Width (Fit Width)**: Scale to fit the container width
- **Page Fit (Fit Page)**: Scale to show entire page in viewport
- **Actual Size (100%)**: Display at original document size
- **Auto Zoom**: Automatically choose best fit based on page/container

**Custom Zoom Input**
- Text field to enter any zoom percentage
- Validation for min/max zoom limits

---

## View Modes and Layout

### Scroll Modes

**Continuous Scroll**
- All pages stacked vertically with smooth scrolling
- Most common default mode

**Single Page View**
- Only one page visible at a time
- Navigation snaps page-by-page
- Good for presentations

**Two-Page (Spread) View**
- Show two pages side-by-side like an open book
- Variations:
  - Cover page shown separately (1, then 2-3, 4-5, etc.)
  - Strict pairs (1-2, 3-4, etc.)
  - Continuous spread scrolling

### Presentation Mode

**Full-Screen Presentation**
- Enters browser full-screen mode
- Shows one page at a time
- Arrow keys for navigation
- Escape to exit
- Ideal for slideshows and presentations

### Tool Selection

**Hand Tool (Pan)**
- Click and drag to scroll/pan the page
- Useful when zoomed in

**Text Selection Tool**
- Default mode for selecting and copying text
- Cursor changes to text selection cursor over text

---

## Search Functionality

### Find in Document

**Search Box**
- Text input for search query
- Next/Previous match navigation buttons
- Variations:
  - Case-sensitive search toggle
  - Whole word matching toggle
  - Regular expression support (advanced)

**Match Highlighting**
- Highlight all occurrences on current page
- Highlight all occurrences in entire document
- Match counter ("3 of 12 matches")

**Search Results Panel**
- List of all matches with context
- Click to jump to specific match
- Shows page number for each match

---

## Rotation and Orientation

### Page Rotation

**Rotate Clockwise/Counterclockwise**
- Rotate by 90 degrees
- Variations:
  - Rotate current page only
  - Rotate all pages
  - Persistent rotation (saved in session)

**Flip/Mirror (Advanced)**
- Horizontal or vertical flipping
- Useful for technical diagrams

---

## Document Operations

### Download

**Download PDF**
- Save the PDF file to user's device
- Variations:
  - Download original file
  - Download with annotations (if supported)
  - Download specific page range

### Print

**Print Document**
- Opens browser print dialog
- Variations:
  - Print all pages
  - Print current page
  - Print page range
  - Print selection

### Open File

**Open Local PDF**
- File input to load a local PDF file
- Useful for standalone viewers
- May not be appropriate for embedded document viewers

### Open in New Tab

**Open Externally**
- Open PDF in a new browser tab
- Uses browser's native PDF viewer

---

## Annotations and Commenting

### Text Annotations

**Highlight Text**
- Select text and apply highlight color
- Color options: yellow, green, blue, pink, etc.

**Underline/Strikethrough**
- Apply underline or strikethrough to selected text

**Text Notes/Comments**
- Sticky note-style comments anchored to specific locations
- Comment panel listing all notes
- Reply threads (advanced)

### Drawing Tools

**Freehand Drawing (Ink)**
- Pen tool for drawing on pages
- Useful for signatures, markups
- Color and thickness options

**Shapes**
- Rectangle, circle, line, arrow tools
- Fill and stroke options

### Stamps

**Predefined Stamps**
- "Approved", "Draft", "Confidential", etc.
- Custom stamp images

### Annotation Management

**Annotation List Panel**
- Sidebar listing all annotations
- Click to jump to annotation location
- Filter by type or author
- Delete/edit annotations

---

## Content Interaction

### Text Selection and Copy

**Select Text**
- Click and drag to select text
- Double-click to select word
- Triple-click to select paragraph

**Copy to Clipboard**
- Right-click context menu
- Keyboard shortcut (Ctrl/Cmd + C)
- Explicit "Copy" button

### Links

**Clickable Links**
- URL links open in new tab
- Internal links jump to target page/section
- Email links open mail client

### Form Filling

**Interactive Forms**
- Text fields, checkboxes, radio buttons, dropdowns
- Variations:
  - Reset form button
  - Submit form button (if endpoint configured)
  - Highlight required fields
  - Form validation

---

## Display and Accessibility

### Theme/Appearance

**Dark Mode**
- Dark background for reduced eye strain
- Inverts page colors or uses dark UI

**Page Background Color**
- Custom background color behind pages
- Sepia mode for reading comfort

### Accessibility

**Screen Reader Support**
- Proper ARIA labels on controls
- Keyboard navigation for all features

**High Contrast Mode**
- Enhanced contrast for visibility

---

## Advanced Features

### Document Properties

**Properties Dialog**
- Title, author, subject, keywords
- Creation and modification dates
- PDF version
- Page count and file size
- Security settings

### Page Thumbnails View

**Contact Sheet Mode**
- Grid view of all page thumbnails
- Quick visual navigation

### Snapshot Tool

**Screenshot Region**
- Select a rectangular area to capture
- Copy to clipboard or save as image

### Bookmarking (Application-Level)

**Bookmark Current Page**
- Save current page/position within the application
- Not stored in the PDF itself

### Sharing

**Share Link**
- Generate shareable URL to specific page
- Copy link to clipboard

---

## Implementation Complexity

| Feature Category | Complexity | Notes |
|-----------------|------------|-------|
| Basic Navigation | Low | Already implemented |
| Zoom Controls | Low | Already implemented |
| Download | Low | Already implemented |
| Search | Medium | Requires PDF.js find controller |
| Thumbnails | Medium | Requires additional rendering |
| Outline/Bookmarks | Medium | Depends on PDF having outlines |
| Rotation | Low | Simple viewport transformation |
| Print | Low | Uses browser print dialog |
| Annotations | High | Requires annotation editor module |
| Form Filling | High | Requires form support module |
| Layers | Medium | Depends on PDF having layers |

---

## PDF.js Version Considerations

Our current implementation uses `pdfjs-dist` v4.0.379. Some advanced features like annotation editing may require:

- Enabling feature flags
- Including additional modules
- Custom implementation beyond the basic viewer

For the most up-to-date feature availability, consult the [PDF.js documentation](https://mozilla.github.io/pdf.js/).

---

## Recommendations for Future Enhancements

Based on common user needs, consider adding these features in priority order:

1. **Search functionality** - High value, medium complexity
2. **Print button** - High value, low complexity
3. **Rotation controls** - Medium value, low complexity
4. **Thumbnail sidebar** - Medium value, medium complexity
5. **Full-screen/presentation mode** - Medium value, low complexity

Each feature should be evaluated based on:
- User demand
- Implementation complexity
- Performance impact
- Maintenance burden
