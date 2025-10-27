'use server'

import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:info@umsprepaid.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function sendPushNotification(
  subscription: PushSubscriptionJSON,
  data: {
    title?: string;
    body: string;
    icon?: string;
  }
) {
  try {
    await webpush.sendNotification(
      subscription as any,
      JSON.stringify({
        title: data.title || 'UMS Prepaid',
        message: data.body,
        icon: data.icon || '/favi.png'
      })
    );
    return { success: true };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error };
  }
} 