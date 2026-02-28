# ILS CRM Airtable Schema Summary

**Base ID:** appYXbUdcmSwBoPFU
**Snapshot Date:** 2026-02-27
**Total Tables:** 11

## Table Overview

| # | Table | ID | Fields | Views |
|---|---|---|---|---|
| 1 | **Contacts** | `tbl9Q8m06ivkTYyvR` | 57 | 5 |
| 2 | **Opportunites** | `tblsalt5lmHlh4s7z` | 23 | 8 |
| 3 | **Tasks** | `tblwEt5YsYDP22qrr` | 12 | 5 |
| 4 | **Proposals** | `tblODEy2pLlfrz0lz` | 13 | 2 |
| 5 | **Projects** | `tbll416ZwFACYQSm4` | 18 | 2 |
| 6 | **Interactions** | `tblTUNClZpfFjhFVm` | 9 | 2 |
| 7 | **Imported Contacts** | `tblribgEf5RENNDQW` | 48 | 4 |
| 8 | **Companies** | `tblEauAm0ZYuMbHUa` | 24 | 3 |
| 9 | **Specialties** | `tblysTixdxGQQntHO` | 3 | 2 |
| 10 | **Portal Access** | `tblN1jruT8VeucPKa` | 37 | 1 |
| 11 | **Portal Logs** | `tblj70XPHI7wnUmxO` | 12 | 1 |

---

## 1. Contacts (57 fields)

- **Table ID:** `tbl9Q8m06ivkTYyvR`
- **Views:** Grid view (grid), Gallery (gallery), Partners (grid), Partners Gallery (gallery), Vendors (grid)

### Single Line Text (11)
- **Contact Name** (`fldMkz6x5i8YaofZj`) -- primary field
- **First Name** (`fldBzVPUdMy99vfvp`)
- **Last Name** (`fldq4VxEf0jJgi6O5`)
- **Job Title** (`fldvecarEW7fx90Ci`)
- **Company** (`fldTwuGnEhbQfZhP3`)
- **Imported Contact Name** (`fldnukky57mRgMpxv`)
- **Address Line** (`fldxn8YVJ1pWGkaF8`)
- **City** (`fldAoanFJ1Fmrzkx5`)
- **State** (`fld1qq6PMLW6Ytbig`)
- **Country** (`fldnTdpTO4njtc4gZ`)
- **Postal Code** (`fldGgFJJ7XeLAR17a`)

### Multi-Line Text (6)
- **Notes** (`fldfbmMsacAKerGek`)
- **Review Notes** (`fldB5b9qTiIUkdiLk`)
- **Reason for Rejection** (`fldDwXhduziJxKyCx`)
- **Rate Info** (`fldFX8WvENPPkN6g1`) -- Pricing notes, day rates, typical project costs
- **Lead Note** (`fldWtoMSWdFla3dII`)
- **Event Tags** (`fld1D4u2KbIk0aUPR`) -- singleLineText, not multiSelect

### Email (1)
- **Email** (`fldBjSvbdd5WXmoIG`)

### Phone Number (3)
- **Phone** (`fldwF5NBjGVndCXNV`)
- **Mobile Phone** (`fldwULn4qSjwzSOTj`)
- **Work Phone** (`fldueNgIMN0Ui5MWw`)

### URL (2)
- **LinkedIn URL** (`fldWrrBfD7aLxsXT4`)
- **Website** (`fldnWic86lLjcF9MR`)

### Number (1)
- **Lead Score** (`fldxNhfwoMf7UWVoT`) -- precision 0

### Date (4)
- **Last Contact Date** (`fldoILwnnEloVrzLk`) -- ISO format
- **Import Date** (`fldoeYmeSZDrd7Y25`) -- local format
- **Review Completion Date** (`fld6gBrJu9XCGAIll`) -- local format

### Single Select (9)
- **Qualification Status** (`fld5Ed1Gg51xRBIrm`)
  - Choices: New Lead, Qualified, Contacted, Disqualified, Converted, Unqualified
- **Lead Source** (`fldxxbhPmFaJ7xZeK`)
  - Choices: Referral, Website, Inbound, Outbound, Event, Social Media, Other, LinkedIn, Cold Call
- **Client Type** (`fldF8X4HZbybc1Yy6`)
  - Choices: Prospect, Customer, Partner, Reseller, Vendor, Other, New, Returning
- **Industry** (`fldHoIj9zCNB15avX`)
  - Choices: Technology, Healthcare, Finance, Education, Manufacturing, Real Estate, Consulting, Other, Hospitality, Logistics, Fitness, Legal, Media, Design, Venture Capital, Retail, Entertainment
- **Import Source** (`fldZG5LYBnFcEwhyw`)
  - Choices: CSV Upload, API Sync, Manual Entry, Third Party, Integration, Other, Popl
