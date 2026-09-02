// ============================================
// Campus OS — Universal Storage & Realtime Engine
// Synchronizes Local Storage with SQLite Realtime Backend
// ============================================

const KEYS = {
  USER: 'cos_user',
  ACCOUNTS: 'cos_accounts',
  POSTS: 'cos_posts',
  SAVED_POSTS: 'cos_saved_posts',
  LIKED_POSTS: 'cos_liked_posts',
  NOTES: 'cos_notes',
  TASKS: 'cos_tasks',
  TIMETABLE: 'cos_timetable',
  ATTENDANCE: 'cos_attendance',
  RESOURCES: 'cos_resources',
  SETTINGS: 'cos_settings',
  PDF_DOCS: 'cos_pdf_documents',
  BANNERS: 'cos_banners',
  ADMIN_TOKEN: 'cos_admin_token',
  ADMIN_USER: 'cos_admin_user'
};

const FAKE_HANDLES = [
  '@priya_sharma', '@vikram_patil', '@ananya_kulkarni', '@rahul_verma',
  'priya_sharma', 'vikram_patil', 'ananya_kulkarni', 'rahul_verma',
  'priya.sharma@campus.edu', 'vikram.patil@campus.edu', 'ananya.k@campus.edu', 'rahul.verma@campus.edu',
  '@alex_cs', 'alex_cs', 'demo@collegeos.app'
];

const FAKE_POST_IDS = [
  'post_os_01', 'post_ai_02', 'post_code_03', 'cloud-post-01', 'cloud-post-02'
];

