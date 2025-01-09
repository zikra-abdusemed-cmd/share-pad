// Mock data for testing
const mockUsers = [
    { id: 1, name: 'User 1', image: 'images/pic-4.jpg' },
    { id: 2, name: 'User 2', image: 'images/pic-5.jpg' },
    { id: 3, name: 'User 3', image: 'images/pic-6.jpg' },
    { id: 4, name: 'User 4', image: 'images/pic-7.jpg' }
];

// Mock backend data
const mockData = {
    messages: [],
    posts: [
        {
            id: 1,
            user: mockUsers[0],
            content: "Welcome to SharePod! This is a sample post.",
            timestamp: new Date(),
            likes: 5,
            liked_by_me: false
        }
    ]
};

class MockBackend {
    async getUsers() {
        return mockUsers;
    }

    async getMessages(userId, after) {
        return mockData.messages.filter(m =>
            (m.sender_id === userId || m.receiver_id === userId) &&
            new Date(m.timestamp) > new Date(after)
        );
    }

    async sendMessage(message) {
        const newMessage = {
            id: Date.now(),
            ...message
        };
        mockData.messages.push(newMessage);
        return newMessage;
    }

    async getPosts() {
        return mockData.posts;
    }

    async createPost(post) {
        const newPost = {
            id: Date.now(),
            user: mockUsers[0], // Current user
            likes: 0,
            liked_by_me: false,
            ...post
        };
        mockData.posts.unshift(newPost);
        return newPost;
    }

    async toggleLike(postId) {
        const post = mockData.posts.find(p => p.id === parseInt(postId));
        if (post) {
            post.liked_by_me = !post.liked_by_me;
            post.likes += post.liked_by_me ? 1 : -1;
            return post;
        }
        throw new Error('Post not found');
    }
}

class SocialHub {
    constructor() {
        this.currentUser = { id: 0, name: 'Current User', image: 'images/pic-1.jpg' };
        this.selectedChat = null;
        this.messages = [];
        this.posts = [];
        this.currentLayout = 'chat';
        this.lastMessageTime = new Date().toISOString();
        this.backend = new MockBackend();

        this.initializeElements();
        this.setupEventListeners();
        this.initializeLayouts();
        this.loadUsers();
        this.startMessagePolling();
        this.setupCreatePostModal();
    }

    initializeElements() {
        // Chat elements
        this.chatList = document.querySelector('.chat-list');
        this.messagesContainer = document.querySelector('.messages-container');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.querySelector('.send-btn');

        // Post elements
        this.postsContainer = document.querySelector('.posts-grid');
        this.createPostBtn = document.querySelector('.create-post-btn');

        // Layout elements
        this.layoutToggles = document.querySelectorAll('.toggle-btn');
        this.layouts = document.querySelectorAll('.layout');
    }

    initializeLayouts() {
        this.layoutToggles.forEach(btn => {
            btn.addEventListener('click', () => {
                const layout = btn.dataset.layout;
                this.switchLayout(layout);
            });
        });
    }