- **Onboarding Status** (`fldbCsU8sEBNRm1kX`)
  - Choices: Pending Review, In Review, Approved, Rejected, Needs Info, Duplicate
- **Categorization** (`fldofD9DQHfugTxsC`)
  - Choices: Lead, Customer, Partner, Other, Unknown, Vendor, Talent
- **Quality Rating** (`fldz86orj3p0ynZGB`) -- star ratings, for partners/vendors
  - Choices: 5-star Excellent, 4-star Good, 3-star Average, 2-star Below Average, 1-star Poor
- **Reliability Rating** (`fldgIuvazBCfLa7Wu`) -- for partners/vendors
  - Choices: 5-star Excellent, 4-star Good, 3-star Average, 2-star Below Average, 1-star Poor
- **Partner Status** (`fldIEgv4HtZTr57AX`) -- for partners/vendors
  - Choices: Active - Preferred, Active, Inactive, Do Not Use
- **Partner Type** (`fldvehyP9Y3Ra2wUM`) -- for partners/vendors
  - Choices: Fabricator, AV/Lighting, Scenic/Set Builder, Architect, Interior Designer, Graphic Designer, F&B Consultant, Tech/Interactive, Operations Consultant, Production Company, Freelancer/Individual, Other, Client

### Multiple Select (1)
- **Tags** (`fldO7kfLDA9jZswPB`)
  - Choices: Architecture, Art Director, Audio, AVC, Concerts, Creative Director, Events, Experiences, F&B Consulting, Fabrication, FFE, Interiors, Kitchen Consulting, Luxury, Manufacture - Lighting, Manufacture-Materials, Manufacture-Video, Marketing, Media, PerformerManagement, Producer, Production, ProjectManagement, Scenography, ShowDirector, SoundMixing, Sourcing, Strategy, Video, Writing, IAAPA25, LDI2025, SohoHolloway, SOHOHOLLOWAY, SATE2025, SATE25, CRM, SOHO HOLLOWAY, SATE 2025, Soho Holloway

### Checkbox (1)
- **Sync to Contacts** (`fldxbLMAKgqeawWkw`)

### Linked Records (8)
- **Specialties** (`fldPgiO2nKgcujeXz`) -> **Specialties**
- **Proposals** (`fldPxLDh74yCpYwuF`) -> **Proposals**
- **Sales Opportunities** (`fldYhB3vDq28worr9`) -> **Opportunites**
- **Imported Contacts** (`fldj08SdhFcsYpRva`) -> **Imported Contacts**
- **Interactions** (`fldgWTSW7dKdCZPFl`) -> **Interactions**
- **Tasks** (`fldsWpetRKu2E4e9U`) -> **Tasks**
- **Projects** (`fldtExCKnttD4XsMe`) -> **Projects**
- **Companies** (`fldYXDUc9YKKsGTBt`) -> **Companies**
- **Projects (as Partner/Vendor)** (`fldOOrElk4KRkSxcG`) -> **Projects**
- **Portal Access** (`fld0W66oRTQwvb9Nq`) -> **Portal Access**

### Rollup (1)
- **Last Interaction Date** (`fldptkl81ex4SvQYN`) -- rolls up via Interactions link, gets Date field

### Collaborator (2)
- **Imported By** (`fldO7a9QFfKQ7tbkg`)
- **Assigned Admin** (`fld5dsmbFIwgU5UHk`)

### Created By (1)
- **Created By** (`fld18NNjUH4xe7kSS`)

### Attachments (3)
- **Contact Photo** (`fldl1WOfz7vHNSOUd`)
- **Company Logo** (`flduN4Ne23EIGSBS0`)
- **Portfolio/Samples** (`fldbhgP4g3zAoHnSR`) -- for partners/vendors

---

## 2. Opportunites (23 fields)

- **Table ID:** `tblsalt5lmHlh4s7z`
- **Note:** Table name has typo -- should be "Opportunities"
- **Views:** Overall List (grid), Cold List (grid), GALLERY (gallery), List temp (levels), Sync (grid), Active Pipeline (grid), Future Roadmap (grid), Kanban (kanban)

### Single Line Text (2)
- **Opportunity Name** (`fldsvZbiY3YFK2Ocp`) -- primary field
- **Referred By** (`fldZ3V2AL5IFj6W1G`)

### Multi-Line Text (3)
- **Notes: About** (`fldLZDfABWEJ9fCyZ`)
- **Contract Milestones** (`fldLjPejA0TcYj8R8`)
- **Loss Notes** (`fldVOzXUQ5lMYzcVp`)

### Currency (1)
- **Deal Value** (`fld1y3pUaljvn2nF5`) -- $, precision 2

### Date (1)
- **Expected Close Date** (`fldpSYPc9Mf1hRhdU`) -- ISO format

