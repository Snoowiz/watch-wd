export interface SeedTemplate {
  slug: string;
  name: string;
  subject: string;
  category: string;
  variables_hint: string;
  body: string;
}

export const defaultBranding = {
  logo_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
  primary_color: "#fbbf24",
  secondary_color: "#0f172a",
  button_style: "rounded-lg",
  footer_content: "Thank you for being part of the WDSportz community. Keep playing, keep watching, and stay connected!",
  social_twitter: "https://twitter.com/wdsportz",
  social_facebook: "https://facebook.com/wdsportz",
  social_instagram: "https://instagram.com/wdsportz",
  social_youtube: "https://youtube.com/wdsportz",
  social_linkedin: "https://linkedin.com/company/wdsportz",
  contact_info: "123 Sports Arena Blvd, Suite 400, Chicago, IL 60601 | support@wdsportz.com",
  copyright_text: "© 2026 WDSportz Inc. All rights reserved."
};

export const SEED_TEMPLATES: SeedTemplate[] = [
  {
    slug: "welcome_email",
    name: "Welcome Email",
    subject: "Welcome to WDSportz, {{first_name}}!",
    category: "Welcome",
    variables_hint: "first_name, last_name, user_name, user_email, website_url, support_email",
    body: `<h2>Welcome to WDSportz!</h2>
<p>Hello {{first_name}},</p>
<p>We are absolutely thrilled to welcome you to the WDSportz family! Your account has been successfully created under the username <strong>{{user_name}}</strong>.</p>
<p>At WDSportz, we bring the passion of live sports directly to your screen. You can browse live matches, follow elite creators, participate in leagues, and share your support with fellow sports fans.</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Explore Live Matches</a>
</div>
<p>If you have any questions or need assistence, don't hesitate to reply directly to this email or contact us at <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>
<p>Best regards,<br>The WDSportz Team</p>`
  },
  {
    slug: "email_verification",
    name: "Email Verification",
    subject: "Verify your email address - WDSportz",
    category: "Authentication",
    variables_hint: "first_name, verification_link, website_url, support_email",
    body: `<h2>Verify Your Email</h2>
<p>Hello {{first_name}},</p>
<p>Thank you for signing up for WDSportz. To complete your registration and unlock full access to all matches, channels, and features, please verify your email address by clicking the button below:</p>
<div style="text-align: center;">
  <a href="{{verification_link}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Verify My Email Address</a>
</div>
<p>Or copy and paste this link into your browser:</p>
<p style="word-break: break-all; background-color: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 13px;">{{verification_link}}</p>
<p><em>This verification link will expire in 24 hours.</em></p>
<p>If you didn't create an account with us, please ignore this email.</p>`
  },
  {
    slug: "password_reset_branding",
    name: "Password Reset Branding",
    subject: "Reset your WDSportz account password",
    category: "Authentication",
    variables_hint: "first_name, reset_password_link, support_email",
    body: `<h2>Password Reset Request</h2>
<p>Hello {{first_name}},</p>
<p>We received a request to reset the password for your WDSportz account. Click the button below to choose a new password:</p>
<div style="text-align: center;">
  <a href="{{reset_password_link}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Reset Password</a>
</div>
<p>If you didn't request a password reset, you can safely ignore this email. Your current password will remain secure.</p>
<p>For any help, please reach out to <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>`
  },
  {
    slug: "account_activated",
    name: "Account Activated",
    subject: "Your WDSportz Account is Activated",
    category: "Authentication",
    variables_hint: "first_name, last_name, website_url",
    body: `<h2>Account Activated!</h2>
<p>Hi {{first_name}},</p>
<p>We are pleased to inform you that your WDSportz account has been successfully verified and fully activated. You now have unrestricted access to our live streaming catalog, creators, stats, and clubs!</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Go to Dashboard</a>
</div>
<p>Thank you for completing the verification. Enjoy the game!</p>`
  },
  {
    slug: "account_suspended",
    name: "Account Suspended",
    subject: "URGENT: Your WDSportz account has been suspended",
    category: "Authentication",
    variables_hint: "first_name, last_name, support_email",
    body: `<h2>Account Suspension Notice</h2>
<p>Dear {{first_name}} {{last_name}},</p>
<p>We regret to inform you that your WDSportz account has been suspended due to a violation of our Terms of Service or community guidelines.</p>
<p>While suspended, you will not be able to log in, view live matches, chat, or access purchased content.</p>
<p>If you believe this suspension is a mistake or wish to appeal, please contact our support team immediately at <a href="mailto:{{support_email}}">{{support_email}}</a> with your account username or registered email.</p>
<p>Sincerely,<br>WDSportz Abuse & Mod team</p>`
  },
  {
    slug: "subscription_purchased",
    name: "Subscription Purchased",
    subject: "Subscription Active: Welcome to {{subscription_name}}!",
    category: "Subscription",
    variables_hint: "first_name, subscription_name, purchase_amount, transaction_id, invoice_number, website_url",
    body: `<h2>Thank You for Subscribing!</h2>
<p>Hello {{first_name}},</p>
<p>Get ready for premium sports! Your subscription to <strong>{{subscription_name}}</strong> has been activated successfully.</p>
<table class="meta-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Subscription Tier:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{subscription_name}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Paid Amount:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">\${{purchase_amount}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Transaction ID:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{transaction_id}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Invoice #:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{invoice_number}}</td></tr>
</table>
<p>You can manage your subscription billing, auto-renewal preferences, and invoices anytime from your account dashboard.</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Unlock Live Coverage</a>
</div>`
  },
  {
    slug: "subscription_renewed",
    name: "Subscription Renewed",
    subject: "Your {{subscription_name}} subscription has renewed",
    category: "Subscription",
    variables_hint: "first_name, subscription_name, purchase_amount, transaction_id, invoice_number",
    body: `<h2>Subscription Renewed Successfully</h2>
<p>Hi {{first_name}},</p>
<p>Good news! Your auto-renewal for <strong>{{subscription_name}}</strong> was processed successfully, ensuring uninterrupted access to all premium tournaments, statistics, and chat channels.</p>
<table class="meta-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Subscription:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{subscription_name}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Charged Amount:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">\${{purchase_amount}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Invoice ID:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{invoice_number}}</td></tr>
</table>
<p>Your statement will reflect a charge from WDSportz. Thank you for your continued loyalty.</p>`
  },
  {
    slug: "subscription_expiring_7d",
    name: "Subscription Expiring - 7 Days",
    subject: "Your WDSportz subscription is expiring in 7 days",
    category: "Subscription",
    variables_hint: "first_name, subscription_name, website_url, support_email",
    body: `<h2>Subscription Expiring Soon</h2>
<p>Hello {{first_name}},</p>
<p>Just a quick heads-up that your subscription to <strong>{{subscription_name}}</strong> is scheduled to expire in <strong>7 days</strong>.</p>
<p>To prevent any service interruption and keep watching without downtime, check your auto-renew status or renew your subscription manually by clicking the link below:</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Renew Subscription Now</a>
</div>
<p>If auto-renew is already enabled on your billing preferences, no further action is required.</p>`
  },
  {
    slug: "subscription_expiring_3d",
    name: "Subscription Expiring - 3 Days",
    subject: "URGENT: Your subscription expires in 3 days",
    category: "Subscription",
    variables_hint: "first_name, subscription_name, website_url",
    body: `<h2>Only 3 Days Left Premium!</h2>
<p>Hello {{first_name}},</p>
<p>This is a reminder that your access to premium sports under the <strong>{{subscription_name}}</strong> plan expires in just <strong>3 days</strong>.</p>
<p>Don't miss the upcoming matches this weekend! Please verify your payment card details are up to date to guarantee automatic renewal passes successfully.</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Check Billing Details</a>
</div>`
  },
  {
    slug: "subscription_expiring_1d",
    name: "Subscription Expiring - 1 Day",
    subject: "Final Notice: Your subscription expires tomorrow!",
    category: "Subscription",
    variables_hint: "first_name, subscription_name, website_url",
    body: `<h2>Your Premium Access Ends Tomorrow</h2>
<p>Hi {{first_name}},</p>
<p>This is your final notice. Your subscription to <strong>{{subscription_name}}</strong> expires tomorrow. Safe-renew your billing card immediately or join the action dynamically by updating your subscription preferences now.</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Renew Right Away</a>
</div>`
  },
  {
    slug: "subscription_expired",
    name: "Subscription Expired",
    subject: "Your WDSportz subscription has expired",
    category: "Subscription",
    variables_hint: "first_name, subscription_name, website_url",
    body: `<h2>Premium Subscription Expired</h2>
<p>Dear {{first_name}},</p>
<p>Your subscription to <strong>{{subscription_name}}</strong> has expired. As a result, premium live events, exclusive creator links, and premium club stats are no longer accessible.</p>
<p>Upgrading takes less than a minute. Come back today and regain full access instantly!</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Re-Subscribe Now</a>
</div>`
  },
  {
    slug: "subscription_cancelled",
    name: "Subscription Cancelled",
    subject: "Cancellation Confirmation: {{subscription_name}}",
    category: "Subscription",
    variables_hint: "first_name, subscription_name, website_url",
    body: `<h2>We're Sorry to See You Go</h2>
<p>Hello {{first_name}},</p>
<p>This email confirms that your subscription to <strong>{{subscription_name}}</strong> has been cancelled. You will continue to have premium access until the end of your billing cycle.</p>
<p>No further payments will be charged. If you change your mind, you can re-activate auto-renew anytime with a single click in your billing profile.</p>`
  },
  {
    slug: "match_purchased",
    name: "Match Purchased",
    subject: "Match Ticket Confirmed: {{match_name}}",
    category: "Events/Matches",
    variables_hint: "first_name, match_name, match_date, match_time, purchase_amount, website_url, transaction_id",
    body: `<h2>Your Ticket is Confirmed!</h2>
<p>Hi {{first_name}},</p>
<p>You have successfully unlocked live access to <strong>{{match_name}}</strong>. Here are your event details:</p>
<table class="meta-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Match Event:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{match_name}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Date & Time:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{match_date}} at {{match_time}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Amount:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">\${{purchase_amount}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Confirmation:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{transaction_id}}</td></tr>
</table>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Go to Live stream</a>
</div>`
  },
  {
    slug: "match_starting_24h",
    name: "Match Starting - 24 Hours",
    subject: "Tomorrow: {{match_name}} starts in 24 hours!",
    category: "Events/Matches",
    variables_hint: "first_name, match_name, match_date, match_time, website_url",
    body: `<h2>24-Hour Countdown to Kickoff!</h2>
<p>Hello {{first_name}},</p>
<p>This is your friendly reminder that <strong>{{match_name}}</strong> starts in exactly 24 hours. Get your snacks ready and support your team live!</p>
<table class="meta-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Match:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{match_name}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Kick-off:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{match_date}} at {{match_time}}</td></tr>
</table>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">View Stream Link</a>
</div>`
  },
  {
    slug: "match_starting_1h",
    name: "Match Starting - 1 Hour",
    subject: "1 Hour warning: {{match_name}} is starting soon!",
    category: "Events/Matches",
    variables_hint: "first_name, match_name, match_time, website_url",
    body: `<h2>Starting in 1 Hour!</h2>
<p>Dear {{first_name}},</p>
<p>The anticipation is building! <strong>{{match_name}}</strong> is starting in 1 hour. Get set up, check your connection, and head over to the live portal to join the pre-match warm-ups and team lineups.</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Tune in Now</a>
</div>`
  },
  {
    slug: "match_starting_15m",
    name: "Match Starting - 15 Mins",
    subject: "15 MINUTES LEFT: {{match_name}} starts now!",
    category: "Events/Matches",
    variables_hint: "first_name, match_name, website_url",
    body: `<h2>15 Minute Warning!</h2>
<p>Hello {{first_name}},</p>
<p>Players are on the pitch! <strong>{{match_name}}</strong> is starting in 15 minutes. Stop what you are doing and jump in now to catch the national anthem and kickoff!</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Join Live Stream</a>
</div>`
  },
  {
    slug: "match_live_now",
    name: "Match Live Now",
    subject: "LIVE NOW: {{match_name}} is on air!",
    category: "Events/Matches",
    variables_hint: "first_name, match_name, website_url",
    body: `<h2>THE MATCH IS LIVE!</h2>
<p>Hey {{first_name}},</p>
<p>The whistle has blown! <strong>{{match_name}}</strong> is officially live stream broadcasting right now.</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Watch Live Now</a>
</div>
<p>Join the live discussion chat and cheer alongside the community!</p>`
  },
  {
    slug: "match_replay_available",
    name: "Match Replay Available",
    subject: "Replay available: watch {{match_name}} at your leisure",
    category: "Events/Matches",
    variables_hint: "first_name, match_name, website_url",
    body: `<h2>Missed the Match? Replay is Ready!</h2>
<p>Hello {{first_name}},</p>
<p>Don't worry about missing the action. The full HD playback and replay of <strong>{{match_name}}</strong> is now available for you to watch at your own pace.</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Watch Replay</a>
</div>`
  },
  {
    slug: "match_cancelled",
    name: "Match Cancelled",
    subject: "IMPORTANT: {{match_name}} has been cancelled",
    category: "Events/Matches",
    variables_hint: "first_name, match_name, match_date, support_email",
    body: `<h2>Match Cancelled Notification</h2>
<p>Dear {{first_name}},</p>
<p>We are sorry to notify you that the match <strong>{{match_name}}</strong> scheduled for {{match_date}} has been officially cancelled due to unforeseen circumstances.</p>
<p>If you purchased an individual ticket for this match, a full refund is being automatically initiated to your original payment method. The refund can take 3-5 business days to clear.</p>
<p>We apologize for any disappointment caused. Please contact us at <a href="mailto:{{support_email}}">{{support_email}}</a> if you have any questions.</p>`
  },
  {
    slug: "match_rescheduled",
    name: "Match Rescheduled",
    subject: "Rescheduled: New details for {{match_name}}",
    category: "Events/Matches",
    variables_hint: "first_name, match_name, match_date, match_time, website_url",
    body: `<h2>Match Rescheduled</h2>
<p>Hello {{first_name}},</p>
<p>Please note that the game <strong>{{match_name}}</strong> has been rescheduled to a new date and time:</p>
<table class="meta-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">New Date:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{match_date}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">New Time:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{match_time}}</td></tr>
</table>
<p>Your existing ticket/access remains 100% valid for the new timing. No action is required!</p>`
  },
  {
    slug: "payment_successful",
    name: "Payment Successful",
    subject: "WDSportz Payment Succeeded: Invoice {{invoice_number}}",
    category: "Billing/Payment",
    variables_hint: "first_name, purchase_amount, transaction_id, invoice_number, support_email",
    body: `<h2>We Recieved Your Payment</h2>
<p>Hi {{first_name}},</p>
<p>Thank you for your business. We have successfully processed your payment of <strong>\${{purchase_amount}}</strong>.</p>
<table class="meta-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Charged Amount:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">\${{purchase_amount}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Transaction ID:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{transaction_id}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Invoice #:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{invoice_number}}</td></tr>
</table>
<p>Your paid receipt invoice has been generated. For queries, reach support at <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>`
  },
  {
    slug: "payment_failed",
    name: "Payment Failed",
    subject: "Attention: Payment Failed for Invoice {{invoice_number}}",
    category: "Billing/Payment",
    variables_hint: "first_name, purchase_amount, invoice_number, website_url, support_email",
    body: `<h2>Transaction Failed</h2>
<p>Hi {{first_name}},</p>
<p>We attempted to charge your card for the amount of <strong>\${{purchase_amount}}</strong> (Invoice #{{invoice_number}}), but the bank returned a card decline failure.</p>
<p>Our payment gateway will retry the payment automatically after 48 hours. To prevent cancellation of your active subscriptions, please click the button below to update your card details or select a different payment method:</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Update Payment Method</a>
</div>`
  },
  {
    slug: "refund_issued",
    name: "Refund Issued",
    subject: "Refund processed: WDSportz transaction {{transaction_id}}",
    category: "Billing/Payment",
    variables_hint: "first_name, purchase_amount, transaction_id, support_email",
    body: `<h2>Your Refund is Processed</h2>
<p>Hello {{first_name}},</p>
<p>We have processed a refund of <strong>\${{purchase_amount}}</strong> to your original payment method for transaction <strong>{{transaction_id}}</strong>.</p>
<p>Depending on your credit card issuer, it will take 3 to 10 banking days for the funds to reflect in your statement.</p>`
  },
  {
    slug: "invoice_generated",
    name: "Invoice Generated",
    subject: "New WDSportz Invoice {{invoice_number}} is ready",
    category: "Billing/Payment",
    variables_hint: "first_name, purchase_amount, invoice_number, website_url",
    body: `<h2>Invoice Ready for Settlement</h2>
<p>Hi {{first_name}},</p>
<p>A new invoice (<strong>#{{invoice_number}}</strong>) has been generated under your account for the amount of <strong>\${{purchase_amount}}</strong>.</p>
<p>You can view and settle this invoice immediately by navigating to the billing center.</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">View Invoice details</a>
</div>`
  },
  {
    slug: "receipt_email",
    name: "Receipt Email",
    subject: "Your WDSportz Purchase Receipt",
    category: "Billing/Payment",
    variables_hint: "first_name, purchase_amount, transaction_id, invoice_number",
    body: `<h2>Official Receipt Of Purchase</h2>
<p>Dear {{first_name}},</p>
<p>This is your official sales receipt of purchase for Invoice <strong>{{invoice_number}}</strong>. Payment has been cleared in full via online checkout.</p>
<table class="meta-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Transaction Ref:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{transaction_id}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Paid Amount:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">\${{purchase_amount}}</td></tr>
</table>
<p>Thank you for supporting sports content creators!</p>`
  },
  {
    slug: "creator_application_received",
    name: "Creator Application Received",
    subject: "Creator application received - WDSportz",
    category: "Creator Updates",
    variables_hint: "first_name, user_email, website_url",
    body: `<h2>Creator Status Application</h2>
<p>Hello {{first_name}},</p>
<p>Thank you for applying to become a content creator at WDSportz! Our administrators have received your request and channel details.</p>
<p>Our standard review period takes up to 48 hours. Once approved, you'll be able to create custom stream links, sell match access, get paid by fans, and post exclusive comments.</p>`
  },
  {
    slug: "creator_approved",
    name: "Creator Approved",
    subject: "CONGRATS: Your WDSportz Creator Application has been APPROVED!",
    category: "Creator Updates",
    variables_hint: "first_name, website_url",
    body: `<h2>Welcome to the Creator Guild!</h2>
<p>Fantastic news, {{first_name}}!</p>
<p>Your application to become a verified WDSportz Creator has been officially **Approved** by our staff.</p>
<p>Your account possesses full creator capabilities. Log in today to visit your newly unlocked Studio Dashboard, define your channels, configure subscriber content, and map out matches!</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Launch My Creator Portal</a>
</div>`
  },
  {
    slug: "creator_rejected",
    name: "Creator Rejected",
    subject: "WDSportz Creator Application Status Update",
    category: "Creator Updates",
    variables_hint: "first_name, support_email",
    body: `<h2>Creator Application Decision</h2>
<p>Dear {{first_name}},</p>
<p>Thank you for your interest in the WDSportz Creator Program. At this time, our review board has decided to reject your application due to incomplete profile credentials, inadequate social profiles, or platform saturation.</p>
<p>You can re-apply in 30 days. Feel free to address the requirements or ask about rejection details by shooting an email to <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>`
  },
  {
    slug: "creator_payout_sent",
    name: "Creator Payout Sent",
    subject: "Earnings Paid: Your payout has been initiated!",
    category: "Creator Updates",
    variables_hint: "first_name, purchase_amount, transaction_id, support_email",
    body: `<h2>Payout Swiped Successful</h2>
<p>Hello {{first_name}},</p>
<p>Excellent work! A payout has been authorized and initiated to your bank or connected payment merchant account for the amount of <strong>\${{purchase_amount}}</strong>.</p>
<table class="meta-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Paid Amount:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">\${{purchase_amount}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Billing Reference:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{transaction_id}}</td></tr>
</table>
<p>Keep streaming and entertaining fans!</p>`
  },
  {
    slug: "creator_earnings_summary",
    name: "Creator Earnings Summary",
    subject: "Monthly Creator Performance Report - {{creator_name}}",
    category: "Creator Updates",
    variables_hint: "creator_name, purchase_amount, support_email",
    body: `<h2>Monthly Performance Summary</h2>
<p>Hello {{creator_name}},</p>
<p>Here is your earnings summary for the past calendar month:</p>
<div style="background-color: #f8fafc; padding: 24px; border-radius: 12px; margin: 16px 0; text-align: center;">
  <p style="margin: 0; text-transform: uppercase; font-size: 11px; font-weight: bold; color: #64748b;">Month Gross Earnings</p>
  <h1 style="margin: 6px 0; color: #fbbf24; font-size: 36px;">\${{purchase_amount}}</h1>
</div>
<p>Detailed channel views, click-through rates, and follower demographics can be investigated deep inside your creator analytics tab.</p>`
  },
  {
    slug: "admin_new_user_alert",
    name: "Admin New User Registration Alert",
    subject: "[ADMIN ALERT] New User Registration: {{user_name}}",
    category: "Admin Alert",
    variables_hint: "user_name, user_email, website_url",
    body: `<h2>New Fan Registered!</h2>
<p>An administrator notification that a new user has registered on the database:</p>
<table class="meta-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">User:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{user_name}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Email Address:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{user_email}}</td></tr>
</table>
<div style="text-align: center;">
  <a href="{{website_url}}/admin/users" class="button" style="color: #0d1720; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Review User Profiles</a>
</div>`
  },
  {
    slug: "admin_new_match_alert",
    name: "Admin New Match Created Alert",
    subject: "[ADMIN ALERT] Custom Match Stream Created: {{match_name}}",
    category: "Admin Alert",
    variables_hint: "match_name, creator_name, match_date, website_url",
    body: `<h2>New Match Listed for Approval</h2>
<p>Admin warning: A new match stream has been schedule-generated or listed by creator <strong>{{creator_name}}</strong>:</p>
<table class="meta-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Match Name:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{match_name}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Created By:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{creator_name}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Kick-off Date:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{match_date}}</td></tr>
</table>
<div style="text-align: center;">
  <a href="{{website_url}}/admin/matches" class="button" style="color: #0d1720; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Approve stream list</a>
</div>`
  },
  {
    slug: "admin_subscription_purchased_alert",
    name: "Admin New Subscription Purchased Alert",
    subject: "[ADMIN REVENUE] Subscription sale: {{subscription_name}}",
    category: "Admin Alert",
    variables_hint: "user_name, subscription_name, purchase_amount, transaction_id",
    body: `<h2>New Subscriber Event (Revenue)</h2>
<p>Hello Admin,</p>
<p>A new purchase has occurred for a recurring subscription:</p>
<table class="meta-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Subscriber:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{user_name}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Tier Selected:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{subscription_name}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Amount Gross:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">\${{purchase_amount}}</td></tr>
</table>`
  },
  {
    slug: "admin_failed_payment_alert",
    name: "Admin Failed Payment Alert",
    subject: "[ADMIN WARNING] Recurring billing failure: {{user_name}}",
    category: "Admin Alert",
    variables_hint: "user_name, user_email, purchase_amount, invoice_number",
    body: `<h2>Recurring Billing Decline Alert</h2>
<p>A warning notification that a recurring billing transaction attempt has failed in full:</p>
<table class="meta-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">User Name:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{user_name}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Email Registered:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">{{user_email}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Attempted Net:</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 8px;">\${{purchase_amount}}</td></tr>
</table>`
  },
  {
    slug: "system_warning_alert",
    name: "System Warning Alert",
    subject: "[SYSTEM WARNING] Resource boundary limit exceeded",
    category: "Admin Alert",
    variables_hint: "support_email, company_name",
    body: `<h2>System Alert Triggered</h2>
<p>The system monitoring services have captured a warning limit trigger regarding storage disk, concurrent API queries, database disk, or bandwidth exceeding the standard limits.</p>
<p>Please log in directly to standard cloud telemetry terminal parameters or investigate host metrics safely.</p>`
  },
  {
    slug: "club_invitation",
    name: "Club Invitation",
    subject: "Invitation: Join the club '{{club_name}}' on WDSportz",
    category: "Team/League",
    variables_hint: "first_name, club_name, website_url",
    body: `<h2>Club Membership Invitation</h2>
<p>Hi {{first_name}},</p>
<p>You have been formally invited to join the private fan/team club <strong>{{club_name}}</strong>!</p>
<p>Clubs allow you to interact in exclusive chat rooms, analyze private tables and score boards, and coordinate live watch parties together.</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Accept Club Invitation</a>
</div>`
  },
  {
    slug: "club_approval",
    name: "Club Approval",
    subject: "APPROVED: Your club request for '{{club_name}}' was successful",
    category: "Team/League",
    variables_hint: "first_name, club_name, website_url",
    body: `<h2>Your Club Request is Approved</h2>
<p>Hello {{first_name}},</p>
<p>We are excited to share that your application request to register or join the club <strong>{{club_name}}</strong> was approved.</p>
<p>You are now a verified club affiliate! Celebrate and connect with other team fans in style.</p>`
  },
  {
    slug: "league_invitation",
    name: "League Invitation",
    subject: "Tournament Entry: Invitation to '{{league_name}}'",
    category: "Team/League",
    variables_hint: "first_name, league_name, website_url",
    body: `<h2>Join the Tournament League</h2>
<p>Hi {{first_name}},</p>
<p>Your team/channel has been invited to compete inside the prestigious tournament league: <strong>{{league_name}}</strong> on the WDSportz scheduler system!</p>
<p>Confirm your team roster, coordinate event schedules, and list custom stream ticket prices.</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Review League Agreement</a>
</div>`
  },
  {
    slug: "league_approval",
    name: "League Approval",
    subject: "League Entry CONFIRMED: {{league_name}}",
    category: "Team/League",
    variables_hint: "first_name, league_name, website_url",
    body: `<h2>League Entry Approved</h2>
<p>Hello {{first_name}},</p>
<p>Verification complete: your registration entry request into the league <strong>{{league_name}}</strong> is officially finalized with scheduler approval.</p>`
  },
  {
    slug: "newsletter",
    name: "Newsletter",
    subject: "WDSportz Recap: Weekly highlights, matches, and creator news",
    category: "Marketing/Promo",
    variables_hint: "first_name, website_url, company_name",
    body: `<h2>WDSportz Weekly Highlights</h2>
<p>Hello {{first_name}},</p>
<p>Here's what happened on the field and in our creator studios this past week! From buzzer-beater matches to elite player commentary, we've compiled the finest moments just for you.</p>
<p>Check the schedule on our homepage to make sure you never miss another kick-off.</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Read Full Recap</a>
</div>`
  },
  {
    slug: "promotional_campaign",
    name: "Promotional Campaign",
    subject: "Get 30% OFF premium access this week only!",
    category: "Marketing/Promo",
    variables_hint: "first_name, website_url, support_email",
    body: `<h2>Exclusive Fan Special Offer</h2>
<p>Hello {{first_name}},</p>
<p>Are you ready for unlimited live sports streaming in pristine HD? For a limited time only, we are extending a custom <strong>30% discount</strong> on all premium pricing packages!</p>
<div style="text-align: text-center; font-size: 20px; font-weight: bold; margin: 20px 0; color: #fbbf24;">
  PROMO CODE: CHAMPION30
</div>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Claim My Discount</a>
</div>`
  },
  {
    slug: "new_feature_announcement",
    name: "New Feature Announcement",
    subject: "Unveiling WDSportz Live Chat Replay & Bento Boards!",
    category: "Marketing/Promo",
    variables_hint: "first_name, website_url",
    body: `<h2>We've Upgraded the Experience</h2>
<p>Hi {{first_name}},</p>
<p>We are constantly engineering new features, and we are excited to release the **Live Chat Replay** and **Bento Dashboard Stats** today!</p>
<p>Now, during any match replay, you will see a scrolling simulation of fan comments exactly as they were typed live. Plus, enjoy our beautiful bento charts for player trends!</p>`
  },
  {
    slug: "special_offer",
    name: "Special Offer",
    subject: "Unlock all league matches for a unique bundle price",
    category: "Marketing/Promo",
    variables_hint: "first_name, website_url",
    body: `<h2>Premium Seasonal Bundle</h2>
<p>Hi {{first_name}},</p>
<p>Why pay for matches separately? This season, unlock a multi-match tournament ticket pass in a one-time value pack and enjoy the full playoffs schedule in ultra HD with a 40% net discount.</p>`
  },
  {
    slug: "seasonal_promotion",
    name: "Seasonal Promotion",
    subject: "The Summer Games are on! Kickoff inside the app",
    category: "Marketing/Promo",
    variables_hint: "first_name, website_url",
    body: `<h2>Summer on WDSportz</h2>
<p>Hello {{first_name}},</p>
<p>The Summer Season is heating up with over 150 live championship match events scheduled over the next 45 days. Log in now and reserve your championship match seating early!</p>`
  }
];
