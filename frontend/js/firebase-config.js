// ============================================
// Campus OS — Firebase Cloud Realtime Engine
// Live Cloud Firestore, Realtime Sync & Cloud Storage
// Project: campus-os-6b380
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyCQYWN1qU7qWlFi8RcUggqvQvL-V3sTV0Y",
  authDomain: "campus-os-6b380.firebaseapp.com",
  projectId: "campus-os-6b380",
  storageBucket: "campus-os-6b380.firebasestorage.app",
  messagingSenderId: "1092410126189",
  appId: "1:1092410126189:web:ebf929d66aa51bc81ef464",
  measurementId: "G-WJPJZPV08Q"
};

// Global Firebase Cloud Service
window.FirebaseService = {
  isConfigured: true,
  app: null,
  db: null,
  storage: null,
  auth: null,
  listeners: [],

  init() {
    if (typeof firebase !== 'undefined') {
      try {
        if (!firebase.apps.length) {
          this.app = firebase.initializeApp(firebaseConfig);
        } else {
          this.app = firebase.app();
        }
        this.db = firebase.firestore ? firebase.firestore() : null;
        this.storage = firebase.storage ? firebase.storage() : null;
        this.auth = firebase.auth ? firebase.auth() : null;

        console.log("🔥 [Firebase] Cloud Firestore & Realtime Engine Initialized: campus-os-6b380");

        // Seed initial data to cloud if collections are empty
        this.seedInitialCloudData();

        // Start Real-time Live Listeners for cross-device synchronization
        this.startRealtimeListeners();
      } catch (e) {
        console.warn("⚠️ [Firebase] Init note:", e);
      }
    } else {
      console.log("⚡ [Campus OS] Running in Local Storage Mode (Firebase SDK loading in background)");
    }
  },

  // ============================================================
  // REAL-TIME FIRESTORE LISTENERS (Instagram / FB Live Feed)
  // ============================================================
  startRealtimeListeners() {
    if (!this.db) return;

    try {
      // 1. Live Posts Feed Listener
      this.db.collection('posts').orderBy('createdAt', 'desc').limit(50).onSnapshot(snapshot => {
        const livePosts = [];
        snapshot.forEach(doc => {
          livePosts.push({ id: doc.id, ...doc.data() });
        });

        if (livePosts.length > 0 && window.Storage) {
          window.Storage.setPosts(livePosts);
          // Trigger feed rerender if on index.html
          if (typeof renderStudyPosts === 'function') {
            renderStudyPosts();
          }
          if (typeof updateRealtimeMetrics === 'function') {
            updateRealtimeMetrics();
          }
        }
      }, err => {
        console.warn("Firestore posts listener notice (enable Firestore in test mode if permissions error):", err);
      });

      // 2. Live Student Accounts Directory Listener
      this.db.collection('students').onSnapshot(snapshot => {
        const liveAccounts = [];
        snapshot.forEach(doc => {
          liveAccounts.push(doc.data());
        });

        if (liveAccounts.length > 0 && window.Storage) {
          window.Storage.setAccounts(liveAccounts);
          if (typeof syncNavbarUser === 'function') {
            syncNavbarUser();
          }
        }
      }, err => {
        console.warn("Firestore students listener notice:", err);
      });

    } catch (e) {
      console.warn("Realtime listener setup note:", e);
    }
  },

  // ============================================================
  // STUDENT ACCOUNTS IN FIRESTORE
  // ============================================================
  async saveStudentProfile(user) {
    if (!user) return;
    const rawHandle = user.username || user.handle || '@student';
    const cleanHandle = rawHandle.startsWith('@') ? rawHandle : '@' + rawHandle;
    const docId = cleanHandle.replace(/[@.]/g, '_').toLowerCase();

    const studentData = {
      username: cleanHandle,
      handle: cleanHandle,
      displayName: user.displayName || user.name || 'Student',
      name: user.displayName || user.name || 'Student',
      email: user.email || null,
      department: user.department || 'Computer Science & Engineering',
      semester: Number(user.semester) || 5,
      usn: user.usn || null,
      bio: user.bio || '',
      skills: user.skills || [],
      photo: user.photo || null,
      role: user.role || 'STUDENT',
      xp: Number(user.xp) || 150,
      updatedAt: Date.now()
    };

    // Save to Cloud Firestore
    if (this.db) {
      try {
        await this.db.collection('students').doc(docId).set(studentData, { merge: true });
        console.log("☁️ [Firebase] Synced student account to Firestore:", cleanHandle);
      } catch (e) {
        console.warn("Firestore save note:", e);
      }
    }

    // Always persist to local storage engine
    if (window.Storage) {
      window.Storage.setUser(studentData);
      window.Storage.addAccount(studentData);
    }

    return studentData;
  },

  async getStudentProfile(handle) {
    if (!handle) return null;
    const clean = handle.startsWith('@') ? handle : '@' + handle;
    const docId = clean.replace(/[@.]/g, '_').toLowerCase();

    if (this.db) {
      try {
        const doc = await this.db.collection('students').doc(docId).get();
        if (doc.exists) {
          return doc.data();
        }
      } catch (e) {
        console.warn("Firestore get student note:", e);
      }
    }
    return window.Storage ? window.Storage.getAccountByHandle(clean) : null;
  },

  // ============================================================
  // REAL-TIME POSTS IN FIRESTORE
  // ============================================================
  async createPost(post) {
    const pid = post.id || ('post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4));
    const handle = (post.handle || '@student').startsWith('@') ? post.handle : '@' + post.handle;

    const postPayload = {
      id: pid,
      type: post.type || 'text',
      title: post.title,
      subject: post.subject || 'General',
      department: post.department || 'Computer Science & Engineering',
      desc: post.desc || '',
      author: post.author || 'Student',
      handle: handle,
      fileName: post.fileName || null,
      fileSize: post.fileSize || null,
      pdfData: post.pdfData || null,
      youtubeUrl: post.youtubeUrl || null,
      likes: post.likes || 0,
      saves: post.saves || 0,
      comments: post.comments || [],
      createdAt: post.createdAt || Date.now()
    };

    if (this.db) {
      try {
        await this.db.collection('posts').doc(pid).set(postPayload);
        console.log("☁️ [Firebase] Post published to Cloud Firestore:", pid);
      } catch (e) {
        console.warn("Firestore create post note:", e);
      }
    }

    if (window.Storage) {
      window.Storage.addPost(postPayload);
    }

    return postPayload;
  },

  async deletePost(postId) {
    if (this.db) {
      try {
        await this.db.collection('posts').doc(postId).delete();
        console.log("☁️ [Firebase] Post deleted from Cloud Firestore:", postId);
      } catch (e) {
        console.warn("Firestore delete post note:", e);
      }
    }
    if (window.Storage) {
      window.Storage.deletePost(postId);
    }
    return true;
  },

  async toggleLike(postId, userHandle) {
    const cleanHandle = userHandle || '@student';
    if (this.db) {
      try {
        const postRef = this.db.collection('posts').doc(postId);
        const doc = await postRef.get();
        if (doc.exists) {
          const data = doc.data();
          const currentLikes = data.likes || 0;
          await postRef.update({ likes: currentLikes + 1 });
        }
      } catch (e) {
        console.warn("Firestore like sync note:", e);
      }
    }
    if (window.Storage) {
      window.Storage.likePost(postId, cleanHandle);
    }
  },

  async addComment(postId, author, handle, text) {
    const newComment = {
      id: 'comm_' + Date.now(),
      author: author || 'Student',
      handle: handle || '@student',
      text: text,
      createdAt: Date.now()
    };

    if (this.db && typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const postRef = this.db.collection('posts').doc(postId);
        await postRef.update({
          comments: firebase.firestore.FieldValue.arrayUnion(newComment)
        });
        console.log("☁️ [Firebase] Comment added to Firestore:", postId);
      } catch (e) {
        console.warn("Firestore comment sync note:", e);
      }
    }

    if (window.Storage) {
      window.Storage.addComment(postId, author, handle, text);
    }
    return newComment;
  },

  // ============================================================
  // CLOUD STORAGE FOR STUDY NOTES / PDF DOCUMENTS
  // ============================================================
  async uploadPDFDocument(pdfDoc) {
    if (this.storage && pdfDoc.pdfData && pdfDoc.pdfData.startsWith('data:')) {
      try {
        const storageRef = this.storage.ref(`notes/${Date.now()}_${pdfDoc.fileName || 'note.pdf'}`);
        const snapshot = await storageRef.putString(pdfDoc.pdfData, 'data_url');
        pdfDoc.downloadURL = await snapshot.ref.getDownloadURL();
        console.log("☁️ [Firebase] PDF uploaded to Cloud Storage:", pdfDoc.downloadURL);
      } catch (e) {
        console.warn("Firebase Storage note:", e);
      }
    }
    if (window.Storage) {
      return window.Storage.addPDFMaterial(pdfDoc);
    }
    return pdfDoc;
  },

  // ============================================================
  // SEED INITIAL DATA TO CLOUD IF EMPTY
  // ============================================================
  async seedInitialCloudData() {
    if (!this.db) return;

    try {
      const snap = await this.db.collection('posts').limit(1).get();
      if (snap.empty) {
        console.log("☁️ [Firebase] Seeding initial verified student materials to Cloud Firestore...");
        
        const demoStudents = [
          {
            username: "@priya_sharma", handle: "@priya_sharma", displayName: "Priya Sharma", name: "Priya Sharma",
            email: "priya.sharma@bldea.edu", department: "Computer Science & Engineering", semester: 6,
            usn: "2BL21CS084", bio: "Final year CSE scholar & open-source contributor. Sharing verified OS, DBMS & AI notes.",
            skills: ["Python", "Operating Systems", "React", "DBMS", "Machine Learning"], role: "STUDENT", xp: 620,
            createdAt: Date.now() - 86400000 * 45, updatedAt: Date.now()
          },
          {
            username: "@vikram_patil", handle: "@vikram_patil", displayName: "Vikram Patil", name: "Vikram Patil",
            email: "vikram.patil@bldea.edu", department: "Electronics & Communication", semester: 4,
            usn: "2BL22EC042", bio: "ECE student enthusiastic about VLSI, Signal Processing, and IoT hardware projects.",
            skills: ["C++", "VLSI Design", "Verilog", "Signal Processing", "Arduino"], role: "STUDENT", xp: 480,
            createdAt: Date.now() - 86400000 * 30, updatedAt: Date.now()
          },
          {
            username: "@ananya_kulkarni", handle: "@ananya_kulkarni", displayName: "Ananya Kulkarni", name: "Ananya Kulkarni",
            email: "ananya.k@bldea.edu", department: "Artificial Intelligence & DS", semester: 5,
            usn: "2BL22AI018", bio: "AI/DS student passionate about Deep Learning, PyTorch, and NLP models.",
            skills: ["Python", "PyTorch", "Data Science", "Computer Vision", "SQL"], role: "STUDENT", xp: 540,
            createdAt: Date.now() - 86400000 * 20, updatedAt: Date.now()
          }
        ];

        for (const s of demoStudents) {
          const docId = s.handle.replace(/[@.]/g, '_').toLowerCase();
          await this.db.collection('students').doc(docId).set(s);
        }

        const demoPosts = [
          {
            id: 'cloud-post-01',
            type: 'pdf',
            title: 'Operating Systems Module 3: Virtual Memory & Paging Handwritten Notes',
            subject: 'Operating Systems',
            department: 'Computer Science & Engineering',
            desc: 'Complete VTU Scheme Unit 3 handwritten formulas, Page Replacement Algorithms (FIFO, LRU, Optimal) with step-by-step solved numericals for VTU exams.',
            author: 'Priya Sharma',
            handle: '@priya_sharma',
            fileName: 'OS_Module3_Virtual_Memory_Notes.pdf',
            fileSize: '3.4 MB',
            pdfData: null,
            youtubeUrl: null,
            likes: 38,
            saves: 19,
            comments: [
              { id: 'c-1', author: 'Vikram Patil', handle: '@vikram_patil', text: 'Super helpful notes for the LRU page replacement numericals! Thanks Priya!', createdAt: Date.now() - 86400000 }
            ],
            createdAt: Date.now() - 86400000 * 2
          },
          {
            id: 'cloud-post-02',
            type: 'youtube',
            title: 'AVL Trees: Insertion, Deletion & Tree Rotations Complete Walkthrough',
            subject: 'Data Structures',
            department: 'Computer Science & Engineering',
            desc: 'Recorded this detailed breakdown on AVL Tree rotations (LL, RR, LR, RL) with live whiteboard coding before the semester internals.',
            author: 'Ananya Kulkarni',
            handle: '@ananya_kulkarni',
            fileName: null,
            fileSize: null,
            pdfData: null,
            youtubeUrl: 'https://www.youtube.com/watch?v=jDM6_TnYIuE',
            likes: 52,
            saves: 24,
            comments: [],
            createdAt: Date.now() - 86400000 * 3
          }
        ];

        for (const p of demoPosts) {
          await this.db.collection('posts').doc(p.id).set(p);
        }

        console.log("✅ [Firebase] Cloud Firestore initialized with initial verified campus data!");
      }
    } catch (e) {
      console.warn("Cloud seed notice (enable Firestore rules in Firebase console):", e);
    }
  }
};

// Initialize Firebase Service
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.FirebaseService.init());
} else {
  window.FirebaseService.init();
}
