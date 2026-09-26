export interface Company {
  name: string
  ats?: 'greenhouse' | 'ashby' | 'lever'
  atsId?: string
  careersUrl?: string
}

export const TRACKED_COMPANIES: Company[] = [
  { name: 'Zoho', careersUrl: 'https://www.zoho.com/careers.html' },
  { name: 'Razorpay', careersUrl: 'https://razorpay.com/careers/' },
  { name: 'Zerodha', careersUrl: 'https://careers.zerodha.com/' },
  { name: 'CRED', careersUrl: 'https://cred.club/careers' },
  { name: 'Swiggy', careersUrl: 'https://careers.swiggy.com/' },
  { name: 'Zomato', careersUrl: 'https://www.zomato.com/careers' },
  { name: 'Flipkart', careersUrl: 'https://www.flipkartcareers.com/' },
  { name: 'Paytm', careersUrl: 'https://paytm.com/careers/' },
  { name: 'PhonePe', careersUrl: 'https://www.phonepe.com/careers/' },
  { name: 'Meesho', careersUrl: 'https://www.meesho.io/careers' },
  { name: 'Groww', careersUrl: 'https://groww.in/careers' },
  { name: 'Freshworks', careersUrl: 'https://www.freshworks.com/careers/' },
  { name: 'Druva', careersUrl: 'https://www.druva.com/careers' },
  { name: 'Acko', careersUrl: 'https://www.acko.com/careers/' },
  { name: 'Ola', careersUrl: 'https://www.olacabs.com/careers' },
  { name: 'Postman', ats: 'greenhouse', atsId: 'postman' },
  { name: 'HackerRank', careersUrl: 'https://www.hackerrank.com/careers' },
  { name: 'Keka', careersUrl: 'https://www.keka.com/careers' },
  { name: 'BharatPe', careersUrl: 'https://bharatpe.com/careers' },
  { name: 'Cashfree', careersUrl: 'https://www.cashfree.com/careers/' },
  { name: 'Mamaearth', careersUrl: 'https://mamaearth.in/careers' },
  { name: 'Nykaa', careersUrl: 'https://www.nykaa.com/careers' },
  { name: 'Delhivery', careersUrl: 'https://www.delhivery.com/careers' },
  { name: 'Microsoft India', careersUrl: 'https://careers.microsoft.com/' },
  { name: 'Amazon India', careersUrl: 'https://www.amazon.jobs/en/locations/india' },
  { name: 'Atlassian', ats: 'greenhouse', atsId: 'atlassian' },
  { name: 'Uber India', ats: 'greenhouse', atsId: 'uber' },
  { name: 'Airbnb', ats: 'greenhouse', atsId: 'airbnb' },
  { name: 'Stripe', ats: 'greenhouse', atsId: 'stripe' },
  { name: 'Shopify', ats: 'greenhouse', atsId: 'shopify' },
  { name: 'Vercel', ats: 'greenhouse', atsId: 'vercel' },
  { name: 'GitLab', ats: 'greenhouse', atsId: 'gitlab' },
  { name: 'Figma', ats: 'greenhouse', atsId: 'figma' },
  { name: 'Notion', ats: 'greenhouse', atsId: 'notion' },
  { name: 'Canva', ats: 'greenhouse', atsId: 'canva' },
  { name: 'Discord', ats: 'greenhouse', atsId: 'discord' },
  { name: 'Duolingo', ats: 'greenhouse', atsId: 'duolingo' },
  { name: 'Coinbase', ats: 'greenhouse', atsId: 'coinbase' },
  { name: 'Intercom', ats: 'greenhouse', atsId: 'intercom' },
]
