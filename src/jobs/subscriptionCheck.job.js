import cron from "node-cron";
import PlatformSubscription from "../models/PlatformSubscription.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { sendEmail } from "../services/email.service.js";

/**
 * Daily subscription check job
 * Runs every day at midnight (00:00)
 * - Updates expired subscriptions
 * - Sends expiry warnings (3 days, 1 day)
 * - Sends expiry notifications
 */
export const initializeSubscriptionChecks = () => {
  // Run every day at midnight
  cron.schedule("0 0 * * *", async () => {
    console.log("⏰ Running daily subscription checks...");

    try {
      // 1. Update expired subscriptions
      try {
        await PlatformSubscription.updateExpiredSubscriptions();
        console.log("✅ Updated expired subscriptions");
      } catch (error) {
        console.error("❌ Error updating expired subscriptions:", error);
      }

      // 2. Send 3-day warning notifications
      try {
        await sendThreeDayWarnings();
      } catch (error) {
        console.error("❌ Error sending 3-day warnings:", error);
      }

      // 3. Send 1-day warning notifications
      try {
        await sendOneDayWarnings();
      } catch (error) {
        console.error("❌ Error sending 1-day warnings:", error);
      }

      // 4. Send expiry notifications
      try {
        await sendExpiryNotifications();
      } catch (error) {
        console.error("❌ Error sending expiry notifications:", error);
      }

      console.log("✅ Daily subscription checks completed successfully");
    } catch (error) {
      console.error("\n❌ CRON JOB ERROR: Daily subscription checks failed");
      console.error("   Time:", new Date().toISOString());
      console.error("   Details:", error.message || error);
      console.error("⚠️  IMPACT: Users may not receive subscription expiry warnings today");
      console.error("   NOTE: Job will automatically retry tomorrow at midnight\n");
    }
  });

  console.log("📅 Subscription check cron job initialized");
};

/**
 * Send warnings for subscriptions expiring in 3 days
 */
async function sendThreeDayWarnings() {
  try {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    const subscriptions = await PlatformSubscription.find({
      status: { $in: ["trial", "active"] },
      "notifications.threeDayWarning": false,
    }).populate("userId", "fullName email").catch((err) => {
      console.error("❌ DATABASE ERROR: Failed to fetch subscriptions for 3-day warnings");
      console.error("   Details:", err.message || err);
      console.error("   Skipping 3-day warnings for this run");
      return [];
    });

    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    const notificationsToCreate = [];
    const subscriptionIdsToUpdate = [];
    const emailPromises = [];

    for (const subscription of subscriptions) {
      const daysRemaining = subscription.getDaysRemaining();

      // Send notification if 3 days or less remaining
      if (daysRemaining <= 3 && daysRemaining > 0) {
        const user = subscription.userId;

        // Collect notification data
        notificationsToCreate.push({
          recipientId: user._id,
          type: "subscription_warning",
          title: `${subscription.status === "trial" ? "Trial" : "Subscription"} Expiring Soon`,
          message: `Your ${subscription.status === "trial" ? "free trial" : "subscription"} will expire in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}. Pay ₹199 to continue using PulseLedger.`,
          priority: "high",
        });

        // Collect subscription ID for bulk update
        subscriptionIdsToUpdate.push(subscription._id);

        // Collect email promise
        emailPromises.push(
          sendEmail({
            to: user.email,
            subject: `PulseLedger ${subscription.status === "trial" ? "Trial" : "Subscription"} Expiring in ${daysRemaining} Days`,
            html: `
              <h2>Your ${subscription.status === "trial" ? "Free Trial" : "Subscription"} is Expiring Soon</h2>
              <p>Hi ${user.fullName},</p>
              <p>Your PulseLedger ${subscription.status === "trial" ? "free trial" : "subscription"} will expire in <strong>${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}</strong>.</p>
              <p>To continue accessing the platform without interruption, please make a payment of <strong>₹199</strong>.</p>
              <p><a href="${process.env.FRONTEND_URL}/coach/platform-subscription" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Pay Now</a></p>
              <p>Thank you for using PulseLedger!</p>
            `,
          }).catch((err) => {
            console.error(`Failed to send email to ${user.email}:`, err);
          })
        );

        console.log(`📧 Queued 3-day warning for ${user.email}`);
      }
    }

    // Bulk insert all notifications at once
    if (notificationsToCreate.length > 0) {
      await Notification.insertMany(notificationsToCreate);
      console.log(`✅ Created ${notificationsToCreate.length} notifications in bulk`);
    }

    // Bulk update all subscriptions at once
    if (subscriptionIdsToUpdate.length > 0) {
      await PlatformSubscription.updateMany(
        { _id: { $in: subscriptionIdsToUpdate } },
        { $set: { "notifications.threeDayWarning": true } }
      );
      console.log(`✅ Updated ${subscriptionIdsToUpdate.length} subscriptions in bulk`);
    }

    // Send all emails in parallel
    if (emailPromises.length > 0) {
      await Promise.allSettled(emailPromises);
      console.log(`✅ Sent ${emailPromises.length} emails for 3-day warnings`);
    }
  } catch (error) {
    console.error("Error sending 3-day warnings:", error);
  }
}

/**
 * Send warnings for subscriptions expiring in 1 day
 */
