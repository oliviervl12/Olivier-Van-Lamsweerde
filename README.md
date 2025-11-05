# Huisartsen Scraper - N8N Workflow

An automated N8N workflow for scraping information about Dutch general practitioner practices (huisartsenpraktijken) and organizing the data in Google Sheets.

## Features

This workflow automatically extracts and organizes the following information:

- **Practice Information:**
  - Practice name
  - Full address (street, number, postal code, city)
  - Main phone number
  - Email address
  - Website
  - Number of doctors

- **Doctor Details:**
  - Individual doctor names
  - Doctor-specific email addresses (when available)
  - Direct phone lines (when available)
  - Specializations

- **Output Format:**
  - Organized Google Sheets with multiple tabs
  - Timestamped data for tracking
  - Clean, structured format

## Data Sources

The workflow uses multiple data sources for comprehensive coverage:

1. **Google Places API** - Primary source for practice locations and basic info
2. **Practice Websites** - Detailed doctor information and contact details
3. **Zorgkaart Nederland** - Alternative/supplementary data source (optional)

## Prerequisites

Before using this workflow, you need:

### 1. N8N Installation
- N8N instance (self-hosted or cloud)
- Version 1.0+ recommended
- Install from: https://n8n.io/

### 2. Google Maps API
- Google Cloud account
- Places API enabled
- API key with the following APIs:
  - Places API
  - Geocoding API (optional, for address validation)
- Get your API key: https://console.cloud.google.com/apis

### 3. Google Sheets API
- Google account
- OAuth2 credentials configured in N8N
- Spreadsheet prepared with required tabs (see below)

### 4. AI/LLM Service
Choose one:
- **OpenAI API** (recommended)
  - API key from: https://platform.openai.com/
- **Local LLM** (e.g., Ollama, LM Studio)
- **Other providers** (Anthropic, Cohere, etc.)

## Setup Instructions

### Step 1: Import the Workflow

1. Open your N8N instance
2. Click on "Workflows" in the sidebar
3. Click "Import from File" or "Import from URL"
4. Select `huisartsen-scraper-workflow.json`
5. Click "Import"

### Step 2: Configure Credentials

#### Google Maps API
1. In N8N, go to **Credentials** → **New**
2. Select "Google Maps API"
3. Enter your API key
4. Save the credential

#### Google Sheets OAuth2
1. Go to **Credentials** → **New**
2. Select "Google Sheets OAuth2 API"
3. Follow the OAuth flow to authorize N8N
4. Grant necessary permissions
5. Save the credential

#### OpenAI API (or alternative LLM)
1. Go to **Credentials** → **New**
2. Select "OpenAI API"
3. Enter your API key
4. Save the credential

### Step 3: Prepare Google Sheets

Create a new Google Sheet with the following tabs:

#### Tab 1: "Practice Info"
Columns:
- practice_name
- address
- postal_code
- city
- phone
- email
- website
- doctors_count
- scraped_date

#### Tab 2: "Doctor Details"
Columns:
- practice_name
- practice_city
- doctor_name
- doctor_email
- doctor_phone
- specialization
- scraped_date

#### Tab 3: "Contact Information" (Optional)
For aggregated contact data:
- entity_name (practice or doctor)
- entity_type (practice/doctor)
- email
- phone
- city
- scraped_date

**Important:** Make sure the column headers exactly match the names above.

### Step 4: Configure the Workflow

1. Open the imported workflow
2. Update the following nodes:

#### "Search Google Places" Node
- Add your Google Maps API credential
- Adjust search query if needed

#### "Get Place Details" Node
- Add your Google Maps API credential

#### "AI Extract Information" Node
- Select your LLM provider (OpenAI, local, etc.)
- Add the appropriate credential
- Adjust the prompt if needed for better extraction

#### "Write to Practice Info Tab" Node
- Select your Google Sheets credential
- Enter your spreadsheet ID or select from list
- Verify the sheet name matches: "Practice Info"

#### "Write to Doctor Details Tab" Node
- Select your Google Sheets credential
- Enter your spreadsheet ID or select from list
- Verify the sheet name matches: "Doctor Details"

### Step 5: Test the Workflow

1. Click "Execute Workflow" to run a test
2. Monitor the execution in the workflow view
3. Check for any errors in individual nodes
4. Verify data appears correctly in your Google Sheet

## Usage

### Manual Execution

1. Open the workflow in N8N
2. Click the "Execute Workflow" button
3. Wait for completion (may take several minutes depending on results)
4. Check your Google Sheet for the scraped data

### Scheduled Execution (Optional)

To run the workflow automatically:

1. Enable the "Schedule (Optional)" trigger node
2. Configure the schedule:
   - Current: Every 6 hours
   - Adjust as needed (daily, weekly, etc.)