### Date/Time (1)
- **Next Meeting Date** (`fld7ZbwNVRSKCOly8`) -- ISO, 24-hour, UTC

### Single Select (6)
- **Sales Stage** (`fldMV4ZUWb0h1pyPN`)
  - Choices: Qualification, Meeting Scheduled, Proposal Sent, Negotiation, Closed Won, Closed Lost, Initial Contact, Contract Sent, Development, Investment, Future Client
- **Probability** (`fld4oRQmcZ3VaQeUP`)
  - Choices: Cold, Low, 02 Medium, 01 High, 04 FUTURE ROADMAP
- **Quals Type** (`fldhJn8M3xeQYdPHG`)
  - Choices: Standard Capabilities Deck, Customized Quals, Both
- **Lead Source** (`fldDr4GsoxjnNmpo1`)
  - Choices: Referral, Inbound - Website, Inbound - LinkedIn, Inbound - Conference/Event, Outbound Prospecting, Past Relationship, Other, Partnership
- **Win/Loss Reason** (`fldEkMImrxZQMnuCJ`)
  - Choices: Won - Best Fit, Won - Relationship, Won - Price, Lost - Budget, Lost - Competitor, Lost - Timing, Lost - No Decision, Lost - Scope Mismatch

### Multiple Select (1)
- **Engagement Type** (`fldYvZ8T1Iy7r91z5`)
  - Choices: Strategy/Consulting, Design/Concept Development, Production/Fabrication Oversight, Opening/Operations Support, Executive Producing

### Checkbox (1)
- **Qualifications Sent** (`flda4mTsRoIiFqVZL`)

### Linked Records (5)
- **Company** (`fldYyFlO4LavZM5gI`) -> **Companies**
- **Associated Contact** (`fldit4f09UfFrzSUB`) -> **Contacts** (prefers single)
- **Tasks** (`fldBGsrhhPk7egFL1`) -> **Tasks**
- **Interactions** (`fldyL4Obl1EfVvpVU`) -> **Interactions**
- **Project** (`fldrOFbZgxZ6izAla`) -> **Projects**
- **Proposals** (`fldQNa9p8jAEnrZB2`) -> **Proposals**

### Formula (1)
- **Probability Value** (`flda4MrS0FecCa4TO`) -- `IF({fld4oRQmcZ3VaQeUP} = 'High', 0.8, IF({fld4oRQmcZ3VaQeUP} = 'Medium', 0.5, 0))`

### Attachments (1)
- **Attachments** (`fldVld8A8bfeyPnJG`)

---

## 3. Tasks (12 fields)

- **Table ID:** `tblwEt5YsYDP22qrr`
- **Description:** Follow-ups, to-dos, and action items
- **Views:** Grid view (grid), Tasks Due Soon (grid), Active Tasks (gallery), List (levels), Sync (grid)

### Single Line Text (1)
- **Task** (`fldfYqgokx0nP9jrq`) -- primary field

### Multi-Line Text (1)
- **Notes** (`fldwi4Fm7aOdyh7R3`)

### Date (2)
- **Due Date** (`fldrV9zjZGNlm2znw`) -- ISO format
- **Completed Date** (`fldOE0MEitlXCeC5e`) -- ISO format

### Single Select (3)
- **Status** (`fld5j051j1H7rPmbw`)
  - Choices: To Do, In Progress, Waiting, Completed, Cancelled
- **Type** (`fldXcqtkVSh60H20b`)
  - Choices: Administrative, Follow-up Call, Follow-up Email, Internal Review, Other, Presentation Deck, Research, Schedule Meeting, Send Proposal, Send Qualifications
- **Priority** (`fldREFoOWpRN4Ejfg`)
  - Choices: High, Medium, Low

### Linked Records (4)
- **Sales Opportunities** (`fldhzkBEvT2UlcW7g`) -> **Opportunites**
- **Contacts** (`fldyzxf3dGGCT02t0`) -> **Contacts**
- **Projects** (`fldtxrwOzmkpjVtdj`) -> **Projects**
- **Proposal** (`fldB9nEqdI6EZMfPo`) -> **Proposals**

### Collaborator (1)
- **Assigned To** (`fldtfWkEqvv5YHODj`)

---

## 4. Proposals (13 fields)

- **Table ID:** `tblODEy2pLlfrz0lz`
- **Views:** Grid view (grid), Sync (grid)

### Single Line Text (2)
- **Proposal Name** (`fld5Y8fCuS1jhkWF2`) -- primary field
- **Version** (`fldQ8g5iqtMPHxb8S`)

### Multi-Line Text (2)
- **Client Feedback** (`fldhUnP1A7gxJNaxe`)
- **Performance Metrics** (`fldZeAOE1WpLOY3aH`)

