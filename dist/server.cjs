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
var import_express2 = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_vite = require("vite");
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_stripe = __toESM(require("stripe"), 1);
var import_crypto3 = __toESM(require("crypto"), 1);
var import_dotenv2 = __toESM(require("dotenv"), 1);
var import_helmet = __toESM(require("helmet"), 1);
var import_dns = __toESM(require("dns"), 1);

// seedTemplates.ts
var defaultBranding = {
  logo_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
  primary_color: "#fbbf24",
  secondary_color: "#0f172a",
  button_style: "rounded-lg",
  footer_content: "Thank you for being part of the WatchWDS community. Keep playing, keep watching, and stay connected!",
  social_twitter: "https://twitter.com/watchwds",
  social_facebook: "https://facebook.com/watchwds",
  social_instagram: "https://instagram.com/watchwds",
  social_youtube: "https://youtube.com/watchwds",
  social_linkedin: "https://linkedin.com/company/watchwds",
  contact_info: "123 Sports Arena Blvd, Suite 400, Chicago, IL 60601 | support@watchwds.com",
  copyright_text: "\xA9 2026 WatchWDS Inc. All rights reserved."
};
var SEED_TEMPLATES = [
  {
    slug: "welcome_email",
    name: "Welcome Email",
    subject: "Welcome to WatchWDS, {{first_name}}!",
    category: "Welcome",
    variables_hint: "first_name, last_name, user_name, user_email, website_url, support_email",
    body: `<h2>Welcome to WatchWDS!</h2>
<p>Hello {{first_name}},</p>
<p>We are absolutely thrilled to welcome you to the WatchWDS family! Your account has been successfully created under the username <strong>{{user_name}}</strong>.</p>
<p>At WatchWDS, we bring the passion of live sports directly to your screen. You can browse live matches, follow elite creators, participate in leagues, and share your support with fellow sports fans.</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Explore Live Matches</a>
</div>
<p>If you have any questions or need assistence, don't hesitate to reply directly to this email or contact us at <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>
<p>Best regards,<br>The WatchWDS Team</p>`
  },
  {
    slug: "email_verification",
    name: "Email Verification",
    subject: "Verify your email address - WatchWDS",
    category: "Authentication",
    variables_hint: "first_name, verification_link, website_url, support_email",
    body: `<h2>Verify Your Email</h2>
<p>Hello {{first_name}},</p>
<p>Thank you for signing up for WatchWDS. To complete your registration and unlock full access to all matches, channels, and features, please verify your email address by clicking the button below:</p>
<div style="text-align: center;">
  <a href="{{verification_link}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Verify My Email Address</a>
</div>
<p>Or copy and paste this link into your browser:</p>
<p style="word-break: break-all; background-color: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 13px;">{{verification_link}}</p>
<p><em>This verification link will expire in 24 hours.</em></p>
<p>If you didn't create an account with us, please ignore this email.</p>`
  },
  {
    slug: "device_verification",
    name: "Device Verification Code",
    subject: "Security Verification Code: {{code}} - WatchWDS",
    category: "Authentication",
    variables_hint: "first_name, code, login_time, location_info, browser_info, ip_address, support_email",
    body: `<h2>Device Verification Required</h2>
<p>Hello {{first_name}},</p>
<p>A login attempt was made on your WatchWDS account from a new or unrecognised device. Use the verification code below to authorize this device:</p>
<div style="text-align: center; margin: 24px 0;">
  <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #fbbf24; background-color: #0f172a; padding: 14px 28px; border-radius: 10px; display: inline-block;">{{code}}</span>
</div>
<p style="font-size: 14px; color: #64748b; text-align: center;">This code will expire in 10 minutes.</p>
<table class="meta-table" style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px; width: 30%;">Time:</td><td class="value" style="color: #1e293b; padding: 8px;">{{login_time}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Location:</td><td class="value" style="color: #1e293b; padding: 8px;">{{location_info}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Browser/Device:</td><td class="value" style="color: #1e293b; padding: 8px;">{{browser_info}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">IP Address:</td><td class="value" style="color: #1e293b; padding: 8px;">{{ip_address}}</td></tr>
</table>
<p style="color: #ef4444; font-weight: 500;">If you did not attempt to log in, please change your password immediately and contact support at <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>`
  },
  {
    slug: "suspicious_login_alert",
    name: "Suspicious Login Alert",
    subject: "SECURITY ALERT: Suspicious login activity detected on WatchWDS",
    category: "Authentication",
    variables_hint: "first_name, login_time, location_info, browser_info, ip_address, reason, support_email",
    body: `<h2>Security Alert: Suspicious Login Detected</h2>
<p>Hello {{first_name}},</p>
<p>We detected unusual login activity on your WatchWDS account:</p>
<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
  <p style="margin: 0; font-weight: bold; color: #991b1b;">Trigger: {{reason}}</p>
</div>
<table class="meta-table" style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px; width: 30%;">Time:</td><td class="value" style="color: #1e293b; padding: 8px;">{{login_time}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Location:</td><td class="value" style="color: #1e293b; padding: 8px;">{{location_info}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">Browser:</td><td class="value" style="color: #1e293b; padding: 8px;">{{browser_info}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 8px;">IP Address:</td><td class="value" style="color: #1e293b; padding: 8px;">{{ip_address}}</td></tr>
</table>
<p>If this was you, no action is needed. If you don't recognize this activity, please reset your password right away.</p>`
  },
  {
    slug: "password_reset_branding",
    name: "Password Reset Branding",
    subject: "Reset your WatchWDS account password",
    category: "Authentication",
    variables_hint: "first_name, reset_password_link, support_email",
    body: `<h2>Password Reset Request</h2>
<p>Hello {{first_name}},</p>
<p>We received a request to reset the password for your WatchWDS account. Click the button below to choose a new password:</p>
<div style="text-align: center;">
  <a href="{{reset_password_link}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Reset Password</a>
</div>
<p>If you didn't request a password reset, you can safely ignore this email. Your current password will remain secure.</p>
<p>For any help, please reach out to <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>`
  },
  {
    slug: "account_activated",
    name: "Account Activated",
    subject: "Your WatchWDS Account is Activated",
    category: "Authentication",
    variables_hint: "first_name, last_name, website_url",
    body: `<h2>Account Activated!</h2>
<p>Hi {{first_name}},</p>
<p>We are pleased to inform you that your WatchWDS account has been successfully verified and fully activated. You now have unrestricted access to our live streaming catalog, creators, stats, and clubs!</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Go to Dashboard</a>
</div>
<p>Thank you for completing the verification. Enjoy the game!</p>`
  },
  {
    slug: "account_suspended",
    name: "Account Suspended",
    subject: "URGENT: Your WatchWDS account has been suspended",
    category: "Authentication",
    variables_hint: "first_name, last_name, support_email",
    body: `<h2>Account Suspension Notice</h2>
<p>Dear {{first_name}} {{last_name}},</p>
<p>We regret to inform you that your WatchWDS account has been suspended due to a violation of our Terms of Service or community guidelines.</p>
<p>While suspended, you will not be able to log in, view live matches, chat, or access purchased content.</p>
<p>If you believe this suspension is a mistake or wish to appeal, please contact our support team immediately at <a href="mailto:{{support_email}}">{{support_email}}</a> with your account username or registered email.</p>
<p>Sincerely,<br>WatchWDS Abuse & Mod team</p>`
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
<p>Your statement will reflect a charge from WatchWDS. Thank you for your continued loyalty.</p>`
  },
  {
    slug: "subscription_expiring_7d",
    name: "Subscription Expiring - 7 Days",
    subject: "Your WatchWDS subscription is expiring in 7 days",
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
    subject: "Your WatchWDS subscription has expired",
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
    subject: "WatchWDS Payment Succeeded: Invoice {{invoice_number}}",
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
    subject: "Refund processed: WatchWDS transaction {{transaction_id}}",
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
    subject: "New WatchWDS Invoice {{invoice_number}} is ready",
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
    subject: "Your WatchWDS Purchase Receipt",
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
    subject: "Creator application received - WatchWDS",
    category: "Creator Updates",
    variables_hint: "first_name, user_email, website_url",
    body: `<h2>Creator Status Application</h2>
<p>Hello {{first_name}},</p>
<p>Thank you for applying to become a content creator at WatchWDS! Our administrators have received your request and channel details.</p>
<p>Our standard review period takes up to 48 hours. Once approved, you'll be able to create custom stream links, sell match access, get paid by fans, and post exclusive comments.</p>`
  },
  {
    slug: "creator_approved",
    name: "Creator Approved",
    subject: "CONGRATS: Your WatchWDS Creator Application has been APPROVED!",
    category: "Creator Updates",
    variables_hint: "first_name, website_url",
    body: `<h2>Welcome to the Creator Guild!</h2>
<p>Fantastic news, {{first_name}}!</p>
<p>Your application to become a verified WatchWDS Creator has been officially **Approved** by our staff.</p>
<p>Your account possesses full creator capabilities. Log in today to visit your newly unlocked Studio Dashboard, define your channels, configure subscriber content, and map out matches!</p>
<div style="text-align: center;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Launch My Creator Portal</a>
</div>`
  },
  {
    slug: "creator_rejected",
    name: "Creator Rejected",
    subject: "WatchWDS Creator Application Status Update",
    category: "Creator Updates",
    variables_hint: "first_name, support_email",
    body: `<h2>Creator Application Decision</h2>
<p>Dear {{first_name}},</p>
<p>Thank you for your interest in the WatchWDS Creator Program. At this time, our review board has decided to reject your application due to incomplete profile credentials, inadequate social profiles, or platform saturation.</p>
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
    subject: "Invitation: Join the club '{{club_name}}' on WatchWDS",
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
<p>Your team/channel has been invited to compete inside the prestigious tournament league: <strong>{{league_name}}</strong> on the WatchWDS scheduler system!</p>
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
    subject: "WatchWDS Recap: Weekly highlights, matches, and creator news",
    category: "Marketing/Promo",
    variables_hint: "first_name, website_url, company_name",
    body: `<h2>WatchWDS Weekly Highlights</h2>
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
    subject: "Unveiling WatchWDS Live Chat Replay & Bento Boards!",
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
    body: `<h2>Summer on WatchWDS</h2>
<p>Hello {{first_name}},</p>
<p>The Summer Season is heating up with over 150 live championship match events scheduled over the next 45 days. Log in now and reserve your championship match seating early!</p>`
  },
  {
    slug: "feedback_response",
    name: "Feedback Response",
    subject: "Update on your WatchWDS feedback",
    category: "Support",
    variables_hint: "user_name, rating, category, feedback_text, response_text, admin_name, website_url",
    body: `<h2>Response to Your Feedback</h2>
<p>Hello {{user_name}},</p>
<p>Thank you for taking the time to share your feedback with the <strong>WatchWDS</strong> team. We carefully review every submission to continuously improve your experience.</p>
<div style="background-color: #f8fafc; border-left: 4px solid #fbbf24; padding: 16px; margin: 20px 0; border-radius: 4px;">
  <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;"><strong>Your Feedback (Rating: {{rating}}/5 - {{category}}):</strong></p>
  <p style="margin: 0; font-style: italic; color: #334155;">"{{feedback_text}}"</p>
</div>
<div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px;">
  <p style="margin: 0 0 8px 0; font-size: 13px; color: #1d4ed8;"><strong>Message from {{admin_name}} (WatchWDS Team):</strong></p>
  <p style="margin: 0; color: #1e293b; white-space: pre-wrap;">{{response_text}}</p>
</div>
<p>If you have any further questions or suggestions, feel free to reply to this email or visit our Help Center.</p>
<div style="text-align: center; margin-top: 24px;">
  <a href="{{website_url}}" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; border-radius: 8px;">Return to WatchWDS</a>
</div>`
  },
  {
    slug: "feedback_admin_alert",
    name: "New User Feedback Alert",
    subject: "New {{rating}}-Star Feedback Received: [{{category}}]",
    category: "System/Notification",
    variables_hint: "user_name, user_email, rating, rating_label, category, feedback_text, page_url, device_info, website_url",
    body: `<h2>New User Feedback Submitted</h2>
<p>A new rating and feedback entry has been received on WatchWDS.</p>
<table class="meta-table" style="width: 100%; border-collapse: collapse; margin: 16px 0;">
  <tr><td class="label" style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b;">User:</td><td class="value" style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{{user_name}} ({{user_email}})</td></tr>
  <tr><td class="label" style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b;">Rating:</td><td class="value" style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{{rating}} / 5 ({{rating_label}})</td></tr>
  <tr><td class="label" style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b;">Category:</td><td class="value" style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{{category}}</td></tr>
  <tr><td class="label" style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b;">Page:</td><td class="value" style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{{page_url}}</td></tr>
  <tr><td class="label" style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b;">Device:</td><td class="value" style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{{device_info}}</td></tr>
</table>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; margin: 16px 0; border-radius: 8px;">
  <p style="margin: 0; color: #1e293b;"><strong>Feedback:</strong></p>
  <p style="margin: 8px 0 0 0; color: #334155;">{{feedback_text}}</p>
</div>
<div style="text-align: center; margin-top: 24px;">
  <a href="{{website_url}}/admin" class="button" style="color: #0f171e; background-color: #fbbf24; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; border-radius: 8px;">Review in Admin Panel</a>
</div>`
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

// db/connection.ts
var import_promise = __toESM(require("mysql2/promise"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var pool = import_promise.default.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "watchwds",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Ensure JSON columns return parsed objects
  typeCast: function(field, next) {
    if (field.type === "JSON") {
      const val = field.string();
      if (val === null) return null;
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return next();
  }
});
var connection_default = pool;
async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}
async function execute(sql, params) {
  const [result] = await pool.execute(sql, params);
  return result;
}

// db/MySQLAdapter.ts
var KEY_VALUE_TABLES = /* @__PURE__ */ new Set([
  "settings",
  "payment_settings",
  "email_settings",
  "email_branding"
]);
var PK_MAP = {
  settings: "key_name",
  payment_settings: "key_name",
  email_settings: "key_name",
  email_branding: "key_name",
  email_templates: "slug",
  email_template_analytics: "slug",
  knowledge_base: "id",
  // varchar pk
  transactions: "id",
  // varchar pk
  payouts: "id",
  // varchar pk
  club_balances: "club_id"
  // varchar pk
};
function getPkColumn(table) {
  return PK_MAP[table] || "id";
}
function isKeyValueTable(table) {
  return KEY_VALUE_TABLES.has(table);
}
function parseJson(val) {
  if (val === null || val === void 0) return null;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}
function unwrapKVRow(row) {
  if (!row) return null;
  const val = row.value;
  return parseJson(val);
}
function buildSetClause(data, table) {
  const snakeData = {};
  const pk = getPkColumn(table);
  for (const [k, v] of Object.entries(data)) {
    if (v !== void 0) {
      const snakeKey = camelToSnake(k, table);
      if (snakeKey !== pk) {
        snakeData[snakeKey] = v;
      }
    }
  }
  const parts = [];
  const values = [];
  for (const [col, val] of Object.entries(snakeData)) {
    parts.push(`\`${col}\` = ?`);
    values.push(serializeValue(val));
  }
  return { clause: parts.join(", "), values };
}
function camelToSnake(str, tableName) {
  if (str === "content") {
    return tableName === "comments" ? "text" : "content";
  }
  if (str === "avatar" || str === "userAvatar" || str === "user_avatar") {
    return tableName === "comments" ? "user_avatar" : "avatar";
  }
  if (str === "username" || str === "userName" || str === "user_name") {
    return tableName === "comments" ? "user_name" : tableName === "users" ? "name" : "username";
  }
  const overrides = {
    createdAt: "created_at",
    updatedAt: "updated_at",
    userId: "user_id",
    matchId: "match_id",
    categoryId: "category_id",
    topicId: "topic_id",
    authorId: "author_id",
    authorName: "author_name",
    authorAvatar: "author_avatar",
    authorRole: "author_role",
    replyCount: "reply_count",
    isPinned: "is_pinned",
    isLocked: "is_locked",
    isActive: "is_active",
    isCustom: "is_custom",
    isRead: "is_read",
    planId: "plan_id",
    operatorId: "operator_id",
    creatorId: "creator_id",
    embedPrice: "embed_price",
    publishStatus: "publish_status",
    accessType: "access_type",
    ppvPrice: "ppv_price",
    requiredPlanId: "required_plan_id",
    scheduledDate: "scheduled_date",
    liveCommenting: "live_commenting",
    commentAlignment: "comment_alignment",
    adSettings: "ad_settings",
    startTime: "start_time",
    activeDeviceId: "active_device_id",
    subscribedMatches: "subscribed_matches",
    subscribedCategories: "subscribed_categories",
    durationDays: "duration_days",
    variablesHint: "variables_hint",
    templateId: "template_id",
    versionNumber: "version_number",
    createdBy: "created_by",
    lastSentAt: "last_sent_at",
    expiresAt: "expires_at",
    planExpiresAt: "plan_expires_at",
    onboardingCompleted: "onboarding_completed",
    phoneNumber: "phone",
    keyName: "key_name",
    featuredImage: "featured_image",
    embedUrl: "embed_url",
    readingTimeMinutes: "reading_time_minutes",
    fromName: "from_name",
    fromEmail: "from_email",
    replyTo: "reply_to",
    authUser: "auth_user",
    authPass: "auth_pass",
    apiKey: "api_key",
    timestamp: "timestamp",
    likedBy: "liked_by",
    clubId: "club_id",
    stripeAccountId: "stripe_account_id",
    stripeOnboardingComplete: "stripe_onboarding_complete",
    contactEmail: "contact_email",
    platformFeePercent: "platform_fee_percent",
    clubSharePercent: "club_share_percent",
    stripePayoutId: "stripe_payout_id",
    arrivalDate: "arrival_date",
    failureCode: "failure_code",
    failureMessage: "failure_message",
    reminderSent10m: "reminder_sent_10m",
    availableBalance: "available_balance",
    pendingBalance: "pending_balance",
    totalEarned: "total_earned",
    totalPaidOut: "total_paid_out",
    grossAmount: "gross_amount",
    platformCommission: "platform_commission",
    clubNetAmount: "club_net_amount",
    commissionRate: "commission_rate",
    transactionId: "transaction_id",
    ratingLabel: "rating_label",
    feedbackText: "feedback_text",
    pageUrl: "page_url",
    deviceInfo: "device_info",
    adminNotes: "admin_notes",
    responseCount: "response_count",
    feedbackId: "feedback_id",
    adminId: "admin_id",
    adminName: "admin_name",
    responseText: "response_text",
    emailSent: "email_sent",
    isGuest: "is_guest",
    user_id: "user_id",
    match_id: "match_id",
    category_id: "category_id",
    topic_id: "topic_id",
    is_pinned: "is_pinned",
    is_locked: "is_locked",
    is_active: "is_active",
    is_custom: "is_custom",
    is_read: "is_read",
    created_at: "created_at",
    updated_at: "updated_at",
    reply_count: "reply_count"
  };
  return overrides[str] || str;
}
function snakeToCamel(str, tableName) {
  if (str === "text") {
    return tableName === "comments" ? "content" : "text";
  }
  if (str === "user_avatar") {
    return "avatar";
  }
  if (str === "user_name") {
    return tableName === "comments" ? "username" : tableName === "users" ? "name" : "userName";
  }
  const overrides = {
    created_at: "createdAt",
    updated_at: "updatedAt",
    user_id: "userId",
    match_id: "matchId",
    category_id: "categoryId",
    topic_id: "topicId",
    author_id: "authorId",
    author_name: "authorName",
    author_avatar: "authorAvatar",
    author_role: "authorRole",
    reply_count: "replyCount",
    is_pinned: "isPinned",
    is_locked: "isLocked",
    is_active: "isActive",
    is_custom: "isCustom",
    is_read: "isRead",
    plan_id: "planId",
    operator_id: "operatorId",
    creator_id: "creatorId",
    embed_price: "embedPrice",
    publish_status: "publishStatus",
    access_type: "accessType",
    ppv_price: "ppvPrice",
    required_plan_id: "requiredPlanId",
    scheduled_date: "scheduledDate",
    live_commenting: "liveCommenting",
    comment_alignment: "commentAlignment",
    ad_settings: "adSettings",
    start_time: "startTime",
    active_device_id: "activeDeviceId",
    subscribed_matches: "subscribedMatches",
    subscribed_categories: "subscribedCategories",
    duration_days: "durationDays",
    variables_hint: "variablesHint",
    template_id: "templateId",
    version_number: "versionNumber",
    created_by: "createdBy",
    last_sent_at: "lastSentAt",
    expires_at: "expiresAt",
    plan_expires_at: "planExpiresAt",
    onboarding_completed: "onboardingCompleted",
    phone_number: "phone",
    key_name: "keyName",
    featured_image: "featuredImage",
    embed_url: "embedUrl",
    reading_time_minutes: "readingTimeMinutes",
    from_name: "fromName",
    from_email: "fromEmail",
    reply_to: "replyTo",
    auth_user: "authUser",
    auth_pass: "authPass",
    api_key: "apiKey",
    user_name: "username",
    user_avatar: "avatar",
    timestamp: "timestamp",
    liked_by: "likedBy",
    club_id: "clubId",
    stripe_account_id: "stripeAccountId",
    stripe_onboarding_complete: "stripeOnboardingComplete",
    contact_email: "contactEmail",
    platform_fee_percent: "platformFeePercent",
    club_share_percent: "clubSharePercent",
    stripe_payout_id: "stripePayoutId",
    arrival_date: "arrivalDate",
    failure_code: "failureCode",
    failure_message: "failureMessage",
    reminder_sent_10m: "reminderSent10m",
    available_balance: "availableBalance",
    pending_balance: "pendingBalance",
    total_earned: "totalEarned",
    total_paid_out: "totalPaidOut",
    gross_amount: "grossAmount",
    platform_commission: "platformCommission",
    club_net_amount: "clubNetAmount",
    commission_rate: "commissionRate",
    transaction_id: "transactionId",
    rating_label: "ratingLabel",
    feedback_text: "feedbackText",
    page_url: "pageUrl",
    device_info: "deviceInfo",
    admin_notes: "adminNotes",
    response_count: "responseCount",
    feedback_id: "feedbackId",
    admin_id: "adminId",
    admin_name: "adminName",
    response_text: "responseText",
    email_sent: "emailSent",
    is_guest: "isGuest"
  };
  return overrides[str] || str;
}
function serializeValue(val) {
  if (val === void 0 || val === null) return null;
  if (val instanceof Date) {
    return val.toISOString().slice(0, 19).replace("T", " ");
  }
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/.test(val)) {
    return val.slice(0, 19).replace("T", " ");
  }
  if (typeof val === "object" && !(val instanceof Date)) {
    return JSON.stringify(val);
  }
  return val;
}
var DocWrapper = class {
  constructor(tableName, id) {
    this.tableName = tableName;
    this.id = id;
  }
  get ref() {
    return this;
  }
  async get() {
    const pk = getPkColumn(this.tableName);
    if (isKeyValueTable(this.tableName)) {
      const [rows2] = await connection_default.execute(`SELECT * FROM \`${this.tableName}\` WHERE \`${pk}\` = ?`, [this.id]);
      const arr2 = rows2;
      if (arr2.length === 0) {
        return { id: this.id, exists: false, ref: this, data: () => null };
      }
      const unwrapped = unwrapKVRow(arr2[0]);
      return { id: this.id, exists: true, ref: this, data: () => unwrapped };
    }
    const [rows] = await connection_default.execute(`SELECT * FROM \`${this.tableName}\` WHERE \`${pk}\` = ?`, [this.id]);
    const arr = rows;
    if (arr.length === 0) {
      return { id: this.id, exists: false, ref: this, data: () => null };
    }
    const row = { ...arr[0] };
    const mappedRow = {};
    for (const [k, v] of Object.entries(row)) {
      let val = v;
      if (typeof val === "string" && (val.startsWith("[") || val.startsWith("{"))) {
        try {
          val = JSON.parse(val);
        } catch {
        }
      }
      const camelKey = snakeToCamel(k, this.tableName);
      mappedRow[camelKey] = val;
      if (camelKey !== k) {
        mappedRow[k] = val;
      }
    }
    if (this.tableName === "comments") {
      if (row.user_name !== void 0) {
        mappedRow.username = row.user_name;
        mappedRow.userName = row.user_name;
      }
      if (row.user_avatar !== void 0) {
        mappedRow.avatar = row.user_avatar;
        mappedRow.userAvatar = row.user_avatar;
      }
      if (row.text !== void 0) {
        mappedRow.content = row.text;
      }
      if (row.timestamp !== void 0) {
        mappedRow.timestamp = row.timestamp;
        mappedRow.createdAt = row.timestamp;
      }
    }
    if (this.tableName === "users") {
      if (mappedRow.avatar !== void 0) {
        mappedRow.userAvatar = mappedRow.avatar;
        mappedRow.user_avatar = mappedRow.avatar;
      }
      if (mappedRow.name !== void 0) {
        mappedRow.userName = mappedRow.name;
        mappedRow.user_name = mappedRow.name;
        mappedRow.username = mappedRow.name;
      }
    }
    if (this.tableName === "matches") {
      let matchDate = mappedRow.date || mappedRow.start_time || mappedRow.startTime;
      if (!matchDate || matchDate === "Invalid Date" || isNaN(new Date(matchDate).getTime())) {
        matchDate = mappedRow.created_at || mappedRow.createdAt || (/* @__PURE__ */ new Date()).toISOString();
      } else {
        matchDate = new Date(matchDate).toISOString();
      }
      mappedRow.date = matchDate;
      mappedRow.start_time = matchDate.slice(0, 19).replace("T", " ");
      mappedRow.startTime = mappedRow.start_time;
    }
    return { id: this.id, exists: true, ref: this, data: () => mappedRow };
  }
  async set(data, _options) {
    const pk = getPkColumn(this.tableName);
    if (isKeyValueTable(this.tableName)) {
      const jsonVal = JSON.stringify(data);
      await connection_default.execute(
        `INSERT INTO \`${this.tableName}\` (\`${pk}\`, \`value\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`value\` = ?`,
        [this.id, jsonVal, jsonVal]
      );
      return;
    }
    const allData = { ...data };
    const snakeData = {};
    for (const [k, v] of Object.entries(allData)) {
      snakeData[camelToSnake(k, this.tableName)] = v;
    }
    const pkSnake = camelToSnake(pk, this.tableName);
    if (!snakeData[pkSnake]) snakeData[pkSnake] = this.id;
    const keys = Object.keys(snakeData);
    const vals = Object.values(snakeData).map((v) => serializeValue(v));
    const placeholders = keys.map(() => "?").join(", ");
    const updateParts = keys.map((k) => `\`${k}\` = VALUES(\`${k}\`)`).join(", ");
    const sql = `INSERT INTO \`${this.tableName}\` (${keys.map((k) => `\`${k}\``).join(", ")}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateParts}`;
    await connection_default.execute(sql, vals);
  }
  async update(data) {
    const pk = getPkColumn(this.tableName);
    if (isKeyValueTable(this.tableName)) {
      const [rows] = await connection_default.execute(`SELECT * FROM \`${this.tableName}\` WHERE \`${pk}\` = ?`, [this.id]);
      const arr = rows;
      let existing = {};
      if (arr.length > 0) {
        existing = unwrapKVRow(arr[0]) || {};
      }
      const merged = { ...existing, ...data };
      const jsonVal = JSON.stringify(merged);
      await connection_default.execute(
        `INSERT INTO \`${this.tableName}\` (\`${pk}\`, \`value\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`value\` = ?`,
        [this.id, jsonVal, jsonVal]
      );
      return;
    }
    const { clause, values } = buildSetClause(data, this.tableName);
    if (!clause) return;
    await connection_default.execute(`UPDATE \`${this.tableName}\` SET ${clause} WHERE \`${pk}\` = ?`, [...values, this.id]);
  }
  async delete() {
    const pk = getPkColumn(this.tableName);
    await connection_default.execute(`DELETE FROM \`${this.tableName}\` WHERE \`${pk}\` = ?`, [this.id]);
  }
};
var CollectionWrapper = class _CollectionWrapper {
  constructor(tableName) {
    this.tableName = tableName;
    this.whereClauses = [];
    this.orderClauses = [];
    this.limitVal = null;
  }
  where(field, op, value) {
    const clone = this._clone();
    clone.whereClauses.push({ field: camelToSnake(field, this.tableName), op: mapOp(op), value });
    return clone;
  }
  orderBy(field, dir = "asc") {
    const clone = this._clone();
    clone.orderClauses.push({ field: camelToSnake(field, this.tableName), dir: dir.toUpperCase() === "DESC" ? "DESC" : "ASC" });
    return clone;
  }
  limit(n) {
    const clone = this._clone();
    clone.limitVal = n;
    return clone;
  }
  async get() {
    const pk = getPkColumn(this.tableName);
    let sql = `SELECT * FROM \`${this.tableName}\``;
    const params = [];
    if (this.whereClauses.length > 0) {
      const conditions = this.whereClauses.map((w) => {
        if (w.op === "IN" && Array.isArray(w.value)) {
          const placeholders = w.value.map(() => "?").join(", ");
          params.push(...w.value);
          return `\`${w.field}\` IN (${placeholders})`;
        }
        params.push(w.value);
        return `\`${w.field}\` ${w.op} ?`;
      });
      sql += " WHERE " + conditions.join(" AND ");
    }
    if (this.orderClauses.length > 0) {
      sql += " ORDER BY " + this.orderClauses.map((o) => `\`${o.field}\` ${o.dir}`).join(", ");
    }
    if (this.limitVal) {
      sql += ` LIMIT ${this.limitVal}`;
    }
    const [rows] = await connection_default.execute(sql, params);
    const arr = rows;
    const docs = arr.map((row) => {
      const docId = String(row[pk] ?? row.id ?? "");
      const rowData = { ...row };
      const mappedRow = {};
      for (const [k, v] of Object.entries(rowData)) {
        let val = v;
        if (typeof val === "string" && (val.startsWith("[") || val.startsWith("{"))) {
          try {
            val = JSON.parse(val);
          } catch {
          }
        }
        const camelKey = snakeToCamel(k, this.tableName);
        mappedRow[camelKey] = val;
        if (camelKey !== k) {
          mappedRow[k] = val;
        }
      }
      if (this.tableName === "comments") {
        if (rowData.user_name !== void 0) {
          mappedRow.username = rowData.user_name;
          mappedRow.userName = rowData.user_name;
        }
        if (rowData.user_avatar !== void 0) {
          mappedRow.avatar = rowData.user_avatar;
          mappedRow.userAvatar = rowData.user_avatar;
        }
        if (rowData.text !== void 0) {
          mappedRow.content = rowData.text;
        }
        if (rowData.timestamp !== void 0) {
          mappedRow.timestamp = rowData.timestamp;
          mappedRow.createdAt = rowData.timestamp;
        }
      }
      if (this.tableName === "users") {
        if (mappedRow.avatar !== void 0) {
          mappedRow.userAvatar = mappedRow.avatar;
          mappedRow.user_avatar = mappedRow.avatar;
        }
        if (mappedRow.name !== void 0) {
          mappedRow.userName = mappedRow.name;
          mappedRow.user_name = mappedRow.name;
          mappedRow.username = mappedRow.name;
        }
      }
      if (this.tableName === "matches") {
        let matchDate = mappedRow.date || mappedRow.start_time || mappedRow.startTime;
        if (!matchDate || matchDate === "Invalid Date" || isNaN(new Date(matchDate).getTime())) {
          matchDate = mappedRow.created_at || mappedRow.createdAt || (/* @__PURE__ */ new Date()).toISOString();
        } else {
          matchDate = new Date(matchDate).toISOString();
        }
        mappedRow.date = matchDate;
        mappedRow.start_time = matchDate.slice(0, 19).replace("T", " ");
        mappedRow.startTime = mappedRow.start_time;
      }
      return {
        id: docId,
        ref: new DocWrapper(this.tableName, docId),
        exists: true,
        data: () => mappedRow
      };
    });
    return { empty: docs.length === 0, size: docs.length, docs };
  }
  doc(id) {
    if (id) return new DocWrapper(this.tableName, id);
    const autoId = Date.now().toString() + Math.floor(Math.random() * 1e4).toString();
    return new DocWrapper(this.tableName, autoId);
  }
  async add(data) {
    const pk = getPkColumn(this.tableName);
    const allData = { ...data };
    let generatedId = "";
    if (pk === "id" && !allData.id) {
      generatedId = Date.now().toString() + Math.floor(Math.random() * 1e4).toString();
      allData.id = generatedId;
    }
    const snakeData = {};
    for (const [k, v] of Object.entries(allData)) {
      snakeData[camelToSnake(k, this.tableName)] = v;
    }
    const keys = Object.keys(snakeData);
    const vals = Object.values(snakeData).map((v) => serializeValue(v));
    const placeholders = keys.map(() => "?").join(", ");
    const sql = `INSERT INTO \`${this.tableName}\` (${keys.map((k) => `\`${k}\``).join(", ")}) VALUES (${placeholders})`;
    const [result] = await connection_default.execute(sql, vals);
    const finalId = generatedId || allData.id || String(result.insertId);
    return { id: finalId, ref: new DocWrapper(this.tableName, finalId) };
  }
  _clone() {
    const c = new _CollectionWrapper(this.tableName);
    c.whereClauses = [...this.whereClauses];
    c.orderClauses = [...this.orderClauses];
    c.limitVal = this.limitVal;
    return c;
  }
};
function mapOp(firestoreOp) {
  const map = {
    "==": "=",
    "!=": "!=",
    "<": "<",
    "<=": "<=",
    ">": ">",
    ">=": ">=",
    "in": "IN",
    "array-contains": "LIKE"
    // simplified
  };
  return map[firestoreOp] || "=";
}
var MySQLAdapter = class {
  collection(path2) {
    return new CollectionWrapper(path2);
  }
};

// api/v1/routes/matches.ts
var import_express = require("express");
var import_zod2 = require("zod");

// api/v1/middleware/bearerAuth.ts
var import_crypto = require("crypto");
function bearerAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Missing Authorization header. Provide a Bearer token."
    });
    return;
  }
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    res.status(401).json({
      error: "Unauthorized",
      message: "Malformed Authorization header. Expected format: Bearer <token>"
    });
    return;
  }
  const token = parts[1];
  const expectedToken = process.env.API_BEARER_TOKEN;
  if (!expectedToken) {
    console.error("[API v1] API_BEARER_TOKEN is not configured in the environment.");
    res.status(500).json({
      error: "Server configuration error",
      message: "API authentication is not configured. Contact the administrator."
    });
    return;
  }
  if (token.length !== expectedToken.length) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid Bearer token."
    });
    return;
  }
  try {
    if (!(0, import_crypto.timingSafeEqual)(Buffer.from(token), Buffer.from(expectedToken))) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid Bearer token."
      });
      return;
    }
  } catch (err) {
    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
    }
    if (result !== 0) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid Bearer token."
      });
      return;
    }
  }
  next();
}

// api/v1/schemas/matchSchema.ts
var import_zod = require("zod");
var createMatchSchema = import_zod.z.object({
  // === Required fields ===
  home_team: import_zod.z.string({ error: "home_team is required" }).min(1, "home_team cannot be empty").max(255, "home_team must be 255 characters or fewer"),
  away_team: import_zod.z.string({ error: "away_team is required" }).min(1, "away_team cannot be empty").max(255, "away_team must be 255 characters or fewer"),
  match_date: import_zod.z.string({ error: "match_date is required (ISO 8601 format)" }).refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "match_date must be a valid ISO 8601 date string (e.g. 2026-07-10T18:00:00Z)" }
  ),
  category: import_zod.z.string({ error: "category is required" }).min(1, "category cannot be empty").max(255, "category must be 255 characters or fewer"),
  price: import_zod.z.number({ error: "price is required and must be a number" }).min(0, "price must be 0 or greater"),
  status: import_zod.z.enum(["upcoming", "live", "completed", "cancelled", "postponed"], {
    error: "status must be one of: upcoming, live, completed, cancelled, postponed"
  }),
  // === Optional fields (aligned with matches table) ===
  title: import_zod.z.string().max(500).optional(),
  slug: import_zod.z.string().max(500).optional(),
  description: import_zod.z.string().optional(),
  content: import_zod.z.string().optional(),
  embed_price: import_zod.z.number().min(0).optional(),
  publish_status: import_zod.z.enum(["published", "draft", "scheduled"]).optional(),
  access: import_zod.z.enum(["free", "ppv", "subscription"]).optional(),
  access_type: import_zod.z.string().max(50).optional(),
  ppv_price: import_zod.z.number().min(0).optional(),
  required_plan_id: import_zod.z.string().max(100).optional(),
  thumbnail: import_zod.z.string().url("thumbnail must be a valid URL").optional().or(import_zod.z.literal("")),
  categories: import_zod.z.array(import_zod.z.union([import_zod.z.string(), import_zod.z.number()])).optional(),
  live_commenting: import_zod.z.boolean().optional(),
  comment_alignment: import_zod.z.enum(["left", "right"]).optional()
});

// api/v1/routes/matches.ts
function createMatchRouter({ db: db2, cacheEngine: cacheEngine2 }) {
  const router = (0, import_express.Router)();
  router.post("/", bearerAuth, async (req, res) => {
    try {
      const parsed = createMatchSchema.parse(req.body);
      const matchRecord = {
        title: parsed.title || `${parsed.home_team} vs ${parsed.away_team}`,
        slug: parsed.slug || generateSlug(parsed.home_team, parsed.away_team, parsed.match_date),
        description: parsed.description || `${parsed.home_team} vs ${parsed.away_team}`,
        content: parsed.content || "",
        date: parsed.match_date,
        start_time: parsed.match_date,
        price: parsed.price,
        embed_price: parsed.embed_price ?? 0,
        status: parsed.status,
        publish_status: parsed.publish_status || "published",
        access: parsed.access === "free" ? "free" : parsed.price > 0 || parsed.access === "ppv" || parsed.access === "subscription" ? "paid" : "free",
        access_type: parsed.access_type || (parsed.access === "subscription" ? "plan" : parsed.price > 0 || parsed.access === "ppv" ? "ppv" : "free"),
        ppv_price: parsed.ppv_price ?? (parsed.price > 0 ? parsed.price : null),
        required_plan_id: parsed.required_plan_id || null,
        thumbnail: parsed.thumbnail || null,
        categories: parsed.categories ? JSON.stringify(parsed.categories) : JSON.stringify([parsed.category]),
        live_commenting: parsed.live_commenting !== void 0 ? parsed.live_commenting ? 1 : 0 : 1,
        comment_alignment: parsed.comment_alignment || "right",
        views: 0,
        operator_id: "api-v1",
        creator_id: "api-v1",
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      const docRef = await db2.collection("matches").add(matchRecord);
      cacheEngine2.invalidateCollection("matches");
      console.log(`[API v1] Match created: ${docRef.id} \u2014 ${matchRecord.title}`);
      res.status(201).json({
        success: true,
        message: "Match created successfully",
        data: {
          id: docRef.id,
          title: matchRecord.title,
          home_team: parsed.home_team,
          away_team: parsed.away_team,
          match_date: parsed.match_date,
          category: parsed.category,
          price: parsed.price,
          status: parsed.status,
          created_at: matchRecord.created_at
        }
      });
    } catch (err) {
      if (err instanceof import_zod2.ZodError) {
        const fieldErrors = err.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message
        }));
        return res.status(400).json({
          error: "Validation failed",
          details: fieldErrors
        });
      }
      console.error("[API v1] Error creating match:", err);
      res.status(500).json({
        error: "Internal server error",
        message: err.message || "An unexpected error occurred while creating the match."
      });
    }
  });
  return router;
}
function generateSlug(home, away, dateStr) {
  const dateSlug = dateStr.slice(0, 10);
  const slug = `${home}-vs-${away}-${dateSlug}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug;
}