3. Save and activate the workflow

### Customizing the Search

Modify the "Set Initial Parameters" node to change:

- **Search query:** Default is "huisartsenpraktijk"
  - Try: "huisarts amsterdam" for specific city
  - Try: "huisartsenpraktijk utrecht" for regional focus
- **Country:** Default is "Netherlands"
- **Additional filters:** Add postal codes, regions, etc.

## Advanced Configuration

### Rate Limiting

The workflow includes a 2-second delay between requests. Adjust in the "Rate Limit Delay" node:

```javascript
const delayMs = 2000; // Change to your preferred delay (milliseconds)
```

### AI Prompt Customization

Edit the "AI Extract Information" node prompt to:
- Extract additional fields
- Focus on specific information
- Improve extraction accuracy
- Handle different website structures

### Alternative Data Sources

The workflow includes a disabled "Zorgkaart Search" node:
1. Enable the node
2. Configure the scraping logic
3. Merge results with Google Places data

### Error Handling

Add error handling nodes:
- Email notifications on failures
- Retry logic for failed requests
- Data validation before writing to sheets

## Data Privacy & Compliance

⚠️ **Important Legal Considerations:**

- Respect website terms of service
- Follow GDPR regulations for Dutch data
- Only collect publicly available information
- Honor robots.txt directives
- Implement appropriate rate limiting
- Store data securely
- Consider data retention policies

**This tool is for legitimate business/research purposes only.**

## Troubleshooting

### Common Issues

#### "No results found"
- Check your Google Places API quota
- Verify the search query is appropriate
- Try broader search terms
- Check API key permissions

#### "Failed to scrape website"
- Website may block automated access
- Add user-agent headers
- Implement respectful delays
- Some sites may require JavaScript rendering

#### "AI extraction errors"
- Website structure may be non-standard
- Adjust the AI prompt for better guidance
- Increase LLM temperature for flexibility
- Try a different model

#### "Google Sheets write failed"
- Verify spreadsheet ID is correct
- Check tab names match exactly
- Ensure OAuth permissions are granted
- Check column names match the workflow

### Debug Mode

Enable debug mode in N8N:
1. Click the workflow settings
2. Enable "Save manual executions"
3. Enable "Save execution progress"
4. Run the workflow
5. Inspect individual node outputs

## Workflow Structure

```
Start/Schedule Trigger
    ↓
Set Initial Parameters
    ↓
Search Google Places (API)
    ↓
Extract Basic Info
    ↓
Get Place Details (API)
    ↓
Rate Limit Delay
    ↓
Scrape Practice Website
    ↓
AI Extract Information (LLM)
    ↓
Filter Valid Practices
    ↓
Structure Data
    ↓
├── Write to Practice Info Tab
└── Write to Doctor Details Tab
```

## Performance Considerations

- **API Quotas:** Google Places API has daily limits
- **Rate Limits:** Respect server rate limits (default: 2s delay)
- **Execution Time:** Large searches may take 30+ minutes
- **Cost:** OpenAI API calls have per-token costs

## Optimization Tips

1. **Batch Processing:** Process practices in chunks
2. **Caching:** Store results to avoid re-scraping
3. **Incremental Updates:** Only scrape new/changed practices
4. **Parallel Execution:** Process multiple practices simultaneously (with caution)
5. **Data Deduplication:** Check for existing entries before writing

## Extending the Workflow

### Add More Data Fields
1. Update the AI extraction prompt
2. Modify the "Structure Data" node
3. Add columns to Google Sheets
4. Update the write nodes

### Multiple Cities/Regions
1. Add a loop node before "Set Initial Parameters"
2. Provide a list of cities or postal codes
3. Process each location sequentially

### Export to Other Formats
1. Add nodes for CSV export
2. Connect to databases (PostgreSQL, MySQL)
3. Send to CRM systems
4. Post to APIs

## Support & Contributing

### Issues
If you encounter problems:
1. Check the troubleshooting section
2. Review N8N logs
3. Verify all credentials are valid
4. Test each node individually

### Improvements
Suggestions for improvements:
- Better error handling
- Additional data sources
- More sophisticated AI extraction
- Alternative export formats

## License

This workflow is provided as-is for educational and legitimate business purposes. Please ensure you comply with all applicable laws and terms of service when using this tool.

## Version History

- **v1.0** (2025-01-05)
  - Initial release
  - Google Places integration
  - AI-powered extraction
  - Multi-tab Google Sheets export
  - Rate limiting and error handling

## Acknowledgments

- N8N community for workflow patterns
- Google Places API for location data
- OpenAI for intelligent data extraction
- Dutch healthcare data sources

---

**Happy Scraping!** 🏥🇳🇱

For questions or support, please refer to the N8N documentation: https://docs.n8n.io/
