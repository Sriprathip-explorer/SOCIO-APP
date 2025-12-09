// Allow running frontend separately: set API_BASE to your backend URL.
const API_BASE = window.API_BASE || 'http://localhost:3000';
const api = {
  users: `${API_BASE}/api/users`,
  posts: `${API_BASE}/api/posts`
};

const state = {
  users: [],
  posts: [],
  activeUserId: null
};

const activeUserSelect = document.getElementById('activeUser');
const userForm = document.getElementById('userForm');
const postForm = document.getElementById('postForm');
const storiesContainer = document.getElementById('stories');
const postsContainer = document.getElementById('posts');
const postHint = document.getElementById('postHint');
const userModal = document.getElementById('userModal');
const openUserModalBtn = document.getElementById('openUserModal');
const closeUserModalBtn = document.getElementById('closeUserModal');
const feedTabs = document.querySelectorAll('#feedTabs .pill');
const deleteUserBtn = document.getElementById('deleteUser');

const FEED_SORT = {
  following: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  featured: (a, b) => b.likes.length - a.likes.length || new Date(b.createdAt) - new Date(a.createdAt),
  popular: (a, b) => b.commentCount - a.commentCount || b.likes.length - a.likes.length || new Date(b.createdAt) - new Date(a.createdAt)
};

init();

function init() {
  bindForms();
  loadUsers().then(loadFeed);
}

function bindForms() {
  if (openUserModalBtn && userModal) {
    openUserModalBtn.addEventListener('click', () => userModal.classList.add('is-open'));
    userModal.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal__backdrop')) {
        userModal.classList.remove('is-open');
      }
    });
  }
  if (closeUserModalBtn) {
    closeUserModalBtn.addEventListener('click', () => userModal.classList.remove('is-open'));
  }

  if (deleteUserBtn) {
    deleteUserBtn.addEventListener('click', async () => {
      if (!state.activeUserId) {
        alert('Select a user to delete.');
        return;
      }
      const target = state.users.find((u) => u.id === state.activeUserId);
      const ok = confirm(`Delete user "${target?.name || state.activeUserId}"? This removes their posts, comments, and follows.`);
      if (!ok) return;
      await fetch(`${api.users}/${state.activeUserId}`, { method: 'DELETE' });
      state.activeUserId = null;
      await loadUsers();
      await loadFeed();
    });
  }

  if (feedTabs && feedTabs.length) {
    feedTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        feedTabs.forEach((t) => t.classList.remove('pill--active'));
        tab.classList.add('pill--active');
        const filter = tab.dataset.filter || 'following';
        renderFeed(state.posts, filter);
      });
    });
  }

  userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('userName').value.trim();
    const avatar = document.getElementById('userAvatar').value.trim();
    const bio = document.getElementById('userBio').value.trim();
    if (!name) return;
    await fetch(api.users, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, avatar, bio })
    });
    userForm.reset();
    if (userModal) userModal.classList.remove('is-open');
    await loadUsers();
  });

  activeUserSelect.addEventListener('change', () => {
    state.activeUserId = activeUserSelect.value || null;
    postHint.style.display = state.activeUserId ? 'none' : 'block';
    renderFeed(state.posts);
  });

  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.activeUserId) {
      alert('Select an active user first.');
      return;
    }
    const content = document.getElementById('postContent').value.trim();
    const image = document.getElementById('postImage').value.trim();
    if (!content) return;
    await fetch(api.posts, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: state.activeUserId, content, image })
    });
    postForm.reset();
    await loadFeed();
  });
}

async function loadUsers() {
  const res = await fetch(api.users);
  const users = await res.json();
  state.users = users;
  activeUserSelect.innerHTML = `<option value="">Choose user</option>` + users.map((u) => `<option value="${u.id}">${u.name}</option>`).join('');
  // keep selection if still present
  if (state.activeUserId && users.find((u) => u.id === state.activeUserId)) {
    activeUserSelect.value = state.activeUserId;
  } else if (users[0]) {
    state.activeUserId = users[0].id;
    activeUserSelect.value = users[0].id;
  }
  postHint.style.display = state.activeUserId ? 'none' : 'block';
  renderStories(users);
  return users;
}

async function loadFeed() {
  const res = await fetch(api.posts);
  const posts = await res.json();
  state.posts = posts;
  renderFeed(posts);
}

