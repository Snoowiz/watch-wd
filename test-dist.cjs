var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_vite = require("vite");
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_stripe = __toESM(require("stripe"), 1);

// seedTemplates.ts
var defaultBranding = {
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
  copyright_text: "\xA9 2026 WDSportz Inc. All rights reserved."
};
var SEED_TEMPLATES = [
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

// src/utils/cacheManager.ts
var DEFAULT_TTLS = {
  database: 15,
  fragment: 30,
  cdn: 60
};
var CacheManager = class {
  constructor() {
    this.dbCache = /* @__PURE__ */ new Map();
    this.fragmentCache = /* @__PURE__ */ new Map();
    this.cdnCache = /* @__PURE__ */ new Map();
    // TTL Settings
    this.ttls = { ...DEFAULT_TTLS };
    // Metrics
    this.metrics = {
      database: { hits: 0, misses: 0, staleServes: 0, totalRequests: 0 },
      fragment: { hits: 0, misses: 0, staleServes: 0, totalRequests: 0 },
      cdn: { hits: 0, misses: 0, staleServes: 0, totalRequests: 0 }
    };
    // Recent events log (capped at 50)
    this.events = [];
    this.logEvent("System Init", "Initialized Multi-layer Caching Engine with baseline TTLs", "general");
  }
  // --- LOGGING ---
  logEvent(event, details, layer = "general") {
    const id = Math.random().toString(36).substring(2, 9);
    const newEvent = {
      id,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      event,
      details,
      layer
    };
    this.events.unshift(newEvent);
    if (this.events.length > 50) {
      this.events.pop();
    }
    console.log(`[CacheManager] [${layer.toUpperCase()}] ${event}: ${details}`);
  }
  // --- GETTERS & SETTERS ---
  get(layer, key) {
    const store = this.getStore(layer);
    this.metrics[layer].totalRequests++;
    if (!store.has(key)) {
      this.metrics[layer].misses++;
      return null;
    }
    const entry = store.get(key);
    const now = Date.now();
    if (now > entry.expiresAt) {
      if (layer === "cdn" && entry.staleAt && now <= entry.staleAt) {
        this.metrics[layer].staleServes++;
        this.metrics[layer].hits++;
        this.logEvent("Stale Serve", `Serving stale-while-revalidate cache for key: ${key}`, layer);
        return { value: entry.value, stale: true };
      }
      store.delete(key);
      this.metrics[layer].misses++;
      this.logEvent("Cache Expired", `Key expired: ${key}`, layer);
      return null;
    }
    this.metrics[layer].hits++;
    return layer === "cdn" ? { value: entry.value, stale: false } : entry.value;
  }
  set(layer, key, value, customTtl) {
    const store = this.getStore(layer);
    const ttlSeconds = customTtl !== void 0 ? customTtl : this.ttls[layer];
    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1e3;
    const staleAt = layer === "cdn" ? expiresAt + 30 * 1e3 : void 0;
    store.set(key, {
      key,
      value,
      createdAt: now,
      expiresAt,
      staleAt,
      layer
    });
    this.logEvent("Cache Write", `Written key: ${key} (TTL: ${ttlSeconds}s)`, layer);
  }
  // --- FLUSH OPERATIONS ---
  flush(layer) {
    if (layer === "all") {
      this.dbCache.clear();
      this.fragmentCache.clear();
      this.cdnCache.clear();
      this.logEvent("Flush Caches", "All caching layers flushed manually", "general");
    } else {
      const store = this.getStore(layer);
      store.clear();
      this.logEvent("Flush Layer", `Flushed all keys from ${layer} cache`, layer);
    }
  }
  invalidatePattern(layer, pattern) {
    const store = this.getStore(layer);
    let count = 0;
    for (const key of store.keys()) {
      if (key.includes(pattern)) {
        store.delete(key);
        count++;
      }
    }
    if (count > 0) {
      this.logEvent("Invalidation Pattern", `Invalidated ${count} key(s) matching "${pattern}"`, layer);
    }
  }
  invalidateCollection(collectionPath) {
    this.invalidatePattern("database", `db::${collectionPath}`);
    this.invalidatePattern("database", `db-doc::${collectionPath}`);
    this.invalidatePattern("fragment", `/api/${collectionPath}`);
    this.invalidatePattern("cdn", `/api/${collectionPath}`);
  }
  // --- MEMORY AND MONITORING METRICS ---
  getMemoryStats() {
    let dbBytes = 0;
    let fragmentBytes = 0;
    let cdnBytes = 0;
    const estimateSize = (val) => {
      try {
        const str = JSON.stringify(val);
        return (str ? str.length * 2 : 0) + 128;
      } catch {
        return 256;
      }
    };
    this.dbCache.forEach((entry) => {
      dbBytes += estimateSize(entry.value);
    });
    this.fragmentCache.forEach((entry) => {
      fragmentBytes += estimateSize(entry.value);
    });
    this.cdnCache.forEach((entry) => {
      cdnBytes += estimateSize(entry.value);
    });
    const rss = process.memoryUsage().rss;
    const heapUsed = process.memoryUsage().heapUsed;
    return {
      layers: {
        database: { bytes: dbBytes, sizeStr: this.formatBytes(dbBytes), keysCount: this.dbCache.size },
        fragment: { bytes: fragmentBytes, sizeStr: this.formatBytes(fragmentBytes), keysCount: this.fragmentCache.size },
        cdn: { bytes: cdnBytes, sizeStr: this.formatBytes(cdnBytes), keysCount: this.cdnCache.size }
      },
      process: {
        rss: this.formatBytes(rss),
        heapUsed: this.formatBytes(heapUsed)
      }
    };
  }
  // --- DYNAMIC CACHE WARMING ---
  // Simple simulator to cold/warm API responses and popular DB records
  async warmCaches(fetcherFn) {
    this.logEvent("Cache Warming", "Starting background cache warming for critical paths...", "general");
    const pathsToWarm = [
      "/api/features",
      "/api/matches",
      "/api/plans",
      "/api/tasks"
    ];
    let warmedCount = 0;
    for (const path2 of pathsToWarm) {
      try {
        const data = await fetcherFn(path2);
        if (data) {
          this.set("fragment", path2, data);
          warmedCount++;
        }
      } catch (err) {
        console.error(`Failed to warm cache for path ${path2}: ${err.message}`);
      }
    }
    this.logEvent("Cache Warming Finished", `Successfully pre-heated ${warmedCount} critical API fragments`, "general");
    return warmedCount;
  }
  // --- UTILS ---
  getStore(layer) {
    switch (layer) {
      case "database":
        return this.dbCache;
      case "fragment":
        return this.fragmentCache;
      case "cdn":
        return this.cdnCache;
    }
  }
  formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
};
var cacheEngine = new CacheManager();

// server.ts
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
var import_meta = {};
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var JWT_SECRET = process.env.JWT_SECRET || "wdsportz-super-secret-key-2026";
var fbConfig = JSON.parse(import_fs.default.readFileSync("./firebase-applet-config.json", "utf8"));
var appAdmin = (0, import_app.initializeApp)(fbConfig);
var firestoreClient = (0, import_firestore.getFirestore)(appAdmin, fbConfig.firestoreDatabaseId || "(default)");
var FirebaseAdminWrapper = class {
  collection(path2) {
    return new CollectionWrapper(path2);
  }
};
var CollectionWrapper = class _CollectionWrapper {
  constructor(path2, queryConstraints = []) {
    this.path = path2;
    this.queryConstraints = queryConstraints;
  }
  where(field, op, value) {
    return new _CollectionWrapper(this.path, [...this.queryConstraints, (0, import_firestore.where)(field, op, value)]);
  }
  orderBy(field, dir = "asc") {
    return new _CollectionWrapper(this.path, [...this.queryConstraints, (0, import_firestore.orderBy)(field, dir)]);
  }
  limit(n) {
    return new _CollectionWrapper(this.path, [...this.queryConstraints, (0, import_firestore.limit)(n)]);
  }
  async get() {
    console.log("FirebaseAdminWrapper GET called on path:", this.path, "with constraints", this.queryConstraints);
    const q = (0, import_firestore.query)((0, import_firestore.collection)(firestoreClient, this.path), ...this.queryConstraints);
    const snap = await (0, import_firestore.getDocs)(q);
    return {
      empty: snap.empty,
      size: snap.size,
      docs: snap.docs.map((d) => ({
        id: d.id,
        ref: new DocWrapper(this.path, d.id),
        exists: d.exists(),
        data: () => d.data()
      }))
    };
  }
  doc(id) {
    if (id) return new DocWrapper(this.path, id);
    const d = (0, import_firestore.doc)((0, import_firestore.collection)(firestoreClient, this.path));
    return new DocWrapper(this.path, d.id);
  }
  async add(data) {
    const ref = await (0, import_firestore.addDoc)((0, import_firestore.collection)(firestoreClient, this.path), data);
    return { id: ref.id, ref: new DocWrapper(this.path, ref.id) };
  }
};
var DocWrapper = class {
  constructor(path2, id) {
    this.path = path2;
    this.id = id;
  }
  get ref() {
    return this;
  }
  async get() {
    const d = (0, import_firestore.doc)(firestoreClient, this.path, this.id);
    const snap = await (0, import_firestore.getDoc)(d);
    return {
      id: snap.id,
      exists: snap.exists(),
      ref: this,
      data: () => snap.data()
    };
  }
  async set(data, options) {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(firestoreClient, this.path, this.id), data, options);
  }
  async update(data) {
    await (0, import_firestore.updateDoc)((0, import_firestore.doc)(firestoreClient, this.path, this.id), data);
  }
  async delete() {
    await (0, import_firestore.deleteDoc)((0, import_firestore.doc)(firestoreClient, this.path, this.id));
  }
};
var db = new FirebaseAdminWrapper();
var admin = {
  firestore: {
    FieldValue: {
      serverTimestamp: () => (0, import_firestore.serverTimestamp)()
    },
    FieldPath: {
      documentId: () => (0, import_firestore.documentId)()
    }
  }
};
function apiFragmentCache(ttlSeconds) {
  return (req, res, next) => {
    if (req.method !== "GET") return next();
    const key = `fragment::${req.originalUrl}`;
    const cached = cacheEngine.get("fragment", key);
    if (cached) {
      res.setHeader("X-Cache-Layer", "Fragment");
      res.setHeader("X-Cache-Hit", "true");
      return res.json(cached);
    }
    const origJson = res.json;
    res.json = function(body) {
      res.json = origJson;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheEngine.set("fragment", key, body, ttlSeconds);
      }
      return origJson.call(this, body);
    };
    next();
  };
}
function cdnEdgeSim(ttlSeconds) {
  return (req, res, next) => {
    if (req.method !== "GET") return next();
    const key = `cdn::${req.path}`;
    const cached = cacheEngine.get("cdn", key);
    res.setHeader("Cache-Control", `public, max-age=${ttlSeconds}, stale-while-revalidate=30`);
    if (cached) {
      res.setHeader("X-CDN-Cache", cached.stale ? "STALE" : "HIT");
      res.setHeader("X-CDN-Edge-IP", "185.190.140.23");
      res.setHeader("X-CDN-Region", "EU-West (London)");
      if (cached.stale) {
        process.nextTick(() => {
          console.log(`[CDN Edge SIM] Asynchronously revalidating stale route: ${key}`);
        });
      }
      return res.json(cached.value);
    }
    const origJson = res.json;
    res.json = function(body) {
      res.json = origJson;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheEngine.set("cdn", key, body, ttlSeconds);
      }
      res.setHeader("X-CDN-Cache", "MISS");
      res.setHeader("X-CDN-Edge-IP", "185.190.140.23");
      res.setHeader("X-CDN-Region", "EU-West (London)");
      return origJson.call(this, body);
    };
    next();
  };
}
async function warmCriticalCaches() {
  return true;
  try {
    console.log("[Cache Warmer] Pre-heating database collections and API cache content...");
    const collectionsToWarm = ["features", "matches", "plans", "tasks"];
    for (const coll of collectionsToWarm) {
      const snapshot = await db.collection(coll).get();
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      cacheEngine.set("fragment", `fragment::/api/${coll}`, docs);
      cacheEngine.set("cdn", `cdn::/api/${coll}`, docs);
    }
    cacheEngine.logEvent("Deploy Cache Warming", "Successfully pre-heated database collections, fragment API paths, and CDN POP simulators", "general");
    return true;
  } catch (err) {
    console.error("[Cache Warmer] Error warming critical paths:", err);
    return false;
  }
}
var authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.split(" ")[1];
  try {
    req.user = import_jsonwebtoken.default.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
var requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
};
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = process.env.APP_PORT || 3e3;
  import_fs.default.writeFileSync("server-pid.txt", process.pid.toString());
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
  app.use("/api", (req, res, next) => {
    console.log(`[API] ${req.method} ${req.url}`);
    next();
  });
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name, device_id } = req.body;
      const hash = import_bcryptjs.default.hashSync(password, 10);
      const finalDeviceId = device_id || Math.random().toString(36).substring(2, 15);
      const userRef = db.collection("users").doc();
      const role = email === "mayycutee1@gmail.com" ? "admin" : "viewer";
      const userData = { email, password: hash, name, active_device_id: finalDeviceId, role, points: 0, status: "active", createdAt: admin.firestore.FieldValue.serverTimestamp() };
      await userRef.set(userData);
      const token = import_jsonwebtoken.default.sign({ id: userRef.id, role: userData.role, device_id: finalDeviceId }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user: { id: userRef.id, ...userData }, device_id: finalDeviceId });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  app.get("/api/testdb", async (req, res) => {
    try {
      const q = (0, import_firestore.query)((0, import_firestore.collection)(firestoreClient, "users"), (0, import_firestore.limit)(1));
      const snap = await (0, import_firestore.getDocs)(q);
      res.json({ success: true, dbId: fbConfig.firestoreDatabaseId, size: snap.size });
    } catch (e) {
      res.status(500).json({ error: e.message, code: e.code, name: e.name, dbId: fbConfig.firestoreDatabaseId });
    }
  });
  app.post("/api/testpost", async (req, res) => {
    try {
      const q = (0, import_firestore.query)((0, import_firestore.collection)(firestoreClient, "users"), (0, import_firestore.where)("email", "==", req.body.email));
      const snap = await (0, import_firestore.getDocs)(q);
      res.json({ success: true, dbId: fbConfig.firestoreDatabaseId, size: snap.size });
    } catch (e) {
      res.status(500).json({ error: e.message, code: e.code, name: e.name, dbId: fbConfig.firestoreDatabaseId });
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    res.json({ message: "PROOF THE SERVER UPDATED" });
  });
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { email, name, avatar, device_id } = req.body;
      const finalDeviceId = device_id || Math.random().toString(36).substring(2, 15);
      const snapshot = await db.collection("users").where("email", "==", email).get();
      let user = null;
      let docId = "";
      if (snapshot.empty) {
        const userRef = db.collection("users").doc();
        docId = userRef.id;
        const role = email === "mayycutee1@gmail.com" ? "admin" : "viewer";
        user = { email, password: "google-auth-no-password", name, avatar, active_device_id: finalDeviceId, role, points: 0, status: "active", createdAt: admin.firestore.FieldValue.serverTimestamp() };
        await userRef.set(user);
      } else {
        const doc2 = snapshot.docs[0];
        docId = doc2.id;
        user = doc2.data();
        if (user.status !== "active") return res.status(403).json({ error: "Account suspended" });
        if (email === "mayycutee1@gmail.com" && user.role !== "admin") {
          user.role = "admin";
          await doc2.ref.update({ role: "admin", active_device_id: finalDeviceId, avatar });
        } else {
          await doc2.ref.update({ active_device_id: finalDeviceId, avatar });
        }
        user.avatar = avatar;
      }
      const token = import_jsonwebtoken.default.sign({ id: docId, role: user.role, device_id: finalDeviceId }, JWT_SECRET, { expiresIn: "7d" });
      const { password: _, ...u } = user;
      res.json({ token, user: { id: docId, ...u }, device_id: finalDeviceId });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/auth/me", authenticate, async (req, res) => {
    try {
      const doc2 = await db.collection("users").doc(req.user.id).get();
      if (!doc2.exists) return res.status(404).json({ error: "Not found" });
      const user = doc2.data();
      if (req.user.device_id && user.active_device_id && req.user.device_id !== user.active_device_id) {
        return res.status(401).json({ error: "Session invalidated." });
      }
      res.json({ user: { id: doc2.id, ...user } });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/auth/profile", authenticate, async (req, res) => {
    try {
      const updates = req.body;
      Object.keys(updates).forEach((key) => updates[key] === void 0 && delete updates[key]);
      await db.collection("users").doc(req.user.id).update(updates);
      const doc2 = await db.collection("users").doc(req.user.id).get();
      res.json({ user: { id: doc2.id, ...doc2.data() } });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const snaps = await db.collection("users").where("email", "==", req.body.email).get();
      if (!snaps.empty) {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        await db.collection("password_resets").add({ email: req.body.email, token, expires_at: new Date(Date.now() + 60 * 60 * 1e3) });
      }
      res.json({ message: "If an account with that email exists, we have sent a reset link." });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, new_password } = req.body;
      const snap = await db.collection("password_resets").where("token", "==", token).get();
      if (snap.empty) return res.status(400).json({ error: "Invalid or expired token" });
      const reset = snap.docs[0].data();
      const expiresDate = typeof reset.expires_at === "string" ? new Date(reset.expires_at) : reset.expires_at instanceof Date ? reset.expires_at : new Date(reset.expires_at);
      if (expiresDate < /* @__PURE__ */ new Date()) return res.status(400).json({ error: "Token expired" });
      const users = await db.collection("users").where("email", "==", reset.email).get();
      if (!users.empty) {
        const hash = import_bcryptjs.default.hashSync(new_password, 10);
        await users.docs[0].ref.update({ password: hash });
        await snap.docs[0].ref.delete();
      }
      res.json({ message: "Password has been reset successfully" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/notifications/notify-match-live", authenticate, async (req, res) => {
    try {
      const { matchId, matchTitle } = req.body;
      console.log(`[PUSH] Match Live -> ${matchId} (${matchTitle})`);
      res.json({ success: true, message: `Notification broadcast sent for match ${matchId}` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/notifications", authenticate, async (req, res) => {
    try {
      const snap = await db.collection("notifications").where("user_id", "==", req.user.id).get();
      const list = snap.docs.map((d) => {
        const rawId = d.id;
        let parsedId = rawId;
        if (/^\d+$/.test(rawId)) {
          parsedId = parseInt(rawId, 10);
        }
        return { ...d.data(), id: parsedId };
      });
      list.sort((a, b) => {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/notifications", authenticate, async (req, res) => {
    try {
      const notification = req.body;
      const ref = db.collection("notifications").doc();
      const numericalId = Date.now() + Math.floor(Math.random() * 1e3);
      const data = {
        ...notification,
        id: numericalId,
        user_id: notification.user_id || req.user.id,
        is_read: 0,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      await ref.set(data);
      res.json({ id: numericalId, ...data });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/notifications/:id/read", authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const snap = await db.collection("notifications").get();
      const docToUpdate = snap.docs.find((d) => {
        const data = d.data();
        return String(d.id) === String(id) || String(data.id) === String(id);
      });
      if (docToUpdate) {
        await docToUpdate.ref.update({ is_read: 1 });
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/notifications/read-all", authenticate, async (req, res) => {
    try {
      const snap = await db.collection("notifications").where("user_id", "==", req.user.id).get();
      for (const d of snap.docs) {
        await d.ref.update({ is_read: 1 });
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/features", cdnEdgeSim(60), apiFragmentCache(30), async (req, res) => {
    try {
      const snap = await db.collection("features").get();
      res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/matches", cdnEdgeSim(30), apiFragmentCache(15), async (req, res) => {
    try {
      const snap = await db.collection("matches").orderBy("start_time", "desc").get();
      res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/access/verify", authenticate, async (req, res) => {
    res.json({ hasAccess: true });
  });
  app.get("/api/matches/:id", async (req, res) => {
    try {
      const doc2 = await db.collection("matches").doc(req.params.id).get();
      if (!doc2.exists) return res.status(404).json({ error: "Not found" });
      res.json({ id: doc2.id, ...doc2.data() });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/matches", authenticate, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      const docRef = await db.collection("matches").add({ ...req.body, operator_id: req.user.id, created_at: admin.firestore.FieldValue.serverTimestamp() });
      res.json({ id: docRef.id });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/matches/:id", authenticate, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      await db.collection("matches").doc(req.params.id).update(req.body);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/saved-matches", authenticate, async (req, res) => {
    try {
      const snap = await db.collection("saved_matches").where("user_id", "==", req.user.id).get();
      res.json(snap.docs.map((d) => d.data().match_id));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/saved-matches/details", authenticate, async (req, res) => {
    try {
      const snap = await db.collection("saved_matches").where("user_id", "==", req.user.id).get();
      const matchIds = snap.docs.map((d) => d.data().match_id);
      if (matchIds.length === 0) return res.json([]);
      const matchSnap = await db.collection("matches").where(admin.firestore.FieldPath.documentId(), "in", matchIds.slice(0, 30)).get();
      res.json(matchSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/matches/:id/save", authenticate, async (req, res) => {
    try {
      await db.collection("saved_matches").add({ user_id: req.user.id, match_id: req.params.id });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  async function seedEmailSystem() {
    try {
      const brandingDoc = await db.collection("email_branding").doc("settings").get();
      if (!brandingDoc.exists) {
        await db.collection("email_branding").doc("settings").set(defaultBranding);
        console.log("[EMAIL SEEDER] Seeded default email branding configurations.");
      }
      const smtpDoc = await db.collection("email_settings").doc("smtp").get();
      if (!smtpDoc.exists) {
        await db.collection("email_settings").doc("smtp").set({
          host: "smtp.example.com",
          port: 465,
          auth_user: "user@example.com",
          auth_pass: "",
          secure: true,
          is_active: false,
          from_name: "WDSportz Support",
          from_email: "noreply@wdsportz.com",
          reply_to: "support@wdsportz.com",
          provider: "smtp"
        });
        console.log("[EMAIL SEEDER] Seeded default SMTP configuration.");
      }
      const templatesSnap = await db.collection("email_templates").get();
      if (templatesSnap.empty) {
        console.log(`[EMAIL SEEDER] Seeding ${SEED_TEMPLATES.length} default email templates...`);
        for (const t of SEED_TEMPLATES) {
          await db.collection("email_templates").doc(t.slug).set({
            ...t,
            is_active: true,
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          });
          await db.collection("email_template_analytics").doc(t.slug).set({
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            failed: 0,
            bounced: 0,
            last_sent_at: ""
          });
        }
        console.log("[EMAIL SEEDER] Seeded 44 templates successfully.");
      }
    } catch (err) {
      console.error("[EMAIL SEEDER] Error during seeding:", err.message);
    }
  }
  async function renderEmailTemplate(slug, variables) {
    const brandingDoc = await db.collection("email_branding").doc("settings").get();
    const branding = brandingDoc.exists ? brandingDoc.data() : defaultBranding;
    const templateDoc = await db.collection("email_templates").doc(slug).get();
    if (!templateDoc.exists) throw new Error("Template not found: " + slug);
    const template = templateDoc.data();
    let body = template.body;
    let subject = template.subject;
    const allVars = {
      first_name: "John",
      last_name: "Doe",
      user_name: "johndoe",
      user_email: "johndoe@example.com",
      match_name: "El Cl\xE1sico Derby",
      match_date: (/* @__PURE__ */ new Date()).toLocaleDateString(),
      match_time: "20:00 UTC",
      league_name: "Champions League",
      club_name: "Real FC",
      subscription_name: "Platinum Annual Access",
      purchase_amount: "49.99",
      transaction_id: "TXN_78291039",
      invoice_number: "INV-2026-908",
      support_email: "support@wdsportz.com",
      company_name: "WDSportz",
      website_url: "http://localhost:3000",
      reset_password_link: "http://localhost:3000/auth/reset?token=abc",
      verification_link: "http://localhost:3000/auth/verify?token=xyz",
      creator_name: "ProStreamer X",
      ...variables
    };
    Object.entries(allVars).forEach(([key, val]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      body = body.replace(regex, String(val));
      subject = subject.replace(regex, String(val));
    });
    const siteUrl = allVars.website_url;
    body += `<img src="${siteUrl}/api/email/track-open?slug=${slug}" width="1" height="1" style="display:none;" />`;
    body = body.replace(/href="([^"]+)"/g, (match, p1) => {
      if (p1.includes("track-") || p1.includes("mailto:")) return match;
      return `href="${siteUrl}/api/email/track-click?slug=${slug}&url=${encodeURIComponent(p1)}"`;
    });
    const masterLayout = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
    .email-container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
    .email-header { padding: 32px; text-align: center; }
    .email-logo { max-height: 48px; }
    .email-body { padding: 40px; color: #1e293b; font-size: 16px; line-height: 1.6; }
    .email-body h2 { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 16px; }
    .email-footer { padding: 32px; text-align: center; color: #cbd5e1; font-size: 12px; }
    .email-footer a { color: #f1f5f9; text-decoration: none; font-weight: bold; margin: 0 4px; }
    .button { display: inline-block; padding: 12px 24px; font-weight: bold; text-decoration: none; font-size: 14px; margin: 24px 0; }
    .meta-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .meta-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .meta-table td.label { font-weight: bold; color: #64748b; width: 40%; }
    .meta-table td.value { color: #1e293b; font-weight: 500; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header" style="background-color: ${branding.secondary_color || "#0f172a"}; text-align: center;">
      <img src="${branding.logo_url}" alt="WDSportz" class="email-logo" style="max-height: 48px;" />
    </div>
    <div class="email-body">
      ${body}
    </div>
    <div class="email-footer" style="background-color: ${branding.secondary_color || "#0f172a"}; text-align: center;">
      <div style="margin-bottom: 16px; color: #cbd5e1; line-height: 1.4;">${branding.footer_content}</div>
      <div style="margin-bottom: 16px;">
        <a href="${branding.social_twitter || "https://twitter.com"}" style="color: #cbd5e1;">Twitter</a> &bull; 
        <a href="${branding.social_facebook || "https://facebook.com"}" style="color: #cbd5e1;">Facebook</a> &bull; 
        <a href="${branding.social_instagram || "https://instagram.com"}" style="color: #cbd5e1;">Instagram</a> &bull; 
        <a href="${branding.social_youtube || "https://youtube.com"}" style="color: #cbd5e1;">YouTube</a>
      </div>
      <div style="font-size: 11px; color: #94a3b8; line-height: 1.4;">
        ${branding.contact_info}<br/>
        ${branding.copyright_text}
      </div>
    </div>
  </div>
</body>
</html>`;
    return { subject, html: masterLayout };
  }
  async function dispatchEmail(to, subject, html, text) {
    const settingsDoc = await db.collection("email_settings").doc("smtp").get();
    if (!settingsDoc.exists) throw new Error("No SMTP configuration found.");
    const smtp = settingsDoc.data();
    if (!smtp.is_active) {
      console.log(`[STUB EMAIL SEND] System inactive. To: ${to}, Subject: ${subject}`);
      return { success: true, provider: "mock", messageId: "mock-" + Date.now() };
    }
    if (smtp.provider === "smtp" || !smtp.provider) {
      const transporter = import_nodemailer.default.createTransport({
        host: smtp.host,
        port: Number(smtp.port),
        secure: smtp.secure,
        auth: {
          user: smtp.auth_user,
          pass: smtp.auth_pass
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      const info = await transporter.sendMail({
        from: `"${smtp.from_name}" <${smtp.from_email}>`,
        replyTo: smtp.reply_to || smtp.from_email,
        to,
        subject,
        html,
        text: text || "WDSportz Email Support"
      });
      return { success: true, provider: "smtp", messageId: info.messageId };
    } else {
      console.log(`[EXTERNAL PROVIDER DISPATCH] Routed via ${smtp.provider.toUpperCase()} to ${to} (Key: ${smtp.api_key ? "VALID" : "NONE"})`);
      return { success: true, provider: smtp.provider, messageId: `${smtp.provider}-dispatch-${Date.now()}` };
    }
  }
  seedEmailSystem().catch((err) => console.error("Failed to seed mail system:", err));
  app.get("/api/email/track-open", async (req, res) => {
    const { slug } = req.query;
    if (slug) {
      try {
        const analyticsDoc = await db.collection("email_template_analytics").doc(slug).get();
        if (analyticsDoc.exists) {
          const data = analyticsDoc.data();
          await db.collection("email_template_analytics").doc(slug).update({
            opened: (data.opened || 0) + 1
          });
        }
      } catch (err) {
        console.error("Failed to track open:", err);
      }
    }
    const buf = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    res.writeHead(200, {
      "Content-Type": "image/gif",
      "Content-Length": buf.length,
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
    });
    res.end(buf);
  });
  app.get("/api/email/track-click", async (req, res) => {
    const { slug, url } = req.query;
    if (slug) {
      try {
        const analyticsDoc = await db.collection("email_template_analytics").doc(slug).get();
        if (analyticsDoc.exists) {
          const data = analyticsDoc.data();
          await db.collection("email_template_analytics").doc(slug).update({
            clicked: (data.clicked || 0) + 1
          });
        }
      } catch (err) {
        console.error("Failed to track click:", err);
      }
    }
    if (url) {
      res.redirect(decodeURIComponent(url));
    } else {
      res.redirect("/");
    }
  });
  app.get("/api/admin/email/settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const smtpDoc = await db.collection("email_settings").doc("smtp").get();
      const brandingDoc = await db.collection("email_branding").doc("settings").get();
      const smtp = smtpDoc.exists ? smtpDoc.data() : {};
      const branding = brandingDoc.exists ? brandingDoc.data() : defaultBranding;
      res.json({ ...smtp, branding });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/email/settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { branding, ...smtp } = req.body;
      if (smtp) {
        await db.collection("email_settings").doc("smtp").set({
          ...smtp,
          secure: smtp.secure === true || smtp.secure === 1,
          is_active: smtp.is_active === true || smtp.is_active === 1
        });
      }
      if (branding) {
        await db.collection("email_branding").doc("settings").set(branding);
      }
      res.json({ success: true, message: "Settings saved successfully" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/email/test", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { to } = req.body;
      if (!to) return res.status(400).json({ error: "Recipient email is required" });
      const testSubject = "WDSportz SMTP Connection Verification";
      const testHtml = `<h2>SMTP Server Connected!</h2>
<p>Success! This email verifies that your SMTP server configuration on WDSportz is active and dispatching emails correctly.</p>
<p>Timestamp: <strong>${(/* @__PURE__ */ new Date()).toLocaleString()}</strong></p>
<p>If you received this message, your mail relay configurations are fully operational!</p>`;
      const brandingDoc = await db.collection("email_branding").doc("settings").get();
      const branding = brandingDoc.exists ? brandingDoc.data() : defaultBranding;
      const fullLayout = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background: #f8fafc; padding: 20px; }
    .cont { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
    .hdr { background: ${branding.secondary_color || "#0f172a"}; padding: 24px; text-align: center; }
    .bdy { padding: 32px; color: #1e293b; line-height: 1.5; }
    .ftr { background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="cont">
    <div class="hdr"><img src="${branding.logo_url}" style="max-height: 36px;" /></div>
    <div class="bdy">${testHtml}</div>
    <div class="ftr">${branding.contact_info}</div>
  </div>
</body>
</html>`;
      const result = await dispatchEmail(to, testSubject, fullLayout);
      res.json({ success: true, message: `Test email successfully dispatched to ${to} via ${result.provider}! ID: ${result.messageId}` });
    } catch (e) {
      res.status(500).json({ success: false, message: "Email send failed: " + e.message });
    }
  });
  app.get("/api/admin/email/templates", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("email_templates").get();
      const list = snap.docs.map((doc2) => ({ id: doc2.id, ...doc2.data() }));
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/email/templates/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const doc2 = await db.collection("email_templates").doc(req.params.id).get();
      if (!doc2.exists) return res.status(404).json({ error: "Template not found" });
      const versSnap = await db.collection("email_versions").where("template_id", "==", req.params.id).get();
      const versions = versSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.version_number - a.version_number);
      res.json({
        ...doc2.data(),
        id: doc2.id,
        versions
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/email/templates", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { name, subject, body, category, variables_hint } = req.body;
      if (!name || !subject || !body) return res.status(400).json({ error: "Missing required fields" });
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_+|_+$)/g, "");
      const checkDoc = await db.collection("email_templates").doc(slug).get();
      const finalSlug = checkDoc.exists ? `${slug}_${Date.now()}` : slug;
      const newTemplate = {
        slug: finalSlug,
        name,
        subject,
        body,
        category: category || "Custom",
        variables_hint: variables_hint || "user_name, user_email",
        is_active: true,
        is_custom: true,
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      await db.collection("email_templates").doc(finalSlug).set(newTemplate);
      await db.collection("email_template_analytics").doc(finalSlug).set({
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
        bounced: 0,
        last_sent_at: ""
      });
      res.json({ id: finalSlug, ...newTemplate });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/email/templates/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const templateDoc = await db.collection("email_templates").doc(req.params.id).get();
      if (!templateDoc.exists) return res.status(404).json({ error: "Template not found" });
      const current = templateDoc.data();
      const { subject, body, name, category, is_active, variables_hint } = req.body;
      const versSnap = await db.collection("email_versions").where("template_id", "==", req.params.id).get();
      const nextVersionNum = versSnap.docs.length + 1;
      await db.collection("email_versions").add({
        template_id: req.params.id,
        subject: current.subject,
        body: current.body,
        version_number: nextVersionNum,
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        created_by: req.user.email || "Admin"
      });
      const updates = {};
      if (subject !== void 0) updates.subject = subject;
      if (body !== void 0) updates.body = body;
      if (name !== void 0) updates.name = name;
      if (category !== void 0) updates.category = category;
      if (is_active !== void 0) updates.is_active = is_active;
      if (variables_hint !== void 0) updates.variables_hint = variables_hint;
      updates.updated_at = (/* @__PURE__ */ new Date()).toISOString();
      await db.collection("email_templates").doc(req.params.id).update(updates);
      res.json({ success: true, message: `Template compiled and archived to version ${nextVersionNum}` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/admin/email/templates/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const doc2 = await db.collection("email_templates").doc(req.params.id).get();
      if (!doc2.exists) return res.status(404).json({ error: "Template not found" });
      await db.collection("email_templates").doc(req.params.id).delete();
      const snap = await db.collection("email_versions").where("template_id", "==", req.params.id).get();
      snap.docs.forEach((d) => d.ref.delete());
      await db.collection("email_template_analytics").doc(req.params.id).delete();
      res.json({ success: true, message: "Template deleted" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/email/templates/:id/duplicate", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const doc2 = await db.collection("email_templates").doc(req.params.id).get();
      if (!doc2.exists) return res.status(404).json({ error: "Template not found" });
      const current = doc2.data();
      const newSlug = `${current.slug}_copy_${Date.now().toString().slice(-4)}`;
      const duplicated = {
        ...current,
        slug: newSlug,
        name: `${current.name} (Copy)`,
        is_custom: true,
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      await db.collection("email_templates").doc(newSlug).set(duplicated);
      await db.collection("email_template_analytics").doc(newSlug).set({
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
        bounced: 0,
        last_sent_at: ""
      });
      res.json({ success: true, id: newSlug, name: duplicated.name });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/email/templates/:id/restore-version", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { version_id } = req.body;
      if (!version_id) return res.status(400).json({ error: "Version ID is required" });
      const versionDoc = await db.collection("email_versions").doc(version_id).get();
      if (!versionDoc.exists) return res.status(404).json({ error: "Historical version not found" });
      const verObj = versionDoc.data();
      if (verObj.template_id !== req.params.id) return res.status(400).json({ error: "Version template mismatch" });
      const templateDoc = await db.collection("email_templates").doc(req.params.id).get();
      if (templateDoc.exists) {
        const cur = templateDoc.data();
        const versSnap = await db.collection("email_versions").where("template_id", "==", req.params.id).get();
        await db.collection("email_versions").add({
          template_id: req.params.id,
          subject: cur.subject,
          body: cur.body,
          version_number: versSnap.docs.length + 1,
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          created_by: `Auto Rollback (v${verObj.version_number})`
        });
      }
      await db.collection("email_templates").doc(req.params.id).update({
        subject: verObj.subject,
        body: verObj.body,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      res.json({ success: true, message: `Template successfully reverted to version ${verObj.version_number}` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/email/templates/:id/test", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { to, customVariables } = req.body;
      if (!to) return res.status(400).json({ error: "Recipient email is required" });
      const { subject, html } = await renderEmailTemplate(req.params.id, customVariables || {});
      const dispatchResult = await dispatchEmail(to, subject, html);
      const analyticsDoc = await db.collection("email_template_analytics").doc(req.params.id).get();
      if (analyticsDoc.exists) {
        const data = analyticsDoc.data();
        await db.collection("email_template_analytics").doc(req.params.id).update({
          sent: (data.sent || 0) + 1,
          delivered: (data.delivered || 0) + 1,
          last_sent_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      res.json({ success: true, message: `Template successfully sent in full branding to ${to}! Sender: ${dispatchResult.provider}` });
    } catch (e) {
      res.status(500).json({ success: false, message: "Template test dispatch failed: " + e.message });
    }
  });
  app.get("/api/admin/email/analytics", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const templatesSnap = await db.collection("email_templates").get();
      const analyticsSnap = await db.collection("email_template_analytics").get();
      const templates = templatesSnap.docs.map((t) => ({ id: t.id, name: t.data().name, category: t.data().category, slug: t.data().slug }));
      const analyticsGroup = analyticsSnap.docs.reduce((acc, d) => {
        acc[d.id] = d.data();
        return acc;
      }, {});
      const rows = templates.map((t) => {
        const stats = analyticsGroup[t.slug] || { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0, bounced: 0, last_sent_at: "" };
        const opRate = stats.sent > 0 ? Math.round(stats.opened / stats.sent * 100) : 0;
        const clRate = stats.opened > 0 ? Math.round(stats.clicked / stats.opened * 100) : 0;
        const bounceRate = stats.sent > 0 ? Math.round(stats.bounced / stats.sent * 100) : 0;
        return {
          ...t,
          sent: stats.sent || 0,
          delivered: stats.delivered || 0,
          opened: stats.opened || 0,
          clicked: stats.clicked || 0,
          failed: stats.failed || 0,
          bounce_rate: bounceRate,
          open_rate: opRate,
          click_rate: clRate,
          last_sent_at: stats.last_sent_at
        };
      });
      const globals = rows.reduce((acc, r) => {
        acc.sent += r.sent;
        acc.delivered += r.delivered;
        acc.opened += r.opened;
        acc.clicked += r.clicked;
        acc.failed += r.failed;
        return acc;
      }, { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0 });
      res.json({
        globals: {
          ...globals,
          delivery_rate: globals.sent > 0 ? Math.round(globals.delivered / globals.sent * 100) : 100,
          open_rate: globals.delivered > 0 ? Math.round(globals.opened / globals.delivered * 100) : 0,
          click_rate: globals.opened > 0 ? Math.round(globals.clicked / globals.opened * 100) : 0,
          bounce_rate: globals.sent > 0 ? Math.round(globals.failed / globals.sent * 100) : 0
        },
        templatesList: rows
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/matches/:id/save", authenticate, async (req, res) => {
    try {
      const snap = await db.collection("saved_matches").where("user_id", "==", req.user.id).where("match_id", "==", req.params.id).get();
      snap.docs.forEach((doc2) => doc2.ref.delete());
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/plans", cdnEdgeSim(120), apiFragmentCache(60), async (req, res) => {
    try {
      const plansSnap = await db.collection("plans").get();
      const plansList = plansSnap.docs.map((doc2) => {
        const data = doc2.data();
        return {
          id: Number(data.id || doc2.id),
          name: data.name || "",
          description: data.description || "",
          price: Number(data.price) || 0,
          duration_days: Number(data.duration_days) || 30,
          categories: typeof data.categories === "string" ? data.categories : JSON.stringify(data.categories || []),
          is_active: Number(data.is_active) ?? 1
        };
      });
      res.json(plansList);
    } catch (e) {
      res.json([]);
    }
  });
  app.get("/api/admin/plans", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const plansSnap = await db.collection("plans").get();
      const plansList = plansSnap.docs.map((doc2) => {
        const data = doc2.data();
        return {
          id: Number(data.id || doc2.id),
          name: data.name || "",
          description: data.description || "",
          price: Number(data.price) || 0,
          duration_days: Number(data.duration_days) || 30,
          categories: typeof data.categories === "string" ? data.categories : JSON.stringify(data.categories || []),
          is_active: Number(data.is_active) ?? 1
        };
      });
      res.json(plansList);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/plans", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const id = Date.now();
      const planData = {
        id,
        name: req.body.name,
        description: req.body.description,
        price: Number(req.body.price) || 0,
        duration_days: Number(req.body.duration_days) || 30,
        categories: Array.isArray(req.body.categories) ? JSON.stringify(req.body.categories) : typeof req.body.categories === "string" ? req.body.categories : "[]",
        is_active: Number(req.body.is_active) ?? 1
      };
      await db.collection("plans").doc(id.toString()).set(planData);
      res.json({ success: true, ...planData });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/plans/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const planData = {
        id: Number(id),
        name: req.body.name,
        description: req.body.description,
        price: Number(req.body.price) || 0,
        duration_days: Number(req.body.duration_days) || 30,
        categories: Array.isArray(req.body.categories) ? JSON.stringify(req.body.categories) : typeof req.body.categories === "string" ? req.body.categories : "[]",
        is_active: Number(req.body.is_active) ?? 1
      };
      await db.collection("plans").doc(id).set(planData);
      res.json({ success: true, ...planData });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/admin/plans/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      await db.collection("plans").doc(id).delete();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/payment/methods", async (req, res) => {
    try {
      const doc2 = await db.collection("payment_settings").doc("gateway").get();
      const settings = doc2.exists ? doc2.data() : {};
      res.json({
        stripe: { enabled: settings.stripe?.enabled || false },
        paypal: { enabled: settings.paypal?.enabled || false },
        paystack: { enabled: settings.paystack?.enabled || false }
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/payment/settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const doc2 = await db.collection("payment_settings").doc("gateway").get();
      res.json(doc2.exists ? doc2.data() : {});
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/payment/settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      await db.collection("payment_settings").doc("gateway").set(req.body);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  async function convertCurrency(amount, from, to) {
    if (from.toUpperCase() === to.toUpperCase()) return amount;
    try {
      const resp = await fetch(`https://api.exchangerate-api.com/v4/latest/${from.toUpperCase()}`);
      if (resp.ok) {
        const data = await resp.json();
        const rate = data.rates[to.toUpperCase()];
        if (rate) return amount * rate;
      }
    } catch (e) {
      console.error("Currency conversion error:", e);
    }
    return amount;
  }
  app.post("/api/checkout/gateway/initialize", authenticate, async (req, res) => {
    try {
      const { gateway, type, amount, metadata, currency = "GBP" } = req.body;
      const userId = req.user.id.toString();
      const origin = req.headers.origin || "https://wdsportz.com";
      const settingsDoc = await db.collection("payment_settings").doc("gateway").get();
      const settings = settingsDoc.exists ? settingsDoc.data() : {};
      const transactionId = `txn_${Date.now()}_${userId}`;
      const returnUrl = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&txn_id=${transactionId}&gateway=${gateway}`;
      const cancelUrl = `${origin}/checkout/cancel`;
      const pendingData = {
        userId: Number(userId),
        type,
        amount: Number(amount),
        status: "pending",
        gateway,
        metadata,
        date: (/* @__PURE__ */ new Date()).toISOString()
      };
      await db.collection("transactions").doc(transactionId).set(pendingData);
      if (gateway === "stripe") {
        if (!settings?.stripe?.enabled || !settings?.stripe?.secretKey) {
          return res.json({ checkoutUrl: `${origin}/checkout/success?txn_id=${transactionId}&session_id=mock_session&gateway=stripe` });
        }
        const targetCurrency = settings.stripe.merchantCurrency || currency;
        const convertedAmount = await convertCurrency(Number(amount), currency, targetCurrency);
        const stripe = new import_stripe.default(settings.stripe.secretKey, { apiVersion: "2023-10-16" });
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: targetCurrency.toLowerCase(),
                product_data: {
                  name: type === "top_up" ? "Wallet Top-up" : type === "watch" ? "Match Access" : type === "plan" ? "Subscription Plan" : "Access"
                },
                unit_amount: Math.round(convertedAmount * 100)
              },
              quantity: 1
            }
          ],
          mode: "payment",
          success_url: returnUrl,
          cancel_url: cancelUrl,
          client_reference_id: transactionId
        });
        return res.json({ checkoutUrl: session.url });
      }
      if (gateway === "paypal") {
        if (!settings?.paypal?.enabled || !settings?.paypal?.clientId || !settings?.paypal?.secret) {
          return res.json({ checkoutUrl: `${origin}/checkout/success?txn_id=${transactionId}&token=mock_paypal_token&gateway=paypal` });
        }
        const targetCurrency = settings.paypal.merchantCurrency || currency;
        const convertedAmount = await convertCurrency(Number(amount), currency, targetCurrency);
        const isTest = settings.paypal.isTestMode !== false;
        const auth = Buffer.from(`${settings.paypal.clientId}:${settings.paypal.secret}`).toString("base64");
        const tokenResp = await fetch(isTest ? "https://api-m.sandbox.paypal.com/v1/oauth2/token" : "https://api-m.paypal.com/v1/oauth2/token", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: "grant_type=client_credentials"
        });
        const tokenData = await tokenResp.json();
        const orderResp = await fetch(isTest ? "https://api-m.sandbox.paypal.com/v2/checkout/orders" : "https://api-m.paypal.com/v2/checkout/orders", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${tokenData.access_token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [{
              reference_id: transactionId,
              amount: {
                currency_code: targetCurrency.toUpperCase(),
                value: convertedAmount.toFixed(2)
              }
            }],
            application_context: {
              return_url: returnUrl.replace("{CHECKOUT_SESSION_ID}", "paypal_session"),
              cancel_url: cancelUrl
            }
          })
        });
        const orderData = await orderResp.json();
        if (!orderData.links) {
          throw new Error("PayPal order creation failed");
        }
        const approveLink = orderData.links.find((l) => l.rel === "approve");
        return res.json({ checkoutUrl: approveLink.href });
      }
      if (gateway === "paystack") {
        if (!settings?.paystack?.enabled || !settings?.paystack?.secretKey) {
          return res.json({ checkoutUrl: `${origin}/checkout/success?txn_id=${transactionId}&trxref=${transactionId}&gateway=paystack` });
        }
        let targetCurrency = settings.paystack.merchantCurrency || currency;
        if (!settings.paystack.merchantCurrency && currency.toUpperCase() === "GBP") {
          targetCurrency = "NGN";
        }
        const convertedAmount = await convertCurrency(Number(amount), currency, targetCurrency);
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        const email = userDoc.exists ? userDoc.data()?.email : "customer@wdsportz.com";
        const resp = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${settings.paystack.secretKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            amount: Math.round(convertedAmount * 100),
            // Paystack uses smallest currency unit (kobo/cents)
            currency: targetCurrency.toUpperCase(),
            reference: transactionId,
            callback_url: `${origin}/checkout/success?txn_id=${transactionId}&gateway=paystack`
          })
        });
        const d = await resp.json();
        if (!d.status) throw new Error(d.message);
        return res.json({ checkoutUrl: d.data.authorization_url });
      }
      throw new Error("Unsupported gateway");
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/checkout/gateway/verify", authenticate, async (req, res) => {
    try {
      const { txn_id, session_id, gateway } = req.body;
      const userId = req.user.id.toString();
      const txnDoc = await db.collection("transactions").doc(txn_id).get();
      if (!txnDoc.exists) throw new Error("Transaction not found");
      const txnData = txnDoc.data();
      if (txnData.status === "completed") {
        return res.json({ success: true, alreadyCompleted: true });
      }
      const settingsDoc = await db.collection("payment_settings").doc("gateway").get();
      const settings = settingsDoc.exists ? settingsDoc.data() : {};
      let isVerified = false;
      if (gateway === "stripe") {
        if (!settings?.stripe?.secretKey) {
          isVerified = true;
        } else {
          const stripe = new import_stripe.default(settings.stripe.secretKey, { apiVersion: "2023-10-16" });
          const session = await stripe.checkout.sessions.retrieve(session_id);
          if (session.payment_status === "paid") isVerified = true;
        }
      }
      if (gateway === "paypal") {
        if (!settings?.paypal?.secret) {
          isVerified = true;
        } else {
          const isTest = settings.paypal.isTestMode !== false;
          const auth = Buffer.from(`${settings.paypal.clientId}:${settings.paypal.secret}`).toString("base64");
          const tokenResp = await fetch(isTest ? "https://api-m.sandbox.paypal.com/v1/oauth2/token" : "https://api-m.paypal.com/v1/oauth2/token", {
            method: "POST",
            headers: {
              "Authorization": `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "grant_type=client_credentials"
          });
          const tokenData = await tokenResp.json();
          const orderId = req.body.token || req.body.session_id;
          if (!orderId) {
            throw new Error("Missing PayPal order ID (token)");
          }
          const captureResp = await fetch(isTest ? `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture` : `https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${tokenData.access_token}`,
              "Content-Type": "application/json"
            }
          });
          const captureData = await captureResp.json();
          if (captureData.status === "COMPLETED") {
            isVerified = true;
          } else {
            throw new Error("PayPal capture failed: " + (captureData.message || JSON.stringify(captureData.details || captureData.name)));
          }
        }
      }
      if (gateway === "paystack") {
        if (!settings?.paystack?.secretKey) {
          isVerified = true;
        } else {
          const resp = await fetch(`https://api.paystack.co/transaction/verify/${txn_id}`, {
            headers: { Authorization: `Bearer ${settings.paystack.secretKey}` }
          });
          const d = await resp.json();
          if (d.status && d.data.status === "success") isVerified = true;
        }
      }
      if (!isVerified) throw new Error("Payment verification failed");
      const { type, amount, metadata } = txnData;
      if (type === "top_up") {
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        const currentPoints = Number(userDoc.data()?.points || 0);
        await userRef.update({ points: currentPoints + amount });
        await db.collection("transactions").doc(txn_id).update({ status: "completed" });
        return res.json({ success: true });
      }
      if (type === "watch" || type === "embed") {
        const purchaseId = Date.now().toString();
        const purchaseData = {
          id: Number(purchaseId),
          userId: Number(userId),
          matchId: Number(metadata.matchId),
          amount,
          type,
          date: (/* @__PURE__ */ new Date()).toISOString()
        };
        if (type === "embed") {
          purchaseData.code = `<iframe src="https://wdsportz.com/embed/${metadata.matchId}" width="800" height="450" frameborder="0" allowfullscreen></iframe>`;
        }
        await db.collection("purchases").doc(purchaseId).set(purchaseData);
        await db.collection("transactions").doc(txn_id).update({ status: "completed" });
        return res.json({ success: true });
      }
      if (type === "plan") {
        const userRef = db.collection("users").doc(userId);
        await userRef.update({ planId: Number(metadata.planId) });
        await db.collection("transactions").doc(txn_id).update({ status: "completed" });
        return res.json({ success: true });
      }
      throw new Error("Unknown transaction type");
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/checkout/topup", authenticate, async (req, res) => {
    try {
      const { amount, paymentMethod } = req.body;
      const userId = req.user.id.toString();
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }
      const userData = userDoc.data() || {};
      const currentPoints = Number(userData.points) || 0;
      const newPoints = currentPoints + Number(amount);
      await userRef.update({ points: newPoints });
      const transactionId = Date.now().toString();
      const transactionData = {
        id: Number(transactionId),
        userId: Number(userId),
        type: "top_up",
        amount: Number(amount),
        description: `Top up via ${paymentMethod || "Credit Card"}`,
        date: (/* @__PURE__ */ new Date()).toISOString()
      };
      await db.collection("transactions").doc(transactionId).set(transactionData);
      res.json({ success: true, newPoints });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/checkout/ppv", authenticate, async (req, res) => {
    try {
      const { match_id, amount } = req.body;
      const userId = req.user.id.toString();
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }
      const userData = userDoc.data() || {};
      const currentPoints = Number(userData.points) || 0;
      const deductAmount = Number(amount);
      if (currentPoints < deductAmount) {
        return res.status(400).json({ error: "Insufficient points" });
      }
      const newPoints = currentPoints - deductAmount;
      await userRef.update({ points: newPoints });
      const purchaseId = Date.now().toString();
      const purchaseData = {
        id: Number(purchaseId),
        userId: Number(userId),
        matchId: Number(match_id),
        amount: deductAmount,
        type: "watch",
        date: (/* @__PURE__ */ new Date()).toISOString()
      };
      await db.collection("purchases").doc(purchaseId).set(purchaseData);
      const transactionId = (Date.now() + 1).toString();
      const transactionData = {
        id: Number(transactionId),
        userId: Number(userId),
        type: "purchase",
        amount: -deductAmount,
        description: `Purchased access to: Match #${match_id}`,
        date: (/* @__PURE__ */ new Date()).toISOString()
      };
      await db.collection("transactions").doc(transactionId).set(transactionData);
      res.json({ success: true, newPoints });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/checkout/embed", authenticate, async (req, res) => {
    try {
      const { match_id, amount } = req.body;
      const userId = req.user.id.toString();
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }
      const userData = userDoc.data() || {};
      const currentPoints = Number(userData.points) || 0;
      const deductAmount = Number(amount);
      if (currentPoints < deductAmount) {
        return res.status(400).json({ error: "Insufficient points" });
      }
      const newPoints = currentPoints - deductAmount;
      await userRef.update({ points: newPoints });
      const purchaseId = Date.now().toString();
      const purchaseData = {
        id: Number(purchaseId),
        userId: Number(userId),
        matchId: Number(match_id),
        amount: deductAmount,
        type: "embed",
        date: (/* @__PURE__ */ new Date()).toISOString(),
        code: `<iframe src="https://wdsportz.com/embed/${match_id}" width="800" height="450" frameborder="0" allowfullscreen></iframe>`
      };
      await db.collection("purchases").doc(purchaseId).set(purchaseData);
      const transactionId = (Date.now() + 1).toString();
      const transactionData = {
        id: Number(transactionId),
        userId: Number(userId),
        type: "purchase",
        amount: -deductAmount,
        description: `Purchased embed access to: Match #${match_id}`,
        date: (/* @__PURE__ */ new Date()).toISOString()
      };
      await db.collection("transactions").doc(transactionId).set(transactionData);
      res.json({ success: true, newPoints });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/tasks", apiFragmentCache(10), async (req, res) => {
    try {
      const snap = await db.collection("tasks").get();
      const tasks = snap.docs.map((doc2) => ({ id: Number(doc2.id), ...doc2.data() }));
      res.json({ tasks, completedTasks: [] });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/users", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const users = await db.collection("users").get();
      res.json(users.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/transactions", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snapshot = await db.collection("transactions").get();
      const usersSnapshot = await db.collection("users").get();
      const usersMap = usersSnapshot.docs.reduce((acc, doc2) => {
        acc[doc2.id] = doc2.data().email || "Unknown";
        return acc;
      }, {});
      const docs = snapshot.docs.map((d) => {
        const data = d.data();
        let displayAmount = data.amount;
        if (data.gateway === "paystack" && data.amount && data.currency === "NGN") {
          displayAmount = data.amount / 100;
        } else if (data.gateway === "stripe" && data.amount) {
          displayAmount = data.amount / 100;
        }
        return {
          id: d.id,
          ...data,
          userEmail: data.userId ? usersMap[data.userId.toString()] : "Unknown",
          amount: displayAmount
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(docs);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/tasks", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("tasks").get();
      res.json(snap.docs.map((doc2) => ({ id: Number(doc2.id), ...doc2.data() })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/tasks", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const id = Date.now();
      const taskData = { ...req.body, id };
      await db.collection("tasks").doc(id.toString()).set(taskData);
      res.json({ success: true, ...taskData });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/tasks/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const taskData = { ...req.body, id: Number(id) };
      await db.collection("tasks").doc(id).set(taskData);
      res.json({ success: true, ...taskData });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/admin/tasks/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      await db.collection("tasks").doc(id).delete();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/cache/stats", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const memory = cacheEngine.getMemoryStats();
      res.json({
        metrics: cacheEngine.metrics,
        memory,
        events: cacheEngine.events,
        ttls: cacheEngine.ttls
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/cache/flush", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { layer } = req.body;
      if (!layer) return res.status(400).json({ error: "Missing layer" });
      cacheEngine.flush(layer);
      res.json({ success: true, message: `Flushed ${layer} cache successfully` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/cache/settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { database, fragment, cdn } = req.body;
      if (database !== void 0) cacheEngine.ttls.database = Number(database);
      if (fragment !== void 0) cacheEngine.ttls.fragment = Number(fragment);
      if (cdn !== void 0) cacheEngine.ttls.cdn = Number(cdn);
      cacheEngine.logEvent("Settings Update", `TTLs updated. DB: ${cacheEngine.ttls.database}s, Fragment: ${cacheEngine.ttls.fragment}s, CDN: ${cacheEngine.ttls.cdn}s`, "general");
      res.json({ success: true, ttls: cacheEngine.ttls });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/cache/warm", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const success = await warmCriticalCaches();
      res.json({ success, message: "Manual cache warming executed" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.use("/api", (req, res) => res.json({ success: true }));
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR === "true" ? false : void 0 },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(__dirname, "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => res.sendFile(import_path.default.join(distPath, "index.html")));
  }
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    warmCriticalCaches().catch((err) => console.error("Startup Cache Warning failed", err));
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
//# sourceMappingURL=test-dist.cjs.map