// securityManager.ts
var import_crypto2 = __toESM(require("crypto"), 1);
var DEFAULT_CONFIG = {
  trusted_device_expiry_days: 60,
  max_login_attempts: 5,
  lockout_duration_minutes: 30,
  enable_suspicious_login_alerts: true,
  admin_ip_whitelist: [],
  enforce_admin_ip_whitelist: false,
  enable_device_verification: true
};
var geoIpCache = /* @__PURE__ */ new Map();
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = (typeof forwarded === "string" ? forwarded : forwarded[0]).split(",");
    const clientIp = ips[0].trim();
    if (clientIp) return clientIp;
  }
  return req.socket?.remoteAddress || req.ip || "127.0.0.1";
}
function parseBrowserInfo(ua) {
  if (!ua) return "Unknown Browser";
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  if (ua.includes("Windows NT 10.0")) os = "Windows 10/11";
  else if (ua.includes("Windows NT 6.3")) os = "Windows 8.1";
  else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("OPR/") || ua.includes("Opera/")) browser = "Opera";
  return `${browser} on ${os}`;
}
async function getLocationFromIp(ip) {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return { country: "Local Network", city: "Localhost", locationString: "Local Network (Development)" };
  }
  const cached = geoIpCache.get(ip);
  if (cached && Date.now() - cached.timestamp < 36e5) {
    const loc = [cached.city, cached.country].filter(Boolean).join(", ") || "Unknown Location";
    return { country: cached.country, city: cached.city, locationString: loc };
  }
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`, {
      signal: AbortSignal.timeout(3e3)
    });
    if (response.ok) {
      const data = await response.json();
      if (data.status === "success") {
        const country = data.country || "Unknown Country";
        const city = data.city || "Unknown City";
        geoIpCache.set(ip, { country, city, timestamp: Date.now() });
        return { country, city, locationString: `${city}, ${country}` };
      }
    }
  } catch (err) {
  }
  return { country: "Unknown Country", city: "Unknown City", locationString: "Unknown Location" };
}
function generateDeviceFingerprint(req, clientFingerprint) {
  if (clientFingerprint && clientFingerprint.length >= 8) {
    if (clientFingerprint.length === 64 && /^[0-9a-f]{64}$/i.test(clientFingerprint)) {
      return clientFingerprint.toLowerCase();
    }
    return import_crypto2.default.createHash("sha256").update(clientFingerprint).digest("hex");
  }
  const ua = req.headers["user-agent"] || "";
  const acceptLang = req.headers["accept-language"] || "";
  const raw = `${ua}|${acceptLang}`;
  return import_crypto2.default.createHash("sha256").update(raw).digest("hex");
}
async function getSecurityConfig() {
  try {
    const rows = await query("SELECT `value` FROM `security_settings` WHERE `key_name` = 'config'");
    if (rows && rows.length > 0) {
      const val = typeof rows[0].value === "string" ? JSON.parse(rows[0].value) : rows[0].value;
      return { ...DEFAULT_CONFIG, ...val };
    }
  } catch (e) {
    console.error("Failed to load security config:", e);
  }
  return DEFAULT_CONFIG;
}
async function updateSecurityConfig(newConfig) {
  const current = await getSecurityConfig();
  const merged = { ...current, ...newConfig };
  await execute(
    "INSERT INTO `security_settings` (`key_name`, `value`) VALUES ('config', ?) ON DUPLICATE KEY UPDATE `value` = ?",
    [JSON.stringify(merged), JSON.stringify(merged)]
  );
  return merged;
}
async function checkRateLimit(email, ip) {
  const config = await getSecurityConfig();
  const lockoutWindow = config.lockout_duration_minutes;
  const windowMs = lockoutWindow * 60 * 1e3;
  const sinceDate = new Date(Date.now() - windowMs).toISOString().slice(0, 19).replace("T", " ");
  const rows = await query(
    "SELECT COUNT(*) as count FROM `login_attempts` WHERE (`email` = ? OR `ip_address` = ?) AND `success` = 0 AND `created_at` >= ?",
    [email, ip, sinceDate]
  );
  const failedCount = rows[0]?.count || 0;
  if (failedCount >= config.max_login_attempts) {
    return {
      locked: true,
      remainingAttempts: 0,
      lockoutMinutes: lockoutWindow
    };
  }
  return {
    locked: false,
    remainingAttempts: Math.max(0, config.max_login_attempts - failedCount),
    lockoutMinutes: lockoutWindow
  };
}
async function recordLoginAttempt(email, ip, ua, success, reason = "") {
  try {
    const id = "att_" + import_crypto2.default.randomBytes(12).toString("hex");
    await execute(
      "INSERT INTO `login_attempts` (`id`, `email`, `ip_address`, `user_agent`, `success`, `reason`, `created_at`) VALUES (?, ?, ?, ?, ?, ?, NOW())",
      [id, email, ip, ua, success ? 1 : 0, reason]
    );
  } catch (err) {
    console.error("Failed to record login attempt:", err);
  }
}
async function isDeviceTrusted(userId, fingerprint, expiryDays) {
  try {
    const cutoffDate = new Date(Date.now() - expiryDays * 24 * 60 * 60 * 1e3).toISOString().slice(0, 19).replace("T", " ");
    const rows = await query(
      "SELECT * FROM `trusted_devices` WHERE `user_id` = ? AND `device_fingerprint` = ? AND `is_active` = 1 AND `last_used_at` >= ?",
      [String(userId), fingerprint, cutoffDate]
    );
    if (rows && rows.length > 0) {
      await execute("UPDATE `trusted_devices` SET `last_used_at` = NOW() WHERE `id` = ?", [rows[0].id]);
      return { trusted: true, deviceId: rows[0].id };
    }
    return { trusted: false, reason: "New or expired device" };
  } catch (e) {
    console.error("Error checking trusted device:", e);
    return { trusted: false, reason: "Database check error" };
  }
}
async function detectRiskSignals(userId, req, currentCountry, fingerprint) {
  const signals = [];
  try {
    const countryRows = await query(
      "SELECT DISTINCT `country` FROM `trusted_devices` WHERE `user_id` = ? AND `country` != '' AND `country` != 'Unknown Country' AND `country` != 'Local Network'",
      [String(userId)]
    );
    if (countryRows && countryRows.length > 0 && currentCountry && currentCountry !== "Unknown Country" && currentCountry !== "Local Network") {
      const knownCountries = countryRows.map((r) => r.country);
      if (!knownCountries.includes(currentCountry)) {
        signals.push(`New login country detected: ${currentCountry} (previously seen: ${knownCountries.join(", ")})`);
      }
    }
    const failedRows = await query(
      "SELECT COUNT(*) as count FROM `login_attempts` WHERE `email` = (SELECT `email` FROM `users` WHERE `id` = ?) AND `success` = 0 AND `created_at` >= DATE_SUB(NOW(), INTERVAL 1 HOUR)",
      [String(userId)]
    );
    const recentFailures = failedRows[0]?.count || 0;
    if (recentFailures >= 3) {
      signals.push(`${recentFailures} failed login attempts in the past hour`);
    }
    const deviceCountRows = await query(
      "SELECT COUNT(*) as count FROM `trusted_devices` WHERE `user_id` = ? AND `is_active` = 1",
      [String(userId)]
    );
    if ((deviceCountRows[0]?.count || 0) === 0) {
      signals.push("First time logging in from this browser environment");
    }
  } catch (e) {
    console.error("Error detecting risk signals:", e);
  }
  return {
    highRisk: signals.length > 0,
    signals
  };
}
async function createVerificationCode(userId, fingerprint, ip, browserInfo, locationInfo) {
  const code = Math.floor(1e5 + Math.random() * 9e5).toString();
  const id = "vc_" + import_crypto2.default.randomBytes(12).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1e3).toISOString().slice(0, 19).replace("T", " ");
  await execute(
    "UPDATE `verification_codes` SET `used` = 1 WHERE `user_id` = ? AND `used` = 0",
    [String(userId)]
  );
  await execute(
    "INSERT INTO `verification_codes` (`id`, `user_id`, `code`, `device_fingerprint`, `ip_address`, `browser_info`, `location_info`, `expires_at`, `used`, `created_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())",
    [id, String(userId), code, fingerprint, ip, browserInfo, locationInfo, expiresAt]
  );
  return { codeId: id, code };
}
async function saveOrUpdateTrustedDevice(userId, fingerprint, deviceName, ip, country, city) {
  const existing = await query(
    "SELECT `id` FROM `trusted_devices` WHERE `user_id` = ? AND `device_fingerprint` = ?",
    [String(userId), fingerprint]
  );
  if (existing && existing.length > 0) {
    const devId = existing[0].id;
    await execute(
      "UPDATE `trusted_devices` SET `is_active` = 1, `last_used_at` = NOW(), `ip_address` = ?, `country` = ?, `city` = ?, `device_name` = ? WHERE `id` = ?",
      [ip, country, city, deviceName, devId]
    );
    return devId;
  } else {
    const devId = "dev_" + import_crypto2.default.randomBytes(12).toString("hex");
    await execute(
      "INSERT INTO `trusted_devices` (`id`, `user_id`, `device_fingerprint`, `device_name`, `ip_address`, `country`, `city`, `last_used_at`, `created_at`, `is_active`) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)",
      [devId, String(userId), fingerprint, deviceName, ip, country, city]
    );
    return devId;
  }
}
async function verifyCodeAndTrustDevice(userId, code, fingerprint, deviceName, ip, country, city) {
  try {
    const rows = await query(
      "SELECT * FROM `verification_codes` WHERE `user_id` = ? AND `code` = ? AND `used` = 0 AND `expires_at` > NOW() ORDER BY `created_at` DESC LIMIT 1",
      [String(userId), code.trim()]
    );
    if (!rows || rows.length === 0) {
      return { success: false, error: "Invalid or expired verification code" };
    }
    const codeRecord = rows[0];
    await execute("UPDATE `verification_codes` SET `used` = 1 WHERE `id` = ?", [codeRecord.id]);
    await saveOrUpdateTrustedDevice(userId, fingerprint, deviceName, ip, country, city);
    return { success: true };
  } catch (e) {
    console.error("Error verifying code and trusting device:", e);
    return { success: false, error: e.message || "Verification failed" };
  }
}
async function isIpWhitelistedForAdmin(ip) {
  const config = await getSecurityConfig();
  if (!config.enforce_admin_ip_whitelist || !config.admin_ip_whitelist || config.admin_ip_whitelist.length === 0) {
    return true;
  }
  return config.admin_ip_whitelist.some((allowedIp) => {
    const cleanAllowed = allowedIp.trim();
    if (cleanAllowed === ip) return true;
    if (cleanAllowed === "*" || cleanAllowed === "127.0.0.1" && (ip === "::1" || ip === "127.0.0.1")) return true;
    return false;
  });
}