function renderStories(users) {
  if (!storiesContainer) return;
  storiesContainer.innerHTML = '';
  users.forEach((u) => {
    const btn = document.createElement('button');
    btn.className = 'story';
    btn.innerHTML = `
      <span class="story__ring"></span>
      <img src="${u.avatar || `https://i.pravatar.cc/120?u=${u.id}`}" alt="${u.name}" />
      <span class="story__name">${u.name}</span>
    `;
    btn.addEventListener('click', () => {
      activeUserSelect.value = u.id;
      activeUserSelect.dispatchEvent(new Event('change'));
    });
    storiesContainer.appendChild(btn);
  });
}

function renderFeed(posts, filter = getActiveFilter()) {
  const sortFn = FEED_SORT[filter] || FEED_SORT.following;
  const sorted = [...posts].sort(sortFn);
  postsContainer.innerHTML = '';
  if (!sorted.length) {
    postsContainer.innerHTML = `<div class="empty">No posts yet. Create one to get started.</div>`;
    return;
  }
  sorted.forEach((p) => {
    const tpl = document.getElementById('postTemplate').content.cloneNode(true);
    tpl.querySelector('.avatar').src = p.user?.avatar || `https://i.pravatar.cc/150?u=${p.userId}`;
    tpl.querySelector('.name').textContent = p.user?.name || 'Unknown';
    tpl.querySelector('.meta').textContent = new Date(p.createdAt).toLocaleString();
    tpl.querySelector('.content').textContent = p.content;
    const img = tpl.querySelector('.post-image');
    if (p.image) {
      img.src = p.image;
      img.style.display = 'block';
    }
    const likeBtn = tpl.querySelector('.like');
    const isLiked = state.activeUserId ? p.likes.includes(state.activeUserId) : false;
    likeBtn.textContent = isLiked ? '♥ Liked' : '♡ Like';
    likeBtn.addEventListener('click', () => toggleLike(p.id));

    tpl.querySelector('.counts').textContent = `${p.likes.length} likes • ${p.commentCount} comments`;

    const followBtn = tpl.querySelector('.follow');
    const targetUser = state.users.find((u) => u.id === p.userId);
    if (state.activeUserId && targetUser && targetUser.id !== state.activeUserId) {
      const active = state.users.find((u) => u.id === state.activeUserId);
      const isFollowing = active?.following?.includes(targetUser.id);
      followBtn.textContent = isFollowing ? 'Following' : 'Follow';
      followBtn.addEventListener('click', () => toggleFollow(targetUser.id));
    } else {
      followBtn.remove();
    }

    const deleteBtn = tpl.querySelector('.delete-post');
    if (state.activeUserId && p.userId === state.activeUserId) {
      deleteBtn.addEventListener('click', () => handleDeletePost(p.id));
    } else {
      deleteBtn.remove();
    }

    const commentForm = tpl.querySelector('.comment-form');
    const commentList = tpl.querySelector('.comment-list');
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!state.activeUserId) return alert('Select an active user first.');
      const text = commentForm.querySelector('.comment-text').value.trim();
      if (!text) return;
      await fetch(`${api.posts}/${p.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: state.activeUserId, text })
      });
      commentForm.reset();
      await loadFeed();
      await loadComments(p.id, commentList);
    });

    loadComments(p.id, commentList);
    postsContainer.appendChild(tpl);
  });
}

function getActiveFilter() {
  const active = Array.from(feedTabs || []).find((t) => t.classList.contains('pill--active'));
  return active?.dataset.filter || 'following';
}

async function loadComments(postId, container) {
  const res = await fetch(`${api.posts}/${postId}/comments`);
  const comments = await res.json();
  container.innerHTML = '';
  comments.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'comment';
    const user = state.users.find((u) => u.id === c.userId);
    div.innerHTML = `
      <div class="byline">${user?.name || 'Unknown'} · ${new Date(c.createdAt).toLocaleString()}</div>
      <p class="text">${c.text}</p>
    `;
    container.appendChild(div);
  });
}

async function toggleLike(postId) {
  if (!state.activeUserId) return alert('Select an active user first.');
  await fetch(`${api.posts}/${postId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: state.activeUserId })
  });
  await loadFeed();
}

async function toggleFollow(userId) {
  if (!state.activeUserId) return alert('Select an active user first.');
  await fetch(`${api.users}/${userId}/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ followerId: state.activeUserId })
  });
  await loadUsers();
  await loadFeed();
}

async function handleDeletePost(postId) {
  const ok = confirm('Delete this post? This will remove its comments too.');
  if (!ok) return;
  await fetch(`${api.posts}/${postId}`, { method: 'DELETE' });
  await loadFeed();
}