### Rich Text (1)
- **Notes** (`fldryZ3MW513WcmrK`)

### Single Select (3)
- **Status** (`fldBzyWMITVJdZyRl`)
  - Choices: Draft, Pending Approval, Approved, Sent to Client, Closed Won, Closed Lost, Submitted, In Review, Rejected
- **Template Used** (`fldAOt35mhF1ne0UK`)
  - Choices: Basic, Detailed, Custom, Standard Template, Custom Template, Marketing Template, IT Template, Service Template, Design Template, Security Template, Strategy Template, HR Template, Event Template
- **Approval Status** (`fldwWCRdvqYVTXZ12`)
  - Choices: Not Submitted, Submitted, Approved, Rejected, Pending, Under Review

### Linked Records (4)
- **Client** (`fldoz0V3WTPup4zv8`) -> **Contacts** (prefers single)
- **Company** (`fldxxsjKV66IhPKzL`) -> **Companies**
- **Related Opportunity** (`fldPs5pFveiqZbpnn`) -> **Opportunites**
- **Tasks** (`fldQARjLcMpanbY6m`) -> **Tasks**

### Created By (1)
- **Created By** (`fld9TDETWFG7tFusb`)

---

## 5. Projects (18 fields)

- **Table ID:** `tbll416ZwFACYQSm4`
- **Description:** Active and completed projects - post-close project tracking and delivery
- **Views:** Grid view (grid), Sync (grid)

### Single Line Text (2)
- **Project Name** (`fldkrhZTZ6pFweiBx`) -- primary field
- **Location** (`fldFwzNbpWAL9tV8R`)

### Multi-Line Text (3)
- **Description** (`fldr8mgLCY9ISv4Bd`)
- **Key Milestones** (`fld19Ezi7Md5PPWxQ`)
- **Lessons Learned** (`fldKxqY5ZYIrCIOgU`)

### Currency (1)
- **Contract Value** (`fld4J4KCazP7C1IMC`) -- $, precision 0

### Date (3)
- **Start Date** (`fldTOw6VgwsvJXW7O`) -- ISO
- **Target Completion** (`fldID5gpDgtmQDVUd`) -- ISO
- **Actual Completion** (`fldKc3rU95N8sCDdg`) -- ISO

### Single Select (1)
- **Status** (`fld4Pv2FM3skC3chQ`)
  - Choices: Kickoff, Discovery, Concept Development, Design Development, Production, Installation, Opening/Launch, Closeout, Complete, On Hold, Cancelled, Strategy

### Multiple Select (1)
- **Engagement Type** (`fld5nII1Fq8N1LVEO`)
  - Choices: Strategy/Consulting, Design/Concept Development, Production/Fabrication Oversight, Opening/Operations Support

### Linked Records (5)
- **Sales Opportunities** (`fldUKkazQiEmhIH4E`) -> **Opportunites**
- **Client** (`fldMMHrrBsAHvyQ0e`) -> **Companies**
- **Tasks** (`fldizOqFE6ParTzho`) -> **Tasks**
- **Primary Contact** (`fld5uAeJxjSB3WCqs`) -> **Contacts**
- **Contacts** (`fldTphE0ecQivlxxD`) -> **Contacts** (partner/vendor contacts)

### Collaborator (1)
- **Project Lead** (`fldDKZQgxaaAej7mU`)

### Attachments (1)
- **Project Files** (`fld2qAFRKhP3v5js2`)

---

## 6. Interactions (9 fields)

- **Table ID:** `tblTUNClZpfFjhFVm`
- **Description:** Log of all communications - calls, emails, meetings with contacts
- **Views:** Grid view (grid), Sync (grid)

### Single Line Text (1)
- **Subject** (`fldMog5p49xWLD5Zb`) -- primary field

### Multi-Line Text (2)
- **Summary** (`fldqqHNLs8mXW2RRA`)
- **Next Steps** (`fldyh8QUnhF3hUsBV`)

### Date (1)
- **Date** (`fldOTeAY7Y0JDnaMF`) -- ISO

### Single Select (2)
- **Type** (`fldsdGx3u8RPS8GrH`)
  - Choices: Email, Phone Call, Meeting (In-Person), Meeting (Virtual), Lunch/Dinner, Conference/Event, Note
- **Direction** (`fld9d6pw2GM3Syhag`)
  - Choices: Outbound (we initiated), Inbound (they initiated)

### Linked Records (2)
- **Contacts** (`fldNz08up6Zcn3HjK`) -> **Contacts**
- **Sales Opportunities** (`fldgRf0WkgdcMLseJ`) -> **Opportunites**

### Collaborator (1)
- **Logged By** (`fldn0mHhKfd88K6z8`)

---

## 7. Imported Contacts (48 fields)

