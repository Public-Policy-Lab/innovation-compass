# Innovation Compass

[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)

Innovation Compass is an interactive assessment tool that helps users evaluate their preparedness across different innovation practices. The application presents a series of questions, calculates results based on user responses, and provides personalized recommendations organized by building blocks and categories.

This project was developed in collaboration with undercapitalized innovators deploying science and technology. The work was supported by funding from the National Science Foundation (Award #2331195).

## Overview

Innovation Compass is a client-side web application that:

- Presents users with a multi-step quiz about innovation practices
- Organizes questions into categories (Community, Impact, Entrepreneurship)
- Calculates preparedness scores for different building blocks
- Generates shareable results URLs
- Displays results with visual indicators and recommended activities
- Allows users to email their results

The application is built with vanilla JavaScript, HTML, and CSS—no build process or dependencies required. It can run entirely from static files served by any web server.

## Features

- **Interactive Quiz**: Multi-step questionnaire with progress tracking
- **Category Organization**: Questions organized into logical categories with title cards
- **Results Visualization**: Visual representation of preparedness levels using hand graphics
- **Building Blocks**: Results grouped by building blocks (e.g., Signature Strength, Community Connection)
- **Activity Recommendations**: Links to specific practices and activities based on responses
- **Shareable Results**: Results encoded in URL hash for easy sharing
- **Email Sharing**: One-click email sharing with pre-populated subject and body
- **Sortable Activities**: View activities by preparedness level or building block
- **Responsive Design**: Works on desktop and mobile devices
- **Google Analytics Integration**: Optional tracking support
- **Participant Gateway**: Optional participant ID collection modal

## Project Structure

```
innovation-compass/
├── docs/
│   ├── css/                    # Stylesheets
│   │   ├── app.css            # Main application styles
│   │   ├── activities.css     # Activity listing styles
│   │   ├── buttons.css        # Button styles
│   │   ├── levels.css         # Preparedness level indicators
│   │   └── ...                 # Additional component styles
│   ├── data/                   # JSON data files
│   │   ├── quiz.json          # Quiz questions and activities
│   │   └── blocks.json        # Building block definitions
│   ├── images/                 # Image assets
│   │   ├── icons/             # SVG icons
│   │   └── levels/            # Preparedness level graphics
│   ├── js/                     # JavaScript files
│   │   ├── app.js             # Main application logic
│   │   └── participant-gateway.js  # Optional participant ID modal
│   ├── index.html             # Main HTML file
│   └── templates.html          # Dynamic content templates
├── README.md                   # This file
└── LICENSE                     # CC BY-SA 4.0 license
```

## Quick Start

### Option 1: Local Development Server

1. Clone or download this repository
2. Navigate to the `docs` directory
3. Start a local web server:

   **Using Python 3:**
   ```bash
   cd docs
   python3 -m http.server 8000
   ```

   **Using Python 2:**
   ```bash
   cd docs
   python -m SimpleHTTPServer 8000
   ```

   **Using Node.js (http-server):**
   ```bash
   npx http-server docs -p 8000
   ```

4. Open your browser and navigate to `http://localhost:8000`

### Option 2: Deploy to Web Server

Simply upload the contents of the `docs` directory to any web server. The application works with any static file hosting service, including:

- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront
- Any traditional web hosting

## Customization Guide

### 1. Customizing Quiz Questions

Edit `docs/data/quiz.json` to modify questions and activities. Each quiz item has the following structure:

```json
{
  "category": "community",           // Category name (community, impact, entrepreneurship)
  "building_block": "community_connection",  // Links to blocks.json
  "activity_name": "Question Text",  // The question/activity name
  "answer": null,                    // User's answer (0-4), null initially
  "weighting": 2,                    // Weight for calculation (null for title cards)
  "blurb": "Question description",    // Short description shown with question
  "activity_description": "...",      // Full description (can be same as blurb)
  "activity_url": "https://..."      // Link to detailed activity page
}
```

**Key Points:**
- Set `weighting: null` for category title cards (non-question items)
- Set `weighting` to a number (1-5) for actual questions
- `answer` values range from 0-4 (0=unprepared, 4=extremely prepared)
- `building_block` must match a key in `blocks.json`

**Example - Adding a Title Card:**
```json
{
  "category": "community",
  "building_block": "title_card",
  "activity_name": "Category 1: Community",
  "answer": null,
  "weighting": null,
  "blurb": "Description of this category...",
  "activity_description": null,
  "activity_url": null
}
```

**Example - Adding a Question:**
```json
{
  "category": "community",
  "building_block": "community_connection",
  "activity_name": "Your New Question",
  "answer": null,
  "weighting": 3,
  "blurb": "Short description of what this question assesses",
  "activity_description": "Full description of the practice",
  "activity_url": "https://yoursite.com/activities/your-activity"
}
```

### 2. Customizing Building Blocks

Edit `docs/data/blocks.json` to modify building blocks. Each block represents a grouping of related practices:

```json
{
  "block_key": {
    "title": "Block Title",
    "category": "Community",        // Must match category in quiz.json
    "description": "Block description shown in results",
    "average": null,                // Calculated automatically
    "preparedness": null,           // Calculated automatically (low/medium/high)
    "items": []                     // Populated automatically from quiz.json
  }
}
```

**To add a new building block:**
1. Add a new entry to `blocks.json` with a unique key
2. Reference this key in `quiz.json` items using the `building_block` field
3. Ensure the `category` matches one of your categories

### 3. Customizing Categories

Categories are defined implicitly through the quiz data. The application supports any number of categories, but the current design is optimized for three:

- **Community**: Building networks and relationships
- **Impact**: Realizing vision and proving purpose
- **Entrepreneurship**: Turning ideas into business

To change categories:
1. Update `category` values in `quiz.json`
2. Update `category` values in `blocks.json` to match
3. Modify CSS color themes in `docs/js/app.js` (see `setTheme` function)
4. Update category names in `docs/templates.html` if needed

### 4. Customizing Styling

The application uses modular CSS files in `docs/css/`:

- `variables.css`: CSS custom properties (colors, spacing, etc.)
- `app.css`: Main application layout
- `activities.css`: Activity listing styles
- `buttons.css`: Button components
- `levels.css`: Preparedness level indicators
- `results-graphic.css`: Results visualization (hands graphic)

To customize colors, edit `docs/css/variables.css` or modify the color values in `docs/js/app.js` within the `setTheme` function.

### 5. Customizing Text Content

Most user-facing text is in `docs/templates.html`. Key sections to customize:

- Start page content (lines ~7-42)
- Quiz instructions and descriptions
- Results page text
- Button labels

### 6. Google Analytics Setup

To enable Google Analytics:

1. Update the Google Analytics ID in `docs/index.html`:
   ```html
   <script async src="https://www.googletagmanager.com/gtag/js?id=YOUR-GA-ID"></script>
   ```

2. Update the config in `docs/index.html`:
   ```javascript
   gtag("config", "YOUR-GA-ID", { ... });
   ```

3. Update `docs/js/app.js` in the `init` function:
   ```javascript
   if (window.location.hostname == "yourdomain.com") {
       this.baseUrl = "https://yourdomain.com/path/";
       this.gaClientId = "YOUR-GA-ID";
   }
   ```

### 7. Disabling Participant Gateway

The participant gateway modal is currently disabled by default (see `docs/js/participant-gateway.js` line 2). To enable it:

1. Uncomment line 2 in `participant-gateway.js`:
   ```javascript
   participantGateway.init();
   ```

2. Customize the modal content and validation logic as needed

### 8. Email Sharing Customization

The email sharing function is in `docs/js/app.js` (around line 358). Customize:

- Subject line: Change `"My Innovation Compass Results"`
- Email body message: Modify the `message` variable
- Email body format: Adjust how the URL is included

## Data Flow

1. **Initialization**: Application loads `quiz.json` and `blocks.json`
2. **Question Flow**: User answers questions, stored in `quiz` array
3. **Calculation**: On completion, `doCalculations()`:
   - Groups quiz items by `building_block`
   - Calculates average scores per block
   - Determines preparedness levels (low/medium/high)
4. **Results Display**: Results shown with visual indicators
5. **URL Generation**: Results encoded in URL hash for sharing
6. **Activity Listing**: Activities displayed with sorting options

## Preparedness Levels

The application uses a 5-point scale (0-4) that maps to preparedness levels:

- **0**: Unprepared → "low"
- **1**: Somewhat prepared → "low"
- **2-3**: Adequately prepared → "medium"
- **4**: Extremely prepared → "high"

These thresholds are defined in the `getPreparedness()` function in `docs/js/app.js`.

## Shareable URLs

Results are encoded in the URL hash using this format:
```
#r=0-2.1-3.2-1.&datetime=2024-01-15-3-30-45-pm&gid=GA_ID&pid=PARTICIPANT_ID
```

- `r`: Encoded answers (index-answer pairs separated by dots)
- `datetime`: Timestamp of completion
- `gid`: Google Analytics client ID
- `pid`: Participant ID

When a user visits a URL with `#r=`, the application automatically loads and displays those results.

## Browser Compatibility

The application uses modern JavaScript features and should work in:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development Tips

1. **Debug Mode**: Set `const debug = true;` in `docs/js/app.js` (line 15) to enable console logging
2. **Skip to Results**: Use browser console: `quizApp.skipToResults()` to test results page
3. **CSV Export**: Press `Shift + C` to download quiz data as CSV (debug feature)
4. **Local Testing**: Use a local server (not `file://`) to avoid CORS issues with JSON loading

## License

This work is licensed under the [Creative Commons Attribution-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-sa/4.0/).

You are free to:
- **Share**: Copy and redistribute the material in any medium or format
- **Adapt**: Remix, transform, and build upon the material for any purpose

Under the following terms:
- **Attribution**: You must give appropriate credit
- **ShareAlike**: If you remix, transform, or build upon the material, you must distribute your contributions under the same license

## Support

For questions or issues:
1. Check the code comments in `docs/js/app.js` for implementation details
2. Review the JSON data files for structure examples
3. Open an issue on the repository (if available)

## Acknowledgments

This project was developed in collaboration with undercapitalized innovators deploying science and technology. The work was supported by funding from the National Science Foundation (Award #2331195).

---

**Ready to create your own version?** Start by customizing `docs/data/quiz.json` with your questions and `docs/data/blocks.json` with your building blocks. The application will automatically adapt to your data structure!