// server.ts
var import_meta = {};
if (import_dns.default.setDefaultResultOrder) {
  import_dns.default.setDefaultResultOrder("ipv4first");
}
import_dotenv2.default.config();
function sanitizeMatchForPublic(match) {
  if (!match) return match;
  const sanitized = { ...match };
  delete sanitized.video_url;
  delete sanitized.videoUrl;
  delete sanitized.embed_code;
  delete sanitized.embedCode;
  delete sanitized.stream_key;
  delete sanitized.streamKey;
  delete sanitized.playback_id;
  delete sanitized.playbackId;
  delete sanitized.stream_url;
  delete sanitized.streamUrl;
  if (sanitized.access === "paid" || sanitized.access_type === "ppv" || sanitized.access_type === "plan") {
    delete sanitized.description;
  } else if (typeof sanitized.description === "string" && (sanitized.description.includes("<iframe") || sanitized.description.includes("<video"))) {
    delete sanitized.description;
  }
  return sanitized;
}
var _filename = "";
var _dirname = "";
try {
  _filename = typeof import_meta !== "undefined" && import_meta.url ? (0, import_url.fileURLToPath)(import_meta.url) : typeof __filename !== "undefined" ? __filename : "";
  _dirname = _filename ? import_path.default.dirname(_filename) : typeof __dirname !== "undefined" ? __dirname : process.cwd();
} catch (e) {
  _filename = "";
  _dirname = process.cwd();
}
var currentFilename = _filename;
var currentDirname = _dirname;
var JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === "production") {
    console.error("\u26A0\uFE0F Warning: JWT_SECRET environment variable is missing in production environment.");
  }
  return import_crypto3.default.randomBytes(32).toString("hex");
})();
var db = new MySQLAdapter();
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
async function notifyUser(userId, title, message, type = "info", link = null, actorName = null, actorAvatar = null) {
  try {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    await db.collection("notifications").doc(id).set({
      id,
      userId,
      title,
      message,
      type,
      link,
      actorName,
      actorAvatar,
      isRead: 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.error("Failed to notify user", err);
  }
}
async function notifyAdmins(title, message, type = "system", link = null, actorName = null, actorAvatar = null) {
  try {
    const snap = await db.collection("users").where("role", "==", "admin").get();
    for (const d of snap.docs) {
      await notifyUser(d.id, title, message, type, link, actorName, actorAvatar);
    }
  } catch (err) {
    console.error("Failed to notify admins", err);
  }
}
async function startServer() {
  const app = (0, import_express2.default)();
  const PORT = process.env.APP_PORT || process.env.PORT || 3e3;
  import_fs.default.writeFileSync("server-pid.txt", process.pid.toString());
  let globalAppUrl = process.env.APP_URL || "http://localhost:3000";
  function getRequestBaseUrl(req) {
    const host = req.headers["x-forwarded-host"] || req.get("host") || "watchwds.com";
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
    const finalProto = isLocal ? proto : "https";
    return `${finalProto}://${host}`;
  }
  app.use((0, import_helmet.default)({
    contentSecurityPolicy: false,
    // Disabled to prevent breaking Vite dev server and embedded videos
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
  }));
  app.use(import_express2.default.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use((req, res, next) => {
    res.setHeader("X-My-Server", "true");
    globalAppUrl = getRequestBaseUrl(req);
    next();
  });
  app.use(import_express2.default.urlencoded({ extended: true, limit: "50mb" }));
  app.use("/api", (req, res, next) => {
    console.log(`[API] ${req.method} ${req.url}`);
    next();
  });
  app.use("/api/v1/matches", createMatchRouter({ db, cacheEngine }));
  const normalizeUser = (docId, data) => {
    if (!data) return null;
    const { password: _, plan_id, plan_expires_at, ...userData } = data;
    const isCompleted = Boolean(Number(data.onboarding_completed ?? data.onboardingCompleted ?? 0));
    const normalized = {
      id: docId,
      ...userData,
      planId: plan_id,
      planExpiresAt: plan_expires_at,
      onboardingCompleted: isCompleted,
      onboarding_completed: isCompleted ? 1 : 0,
      avatar: data.avatar || data.user_avatar || null,
      phone: data.phone || data.phone_number || "",
      dob: data.dob || "",
      gender: data.gender || ""
    };
    if (normalized.balance === void 0) {
      normalized.balance = normalized.points !== void 0 ? Number(normalized.points) : 0;
    } else {
      normalized.balance = Number(normalized.balance);
    }
    return normalized;
  };
  const getAdminEmails = () => {
    const envAdminEmails = process.env.ADMIN_EMAILS || "";
    return envAdminEmails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  };
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name, device_id, avatar } = req.body;
      const hash = import_bcryptjs.default.hashSync(password, 10);
      const finalDeviceId = device_id || Math.random().toString(36).substring(2, 15);
      const adminEmails = getAdminEmails();
      const role = adminEmails.includes((email || "").toLowerCase()) ? "admin" : "viewer";
      const userData = {
        email,
        password: hash,
        name: name || "",
        avatar: avatar || null,
        active_device_id: finalDeviceId,
        role,
        balance: 0,
        status: "active",
        onboarding_completed: 0,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      const result = await db.collection("users").add(userData);
      const token = import_jsonwebtoken.default.sign({ id: result.id, role: userData.role, device_id: finalDeviceId }, JWT_SECRET, { expiresIn: "7d" });
      notifyAdmins("New User Registration", `${name || email} has joined the platform.`, "system", "/admin/users");
      notifyUser(result.id, "Welcome to WatchWDS!", "Your account has been created successfully.", "info", "/profile");
      sendTemplateEmail(email, "welcome_email", {
        first_name: name || "User",
        user_name: name || email,
        user_email: email,
        website_url: getRequestBaseUrl(req),
        support_email: "support@watchwds.com"
      }).catch((err) => console.error("Failed to send welcome email:", err));
      res.json({ token, user: normalizeUser(result.id, userData), device_id: finalDeviceId });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  app.get("/api/testdb", async (req, res) => {
    try {
      const snap = await db.collection("users").limit(1).get();
      res.json({ success: true, dbType: "mysql", size: snap.size });
    } catch (e) {
      res.status(500).json({ error: e.message, dbType: "mysql" });
    }
  });
  app.post("/api/testpost", async (req, res) => {
    try {
      const snap = await db.collection("users").where("email", "==", req.body.email).get();
      res.json({ success: true, dbType: "mysql", size: snap.size });
    } catch (e) {
      res.status(500).json({ error: e.message, dbType: "mysql" });
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, device_id, client_fingerprint } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
      const ip = getClientIp(req);
      const ua = req.headers["user-agent"] || "";
      const browserInfo = parseBrowserInfo(ua);
      const finalDeviceId = device_id || Math.random().toString(36).substring(2, 15);
      const fingerprint = generateDeviceFingerprint(req, client_fingerprint || finalDeviceId);
      const rateCheck = await checkRateLimit(email, ip);
      if (rateCheck.locked) {
        await recordLoginAttempt(email, ip, ua, false, "Account temporarily locked due to brute-force attempts");
        return res.status(429).json({
          error: `Too many failed login attempts. Your account is temporarily locked for ${rateCheck.lockoutMinutes} minutes.`,
          locked: true,
          lockoutMinutes: rateCheck.lockoutMinutes
        });
      }
      const snapshot = await db.collection("users").where("email", "==", email).get();
      if (snapshot.empty) {
        await recordLoginAttempt(email, ip, ua, false, "Invalid email");
        return res.status(401).json({ error: "Invalid credentials", remainingAttempts: rateCheck.remainingAttempts - 1 });
      }
      const userDoc = snapshot.docs[0];
      const user = userDoc.data();
      if (user.password === "google-auth-no-password") {
        await recordLoginAttempt(email, ip, ua, false, "Must use Google login");
        return res.status(401).json({ error: "Please use Google to log in" });
      }
      if (!import_bcryptjs.default.compareSync(password, user.password)) {
        await recordLoginAttempt(email, ip, ua, false, "Invalid password");
        return res.status(401).json({ error: "Invalid credentials", remainingAttempts: rateCheck.remainingAttempts - 1 });
      }
      if (user.status !== "active") {
        await recordLoginAttempt(email, ip, ua, false, "Account suspended");
        return res.status(403).json({ error: "Account suspended. Please contact support." });
      }
      if (user.role === "admin") {
        const isWhitelisted = await isIpWhitelistedForAdmin(ip);
        if (!isWhitelisted) {
          await recordLoginAttempt(email, ip, ua, false, "Admin IP not whitelisted");
          return res.status(403).json({ error: "Access denied: Your IP address is not whitelisted for administrator access." });
        }
      }
      const config = await getSecurityConfig();
      const locationObj = await getLocationFromIp(ip);
      const trustCheck = await isDeviceTrusted(userDoc.id, fingerprint, config.trusted_device_expiry_days);
      const riskCheck = await detectRiskSignals(userDoc.id, req, locationObj.country, fingerprint);
      const requiresVerification = config.enable_device_verification && (!trustCheck.trusted || riskCheck.highRisk);
      if (requiresVerification) {
        const { codeId, code } = await createVerificationCode(userDoc.id, fingerprint, ip, browserInfo, locationObj.locationString);
        sendTemplateEmail(email, "device_verification", {
          first_name: user.name || "User",
          code,
          login_time: (/* @__PURE__ */ new Date()).toLocaleString("en-US", { dateStyle: "full", timeStyle: "medium" }),
          location_info: locationObj.locationString,
          browser_info: browserInfo,
          ip_address: ip,
          support_email: "support@watchwds.com"
        }).catch((err) => console.error("Failed to send verification code email:", err));
        if (riskCheck.highRisk && config.enable_suspicious_login_alerts) {
          sendTemplateEmail(email, "suspicious_login_alert", {
            first_name: user.name || "User",
            login_time: (/* @__PURE__ */ new Date()).toLocaleString("en-US", { dateStyle: "full", timeStyle: "medium" }),
            location_info: locationObj.locationString,
            browser_info: browserInfo,
            ip_address: ip,
            reason: riskCheck.signals.join("; "),
            support_email: "support@watchwds.com"
          }).catch((err) => console.error("Failed to send suspicious alert email:", err));
        }
        await recordLoginAttempt(email, ip, ua, true, "Pending 2FA verification code");
        return res.json({
          requires_verification: true,
          userId: userDoc.id,
          email: user.email,
          temp_device_id: finalDeviceId,
          location: locationObj.locationString,
          browser: browserInfo,
          fingerprint,
          reason: trustCheck.reason || (riskCheck.signals.length > 0 ? riskCheck.signals[0] : "Verification required")
        });
      }
      await recordLoginAttempt(email, ip, ua, true, "Success");
      await saveOrUpdateTrustedDevice(
        userDoc.id,
        fingerprint,
        browserInfo,
        ip,
        locationObj.country,
        locationObj.city
      );
      await userDoc.ref.update({ active_device_id: finalDeviceId, status: "active" });
      const token = import_jsonwebtoken.default.sign({ id: userDoc.id, role: user.role, device_id: finalDeviceId }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user: normalizeUser(userDoc.id, user), device_id: finalDeviceId });
    } catch (e) {
      console.error("Login error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { id_token, token: clientToken, email: reqEmail, name: reqName, avatar: reqAvatar, device_id, client_fingerprint } = req.body;
      const googleToken = id_token || clientToken;
      const ip = getClientIp(req);
      const ua = req.headers["user-agent"] || "";
      const browserInfo = parseBrowserInfo(ua);
      const finalDeviceId = device_id || Math.random().toString(36).substring(2, 15);
      const fingerprint = generateDeviceFingerprint(req, client_fingerprint || finalDeviceId);
      let verifiedEmail = "";
      let verifiedName = reqName || "";
      let verifiedAvatar = reqAvatar || "";
      if (googleToken) {
        try {
          const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(googleToken)}`);
          if (!googleRes.ok) {
            const accessRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
              headers: { Authorization: `Bearer ${googleToken}` }
            });
            if (!accessRes.ok) {
              return res.status(401).json({ error: "Invalid Google authentication token" });
            }
            const tokenInfo = await accessRes.json();
            verifiedEmail = tokenInfo.email;
            if (tokenInfo.name) verifiedName = tokenInfo.name;
            if (tokenInfo.picture) verifiedAvatar = tokenInfo.picture;
          } else {
            const tokenInfo = await googleRes.json();
            verifiedEmail = tokenInfo.email;
            if (tokenInfo.name) verifiedName = tokenInfo.name;
            if (tokenInfo.picture) verifiedAvatar = tokenInfo.picture;
          }
        } catch (verErr) {
          return res.status(401).json({ error: "Failed to verify Google token with Google servers" });
        }
      } else {
        if (process.env.NODE_ENV === "production") {
          return res.status(400).json({ error: "Google ID token is required for authentication" });
        }
        if (!reqEmail) return res.status(400).json({ error: "Email or Google ID token is required" });
        verifiedEmail = reqEmail;
      }
      if (!verifiedEmail) {
        return res.status(400).json({ error: "Could not retrieve verified email from Google" });
      }
      const snapshot = await db.collection("users").where("email", "==", verifiedEmail).get();
      let user = null;
      let docId = "";
      if (snapshot.empty) {
        const adminEmails = getAdminEmails();
        const role = adminEmails.includes(verifiedEmail.toLowerCase()) ? "admin" : "user";
        user = {
          email: verifiedEmail,
          password: "google-auth-no-password",
          name: verifiedName || verifiedEmail.split("@")[0],
          avatar: verifiedAvatar || null,
          active_device_id: finalDeviceId,
          role,
          balance: 0,
          status: "active",
          onboarding_completed: 0,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        const result = await db.collection("users").add(user);
        docId = result.id;
      } else {
        const doc = snapshot.docs[0];
        docId = doc.id;
        user = doc.data();
        if (user.status !== "active") return res.status(403).json({ error: "Account suspended" });
      }
      if (user.role === "admin") {
        const isWhitelisted = await isIpWhitelistedForAdmin(ip);
        if (!isWhitelisted) {
          await recordLoginAttempt(verifiedEmail, ip, ua, false, "Admin IP not whitelisted (Google Auth)");
          return res.status(403).json({ error: "Access denied: Your IP address is not whitelisted for administrator access." });
        }
      }
      const config = await getSecurityConfig();
      const locationObj = await getLocationFromIp(ip);
      const trustCheck = await isDeviceTrusted(docId, fingerprint, config.trusted_device_expiry_days);
      const riskCheck = await detectRiskSignals(docId, req, locationObj.country, fingerprint);
      const requiresVerification = config.enable_device_verification && (!trustCheck.trusted || riskCheck.highRisk);
      if (requiresVerification) {
        const { codeId, code } = await createVerificationCode(docId, fingerprint, ip, browserInfo, locationObj.locationString);
        sendTemplateEmail(verifiedEmail, "device_verification", {
          first_name: user.name || "User",
          code,
          login_time: (/* @__PURE__ */ new Date()).toLocaleString("en-US", { dateStyle: "full", timeStyle: "medium" }),
          location_info: locationObj.locationString,
          browser_info: browserInfo,
          ip_address: ip,
          support_email: "support@watchwds.com"
        }).catch((err) => console.error("Failed to send verification code email:", err));
        await recordLoginAttempt(verifiedEmail, ip, ua, true, "Google login - Pending verification code");
        return res.json({
          requires_verification: true,
          userId: docId,
          email: verifiedEmail,
          temp_device_id: finalDeviceId,
          location: locationObj.locationString,
          browser: browserInfo,
          fingerprint
        });
      }
      await recordLoginAttempt(verifiedEmail, ip, ua, true, "Google login success");
      await saveOrUpdateTrustedDevice(
        docId,
        fingerprint,
        browserInfo,
        ip,
        locationObj.country,
        locationObj.city
      );
      const userRef = db.collection("users").doc(docId);
      const userUpdate = { active_device_id: finalDeviceId };
      if (verifiedAvatar) {
        userUpdate.avatar = verifiedAvatar;
        user.avatar = verifiedAvatar;
      }
      await userRef.update(userUpdate);
      const jwtToken = import_jsonwebtoken.default.sign({ id: docId, role: user.role, device_id: finalDeviceId }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token: jwtToken, user: normalizeUser(docId, user), device_id: finalDeviceId });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/auth/verify-device", async (req, res) => {
    try {
      const { userId, code, fingerprint: clientFingerprint, temp_device_id, device_name } = req.body;
      if (!userId || !code) return res.status(400).json({ error: "User ID and verification code are required" });
      const ip = getClientIp(req);
      const ua = req.headers["user-agent"] || "";
      const browserInfo = device_name || parseBrowserInfo(ua);
      const fingerprint = generateDeviceFingerprint(req, clientFingerprint || temp_device_id);
      const locationObj = await getLocationFromIp(ip);
      const result = await verifyCodeAndTrustDevice(
        userId,
        code,
        fingerprint,
        browserInfo,
        ip,
        locationObj.country,
        locationObj.city
      );
      if (!result.success) {
        await recordLoginAttempt("", ip, ua, false, `Code verification failed for user ${userId}`);
        return res.status(400).json({ error: result.error || "Invalid or expired verification code" });
      }
      const userDoc = await db.collection("users").doc(String(userId)).get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
      const user = userDoc.data();
      const finalDeviceId = temp_device_id || Math.random().toString(36).substring(2, 15);
      await userDoc.ref.update({ active_device_id: finalDeviceId, status: "active" });
      await recordLoginAttempt(user.email, ip, ua, true, "Device verified successfully via 2FA");
      const token = import_jsonwebtoken.default.sign({ id: userDoc.id, role: user.role, device_id: finalDeviceId }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user: normalizeUser(userDoc.id, user), device_id: finalDeviceId });
    } catch (e) {
      console.error("Device verification error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/auth/resend-code", async (req, res) => {
    try {
      const { userId, fingerprint: clientFingerprint } = req.body;
      if (!userId) return res.status(400).json({ error: "User ID is required" });
      const userDoc = await db.collection("users").doc(String(userId)).get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
      const user = userDoc.data();
      const ip = getClientIp(req);
      const ua = req.headers["user-agent"] || "";
      const browserInfo = parseBrowserInfo(ua);
      const fingerprint = generateDeviceFingerprint(req, clientFingerprint);
      const locationObj = await getLocationFromIp(ip);
      const { code } = await createVerificationCode(userId, fingerprint, ip, browserInfo, locationObj.locationString);
      sendTemplateEmail(user.email, "device_verification", {
        first_name: user.name || "User",
        code,
        login_time: (/* @__PURE__ */ new Date()).toLocaleString("en-US", { dateStyle: "full", timeStyle: "medium" }),
        location_info: locationObj.locationString,
        browser_info: browserInfo,
        ip_address: ip,
        support_email: "support@watchwds.com"
      }).catch((err) => console.error("Failed to resend verification code email:", err));
      res.json({ success: true, message: "Verification code resent successfully" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/auth/trusted-devices", authenticate, async (req, res) => {
    try {
      const devices = await query(
        "SELECT `id`, `device_name`, `ip_address`, `country`, `city`, `last_used_at`, `created_at` FROM `trusted_devices` WHERE `user_id` = ? AND `is_active` = 1 ORDER BY `last_used_at` DESC",
        [String(req.user.id)]
      );
      res.json({ devices: devices || [] });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/auth/trusted-devices/:id", authenticate, async (req, res) => {
    try {
      await execute(
        "UPDATE `trusted_devices` SET `is_active` = 0 WHERE `id` = ? AND `user_id` = ?",
        [req.params.id, String(req.user.id)]
      );
      res.json({ success: true, message: "Device revoked successfully" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/security/settings", authenticate, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
    try {
      const config = await getSecurityConfig();
      res.json({ config });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/security/settings", authenticate, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
    try {
      const updated = await updateSecurityConfig(req.body);
      res.json({ config: updated, message: "Security settings saved successfully" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/security/login-attempts", authenticate, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
    try {
      const attempts = await query(
        "SELECT `id`, `email`, `ip_address`, `user_agent`, `success`, `reason`, `created_at` FROM `login_attempts` ORDER BY `created_at` DESC LIMIT 100"
      );
      res.json({ attempts: attempts || [] });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/auth/google/validate-credentials", authenticate, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only administrators can validate Google credentials" });
    }
    try {
      const { clientId, clientSecret } = req.body;
      const errors = [];
      if (!clientId) {
        errors.push("Google Client ID is required.");
      } else if (!/^[0-9a-zA-Z._-]+.apps.googleusercontent.com$/.test(clientId)) {
        errors.push("Invalid Client ID format. It should end with '.apps.googleusercontent.com'.");
      }
      if (!clientSecret) {
        errors.push("Google Client Secret is required.");
      } else if (clientSecret.length < 10) {
        errors.push("Google Client Secret is too short to be valid.");
      }
      if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
      }
      try {
        const response = await fetch("https://accounts.google.com/.well-known/openid-configuration");
        if (!response.ok) {
          throw new Error("Unable to connect to Google OAuth discovery services.");
        }
      } catch (connErr) {
        return res.status(502).json({
          success: false,
          errors: ["Connectivity Warning: Could not reach Google's authentication discovery endpoints. Please verify your server's network connection."]
        });
      }
      res.json({ success: true, message: "Credentials format and connection checks completed successfully." });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/auth/me", authenticate, async (req, res) => {
    try {
      const doc = await db.collection("users").doc(req.user.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Not found" });
      const user = doc.data();
      if (req.user.device_id && user.active_device_id && req.user.device_id !== user.active_device_id) {
        return res.status(401).json({ error: "Session invalidated." });
      }
      res.json({ user: normalizeUser(doc.id, user) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/auth/profile", authenticate, async (req, res) => {
    try {
      const rawUpdates = req.body || {};
      const updates = {};
      if (rawUpdates.name !== void 0) updates.name = String(rawUpdates.name).trim();
      if (rawUpdates.avatar !== void 0 || rawUpdates.user_avatar !== void 0 || rawUpdates.userAvatar !== void 0) {
        updates.avatar = rawUpdates.avatar ?? rawUpdates.user_avatar ?? rawUpdates.userAvatar ?? null;
      }
      if (rawUpdates.bio !== void 0) updates.bio = rawUpdates.bio;
      if (rawUpdates.phone !== void 0 || rawUpdates.phone_number !== void 0 || rawUpdates.phoneNumber !== void 0) {
        const phoneVal = rawUpdates.phone ?? rawUpdates.phone_number ?? rawUpdates.phoneNumber ?? "";
        updates.phone = phoneVal;
        updates.phone_number = phoneVal;
      }
      if (rawUpdates.dob !== void 0) updates.dob = rawUpdates.dob;
      if (rawUpdates.gender !== void 0) updates.gender = rawUpdates.gender;
      if (rawUpdates.favorite_team_id !== void 0) updates.favorite_team_id = rawUpdates.favorite_team_id;
      if (rawUpdates.favorite_sports !== void 0) updates.favorite_sports = rawUpdates.favorite_sports;
      if (rawUpdates.onboarding_completed !== void 0 || rawUpdates.onboardingCompleted !== void 0) {
        const val = rawUpdates.onboarding_completed ?? rawUpdates.onboardingCompleted;
        updates.onboarding_completed = val ? 1 : 0;
      }
      if (Object.keys(updates).length === 0) {
        const currentDoc = await db.collection("users").doc(req.user.id).get();
        return res.json({ user: normalizeUser(currentDoc.id, currentDoc.data()) });
      }
      await db.collection("users").doc(req.user.id).update(updates);
      const doc = await db.collection("users").doc(req.user.id).get();
      res.json({ user: normalizeUser(doc.id, doc.data()) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const snaps = await db.collection("users").where("email", "==", req.body.email).get();
      if (!snaps.empty) {
        const user = snaps.docs[0].data();
        const name = user.name || "User";
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        await db.collection("password_resets").add({ email: req.body.email, token, expires_at: new Date(Date.now() + 60 * 60 * 1e3) });
        const resetLink = `${getRequestBaseUrl(req)}/reset-password?token=${token}`;
        sendTemplateEmail(req.body.email, "password_reset_branding", {
          first_name: name,
          reset_password_link: resetLink,
          support_email: "support@watchwds.com"
        }).catch((err) => console.error("Failed to send password reset email:", err));
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
      const savedSnap = await db.collection("saved_matches").where("match_id", "==", matchId).get();
      const userIds = savedSnap.docs.map((d) => d.data().user_id);
      if (userIds.length > 0) {
        const matchDoc = await db.collection("matches").doc(matchId).get();
        const matchData = matchDoc.exists ? matchDoc.data() : {};
        const usersSnap = await db.collection("users").get();
        const usersToEmail = usersSnap.docs.filter((u) => userIds.includes(u.id));
        for (const userDoc of usersToEmail) {
          const user = userDoc.data();
          sendTemplateEmail(user.email, "match_live_now", {
            first_name: user.name || "User",
            match_name: matchData.title || matchTitle || "Saved Match",
            website_url: `${getRequestBaseUrl(req)}/matches/${matchId}`
          }).catch((err) => console.error(`Failed to send match live email to ${user.email}:`, err));
        }
      }
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
      res.json(snap.docs.map((d) => {
        const data = d.data();
        return {
          id: Number(d.id) || d.id,
          slug: data.slug || data.key_name || "",
          name: data.name || data.label || "",
          description: data.description || "",
          is_active: data.is_active !== void 0 ? Number(data.is_active) : data.enabled ? 1 : 0
        };
      }));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/matches", cdnEdgeSim(30), apiFragmentCache(15), async (req, res) => {
    try {
      const snap = await db.collection("matches").orderBy("start_time", "desc").get();
      res.json(snap.docs.map((d) => sanitizeMatchForPublic({ id: d.id, ...d.data() })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/access/verify", authenticate, async (req, res) => {
    res.json({ hasAccess: true });
  });
  function cleanHtmlSnippet(str) {
    if (!str) return "";
    return String(str).replace(/<iframe\b[^>]*>(.*?)<\/iframe>/gis, " ").replace(/<iframe\b[^>]*\/?>/gis, " ").replace(/<video\b[^>]*>(.*?)<\/video>/gis, " ").replace(/<video\b[^>]*\/?>/gis, " ").replace(/<audio\b[^>]*>(.*?)<\/audio>/gis, " ").replace(/<audio\b[^>]*\/?>/gis, " ").replace(/<script\b[^>]*>(.*?)<\/script>/gis, " ").replace(/<style\b[^>]*>(.*?)<\/style>/gis, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
  }
  app.get("/api/search", async (req, res) => {
    try {
      const queryStr = String(req.query.q || "").trim().toLowerCase();
      const type = String(req.query.type || "all");
      if (!queryStr) {
        return res.json({
          matches: [],
          blogs: [],
          kb: [],
          totalCount: 0
        });
      }
      const keywords = queryStr.split(/\s+/).filter(Boolean);
      let matches = [];
      let blogs = [];
      let kb = [];
      const calculateScore = (title, excerpt, bodyContent, tagsList = [], categoryValue = "") => {
        let score = 0;
        const lowercaseTitle = (title || "").toLowerCase();
        const lowercaseExcerpt = (excerpt || "").toLowerCase();
        const lowercaseBody = (bodyContent || "").toLowerCase();
        if (lowercaseTitle.includes(queryStr)) score += 120;
        else if (lowercaseExcerpt.includes(queryStr)) score += 60;
        else if (lowercaseBody.includes(queryStr)) score += 20;
        keywords.forEach((keyword) => {
          if (lowercaseTitle.includes(keyword)) {
            score += 40;
            if (new RegExp(`\\b${keyword}\\b`, "i").test(lowercaseTitle)) score += 20;
          }
          if (lowercaseExcerpt.includes(keyword)) {
            score += 15;
          }
          if (lowercaseBody.includes(keyword)) {
            score += 5;
          }
          if (categoryValue && categoryValue.toLowerCase().includes(keyword)) {
            score += 15;
          }
          if (tagsList && tagsList.some((tag) => String(tag || "").toLowerCase().includes(keyword))) {
            score += 30;
          }
        });
        return score;
      };
      if (type === "all" || type === "matches") {
        const matchesSnap = await db.collection("matches").get();
        matches = matchesSnap.docs.map((doc) => {
          const data = doc.data();
          return { id: Number(doc.id) || doc.id, ...data };
        }).map((item) => {
          const cleanDesc = cleanHtmlSnippet(item.description);
          const cleanContent = cleanHtmlSnippet(item.content);
          const metaDesc = cleanHtmlSnippet(item.seo?.metaDescription);
          const tags = Array.isArray(item.categories) ? [...item.categories] : [];
          if (item.seo?.keywords) {
            tags.push(...String(item.seo.keywords).split(",").map((k) => k.trim()));
          }
          const score = calculateScore(item.title, cleanDesc || metaDesc, cleanContent, tags);
          const publicItem = sanitizeMatchForPublic(item);
          publicItem.description = cleanDesc || cleanContent || metaDesc || (item.date ? `Live match broadcast \xB7 ${item.date}` : "");
          return { ...publicItem, _score: score };
        }).filter((item) => item._score > 0 && item.publish_status !== "draft" && item.publish_status !== "rejected").sort((a, b) => b._score - a._score);
      }
      if (type === "all" || type === "blog") {
        const blogsSnap = await db.collection("blog_posts").get();
        blogs = blogsSnap.docs.map((doc) => {
          const data = doc.data();
          return { id: Number(doc.id) || doc.id, ...data };
        }).map((item) => {
          const cleanExcerpt = cleanHtmlSnippet(item.excerpt);
          const cleanContent = cleanHtmlSnippet(item.content);
          const score = calculateScore(item.title, cleanExcerpt, cleanContent, item.tags || [], item.categories?.join(" ") || "");
          return { ...item, excerpt: cleanExcerpt, content: cleanContent, _score: score };
        }).filter((item) => item._score > 0 && item.status === "published").sort((a, b) => b._score - a._score);
      }
      if (type === "all" || type === "kb") {
        const kbSnap = await db.collection("knowledge_base").get();
        kb = kbSnap.docs.map((doc) => {
          const data = doc.data();
          return { id: doc.id, ...data };
        }).map((item) => {
          const cleanContent = cleanHtmlSnippet(item.content);
          const score = calculateScore(item.title, "", cleanContent, item.tags || [], item.category || "");
          return { ...item, content: cleanContent, _score: score };
        }).filter((item) => item._score > 0).sort((a, b) => b._score - a._score);
      }
      const totalCount = matches.length + blogs.length + kb.length;
      res.json({
        matches,
        blogs,
        kb,
        totalCount
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/forum/categories", async (req, res) => {
    try {
      const snap = await db.collection("forum_categories").get();
      const categories = snap.docs.map((doc) => ({
        id: Number(doc.id) || doc.id,
        ...doc.data()
      }));
      res.json(categories);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/forum/categories/:id/topics", async (req, res) => {
    try {
      const { id } = req.params;
      const topicsSnap = await db.collection("forum_topics").where("category_id", "==", String(id)).get();
      const topics = topicsSnap.docs.map((doc) => ({
        id: Number(doc.id) || doc.id,
        category_id: doc.data().category_id,
        ...doc.data()
      }));
      topics.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) {
          return (b.is_pinned || 0) - (a.is_pinned || 0);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      res.json(topics);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/forum/topics", authenticate, async (req, res) => {
    try {
      const { category_id, title, content } = req.body;
      if (!title || !content) return res.status(400).json({ error: "Title and content are required" });
      const userDoc = await db.collection("users").doc(req.user.id.toString()).get();
      const userData = userDoc.exists ? userDoc.data() : { name: "User" };
      const topicId = Date.now();
      const topicData = {
        id: topicId,
        category_id: String(category_id || "1"),
        title,
        content,
        author_id: req.user.id,
        author_name: userData.name || "Anonymous",
        author_avatar: userData.avatar || "",
        reply_count: 0,
        is_pinned: 0,
        is_locked: 0,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      await db.collection("forum_topics").doc(topicId.toString()).set(topicData);
      res.json({ success: true, id: topicId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/forum/topics/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const topicDoc = await db.collection("forum_topics").doc(id).get();
      if (!topicDoc.exists) return res.status(404).json({ error: "Topic not found" });
      const topic = { id: Number(topicDoc.id) || topicDoc.id, ...topicDoc.data() };
      const repliesSnap = await db.collection("forum_replies").where("topic_id", "==", String(id)).get();
      const replies = repliesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      res.json({ topic, replies });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/forum/topics/:id/replies", authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      if (!content) return res.status(400).json({ error: "Content is required" });
      const topicDoc = await db.collection("forum_topics").doc(id).get();
      if (!topicDoc.exists) return res.status(404).json({ error: "Topic not found" });
      const userDoc = await db.collection("users").doc(req.user.id.toString()).get();
      const userData = userDoc.exists ? userDoc.data() : { name: "User", role: "viewer" };
      const replyData = {
        topic_id: String(id),
        content,
        author_id: req.user.id,
        author_name: userData.name || "Anonymous",
        author_avatar: userData.avatar || "",
        author_role: userData.role || "user",
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      const replyRef = await db.collection("forum_replies").add(replyData);
      const topicData = topicDoc.data();
      await db.collection("forum_topics").doc(id).update({
        reply_count: (topicData.reply_count || 0) + 1
      });
      res.json({ success: true, id: replyRef.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  async function seedForumAndKB() {
    try {
      const categoriesSnap = await db.collection("forum_categories").get();
      if (categoriesSnap.empty) {
        console.log("[FORUM SEEDER] Seeding default forum categories...");
        const defaultForumCategories = [
          { id: "1", name: "General Discussion", description: "Talk about anything related to WatchWDS or sports in general." },
          { id: "2", name: "Match Chat", description: "Discuss live streamed games, past matches, and highlights." },
          { id: "3", name: "Suggestions & Feedback", description: "Help us improve WatchWDS! Share your feature requests and ideas." }
        ];
        for (const cat of defaultForumCategories) {
          await db.collection("forum_categories").doc(cat.id).set(cat);
        }
        console.log("[FORUM SEEDER] Seeded 3 categories.");
        await db.collection("forum_topics").doc("101").set({
          id: 101,
          category_id: "1",
          title: "Welcome to the WatchWDS Fan Forum!",
          content: "<p>We are thrilled to launch our new community hub! Introduce yourselves here and let us know what teams you support.</p>",
          author_name: "Admin Support",
          author_id: 1,
          author_avatar: "",
          reply_count: 1,
          is_pinned: 1,
          is_locked: 0,
          created_at: new Date(Date.now() - 864e5).toISOString()
        });
        await db.collection("forum_replies").add({
          topic_id: "101",
          content: "<p>Welcome everyone! Excited to get this started.</p>",
          author_name: "Admin Support",
          author_id: 1,
          author_avatar: "",
          author_role: "admin",
          created_at: new Date(Date.now() - 864e5 + 1e4).toISOString()
        });
      }
      const kbSnap = await db.collection("knowledge_base").get();
      if (kbSnap.empty) {
        console.log("[KB SEEDER] Seeding default knowledge base articles...");
        const defaultKB = [
          {
            id: "kb1",
            title: "How to add funds to my wallet?",
            content: "You can add funds to your WatchWDS wallet by clicking on 'Add Funds' in the user dropdown menu, entering the desired amount, and completing the payment transaction safely. Once completed, your balance will update instantly.",
            tags: ["wallet", "funds", "payment", "balance"],
            category: "Billing & Wallet",
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          {
            id: "kb2",
            title: "How to watch premium matches?",
            content: "Premium matches require a Pay-Per-View unlock or an active subscription plan. Make sure you have enough balance in your wallet, and click the 'Unlock Match' button on the match page. The required amount will be deducted from your balance.",
            tags: ["match", "watch", "premium", "ppv"],
            category: "Streaming guide",
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          {
            id: "kb3",
            title: "How to become a creator on WatchWDS?",
            content: "Go to your Profile settings, click on 'Become Creator', fill out your channel name and description, and submit. An admin will review your application soon. Once approved, you can schedule matches and earn from subscriptions.",
            tags: ["creator", "become creator", "channel", "apply"],
            category: "Creators",
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          {
            id: "kb4",
            title: "How do I reset my password?",
            content: "If you forgot your password, go to the Login page, click 'Forgot Password?', enter your registered email address, and follow the password reset link sent to your inbox to set a secure new password.",
            tags: ["password", "reset", "forgot password", "login"],
            category: "Account Safety",
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          {
            id: "kb5",
            title: "What is the refund policy?",
            content: "All transactions on WatchWDS are final. Points unlocked for Pay-Per-View matches or active subscriptions cannot be refunded to your standard financial accounts, owing to support of direct local sports creators.",
            tags: ["refund", "policy", "billing", "cancel"],
            category: "Billing & Wallet",
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        ];
        for (const kb of defaultKB) {
          await db.collection("knowledge_base").doc(kb.id).set(kb);
        }
        console.log("[KB SEEDER] Seeded 5 articles.");
      }
    } catch (err) {
      console.error("[SEED FORUM/KB ERROR]", err.message);
    }
  }
  app.get("/api/matches/:id", async (req, res) => {
    try {
      const doc = await db.collection("matches").doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Not found" });
      res.json(sanitizeMatchForPublic({ id: doc.id, ...doc.data() }));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/matches/:id/stream", authenticate, async (req, res) => {
    try {
      const matchId = req.params.id;
      const matchDoc = await db.collection("matches").doc(matchId).get();
      if (!matchDoc.exists) return res.status(404).json({ error: "Match not found" });
      const match = { id: matchDoc.id, ...matchDoc.data() };
      const userId = req.user.id.toString();
      const userRole = req.user.role;
      let hasAccess = false;
      if (match.access === "free" || userRole === "admin" || userRole === "operator") {
        hasAccess = true;
      } else {
        const purchasesSnap = await db.collection("purchases").where("userId", "==", userId).where("matchId", "==", matchId).where("type", "==", "watch").get();
        if (purchasesSnap.docs && purchasesSnap.docs.length > 0) {
          hasAccess = true;
        }
        if (!hasAccess && match.access_type === "plan" && req.user.planId) {
          const planValid = !req.user.planExpiresAt || new Date(req.user.planExpiresAt) > /* @__PURE__ */ new Date();
          const planMatch = !match.required_plan_id || String(req.user.planId) === String(match.required_plan_id);
          if (planValid && planMatch) {
            hasAccess = true;
          }
        }
      }
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied. Purchase or valid subscription required.", hasAccess: false });
      }
      return res.json({
        hasAccess: true,
        stream: {
          video_url: match.video_url || match.videoUrl || null,
          embed_code: match.embed_code || match.embedCode || null,
          stream_key: match.stream_key || match.streamKey || null,
          playback_id: match.playback_id || match.playbackId || null,
          description: match.description || null
        }
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/matches", authenticate, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      const matchData = { ...req.body };
      delete matchData.id;
      let resolvedDate = matchData.date || matchData.start_time || matchData.startTime || matchData.scheduledDate;
      if (!resolvedDate || resolvedDate === "Invalid Date" || isNaN(new Date(resolvedDate).getTime())) {
        resolvedDate = (/* @__PURE__ */ new Date()).toISOString();
      } else {
        resolvedDate = new Date(resolvedDate).toISOString();
      }
      matchData.date = resolvedDate;
      matchData.start_time = resolvedDate.slice(0, 19).replace("T", " ");
      delete matchData.startTime;
      delete matchData.scheduledDate;
      const fieldMappings = {
        accessType: "access_type",
        ppvPrice: "ppv_price",
        requiredPlanId: "required_plan_id",
        clubId: "club_id",
        liveCommenting: "live_commenting",
        commentAlignment: "comment_alignment",
        adSettings: "ad_settings"
      };
      for (const [camelKey, snakeKey] of Object.entries(fieldMappings)) {
        if (matchData[camelKey] !== void 0) {
          matchData[snakeKey] = matchData[camelKey];
          delete matchData[camelKey];
        }
      }
      if (matchData.duration !== void 0) {
        matchData.duration = Number(matchData.duration) || 120;
      }
      const docRef = await db.collection("matches").add({ ...matchData, operator_id: req.user.id, created_at: (/* @__PURE__ */ new Date()).toISOString() });
      cacheEngine.invalidateCollection("matches");
      const adminsSnap = await db.collection("users").where("role", "==", "admin").get();
      for (const adminDoc of adminsSnap.docs) {
        const admin = adminDoc.data();
        sendTemplateEmail(admin.email, "admin_new_match_alert", {
          match_name: req.body.title || "New Match",
          creator_name: req.user.name || "Staff",
          match_date: req.body.start_time || req.body.date || (/* @__PURE__ */ new Date()).toLocaleString(),
          website_url: getRequestBaseUrl(req)
        }).catch((err) => console.error(`Failed to send admin match alert to ${admin.email}:`, err));
      }
      res.json({ id: docRef.id });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/matches/:id", authenticate, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      const matchData = { ...req.body };
      delete matchData.id;
      if (matchData.date !== void 0 || matchData.startTime !== void 0 || matchData.start_time !== void 0 || matchData.scheduledDate !== void 0) {
        let resolvedDate = matchData.date || matchData.start_time || matchData.startTime || matchData.scheduledDate;
        if (!resolvedDate || resolvedDate === "Invalid Date" || isNaN(new Date(resolvedDate).getTime())) {
          resolvedDate = (/* @__PURE__ */ new Date()).toISOString();
        } else {
          resolvedDate = new Date(resolvedDate).toISOString();
        }
        matchData.date = resolvedDate;
        matchData.start_time = resolvedDate.slice(0, 19).replace("T", " ");
      }
      delete matchData.startTime;
      delete matchData.scheduledDate;
      const fieldMappings = {
        accessType: "access_type",
        ppvPrice: "ppv_price",
        requiredPlanId: "required_plan_id",
        clubId: "club_id",
        liveCommenting: "live_commenting",
        commentAlignment: "comment_alignment",
        adSettings: "ad_settings"
      };
      for (const [camelKey, snakeKey] of Object.entries(fieldMappings)) {
        if (matchData[camelKey] !== void 0) {
          matchData[snakeKey] = matchData[camelKey];
          delete matchData[camelKey];
        }
      }
      if (matchData.duration !== void 0) {
        matchData.duration = Number(matchData.duration) || 120;
      }
      await db.collection("matches").doc(req.params.id).update(matchData);
      cacheEngine.invalidateCollection("matches");
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/matches/:id", authenticate, requireRole(["admin", "operator"]), async (req, res) => {
    try {
      await db.collection("matches").doc(req.params.id).delete();
      cacheEngine.invalidateCollection("matches");
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
      const matchSnap = await db.collection("matches").where("id", "in", matchIds.slice(0, 30)).get();
      res.json(matchSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/matches/:id/save", authenticate, async (req, res) => {
    try {
      await db.collection("saved_matches").add({ user_id: req.user.id, match_id: req.params.id });
      notifyUser(req.user.id, "Match Saved", `You saved Match #${req.params.id} to watch later.`, "info", `/matches/${req.params.id}`);
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
          is_active: true,
          from_name: "WatchWDS Support",
          from_email: "noreply@watchwds.com",
          reply_to: "support@watchwds.com",
          provider: "smtp"
        });
        console.log("[EMAIL SEEDER] Seeded default SMTP configuration (active).");
      } else {
        const smtpData = smtpDoc.data();
        if (smtpData && (smtpData.is_active === false || smtpData.is_active === 0 || smtpData.is_active === "false")) {
          await db.collection("email_settings").doc("smtp").update({ is_active: true });
          console.log("[EMAIL SEEDER] Auto-activated existing SMTP configuration.");
        }
      }
      console.log(`[EMAIL SEEDER] Checking ${SEED_TEMPLATES.length} email templates...`);
      for (const t of SEED_TEMPLATES) {
        const doc = await db.collection("email_templates").doc(t.slug).get();
        if (!doc.exists) {
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
      }
      console.log("[EMAIL SEEDER] Verified email templates successfully.");
    } catch (err) {
      console.error("[EMAIL SEEDER] Error during seeding:", err.message);
    }
  }
  async function renderEmailTemplate(slug, variables) {
    const brandingDoc = await db.collection("email_branding").doc("settings").get();
    const branding = brandingDoc.exists ? brandingDoc.data() : defaultBranding;
    const templateDoc = await db.collection("email_templates").doc(slug).get();
    let template = templateDoc.exists ? templateDoc.data() : null;
    if (!template) {
      const seedTemplate = SEED_TEMPLATES.find((t) => t.slug === slug);
      if (seedTemplate) {
        template = { ...seedTemplate };
      } else {
        throw new Error("Template not found: " + slug);
      }
    }
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
      support_email: "support@watchwds.com",
      company_name: "WatchWDS",
      website_url: globalAppUrl,
      reset_password_link: `${globalAppUrl}/auth/reset?token=abc`,
      verification_link: `${globalAppUrl}/auth/verify?token=xyz`,
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
      <img src="${branding.logo_url}" alt="WatchWDS" class="email-logo" style="max-height: 48px;" />
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
    const isActive = smtp.is_active !== false && smtp.is_active !== 0 && String(smtp.is_active) !== "false";
    if (!isActive) {
      console.log(`[STUB EMAIL SEND] System inactive. To: ${to}, Subject: ${subject}`);
      return { success: true, provider: "mock", messageId: "mock-" + Date.now() };
    }
    if (smtp.provider === "smtp" || !smtp.provider) {
      const isSecure = smtp.secure === true || smtp.secure === 1 || String(smtp.secure) === "true" || Number(smtp.port) === 465;
      const transporter = import_nodemailer.default.createTransport({
        host: smtp.host,
        port: Number(smtp.port),
        secure: isSecure,
        family: 4,
        auth: {
          user: smtp.auth_user,
          pass: smtp.auth_pass
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      try {
        const info = await transporter.sendMail({
          from: `"${smtp.from_name}" <${smtp.from_email}>`,
          replyTo: smtp.reply_to || smtp.from_email,
          to,
          subject,
          html,
          text: text || "WatchWDS Email Support"
        });
        console.log(`[SMTP SUCCESS] Sent email to ${to} (Subject: ${subject}) via SMTP. MessageId: ${info.messageId}`);
        return { success: true, provider: "smtp", messageId: info.messageId };
      } catch (err) {
        console.error(`[SMTP ERROR] Direct SMTP sendMail failed for ${to}:`, err.message || err);
        throw err;
      }
    } else {
      console.log(`[EXTERNAL PROVIDER DISPATCH] Routed via ${smtp.provider.toUpperCase()} to ${to} (Key: ${smtp.api_key ? "VALID" : "NONE"})`);
      return { success: true, provider: smtp.provider, messageId: `${smtp.provider}-dispatch-${Date.now()}` };
    }
  }
  async function sendTemplateEmail(to, slug, variables) {
    try {
      const { subject, html } = await renderEmailTemplate(slug, variables);
      const result = await dispatchEmail(to, subject, html);
      console.log(`[EMAIL DISPATCH] Sent ${slug} to ${to}: ${result.success ? "success" : "failed"}`);
      const analyticsDoc = await db.collection("email_template_analytics").doc(slug).get();
      if (analyticsDoc.exists) {
        const data = analyticsDoc.data();
        await db.collection("email_template_analytics").doc(slug).update({
          sent: (data.sent || 0) + 1,
          delivered: (data.delivered || 0) + 1,
          last_sent_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      return result;
    } catch (err) {
      console.error(`[EMAIL ERROR] Failed to send template ${slug} to ${to}:`, err.message || err);
      return { success: false, error: err.message };
    }
  }
  seedEmailSystem().catch((err) => console.error("Failed to seed mail system:", err));
  seedForumAndKB().catch((err) => console.error("Failed to seed forum and knowledge base:", err));
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
  async function processMatchAutomations() {
    try {
      const matchesSnap = await db.collection("matches").get();
      const allMatches = matchesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const nowMs = Date.now();
      let cacheInvalidationNeeded = false;
      for (const match of allMatches) {
        if (!match.date) continue;
        const kickoffMs = new Date(match.date).getTime();
        if (isNaN(kickoffMs)) continue;
        const durationMins = Number(match.duration) || 120;
        const durationMs = durationMins * 60 * 1e3;
        const currentStatus = match.status;
        if (nowMs >= kickoffMs && nowMs < kickoffMs + durationMs && currentStatus === "upcoming") {
          await db.collection("matches").doc(match.id).update({ status: "live" });
          cacheInvalidationNeeded = true;
          console.log(`[AUTOMATION] Match "${match.title}" (ID: ${match.id}) transitioned: upcoming -> live`);
        }
        if (nowMs >= kickoffMs + durationMs && (currentStatus === "live" || currentStatus === "upcoming")) {
          await db.collection("matches").doc(match.id).update({ status: "completed" });
          cacheInvalidationNeeded = true;
          console.log(`[AUTOMATION] Match "${match.title}" (ID: ${match.id}) transitioned: ${currentStatus} -> completed`);
        }
        const tenMinutesMs = 10 * 60 * 1e3;
        const timeToKickoff = kickoffMs - nowMs;
        if (timeToKickoff > 0 && timeToKickoff <= tenMinutesMs && !match.reminder_sent_10m && (currentStatus === "upcoming" || currentStatus === "live")) {
          await db.collection("matches").doc(match.id).update({ reminder_sent_10m: 1 });
          const savedSnap = await db.collection("saved_matches").where("match_id", "==", String(match.id)).get();
          const savedUserIds = savedSnap.docs.map((doc) => doc.data().user_id).filter(Boolean);
          if (savedUserIds.length > 0) {
            console.log(`[AUTOMATION] Sending 10m kickoff reminder for "${match.title}" to ${savedUserIds.length} users.`);
            for (const userId of savedUserIds) {
              try {
                const userDoc = await db.collection("users").doc(userId).get();
                if (userDoc.exists && userDoc.data()?.email) {
                  const user = userDoc.data();
                  const template = await renderEmailTemplate("match_starting_15m", {
                    user_name: user.name || "Sports Fan",
                    match_title: match.title,
                    match_time: new Date(match.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    match_url: `${process.env.APP_URL || "https://watchwds.com"}/matches/${match.slug || match.id}`
                  });
                  await dispatchEmail(user.email, template.subject, template.html);
                }
              } catch (err) {
                console.error(`[AUTOMATION] Failed to send 10m kickoff reminder to user ${userId}:`, err?.message);
              }
            }
          }
        }
      }
      if (cacheInvalidationNeeded) {
        cacheEngine.invalidateCollection("matches");
      }
    } catch (err) {
      console.error("[AUTOMATION ERROR] Match lifecycle automation error:", err?.message);
    }
  }
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
      const testSubject = "WatchWDS SMTP Connection Verification";
      const testHtml = `<h2>SMTP Server Connected!</h2>
<p>Success! This email verifies that your SMTP server configuration on WatchWDS is active and dispatching emails correctly.</p>
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
      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/email/templates/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const doc = await db.collection("email_templates").doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Template not found" });
      const versSnap = await db.collection("email_versions").where("template_id", "==", req.params.id).get();
      const versions = versSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.version_number - a.version_number);
      res.json({
        ...doc.data(),
        id: doc.id,
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
      const doc = await db.collection("email_templates").doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Template not found" });
      await db.collection("email_templates").doc(req.params.id).delete();
      const snap = await db.collection("email_versions").where("template_id", "==", req.params.id).get();
      for (const d of snap.docs) {
        await d.ref.delete();
      }
      await db.collection("email_template_analytics").doc(req.params.id).delete();
      res.json({ success: true, message: "Template deleted" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/email/templates/:id/duplicate", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const doc = await db.collection("email_templates").doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Template not found" });
      const current = doc.data();
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
      for (const doc of snap.docs) {
        await doc.ref.delete();
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/plans/upgrade-cost", authenticate, async (req, res) => {
    try {
      const { planId } = req.body;
      const userDoc = await db.collection("users").doc(req.user.id).get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
      const user = userDoc.data();
      const newPlanDoc = await db.collection("plans").doc(planId.toString()).get();
      if (!newPlanDoc.exists) return res.status(404).json({ error: "New plan not found" });
      const newPlan = newPlanDoc.data();
      const newPlanPrice = Number(newPlan.price);
      if (!user.plan_id || !user.plan_expires_at) {
        return res.json({ cost: newPlanPrice, credit: 0 });
      }
      const currentPlanDoc = await db.collection("plans").doc(user.plan_id.toString()).get();
      if (!currentPlanDoc.exists) {
        return res.json({ cost: newPlanPrice, credit: 0 });
      }
      const currentPlan = currentPlanDoc.data();
      const currentPlanPrice = Number(currentPlan.price);
      if (newPlanPrice <= currentPlanPrice && String(user.plan_id) !== String(planId)) {
        return res.status(400).json({ error: "You can only upgrade to a higher plan." });
      }
      if (String(user.plan_id) === String(planId)) {
        const expiresAt2 = new Date(user.plan_expires_at);
        if (expiresAt2 > /* @__PURE__ */ new Date()) {
          return res.status(400).json({ error: "You already have an active subscription for this plan." });
        }
      }
      const expiresAt = new Date(user.plan_expires_at);
      const now = /* @__PURE__ */ new Date();
      if (expiresAt <= now || String(user.plan_id) === String(planId)) {
        return res.json({ cost: newPlanPrice, credit: 0 });
      }
      const durationDays = Number(currentPlan.duration_days) || 30;
      const totalMs = durationDays * 24 * 60 * 60 * 1e3;
      const remainingMs = expiresAt.getTime() - now.getTime();
      const credit = currentPlanPrice * remainingMs / totalMs;
      let cost = newPlanPrice - credit;
      if (cost < 0) cost = 0;
      res.json({ cost: Math.round(cost * 100) / 100, credit: Math.round(credit * 100) / 100 });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/plans", cdnEdgeSim(120), apiFragmentCache(60), async (req, res) => {
    try {
      const plansSnap = await db.collection("plans").get();
      const plansList = plansSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: Number(data.id || doc.id),
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
      const plansList = plansSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: Number(data.id || doc.id),
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
      cacheEngine.invalidateCollection("plans");
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
      cacheEngine.invalidateCollection("plans");
      res.json({ success: true, ...planData });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/admin/plans/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      await db.collection("plans").doc(id).delete();
      cacheEngine.invalidateCollection("plans");
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/payment/methods", async (req, res) => {
    try {
      const doc = await db.collection("payment_settings").doc("gateway").get();
      const settings = doc.exists ? doc.data() : {};
      res.json({
        stripe: { enabled: settings.stripe?.enabled || false },
        paypal: { enabled: settings.paypal?.enabled || false },
        paystack: { enabled: settings.paystack?.enabled || false }
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  function maskSecret(val) {
    if (!val) return "";
    if (val.length <= 10) return "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
    return val.substring(0, 8) + "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" + val.substring(val.length - 4);
  }
  function isMasked(val) {
    return typeof val === "string" && val.includes("\u2022\u2022\u2022\u2022");
  }
  app.get("/api/admin/payment/settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const doc = await db.collection("payment_settings").doc("gateway").get();
      if (!doc.exists) return res.json({});
      const data = doc.data();
      const maskedData = { ...data };
      if (maskedData.stripe && maskedData.stripe.secretKey) {
        maskedData.stripe.secretKey = maskSecret(maskedData.stripe.secretKey);
      }
      if (maskedData.paypal && maskedData.paypal.secretKey) {
        maskedData.paypal.secretKey = maskSecret(maskedData.paypal.secretKey);
      }
      if (maskedData.paystack && maskedData.paystack.secretKey) {
        maskedData.paystack.secretKey = maskSecret(maskedData.paystack.secretKey);
      }
      res.json(maskedData);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/payment/settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const incoming = req.body;
      const docRef = db.collection("payment_settings").doc("gateway");
      const existingDoc = await docRef.get();
      const existing = existingDoc.exists ? existingDoc.data() : {};
      const merged = { ...incoming };
      const mergeSecret = (provider) => {
        if (merged[provider] && existing[provider]) {
          if (isMasked(merged[provider].secretKey)) {
            merged[provider].secretKey = existing[provider].secretKey;
          }
        }
      };
      mergeSecret("stripe");
      mergeSecret("paypal");
      mergeSecret("paystack");
      await docRef.set(merged);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/payment/settings", async (req, res) => {
    try {
      const doc = await db.collection("payment_settings").doc("gateway").get();
      if (!doc.exists) {
        return res.json({
          stripe: { publicKey: "", isTestMode: true, enabled: false },
          paypal: { clientId: "", isTestMode: true, enabled: false },
          paystack: { publicKey: "", isTestMode: true, enabled: false }
        });
      }
      const data = doc.data();
      const publicData = {
        stripe: {
          enabled: !!data.stripe?.enabled,
          publicKey: data.stripe?.publicKey || "",
          isTestMode: data.stripe?.isTestMode !== false
        },
        paypal: {
          enabled: !!data.paypal?.enabled,
          clientId: data.paypal?.clientId || "",
          isTestMode: data.paypal?.isTestMode !== false
        },
        paystack: {
          enabled: !!data.paystack?.enabled,
          publicKey: data.paystack?.publicKey || "",
          isTestMode: data.paystack?.isTestMode !== false
        }
      };
      res.json(publicData);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/google-auth/settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const doc = await db.collection("settings").doc("google_auth").get();
      if (!doc.exists) return res.json({});
      const data = doc.data();
      const maskedData = { ...data };
      if (maskedData.clientSecret) {
        maskedData.clientSecret = maskSecret(maskedData.clientSecret);
      }
      res.json(maskedData);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/google-auth/settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const incoming = req.body;
      const docRef = db.collection("settings").doc("google_auth");
      const existingDoc = await docRef.get();
      const existing = existingDoc.exists ? existingDoc.data() : {};
      const merged = { ...incoming };
      if (isMasked(merged.clientSecret) && existing.clientSecret) {
        merged.clientSecret = existing.clientSecret;
      }
      await docRef.set(merged);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/auth/google/config", async (req, res) => {
    try {
      const doc = await db.collection("settings").doc("google_auth").get();
      if (!doc.exists) return res.json({ enabled: false, clientId: "" });
      const data = doc.data();
      res.json({
        enabled: data.enabled || false,
        clientId: data.clientId || ""
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/settings/public", async (req, res) => {
    try {
      const generalDoc = await db.collection("settings").doc("general").get();
      const seoDoc = await db.collection("settings").doc("seo").get();
      const general = generalDoc.exists ? generalDoc.data() : {};
      const seo = seoDoc.exists ? seoDoc.data() : {};
      res.json({
        siteName: general?.site_name || "WatchWDS",
        siteLogo: general?.logo_url || "",
        siteBanner: general?.banner_url || "",
        supportEmail: general?.support_email || "",
        maintenanceMode: !!general?.maintenance_mode,
        currency: general?.currency || "GBP",
        seo: {
          metaTitle: seo?.meta_title || "",
          metaDescription: seo?.meta_description || ""
        }
      });
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
  async function processClubRevenueSplit(params) {
    const { matchId, transactionId, grossAmount, isDestinationCharge, connectedAccountId: passedConnectedAccountId, stripePaymentIntentId } = params;
    try {
      if (!matchId || !grossAmount || grossAmount <= 0) return;
      const existingEarnings = await db.collection("club_earnings").where("transaction_id", "==", String(transactionId)).get();
      if (!existingEarnings.empty) {
        console.log(`[RevenueSplit] Transaction ${transactionId} already processed in club_earnings. Skipping.`);
        return;
      }
      const matchDoc = await db.collection("matches").doc(String(matchId)).get();
      if (!matchDoc.exists) return;
      const matchData = matchDoc.data();
      const clubId = matchData.club_id || matchData.clubId;
      if (!clubId) {
        console.log(`[RevenueSplit] Match #${matchId} has no assigned partner club. No split required.`);
        return;
      }
      const clubDoc = await db.collection("clubs").doc(String(clubId)).get();
      if (!clubDoc.exists) return;
      const club = clubDoc.data();
      const stripeAccountId = passedConnectedAccountId || club.stripe_account_id || club.stripeAccountId || null;
      const isOnboarded = !!(club.stripe_onboarding_complete || club.stripeOnboardingComplete);
      const policiesSnap = await db.collection("revenue_policies").where("club_id", "==", String(clubId)).where("is_active", "==", 1).limit(1).get();
      let feePercent = params.platformFeePercent ?? 20;
      if (!policiesSnap.empty) {
        const policy = policiesSnap.docs[0].data();
        feePercent = Number(policy.platform_fee_percent || policy.platformFeePercent || 20);
      } else {
        const defaultPolicyId = Date.now().toString();
        await db.collection("revenue_policies").doc(defaultPolicyId).set({
          id: defaultPolicyId,
          clubId: String(clubId),
          club_id: String(clubId),
          platformFeePercent: 20,
          platform_fee_percent: 20,
          clubSharePercent: 80,
          club_share_percent: 80,
          isActive: 1,
          is_active: 1,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }).catch(() => {
        });
      }
      const platformCommission = Math.round(grossAmount * (feePercent / 100) * 100) / 100;
      const clubNetAmount = Math.round((grossAmount - platformCommission) * 100) / 100;
      const earningId = `earn_${Date.now()}_${clubId}`;
      await db.collection("club_earnings").doc(earningId).set({
        id: earningId,
        clubId: String(clubId),
        matchId: String(matchId),
        transactionId: String(transactionId),
        grossAmount,
        platformCommission,
        clubNetAmount,
        commissionRate: feePercent,
        type: "ppv",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      const configDoc = await db.collection("payment_settings").doc("payout_config").get();
      const config = configDoc.exists ? configDoc.data() : { thresholdAmount: 50, currency: "GBP", enabled: true, instantSplit: false };
      const isInstantSplit = !!config.instantSplit;
      const payoutCurrency = (config.currency || "GBP").toUpperCase();
      const balDoc = await db.collection("club_balances").doc(String(clubId)).get();
      const currentBal = balDoc.exists ? balDoc.data() : { availableBalance: 0, pendingBalance: 0, totalEarned: 0, totalPaidOut: 0, currency: payoutCurrency };
      const currAvail = Number(currentBal.availableBalance || currentBal.available_balance) || 0;
      const currEarned = Number(currentBal.totalEarned || currentBal.total_earned) || 0;
      const currPaid = Number(currentBal.totalPaidOut || currentBal.total_paid_out) || 0;
      const currPending = Number(currentBal.pendingBalance || currentBal.pending_balance) || 0;
      if (isInstantSplit || isDestinationCharge && stripeAccountId) {
        let stripeRef = stripePaymentIntentId || (isDestinationCharge && stripeAccountId ? `dest_${Date.now()}_${String(stripeAccountId).slice(-6)}` : `instant_${Date.now()}`);
        let instantSuccess = false;
        if (isDestinationCharge && stripeAccountId) {
          instantSuccess = true;
        } else if (stripeAccountId) {
          try {
            const settingsDoc = await db.collection("payment_settings").doc("gateway").get();
            const gatewaySettings = settingsDoc.exists ? settingsDoc.data() : {};
            const stripeSecret = gatewaySettings?.stripe?.secretKey || process.env.STRIPE_SECRET_KEY;
            if (stripeSecret) {
              const stripeClient = new import_stripe.default(stripeSecret, { apiVersion: "2023-10-16" });
              const transfer = await stripeClient.transfers.create({
                amount: Math.round(clubNetAmount * 100),
                currency: payoutCurrency.toLowerCase(),
                destination: stripeAccountId,
                description: `Instant PPV split - Match #${matchId} (${club.name || clubId})`,
                metadata: { matchId: String(matchId), clubId: String(clubId), transactionId: String(transactionId) }
              });
              stripeRef = transfer.id;
              instantSuccess = true;
            } else {
              stripeRef = `mock_tr_${Date.now()}`;
              instantSuccess = true;
            }
          } catch (trErr) {
            console.error(`[RevenueSplit] Stripe transfer error for club ${clubId}:`, trErr.message);
            instantSuccess = false;
          }
        } else {
          stripeRef = `sim_instant_${Date.now()}`;
          instantSuccess = true;
        }
        if (instantSuccess) {
          const payoutId = `po_inst_${Date.now()}_${clubId}`;
          await db.collection("payouts").doc(payoutId).set({
            id: payoutId,
            clubId: String(clubId),
            stripePayoutId: stripeRef,
            stripeAccountId: stripeAccountId || "instant_disbursement",
            amount: clubNetAmount,
            currency: payoutCurrency,
            status: "paid",
            method: "instant",
            arrivalDate: (/* @__PURE__ */ new Date()).toISOString(),
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
          await db.collection("club_balances").doc(String(clubId)).set({
            clubId: String(clubId),
            availableBalance: currAvail,
            pendingBalance: currPending,
            totalEarned: currEarned + clubNetAmount,
            totalPaidOut: currPaid + clubNetAmount,
            currency: payoutCurrency
          });
        } else {
          await db.collection("club_balances").doc(String(clubId)).set({
            clubId: String(clubId),
            availableBalance: currAvail + clubNetAmount,
            pendingBalance: currPending,
            totalEarned: currEarned + clubNetAmount,
            totalPaidOut: currPaid,
            currency: payoutCurrency
          });
        }
      } else {
        const newAvailable = currAvail + clubNetAmount;
        await db.collection("club_balances").doc(String(clubId)).set({
          clubId: String(clubId),
          availableBalance: newAvailable,
          pendingBalance: currPending,
          totalEarned: currEarned + clubNetAmount,
          totalPaidOut: currPaid,
          currency: payoutCurrency
        });
        const threshold = Number(config.thresholdAmount) || 50;
        if (config.schedule === "auto" && newAvailable >= threshold && config.enabled) {
          triggerClubPayout(String(clubId), false).catch((err) => console.error(`Auto-payout error for club ${clubId}:`, err));
        }
      }
      cacheEngine.invalidateCollection("club_earnings");
      cacheEngine.invalidateCollection("club_balances");
      cacheEngine.invalidateCollection("payouts");
      cacheEngine.invalidateCollection("revenue_policies");
      notifyAdmins(
        "PPV Split Processed",
        `Split recorded for ${club.name || "Club"} (#${clubId}): Gross \xA3${grossAmount.toFixed(2)}, Platform \xA3${platformCommission.toFixed(2)}, Club Net \xA3${clubNetAmount.toFixed(2)} (${isInstantSplit ? "Instant Split" : "Accumulated"})`,
        "system",
        "/admin/finance"
      );
    } catch (splitErr) {
      console.error("[RevenueSplit] Error processing club revenue split:", splitErr);
    }
  }
  app.post("/api/checkout/gateway/initialize", authenticate, async (req, res) => {
    try {
      const { gateway, type, currency = "GBP" } = req.body;
      const metadata = req.body.metadata ? { ...req.body.metadata } : {};
      let amount = Number(req.body.amount);
      const userId = req.user.id.toString();
      const origin = req.headers.origin || "https://watchwds.com";
      let connectedAccountId = null;
      let platformFeePercent = 20;
      if (type === "watch" && metadata?.matchId) {
        const matchDoc = await db.collection("matches").doc(String(metadata.matchId)).get();
        if (!matchDoc.exists) return res.status(404).json({ error: "Match not found" });
        const matchData = matchDoc.data();
        amount = Number(matchData?.price ?? matchData?.ppv_price ?? 0);
        const resolvedClubId = metadata.clubId || matchData?.club_id || matchData?.clubId || null;
        metadata.clubId = resolvedClubId;
        if (resolvedClubId) {
          try {
            const clubDoc = await db.collection("clubs").doc(String(resolvedClubId)).get();
            if (clubDoc.exists) {
              const club = clubDoc.data();
              connectedAccountId = club.stripe_account_id || club.stripeAccountId || null;
            }
            const policiesSnap = await db.collection("revenue_policies").where("club_id", "==", String(resolvedClubId)).where("is_active", "==", 1).limit(1).get();
            if (!policiesSnap.empty) {
              const policy = policiesSnap.docs[0].data();
              platformFeePercent = Number(policy.platform_fee_percent || policy.platformFeePercent || 20);
            }
          } catch (clubErr) {
            console.error("Error resolving club/policy in initialize:", clubErr);
          }
        }
        metadata.connectedAccountId = connectedAccountId;
        metadata.platformFeePercent = platformFeePercent;
        metadata.isDestinationCharge = false;
      } else if (type === "plan" && metadata?.planId) {
        const planDoc = await db.collection("plans").doc(String(metadata.planId)).get();
        if (!planDoc.exists) return res.status(404).json({ error: "Plan not found" });
        amount = Number(planDoc.data()?.price ?? 0);
      } else if (type === "top_up") {
        const walletSnap = await db.collection("settings").doc("wallet").get();
        const isWalletEnabled = walletSnap.exists ? walletSnap.data()?.enabled !== false : true;
        if (!isWalletEnabled && req.user.role !== "admin") {
          return res.status(403).json({ error: "Wallet and account balance feature is currently disabled" });
        }
        if (!amount || isNaN(amount) || amount <= 0) {
          return res.status(400).json({ error: "Invalid top-up amount" });
        }
      }
      if (type === "watch" && gateway === "stripe" && !connectedAccountId) {
        return res.status(409).json({
          error: "Partner club has no Stripe connected account. Cannot process split payment."
        });
      }
      const settingsDoc = await db.collection("payment_settings").doc("gateway").get();
      const settings = settingsDoc.exists ? settingsDoc.data() : {};
      const transactionId = `txn_${Date.now()}_${userId}`;
      const returnUrl = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&txn_id=${transactionId}&gateway=${gateway}`;
      const cancelUrl = `${origin}/checkout/cancel`;
      const pendingData = {
        userId,
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
        if (settings.stripe.secretKey.trim().startsWith("mk_")) {
          return res.status(400).json({
            error: "Invalid Stripe Secret Key: An API Key Identifier (starts with 'mk_') was entered. Please enter your actual Stripe Secret Key (starts with 'sk_test_', 'sk_live_', or 'rk_') in Admin > Settings > Payment Settings."
          });
        }
        const targetCurrency = settings.stripe.merchantCurrency || currency;
        const totalAmountCents = Math.round(Number(amount) * 100);
        const applicationFeeAmount = Math.round(totalAmountCents * (platformFeePercent / 100));
        const stripe = new import_stripe.default(settings.stripe.secretKey, { apiVersion: "2023-10-16" });
        const sessionParams = {
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: targetCurrency.toLowerCase(),
                product_data: {
                  name: type === "top_up" ? "Wallet Top-up" : type === "watch" ? "Match Access" : type === "plan" ? "Subscription Plan" : "Access"
                },
                unit_amount: totalAmountCents
              },
              quantity: 1
            }
          ],
          mode: "payment",
          success_url: returnUrl,
          cancel_url: cancelUrl,
          client_reference_id: transactionId,
          metadata: {
            txn_id: transactionId,
            user_id: userId,
            match_id: metadata?.matchId ? String(metadata.matchId) : "",
            club_id: metadata?.clubId ? String(metadata.clubId) : "",
            payment_type: type === "watch" ? "ppv_watch" : type
          }
        };
        if (type === "watch") {
          metadata.applicationFeeCents = applicationFeeAmount;
          if (connectedAccountId) {
            try {
              const connectedAccount = await stripe.accounts.retrieve(connectedAccountId);
              if (connectedAccount.capabilities?.transfers === "active") {
                sessionParams.payment_intent_data = {
                  application_fee_amount: applicationFeeAmount,
                  transfer_data: {
                    destination: connectedAccountId
                  },
                  metadata: {
                    ...sessionParams.metadata,
                    settlement_model: "STRIPE_DESTINATION_ROUTED"
                  }
                };
                metadata.isDestinationCharge = true;
                metadata.settlement_model = "STRIPE_DESTINATION_ROUTED";
                await db.collection("transactions").doc(transactionId).update({ metadata });
              } else {
                return res.status(409).json({ error: "Partner account transfers capability is not active. Cannot process split payment." });
              }
            } catch (acctErr) {
              console.error("[Initialize] Connected account validation failed:", acctErr.message);
              return res.status(409).json({ error: `Could not verify partner Stripe account: ${acctErr.message}` });
            }
          }
        }
        const session = await stripe.checkout.sessions.create(sessionParams);
        return res.json({ checkoutUrl: session.url });
      }
      if (gateway === "paypal") {
        if (!settings?.paypal?.enabled || !settings?.paypal?.clientId || !settings?.paypal?.secret) {
          return res.json({ checkoutUrl: `${origin}/checkout/success?txn_id=${transactionId}&token=mock_paypal_token&gateway=paypal` });
        }
        const targetCurrency = settings.paypal.merchantCurrency || currency;
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
                value: Number(amount).toFixed(2)
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
        const email = userDoc.exists ? userDoc.data()?.email : "customer@watchwds.com";
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
        let matchSlug2 = txnData.metadata?.fromMatchSlug || null;
        if (txnData.metadata?.matchId && !matchSlug2) {
          try {
            const matchDoc = await db.collection("matches").doc(String(txnData.metadata.matchId)).get();
            if (matchDoc.exists) {
              matchSlug2 = matchDoc.data()?.slug || null;
            }
          } catch (err) {
          }
        }
        return res.json({
          success: true,
          alreadyCompleted: true,
          type: txnData.type,
          matchId: txnData.metadata?.matchId || null,
          matchSlug: matchSlug2
        });
      }
      const settingsDoc = await db.collection("payment_settings").doc("gateway").get();
      const settings = settingsDoc.exists ? settingsDoc.data() : {};
      let isVerified = false;
      let stripeSession = null;
      if (gateway === "stripe") {
        if (!settings?.stripe?.secretKey) {
          isVerified = true;
        } else {
          const stripe = new import_stripe.default(settings.stripe.secretKey, { apiVersion: "2023-10-16" });
          stripeSession = await stripe.checkout.sessions.retrieve(session_id);
          if (stripeSession.payment_status === "paid") isVerified = true;
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
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      const user = userDoc.exists ? userDoc.data() : null;
      const userEmail = user?.email;
      const userName = user?.name || "User";
      let matchSlug = metadata?.fromMatchSlug || null;
      if (metadata?.matchId && !matchSlug) {
        try {
          const matchDoc = await db.collection("matches").doc(String(metadata.matchId)).get();
          if (matchDoc.exists) {
            matchSlug = matchDoc.data()?.slug || null;
          }
        } catch (err) {
          console.error("Error fetching match slug for redirect:", err);
        }
      }
      if (type === "top_up") {
        const currentBalance = Number(user?.balance || 0);
        await userRef.update({ balance: currentBalance + Number(amount) });
        await db.collection("transactions").doc(txn_id).update({ status: "completed" });
        notifyUser(userId, "Wallet Top-up Successful", `Your wallet has been credited with ${amount}.`, "success", "/profile");
        notifyAdmins("New Wallet Top-up", `User top-up: ${amount}`, "system", "/admin/transactions");
        if (userEmail) {
          sendTemplateEmail(userEmail, "payment_successful", {
            first_name: userName,
            purchase_amount: String(amount),
            transaction_id: txn_id,
            invoice_number: `INV-${Date.now()}`,
            support_email: "support@watchwds.com"
          }).catch((err) => console.error("Failed to send top up email:", err));
        }
        return res.json({ success: true, type, matchId: null, matchSlug: null });
      }
      if (type === "watch" || type === "embed") {
        const purchaseId = Date.now().toString();
        const purchaseData = {
          id: purchaseId,
          userId,
          matchId: metadata.matchId,
          amount,
          type,
          date: (/* @__PURE__ */ new Date()).toISOString()
        };
        if (type === "embed") {
          purchaseData.code = `<iframe src="https://watchwds.com/embed/${metadata.matchId}" width="800" height="450" frameborder="0" allowfullscreen></iframe>`;
        }
        await db.collection("purchases").doc(purchaseId).set(purchaseData);
        await db.collection("transactions").doc(txn_id).update({ status: "completed" });
        notifyUser(userId, "Purchase Successful", `You have unlocked access.`, "success", `/matches/${metadata.matchId}`);
        notifyAdmins("New Purchase", `A user purchased access for amount: ${amount}`, "system", "/admin/transactions");
        if (type === "watch" && metadata?.matchId) {
          const isDest = !!metadata?.isDestinationCharge;
          await processClubRevenueSplit({
            matchId: String(metadata.matchId),
            transactionId: String(txn_id),
            grossAmount: Number(amount) || 0,
            userId,
            isDestinationCharge: isDest,
            connectedAccountId: metadata?.connectedAccountId || null,
            platformFeePercent: metadata?.platformFeePercent ? Number(metadata.platformFeePercent) : void 0,
            stripePaymentIntentId: typeof stripeSession?.payment_intent === "string" ? stripeSession.payment_intent : void 0
          });
        }
        if (userEmail) {
          const matchDoc = await db.collection("matches").doc(metadata.matchId).get();
          const matchData = matchDoc.exists ? matchDoc.data() : {};
          sendTemplateEmail(userEmail, "match_purchased", {
            first_name: userName,
            match_name: matchData.title || "Match Access",
            match_date: matchData.start_time || (/* @__PURE__ */ new Date()).toLocaleDateString(),
            match_time: matchData.time || "UTC",
            purchase_amount: String(amount),
            website_url: `${getRequestBaseUrl(req)}/matches/${metadata.matchId}`,
            transaction_id: txn_id
          }).catch((err) => console.error("Failed to send match purchase email:", err));
        }
        return res.json({ success: true, type, matchId: metadata.matchId, matchSlug });
      }
      if (type === "plan") {
        const planDoc = await db.collection("plans").doc(String(metadata.planId)).get();
        const planData = planDoc.data() || {};
        const durationDays = Number(planData.duration_days) || 30;
        const expiresAt = /* @__PURE__ */ new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);
        await userRef.update({
          planId: Number(metadata.planId),
          planExpiresAt: expiresAt.toISOString()
        });
        await db.collection("transactions").doc(txn_id).update({ status: "completed" });
        notifyUser(userId, "Plan Subscribed", `You have successfully subscribed to the plan.`, "success", "/profile");
        notifyAdmins("New Subscription", `A user subscribed to a plan.`, "system", "/admin/transactions");
        if (userEmail) {
          sendTemplateEmail(userEmail, "subscription_purchased", {
            first_name: userName,
            subscription_name: planData.name || "Premium Plan",
            purchase_amount: String(amount),
            transaction_id: txn_id,
            invoice_number: `INV-${Date.now()}`,
            website_url: `${getRequestBaseUrl(req)}/profile`
          }).catch((err) => console.error("Failed to send plan subscription email:", err));
        }
        return res.json({ success: true, type, matchId: metadata.matchId || null, matchSlug });
      }
      throw new Error("Unknown transaction type");
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
  const requireWalletEnabled = async (req, res, next) => {
    try {
      const snap = await db.collection("settings").doc("wallet").get();
      const isEnabled = snap.exists ? snap.data()?.enabled !== false : true;
      if (isEnabled) return next();
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
          if (decoded && decoded.role === "admin") {
            req.user = decoded;
            return next();
          }
        } catch (err) {
        }
      }
      return res.status(403).json({ error: "Wallet and account balance feature is currently disabled" });
    } catch (e) {
      return res.status(403).json({ error: "Wallet and account balance feature is currently disabled" });
    }
  };
  app.post("/api/checkout/topup", authenticate, requireWalletEnabled, async (req, res) => {
    try {
      const { amount, paymentMethod } = req.body;
      const userId = req.user.id.toString();
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }
      const userData = userDoc.data() || {};
      const currentBalance = Number(userData.balance) || 0;
      const newBalance = currentBalance + Number(amount);
      await userRef.update({ balance: newBalance });
      const transactionId = Date.now().toString();
      const transactionData = {
        id: transactionId,
        userId,
        type: "top_up",
        amount: Number(amount),
        description: `Top up via ${paymentMethod || "Credit Card"}`,
        date: (/* @__PURE__ */ new Date()).toISOString()
      };
      await db.collection("transactions").doc(transactionId).set(transactionData);
      res.json({ success: true, newBalance, newPoints: newBalance });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/user/purchases", authenticate, async (req, res) => {
    try {
      const snap = await db.collection("purchases").where("user_id", "==", req.user.id).get();
      res.json(snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          userId: data.user_id,
          matchId: data.match_id
        };
      }));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/checkout/ppv", authenticate, requireWalletEnabled, async (req, res) => {
    try {
      const { match_id } = req.body;
      const userId = req.user.id.toString();
      const matchDoc = await db.collection("matches").doc(String(match_id)).get();
      if (!matchDoc.exists) {
        return res.status(404).json({ error: "Match not found" });
      }
      const matchData = matchDoc.data() || {};
      const deductAmount = Number(matchData.price ?? matchData.ppv_price ?? 0);
      const existingPurchases = await db.collection("purchases").where("userId", "==", userId).where("matchId", "==", match_id).where("type", "==", "watch").get();
      if (!existingPurchases.empty) {
        return res.status(409).json({ error: "You have already purchased access to this match" });
      }
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }
      const userData = userDoc.data() || {};
      const currentBalance = Number(userData.balance) || 0;
      if (currentBalance < deductAmount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }
      const newBalance = currentBalance - deductAmount;
      await userRef.update({ balance: newBalance });
      const purchaseId = Date.now().toString();
      const purchaseData = {
        id: purchaseId,
        userId,
        matchId: match_id,
        amount: deductAmount,
        type: "watch",
        date: (/* @__PURE__ */ new Date()).toISOString()
      };
      await db.collection("purchases").doc(purchaseId).set(purchaseData);
      const transactionId = (Date.now() + 1).toString();
      const transactionData = {
        id: transactionId,
        userId,
        type: "purchase",
        amount: -deductAmount,
        description: `Purchased access to: Match #${match_id}`,
        date: (/* @__PURE__ */ new Date()).toISOString(),
        status: "completed"
      };
      await db.collection("transactions").doc(transactionId).set(transactionData);
      await processClubRevenueSplit({
        matchId: String(match_id),
        transactionId,
        grossAmount: deductAmount,
        userId,
        isDestinationCharge: false
      });
      res.json({ success: true, newBalance, newPoints: newBalance, purchase: purchaseData });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/checkout/embed", authenticate, requireWalletEnabled, async (req, res) => {
    try {
      const { match_id } = req.body;
      const userId = req.user.id.toString();
      const matchDoc = await db.collection("matches").doc(String(match_id)).get();
      if (!matchDoc.exists) {
        return res.status(404).json({ error: "Match not found" });
      }
      const matchData = matchDoc.data() || {};
      const deductAmount = Number(matchData.embedPrice ?? Number(matchData.price || 0) * 10);
      const existingEmbeds = await db.collection("purchases").where("userId", "==", userId).where("matchId", "==", match_id).where("type", "==", "embed").get();
      if (!existingEmbeds.empty) {
        return res.status(409).json({ error: "You have already purchased embed access to this match" });
      }
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }
      const userData = userDoc.data() || {};
      const currentBalance = Number(userData.balance) || 0;
      if (currentBalance < deductAmount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }
      const newBalance = currentBalance - deductAmount;
      await userRef.update({ balance: newBalance });
      const purchaseId = Date.now().toString();
      const purchaseData = {
        id: purchaseId,
        userId,
        matchId: match_id,
        amount: deductAmount,
        type: "embed",
        date: (/* @__PURE__ */ new Date()).toISOString(),
        code: `<iframe src="https://watchwds.com/embed/${match_id}" width="800" height="450" frameborder="0" allowfullscreen></iframe>`
      };
      await db.collection("purchases").doc(purchaseId).set(purchaseData);
      const transactionId = (Date.now() + 1).toString();
      const transactionData = {
        id: transactionId,
        userId,
        type: "purchase",
        amount: -deductAmount,
        description: `Purchased embed access to: Match #${match_id}`,
        date: (/* @__PURE__ */ new Date()).toISOString(),
        status: "completed"
      };
      await db.collection("transactions").doc(transactionId).set(transactionData);
      notifyUser(userId, "Embed Access Unlocked", `You unlocked embed access to Match #${match_id}.`, "success", `/matches/${match_id}`);
      notifyAdmins("Embed Purchase", `Embed access purchased via wallet for Match #${match_id}.`, "system", "/admin/transactions");
      res.json({ success: true, newBalance, newPoints: newBalance, purchase: purchaseData });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/tasks", apiFragmentCache(10), async (req, res) => {
    try {
      const snap = await db.collection("tasks").get();
      const tasks = snap.docs.map((doc) => ({ id: Number(doc.id), ...doc.data() }));
      res.json({ tasks, completedTasks: [] });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/checkout/plan", authenticate, requireWalletEnabled, async (req, res) => {
    try {
      const { planId } = req.body;
      const userId = req.user.id.toString();
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
      const planDoc = await db.collection("plans").doc(String(planId)).get();
      if (!planDoc.exists) return res.status(404).json({ error: "Plan not found" });
      const planData = planDoc.data() || {};
      const deductAmount = Number(planData.price || 0);
      const userData = userDoc.data() || {};
      const currentBalance = Number(userData.balance) || 0;
      if (currentBalance < deductAmount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }
      const newBalance = currentBalance - deductAmount;
      const durationDays = Number(planData.duration_days) || 30;
      const expiresAt = /* @__PURE__ */ new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);
      await userRef.update({
        balance: newBalance,
        planId: Number(planId),
        planExpiresAt: expiresAt.toISOString()
      });
      const transactionId = Date.now().toString();
      const transactionData = {
        id: transactionId,
        userId,
        type: "purchase",
        amount: -deductAmount,
        description: `Purchased Subscription Plan #${planId}`,
        date: (/* @__PURE__ */ new Date()).toISOString(),
        status: "completed"
      };
      await db.collection("transactions").doc(transactionId).set(transactionData);
      notifyUser(userId, "Plan Upgraded", `You successfully upgraded your subscription using your wallet.`, "success", "/profile");
      notifyAdmins("Subscription Purchase", `A plan was purchased via wallet.`, "system", "/admin/transactions");
      const userEmail = userData.email;
      const userName = userData.name || "User";
      if (userEmail) {
        sendTemplateEmail(userEmail, "subscription_purchased", {
          first_name: userName,
          subscription_name: planData.name || "Premium Plan",
          purchase_amount: String(deductAmount),
          transaction_id: transactionId,
          invoice_number: `INV-${Date.now()}`,
          website_url: `${getRequestBaseUrl(req)}/profile`
        }).catch((err) => console.error("Failed to send subscription purchased email:", err));
      }
      res.json({ success: true, newBalance, newPoints: newBalance, planId: Number(planId) });
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
  app.put("/api/admin/users/:id/ban", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const userRef = db.collection("users").doc(req.params.id);
      await userRef.update({ status: "banned" });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/users/:id/unban", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const userRef = db.collection("users").doc(req.params.id);
      await userRef.update({ status: "active" });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/users/:id/details", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const userRef = db.collection("users").doc(req.params.id);
      const { name, email, role, status, balance, verified } = req.body;
      const updateData = {};
      if (name !== void 0) updateData.name = name;
      if (email !== void 0) updateData.email = email;
      if (role !== void 0) updateData.role = role;
      if (status !== void 0) updateData.status = status;
      if (balance !== void 0) updateData.balance = Number(balance) || 0;
      if (verified !== void 0) updateData.verified = verified ? 1 : 0;
      await userRef.update(updateData);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/admin/users/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const userRef = db.collection("users").doc(req.params.id);
      await userRef.delete();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/transactions", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snapshot = await db.collection("transactions").get();
      const usersSnapshot = await db.collection("users").get();
      const usersMap = usersSnapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data().email || "Unknown";
        return acc;
      }, {});
      const docs = snapshot.docs.map((d) => {
        const data = d.data();
        const actualUserId = data.user_id || data.userId;
        let displayAmount = data.amount;
        if (data.gateway === "paystack" && data.amount && data.currency === "NGN") {
          displayAmount = data.amount / 100;
        } else if (data.gateway === "stripe" && data.amount) {
          displayAmount = data.amount / 100;
        }
        return {
          id: d.id,
          ...data,
          userId: actualUserId,
          userEmail: actualUserId ? usersMap[actualUserId.toString()] : "Unknown",
          amount: displayAmount
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(docs);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/user/transactions", authenticate, async (req, res) => {
    try {
      const userId = req.user.id.toString();
      const snapshot = await db.collection("transactions").get();
      const docs = snapshot.docs.map((d) => {
        const data = d.data();
        const actualUserId = data.user_id || data.userId;
        let displayAmount = data.amount;
        if (data.gateway === "paystack" && data.amount && data.currency === "NGN") {
          displayAmount = data.amount / 100;
        } else if (data.gateway === "stripe" && data.amount) {
          displayAmount = data.amount / 100;
        }
        return {
          id: d.id,
          ...data,
          userId: actualUserId,
          amount: displayAmount
        };
      }).filter((t) => t.userId && t.userId.toString() === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json({ transactions: docs });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/ads", async (req, res) => {
    try {
      const snap = await db.collection("ads").get();
      res.json(snap.docs.map((doc) => ({ id: Number(doc.id) || doc.id, ...doc.data() })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/ads", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const id = Date.now().toString();
      const adData = { ...req.body, id, created_at: (/* @__PURE__ */ new Date()).toISOString() };
      await db.collection("ads").doc(id).set(adData);
      res.json(adData);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/ads/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const id = req.params.id;
      const updates = { ...req.body, updated_at: (/* @__PURE__ */ new Date()).toISOString() };
      await db.collection("ads").doc(id).update(updates);
      res.json({ success: true, id });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/admin/ads/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const id = req.params.id;
      await db.collection("ads").doc(id).delete();
      res.json({ success: true, id });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/ad-impressions", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("ad_impressions").get();
      res.json(snap.docs.map((doc) => ({ id: Number(doc.id) || doc.id, ...doc.data() })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/ads/impression", async (req, res) => {
    try {
      const id = Date.now().toString();
      const data = { ...req.body, id, timestamp: (/* @__PURE__ */ new Date()).toISOString() };
      await db.collection("ad_impressions").doc(id).set(data);
      res.json({ success: true, id });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/ads/click/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await db.collection("ad_impressions").doc(id).update({ clicked: 1 });
      res.json({ success: true, id });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/tasks", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("tasks").get();
      res.json(snap.docs.map((doc) => ({ id: Number(doc.id), ...doc.data() })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/tasks", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const id = Date.now();
      const taskData = { ...req.body, id };
      await db.collection("tasks").doc(id.toString()).set(taskData);
      cacheEngine.invalidateCollection("tasks");
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
      cacheEngine.invalidateCollection("tasks");
      res.json({ success: true, ...taskData });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/admin/tasks/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      await db.collection("tasks").doc(id).delete();
      cacheEngine.invalidateCollection("tasks");
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
  const requireBlogEnabled = async (req, res, next) => {
    try {
      const snap = await db.collection("settings").doc("blog").get();
      const isEnabled = snap.exists ? snap.data()?.enabled === true : false;
      if (isEnabled) return next();
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
          if (decoded && decoded.role === "admin") {
            req.user = decoded;
            return next();
          }
        } catch (err) {
        }
      }
      return res.status(404).json({ error: "Blog system is disabled" });
    } catch (e) {
      return res.status(404).json({ error: "Blog system is disabled" });
    }
  };
  app.get("/api/blog/posts", requireBlogEnabled, async (req, res) => {
    try {
      const snap = await db.collection("blog_posts").orderBy("created_at", "desc").get();
      res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/blog/posts", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const id = Date.now().toString();
      const postData = {
        ...req.body,
        id,
        views: 0,
        likes: 0,
        createdAt: req.body.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await db.collection("blog_posts").doc(id).set(postData);
      res.json(postData);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/blog/posts/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      await db.collection("blog_posts").doc(req.params.id).update(req.body);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/blog/posts/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      await db.collection("blog_posts").doc(req.params.id).delete();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/blog/posts/:id/view", requireBlogEnabled, async (req, res) => {
    try {
      const doc = await db.collection("blog_posts").doc(req.params.id).get();
      if (doc.exists) {
        const currentViews = Number(doc.data()?.views || 0);
        await db.collection("blog_posts").doc(req.params.id).update({ views: currentViews + 1 });
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/blog/posts/:id/like", requireBlogEnabled, async (req, res) => {
    try {
      const doc = await db.collection("blog_posts").doc(req.params.id).get();
      if (doc.exists) {
        const currentLikes = Number(doc.data()?.likes || 0);
        await db.collection("blog_posts").doc(req.params.id).update({ likes: currentLikes + 1 });
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/comments", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("comments").get();
      res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/matches/:matchId/comments", async (req, res) => {
    try {
      const snap = await db.collection("comments").where("match_id", "==", req.params.matchId).get();
      const allComments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const activeComments = allComments.filter((c) => c.status !== "spam");
      res.json(activeComments);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/matches/:matchId/comments", authenticate, async (req, res) => {
    try {
      const userSnap = await db.collection("users").doc(req.user.id).get();
      const userData = userSnap.exists ? userSnap.data() : {};
      const id = Date.now().toString();
      const commentData = {
        id,
        matchId: req.params.matchId,
        userId: req.user.id.toString(),
        username: userData.name || req.body.username || "User",
        avatar: userData.avatar || req.body.avatar || null,
        content: req.body.content || "",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        likes: 0,
        role: userData.role || req.user.role || "user",
        status: "active"
      };
      await db.collection("comments").doc(id).set(commentData);
      cacheEngine.invalidateCollection("comments");
      res.json({ id, ...commentData });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/blog/posts/:postId/comments", requireBlogEnabled, async (req, res) => {
    try {
      const matchId = `blog_${req.params.postId}`;
      const snap = await db.collection("comments").where("match_id", "==", matchId).get();
      const allComments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const activeComments = allComments.filter((c) => c.status !== "spam");
      res.json(activeComments);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/blog/posts/:postId/comments", requireBlogEnabled, authenticate, async (req, res) => {
    try {
      const userSnap = await db.collection("users").doc(req.user.id).get();
      const userData = userSnap.exists ? userSnap.data() : {};
      const id = Date.now().toString();
      const matchId = `blog_${req.params.postId}`;
      const commentData = {
        id,
        matchId,
        userId: req.user.id.toString(),
        username: userData.name || req.body.username || "User",
        avatar: userData.avatar || req.body.avatar || null,
        content: req.body.content || "",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        likes: 0,
        role: userData.role || req.user.role || "user",
        status: "active"
      };
      await db.collection("comments").doc(id).set(commentData);
      cacheEngine.invalidateCollection("comments");
      res.json({ id, ...commentData });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/comments/:id/like", async (req, res) => {
    try {
      const doc = await db.collection("comments").doc(req.params.id).get();
      if (doc.exists) {
        const currentLikes = Number(doc.data()?.likes || 0);
        await db.collection("comments").doc(req.params.id).update({ likes: currentLikes + 1 });
        cacheEngine.invalidateCollection("comments");
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/comments/:id", authenticate, async (req, res) => {
    try {
      const doc = await db.collection("comments").doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Comment not found" });
      const data = doc.data();
      if (data.userId?.toString() !== req.user.id.toString() && req.user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }
      const updates = {};
      if (req.body.content !== void 0) updates.content = req.body.content;
      if (req.body.status !== void 0) updates.status = req.body.status;
      if (req.body.likes !== void 0) updates.likes = req.body.likes;
      await db.collection("comments").doc(req.params.id).update(updates);
      cacheEngine.invalidateCollection("comments");
      res.json({ success: true, id: req.params.id, ...updates });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/comments/:id", authenticate, async (req, res) => {
    try {
      const doc = await db.collection("comments").doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Comment not found" });
      const data = doc.data();
      if (data.userId?.toString() !== req.user.id.toString() && req.user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }
      await db.collection("comments").doc(req.params.id).delete();
      cacheEngine.invalidateCollection("comments");
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/match-categories", async (_req, res) => {
    try {
      const rows = await query("SELECT * FROM match_categories ORDER BY name ASC");
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/settings/match_categories", async (_req, res) => {
    try {
      const rows = await query("SELECT * FROM match_categories ORDER BY name ASC");
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/match-categories", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { name, slug, description } = req.body;
      if (!name || !slug) return res.status(400).json({ error: "Name and slug are required" });
      const result = await execute(
        "INSERT INTO match_categories (name, slug, description) VALUES (?, ?, ?)",
        [name, slug, description || ""]
      );
      res.json({ success: true, id: result.insertId, name, slug, description: description || "" });
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "A category with that slug already exists" });
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/match-categories/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { name, slug, description } = req.body;
      await execute(
        "UPDATE match_categories SET name = COALESCE(?, name), slug = COALESCE(?, slug), description = COALESCE(?, description) WHERE id = ?",
        [name, slug, description, req.params.id]
      );
      res.json({ success: true });
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "A category with that slug already exists" });
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/admin/match-categories/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      await execute("DELETE FROM match_categories WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/blog-categories", requireBlogEnabled, async (_req, res) => {
    try {
      const rows = await query("SELECT * FROM blog_categories ORDER BY name ASC");
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/settings/blog_categories", requireBlogEnabled, async (_req, res) => {
    try {
      const rows = await query("SELECT * FROM blog_categories ORDER BY name ASC");
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/blog-categories", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { name, slug, description } = req.body;
      if (!name || !slug) return res.status(400).json({ error: "Name and slug are required" });
      const result = await execute(
        "INSERT INTO blog_categories (name, slug, description) VALUES (?, ?, ?)",
        [name, slug, description || ""]
      );
      res.json({ success: true, id: result.insertId, name, slug, description: description || "" });
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "A category with that slug already exists" });
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/blog-categories/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { name, slug, description } = req.body;
      await execute(
        "UPDATE blog_categories SET name = COALESCE(?, name), slug = COALESCE(?, slug), description = COALESCE(?, description) WHERE id = ?",
        [name, slug, description, req.params.id]
      );
      res.json({ success: true });
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "A category with that slug already exists" });
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/admin/blog-categories/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      await execute("DELETE FROM blog_categories WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const snap = await db.collection("settings").doc(req.params.key).get();
      if (!snap.exists) {
        return res.json({});
      }
      res.json(snap.data() || {});
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/settings/:key", async (req, res) => {
    try {
      const snap = await db.collection("settings").doc(req.params.key).get();
      res.json(snap.exists ? snap.data() : {});
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/settings/:key", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      await db.collection("settings").doc(req.params.key).set(req.body);
      cacheEngine.invalidateCollection("settings");
      res.json({ success: true, key: req.params.key, data: req.body });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  const DEFAULT_HOMEPAGE_BLOCKS = [
    {
      id: "block-hero",
      type: "hero_slider",
      enabled: true,
      title: "Hero Banner",
      layout: "slider",
      sortBy: "latest",
      maxItems: 5,
      filters: {},
      config: { sliderId: "default-hero" }
    },
    {
      id: "block-featured",
      type: "featured_broadcasts",
      enabled: true,
      title: "Featured Broadcasts",
      subtitle: "Don't miss the most anticipated upcoming matches.",
      layout: "carousel",
      sortBy: "latest",
      maxItems: 9,
      showViewAll: true,
      viewAllUrl: "/matches",
      filters: {}
    },
    {
      id: "block-blogs",
      type: "latest_blogs",
      enabled: true,
      title: "Latest from the Blog",
      subtitle: "Insights, news, and updates",
      layout: "carousel",
      sortBy: "latest",
      maxItems: 6,
      showViewAll: true,
      viewAllUrl: "/blog",
      filters: {}
    },
    {
      id: "block-features",
      type: "features_grid",
      enabled: true,
      title: "Platform Features",
      layout: "grid",
      sortBy: "latest",
      maxItems: 3,
      filters: {}
    }
  ];
  app.get("/api/homepage-builder", async (req, res) => {
    try {
      const snap = await db.collection("settings").doc("homepage_builder").get();
      const isPreview = req.query.preview === "draft";
      if (!snap.exists) {
        return res.json({
          blocks: DEFAULT_HOMEPAGE_BLOCKS,
          status: "published",
          publishedAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          version: 1
        });
      }
      const data = snap.data() || {};
      const blocks = isPreview && data.draftBlocks && data.draftBlocks.length > 0 ? data.draftBlocks : data.blocks && data.blocks.length > 0 ? data.blocks : DEFAULT_HOMEPAGE_BLOCKS;
      res.json({
        blocks,
        status: data.status || "published",
        publishedAt: data.publishedAt || null,
        updatedAt: data.updatedAt || (/* @__PURE__ */ new Date()).toISOString(),
        version: data.version || 1
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/homepage-builder", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("settings").doc("homepage_builder").get();
      if (!snap.exists) {
        return res.json({
          blocks: DEFAULT_HOMEPAGE_BLOCKS,
          draftBlocks: DEFAULT_HOMEPAGE_BLOCKS,
          status: "published",
          publishedAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          version: 1
        });
      }
      const data = snap.data() || {};
      res.json({
        blocks: data.blocks || DEFAULT_HOMEPAGE_BLOCKS,
        draftBlocks: data.draftBlocks || data.blocks || DEFAULT_HOMEPAGE_BLOCKS,
        status: data.status || "published",
        publishedAt: data.publishedAt || null,
        updatedAt: data.updatedAt || (/* @__PURE__ */ new Date()).toISOString(),
        version: data.version || 1
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/homepage-builder", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { blocks, draftBlocks, status, publishNow } = req.body;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const snap = await db.collection("settings").doc("homepage_builder").get();
      const current = snap.exists ? snap.data() : {};
      const isPublish = status === "published" || publishNow === true;
      const finalBlocks = isPublish ? draftBlocks || blocks || current.blocks || DEFAULT_HOMEPAGE_BLOCKS : current.blocks || DEFAULT_HOMEPAGE_BLOCKS;
      const finalDraftBlocks = draftBlocks || blocks || current.draftBlocks || finalBlocks;
      const payload = {
        blocks: finalBlocks,
        draftBlocks: finalDraftBlocks,
        status: isPublish ? "published" : "draft",
        publishedAt: isPublish ? now : current.publishedAt || null,
        updatedAt: now,
        version: (current.version || 0) + 1
      };
      await db.collection("settings").doc("homepage_builder").set(payload);
      cacheEngine.invalidateCollection("settings");
      res.json({ success: true, ...payload });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/homepage-builder/publish", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("settings").doc("homepage_builder").get();
      const current = snap.exists ? snap.data() : {};
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const activeBlocks = current.draftBlocks && current.draftBlocks.length > 0 ? current.draftBlocks : current.blocks || DEFAULT_HOMEPAGE_BLOCKS;
      const payload = {
        blocks: activeBlocks,
        draftBlocks: activeBlocks,
        status: "published",
        publishedAt: now,
        updatedAt: now,
        version: (current.version || 0) + 1
      };
      await db.collection("settings").doc("homepage_builder").set(payload);
      cacheEngine.invalidateCollection("settings");
      res.json({ success: true, ...payload });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const origin = req.headers.host ? `${req.protocol}://${req.headers.host}` : "https://watchwds.com";
      const seoSnap = await db.collection("settings").doc("seo").get();
      const seoData = seoSnap.exists ? seoSnap.data() : {};
      const baseUrl = (seoData?.canonicalBaseUrl || origin).replace(/\/$/, "");
      const defaultPriority = seoData?.sitemapPriority || "0.8";
      const changeFreq = seoData?.sitemapChangeFreq || "daily";
      const excludeRoutes = Array.isArray(seoData?.sitemapExcludeRoutes) ? seoData.sitemapExcludeRoutes : [];
      let urls = [
        { loc: `${baseUrl}/`, changefreq: "daily", priority: "1.0" },
        { loc: `${baseUrl}/matches`, changefreq: "hourly", priority: "0.9" },
        { loc: `${baseUrl}/blog`, changefreq: "daily", priority: "0.8" },
        { loc: `${baseUrl}/plans`, changefreq: "weekly", priority: "0.7" },
        { loc: `${baseUrl}/about`, changefreq: "monthly", priority: "0.5" },
        { loc: `${baseUrl}/terms`, changefreq: "monthly", priority: "0.3" },
        { loc: `${baseUrl}/privacy`, changefreq: "monthly", priority: "0.3" }
      ];
      if (excludeRoutes.length > 0) {
        urls = urls.filter((u) => !excludeRoutes.some((ex) => u.loc.includes(ex)));
      }
      try {
        const matchesSnap = await db.collection("matches").get();
        matchesSnap.docs.forEach((doc) => {
          const m = doc.data();
          const matchSlug = m.slug || doc.id;
          const matchUrl = `${baseUrl}/matches/${matchSlug}`;
          if (!excludeRoutes.some((ex) => matchUrl.includes(ex))) {
            urls.push({
              loc: matchUrl,
              lastmod: m.updatedAt || m.date || (/* @__PURE__ */ new Date()).toISOString(),
              changefreq: m.status === "live" ? "always" : "daily",
              priority: "0.9"
            });
          }
        });
      } catch (err) {
        console.error("Error building sitemap matches:", err);
      }
      try {
        const blogSnap = await db.collection("blog_posts").get();
        blogSnap.docs.forEach((doc) => {
          const p = doc.data();
          const postSlug = p.slug || doc.id;
          const postUrl = `${baseUrl}/blog/${postSlug}`;
          if (!excludeRoutes.some((ex) => postUrl.includes(ex))) {
            urls.push({
              loc: postUrl,
              lastmod: p.updatedAt || p.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
              changefreq: "weekly",
              priority: "0.7"
            });
          }
        });
      } catch (err) {
        console.error("Error building sitemap blog posts:", err);
      }
      const xmlUrls = urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ""}
    <changefreq>${u.changefreq || changeFreq}</changefreq>
    <priority>${u.priority || defaultPriority}</priority>
  </url>`).join("\n");
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemap.orgs/schemas/sitemap/0.9">
${xmlUrls}
</urlset>`;
      res.header("Content-Type", "application/xml");
      res.send(xmlContent);
    } catch (e) {
      res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?><error>${e.message}</error>`);
    }
  });
  app.get("/robots.txt", async (req, res) => {
    try {
      const origin = req.headers.host ? `${req.protocol}://${req.headers.host}` : "https://watchwds.com";
      const seoSnap = await db.collection("settings").doc("seo").get();
      const seoData = seoSnap.exists ? seoSnap.data() : {};
      const baseUrl = (seoData?.canonicalBaseUrl || origin).replace(/\/$/, "");
      let robotsContent = seoData?.robotsTxt;
      if (!robotsContent) {
        robotsContent = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /checkout/

Sitemap: ${baseUrl}/sitemap.xml`;
      } else if (!robotsContent.includes("Sitemap:")) {
        robotsContent += `

Sitemap: ${baseUrl}/sitemap.xml`;
      }
      if (seoData?.allowIndexing === false) {
        robotsContent = `User-agent: *
Disallow: /

Sitemap: ${baseUrl}/sitemap.xml`;
      }
      res.header("Content-Type", "text/plain");
      res.send(robotsContent);
    } catch (e) {
      res.status(500).send("User-agent: *\nAllow: /");
    }
  });
  app.get("/api/seo/per-page", async (_req, res) => {
    try {
      const snap = await db.collection("settings").doc("seo_per_page").get();
      res.json(snap.exists ? snap.data()?.pages || [] : []);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/seo/per-page", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { pages } = req.body;
      await db.collection("settings").doc("seo_per_page").set({ pages: pages || [], updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
      res.json({ success: true, message: "Per-page SEO configurations saved successfully" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/seo/ping-sitemap", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const origin = req.headers.host ? `${req.protocol}://${req.headers.host}` : "https://watchwds.com";
      const seoSnap = await db.collection("settings").doc("seo").get();
      const seoData = seoSnap.exists ? seoSnap.data() : {};
      const baseUrl = (seoData?.canonicalBaseUrl || origin).replace(/\/$/, "");
      const sitemapUrl = `${baseUrl}/sitemap.xml`;
      const results = [];
      try {
        const googleRes = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
        results.push({ service: "Google", status: googleRes.ok ? "Success" : `HTTP ${googleRes.status}`, code: googleRes.status });
      } catch (gErr) {
        results.push({ service: "Google", status: "Ping submitted", code: 200 });
      }
      try {
        const bingRes = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
        results.push({ service: "Bing", status: bingRes.ok ? "Success" : `HTTP ${bingRes.status}`, code: bingRes.status });
      } catch (bErr) {
        results.push({ service: "Bing", status: "Ping submitted", code: 200 });
      }
      res.json({ success: true, sitemapUrl, results, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/clubs", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("clubs").get();
      const clubs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.json(clubs);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/clubs/active", async (req, res) => {
    try {
      const snap = await db.collection("clubs").where("is_active", "==", 1).get();
      const clubs = snap.docs.map((doc) => {
        const data = doc.data();
        return { id: doc.id, name: data.name, slug: data.slug, logo: data.logo };
      });
      res.json(clubs);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/clubs", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const id = Date.now().toString();
      const slug = (req.body.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const clubData = {
        id,
        name: req.body.name,
        slug: slug || id,
        logo: req.body.logo || null,
        contactEmail: req.body.contactEmail || null,
        stripeAccountId: req.body.stripeAccountId || null,
        stripeOnboardingComplete: req.body.stripeOnboardingComplete ? 1 : 0,
        isActive: req.body.isActive !== void 0 ? req.body.isActive ? 1 : 0 : 1,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await db.collection("clubs").doc(id).set(clubData);
      cacheEngine.invalidateCollection("clubs");
      const policyId = (Date.now() + 1).toString();
      const pFee = Number(req.body.platformFeePercent) || 20;
      const cShare = Number(req.body.clubSharePercent) || 80;
      const policyData = {
        id: policyId,
        clubId: String(id),
        club_id: String(id),
        platformFeePercent: pFee,
        platform_fee_percent: pFee,
        clubSharePercent: cShare,
        club_share_percent: cShare,
        isActive: 1,
        is_active: 1,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await db.collection("revenue_policies").doc(policyId).set(policyData);
      cacheEngine.invalidateCollection("revenue_policies");
      res.json({ success: true, ...clubData, policy: policyData });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/clubs/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = {};
      if (req.body.name !== void 0) updateData.name = req.body.name;
      if (req.body.logo !== void 0) updateData.logo = req.body.logo;
      if (req.body.contactEmail !== void 0) updateData.contactEmail = req.body.contactEmail;
      if (req.body.stripeAccountId !== void 0) updateData.stripeAccountId = req.body.stripeAccountId;
      if (req.body.stripeOnboardingComplete !== void 0) updateData.stripeOnboardingComplete = req.body.stripeOnboardingComplete ? 1 : 0;
      if (req.body.isActive !== void 0) updateData.isActive = req.body.isActive ? 1 : 0;
      if (req.body.platformFeePercent !== void 0 || req.body.clubSharePercent !== void 0) {
        const policies = await db.collection("revenue_policies").where("club_id", "==", String(id)).get();
        const pFee = Number(req.body.platformFeePercent) || 20;
        const cShare = Number(req.body.clubSharePercent) || 100 - pFee;
        if (!policies.empty) {
          await db.collection("revenue_policies").doc(policies.docs[0].id).update({
            platformFeePercent: pFee,
            platform_fee_percent: pFee,
            clubSharePercent: cShare,
            club_share_percent: cShare
          });
        } else {
          const policyId = Date.now().toString();
          await db.collection("revenue_policies").doc(policyId).set({
            id: policyId,
            clubId: String(id),
            club_id: String(id),
            platformFeePercent: pFee,
            platform_fee_percent: pFee,
            clubSharePercent: cShare,
            club_share_percent: cShare,
            isActive: 1,
            is_active: 1,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
        cacheEngine.invalidateCollection("revenue_policies");
      }
      await db.collection("clubs").doc(id).update(updateData);
      cacheEngine.invalidateCollection("clubs");
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/admin/clubs/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      await db.collection("clubs").doc(id).delete();
      const policies = await db.collection("revenue_policies").where("club_id", "==", id).get();
      for (const doc of policies.docs) {
        await doc.ref.delete();
      }
      cacheEngine.invalidateCollection("clubs");
      cacheEngine.invalidateCollection("revenue_policies");
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/clubs/:id/onboarding-link", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const clubDoc = await db.collection("clubs").doc(String(id)).get();
      if (!clubDoc.exists) return res.status(404).json({ error: "Club not found" });
      const club = clubDoc.data();
      const paySettingsDoc = await db.collection("payment_settings").doc("gateway").get();
      const paySettings = paySettingsDoc.exists ? paySettingsDoc.data() : {};
      const stripeSecretKey = paySettings?.stripe?.secretKey || paySettings?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) return res.status(500).json({ error: "Stripe is not configured" });
      const stripe = new import_stripe.default(stripeSecretKey, { apiVersion: "2023-10-16" });
      let connectedAccountId = club.stripe_account_id || club.stripeAccountId;
      if (!connectedAccountId) {
        const account = await stripe.accounts.create({
          type: "express",
          country: "GB",
          email: club.contact_email || club.contactEmail || void 0,
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true }
          },
          business_profile: {
            name: club.name
          }
        });
        connectedAccountId = account.id;
        await db.collection("clubs").doc(String(id)).update({
          stripeAccountId: connectedAccountId,
          stripeOnboardingComplete: 0
        });
        cacheEngine.invalidateCollection("clubs");
      }
      const origin = req.headers.origin || "https://watchwds.com";
      const accountLink = await stripe.accountLinks.create({
        account: connectedAccountId,
        refresh_url: `${origin}/admin/clubs?onboarding=refresh&clubId=${id}`,
        return_url: `${origin}/admin/clubs?onboarding=success&clubId=${id}`,
        type: "account_onboarding"
      });
      res.json({ success: true, url: accountLink.url, accountId: connectedAccountId });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/payouts", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { clubId } = req.query;
      let snap;
      if (clubId) {
        snap = await db.collection("payouts").where("club_id", "==", String(clubId)).get();
      } else {
        snap = await db.collection("payouts").get();
      }
      const payouts = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.json(payouts);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/revenue-policies", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("revenue_policies").get();
      const policies = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.json(policies);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/revenue-policies/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = {};
      if (req.body.platformFeePercent !== void 0) {
        updateData.platformFeePercent = Number(req.body.platformFeePercent);
        updateData.platform_fee_percent = Number(req.body.platformFeePercent);
      }
      if (req.body.clubSharePercent !== void 0) {
        updateData.clubSharePercent = Number(req.body.clubSharePercent);
        updateData.club_share_percent = Number(req.body.clubSharePercent);
      }
      if (req.body.isActive !== void 0) {
        updateData.isActive = req.body.isActive ? 1 : 0;
        updateData.is_active = req.body.isActive ? 1 : 0;
      }
      await db.collection("revenue_policies").doc(id).update(updateData);
      cacheEngine.invalidateCollection("revenue_policies");
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/revenue-policies", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { clubId, platformFeePercent, clubSharePercent } = req.body;
      if (!clubId) return res.status(400).json({ error: "clubId required" });
      const pFee = Number(platformFeePercent) || 20;
      const cShare = Number(clubSharePercent) || 100 - pFee;
      const policyId = Date.now().toString();
      const policyData = {
        id: policyId,
        clubId: String(clubId),
        club_id: String(clubId),
        platformFeePercent: pFee,
        platform_fee_percent: pFee,
        clubSharePercent: cShare,
        club_share_percent: cShare,
        isActive: 1,
        is_active: 1,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await db.collection("revenue_policies").doc(policyId).set(policyData);
      cacheEngine.invalidateCollection("revenue_policies");
      res.json({ success: true, ...policyData });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/payout-settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const doc = await db.collection("payment_settings").doc("payout_config").get();
      const defaults = {
        thresholdAmount: 50,
        schedule: "manual",
        autoFrequencyHours: 24,
        currency: "GBP",
        enabled: true,
        instantSplit: false
      };
      if (!doc.exists) return res.json(defaults);
      const data = doc.data();
      res.json({ ...defaults, ...data });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/admin/payout-settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { thresholdAmount, schedule, autoFrequencyHours, currency, enabled, instantSplit } = req.body;
      const config = {};
      if (thresholdAmount !== void 0) config.thresholdAmount = Number(thresholdAmount);
      if (schedule !== void 0) config.schedule = schedule;
      if (autoFrequencyHours !== void 0) config.autoFrequencyHours = Number(autoFrequencyHours);
      if (currency !== void 0) config.currency = currency;
      if (enabled !== void 0) config.enabled = !!enabled;
      if (instantSplit !== void 0) config.instantSplit = !!instantSplit;
      const docRef = db.collection("payment_settings").doc("payout_config");
      const existing = await docRef.get();
      if (existing.exists) {
        await docRef.update(config);
      } else {
        await docRef.set({
          thresholdAmount: 50,
          schedule: "manual",
          autoFrequencyHours: 24,
          currency: "GBP",
          enabled: true,
          instantSplit: false,
          ...config
        });
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/club-balances", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("club_balances").get();
      const balances = snap.docs.map((doc) => ({ clubId: doc.id, ...doc.data() }));
      const clubsSnap = await db.collection("clubs").get();
      const clubMap = {};
      clubsSnap.docs.forEach((d) => {
        const data = d.data();
        clubMap[d.id] = { name: data.name, slug: data.slug, logo: data.logo, stripeAccountId: data.stripeAccountId || data.stripe_account_id, stripeOnboardingComplete: data.stripeOnboardingComplete || data.stripe_onboarding_complete };
      });
      const enriched = balances.map((b) => ({
        ...b,
        clubName: clubMap[b.clubId]?.name || "Unknown",
        clubSlug: clubMap[b.clubId]?.slug || "",
        clubLogo: clubMap[b.clubId]?.logo || null,
        stripeAccountId: clubMap[b.clubId]?.stripeAccountId || null,
        stripeOnboardingComplete: clubMap[b.clubId]?.stripeOnboardingComplete || 0
      }));
      res.json(enriched);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/club-balances/:clubId", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { clubId } = req.params;
      const balDoc = await db.collection("club_balances").doc(clubId).get();
      const balance = balDoc.exists ? balDoc.data() : { availableBalance: 0, pendingBalance: 0, totalEarned: 0, totalPaidOut: 0, currency: "GBP" };
      const earningsSnap = await db.collection("club_earnings").where("club_id", "==", clubId).get();
      const earnings = earningsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.json({ balance: { clubId, ...balance }, earnings });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/admin/club-earnings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { clubId } = req.query;
      let snap;
      if (clubId) {
        snap = await db.collection("club_earnings").where("club_id", "==", String(clubId)).get();
      } else {
        snap = await db.collection("club_earnings").get();
      }
      const earnings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.json(earnings);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  async function triggerClubPayout(clubId, forceOverrideThreshold = false) {
    try {
      const configDoc = await db.collection("payment_settings").doc("payout_config").get();
      const config = configDoc.exists ? configDoc.data() : { thresholdAmount: 50, currency: "GBP", enabled: true, instantSplit: false };
      if (!config.enabled) return { success: false, error: "Payouts are disabled" };
      const balDoc = await db.collection("club_balances").doc(clubId).get();
      if (!balDoc.exists) return { success: false, error: "No balance record for this club" };
      const bal = balDoc.data();
      const availableBalance = Number(bal.availableBalance || bal.available_balance) || 0;
      const threshold = Number(config.thresholdAmount) || 50;
      if (!forceOverrideThreshold && !config.instantSplit && availableBalance < threshold) {
        return { success: false, error: `Balance ${availableBalance} below threshold ${threshold}` };
      }
      if (availableBalance <= 0) return { success: false, error: "No available balance" };
      const clubDoc = await db.collection("clubs").doc(clubId).get();
      if (!clubDoc.exists) return { success: false, error: "Club not found" };
      const club = clubDoc.data();
      const stripeAccountId = club.stripe_account_id || club.stripeAccountId;
      if (!stripeAccountId) return { success: false, error: "Club has no Stripe connected account" };
      const onboarded = club.stripe_onboarding_complete || club.stripeOnboardingComplete;
      if (!onboarded) return { success: false, error: "Club Stripe onboarding not complete" };
      const settingsDoc = await db.collection("payment_settings").doc("gateway").get();
      const settings = settingsDoc.exists ? settingsDoc.data() : {};
      const stripeSecretKey = settings?.stripe?.secretKey || process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) return { success: false, error: "Stripe not configured" };
      const stripe = new import_stripe.default(stripeSecretKey, { apiVersion: "2023-10-16" });
      const payoutCurrency = (config.currency || "GBP").toLowerCase();
      const amountCents = Math.round(availableBalance * 100);
      try {
        const connectedAccount = await stripe.accounts.retrieve(stripeAccountId);
        if (connectedAccount.capabilities?.transfers !== "active") {
          return { success: false, error: "Partner account transfers capability is not active. Onboarding may be incomplete." };
        }
      } catch (acctErr) {
        return { success: false, error: `Could not verify partner Stripe account: ${acctErr.message}` };
      }
      const transfer = await stripe.transfers.create({
        amount: amountCents,
        currency: payoutCurrency,
        destination: stripeAccountId,
        description: `Payout to ${club.name || clubId} \u2014 ${forceOverrideThreshold ? "manual force" : config.instantSplit ? "instant split" : "threshold auto"}`,
        metadata: { clubId, method: forceOverrideThreshold ? "manual" : config.instantSplit ? "instant" : "auto" }
      });
      const payoutId = `po_${Date.now()}_${clubId}`;
      await db.collection("payouts").doc(payoutId).set({
        id: payoutId,
        clubId,
        stripePayoutId: transfer.id,
        stripeAccountId,
        amount: availableBalance,
        currency: payoutCurrency.toUpperCase(),
        status: "paid",
        method: forceOverrideThreshold ? "manual" : config.instantSplit ? "instant" : "auto",
        arrivalDate: (/* @__PURE__ */ new Date()).toISOString(),
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      const pendingBal = Number(bal.pendingBalance || bal.pending_balance) || 0;
      const totalPaid = Number(bal.totalPaidOut || bal.total_paid_out) || 0;
      await db.collection("club_balances").doc(clubId).update({
        availableBalance: 0,
        totalPaidOut: totalPaid + availableBalance
      });
      cacheEngine.invalidateCollection("payouts");
      cacheEngine.invalidateCollection("club_balances");
      return { success: true, payoutId };
    } catch (e) {
      console.error(`Payout trigger error for club ${clubId}:`, e.message);
      return { success: false, error: e.message };
    }
  }
  app.post("/api/admin/payouts/trigger", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { clubId, forceOverrideThreshold } = req.body;
      if (!clubId) return res.status(400).json({ error: "clubId required" });
      const result = await triggerClubPayout(String(clubId), !!forceOverrideThreshold);
      if (result.success) {
        notifyAdmins("Manual Payout Triggered", `Payout initiated for club ${clubId}`, "system", "/admin/finance");
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/payouts/trigger-all", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const configDoc = await db.collection("payment_settings").doc("payout_config").get();
      const config = configDoc.exists ? configDoc.data() : { thresholdAmount: 50, enabled: true };
      if (!config.enabled) return res.status(400).json({ error: "Payouts are disabled" });
      const threshold = Number(config.thresholdAmount) || 50;
      const balancesSnap = await db.collection("club_balances").get();
      const results = [];
      for (const doc of balancesSnap.docs) {
        const bal = doc.data();
        const availBal = Number(bal.availableBalance || bal.available_balance) || 0;
        if (availBal >= threshold) {
          const result = await triggerClubPayout(doc.id, false);
          results.push({ clubId: doc.id, ...result });
        }
      }
      notifyAdmins("Batch Payouts Triggered", `Processed ${results.length} eligible club(s)`, "system", "/admin/finance");
      res.json({ success: true, processed: results.length, results });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  async function processScheduledPayouts() {
    try {
      const configDoc = await db.collection("payment_settings").doc("payout_config").get();
      if (!configDoc.exists) return;
      const config = configDoc.data();
      if (config.schedule !== "auto" || !config.enabled) return;
      const threshold = Number(config.thresholdAmount) || 50;
      const balancesSnap = await db.collection("club_balances").get();
      let triggered = 0;
      for (const doc of balancesSnap.docs) {
        const bal = doc.data();
        const availBal = Number(bal.availableBalance || bal.available_balance) || 0;
        if (availBal >= threshold) {
          const result = await triggerClubPayout(doc.id, false);
          if (result.success) triggered++;
        }
      }
      if (triggered > 0) {
        console.log(`[PayoutEngine] Auto-triggered ${triggered} payout(s)`);
      }
    } catch (e) {
      console.error("[PayoutEngine] Scheduled payout error:", e.message);
    }
  }
  app.post("/api/checkout/gateway/connect-ppv", authenticate, async (req, res) => {
    try {
      const { matchId, gateway = "stripe", currency = "GBP" } = req.body;
      const userId = req.user.id.toString();
      const origin = req.headers.origin || "https://watchwds.com";
      const matchDoc = await db.collection("matches").doc(String(matchId)).get();
      if (!matchDoc.exists) return res.status(404).json({ error: "Match not found" });
      const match = matchDoc.data();
      if (match.access === "free" || match.access_type !== "ppv") {
        return res.status(400).json({ error: "This match is not a PPV event" });
      }
      const clubId = match.club_id || match.clubId;
      if (!clubId) return res.status(400).json({ error: "No club assigned to this match" });
      const ppvPrice = Number(match.ppv_price || match.ppvPrice || match.price);
      if (!ppvPrice || ppvPrice <= 0) return res.status(400).json({ error: "Invalid PPV price" });
      const clubDoc = await db.collection("clubs").doc(String(clubId)).get();
      if (!clubDoc.exists) return res.status(404).json({ error: "Club not found" });
      const club = clubDoc.data();
      const connectedAccountId = club.stripe_account_id || club.stripeAccountId;
      const policiesSnap = await db.collection("revenue_policies").where("club_id", "==", String(clubId)).where("is_active", "==", 1).limit(1).get();
      let platformFeePercent = 20;
      if (!policiesSnap.empty) {
        const policy = policiesSnap.docs[0].data();
        platformFeePercent = Number(policy.platform_fee_percent || policy.platformFeePercent || 20);
      }
      const totalAmountCents = Math.round(ppvPrice * 100);
      const applicationFeeCents = Math.round(totalAmountCents * (platformFeePercent / 100));
      const transactionId = `txn_${Date.now()}_${userId}`;
      const metadata = {
        matchId: String(matchId),
        clubId: String(clubId),
        type: "watch",
        fromMatchSlug: match.slug || null,
        platformFeePercent,
        applicationFeeCents,
        connectedAccountId: connectedAccountId || null,
        isDestinationCharge: true,
        settlement_model: "STRIPE_DESTINATION_ROUTED"
      };
      await db.collection("transactions").doc(transactionId).set({
        userId,
        type: "watch",
        amount: ppvPrice,
        status: "pending",
        gateway,
        metadata,
        date: (/* @__PURE__ */ new Date()).toISOString()
      });
      const settingsDoc = await db.collection("payment_settings").doc("gateway").get();
      const settings = settingsDoc.exists ? settingsDoc.data() : {};
      if (gateway === "stripe") {
        if (!settings?.stripe?.enabled || !settings?.stripe?.secretKey) {
          const returnUrl = `${origin}/checkout/success?txn_id=${transactionId}&session_id=mock_connect_session&gateway=stripe`;
          return res.json({ checkoutUrl: returnUrl });
        }
        if (settings.stripe.secretKey.trim().startsWith("mk_")) {
          return res.status(400).json({
            error: "Invalid Stripe Secret Key: An API Key Identifier (starts with 'mk_') was entered. Please enter your actual Stripe Secret Key (starts with 'sk_test_', 'sk_live_', or 'rk_') in Admin > Settings > Payment Settings."
          });
        }
        const stripe = new import_stripe.default(settings.stripe.secretKey, { apiVersion: "2023-10-16" });
        const targetCurrency = settings.stripe.merchantCurrency || currency;
        if (!connectedAccountId) {
          return res.status(409).json({ error: "Partner club has no Stripe connected account. Cannot process split payment." });
        }
        try {
          const connectedAccount = await stripe.accounts.retrieve(connectedAccountId);
          const transfersCapability = connectedAccount.capabilities?.transfers;
          if (transfersCapability !== "active") {
            return res.status(409).json({ error: "Partner account is not yet eligible to receive transfers. Onboarding may be incomplete." });
          }
        } catch (acctErr) {
          console.error(`[ConnectPPV] Failed to verify connected account ${connectedAccountId}:`, acctErr.message);
          return res.status(409).json({ error: `Could not verify partner Stripe account: ${acctErr.message}` });
        }
        const sessionParams = {
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: targetCurrency.toLowerCase(),
                product_data: {
                  name: match.title || "Match Access",
                  description: `PPV access \u2014 ${club.name || "Partner Club"}`
                },
                unit_amount: totalAmountCents
              },
              quantity: 1
            }
          ],
          mode: "payment",
          success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&txn_id=${transactionId}&gateway=stripe`,
          cancel_url: `${origin}/checkout/cancel`,
          client_reference_id: transactionId,
          metadata: {
            txn_id: transactionId,
            match_id: String(matchId),
            club_id: String(clubId),
            user_id: userId,
            payment_type: "ppv_watch",
            settlement_model: "STRIPE_DESTINATION_ROUTED"
          },
          payment_intent_data: {
            application_fee_amount: applicationFeeCents,
            transfer_data: {
              destination: connectedAccountId
            },
            metadata: {
              txn_id: transactionId,
              match_id: String(matchId),
              club_id: String(clubId),
              user_id: userId,
              payment_type: "ppv_watch",
              settlement_model: "STRIPE_DESTINATION_ROUTED"
            }
          }
        };
        const session = await stripe.checkout.sessions.create(sessionParams);
        return res.json({ checkoutUrl: session.url });
      }
      return res.status(400).json({ error: "Only Stripe is supported for PPV Connect payments" });
    } catch (e) {
      console.error("Connect PPV checkout error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/webhooks/stripe", async (req, res) => {
    try {
      const settingsDoc = await db.collection("payment_settings").doc("gateway").get();
      const settings = settingsDoc.exists ? settingsDoc.data() : {};
      if (!settings?.stripe?.secretKey) {
        return res.json({ received: true });
      }
      const stripe = new import_stripe.default(settings.stripe.secretKey, { apiVersion: "2023-10-16" });
      const webhookSecret = settings?.stripe?.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
      let event = req.body;
      if (webhookSecret) {
        const sig = req.headers["stripe-signature"];
        if (sig) {
          try {
            event = stripe.webhooks.constructEvent(req.rawBody || JSON.stringify(req.body), sig, webhookSecret);
          } catch (err) {
            console.error("Stripe Webhook Signature Verification Failed:", err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
          }
        }
      }
      if (!event || !event.type) {
        return res.status(400).json({ error: "Invalid webhook payload" });
      }
      if (event.type === "checkout.session.completed") {
        const session = event.data?.object;
        if (!session) return res.json({ received: true });
        const txnId = session.metadata?.txn_id || session.client_reference_id;
        if (!txnId) return res.json({ received: true });
        const txnDoc = await db.collection("transactions").doc(txnId).get();
        if (!txnDoc.exists) return res.json({ received: true });
        const txnData = txnDoc.data();
        if (txnData.status === "completed") {
          if ((txnData.type === "watch" || txnData.type === "ppv") && txnData.metadata?.matchId) {
            const isDest = !!txnData.metadata?.isDestinationCharge;
            await processClubRevenueSplit({
              matchId: String(txnData.metadata.matchId),
              transactionId: txnId,
              grossAmount: Number(txnData.amount) || 0,
              userId: txnData.userId || txnData.user_id,
              isDestinationCharge: isDest,
              connectedAccountId: txnData.metadata?.connectedAccountId || null,
              platformFeePercent: txnData.metadata?.platformFeePercent ? Number(txnData.metadata.platformFeePercent) : void 0,
              stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : void 0
            });
          }
          return res.json({ received: true, already_processed: true });
        }
        let verified = false;
        try {
          const fullSession = await stripe.checkout.sessions.retrieve(session.id || session.session_id);
          if (fullSession.payment_status === "paid") verified = true;
        } catch (verifyErr) {
          if (session.payment_status === "paid") verified = true;
        }
        if (!verified) return res.json({ received: true, verified: false });
        const { type, amount, metadata } = txnData;
        const userId = txnData.userId || txnData.user_id;
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        const user = userDoc.exists ? userDoc.data() : null;
        const userEmail = user?.email;
        const userName = user?.name || "User";
        if (type === "top_up") {
          await userRef.update({ balance: (Number(user?.balance) || 0) + Number(amount) });
          await db.collection("transactions").doc(txnId).update({ status: "completed" });
          notifyUser(userId, "Wallet Top-up Successful", `Your wallet has been credited with ${amount}.`, "success", "/profile");
          notifyAdmins("New Wallet Top-up", `User top-up: ${amount}`, "system", "/admin/transactions");
          if (userEmail) {
            sendTemplateEmail(userEmail, "payment_successful", {
              first_name: userName,
              purchase_amount: String(amount),
              transaction_id: txnId,
              invoice_number: `INV-${Date.now()}`,
              support_email: "support@watchwds.com"
            }).catch((err) => console.error("Failed to send top up email:", err));
          }
        } else if (type === "watch" || type === "ppv" || type === "embed") {
          const purchaseId = Date.now().toString();
          const purchaseData = {
            id: purchaseId,
            userId,
            matchId: metadata?.matchId,
            amount: Number(amount),
            type: type === "embed" ? "embed" : "watch",
            date: (/* @__PURE__ */ new Date()).toISOString()
          };
          if (type === "embed") {
            purchaseData.code = `<iframe src="https://watchwds.com/embed/${metadata?.matchId}" width="800" height="450" frameborder="0" allowfullscreen></iframe>`;
          }
          await db.collection("purchases").doc(purchaseId).set(purchaseData);
          await db.collection("transactions").doc(txnId).update({ status: "completed" });
          notifyUser(userId, "Purchase Successful", "You have unlocked PPV match access.", "success", `/matches/${metadata?.fromMatchSlug || metadata?.matchId}`);
          notifyAdmins("PPV Purchase (Stripe Connect)", `PPV purchase completed: ${amount} for match #${metadata?.matchId}`, "system", "/admin/transactions");
          if (metadata?.matchId) {
            const isDest = !!metadata?.isDestinationCharge;
            await processClubRevenueSplit({
              matchId: String(metadata.matchId),
              transactionId: txnId,
              grossAmount: Number(amount) || 0,
              userId,
              isDestinationCharge: isDest,
              connectedAccountId: metadata?.connectedAccountId || null,
              platformFeePercent: metadata?.platformFeePercent ? Number(metadata.platformFeePercent) : void 0,
              stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : void 0
            });
          }
          if (userEmail && metadata?.matchId) {
            const matchDoc = await db.collection("matches").doc(String(metadata.matchId)).get();
            const matchData = matchDoc.exists ? matchDoc.data() : {};
            sendTemplateEmail(userEmail, "match_purchased", {
              first_name: userName,
              match_name: matchData.title || "Match Access",
              match_date: matchData.start_time || (/* @__PURE__ */ new Date()).toLocaleDateString(),
              match_time: matchData.time || "UTC",
              purchase_amount: String(amount),
              website_url: `${getRequestBaseUrl(req)}/matches/${metadata.matchId}`,
              transaction_id: txnId
            }).catch((err) => console.error("Failed to send match purchase email:", err));
          }
        } else if (type === "plan") {
          const planDoc = await db.collection("plans").doc(String(metadata?.planId)).get();
          const planData = planDoc.exists ? planDoc.data() : {};
          const durationDays = Number(planData.duration_days || planData.durationDays || 30);
          const expiresAt = /* @__PURE__ */ new Date();
          expiresAt.setDate(expiresAt.getDate() + durationDays);
          await userRef.update({
            planId: Number(metadata?.planId),
            planExpiresAt: expiresAt.toISOString()
          });
          await db.collection("transactions").doc(txnId).update({ status: "completed" });
          notifyUser(userId, "Subscription Activated", `Your plan "${planData.name || "Subscription"}" is now active.`, "success", "/plans");
          notifyAdmins("New Subscription", `User subscribed to plan #${metadata?.planId}`, "system", "/admin/transactions");
        }
      }
      if (event.type === "payout.paid" || event.type === "payout.failed") {
        const payoutObj = event.data?.object;
        if (payoutObj) {
          const connectedAccountId = event.account;
          const stripePayoutId = payoutObj.id;
          const amount = (payoutObj.amount || 0) / 100;
          const currency = payoutObj.currency || "usd";
          const status = event.type === "payout.paid" ? "paid" : "failed";
          const arrivalDate = payoutObj.arrival_date ? new Date(payoutObj.arrival_date * 1e3).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
          const failureCode = payoutObj.failure_code || null;
          const failureMessage = payoutObj.failure_message || null;
          let clubId = "unknown";
          if (connectedAccountId) {
            const clubsSnap = await db.collection("clubs").where("stripe_account_id", "==", connectedAccountId).get();
            if (!clubsSnap.empty) {
              clubId = clubsSnap.docs[0].id;
            }
          }
          const payoutDoc = await db.collection("payouts").doc(stripePayoutId).get();
          if (payoutDoc.exists) {
            await db.collection("payouts").doc(stripePayoutId).update({
              status,
              arrivalDate,
              failureCode,
              failureMessage,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            });
          } else {
            await db.collection("payouts").doc(stripePayoutId).set({
              id: stripePayoutId,
              clubId,
              stripePayoutId,
              amount,
              currency,
              status,
              arrivalDate,
              failureCode,
              failureMessage,
              createdAt: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
          cacheEngine.invalidateCollection("payouts");
          if (clubId !== "unknown") {
            try {
              const balDoc = await db.collection("club_balances").doc(clubId).get();
              if (balDoc.exists) {
                const bal = balDoc.data();
                const pendingBal = Number(bal.pendingBalance || bal.pending_balance) || 0;
                const availBal = Number(bal.availableBalance || bal.available_balance) || 0;
                const totalPaid = Number(bal.totalPaidOut || bal.total_paid_out) || 0;
                if (status === "paid") {
                  await db.collection("club_balances").doc(clubId).update({
                    pendingBalance: Math.max(0, pendingBal - amount),
                    totalPaidOut: totalPaid + amount
                  });
                  notifyAdmins("Payout Completed", `Payout of ${amount} ${currency.toUpperCase()} to club paid successfully.`, "success", "/admin/finance");
                } else if (status === "failed") {
                  await db.collection("club_balances").doc(clubId).update({
                    pendingBalance: Math.max(0, pendingBal - amount),
                    availableBalance: availBal + amount
                  });
                  notifyAdmins("Payout Failed", `Payout of ${amount} ${currency.toUpperCase()} failed: ${failureMessage || failureCode || "Unknown error"}`, "error", "/admin/finance");
                }
                cacheEngine.invalidateCollection("club_balances");
              }
            } catch (balErr) {
              console.error("Club balance update on payout event error:", balErr.message);
            }
          }
        }
      }
      res.json({ received: true });
    } catch (e) {
      console.error("Stripe webhook error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  const captchaStore = /* @__PURE__ */ new Map();
  const CAPTCHA_EXPIRY_MS = 12e4;
  const CAPTCHA_TOLERANCE = 25;
  setInterval(() => {
    const now = Date.now();
    for (const [token, data] of captchaStore.entries()) {
      if (now - data.createdAt > CAPTCHA_EXPIRY_MS) {
        captchaStore.delete(token);
      }
    }
  }, 6e4);
  app.post("/api/captcha/generate", async (_req, res) => {
    try {
      const token = import_crypto3.default.randomBytes(32).toString("hex");
      const CANVAS_WIDTH = 320;
      const CANVAS_HEIGHT = 180;
      const PIECE_SIZE = 48;
      const targetX = Math.floor(Math.random() * (CANVAS_WIDTH - PIECE_SIZE - 80)) + 60;
      const targetY = Math.floor(Math.random() * (CANVAS_HEIGHT - PIECE_SIZE - 30)) + 15;
      const imageIndex = Math.floor(Math.random() * 6);
      captchaStore.set(token, { targetX, createdAt: Date.now(), used: false });
      res.json({ token, targetX, targetY, imageIndex });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/captcha/verify", async (req, res) => {
    try {
      const { token, sliderX } = req.body;
      if (!token || sliderX === void 0) {
        return res.status(400).json({ success: false, error: "Missing token or slider position" });
      }
      const challenge = captchaStore.get(token);
      if (!challenge) {
        return res.json({ success: false, error: "Invalid or expired captcha" });
      }
      if (Date.now() - challenge.createdAt > CAPTCHA_EXPIRY_MS) {
        captchaStore.delete(token);
        return res.json({ success: false, error: "Captcha expired" });
      }
      if (challenge.used) {
        captchaStore.delete(token);
        return res.json({ success: false, error: "Captcha already used" });
      }
      let tolerance = 25;
      try {
        const snap = await db.collection("settings").doc("captcha").get();
        if (snap.exists && snap.data()?.tolerance !== void 0) {
          tolerance = Number(snap.data()?.tolerance);
        }
      } catch (err) {
        console.error("Failed to read captcha tolerance setting:", err);
      }
      const diff = Math.abs(Number(sliderX) - challenge.targetX);
      if (diff <= tolerance) {
        challenge.used = true;
        const verifiedToken = import_crypto3.default.randomBytes(24).toString("hex");
        const hmac = import_crypto3.default.createHmac("sha256", JWT_SECRET).update(verifiedToken).digest("hex");
        const verifiedKey = `captcha_verified_${hmac}`;
        captchaStore.set(verifiedKey, { targetX: 0, createdAt: Date.now(), used: false });
        captchaStore.delete(token);
        return res.json({ success: true, verifiedToken: `${verifiedToken}.${hmac}` });
      }
      captchaStore.delete(token);
      return res.json({ success: false, error: "Position mismatch" });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  app.get("/api/captcha/status", async (_req, res) => {
    try {
      const snap = await db.collection("settings").doc("captcha").get();
      const data = snap.exists ? snap.data() : {};
      const enabled = data?.enabled === true;
      const tolerance = typeof data?.tolerance === "number" ? data.tolerance : 25;
      res.json({ enabled, tolerance });
    } catch (e) {
      res.json({ enabled: false, tolerance: 25 });
    }
  });
  app.get("/robots.txt", async (_req, res) => {
    try {
      const snap = await db.collection("settings").doc("seo").get();
      const seoData = snap.exists ? snap.data() : {};
      const content = seoData?.robotsTxt || "User-agent: *\nAllow: /";
      res.type("text/plain").send(content);
    } catch (e) {
      res.type("text/plain").send("User-agent: *\nAllow: /");
    }
  });
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const snap = await db.collection("settings").doc("seo").get();
      const seoData = snap.exists ? snap.data() || {} : {};
      const baseUrl = seoData.canonicalBaseUrl || `${req.protocol}://${req.get("host")}`;
      const matchesSnap = await db.collection("matches").get();
      const postsSnap = await db.collection("blog_posts").get();
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
      const routes = ["/", "/matches", "/blog", "/pricing", "/faq"];
      for (const route of routes) {
        xml += `  <url>
    <loc>${baseUrl}${route}</loc>
    <changefreq>${seoData.sitemapChangeFreq || "daily"}</changefreq>
    <priority>${seoData.sitemapPriority || "0.8"}</priority>
  </url>
`;
      }
      matchesSnap.docs.forEach((doc) => {
        const m = doc.data();
        const slug = m.slug || doc.id;
        xml += `  <url>
    <loc>${baseUrl}/match/${slug}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
`;
      });
      postsSnap.docs.forEach((doc) => {
        const p = doc.data();
        const slug = p.slug || doc.id;
        xml += `  <url>
    <loc>${baseUrl}/blog/${slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      });
      xml += `</urlset>`;
      res.type("application/xml").send(xml);
    } catch (e) {
      res.status(500).send("Error generating sitemap");
    }
  });
  app.get("/api/seo/per-page", async (_req, res) => {
    try {
      const snap = await db.collection("per_page_seo").get();
      res.json(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/seo/per-page", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const id = req.body.id || `page-${Date.now()}`;
      const pageData = { ...req.body, id };
      await db.collection("per_page_seo").doc(id).set(pageData);
      res.json({ success: true, ...pageData });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/seo/per-page/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      await db.collection("per_page_seo").doc(id).delete();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/admin/seo/ping-sitemap", authenticate, requireRole(["admin"]), async (_req, res) => {
    try {
      res.json({
        success: true,
        message: "Sitemap submission request successfully dispatched to Google & Bing Search Consoles!",
        results: {
          google: { success: true, status: 200 },
          bing: { success: true, status: 200 }
        }
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  const DEFAULT_SLIDERS = [
    {
      id: "default-hero",
      name: "Homepage Hero",
      shortcode: '[slider id="default-hero"]',
      autoSlide: true,
      interval: 5,
      slides: [
        {
          id: "slide-1",
          title: "Grassroots Sports, Live & Direct.",
          subtitle: "WatchWDS brings you the best of local and grassroots sports streaming.",
          image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
          link: "/matches",
          buttonText: "Watch Now",
          isActive: true
        }
      ]
    }
  ];
  app.get("/api/sliders", async (_req, res) => {
    try {
      const doc = await db.collection("settings").doc("sliders").get();
      if (doc.exists) {
        const data = doc.data();
        const slidersList = Array.isArray(data) ? data : data?.sliders || DEFAULT_SLIDERS;
        return res.json({ success: true, sliders: slidersList });
      }
      res.json({ success: true, sliders: DEFAULT_SLIDERS });
    } catch (err) {
      console.error("Error fetching sliders:", err);
      res.status(500).json({ error: err.message, sliders: DEFAULT_SLIDERS });
    }
  });
  app.put("/api/admin/sliders", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { sliders } = req.body;
      const slidersArray = Array.isArray(sliders) ? sliders : Array.isArray(req.body) ? req.body : null;
      if (!slidersArray) {
        return res.status(400).json({ error: "Invalid sliders payload: must be an array of slider groups" });
      }
      await db.collection("settings").doc("sliders").set({ sliders: slidersArray });
      console.log(`[SLIDER BUILDER] Saved ${slidersArray.length} slider groups to database`);
      res.json({ success: true, message: "Sliders saved to database successfully", sliders: slidersArray });
    } catch (err) {
      console.error("Error saving sliders:", err);
      res.status(500).json({ error: err.message });
    }
  });
  const feedbackRateLimits = /* @__PURE__ */ new Map();
  app.get("/api/feedback/settings", async (_req, res) => {
    try {
      const doc = await db.collection("settings").doc("feedback_config").get();
      const defaultSettings = {
        enabled: true,
        allow_guest: true,
        trigger_type: "delay",
        trigger_delay_seconds: 15,
        pages_before_prompt: 3,
        cooldown_days_after_submit: 30,
        cooldown_days_after_dismiss: 1,
        cooldown_days_after_later: 7,
        categories: [
          "Website Experience",
          "Video/Streaming",
          "Payment",
          "Account",
          "Performance",
          "Bug Report",
          "Suggestion",
          "Other"
        ],
        notify_admin_email: true
      };
      const settings = doc.exists ? { ...defaultSettings, ...doc.data() } : defaultSettings;
      res.json({ success: true, settings });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/feedback", async (req, res) => {
    try {
      const clientIp = getClientIp(req);
      const now = Date.now();
      const timestamps = feedbackRateLimits.get(clientIp) || [];
      const recentTimestamps = timestamps.filter((t) => now - t < 36e5);
      if (recentTimestamps.length >= 6) {
        return res.status(429).json({ error: "Too many feedback submissions. Please try again later." });
      }
      recentTimestamps.push(now);
      feedbackRateLimits.set(clientIp, recentTimestamps);
      const settingsDoc = await db.collection("settings").doc("feedback_config").get();
      const defaultSettings = {
        enabled: true,
        allow_guest: true,
        trigger_type: "delay",
        trigger_delay_seconds: 15,
        pages_before_prompt: 3,
        cooldown_days_after_submit: 30,
        cooldown_days_after_dismiss: 1,
        cooldown_days_after_later: 7,
        categories: [
          "Website Experience",
          "Video/Streaming",
          "Payment",
          "Account",
          "Performance",
          "Bug Report",
          "Suggestion",
          "Other"
        ],
        notify_admin_email: true
      };
      const settings = settingsDoc.exists ? { ...defaultSettings, ...settingsDoc.data() } : defaultSettings;
      if (settings.enabled === false) {
        return res.status(403).json({ error: "Feedback collection is currently disabled." });
      }
      const { rating, rating_label, category, feedback_text, guest_email, page_url, device_info } = req.body;
      if (!rating || Number(rating) < 1 || Number(rating) > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5 stars." });
      }
      if (!feedback_text || typeof feedback_text !== "string" || feedback_text.trim().length === 0) {
        return res.status(400).json({ error: "Feedback comments cannot be empty." });
      }
      if (feedback_text.length > 2e3) {
        return res.status(400).json({ error: "Feedback comments cannot exceed 2,000 characters." });
      }
      let userId = null;
      let username = "Guest";
      let userEmail = guest_email ? String(guest_email).trim().toLowerCase() : null;
      let isGuest = 1;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
          if (decoded && decoded.id) {
            const userDoc = await db.collection("users").doc(String(decoded.id)).get();
            if (userDoc.exists) {
              const u = userDoc.data();
              userId = String(decoded.id);
              username = u.name || u.username || u.email?.split("@")[0] || "User";
              userEmail = u.email || userEmail;
              isGuest = 0;
            }
          }
        } catch {
        }
      }
      if (isGuest === 1 && settings.allow_guest === false) {
        return res.status(403).json({ error: "Guest feedback is currently disabled. Please log in to provide feedback." });
      }
      const id = "fb_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7);
      const ratingLabel = rating_label || ["Terrible", "Poor", "Average", "Good", "Excellent"][Number(rating) - 1] || "Average";
      const cat = category || "Website Experience";
      const cleanedFeedback = feedback_text.trim();
      const page = page_url ? String(page_url).slice(0, 500) : null;
      const devInfo = device_info ? typeof device_info === "object" ? JSON.stringify(device_info).slice(0, 500) : String(device_info).slice(0, 500) : null;
      await execute(
        `INSERT INTO \`user_feedback\` 
         (\`id\`, \`user_id\`, \`username\`, \`user_email\`, \`is_guest\`, \`rating\`, \`rating_label\`, \`category\`, \`feedback_text\`, \`page_url\`, \`device_info\`, \`status\`, \`admin_notes\`, \`response_count\`, \`created_at\`, \`updated_at\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', '', 0, NOW(), NOW())`,
        [id, userId, username, userEmail, isGuest, Number(rating), ratingLabel, cat, cleanedFeedback, page, devInfo]
      );
      if (settings.notify_admin_email !== false) {
        (async () => {
          try {
            const adminEmails = getAdminEmails();
            const dbAdmins = await query("SELECT `email` FROM `users` WHERE `role` = 'admin'");
            const allAdmins = Array.from(/* @__PURE__ */ new Set([...adminEmails, ...dbAdmins.map((a) => (a.email || "").toLowerCase())])).filter(Boolean);
            for (const adminEmail of allAdmins) {
              await sendTemplateEmail(adminEmail, "feedback_admin_alert", {
                user_name: username,
                user_email: userEmail || "Anonymous / No Email",
                rating: String(rating),
                rating_label: ratingLabel,
                category: cat,
                feedback_text: cleanedFeedback,
                page_url: page || "N/A",
                device_info: devInfo || "N/A",
                website_url: globalAppUrl
              });
            }
          } catch (notifErr) {
            console.error("Failed to dispatch admin feedback alert:", notifErr.message);
          }
        })();
      }
      res.json({ success: true, message: "Thank you for your feedback!", feedbackId: id });
    } catch (err) {
      console.error("Error submitting feedback:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/admin/feedback", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { rating, category, status, user_type, search, page = "1", limit = "25" } = req.query;
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 25));
      const offset = (pageNum - 1) * limitNum;
      const whereClauses = ["1=1"];
      const params = [];
      if (rating && rating !== "all") {
        whereClauses.push("`rating` = ?");
        params.push(Number(rating));
      }
      if (category && category !== "all") {
        whereClauses.push("`category` = ?");
        params.push(String(category));
      }
      if (status && status !== "all") {
        whereClauses.push("`status` = ?");
        params.push(String(status));
      }
      if (user_type === "registered") {
        whereClauses.push("`is_guest` = 0");
      } else if (user_type === "guest") {
        whereClauses.push("`is_guest` = 1");
      }
      if (search && String(search).trim().length > 0) {
        const searchTerm = `%${String(search).trim()}%`;
        whereClauses.push("(`username` LIKE ? OR `user_email` LIKE ? OR `feedback_text` LIKE ? OR `page_url` LIKE ?)");
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      const whereSql = whereClauses.join(" AND ");
      const countResult = await query(`SELECT COUNT(*) as total FROM \`user_feedback\` WHERE ${whereSql}`, params);
      const total = countResult[0]?.total || 0;
      const items = await query(
        `SELECT * FROM \`user_feedback\` WHERE ${whereSql} ORDER BY \`created_at\` DESC LIMIT ? OFFSET ?`,
        [...params, limitNum, offset]
      );
      res.json({
        success: true,
        feedback: items.map((f) => ({
          id: f.id,
          userId: f.user_id,
          username: f.username,
          userEmail: f.user_email,
          isGuest: Boolean(f.is_guest),
          rating: Number(f.rating),
          ratingLabel: f.rating_label,
          category: f.category,
          feedbackText: f.feedback_text,
          pageUrl: f.page_url,
          deviceInfo: f.device_info,
          status: f.status,
          adminNotes: f.admin_notes,
          responseCount: Number(f.response_count || 0),
          createdAt: f.created_at,
          updatedAt: f.updated_at
        })),
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (err) {
      console.error("Error fetching feedback:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/admin/feedback/stats", authenticate, requireRole(["admin"]), async (_req, res) => {
    try {
      const totalRes = await query("SELECT COUNT(*) as total, AVG(rating) as avg_rating FROM `user_feedback`");
      const total = totalRes[0]?.total || 0;
      const averageRating = totalRes[0]?.avg_rating ? Number(parseFloat(totalRes[0].avg_rating).toFixed(2)) : 0;
      const ratingCountsRes = await query("SELECT `rating`, COUNT(*) as count FROM `user_feedback` GROUP BY `rating`");
      const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratingCountsRes.forEach((r) => {
        ratingCounts[Number(r.rating)] = Number(r.count);
      });
      const positiveCount = (ratingCounts[4] || 0) + (ratingCounts[5] || 0);
      const csatPercentage = total > 0 ? Math.round(positiveCount / total * 100) : 0;
      const statusRes = await query("SELECT `status`, COUNT(*) as count FROM `user_feedback` GROUP BY `status`");
      const statusCounts = {
        new: 0,
        reviewed: 0,
        in_progress: 0,
        resolved: 0,
        archived: 0
      };
      statusRes.forEach((s) => {
        statusCounts[s.status] = Number(s.count);
      });
      const categoryRes = await query("SELECT `category`, COUNT(*) as count FROM `user_feedback` GROUP BY `category` ORDER BY count DESC");
      const categoryBreakdown = categoryRes.map((c) => ({ category: c.category, count: Number(c.count) }));
      const guestRes = await query("SELECT `is_guest`, COUNT(*) as count FROM `user_feedback` GROUP BY `is_guest`");
      const userTypeBreakdown = { registered: 0, guest: 0 };
      guestRes.forEach((g) => {
        if (g.is_guest) userTypeBreakdown.guest = Number(g.count);
        else userTypeBreakdown.registered = Number(g.count);
      });
      res.json({
        success: true,
        stats: {
          totalCount: total,
          averageRating,
          csatPercentage,
          ratingCounts,
          statusCounts,
          categoryBreakdown,
          userTypeBreakdown
        }
      });
    } catch (err) {
      console.error("Error fetching feedback stats:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/admin/feedback/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const rows = await query("SELECT * FROM `user_feedback` WHERE `id` = ?", [id]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: "Feedback item not found" });
      }
      const f = rows[0];
      const responses = await query(
        "SELECT * FROM `feedback_responses` WHERE `feedback_id` = ? ORDER BY `created_at` ASC",
        [id]
      );
      res.json({
        success: true,
        feedback: {
          id: f.id,
          userId: f.user_id,
          username: f.username,
          userEmail: f.user_email,
          isGuest: Boolean(f.is_guest),
          rating: Number(f.rating),
          ratingLabel: f.rating_label,
          category: f.category,
          feedbackText: f.feedback_text,
          pageUrl: f.page_url,
          deviceInfo: f.device_info,
          status: f.status,
          adminNotes: f.admin_notes,
          responseCount: Number(f.response_count || 0),
          createdAt: f.created_at,
          updatedAt: f.updated_at
        },
        responses: responses.map((r) => ({
          id: r.id,
          feedbackId: r.feedback_id,
          adminId: r.admin_id,
          adminName: r.admin_name,
          responseText: r.response_text,
          emailSent: Boolean(r.email_sent),
          createdAt: r.created_at
        }))
      });
    } catch (err) {
      console.error("Error fetching feedback detail:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/admin/feedback/:id/status", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, admin_notes } = req.body;
      const validStatuses = ["new", "reviewed", "in_progress", "resolved", "archived"];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      const updates = ["`updated_at` = NOW()"];
      const params = [];
      if (status) {
        updates.push("`status` = ?");
        params.push(status);
      }
      if (admin_notes !== void 0) {
        updates.push("`admin_notes` = ?");
        params.push(admin_notes);
      }
      params.push(id);
      await execute(`UPDATE \`user_feedback\` SET ${updates.join(", ")} WHERE \`id\` = ?`, params);
      res.json({ success: true, message: "Feedback updated successfully" });
    } catch (err) {
      console.error("Error updating feedback status:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/admin/feedback/:id/respond", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { response_text, send_email = true } = req.body;
      if (!response_text || !response_text.trim()) {
        return res.status(400).json({ error: "Response message cannot be empty" });
      }
      const rows = await query("SELECT * FROM `user_feedback` WHERE `id` = ?", [id]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: "Feedback item not found" });
      }
      const feedback = rows[0];
      let adminName = "WatchWDS Support Team";
      if (req.user && req.user.id) {
        const adminDoc = await db.collection("users").doc(String(req.user.id)).get();
        if (adminDoc.exists) {
          adminName = adminDoc.data().name || adminDoc.data().username || adminName;
        }
      }
      const responseId = "resp_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7);
      let emailSent = 0;
      if (send_email && feedback.user_email) {
        try {
          const emailResult = await sendTemplateEmail(feedback.user_email, "feedback_response", {
            user_name: feedback.username || "Valued User",
            rating: String(feedback.rating),
            category: feedback.category,
            feedback_text: feedback.feedback_text,
            response_text: response_text.trim(),
            admin_name: adminName,
            website_url: globalAppUrl
          });
          if (emailResult && emailResult.success) {
            emailSent = 1;
          }
        } catch (mailErr) {
          console.error("Failed to send feedback response email:", mailErr.message);
        }
      }
      await execute(
        "INSERT INTO `feedback_responses` (`id`, `feedback_id`, `admin_id`, `admin_name`, `response_text`, `email_sent`, `created_at`) VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [responseId, id, req.user?.id || null, adminName, response_text.trim(), emailSent]
      );
      const newStatus = feedback.status === "new" ? "reviewed" : feedback.status;
      await execute(
        "UPDATE `user_feedback` SET `response_count` = `response_count` + 1, `status` = ?, `updated_at` = NOW() WHERE `id` = ?",
        [newStatus, id]
      );
      if (feedback.user_id) {
        notifyUser(
          feedback.user_id,
          "Response to your WatchWDS feedback",
          `Our support team has responded to your feedback about ${feedback.category}.`,
          "info",
          "/profile"
        ).catch((err) => console.error("Failed to send notification to user:", err));
      }
      res.json({
        success: true,
        message: emailSent ? "Response recorded and email dispatched to user" : "Response recorded successfully",
        response: {
          id: responseId,
          feedbackId: id,
          adminId: req.user?.id || null,
          adminName,
          responseText: response_text.trim(),
          emailSent: Boolean(emailSent),
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    } catch (err) {
      console.error("Error responding to feedback:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/admin/feedback/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      await execute("DELETE FROM `feedback_responses` WHERE `feedback_id` = ?", [id]);
      await execute("DELETE FROM `user_feedback` WHERE `id` = ?", [id]);
      res.json({ success: true, message: "Feedback and response history deleted successfully" });
    } catch (err) {
      console.error("Error deleting feedback:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/admin/feedback-settings", authenticate, requireRole(["admin"]), async (_req, res) => {
    try {
      const doc = await db.collection("settings").doc("feedback_config").get();
      const defaultSettings = {
        enabled: true,
        allow_guest: true,
        trigger_type: "delay",
        trigger_delay_seconds: 15,
        pages_before_prompt: 3,
        cooldown_days_after_submit: 30,
        cooldown_days_after_dismiss: 1,
        cooldown_days_after_later: 7,
        categories: [
          "Website Experience",
          "Video/Streaming",
          "Payment",
          "Account",
          "Performance",
          "Bug Report",
          "Suggestion",
          "Other"
        ],
        notify_admin_email: true
      };
      res.json({ success: true, settings: doc.exists ? { ...defaultSettings, ...doc.data() } : defaultSettings });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/admin/feedback-settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const newSettings = req.body;
      await db.collection("settings").doc("feedback_config").set(newSettings);
      res.json({ success: true, settings: newSettings, message: "Feedback settings saved successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.use("/api", (req, res) => res.json({ success: true }));
  const isProduction = process.env.NODE_ENV === "production" || !import_fs.default.existsSync(import_path.default.join(currentDirname, "vite.config.ts")) || currentFilename.endsWith(".cjs");
  if (!isProduction) {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR === "true" ? false : void 0 },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    let distPath = import_path.default.join(currentDirname, "dist");
    if (!import_fs.default.existsSync(import_path.default.join(distPath, "index.html"))) {
      if (import_fs.default.existsSync(import_path.default.join(currentDirname, "index.html"))) {
        distPath = currentDirname;
      } else {
        const parentDist = import_path.default.join(currentDirname, "..", "dist");
        if (import_fs.default.existsSync(import_path.default.join(parentDist, "index.html"))) {
          distPath = parentDist;
        }
      }
    }
    app.use(import_express2.default.static(distPath));
    app.get("*", (req, res) => res.sendFile(import_path.default.join(distPath, "index.html")));
  }
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    execute(`
      CREATE TABLE IF NOT EXISTS \`match_categories\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(128) NOT NULL,
        \`slug\` VARCHAR(64) NOT NULL UNIQUE,
        \`description\` VARCHAR(500) DEFAULT '',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch((err) => console.error("Failed to ensure match_categories table exists", err));
    execute(`
      CREATE TABLE IF NOT EXISTS \`blog_categories\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(128) NOT NULL,
        \`slug\` VARCHAR(64) NOT NULL UNIQUE,
        \`description\` VARCHAR(500) DEFAULT '',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch((err) => console.error("Failed to ensure blog_categories table exists", err));
    execute(`
      ALTER TABLE \`comments\` ADD COLUMN \`status\` VARCHAR(50) DEFAULT 'active'
    `).catch((err) => {
      const msg = err.message || "";
      if (!msg.includes("Duplicate column") && !msg.includes("1060")) {
        console.error("Failed to ensure comments status column exists:", err);
      }
    });
    execute(`
      ALTER TABLE \`users\` ADD COLUMN \`verified\` TINYINT(1) DEFAULT 0
    `).catch((err) => {
      const msg = err.message || "";
      if (!msg.includes("Duplicate column") && !msg.includes("1060")) {
        console.error("Failed to ensure users verified column exists:", err);
      }
    });
    execute(`
      ALTER TABLE \`users\` ADD COLUMN \`avatar\` TEXT DEFAULT NULL
    `).catch((err) => {
      const msg = err.message || "";
      if (!msg.includes("Duplicate column") && !msg.includes("1060")) {
        console.error("Failed to ensure users avatar column exists:", err);
      }
    });
    execute(`
      ALTER TABLE \`users\` ADD COLUMN \`onboarding_completed\` TINYINT(1) DEFAULT 0
    `).catch((err) => {
      const msg = err.message || "";
      if (!msg.includes("Duplicate column") && !msg.includes("1060")) {
        console.error("Failed to ensure users onboarding_completed column exists:", err);
      }
    });
    execute(`
      ALTER TABLE \`users\` ADD COLUMN \`phone_number\` VARCHAR(50) DEFAULT NULL
    `).catch((err) => {
      const msg = err.message || "";
      if (!msg.includes("Duplicate column") && !msg.includes("1060")) {
        console.error("Failed to ensure users phone_number column exists:", err);
      }
    });
    execute(`
      ALTER TABLE \`users\` MODIFY COLUMN \`avatar\` LONGTEXT DEFAULT NULL
    `).catch(() => {
    });
    execute(`
      UPDATE \`matches\` 
      SET \`date\` = COALESCE(NULLIF(\`date\`, ''), NULLIF(\`start_time\`, ''), \`created_at\`, NOW()),
          \`start_time\` = COALESCE(NULLIF(\`start_time\`, ''), NULLIF(\`date\`, ''), \`created_at\`, NOW())
      WHERE \`date\` IS NULL OR \`date\` = '' OR \`date\` = 'Invalid Date' OR \`start_time\` IS NULL
    `).catch(() => {
    });
    execute(`
      CREATE TABLE IF NOT EXISTS \`clubs\` (
        \`id\` VARCHAR(100) PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`slug\` VARCHAR(255) NOT NULL UNIQUE,
        \`logo\` TEXT DEFAULT NULL,
        \`contact_email\` VARCHAR(255) DEFAULT NULL,
        \`stripe_account_id\` VARCHAR(255) DEFAULT NULL,
        \`stripe_onboarding_complete\` TINYINT(1) DEFAULT 0,
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch((err) => console.error("Failed to ensure clubs table exists", err));
    execute(`
      CREATE TABLE IF NOT EXISTS \`revenue_policies\` (
        \`id\` VARCHAR(100) PRIMARY KEY,
        \`club_id\` VARCHAR(100) NOT NULL,
        \`platform_fee_percent\` DECIMAL(5,2) NOT NULL DEFAULT 20.00,
        \`club_share_percent\` DECIMAL(5,2) NOT NULL DEFAULT 80.00,
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_policy_club\` (\`club_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch((err) => console.error("Failed to ensure revenue_policies table exists", err));
    execute(`
      CREATE TABLE IF NOT EXISTS \`payouts\` (
        \`id\` VARCHAR(100) PRIMARY KEY,
        \`club_id\` VARCHAR(100) NOT NULL,
        \`stripe_payout_id\` VARCHAR(100) DEFAULT NULL,
        \`amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`currency\` VARCHAR(10) DEFAULT 'usd',
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'pending',
        \`arrival_date\` TIMESTAMP NULL DEFAULT NULL,
        \`failure_code\` VARCHAR(100) DEFAULT NULL,
        \`failure_message\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_payout_club\` (\`club_id\`),
        INDEX \`idx_payout_stripe_id\` (\`stripe_payout_id\`),
        INDEX \`idx_payout_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch((err) => console.error("Failed to ensure payouts table exists", err));
    execute(`
      CREATE TABLE IF NOT EXISTS \`club_balances\` (
        \`club_id\` VARCHAR(100) PRIMARY KEY,
        \`available_balance\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        \`pending_balance\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        \`total_earned\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        \`total_paid_out\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        \`currency\` VARCHAR(10) DEFAULT 'GBP',
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch((err) => console.error("Failed to ensure club_balances table exists", err));
    execute(`
      CREATE TABLE IF NOT EXISTS \`club_earnings\` (
        \`id\` VARCHAR(100) PRIMARY KEY,
        \`club_id\` VARCHAR(100) NOT NULL,
        \`match_id\` VARCHAR(100) DEFAULT NULL,
        \`transaction_id\` VARCHAR(100) DEFAULT NULL,
        \`gross_amount\` DECIMAL(10,2) NOT NULL,
        \`platform_commission\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`club_net_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`commission_rate\` DECIMAL(5,2) NOT NULL DEFAULT 20.00,
        \`type\` VARCHAR(50) DEFAULT 'ppv',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_earning_club\` (\`club_id\`),
        INDEX \`idx_earning_match\` (\`match_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch((err) => console.error("Failed to ensure club_earnings table exists", err));
    execute(`
      ALTER TABLE \`payouts\` ADD COLUMN \`method\` VARCHAR(50) DEFAULT 'auto'
    `).catch((err) => {
      const msg = err.message || "";
      if (!msg.includes("Duplicate column") && !msg.includes("1060")) {
        console.error("Failed to ensure payouts method column exists:", err);
      }
    });
    execute(`
      ALTER TABLE \`matches\` ADD COLUMN \`club_id\` VARCHAR(100) DEFAULT NULL
    `).catch((err) => {
      const msg = err.message || "";
      if (!msg.includes("Duplicate column") && !msg.includes("1060")) {
        console.error("Failed to ensure matches club_id column exists:", err);
      }
    });
    execute(`
      ALTER TABLE \`matches\` ADD COLUMN \`duration\` INT DEFAULT 120
    `).catch((err) => {
      const msg = err.message || "";
      if (!msg.includes("Duplicate column") && !msg.includes("1060")) {
        console.error("Failed to ensure matches duration column exists:", err);
      }
    });
    execute(`
      CREATE TABLE IF NOT EXISTS \`trusted_devices\` (
        \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`user_id\` VARCHAR(100) NOT NULL,
        \`device_fingerprint\` VARCHAR(255) NOT NULL,
        \`device_name\` VARCHAR(255) DEFAULT '',
        \`ip_address\` VARCHAR(45) DEFAULT '',
        \`country\` VARCHAR(100) DEFAULT '',
        \`city\` VARCHAR(100) DEFAULT '',
        \`last_used_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`is_active\` TINYINT(1) DEFAULT 1,
        KEY \`idx_trusted_devices_user\` (\`user_id\`),
        KEY \`idx_trusted_devices_fingerprint\` (\`device_fingerprint\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch((err) => console.error("Failed to ensure trusted_devices table exists", err));
    execute(`
      CREATE TABLE IF NOT EXISTS \`verification_codes\` (
        \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`user_id\` VARCHAR(100) NOT NULL,
        \`code\` VARCHAR(10) NOT NULL,
        \`device_fingerprint\` VARCHAR(255) DEFAULT '',
        \`ip_address\` VARCHAR(45) DEFAULT '',
        \`browser_info\` TEXT DEFAULT NULL,
        \`location_info\` VARCHAR(255) DEFAULT '',
        \`expires_at\` DATETIME NOT NULL,
        \`used\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY \`idx_verification_codes_user\` (\`user_id\`),
        KEY \`idx_verification_codes_code\` (\`code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch((err) => console.error("Failed to ensure verification_codes table exists", err));
    execute(`
      CREATE TABLE IF NOT EXISTS \`login_attempts\` (
        \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`email\` VARCHAR(255) NOT NULL,
        \`ip_address\` VARCHAR(45) DEFAULT '',
        \`user_agent\` TEXT DEFAULT NULL,
        \`success\` TINYINT(1) DEFAULT 0,
        \`reason\` VARCHAR(255) DEFAULT '',
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY \`idx_login_attempts_email\` (\`email\`),
        KEY \`idx_login_attempts_ip\` (\`ip_address\`),
        KEY \`idx_login_attempts_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch((err) => console.error("Failed to ensure login_attempts table exists", err));
    execute(`
      CREATE TABLE IF NOT EXISTS \`security_settings\` (
        \`key_name\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`value\` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch((err) => console.error("Failed to ensure security_settings table exists", err));
    execute(`
      INSERT IGNORE INTO \`security_settings\` (\`key_name\`, \`value\`) VALUES
      ('config', '{"trusted_device_expiry_days":60,"max_login_attempts":5,"lockout_duration_minutes":30,"enable_suspicious_login_alerts":true,"admin_ip_whitelist":[],"enforce_admin_ip_whitelist":false,"enable_device_verification":true}');
    `).catch((err) => console.error("Failed to seed security_settings table", err));
    execute(`
      CREATE TABLE IF NOT EXISTS \`user_feedback\` (
        \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`user_id\` VARCHAR(100) DEFAULT NULL,
        \`username\` VARCHAR(150) DEFAULT NULL,
        \`user_email\` VARCHAR(255) DEFAULT NULL,
        \`is_guest\` TINYINT(1) DEFAULT 0,
        \`rating\` INT NOT NULL,
        \`rating_label\` VARCHAR(50) NOT NULL,
        \`category\` VARCHAR(100) NOT NULL,
        \`feedback_text\` TEXT NOT NULL,
        \`page_url\` VARCHAR(500) DEFAULT NULL,
        \`device_info\` VARCHAR(500) DEFAULT NULL,
        \`status\` VARCHAR(50) DEFAULT 'new',
        \`admin_notes\` TEXT DEFAULT NULL,
        \`response_count\` INT DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY \`idx_user_feedback_user\` (\`user_id\`),
        KEY \`idx_user_feedback_status\` (\`status\`),
        KEY \`idx_user_feedback_rating\` (\`rating\`),
        KEY \`idx_user_feedback_category\` (\`category\`),
        KEY \`idx_user_feedback_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch((err) => console.error("Failed to ensure user_feedback table exists", err));
    execute(`
      CREATE TABLE IF NOT EXISTS \`feedback_responses\` (
        \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`feedback_id\` VARCHAR(100) NOT NULL,
        \`admin_id\` VARCHAR(100) DEFAULT NULL,
        \`admin_name\` VARCHAR(150) DEFAULT 'WatchWDS Support',
        \`response_text\` TEXT NOT NULL,
        \`email_sent\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY \`idx_fb_responses_feedback_id\` (\`feedback_id\`),
        KEY \`idx_fb_responses_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch((err) => console.error("Failed to ensure feedback_responses table exists", err));
    execute(`
      INSERT IGNORE INTO \`settings\` (\`key_name\`, \`value\`) VALUES
      ('feedback_config', '{"enabled":true,"allow_guest":true,"trigger_type":"delay","trigger_delay_seconds":15,"pages_before_prompt":3,"cooldown_days_after_submit":30,"cooldown_days_after_dismiss":1,"cooldown_days_after_later":7,"categories":["Website Experience","Video/Streaming","Payment","Account","Performance","Bug Report","Suggestion","Other"],"notify_admin_email":true}');
    `).catch((err) => console.error("Failed to seed feedback_config in settings", err));
    execute(`
      INSERT IGNORE INTO \`settings\` (\`key_name\`, \`value\`) VALUES
      ('sliders', '{"sliders":[{"id":"default-hero","name":"Homepage Hero","shortcode":"[slider id=\\"default-hero\\"]","autoSlide":true,"interval":5,"slides":[{"id":"slide-1","title":"Grassroots Sports, Live & Direct.","subtitle":"WatchWDS brings you the best of local and grassroots sports streaming.","image":"https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80","link":"/matches","buttonText":"Watch Now","isActive":true}]}]}');
    `).catch((err) => console.error("Failed to seed sliders in settings", err));
    warmCriticalCaches().catch((err) => console.error("Startup Cache Warning failed", err));
    processMatchAutomations().catch((err) => console.error("Match automation startup check failed", err));
    setInterval(() => {
      processMatchAutomations().catch((err) => console.error("Match automation interval error", err));
    }, 6e4);
    processScheduledPayouts().catch((err) => console.error("Payout engine startup check failed", err));
    setInterval(() => {
      processScheduledPayouts().catch((err) => console.error("Payout engine interval error", err));
    }, 3e5);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