- **Table ID:** `tblribgEf5RENNDQW`
- **Views:** Grid view (grid), Gallery (gallery), List (levels), Sync (grid)

### Single Line Text (18)
- **Imported Contact Name** (`fldKc8P6eYXjMpAJ6`) -- primary field
- **Company** (`fld31Zl7X7DBZdL9K`)
- **First Name** (`fld7c1acCh17aOi0p`)
- **Last Name** (`fldICvkgNbRG9dpqm`)
- **Job Title** (`fldTHA6J24XaECMsz`)
- **Email** (`fld9ejqJy5wjBqvrx`)
- **Event Tags** (`fldwI75ClzRJ7lli0`)
- **Address Line** (`fld1Zpkm1Kms9XvRv`)
- **City** (`fldfS2EeVb5l3ic5h`)
- **State** (`fldIoe4TldH0WJUZj`)
- **Country** (`fldljgJjsqMkpMbkc`)
- **Company Founding Year** (`fldCgacbjwFoRlHIp`)
- **Company NAICS Code** (`fldehmtkMRlb4M5Zi`)
- **Company Type** (`fldiB3195PfAK7Wfg`)
- **Company Size** (`fldsJURWi2VvrvN2v`)
- **Company Industry** (`fldiFajpEd7M14YBF`)
- **Company Annual Revenue** (`fldLJr6gTu9zTeo0r`)
- **Company Street Address** (`fldwAf4k6bsI922O4`)
- **Company Street Address 2** (`fldXhL0dxuxXxDnti`)
- **Company City** (`fld4tMsuM8QhnhuZm`)
- **Company State** (`fldv9qnkGC3pnZQnv`)
- **Company Country** (`fld4YLilZ2HdhmCse`)
- **Company Postal Code** (`fldamMPu4kkZGugZn`)
- **Postal Code** (`fldIsJaEWbMOb2juI`)

### Multi-Line Text (4)
- **Company Description** (`fldc5Aj4hRRZ4tIgE`)
- **Note** (`fldMsJukGZt02TYVu`)
- **Reason for Rejection** (`fld1A8rCPjuXYSGp1`)
- **Review Notes** (`fldKYaclj13Bmut7D`)

### Phone Number (5)
- **Phone** (`fldZfFoFsOrIW2wQZ`)
- **Mobile Phone** (`fldm8LaalVz7l38PS`)
- **Other Phone** (`fld9wvepdWiVG4i70`)
- **Work Phone** (`fld8MuOecNSVON5rD`)
- **Office Phone** (`fldUkm871jdjXQloI`)
- **Fax** (`fldBl4gTpGGFVEJOB`)

### URL (4)
- **LinkedIn URL** (`fldzikDES0UdCd4FQ`)
- **Website** (`fld57XgOQ9sFJOfof`)
- **Contact Photo URL** (`fldNdNyWMAGEOfOyH`)
- **Business Card Image URL** (`flduCN8BdOUkZeTTJ`)

### Date (1)
- **Import Date** (`fldNa8uThfClQFB79`) -- local format

### Single Select (3)
- **Categorization** (`fldrYKTLd2HnL7GSe`)
  - Choices: Lead, Customer, Partner, Other, Unknown, Vendor, Talent
- **Onboarding Status** (`fldncdRP37p6BB9UX`)
  - Choices: Approved, Rejected, Needs Info, Duplicate, Review
- **Import Source** (`fld1fDiNE3vhoyi3P`)
  - Choices: CSV Upload, API Sync, Manual Entry, Third Party, Integration, Other, Popl, Google Contacts - Auto Import

### Multiple Select (1)
- **Tags** (`fldn2bUb5Khf7iumL`)
  - Choices: Architecture, Art Director, Audio, AVC, Concerts, Creative Director, Events, Experiences, F&B Consulting, Fabrication, FFE, Interiors, Kitchen Consulting, Luxury, Manufacture - Lighting, Manufacture - Materials, Manufacture - Video, Marketing, Media, Performer Management, Producer, Production, Project Management, Scenography, Show Director, Sound Mixing, Sourcing, Stratagy, Video, Writing, IAAPA25, LDI2025, Soho Holloway, SOHO HOLLOWAY, SATE 2025, SATE25, CRM

### Checkbox (1)
- **Sync to Contacts** (`fldjm5mEIT25nlWjT`)

### Linked Records (2)
- **Specialties** (`fldlkF1wlCbxBQ3KJ`) -> **Specialties**
- **Related CRM Contact** (`fldDq3cetx5nrVqGo`) -> **Contacts** (prefers single)

### Collaborator (2)
- **Imported By** (`fldWK7U0Qj1dk8Ume`)
- **Assigned Admin** (`flds9MpvnwGkYX9Gi`)

---

## 8. Companies (24 fields)