async function sendOneDayWarnings() {
  try {
    const subscriptions = await PlatformSubscription.find({
      status: { $in: ["trial", "active"] },
      "notifications.oneDayWarning": false,
    }).populate("userId", "fullName email").catch((err) => {
      console.error("❌ DATABASE ERROR: Failed to fetch subscriptions for 1-day warnings");
      console.error("   Details:", err.message || err);
      console.error("   Skipping 1-day warnings for this run");
      return [];
    });

    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    const notificationsToCreate = [];
    const subscriptionIdsToUpdate = [];
    const emailPromises = [];

    for (const subscription of subscriptions) {
      const daysRemaining = subscription.getDaysRemaining();

      // Send notification if 1 day remaining
      if (daysRemaining === 1) {
        const user = subscription.userId;

        // Collect notification data
        notificationsToCreate.push({
          recipientId: user._id,
          type: "subscription_warning",
          title: `${subscription.status === "trial" ? "Trial" : "Subscription"} Expires Tomorrow`,
          message: `Your ${subscription.status === "trial" ? "free trial" : "subscription"} expires tomorrow! Pay ₹199 now to avoid service interruption.`,
          priority: "urgent",
        });

        // Collect subscription ID for bulk update
        subscriptionIdsToUpdate.push(subscription._id);

        // Collect email promise
        emailPromises.push(
          sendEmail({
            to: user.email,
            subject: `⚠️ PulseLedger ${subscription.status === "trial" ? "Trial" : "Subscription"} Expires Tomorrow`,
            html: `
              <h2 style="color: #dc2626;">Urgent: Your ${subscription.status === "trial" ? "Free Trial" : "Subscription"} Expires Tomorrow</h2>
              <p>Hi ${user.fullName},</p>
              <p><strong>Your PulseLedger ${subscription.status === "trial" ? "free trial" : "subscription"} will expire tomorrow!</strong></p>
              <p>After expiry, you will lose access to all platform features until you make a payment.</p>
              <p>Pay <strong>₹199</strong> now to continue using PulseLedger:</p>
              <p><a href="${process.env.FRONTEND_URL}/coach/platform-subscription" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Pay Now</a></p>
              <p>Thank you for using PulseLedger!</p>
            `,
          }).catch((err) => {
            console.error(`Failed to send email to ${user.email}:`, err);
          })
        );

        console.log(`📧 Queued 1-day warning for ${user.email}`);
      }
    }

    // Bulk insert all notifications at once
    if (notificationsToCreate.length > 0) {
      await Notification.insertMany(notificationsToCreate);
      console.log(`✅ Created ${notificationsToCreate.length} notifications in bulk`);
    }

    // Bulk update all subscriptions at once
    if (subscriptionIdsToUpdate.length > 0) {
      await PlatformSubscription.updateMany(
        { _id: { $in: subscriptionIdsToUpdate } },
        { $set: { "notifications.oneDayWarning": true } }
      );
      console.log(`✅ Updated ${subscriptionIdsToUpdate.length} subscriptions in bulk`);
    }

    // Send all emails in parallel
    if (emailPromises.length > 0) {
      await Promise.allSettled(emailPromises);
      console.log(`✅ Sent ${emailPromises.length} emails for 1-day warnings`);
    }
  } catch (error) {
    console.error("Error sending 1-day warnings:", error);
  }
}

/**
 * Send notifications for expired subscriptions
 */
async function sendExpiryNotifications() {
  try {
    const subscriptions = await PlatformSubscription.find({
      status: "expired",
      "notifications.expiryNotification": false,
    }).populate("userId", "fullName email").catch((err) => {
      console.error("❌ DATABASE ERROR: Failed to fetch expired subscriptions");
      console.error("   Details:", err.message || err);
      console.error("   Skipping expiry notifications for this run");
      return [];
    });

    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    const notificationsToCreate = [];
    const subscriptionIdsToUpdate = [];
    const emailPromises = [];

    for (const subscription of subscriptions) {
      const user = subscription.userId;

      // Collect notification data
      notificationsToCreate.push({
        recipientId: user._id,
        type: "subscription_expired",
        title: "Platform Access Suspended",
        message: "Your subscription has expired. Pay ₹199 to restore access to PulseLedger.",
        priority: "urgent",
      });

      // Collect subscription ID for bulk update
      subscriptionIdsToUpdate.push(subscription._id);

      // Collect email promise
      emailPromises.push(
        sendEmail({
          to: user.email,
          subject: "🚨 PulseLedger Subscription Expired - Action Required",
          html: `
            <h2 style="color: #dc2626;">Your PulseLedger Subscription Has Expired</h2>
            <p>Hi ${user.fullName},</p>
            <p><strong>Your PulseLedger subscription has expired and your platform access has been suspended.</strong></p>
            <p>You will not be able to access coach features until you renew your subscription.</p>
            <p>To restore access, please make a payment of <strong>₹199</strong>:</p>
            <p><a href="${process.env.FRONTEND_URL}/coach/platform-subscription" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Renew Subscription</a></p>
            <p>Thank you for using PulseLedger!</p>
          `,
        }).catch((err) => {
          console.error(`Failed to send email to ${user.email}:`, err);
        })
      );

      console.log(`📧 Queued expiry notification for ${user.email}`);
    }

    // Bulk insert all notifications at once
    if (notificationsToCreate.length > 0) {
      await Notification.insertMany(notificationsToCreate);
      console.log(`✅ Created ${notificationsToCreate.length} notifications in bulk`);
    }

    // Bulk update all subscriptions at once
    if (subscriptionIdsToUpdate.length > 0) {
      await PlatformSubscription.updateMany(
        { _id: { $in: subscriptionIdsToUpdate } },
        { $set: { "notifications.expiryNotification": true } }
      );
      console.log(`✅ Updated ${subscriptionIdsToUpdate.length} subscriptions in bulk`);
    }

    // Send all emails in parallel
    if (emailPromises.length > 0) {
      await Promise.allSettled(emailPromises);
      console.log(`✅ Sent ${emailPromises.length} emails for expiry notifications`);
    }
  } catch (error) {
    console.error("Error sending expiry notifications:", error);
  }
}

export default {
  initializeSubscriptionChecks,
};
