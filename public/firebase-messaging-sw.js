importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  projectId: "sigma-cogency-ccf5x",
  appId: "1:1032049474339:web:70a18b82d53026f5bc6a96",
  apiKey: "AIzaSyAz9yGcxLHq_lLa3GToDQA0N9g0PI4ZHSQ",
  authDomain: "sigma-cogency-ccf5x.firebaseapp.com",
  messagingSenderId: "1032049474339",
  storageBucket: "sigma-cogency-ccf5x.firebasestorage.app"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
