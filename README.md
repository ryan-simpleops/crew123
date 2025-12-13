# Crew123 - Film Crew Hiring Platform

Automated SMS messaging for film production department heads to efficiently contact crew members about job opportunities.

## About Crew123

Crew123 streamlines the crew hiring process by enabling department heads to:
- Create prioritized lists of crew members
- Send time-sensitive job offers via SMS
- Automatically contact the next person if no response within the timeframe
- Save hours of manual follow-ups

## Features

- **Priority-Based Messaging**: Contact crew in your preferred order
- **Time-Sensitive**: Set custom response windows and auto-escalate
- **Fully Compliant**: A2P 10DLC and TCPA compliant SMS platform
- **Crew Opt-In**: Double opt-in consent process for all contacts

## Tech Stack

- **Frontend**: React + Vite
- **Routing**: React Router
- **Backend**: Supabase (planned)
- **SMS**: AWS SNS with 10DLC (planned)
- **Deployment**: Vercel

## Development

### Prerequisites

- Node.js 18+ (recommended)
- npm or yarn

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to view the site.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Deployment to Vercel

1. Push code to GitHub
2. Import repository in Vercel
3. Vercel will auto-detect Vite and configure build settings
4. Deploy

## Domain Setup

Once deployed, configure your custom domain (crew123.io):

1. Purchase domain
2. Add domain to Vercel project settings
3. Update DNS records as instructed by Vercel
4. Wait for SSL certificate provisioning

## AWS 10DLC Registration

Before full SMS functionality can be enabled, you must register with AWS:

1. **Register Company/Brand** with The Campaign Registry via AWS Console
2. **Register Campaign** describing the job notification use case
3. **Request 10DLC Phone Number(s)**
4. **Wait for Approval** (2-4 weeks typically)

Required for registration:
- Live website with proper legal pages (included in this project)
- Business information (EIN, address, etc.)
- Detailed campaign description
- Sample SMS messages

## Compliance

Crew123 is designed to comply with:
- **TCPA** (Telephone Consumer Protection Act)
- **A2P 10DLC** registration requirements
- **CTIA Messaging Principles**

All crew members must explicitly opt-in to receive SMS messages through a double opt-in process.

## Required Legal Pages (Included)

- Terms of Service (`/terms`)
- Privacy Policy (`/privacy`)
- SMS Terms & Conditions (`/sms-terms`)
- Contact Page (`/contact`)

## Project Structure

```
crew123/
├── src/
│   ├── components/     # Reusable components (Nav, Footer)
│   ├── pages/          # Page components (Home, Terms, etc.)
│   ├── App.jsx         # Main app with routing
│   └── main.jsx        # Entry point
├── public/             # Static assets
└── vercel.json         # Vercel deployment config
```

## Next Steps

1. Deploy to Vercel
2. Configure custom domain
3. Update placeholder information in legal pages (business address, etc.)
4. Begin AWS 10DLC registration process
5. Build full application features (auth, database, SMS integration)

## Contact

- Email: info@crew123.io
- Website: crew123.io
