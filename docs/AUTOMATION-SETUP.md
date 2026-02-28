# Airtable Automation Setup — Auto-Approve Imported Contacts

This automation runs automatically when you set an Imported Contact's Onboarding Status to "Approved". It creates a Contact, matches/creates a Company, links Specialties, and connects everything together.

## Setup Steps

### 1. Open Automations

1. Go to your **ILS CRM** base in Airtable
2. Click the **Automations** tab at the top

### 2. Create the Trigger

1. Click **Create automation**
2. Name it: **"Approve Imported Contact → Create Contact"**
3. Click **Add trigger** → choose **"When record matches conditions"**
4. Configure:
   - **Table:** Imported Contacts
   - **Condition 1:** Onboarding Status **is** "Approved"
   - **Condition 2:** Related CRM Contact **is empty**
5. Click **Test trigger** to verify it finds records

### 3. Add the Script Action

1. Click **Add action** → choose **"Run a script"**
2. In the **Input variables** panel on the left side:
   - Click **+ Add input variable**
   - Name: `recordId`
   - Value: Click the blue **+** button → select the record ID from the trigger step
3. In the script editor, **delete all default code** and paste the entire contents of `scripts/airtable-automation.js`
4. Click **Test action** to verify it runs (it will process a real record!)

### 4. Set Output Variables (Optional)

If you want to chain additional actions (like sending a Slack notification), the script outputs:
- `status` — "created" or "skipped"
- `contactId` — The new Contact record ID
- `contactName` — The contact's full name
- `companyId` — The matched/created Company record ID

### 5. Turn On the Automation

1. Toggle the automation **ON** (top right)
2. That's it! Now whenever you change an Imported Contact's status to "Approved", it will automatically:
   - Create a Contact with all the data mapped over
   - Match to an existing Company (or create a new one)
   - Link Specialties (creating new ones if needed)
   - Link everything back together
   - Set the "Sync to Contacts" checkbox

## How to Use

1. Open the **Imported Contacts** table
2. Review a contact's information
3. Change **Onboarding Status** to **"Approved"**
4. Wait a few seconds — the automation runs automatically
5. Check the **Related CRM Contact** field — it will now show the linked Contact
6. The new Contact appears in the **Contacts** table with all data mapped

## Troubleshooting

- **Automation didn't run:** Check that "Related CRM Contact" was empty. If it's already linked, the automation skips it.
- **Company not matched:** The fuzzy matching uses 80% similarity threshold. If the company name is very different from what's in the Companies table, a new company is created instead.
- **Script error:** Check the automation run history (click the automation name → "Run history") to see error details.

## CLI Alternative

You can also run the approval script manually from the command line:

```bash
cd scripts/
node approve-contact.js --all        # Process all approved, unlinked contacts
node approve-contact.js --dry --all  # Preview what would happen (no changes)
node approve-contact.js <recordId>   # Process a single record
```
