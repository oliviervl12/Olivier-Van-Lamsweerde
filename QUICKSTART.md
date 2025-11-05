# Quick Start Guide

Get your Huisartsen Scraper up and running in 15 minutes!

## Prerequisites Checklist

Before you begin, make sure you have:

- [ ] N8N installed and running (https://n8n.io/)
- [ ] Google Cloud account with billing enabled
- [ ] Google account for Sheets
- [ ] OpenAI API account (or alternative LLM)

## 5-Minute Setup

### Step 1: Get Your API Keys (5 min)

#### Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Places API**
4. Go to Credentials → Create Credentials → API Key
5. Copy your API key

#### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to API Keys
4. Create new secret key
5. Copy your API key (you won't see it again!)

### Step 2: Prepare Google Sheets (2 min)

1. Create a new Google Sheet
2. Rename the first sheet to: **Practice Info**
3. Add these column headers:
   ```
   practice_name | address | postal_code | city | phone | email | website | doctors_count | scraped_date
   ```
4. Create a second sheet named: **Doctor Details**
5. Add these column headers:
   ```
   practice_name | practice_city | doctor_name | doctor_email | doctor_phone | specialization | scraped_date
   ```
6. Copy the Spreadsheet ID from the URL (the long string between `/d/` and `/edit`)

### Step 3: Import to N8N (3 min)

1. Open your N8N instance
2. Click **Workflows** in the sidebar
3. Click **Add workflow** → **Import from File**
4. Select `huisartsen-scraper-workflow.json`
5. The workflow will open

### Step 4: Configure Credentials (3 min)

#### Add Google Maps Credential
1. In the workflow, click on **"Search Google Places"** node
2. Click **Credential to connect with**
3. Select **Create New Credential**
4. Choose **Google Maps API**
5. Paste your API key
6. Name it "Google Maps" and save

#### Add Google Sheets Credential
1. Click on **"Write to Practice Info Tab"** node
2. Click **Credential to connect with**
3. Select **Create New Credential**
4. Choose **Google Sheets OAuth2 API**
5. Follow the OAuth flow
6. Grant permissions
7. Save

#### Add OpenAI Credential
1. Click on **"AI Extract Information"** node
2. Click **Credential to connect with**
3. Select **Create New Credential**
4. Choose **OpenAI API**
5. Paste your API key
6. Save

### Step 5: Configure Sheet IDs (2 min)

1. Click on **"Write to Practice Info Tab"** node
2. In **Document**, select **From List** or enter your Spreadsheet ID
3. Verify **Sheet Name** is set to: `Practice Info`
4. Click on **"Write to Doctor Details Tab"** node
5. Set the same Spreadsheet ID
6. Verify **Sheet Name** is set to: `Doctor Details`

## First Run (5 min)

### Test the Workflow

1. Click **Execute Workflow** button (top right)
2. Watch the nodes execute (they'll turn green when successful)
3. Check for any errors (red nodes)
4. Go to your Google Sheet to see results!

### What You Should See

If everything works:
- Green checkmarks on all nodes
- Data appearing in your Google Sheet
- "Practice Info" tab filled with practice details
- "Doctor Details" tab filled with doctor information

### Troubleshooting Quick Fixes

#### ❌ "API key not valid"
- Double-check your API keys are correct
- Verify APIs are enabled in Google Cloud
- Check billing is enabled for Google Cloud

#### ❌ "Authentication failed"
- Re-do the OAuth flow for Google Sheets
- Make sure you granted all permissions

#### ❌ "Sheet not found"
- Verify sheet names match exactly (case-sensitive!)
- Check spreadsheet ID is correct

#### ❌ "No results found"
- This is normal for the test run
- The default search might have limitations
- Try adjusting the search query

## Customize Your Search

### Search Specific Cities

1. Click on **"Set Initial Parameters"** node
2. Change the search query:
   - For Amsterdam: `huisartsenpraktijk Amsterdam`
   - For Rotterdam: `huisartsenpraktijk Rotterdam`
   - For multiple: Create separate workflow runs

### Adjust Rate Limiting

1. Click on **"Rate Limit Delay"** node
2. Change the delay:
   ```javascript
   const delayMs = 2000; // 2 seconds
   // Increase to 5000 for 5 seconds if getting rate limited
   ```

## Running Automatically

### Enable Scheduled Execution

1. Find the **"Schedule (Optional)"** node
2. Click on it
3. Click the **Enabled** toggle (bottom of node settings)
4. Adjust the schedule:
   - Current: Every 6 hours
   - Change to daily: `0 9 * * *` (9 AM daily)
   - Change to weekly: `0 9 * * 1` (Monday 9 AM)
5. Save the workflow
6. Click **Active** toggle (top right) to activate

## Next Steps

### Expand Your Scraping

1. **More Cities**: Create loops for multiple cities
2. **More Data**: Modify AI prompt to extract additional fields
3. **Data Validation**: Add validation nodes to check data quality
4. **Notifications**: Add email/Slack alerts on completion

### Monitor Your Usage

- **Google Maps API**: Check quota usage in Google Cloud Console
- **OpenAI API**: Monitor usage at platform.openai.com
- **N8N Executions**: View execution history in N8N

### Optimize Performance

1. **Batch Processing**: Process 10-20 practices at a time
2. **Caching**: Store results to avoid re-scraping
3. **Error Handling**: Add try-catch and retry logic
4. **Parallel Execution**: Process multiple requests simultaneously

## Cost Estimates

Approximate costs per 100 practices:

- **Google Places API**
  - Places Search: $0.032 per request
  - Place Details: $0.017 per request
  - Total: ~$5 per 100 practices

- **OpenAI API**
  - GPT-4: ~$0.03-0.06 per practice
  - GPT-3.5-Turbo: ~$0.002 per practice
  - Total: $2-6 per 100 practices

- **Google Sheets**: Free (within limits)

**Total**: ~$7-11 per 100 practices with GPT-4

### Save Money

- Use GPT-3.5-Turbo instead of GPT-4 (10x cheaper)
- Cache results to avoid re-processing
- Optimize prompts to use fewer tokens
- Batch requests when possible

## Support Resources

- **Full Documentation**: See [README.md](README.md)
- **Configuration Options**: See [config.template.env](config.template.env)
- **N8N Docs**: https://docs.n8n.io/
- **Google Places API**: https://developers.google.com/maps/documentation/places/web-service
- **OpenAI API**: https://platform.openai.com/docs

## Common Questions

### Q: How many practices can I scrape?
**A:** Limited by your API quotas. Google Places defaults to 1000 requests/day.

### Q: Is this legal?
**A:** Only scrape publicly available information and respect terms of service and GDPR regulations.

### Q: Can I use a different LLM?
**A:** Yes! You can use Anthropic Claude, local models (Ollama), or any LLM N8N supports.

### Q: How accurate is the data?
**A:** AI extraction is ~85-95% accurate. Always verify critical data manually.

### Q: Can I export to other formats?
**A:** Yes! Add nodes for CSV, Excel, databases, or APIs.

## Success Tips

1. ✅ Start with a small test (5-10 practices)
2. ✅ Verify data quality before scaling
3. ✅ Implement rate limiting to be respectful
4. ✅ Monitor API costs as you scale
5. ✅ Backup your data regularly
6. ✅ Keep credentials secure

---

**Ready to scrape?** Execute your first workflow and watch the data flow! 🚀

Questions? Check the [full README](README.md) for detailed information.