var Storage = {
  _initDone: false,
  // Generic
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove(key) { localStorage.removeItem(key); },

  // ============================================================
  // INITIALIZATION & REALTIME BACKGROUND SYNC
  // ============================================================
  async init() {
    // Guard: only run init ONCE per page load to prevent API floods
    if (this._initDone) return;
    this._initDone = true;
    // 1. Clean up legacy fake accounts and mock posts from localStorage
    try {
      const localAccs = this.get(KEYS.ACCOUNTS, []);
      if (Array.isArray(localAccs) && localAccs.length > 0) {
        const cleanedAccs = localAccs.filter(a => {
          const h = (a.username || a.handle || '').toLowerCase();
          const em = (a.email || '').toLowerCase();
          return !FAKE_HANDLES.includes(h) && !FAKE_HANDLES.includes(em);
        });
        if (cleanedAccs.length !== localAccs.length) {
          this.set(KEYS.ACCOUNTS, cleanedAccs);
        }
      }

      const localPosts = this.get(KEYS.POSTS, []);
      if (Array.isArray(localPosts) && localPosts.length > 0) {
        const cleanedPosts = localPosts.filter(p => {
          const h = (p.handle || '').toLowerCase();
          return !FAKE_POST_IDS.includes(p.id) && !FAKE_HANDLES.includes(h);
        });
        if (cleanedPosts.length !== localPosts.length) {
          this.set(KEYS.POSTS, cleanedPosts);
        }
      }
    } catch (e) {
      console.warn('Legacy data purge note:', e);
    }

    // 2. Real-time Backend Sync
    if (window.PythonAPI) {
      try {
        // Sync Accounts from Backend and deduplicate by handle AND email
        const remoteAccounts = await PythonAPI.getAccounts();
        if (remoteAccounts && Array.isArray(remoteAccounts)) {
          const localAccs = this.getAccounts();
          const map = new Map();
          const emailMap = new Map();

          // Add remote accounts
          remoteAccounts.forEach(acc => {
            const rawH = (acc.username || acc.handle || '').toLowerCase();
            const h = rawH.startsWith('@') ? rawH : '@' + rawH;
            const em = (acc.email || '').trim().toLowerCase();
            if (h && !FAKE_HANDLES.includes(h) && !FAKE_HANDLES.includes(em)) {
              acc.username = h;
              acc.handle = h;
              map.set(h, acc);
              if (em && em !== 'campus0012@gmail.com') emailMap.set(em, h);
            }
          });

          // Merge local accounts
          localAccs.forEach(a => {
            const rawH = (a.username || a.handle || '').toLowerCase();
            const h = rawH.startsWith('@') ? rawH : '@' + rawH;
            const em = (a.email || '').trim().toLowerCase();
            if (h && !FAKE_HANDLES.includes(h) && !FAKE_HANDLES.includes(em)) {
              let targetHandle = h;
              if (em && emailMap.has(em)) {
                targetHandle = emailMap.get(em);
              }
              const existing = map.get(targetHandle) || {};
              map.set(targetHandle, { ...existing, ...a, username: targetHandle, handle: targetHandle });
            }
          });

          this.setAccounts(Array.from(map.values()));
        }

        // Sync Posts from Backend - merge so locally created student posts NEVER disappear!
        const posts = await PythonAPI.getPosts();
        if (posts && Array.isArray(posts)) {
          const localPosts = this.getPosts() || [];
          const postMap = new Map();
          posts.forEach(p => {
            if (p && p.id && !FAKE_POST_IDS.includes(p.id) && !FAKE_HANDLES.includes((p.handle || '').toLowerCase())) {
              postMap.set(p.id, p);
            }
          });
          // Collect local posts not yet on backend for deferred batch sync
          const toSyncToBackend = [];
          localPosts.forEach(p => {
            if (p && p.id && !FAKE_POST_IDS.includes(p.id) && !FAKE_HANDLES.includes((p.handle || '').toLowerCase())) {
              if (!postMap.has(p.id)) {
                postMap.set(p.id, p);
                toSyncToBackend.push(p);
              }
            }
          });
          const mergedPosts = Array.from(postMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          this.setPosts(mergedPosts);
          // Batch sync local-only posts to backend with staggered delays
          // to avoid flooding the API with simultaneous requests
          if (toSyncToBackend.length > 0 && window.PythonAPI && PythonAPI.createPost) {
            toSyncToBackend.forEach((p, i) => {
              setTimeout(() => {
                PythonAPI.createPost(p).catch(() => {});
              }, 1500 + (i * 800)); // stagger by 800ms each
            });
          }
        }

        // Sync Banners from Backend
        if (PythonAPI.getBanners) {
          const banners = await PythonAPI.getBanners();
          if (banners && Array.isArray(banners) && banners.length > 0) {
            const deletedBanners = this.getDeletedBannerIds();
            const filteredBanners = banners.filter(b => !deletedBanners.includes(b.id));
            if (filteredBanners.length > 0) {
              this.setBanners(filteredBanners);
            }
          }
        }
      } catch (e) {
        console.warn('Realtime sync background boot note:', e);
      }
    }
  },

  // ============================================================
  // CURRENT ACTIVE USER SESSION
  // ============================================================
  getUser() { return this.get(KEYS.USER); },
  setUser(u) {
    if (u) {
      const rawHandle = u.username || u.handle || (u.name ? '@' + u.name.toLowerCase().replace(/\s+/g, '_') : '@student');
      const handle = rawHandle.startsWith('@') ? rawHandle : '@' + rawHandle;
      u.username = handle;
      u.handle = handle;
      u.displayName = u.displayName || u.name || 'Student';
      u.name = u.displayName;
      if (u.photo) {
        try { localStorage.setItem('cos_photo_' + handle, u.photo); } catch (e) {}
      }
    }
    this.set(KEYS.USER, u);
    // NOTE: We do NOT call addAccount() here to avoid triggering
    // backend syncs on every getUser/setUser operation. Call addAccount()
    // explicitly when you need to persist account changes.
    return true;
  },
  clearUser() { this.remove(KEYS.USER); },

  authenticate(identifier, password) {
    if (!identifier || !password) return null;
    const clean = identifier.trim().toLowerCase();
    const accounts = this.getAccounts();
    const found = accounts.find(a => 
      ((a.email || '').toLowerCase() === clean) ||
      ((a.username || a.handle || '').toLowerCase() === clean) ||
      ((a.username || a.handle || '').toLowerCase() === ('@' + clean))
    );
    if (!found) return null;
    if (found.password && found.password !== password) {
      return null;
    }
    this.setUser(found);
    return found;
  },

  // ============================================================
  // REAL STUDENT ACCOUNTS DIRECTORY
  // ============================================================
  getDeletedHandles() {
    try {
      return JSON.parse(localStorage.getItem('cos_deleted_handles_v2') || '[]');
    } catch(e) { return []; }
  },
  addDeletedHandle(handle) {
    if (!handle) return;
    const clean = handle.startsWith('@') ? handle.toLowerCase() : '@' + handle.toLowerCase();
    const list = this.getDeletedHandles();
    if (!list.includes(clean)) {
      list.push(clean);
      localStorage.setItem('cos_deleted_handles_v2', JSON.stringify(list));
    }
  },
  removeDeletedHandle(handle) {
    if (!handle) return;
    const clean = handle.startsWith('@') ? handle.toLowerCase() : '@' + handle.toLowerCase();
    const list = this.getDeletedHandles().filter(h => h !== clean);
    localStorage.setItem('cos_deleted_handles_v2', JSON.stringify(list));
  },
  getAccounts() {
    const raw = this.get(KEYS.ACCOUNTS, []);
    let list = (raw && Array.isArray(raw)) ? raw : [];
    const deleted = this.getDeletedHandles();
    
    // Filter out deleted and fake legacy demo accounts
    list = list.filter(a => {
      const h = (a.username || a.handle || '').toLowerCase();
      const em = (a.email || '').toLowerCase();
      return !deleted.includes(h) && !FAKE_HANDLES.includes(h) && !FAKE_HANDLES.includes(em);
    });

    return list;
  },
  setAccounts(accounts) {
    const deleted = this.getDeletedHandles();
    const seenHandles = new Set();
    const seenEmails = new Set();
    const cleanList = [];

    (accounts || []).forEach(a => {
      const rawH = (a.username || a.handle || '').toLowerCase();
      const h = rawH.startsWith('@') ? rawH : '@' + rawH;
      const em = (a.email || '').trim().toLowerCase();
      if (!h || deleted.includes(h) || FAKE_HANDLES.includes(h) || (em && FAKE_HANDLES.includes(em))) {
        return;
      }
      if (seenHandles.has(h)) return;
      if (em && seenEmails.has(em) && em !== 'campus0012@gmail.com') return;

      seenHandles.add(h);
      if (em) seenEmails.add(em);
      cleanList.push({ ...a, username: h, handle: h });
    });

    return this.set(KEYS.ACCOUNTS, cleanList);
  },
  isEmailTaken(email, excludeHandle = null) {
    if (!email || !email.trim()) return false;
    const cleanEmail = email.trim().toLowerCase();
    const cleanExclude = excludeHandle ? (excludeHandle.trim().toLowerCase().startsWith('@') ? excludeHandle.trim().toLowerCase() : '@' + excludeHandle.trim().toLowerCase()) : '';
    const accounts = this.getAccounts();
    return accounts.some(a => {
      const aEmail = (a.email || '').trim().toLowerCase();
      const aHandle = (a.username || a.handle || '').trim().toLowerCase();
      return aEmail === cleanEmail && aHandle !== cleanExclude;
    });
  },
  addAccount(account) {
    if (!account) return;
    const rawHandle = account.username || account.handle || (account.name ? '@' + account.name.toLowerCase().replace(/\s+/g, '_') : '@student');
    const handle = rawHandle.startsWith('@') ? rawHandle.toLowerCase() : '@' + rawHandle.toLowerCase();
    const emailClean = (account.email || '').trim().toLowerCase();
    
    // Remove from deleted list if re-registered
    this.removeDeletedHandle(handle);

    const accounts = this.getAccounts();
    const updatedAccount = {
      ...account,
      username: handle,
      handle: handle,
      displayName: account.displayName || account.name || 'Student',
      name: account.displayName || account.name || 'Student',
      email: account.email || '',
      department: account.department || 'Computer Science & Engineering',
      semester: Number(account.semester) || 5,
      program: account.program || 'BCA',
      college: account.college || 'Campus OS Academic Network',
      usn: account.usn || null,
      bio: account.bio || '',
      skills: account.skills || [],
      privacy: account.privacy || { profileVisibility: 'public', showEmail: false, showUSN: true },
      updatedAt: Date.now()
    };

    // Match existing by handle OR email to prevent duplicate accounts
    const index = accounts.findIndex(a => {
      const aHandle = (a.username || a.handle || '').toLowerCase();
      const aEmail = (a.email || '').trim().toLowerCase();
      return aHandle === handle || (emailClean && emailClean !== 'campus0012@gmail.com' && aEmail === emailClean);
    });

    if (index >= 0) {
      accounts[index] = { ...accounts[index], ...updatedAccount };
    } else {
      accounts.unshift(updatedAccount);
    }
    this.setAccounts(accounts);

    // Save profile photo if provided
    if (account.photo) {
      this.setUserPhoto(handle, account.photo);
    }

    // Sync to SQLite Backend in background
    if (window.PythonAPI && PythonAPI.saveAccount) {
      PythonAPI.saveAccount(updatedAccount).catch(() => {});
    }

    return updatedAccount;
  },
  changeAccountHandle(oldHandle, newHandle) {
    if (!oldHandle || !newHandle) return false;
    const oldClean = oldHandle.startsWith('@') ? oldHandle.toLowerCase() : '@' + oldHandle.toLowerCase();
    const newClean = newHandle.startsWith('@') ? newHandle.toLowerCase() : '@' + newHandle.toLowerCase();
    if (oldClean === newClean) return true;

    // 1. Update Accounts Directory
    const accounts = this.getAccounts();
    const existing = accounts.find(a => (a.username || a.handle || '').toLowerCase() === oldClean);
    if (existing) {
      existing.username = newClean;
      existing.handle = newClean;
      existing.updatedAt = Date.now();
      const filtered = accounts.filter(a => (a.username || a.handle || '').toLowerCase() !== oldClean);
      filtered.unshift(existing);
      this.setAccounts(filtered);
    }

    // 2. Update Current User Session if matched
    const cur = this.getUser();
    if (cur && (cur.username || cur.handle || '').toLowerCase() === oldClean) {
      cur.username = newClean;
      cur.handle = newClean;
      this.setUser(cur);
    }

    // 3. Migrate Photo in localStorage
    const oldPhoto = this.getUserPhoto(oldClean);
    if (oldPhoto) {
      this.setUserPhoto(newClean, oldPhoto);
      try { localStorage.removeItem('cos_photo_' + oldClean); } catch(e) {}
    }

    // 4. Update all posts in cos_posts created by this handle
    const posts = this.getPosts();
    let postsChanged = false;
    posts.forEach(p => {
      if ((p.handle || '').toLowerCase() === oldClean) {
        p.handle = newClean;
        postsChanged = true;
      }
      if (p.comments && Array.isArray(p.comments)) {
        p.comments.forEach(c => {
          if ((c.handle || '').toLowerCase() === oldClean) {
            c.handle = newClean;
            postsChanged = true;
          }
        });
      }
    });
    if (postsChanged) this.setPosts(posts);

    // 5. Update notes, tasks
    const notes = this.getNotes();
    let notesChanged = false;
    notes.forEach(n => {
      if ((n.handle || '').toLowerCase() === oldClean) {
        n.handle = newClean;
        notesChanged = true;
      }
    });
    if (notesChanged) this.setNotes(notes);

    const tasks = this.getTasks();
    let tasksChanged = false;
    tasks.forEach(t => {
      if ((t.handle || '').toLowerCase() === oldClean) {
        t.handle = newClean;
        tasksChanged = true;
      }
    });
    if (tasksChanged) this.setTasks(tasks);

    // 6. Backend API sync
    if (window.PythonAPI && PythonAPI.changeHandle) {
      PythonAPI.changeHandle(oldClean, newClean).catch(e => console.warn('changeHandle API sync:', e));
    }

    return true;
  },
  getAccountByHandle(handle) {
    if (!handle) return null;
    const clean = handle.startsWith('@') ? handle.toLowerCase() : '@' + handle.toLowerCase();
    const rawNoAt = handle.replace(/^@/, '').toLowerCase();
    const accounts = this.getAccounts();
    
    const acc = accounts.find(a => {
      const aHandle = (a.username || a.handle || '').toLowerCase();
      return aHandle === clean || aHandle === rawNoAt || aHandle.replace(/^@/, '') === rawNoAt;
    });

    if (acc) return acc;

    // Check if it's currently logged in user
    const curUser = this.getUser();
    if (curUser) {
      const curH = (curUser.username || curUser.handle || '').toLowerCase();
      if (curH === clean || curH === rawNoAt || curH.replace(/^@/, '') === rawNoAt) {
        return curUser;
      }
    }

    return null;
  },
  searchAccounts(query) {
    if (!query) return [];
    const q = query.trim().toLowerCase().replace(/^@/, '');
    return this.getAccounts().filter(a => {
      const name = (a.displayName || a.name || '').toLowerCase();
      const handle = (a.username || a.handle || '').toLowerCase().replace(/^@/, '');
      const usn = (a.usn || '').toLowerCase();
      const dept = (a.department || '').toLowerCase();
      return name.includes(q) || handle.includes(q) || usn.includes(q) || dept.includes(q);
    });
  },
  searchPosts(query) {
    if (!query) return [];
    const q = query.trim().toLowerCase().replace(/^@/, '');
    return this.getPosts().filter(p => {
      const title = (p.title || '').toLowerCase();
      const subject = (p.subject || '').toLowerCase();
      const desc = (p.desc || '').toLowerCase();
      const author = (p.author || '').toLowerCase();
      const handle = (p.handle || '').toLowerCase().replace(/^@/, '');
      return title.includes(q) || subject.includes(q) || desc.includes(q) || author.includes(q) || handle.includes(q);
    });
  },
  searchEverything(query) {
    if (!query) return { accounts: [], posts: [], notes: [] };
    const q = query.trim().toLowerCase().replace(/^@/, '');
    return {
      accounts: this.searchAccounts(q),
      posts: this.searchPosts(q),
      notes: (this.getNotes() || []).filter(n => {
        const title = (n.title || '').toLowerCase();
        const sub = (n.subject || '').toLowerCase();
        const content = (n.content || '').toLowerCase();
        return title.includes(q) || sub.includes(q) || content.includes(q);
      })
    };
  },
  updateAccountRole(handle, role) {
    if (!handle) return;
    const clean = handle.startsWith('@') ? handle.toLowerCase() : '@' + handle.toLowerCase();
    const accounts = this.getAccounts();
    const target = accounts.find(a => (a.username || a.handle || '').toLowerCase() === clean);
    if (target) {
      target.role = role;
      this.setAccounts(accounts);
    }
    const curUser = this.getUser();
    if (curUser && (curUser.username || curUser.handle || '').toLowerCase() === clean) {
      curUser.role = role;
      this.setUser(curUser);
    }
  },
  deleteAccount(handle) {
    if (!handle) return false;
    const clean = handle.startsWith('@') ? handle.toLowerCase() : '@' + handle.toLowerCase();
    this.addDeletedHandle(clean);
    
    // 1. Remove from accounts
    const accounts = this.getAccounts().filter(a => (a.username || a.handle || '').toLowerCase() !== clean);
    this.setAccounts(accounts);

    // 2. Clear current session if deleting self
    const curUser = this.getUser();
    if (curUser && (curUser.username || curUser.handle || '').toLowerCase() === clean) {
      this.clearUser();
    }

    // 3. Remove all posts created by this handle
    const posts = this.getPosts().filter(p => (p.handle || '').toLowerCase() !== clean);
    this.setPosts(posts);

    // 4. Remove saved photo
    try { localStorage.removeItem('cos_photo_' + clean); } catch (e) {}

    // 5. Backend sync deletion
    if (window.PythonAPI && PythonAPI.deleteAccount) {
      PythonAPI.deleteAccount(clean).catch(() => {});
    }
    return true;
  },

  // ============================================================
  // USER PROFILE PHOTO STORAGE
  // ============================================================
  getUserPhoto(handle) {
    if (!handle) return null;
    const clean = handle.startsWith('@') ? handle.toLowerCase() : '@' + handle.toLowerCase();
    try {
      const direct = localStorage.getItem('cos_photo_' + clean);
      if (direct) return direct;
      
      const acc = this.getAccountByHandle(clean);
      if (acc && acc.photo) return acc.photo;

      const user = this.getUser();
      if (user && ((user.username || user.handle || '').toLowerCase() === clean) && user.photo) {
        return user.photo;
      }
    } catch(e) {}
    return null;
  },
  setUserPhoto(handle, photoBase64) {
    if (!handle) return;
    const clean = handle.startsWith('@') ? handle.toLowerCase() : '@' + handle.toLowerCase();
    
    // Fix: null/undefined means REMOVE the photo, not store string "null"
    if (!photoBase64) {
      try { localStorage.removeItem('cos_photo_' + clean); } catch(e) {}
      // Also clear it from the accounts array and current user
      const accounts = this.getAccounts();
      const acc = accounts.find(a => (a.username || a.handle || '').toLowerCase() === clean);
      if (acc) {
        delete acc.photo;
        this.setAccounts(accounts);
      }
      const cur = this.getUser();
      if (cur && (cur.username || cur.handle || '').toLowerCase() === clean) {
        delete cur.photo;
        this.set(KEYS.USER, cur);
      }
      return;
    }

    try {
      localStorage.setItem('cos_photo_' + clean, photoBase64);
    } catch (e) {
      console.warn('Local storage quota warning for photo:', e);
    }

    const accounts = this.getAccounts();
    const acc = accounts.find(a => (a.username || a.handle || '').toLowerCase() === clean);
    if (acc) {
      acc.photo = photoBase64;
      this.setAccounts(accounts);
    }

    const cur = this.getUser();
    if (cur && (cur.username || cur.handle || '').toLowerCase() === clean) {
      cur.photo = photoBase64;
      this.set(KEYS.USER, cur); // use set() not setUser() to avoid triggering addAccount again
    }

    if (window.PythonAPI && PythonAPI.updateAccountPhoto) {
      PythonAPI.updateAccountPhoto(clean, photoBase64).catch(() => {});
    }
  },

  // ============================================================
  // POSTS FEED & STUDY MATERIALS
  // ============================================================
  getPosts() {
    const list = this.get(KEYS.POSTS, []);
    if (!list || !Array.isArray(list)) return [];
    // Filter out any legacy fake posts
    return list.filter(p => !FAKE_POST_IDS.includes(p.id) && !FAKE_HANDLES.includes((p.handle || '').toLowerCase()));
  },
  setPosts(posts) {
    const clean = (posts || []).filter(p => !FAKE_POST_IDS.includes(p.id) && !FAKE_HANDLES.includes((p.handle || '').toLowerCase()));
    return this.set(KEYS.POSTS, clean);
  },
  addPost(post) {
    const posts = this.getPosts();
    const rawHandle = post.handle || (this.getUser() ? this.getUser().username || this.getUser().handle : '@student');
    const handle = rawHandle.startsWith('@') ? rawHandle : '@' + rawHandle;
    const authorPhoto = this.getUserPhoto(handle) || post.authorPhoto || post.photo || null;

    const newPost = {
      id: post.id || ('post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)),
      type: post.type || 'text',
      title: post.title,
      subject: post.subject || 'General',
      department: post.department || 'Computer Science & Engineering',
      desc: post.desc || '',
      author: post.author || (this.getUser() ? this.getUser().displayName || this.getUser().name : 'Student'),
      handle: handle,
      authorPhoto: authorPhoto,
      fileName: post.fileName || null,
      fileSize: post.fileSize || null,
      pdfData: post.pdfData || null,
      youtubeUrl: post.youtubeUrl || null,
      likes: post.likes || 0,
      saves: post.saves || 0,
      comments: post.comments || [],
      createdAt: post.createdAt || Date.now()
    };

    const existingIdx = posts.findIndex(p => p.id === newPost.id);
    if (existingIdx >= 0) {
      posts[existingIdx] = { ...posts[existingIdx], ...newPost };
    } else {
      posts.unshift(newPost);
    }
    this.setPosts(posts);

    if (window.PythonAPI && PythonAPI.createPost) {
      PythonAPI.createPost(newPost).catch(() => {});
    }
    return newPost;
  },
  getPost(id) {
    return this.getPosts().find(p => p.id === id) || null;
  },
  updatePost(id, updatedFields) {
    const posts = this.getPosts();
    const idx = posts.findIndex(p => p.id === id);
    if (idx >= 0) {
      posts[idx] = { ...posts[idx], ...updatedFields };
      this.setPosts(posts);
      if (window.PythonAPI && PythonAPI.updatePost) {
        PythonAPI.updatePost(id, updatedFields).catch(() => {});
      }
      return posts[idx];
    }
    return null;
  },
  deletePost(id) {
    const posts = this.getPosts().filter(p => p.id !== id);
    this.setPosts(posts);
    if (window.PythonAPI && PythonAPI.deletePost) {
      PythonAPI.deletePost(id).catch(() => {});
    }
    return true;
  },
  likePost(id, userHandle) {
    const posts = this.getPosts();
    const post = posts.find(p => p.id === id);
    if (!post) return 0;
    
    const likedKey = 'cos_liked_by_' + (userHandle || 'guest');
    const likedSet = new Set(this.get(likedKey, []));
    let hasLiked = likedSet.has(id);

    if (hasLiked) {
      post.likes = Math.max(0, (post.likes || 1) - 1);
      likedSet.delete(id);
    } else {
      post.likes = (post.likes || 0) + 1;
      likedSet.add(id);
    }
    this.set(likedKey, Array.from(likedSet));
    this.setPosts(posts);

    if (window.PythonAPI && PythonAPI.likePost) {
      PythonAPI.likePost(id, userHandle).catch(() => {});
    }
    return post.likes;
  },
  hasUserLiked(id, userHandle) {
    const likedKey = 'cos_liked_by_' + (userHandle || 'guest');
    const likedSet = new Set(this.get(likedKey, []));
    return likedSet.has(id);
  },
  savePost(id, userHandle) {
    const posts = this.getPosts();
    const post = posts.find(p => p.id === id);
    if (!post) return false;

    const savedKey = 'cos_saved_by_' + (userHandle || 'guest');
    const savedSet = new Set(this.get(savedKey, []));
    let isSaved = savedSet.has(id);

    if (isSaved) {
      post.saves = Math.max(0, (post.saves || 1) - 1);
      savedSet.delete(id);
    } else {
      post.saves = (post.saves || 0) + 1;
      savedSet.add(id);
    }
    this.set(savedKey, Array.from(savedSet));
    this.setPosts(posts);

    if (window.PythonAPI && PythonAPI.savePost) {
      PythonAPI.savePost(id, userHandle).catch(() => {});
    }
    return !isSaved;
  },
  hasUserSaved(id, userHandle) {
    const savedKey = 'cos_saved_by_' + (userHandle || 'guest');
    const savedSet = new Set(this.get(savedKey, []));
    return savedSet.has(id);
  },
  addComment(postId, comment) {
    const posts = this.getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) return null;

    if (!post.comments) post.comments = [];
    const newComment = {
      id: comment.id || ('comment_' + Date.now()),
      author: comment.author || (this.getUser() ? this.getUser().displayName || this.getUser().name : 'Student'),
      handle: comment.handle || (this.getUser() ? this.getUser().username || this.getUser().handle : '@student'),
      text: comment.text,
      createdAt: comment.createdAt || Date.now()
    };
    post.comments.push(newComment);
    this.setPosts(posts);

    if (window.PythonAPI && PythonAPI.addComment) {
      PythonAPI.addComment(postId, newComment).catch(() => {});
    }
    return newComment;
  },

  // ============================================================
  // PDF DOCUMENTS & VAULT
  // ============================================================
  getPDFMaterials() {
    return this.get(KEYS.PDF_DOCS, []);
  },
  addPDFMaterial(doc) {
    const docs = this.getPDFMaterials();
    const newDoc = {
      id: doc.id || ('pdf_' + Date.now()),
      title: doc.title,
      subject: doc.subject || 'General',
      department: doc.department || 'Computer Science & Engineering',
      uploader: doc.uploader || 'Student',
      uploaderHandle: doc.uploaderHandle || '@student',
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      fileData: doc.fileData,
      downloadCount: 0,
      createdAt: Date.now()
    };
    docs.unshift(newDoc);
    this.set(KEYS.PDF_DOCS, docs);
    return newDoc;
  },

  // ============================================================
  // NOTES, TASKS, ATTENDANCE, TIMETABLE, RESOURCES
  // ============================================================
  getNotes() { return this.get(KEYS.NOTES, []); },
  setNotes(notes) { return this.set(KEYS.NOTES, notes); },
  addNote(note) {
    const list = this.getNotes();
    const n = { id: note.id || ('note_' + Date.now()), ...note, createdAt: Date.now(), updatedAt: Date.now() };
    list.unshift(n);
    this.setNotes(list);
    if (window.PythonAPI && PythonAPI.saveNote) PythonAPI.saveNote(n).catch(() => {});
    return n;
  },
  updateNote(id, data) {
    const list = this.getNotes();
    const idx = list.findIndex(n => n.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...data, updatedAt: Date.now() };
      this.setNotes(list);
      if (window.PythonAPI && PythonAPI.saveNote) PythonAPI.saveNote(list[idx]).catch(() => {});
      return list[idx];
    }
    return null;
  },
  deleteNote(id) {
    const list = this.getNotes().filter(n => n.id !== id);
    this.setNotes(list);
    if (window.PythonAPI && PythonAPI.deleteNote) PythonAPI.deleteNote(id).catch(() => {});
    return true;
  },

  getTasks() { return this.get(KEYS.TASKS, []); },
  setTasks(tasks) { return this.set(KEYS.TASKS, tasks); },
  addTask(task) {
    const list = this.getTasks();
    const t = { id: task.id || ('task_' + Date.now()), ...task, createdAt: Date.now() };
    list.unshift(t);
    this.setTasks(list);
    if (window.PythonAPI && PythonAPI.saveTask) PythonAPI.saveTask(t).catch(() => {});
    return t;
  },
  updateTask(id, data) {
    const list = this.getTasks();
    const idx = list.findIndex(t => t.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...data };
      this.setTasks(list);
      if (window.PythonAPI && PythonAPI.saveTask) PythonAPI.saveTask(list[idx]).catch(() => {});
      return list[idx];
    }
    return null;
  },
  deleteTask(id) {
    const list = this.getTasks().filter(t => t.id !== id);
    this.setTasks(list);
    if (window.PythonAPI && PythonAPI.deleteTask) PythonAPI.deleteTask(id).catch(() => {});
    return true;
  },

  getAttendance() { return this.get(KEYS.ATTENDANCE, []); },
  setAttendance(records) { return this.set(KEYS.ATTENDANCE, records); },
  addAttendanceSubject(sub) {
    const list = this.getAttendance();
    const record = { id: sub.id || ('att_' + Date.now()), ...sub };
    list.push(record);
    this.setAttendance(list);
    if (window.PythonAPI && PythonAPI.saveAttendance) PythonAPI.saveAttendance(record).catch(() => {});
    return record;
  },
  updateAttendanceSubject(id, data) {
    const list = this.getAttendance();
    const idx = list.findIndex(a => a.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...data };
      this.setAttendance(list);
      if (window.PythonAPI && PythonAPI.saveAttendance) PythonAPI.saveAttendance(list[idx]).catch(() => {});
      return list[idx];
    }
    return null;
  },
  deleteAttendanceSubject(id) {
    const list = this.getAttendance().filter(a => a.id !== id);
    this.setAttendance(list);
    return true;
  },

  getTimetable() { return this.get(KEYS.TIMETABLE, {}); },
  setTimetable(tt) { return this.set(KEYS.TIMETABLE, tt); },
  setClassSlot(day, time, slot) {
    const tt = this.getTimetable();
    if (!tt[day]) tt[day] = {};
    tt[day][time] = slot;
    this.setTimetable(tt);
    return tt;
  },
  clearClassSlot(day, time) {
    const tt = this.getTimetable();
    if (tt[day] && tt[day][time]) {
      delete tt[day][time];
      this.setTimetable(tt);
    }
    return tt;
  },

  getResources() { return this.get(KEYS.RESOURCES, []); },
  setResources(res) { return this.set(KEYS.RESOURCES, res); },
  addResource(r) {
    const list = this.getResources();
    const newR = { id: r.id || ('res_' + Date.now()), ...r, downloadCount: 0, createdAt: Date.now() };
    list.unshift(newR);
    this.setResources(list);
    return newR;
  },
  deleteResource(id) {
    const list = this.getResources().filter(r => r.id !== id);
    this.setResources(list);
    return true;
  },

  // ============================================================
  // DYNAMIC HERO BANNERS
  // ============================================================
  getDeletedBannerIds() {
    try {
      return JSON.parse(localStorage.getItem('cos_deleted_banner_ids') || '[]');
    } catch (e) { return []; }
  },
  addDeletedBannerId(id) {
    if (!id) return;
    const list = this.getDeletedBannerIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem('cos_deleted_banner_ids', JSON.stringify(list));
    }
  },
  removeDeletedBannerId(id) {
    if (!id) return;
    const list = this.getDeletedBannerIds().filter(x => x !== id);
    localStorage.setItem('cos_deleted_banner_ids', JSON.stringify(list));
  },
  getBanners() {
    const deleted = this.getDeletedBannerIds();
    const raw = this.get(KEYS.BANNERS, null);
    let list = [];

    if (raw !== null && Array.isArray(raw)) {
      list = raw;
    } else {
      list = [
        {
          id: "banner_1",
          title: "Student Academic Platform &<br /><span class=\"text-hero-gradient\">Campus OS Network</span>",
          subtitle: "Stay ahead with academic roadmaps, lecture timetables, verified study notes, and campus resource hubs.",
          badge: "✨ Universal Campus Academic Platform",
          cta_text: "📊 Open Dashboard →",
          cta_url: "dashboard.html",
          secondary_text: "🚀 Create Account",
          secondary_url: "javascript:openAccountModal()",
          image_url: "img/banner1.jpg",
          sort_order: 1,
          active: 1
        },
        {
          id: "banner_2",
          title: "Weekly Lectures &<br /><span class=\"text-hero-gradient\" style=\"background:linear-gradient(135deg, #38bdf8 0%, #a78bfa 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;\">Daily Class Periods</span>",
          subtitle: "Check live timetable periods, room locations, and lab schedule allocations across all semester branches.",
          badge: "📅 Class Timetables",
          cta_text: "📅 View Timetable →",
          cta_url: "timetable.html",
          secondary_text: null,
          secondary_url: null,
          image_url: "img/banner2.jpg",
          sort_order: 2,
          active: 1
        },
        {
          id: "banner_3",
          title: "Attendance Health &<br /><span class=\"text-hero-gradient\" style=\"background:linear-gradient(135deg, #34d399 0%, #38bdf8 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;\">Smart Study Notes Vault</span>",
          subtitle: "Calculate safe bunk margins, track minimum 75% thresholds, and access verified handwritten student notes.",
          badge: "🌟 75% Attendance Radar",
          cta_text: "📈 Check Attendance",
          cta_url: "attendance.html",
          secondary_text: "📝 Notes Vault",
          secondary_url: "notes.html",
          image_url: "img/banner3.jpg",
          sort_order: 3,
          active: 1
        }
      ];
      this.set(KEYS.BANNERS, list);
    }

    if (deleted.length > 0) {
      list = list.filter(b => !deleted.includes(b.id));
    }
    return list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  },
  setBanners(banners) {
    const deleted = this.getDeletedBannerIds();
    const clean = (banners || []).filter(b => !deleted.includes(b.id));
    return this.set(KEYS.BANNERS, clean);
  },
  saveBanner(banner) {
    if (!banner) return null;
    const id = banner.id || ('banner_' + Date.now());
    this.removeDeletedBannerId(id);
    const banners = this.getBanners();
    const idx = banners.findIndex(b => b.id === id);
    const newB = { ...banner, id, sort_order: Number(banner.sort_order) || (banners.length + 1) };
    if (idx >= 0) {
      banners[idx] = newB;
    } else {
      banners.push(newB);
    }
    this.setBanners(banners);
    if (window.PythonAPI && PythonAPI.saveAdminBanner) {
      PythonAPI.saveAdminBanner(newB).catch(() => {});
    }
    return newB;
  },
  deleteBanner(id) {
    if (!id) return false;
    this.addDeletedBannerId(id);
    const banners = this.getBanners().filter(b => b.id !== id);
    this.setBanners(banners);
    if (window.PythonAPI && PythonAPI.deleteAdminBanner) {
      PythonAPI.deleteAdminBanner(id).catch(() => {});
    }
    return true;
  },

  // ============================================================
  // ADMIN GATEKEEPER & SESSION
  // ============================================================
  getAdminToken() {
    return sessionStorage.getItem(KEYS.ADMIN_TOKEN) || localStorage.getItem(KEYS.ADMIN_TOKEN);
  },
  getAdminUser() {
    return this.get(KEYS.ADMIN_USER, null);
  },
  setAdminSession(token, adminData, persist = false) {
    if (persist) {
      localStorage.setItem(KEYS.ADMIN_TOKEN, token);
    } else {
      sessionStorage.setItem(KEYS.ADMIN_TOKEN, token);
    }
    this.set(KEYS.ADMIN_USER, adminData);
  },
  clearAdminSession() {
    sessionStorage.removeItem(KEYS.ADMIN_TOKEN);
    localStorage.removeItem(KEYS.ADMIN_TOKEN);
    this.remove(KEYS.ADMIN_USER);
  },
  isAdmin() {
    const user = this.getUser();
    if (user && (user.role === 'ADMIN' || user.role === 'OWNER_ADMIN')) return true;
    const token = this.getAdminToken();
    return !!token;
  },

  // ============================================================
  // METRICS COMPUTATION (REAL-TIME DATA)
  // ============================================================
  getLiveMetrics() {
    const accounts = this.getAccounts();
    const posts = this.getPosts();
    const pdfs = this.getPDFMaterials();
    const pdfPosts = posts.filter(p => p.type === 'pdf' || p.fileName);

    const depts = new Set();
    accounts.forEach(a => { if (a.department) depts.add(a.department); });
    posts.forEach(p => { if (p.department) depts.add(p.department); });

    return {
      totalStudents: accounts.length,
      totalPDFs: pdfs.length + pdfPosts.length,
      totalPosts: posts.length,
      activeDepartments: depts.size || 1,
      syncUptime: '99.9%'
    };
  }
};

// Global genId helper
window.genId = function() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
};

// Initialize Storage and kick off real-time backend sync
Storage.init();

// Export to window reliably avoiding native non-writable window.Storage collision
window.CampusStorage = Storage;
window.COS_Storage = Storage;

// Attach all custom methods directly onto the native window.Storage constructor as static functions
if (typeof window !== 'undefined' && window.Storage) {
  for (var k in Storage) {
    if (Object.prototype.hasOwnProperty.call(Storage, k)) {
      try {
        window.Storage[k] = Storage[k];
      } catch(e) {}
    }
  }
}

try {
  Object.defineProperty(window, 'Storage', {
    value: Storage,
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch(e) {
  try { window.Storage = Storage; } catch(err) {}
}