- **Table ID:** `tblEauAm0ZYuMbHUa`
- **Description:** Organizations - clients, prospects, and companies you do business with
- **Views:** Grid view (grid), Contact Cards (gallery), Sync (grid)

### Single Line Text (8)
- **Company Name** (`fldVYiMOLq3LJgbZ3`) -- primary field
- **Address** (`fldyd3pnfJ5PCwwQD`)
- **City** (`fldJGkGiCoxduD4sg`)
- **State/Region** (`fldNekCaGCR56MLcJ`)
- **Country** (`fldjvoxUo8iuKITjB`)
- **Referred By** (`fldLLGU72wwf7LxEf`)
- **NAICS Code** (`fldL93N86XiMu5sUn`)
- **Company Type** (`fldSgiy8i2QUTmZbX`)
- **Company Size** (`fld0FFqLVasuvG9Uf`)
- **Annual Revenue** (`fldMaVs106qf6Gmqp`)
- **Postal Code** (`fldqa7L8FPSeSQ9xG`)

### Multi-Line Text (2)
- **Notes** (`flddUZDFk4l9f377V`)
- **Company Description** (`fldIDywGKU18pEndd`)

### URL (1)
- **Website** (`fldVBnFiEeyDf9oCg`)

### Number (1)
- **Founding Year** (`fldZaxAXqeImQcuzW`) -- precision 0

### Date (1)
- **Created Date** (`fldxQpzFGadejLLVp`) -- ISO

### Single Select (3)
- **Type** (`fldtLJxxK5oT6Nzjn`)
  - Choices: Prospect, Active Client, Past Client, Partner, Vendor, Other
- **Industry** (`fldPz4rknFpmEXZAD`)
  - Choices: Hospitality, Entertainment/Attractions, Corporate/Brand, Retail, Real Estate/Development, F&B, Technology, Other, Culture, Sports, Cruise, Hospitality/Casino, Consulting, Theme Parks, Entertainment, Marketing, Design, Education, Real Estate, Media
- **Lead Source** (`fldSPGKJKbHclLzoD`)
  - Choices: Referral, Inbound - Website, Inbound - LinkedIn, Inbound - Conference/Event, Outbound Prospecting, Past Relationship, Other, Wynn Entertainment

### Linked Records (4)
- **Sales Opportunities** (`fldbvXQ26UDd3SHAB`) -> **Opportunites**
- **Projects** (`fldtgQEptCxvaaAzk`) -> **Projects**
- **Contacts** (`fldQ2RK3PeAPMzkJB`) -> **Contacts**
- **Proposals** (`fld8pQnDzVmyonJ45`) -> **Proposals**

### Attachments (1)
- **Attachments** (`fldhCu5ooToK84g4G`)

---

## 9. Specialties (3 fields)

- **Table ID:** `tblysTixdxGQQntHO`
- **Views:** Grid view (grid), Sync (grid)

### Single Line Text (1)
- **Specialty** (`fldLVp1uePoKCuJlM`) -- primary field

### Linked Records (2)
- **Imported Contacts** (`fldPQWyanCOcXVxmL`) -> **Imported Contacts**
- **Contacts** (`fldVtUb9RqF03Ubq7`) -> **Contacts**

---

## 10. Portal Access (37 fields)

- **Table ID:** `tblN1jruT8VeucPKa`
- **Description:** Client portal access permissions and contact information
- **Views:** Grid view (grid)

### Single Line Text (8)
- **Name** (`fldqnVE5ppj8ACyf3`) -- primary field
- **Email** (`fldU70JpJQ1GpbRNQ`)
- **Page Address** (`fldkAjPIMUMlHNT2A`)
- **Decision Maker** (`fldn0nMxnqpHkLykk`)
- **Company** (`fldYZ1Su7WnNPxf17`)
- **Address** (`fldvaQB8wzgaLLn2Y`)
- **Primary Contact** (`fldqESjieqvuj1k4P`)
- **Position/Title** (`fld2UX68BMEk768Ao`)
- **Industry** (`fld8JNk7r3mQvco7V`)

### Multi-Line Text (1)
- **Notes** (`fldiOyYVt4QN8Yon4`)

### Phone Number (1)
- **Phone Number** (`fldHVA9pJd2j2bJNi`)

### URL (1)
- **Website** (`fldJhqz0wngVDNxwt`)

### Currency (1)
- **Project Budget** (`fldQisibz3rZaC4mi`) -- $, precision 2

### Date (3)
- **Date Added** (`fld8m3xt2QOi2EF3b`) -- local
- **Expected Project Start Date** (`flduKP6vlsDlxZuGW`) -- local
- **Follow-Up Date** (`fldvhmfQXneMvWXD1`) -- local