    switchLayout(layout) {
        // Update toggle buttons
        this.layoutToggles.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.layout === layout);
        });

        // Update layouts
        this.layouts.forEach(l => {
            l.classList.toggle('active', l.classList.contains(`${layout}-layout`));
        });

        this.currentLayout = layout;

        // Load content for the active layout
        if (layout === 'posts') {
            this.loadPosts();
        }
    }

    setupEventListeners() {
        // Chat functionality
        this.chatList.addEventListener('click', (e) => {
            const chatUser = e.target.closest('.chat-user');
            if (chatUser) {
                const userId = chatUser.dataset.userId;
                this.selectChat(userId);
            }
        });

        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Post functionality
        this.createPostBtn.addEventListener('click', () => {
            this.showCreatePostModal();
        });
    }

    async loadUsers() {
        try {
            const users = await this.backend.getUsers();
            this.renderUsers(users);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    renderUsers(users) {
        this.chatList.innerHTML = users.map(user => `
            <div class="chat-user" data-user-id="${user.id}">
                <img src="${user.image}" alt="${user.name}">
                <div class="user-info">
                    <h4>${user.name}</h4>
                    <p class="last-message">Click to start chat</p>
                </div>
            </div>
        `).join('');
    }

    selectChat(userId) {
        this.selectedChat = userId;
        // Update UI to show selected chat
        document.querySelectorAll('.chat-user').forEach(el => {
            el.classList.toggle('active', el.dataset.userId === userId);
        });

        // Load messages for this chat
        this.loadMessages();
    }

    loadMessages() {
        if (!this.selectedChat) return;

        const relevantMessages = this.messages.filter(msg =>
            (msg.sender_id === this.currentUser.id && msg.receiver_id === parseInt(this.selectedChat)) ||
            (msg.receiver_id === this.currentUser.id && msg.sender_id === parseInt(this.selectedChat))
        );

        this.messagesContainer.innerHTML = relevantMessages.map(msg => `
            <div class="message ${msg.sender_id === this.currentUser.id ? 'sent' : 'received'}">
                <div class="message-content">${msg.content}</div>
                <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
            </div>
        `).join('');

        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    async sendMessage() {
        if (!this.messageInput.value.trim() || !this.selectedChat) return;

        const message = {
            sender_id: this.currentUser.id,
            receiver_id: parseInt(this.selectedChat),
            content: this.messageInput.value,
            timestamp: new Date().toISOString()
        };

        try {
            const savedMessage = await this.backend.sendMessage(message);
            this.messageInput.value = '';
            const messageHTML = `
                <div class="message sent">
                    <div class="message-content">${savedMessage.content}</div>
                    <div class="message-time">${new Date(savedMessage.timestamp).toLocaleTimeString()}</div>
                </div>
            `;
            this.messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    appendMessage(message) {
        if (this.selectedChat &&
            (message.sender_id === parseInt(this.selectedChat) ||
                message.receiver_id === parseInt(this.selectedChat))) {
            const messageHTML = `
                <div class="message ${message.sender_id === this.currentUser.id ? 'sent' : 'received'}">
                    <div class="message-content">${message.content}</div>
                    <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
                </div>
            `;
            this.messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    startMessagePolling() {
        setInterval(() => {
            this.checkNewMessages();
        }, 3000); // Check every 3 seconds
    }

    async checkNewMessages() {
        try {
            const newMessages = await this.backend.getMessages(
                this.currentUser.id,
                this.lastMessageTime
            );

            if (newMessages.length > 0) {
                const uniqueNewMessages = newMessages.filter(newMsg =>
                    !this.messages.some(existingMsg => existingMsg.id === newMsg.id)
                );

                if (uniqueNewMessages.length > 0) {
                    this.messages.push(...uniqueNewMessages);
                    this.lastMessageTime = new Date(Math.max(
                        ...newMessages.map(m => new Date(m.timestamp))
                    )).toISOString();
                }
            }
        } catch (error) {
            console.error('Error checking messages:', error);
        }
    }

    async loadPosts() {
        try {
            this.posts = await this.backend.getPosts();
            this.renderPosts();
        } catch (error) {
            console.error('Error loading posts:', error);
        }
    }

    async createPost(content) {
        try {
            const newPost = await this.backend.createPost({
                content,
                timestamp: new Date().toISOString()
            });
            const existingIndex = this.posts.findIndex(p => p.id === newPost.id);
            if (existingIndex !== -1) {
                this.posts[existingIndex] = newPost;
            } else {
                this.posts.unshift(newPost);
            }
            this.renderPosts();
        } catch (error) {
            console.error('Error creating post:', error);
        }
    }

    renderPosts() {
        this.postsContainer.innerHTML = this.posts.map(post => `
            <div class="post" data-post-id="${post.id}">
                <div class="user-info">
                    <img src="${post.user.image}" alt="${post.user.name}">
                    <div class="user-details">
                        <h4>${post.user.name}</h4>
                        <span class="timestamp">${new Date(post.timestamp).toLocaleString()}</span>
                    </div>
                </div>
                <div class="content">${post.content}</div>
                <div class="actions">
                    <button class="like-btn ${post.liked_by_me ? 'liked' : ''}" onclick="socialHub.toggleLike(${post.id})">
                        <i class="fas fa-heart"></i>
                        <span>${post.likes}</span>
                    </button>
                </div>
            </div>
        `).join('');
    }

    async toggleLike(postId) {
        try {
            const updatedPost = await this.backend.toggleLike(postId);
            const index = this.posts.findIndex(p => p.id === postId);
            if (index !== -1) {
                this.posts[index] = updatedPost;
                this.renderPosts();
            }
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    }

    setupCreatePostModal() {
        this.createPostModal = document.querySelector('.create-post-modal');
        this.createPostForm = document.querySelector('.create-post-form');
        this.postContentInput = document.querySelector('.post-content-input');

        // Close button event
        this.createPostModal.querySelector('.close-modal-btn').addEventListener('click', () => {
            this.hideCreatePostModal();
        });

        // Form submit event
        this.createPostForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const content = this.postContentInput.value.trim();
            if (content) {
                this.createPost(content);
                this.hideCreatePostModal();
            }
        });

        // Close modal when clicking outside
        this.createPostModal.addEventListener('click', (e) => {
            if (e.target === this.createPostModal) {
                this.hideCreatePostModal();
            }
        });
    }

    showCreatePostModal() {
        this.createPostModal.classList.add('show');
        this.postContentInput.focus();
    }

    hideCreatePostModal() {
        this.createPostModal.classList.remove('show');
        this.postContentInput.value = '';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.socialHub = new SocialHub();
});
