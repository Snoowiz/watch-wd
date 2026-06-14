import { 
  useAuthStore, 
  useMatchStore, 
  usePurchaseStore, 
  useSavedMatchesStore, 
  useCommentStore,
  useTaskStore,
  useCreatorStore,
  useSettingsStore,
  useBlogStore,
  Match
} from '../store';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { getBrandingSettings, saveBrandingSettings, getPublicGoogleAuthConfig } from './settingsService';

export function initializeFirebaseSync() {
  
  // 1. Sync User info
  useAuthStore.subscribe(async (state, prevState) => {
    const user = state.user;
    if (user && JSON.stringify(user) !== JSON.stringify(prevState.user)) {
      try {
        // Strip undefined properties before sending to Firestore
        const payload = JSON.parse(JSON.stringify({
          ...user,
          updatedAt: new Date().toISOString()
        }));
        await setDoc(doc(db, 'users', user.id.toString()), payload, { merge: true });
      } catch (err) {
        console.error('Failed to sync user', err);
      }
    }
  });

  // 2. Sync Watch History
  useMatchStore.subscribe(async (state, prevState) => {
    const newItems = state.watchHistory.filter(h => 
      !prevState.watchHistory.some(ph => ph.userId === h.userId && ph.matchId === h.matchId)
    );
    for (const item of newItems) {
      try {
        const payload = JSON.parse(JSON.stringify({
          ...item,
          syncedAt: new Date().toISOString()
        }));
        await setDoc(doc(db, 'users', item.userId.toString(), 'watchHistory', item.matchId.toString()), payload, { merge: true });
      } catch (err) {
        console.error('Failed to sync watch history', err);
      }
    }
  });

  // 3. Sync Purchases and Transactions
  usePurchaseStore.subscribe(async (state, prevState) => {
    const newPurchases = state.purchases.filter(p => !prevState.purchases.some(pp => pp.id === p.id));
    for (const purchase of newPurchases) {
      try {
        if (purchase.userId) {
          const payload = JSON.parse(JSON.stringify({
            ...purchase,
            syncedAt: new Date().toISOString()
          }));
          await setDoc(doc(db, 'users', purchase.userId.toString(), 'purchases', purchase.id.toString()), payload, { merge: true });
          // Also sync to global root-level purchases
          await setDoc(doc(db, 'purchases', purchase.id.toString()), payload, { merge: true });
        }
      } catch (err) {
        console.error('Failed to sync purchase', err);
      }
    }
    
    const newTransactions = state.transactions.filter(t => !prevState.transactions.some(pt => pt.id === t.id));
    for (const tx of newTransactions) {
      try {
        if (tx.userId) {
          const payload = JSON.parse(JSON.stringify({
            ...tx,
            syncedAt: new Date().toISOString()
          }));
          await setDoc(doc(db, 'users', tx.userId.toString(), 'transactions', tx.id.toString()), payload, { merge: true });
        }
      } catch (err) {
        console.error('Failed to sync transaction', err);
      }
    }
  });

  // 4. Sync Saved Matches
  useSavedMatchesStore.subscribe(async (state, prevState) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    const newSaved = state.savedMatches.filter(id => !prevState.savedMatches.includes(id));
    const removedSaved = prevState.savedMatches.filter(id => !state.savedMatches.includes(id));
    
    for (const matchId of newSaved) {
      try {
        const payload = JSON.parse(JSON.stringify({
          matchId,
          savedAt: new Date().toISOString()
        }));
        await setDoc(doc(db, 'users', user.id.toString(), 'savedMatches', matchId.toString()), payload, { merge: true });
      } catch (err) {
        console.error('Failed to sync saved match', err);
      }
    }

    for (const matchId of removedSaved) {
      try {
        await deleteDoc(doc(db, 'users', user.id.toString(), 'savedMatches', matchId.toString()));
      } catch (err) {
        console.error('Failed to unsync saved match', err);
      }
    }
  });

  // 5. Sync Comments (Global)
  useCommentStore.subscribe(async (state, prevState) => {
    const newComments = state.comments.filter(c => !prevState.comments.some(pc => pc.id === c.id));
    for (const comment of newComments) {
      try {
        const payload = JSON.parse(JSON.stringify({
          ...comment,
          syncedAt: new Date().toISOString()
        }));
        await setDoc(doc(db, 'comments', comment.id.toString()), payload, { merge: true });
      } catch (err) {
        console.error('Failed to sync comment', err);
      }
    }
    
    // Check likes change
    for (const comment of state.comments) {
      const prevComment = prevState.comments.find(pc => pc.id === comment.id);
      if (prevComment && prevComment.likes !== comment.likes) {
        try {
          await setDoc(doc(db, 'comments', comment.id.toString()), {
            likes: comment.likes,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {}
      }
    }
  });

  // 6. Sync Tasks
  useTaskStore.subscribe(async (state, prevState) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    const newTasks = state.completedTasks.filter(id => !prevState.completedTasks.includes(id));
    for (const taskId of newTasks) {
      try {
        const payload = JSON.parse(JSON.stringify({
          taskId,
          completedAt: new Date().toISOString()
        }));
        await setDoc(doc(db, 'users', user.id.toString(), 'completedTasks', taskId.toString()), payload, { merge: true });
      } catch(err) {
        console.error('Failed to sync completed task', err);
      }
    }
  });

  // 7. Sync activities
  useCreatorStore.subscribe(async (state, prevState) => {
    const newActivities = state.activities.filter(a => !prevState.activities.some(pa => pa.id === a.id));
    for (const activity of newActivities) {
      try {
        if (activity.userId) {
          const payload = JSON.parse(JSON.stringify({
            ...activity,
            syncedAt: new Date().toISOString()
          }));
          await setDoc(doc(db, 'users', activity.userId.toString(), 'activities', activity.id.toString()), payload, { merge: true });
        }
      } catch(err) {
        console.error('Failed to sync activity', err);
      }
    }
  });

  // 8. Sync Branding Settings (Platform Name & Favicon)
  getBrandingSettings().then(branding => {
    const store = useSettingsStore.getState();
    if (branding.platformName && branding.platformName !== store.platformName) {
      store.setPlatformName(branding.platformName);
    }
    if (branding.favicon && branding.favicon !== store.favicon) {
      store.setFavicon(branding.favicon);
    }
    if (branding.preloaderEnabled !== undefined && branding.preloaderEnabled !== store.preloaderEnabled) {
      store.setPreloaderEnabled(branding.preloaderEnabled);
    }
  }).catch(err => {
    console.error('Failed to load branding settings at startup', err);
  });

  // Sync Google Auth Settings
  getPublicGoogleAuthConfig().then(config => {
    const store = useSettingsStore.getState();
    if (config) {
      store.setGoogleAuthSettings({
        enabled: config.enabled,
        clientId: config.clientId,
        clientSecret: '',
        redirectUri: ''
      });
    }
  }).catch(err => {
    console.error('Failed to load Google Auth settings at startup', err);
  });

  let previousBranding = {
    platformName: useSettingsStore.getState().platformName,
    favicon: useSettingsStore.getState().favicon,
    preloaderEnabled: useSettingsStore.getState().preloaderEnabled,
  };

  useSettingsStore.subscribe(async (state) => {
    const brandingChanged = 
      state.platformName !== previousBranding.platformName ||
      state.favicon !== previousBranding.favicon ||
      state.preloaderEnabled !== previousBranding.preloaderEnabled;

    if (brandingChanged) {
      previousBranding = {
        platformName: state.platformName,
        favicon: state.favicon,
        preloaderEnabled: state.preloaderEnabled,
      };

      try {
        if (brandingChanged) {
          await saveBrandingSettings({
            platformName: state.platformName,
            favicon: state.favicon,
            preloaderEnabled: state.preloaderEnabled,
          });
        }
      } catch (err) {
        console.error('Failed to sync settings to Firestore', err);
      }
    }
  });

  // 9. Sync Matches from Firestore (Two-Way Real-Time)
  let isUpdatingFromFirestore = false;

  const matchesCollection = collection(db, 'matches');
  onSnapshot(matchesCollection, (snapshot) => {
    const list: Match[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      list.push({
        id: Number(doc.id) || Math.floor(Date.now() + Math.random() * 1000),
        title: data.title || '',
        slug: data.slug || '',
        date: data.date || '',
        price: data.price || 0,
        embedPrice: data.embedPrice || 0,
        status: data.status || 'upcoming',
        publishStatus: data.publishStatus,
        creatorId: data.creatorId,
        thumbnail: data.thumbnail || '',
        content: data.content || '',
        description: data.description || '',
        categories: data.categories || [],
        access: data.access || 'free',
        access_type: data.access_type,
        ppv_price: data.ppv_price,
        required_plan_id: data.required_plan_id,
        seo: data.seo || { keywords: '', metaDescription: '' },
        scheduledDate: data.scheduledDate,
        liveCommenting: data.liveCommenting,
        commentAlignment: data.commentAlignment,
        views: data.views,
        adSettings: data.adSettings,
      });
    });
    
    if (list.length > 0) {
      isUpdatingFromFirestore = true;
      try {
        useMatchStore.getState().setMatches(list);
      } finally {
        isUpdatingFromFirestore = false;
      }
    } else {
      // Seed default matches to Firestore if Firestore has nothing
      const defaultMatches = useMatchStore.getState().matches;
      for (const match of defaultMatches) {
        setDoc(doc(db, 'matches', match.id.toString()), { ...match }).catch(err => {
          console.error('Failed to seed match', err);
        });
      }
    }
  }, (error) => {
    console.error('Failed to listen to matches', error);
  });

  // 10. Sync Local Matches Changes to Firestore
  useMatchStore.subscribe(async (state, prevState) => {
    if (isUpdatingFromFirestore) return;

    const currentMatches = state.matches;
    const prevMatches = prevState.matches;
    
    // Find added or updated matches
    for (const match of currentMatches) {
      const prevMatch = prevMatches.find(m => String(m.id) === String(match.id));
      if (!prevMatch || JSON.stringify(prevMatch) !== JSON.stringify(match)) {
        try {
          const payload = JSON.parse(JSON.stringify(match));
          await setDoc(doc(db, 'matches', match.id.toString()), payload, { merge: true });
        } catch (err) {
          console.error('Failed to sync match to firestore', err);
        }
      }
    }

    // Find deleted matches
    for (const prevMatch of prevMatches) {
      const exists = currentMatches.some(m => String(m.id) === String(prevMatch.id));
      if (!exists) {
        try {
          await deleteDoc(doc(db, 'matches', prevMatch.id.toString()));
        } catch (err) {
          console.error('Failed to delete match from firestore', err);
        }
      }
    }
  });

  // 11. Sync Purchases from Firestore in Real-Time (Root Level)
  const purchasesCollection = collection(db, 'purchases');
  onSnapshot(purchasesCollection, (snapshot) => {
    const list: any[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: Number(docSnap.id) || docSnap.id,
        userId: Number(data.userId) || data.userId,
        matchId: Number(data.matchId) || data.matchId,
        amount: data.amount || 0,
        type: data.type || 'watch',
        date: data.date || '',
        code: data.code,
      });
    });
    if (list.length > 0) {
      usePurchaseStore.setState({ purchases: list });
    }
  }, (error) => {
    console.error('Failed to listen to purchases', error);
  });

  // 12. Sync Comments from Firestore in Real-Time (Global)
  const commentsCollection = collection(db, 'comments');
  onSnapshot(commentsCollection, (snapshot) => {
    const list: any[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: Number(docSnap.id) || docSnap.id,
        matchId: Number(data.matchId) || data.matchId,
        userId: Number(data.userId) || data.userId,
        userName: data.userName || '',
        userAvatar: data.userAvatar || '',
        text: data.text || '',
        timestamp: data.timestamp || '',
        likes: data.likes || 0,
        likedBy: data.likedBy || [],
        role: data.role || 'user',
      });
    });
    if (list.length > 0) {
      useCommentStore.setState({ comments: list });
    }
  }, (error) => {
    console.error('Failed to listen to comments', error);
  });

  // 13. Sync Blog Posts from Firestore (Two-Way Real-Time)
  let isUpdatingBlogFromFirestore = false;
  const blogCollection = collection(db, 'blog_posts');
  onSnapshot(blogCollection, (snapshot) => {
    const list: any[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: Number(docSnap.id) || docSnap.id,
        title: data.title || '',
        slug: data.slug || '',
        content: data.content || '',
        excerpt: data.excerpt || '',
        featuredImage: data.featuredImage || '',
        authorId: Number(data.authorId) || 1,
        categories: data.categories || [],
        tags: data.tags || [],
        status: data.status || 'draft',
        scheduledDate: data.scheduledDate || '',
        restricted: data.restricted || 'none',
        seo: data.seo || { keywords: '', description: '' },
        embedUrl: data.embedUrl || '',
        views: Number(data.views) || 0,
        likes: Number(data.likes) || 0,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        readingTimeMinutes: Number(data.readingTimeMinutes) || 3,
      });
    });
    
    if (list.length > 0) {
      isUpdatingBlogFromFirestore = true;
      try {
        useBlogStore.getState().setPosts(list);
      } finally {
        isUpdatingBlogFromFirestore = false;
      }
    } else {
      // Seed default blog posts to Firestore on first run
      const defaultPosts = useBlogStore.getState().posts;
      if (defaultPosts && defaultPosts.length > 0) {
        for (const post of defaultPosts) {
          setDoc(doc(db, 'blog_posts', post.id.toString()), { ...post }).catch(err => {
            console.error('Failed to seed blog post to firestore', err);
          });
        }
      }
    }
  }, (error) => {
    console.error('Failed to listen to blog posts', error);
  });

  // 14. Sync Local Blog Posts Changes to Firestore
  useBlogStore.subscribe(async (state, prevState) => {
    if (isUpdatingBlogFromFirestore) return;

    const currentPosts = state.posts;
    const prevPosts = prevState.posts;
    
    // Sync newly added/updated posts
    for (const post of currentPosts) {
      const prevPost = prevPosts.find(p => String(p.id) === String(post.id));
      if (!prevPost || JSON.stringify(prevPost) !== JSON.stringify(post)) {
        try {
          const payload = JSON.parse(JSON.stringify(post));
          await setDoc(doc(db, 'blog_posts', post.id.toString()), payload, { merge: true });
        } catch (err) {
          console.error('Failed to sync blog post to firestore', err);
        }
      }
    }

    // Handle deletions
    for (const prevPost of prevPosts) {
      const exists = currentPosts.some(p => String(p.id) === String(prevPost.id));
      if (!exists) {
        try {
          await deleteDoc(doc(db, 'blog_posts', prevPost.id.toString()));
        } catch (err) {
          console.error('Failed to delete blog post from firestore', err);
        }
      }
    }
  });
}