### Single Select (3)
- **Status** (`fldqbzNiTFt7jpdyW`)
  - Choices: ACTIVE, IN-ACTIVE
- **Lead Source** (`fldnIkdS9MSewsUqy`)
  - Choices: Referral, Web Search, Social Media, Event, Other
- **Stage** (`fldYrwOrTeimfHC5c`)
  - Choices: Lead, Contacted, Qualified, Proposal Sent, Negotiation, Closed Won, Closed Lost

### Multiple Select (1)
- **Services Interested In** (`fldcBIAHs2jpNkQbD`)
  - Choices: Web Design, Branding, SEO, Social Media, Consulting, Other

### Linked Records (1)
- **Contact** (`fld1tMK48dxrLU9R4`) -> **Contacts**

### Formula (1)
- **Framer Page URL** (`fldzVcWNLBnNQjwQ6`) -- `CONCATENATE("https://www.imaginelabstudios.com/", TRIM({fldkAjPIMUMlHNT2A}))`

### Lookup (11)
- **Contact Name** (`fldwGCWvBs8GCz5ka`) -- looks up Contact Name from Contacts
- **Contact Company** (`fldbeA6Zdgcf6k4Si`) -- looks up Company from Contacts
- **Contact Email** (`fldtZJw7XdUeVGNcA`) -- looks up Email from Contacts
- **Contact Phone** (`fldH8ZDUC4l0vKXpV`) -- looks up Phone from Contacts
- **Contact Job Title** (`fldQbVqtuSO4KXgg9`) -- looks up Job Title from Contacts
- **Contact Industry** (`fldqTLSogKYG6wIwI`) -- looks up Industry from Contacts
- **Contact Speciality** (`fldWEtETWKSprknaF`) -- INVALID lookup (field not found)
- **Contact Tags** (`fldM8HUiHkQy7tOFx`) -- looks up Tags from Contacts
- **Contact Website** (`fldX1QmphBEEZX7hr`) -- looks up Website from Contacts
- **Contact Address Line** (`fld55H7Qh189M9nTc`) -- looks up Address Line from Contacts
- **Contact City** (`fldocH6IhXiWnS1O9`) -- looks up City from Contacts
- **Contact State** (`fld95YpyLfDuEtgHQ`) -- looks up State from Contacts
- **Contact Country** (`fldb9Nsoynf3zrZGr`) -- looks up Country from Contacts

### Collaborator (1)
- **Assignee** (`fldQ0KnWXkFlInBu1`)

### Attachments (1)
- **Attachments** (`fldCvoIAUEUg0DraC`)

---

## 11. Portal Logs (12 fields)

- **Table ID:** `tblj70XPHI7wnUmxO`
- **Description:** Login session logs for the ImagineLab client portal
- **Views:** Grid view (grid)

### Single Line Text (5)
- **Client Email** (`fldbRGSVQ234FhLl5`)
- **Client Name** (`fld09uABu5pMflwqw`)
- **Company** (`fldHKPjjjj5qJ4jKj`)
- **IP Address** (`fldD4kj0jIVeJ7Xjn`)
- **City** (`fldvJWb179RimoEVP`)
- **Region** (`fldW4wHM9wNIap0Vf`)
- **Country** (`fld2gGOgdCs4OZORY`)

### Multi-Line Text (1)
- **User Agent** (`fldKPYPCJ8a77TiSZ`)

### URL (2)
- **Clarity Session** (`fldlawC5fpW6SC7YJ`)
- **Page URL** (`fldA8GMWwQMthnnta`)

### Date/Time (1)
- **Timestamp** (`fldtntKgWXKanYEWZ`) -- ISO, 12-hour, America/Los_Angeles

### Auto Number (1)
- **Id** (`fldZ9kEv2VoSs6Zhm`) -- primary field

---

## Linked Record Relationship Map

