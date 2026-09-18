# Forms Integration

## Sponsorship

Reuse the existing Newa Guthi Victoria sponsorship form instead of building a second form in the PWA.

**Target:** `https://newaguthi.org.au/sponsors/#sponsorship-form`

The website implementation already provides:

- sponsorship package selection;
- business and contact details;
- phone and email validation;
- website, ABN and logo link fields;
- consent;
- a spam trap and WordPress nonce;
- private WordPress enquiry records;
- an email notification to the committee.

The app now replaces the former `mailto:` sponsorship action with a normal external link labelled **Register sponsorship interest**. Submission and personal data handling stay on the website.

## Stall expressions of interest

The existing generic contact form can accept early enquiries, but it does not capture food registration, public liability insurance, stall type or power requirements. Create a dedicated **Indra Jatra Stall EOI** form on the website, then link the app to it.

Recommended fields: business name, contact name, email, phone, stall category, food/non-food, menu or products, food registration number, insurance confirmation, power needs, social link and consent.

## Volunteering and classes

The generic website contact form is adequate for initial interest. Add a query parameter or dedicated form choice so the committee can distinguish volunteering, classes and general questions. Do not collect these enquiries separately inside the offline PWA unless the API and privacy process are ready.
