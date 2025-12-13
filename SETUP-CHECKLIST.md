# Setup Checklist - Before Going Live

Before deploying to production and submitting AWS 10DLC registration, you MUST update the following placeholder information with your actual business details.

## 🔴 CRITICAL: Business Information to Update

### 1. Footer (`src/components/Footer.jsx`)
**Line 12-15:** Replace business address
```jsx
<p><strong>Crew123 LLC</strong></p>  // Replace with your business name
<p>[Your Street Address]</p>         // Replace with actual street address
<p>[City, State ZIP Code]</p>        // Replace with actual city, state, ZIP
<p>United States</p>
```

### 2. Contact Page (`src/pages/Contact.jsx`)
**Search for:** `[Your Business Address]`
- Update the mailing address section with your real address

### 3. SMS Terms (`src/pages/SMSTerms.jsx`)
**Search for:** `[Your Business Address]`
- Update contact information section with your real address

### 4. Privacy Policy (`src/pages/Privacy.jsx`)
**Search for:** `[Your Business Address]`
- Update contact section with your real address

### 5. Terms of Service (`src/pages/Terms.jsx`)
**Search for:** `[Your Business Address]`
- Update contact section with your real address

## ✅ Pre-Deployment Checklist

Before deploying:
- [ ] Update business address in all 5 files above
- [ ] Verify business name (Crew123 LLC or your actual entity name)
- [ ] Confirm support email address (support@crew123.com or your actual email)
- [ ] Purchase domain (crew123.com or your chosen domain)
- [ ] Verify you have:
  - [ ] Business EIN (for AWS 10DLC registration)
  - [ ] Business bank account
  - [ ] Legal business entity formed (LLC, Corp, etc.)

## 📋 AWS 10DLC Registration Requirements

You will need to provide:
- **Legal Business Name**: Your registered business name
- **Business Type**: LLC, Corporation, Sole Proprietor, etc.
- **EIN/Tax ID**: Your federal tax identification number
- **Business Address**: Physical address (not PO Box)
- **Website URL**: https://crew123.com (or your domain)
- **Business Email**: Your business email address
- **Business Phone**: Your business phone number

## 🚀 Deployment Steps

1. **Update all placeholders** (listed above)
2. **Commit changes to GitHub**
   ```bash
   git add .
   git commit -m "Update business information for production"
   git push
   ```
3. **Deploy to Vercel**
   - Connect GitHub repo to Vercel
   - Deploy
4. **Add custom domain**
   - Add crew123.com in Vercel settings
   - Update DNS records at your domain registrar
5. **Wait for DNS propagation** (24-48 hours)
6. **Begin AWS 10DLC registration** once site is live with domain

## 📝 Additional Recommendations

### Email Addresses to Set Up
- support@crew123.com - Customer support
- privacy@crew123.com - Privacy inquiries
- legal@crew123.com - Legal matters
- sales@crew123.com - Sales inquiries
- press@crew123.com - Media inquiries

You can create these as:
- Actual email accounts (via Google Workspace, Office 365, etc.)
- Email forwards to your main business email

### Domain Email Setup
Consider using:
- **Google Workspace** ($6/month per user) - Professional email with your domain
- **Microsoft 365** ($6/month per user) - Professional email with your domain
- **Zoho Mail** (Free for up to 5 users) - Budget option

## ⚠️ Important Notes

1. **Do NOT deploy without updating business information** - Having placeholder text looks unprofessional to AWS reviewers
2. **Use consistent business name** - Make sure your business name matches across all documents and your EIN registration
3. **Physical address required** - AWS requires a physical business address, not a PO Box
4. **Keep legal pages up to date** - Review and update legal pages annually or when business practices change

## Need Help?

If you're not sure about any of these requirements or need clarification, consult with:
- A business attorney for legal page review
- An accountant for tax/EIN questions
- AWS support for 10DLC specific questions

---

**Last Updated**: December 13, 2025