| From Table | Field | To Table | Prefers Single? |
|---|---|---|---|
| Contacts | Specialties | Specialties | No |
| Contacts | Proposals | Proposals | No |
| Contacts | Sales Opportunities | Opportunites | No |
| Contacts | Imported Contacts | Imported Contacts | No |
| Contacts | Interactions | Interactions | No |
| Contacts | Tasks | Tasks | No |
| Contacts | Projects | Projects | No |
| Contacts | Companies | Companies | No |
| Contacts | Projects (as Partner/Vendor) | Projects | No |
| Contacts | Portal Access | Portal Access | No |
| Opportunites | Company | Companies | No |
| Opportunites | Associated Contact | Contacts | Yes |
| Opportunites | Tasks | Tasks | No |
| Opportunites | Interactions | Interactions | No |
| Opportunites | Project | Projects | No |
| Opportunites | Proposals | Proposals | No |
| Tasks | Sales Opportunities | Opportunites | No |
| Tasks | Contacts | Contacts | No |
| Tasks | Projects | Projects | No |
| Tasks | Proposal | Proposals | No |
| Proposals | Client | Contacts | Yes |
| Proposals | Company | Companies | No |
| Proposals | Related Opportunity | Opportunites | No |
| Proposals | Tasks | Tasks | No |
| Projects | Sales Opportunities | Opportunites | No |
| Projects | Client | Companies | No |
| Projects | Tasks | Tasks | No |
| Projects | Primary Contact | Contacts | No |
| Projects | Contacts | Contacts | No |
| Interactions | Contacts | Contacts | No |
| Interactions | Sales Opportunities | Opportunites | No |
| Imported Contacts | Specialties | Specialties | No |
| Imported Contacts | Related CRM Contact | Contacts | Yes |
| Companies | Sales Opportunities | Opportunites | No |
| Companies | Projects | Projects | No |
| Companies | Contacts | Contacts | No |
| Companies | Proposals | Proposals | No |
| Specialties | Imported Contacts | Imported Contacts | No |
| Specialties | Contacts | Contacts | No |
| Portal Access | Contact | Contacts | No |

---

## Potential Issues and Observations

### 1. Typo in Table Name
- Table is named **"Opportunites"** (missing second "i") -- should be **"Opportunities"**

### 2. Duplicate/Inconsistent Tag Values
The **Contacts > Tags** field has multiple variants of the same tags:
- `SohoHolloway`, `SOHOHOLLOWAY`, `SOHO HOLLOWAY`, `Soho Holloway` (4 variants)
- `SATE2025`, `SATE25`, `SATE 2025` (3 variants)
- Same inconsistencies in **Imported Contacts > Tags**

### 3. Inconsistent Specialty/Tag Names Between Tables
- **Contacts > Tags** uses concatenated names: `PerformerManagement`, `ProjectManagement`, `ShowDirector`, `SoundMixing`
- **Imported Contacts > Tags** uses spaced names: `Performer Management`, `Project Management`, `Show Director`, `Sound Mixing`
- **Contacts > Tags** has `Manufacture-Materials`; **Imported Contacts > Tags** has `Manufacture - Materials`
- **Imported Contacts > Tags** has typo: `Stratagy` (should be `Strategy`)

### 4. Overlapping Categorization Fields on Contacts
- **Contacts** has both `Client Type` and `Categorization` with overlapping options:
  - Client Type: Prospect, Customer, Partner, Reseller, Vendor, Other, New, Returning
  - Categorization: Lead, Customer, Partner, Other, Unknown, Vendor, Talent
- These may cause confusion about which to use for classification

### 5. Imported Contacts Has Company Fields Not Mirrored in Contacts
- `Company Description`, `Company Founding Year`, `Company NAICS Code`, `Company Type`, `Company Size`, `Company Industry`, `Company Annual Revenue`
- `Company Street Address`, `Company Street Address 2`, `Company City`, `Company State`, `Company Country`, `Company Postal Code`
- This data may be lost when contacts are promoted from Imported Contacts to Contacts
- Consider whether this data should live on the Companies table instead

### 6. Contacts Has Two Links to Projects Table
- `Projects` field -- for contacts as primary client contact
- `Projects (as Partner/Vendor)` field -- for contacts in partner/vendor role
- This is intentional (different roles) but worth documenting clearly

### 7. Probability Value Formula May Be Broken
- **Opportunites > Probability Value** formula checks for `'High'` and `'Medium'`
- But the Probability field choices are `01 High` and `02 Medium` (with numeric prefixes)
- The formula likely returns 0 for all records since the values never match

### 8. Large Field Count on Contacts (57) and Imported Contacts (48)
- Contacts is a very wide table; consider whether all fields are actively used
- `Event Tags` (singleLineText) overlaps with `Tags` (multipleSelects)

### 9. Imported Contacts Missing Link to Companies
- **Contacts** has a `Companies` linked record field
- **Imported Contacts** does not link to Companies, only has flat text company fields

### 10. Portal Access Has Invalid Lookup
- **Contact Speciality** (`fldWEtETWKSprknaF`) -- lookup is marked `isValid: false`, the linked field no longer exists
- This lookup returns no data and should be fixed or removed

### 11. Portal Access Has Duplicate/Redundant Fields
- Has its own `Company`, `Address`, `Primary Contact`, `Position/Title`, `Industry`, `Website` fields (plain text)
- Also has lookup fields that pull the same data from linked Contacts: `Contact Company`, `Contact Job Title`, etc.
- The plain text fields appear to be from the original portal form, while lookups pull from CRM -- may cause data drift

### 12. Companies > Lead Source Has a Specific Company Name
- The Lead Source field on Companies includes `Wynn Entertainment` as a choice -- this is a specific referral partner, not a generic lead source category
