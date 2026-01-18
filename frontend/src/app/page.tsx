'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    isStreaming?: boolean;
}

interface Chat {
    id: string;
    title: string;
    messages: Message[];
    starred: boolean;
    created: string;
    lastMessage?: string;
    selected?: boolean;
}

interface Model {
    id: string;
    name: string;
    description: string;
    supports_vision: boolean;
}

// =============================================================================
// CONFIG
// =============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const MODELS: Model[] = [
    { id: 'gpt-4o-mini', name: 'GPT-4o mini', description: 'Fast & efficient', supports_vision: true },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable', supports_vision: true },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Balanced', supports_vision: true },
    { id: 'o1-mini', name: 'o1-mini', description: 'Reasoning', supports_vision: false },
];

const CREATOR = {
    name: 'Hemant Pandey',
    title: 'AI/ML Engineer',
    github: 'https://github.com/Hemant277123',
    linkedin: 'https://www.linkedin.com/in/hemantpandey-f4/',
    skills: ['Python', 'LangChain', 'RAG', 'Vector DBs', 'FastAPI', 'React', 'Next.js', 'LLM Integration']
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function Home() {
    // Hydration fix
    const [mounted, setMounted] = useState(false);

    // UI State
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [page, setPage] = useState<'chat' | 'chats' | 'about'>('chat');
    const [toast, setToast] = useState<string | null>(null);

    // Session State
    const [sessionId, setSessionId] = useState<string>('');
    const [currentModel, setCurrentModel] = useState<Model>(MODELS[0]);
    const [showModelDropdown, setShowModelDropdown] = useState(false);

    // Chat State
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [toolStatus, setToolStatus] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Chats State
    const [chats, setChats] = useState<Chat[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [selectMode, setSelectMode] = useState(false);
    const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());

    // Image State
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ==========================================================================
    // EFFECTS
    // ==========================================================================

    useEffect(() => {
        setMounted(true);
        setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

        // Load theme
        const savedTheme = localStorage.getItem('nexusai-theme') as 'light' | 'dark' | null;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.dropdown-menu') && !target.closest('.menu-trigger')) {
                setOpenMenuId(null);
            }
            if (!target.closest('.model-dropdown') && !target.closest('.model-selector')) {
                setShowModelDropdown(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                newChat();
            }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                setSidebarCollapsed(prev => !prev);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // ==========================================================================
    // HELPERS
    // ==========================================================================

    const generateId = () => Math.random().toString(36).substr(2, 9);

    const getTimeAgo = (isoString: string): string => {
        const now = new Date();
        const date = new Date(isoString);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const showToast = (message: string) => {
        setToast(message);
        setTimeout(() => setToast(null), 2500);
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('nexusai-theme', newTheme);
    };

    // ==========================================================================
    // CHAT MANAGEMENT
    // ==========================================================================

    const saveCurrentChat = useCallback(() => {
        if (currentChatId && messages.length > 0) {
            setChats(prev => prev.map(chat =>
                chat.id === currentChatId
                    ? { ...chat, messages, lastMessage: messages[messages.length - 1]?.content.slice(0, 100) }
                    : chat
            ));
        }
    }, [currentChatId, messages]);

    const newChat = useCallback(() => {
        saveCurrentChat();
        const newChatObj: Chat = {
            id: generateId(),
            title: 'New Chat',
            messages: [],
            starred: false,
            created: new Date().toISOString(),
        };
        setChats(prev => [newChatObj, ...prev]);
        setCurrentChatId(newChatObj.id);
        setMessages([]);
        setPage('chat');
    }, [saveCurrentChat]);

    const switchChat = (chatId: string) => {
        saveCurrentChat();
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
            setCurrentChatId(chatId);
            setMessages(chat.messages);
            setPage('chat');
        }
    };

    const deleteChat = (chatId: string) => {
        setChats(prev => prev.filter(c => c.id !== chatId));
        if (currentChatId === chatId) {
            setCurrentChatId(null);
            setMessages([]);
        }
        showToast('Chat deleted');
    };

    const deleteSelectedChats = () => {
        setChats(prev => prev.filter(c => !selectedChats.has(c.id)));
        if (currentChatId && selectedChats.has(currentChatId)) {
            setCurrentChatId(null);
            setMessages([]);
        }
        showToast(`${selectedChats.size} chat(s) deleted`);
        setSelectedChats(new Set());
        setSelectMode(false);
    };

    const toggleChatSelection = (chatId: string) => {
        setSelectedChats(prev => {
            const newSet = new Set(prev);
            if (newSet.has(chatId)) {
                newSet.delete(chatId);
            } else {
                newSet.add(chatId);
            }
            return newSet;
        });
    };

    const selectAllChats = () => {
        const filteredIds = filteredChats.map(c => c.id);
        setSelectedChats(new Set(filteredIds));
    };

    const deselectAllChats = () => {
        setSelectedChats(new Set());
    };

    const starChat = (chatId: string) => {
        setChats(prev => prev.map(chat =>
            chat.id === chatId ? { ...chat, starred: !chat.starred } : chat
        ));
    };

    const renameChat = (chatId: string, newTitle: string) => {
        if (newTitle.trim()) {
            setChats(prev => prev.map(chat =>
                chat.id === chatId ? { ...chat, title: newTitle.trim() } : chat
            ));
        }
        setRenamingChatId(null);
        setRenameValue('');
    };

    const goHome = () => {
        saveCurrentChat();
        newChat();
    };

    // ==========================================================================
    // MESSAGE HANDLING
    // ==========================================================================

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImagePreview(null);
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const copyMessage = (content: string) => {
        navigator.clipboard.writeText(content);
        showToast('Copied to clipboard');
    };

    const copyCodeBlock = (code: string) => {
        navigator.clipboard.writeText(code);
        showToast('Code copied');
    };

    const retryMessage = (messageIndex: number) => {
        const userMessage = messages[messageIndex - 1];
        if (userMessage && userMessage.role === 'user') {
            const newMessages = messages.slice(0, messageIndex - 1);
            setMessages(newMessages);
            setTimeout(() => sendMessage(userMessage.content), 100);
        }
    };

    const sendMessage = async (overrideInput?: string) => {
        const text = overrideInput || input.trim();
        if (!text && !imageFile) return;
        if (isLoading) return;

        // Create new chat if none exists
        if (!currentChatId) {
            const newChatObj: Chat = {
                id: generateId(),
                title: text.slice(0, 40) || 'New Chat',
                messages: [],
                starred: false,
                created: new Date().toISOString(),
            };
            setChats(prev => [newChatObj, ...prev]);
            setCurrentChatId(newChatObj.id);
        }

        const userMessage: Message = {
            id: generateId(),
            role: 'user',
            content: text,
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        };

        const assistantMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: '',
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            isStreaming: true,
        };

        setMessages(prev => [...prev, userMessage, assistantMessage]);
        setInput('');
        setIsLoading(true);

        // Update chat title if first message
        if (messages.length === 0 && currentChatId) {
            setChats(prev => prev.map(chat =>
                chat.id === currentChatId ? { ...chat, title: text.slice(0, 40) } : chat
            ));
        }

        try {
            const response = await fetch(`${API_URL}/api/chat/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    session_id: sessionId,
                    model: currentModel.id,
                }),
            });

            if (!response.ok) throw new Error('Failed to get response');

            const reader = response.body?.getReader();
            if (reader) {
                const decoder = new TextDecoder();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.chunk) {
                                    setMessages(prev => {
                                        const updated = [...prev];
                                        updated[updated.length - 1] = {
                                            ...updated[updated.length - 1],
                                            content: updated[updated.length - 1].content + data.chunk,
                                        };
                                        return updated;
                                    });
                                }
                                if (data.search_used) {
                                    setToolStatus('Searching the web...');
                                }
                                if (data.done) {
                                    setMessages(prev => {
                                        const updated = [...prev];
                                        updated[updated.length - 1] = {
                                            ...updated[updated.length - 1],
                                            isStreaming: false,
                                        };
                                        return updated;
                                    });
                                }
                            } catch { }
                        }
                    }
                }
            }

            removeImage();
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: '❌ Sorry, I encountered an error. Please try again.',
                    isStreaming: false,
                };
                return updated;
            });
        } finally {
            setIsLoading(false);
            setToolStatus(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // ==========================================================================
    // MARKDOWN FORMATTER
    // ==========================================================================

    const formatMessage = (content: string): string => {
        // Process code blocks first and store them
        const codeBlocks: string[] = [];
        let processed = content.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
            const index = codeBlocks.length;
            codeBlocks.push(`<div class="code-block-wrapper">
                <div class="code-header">
                    <span class="code-lang">${lang || 'code'}</span>
                    <button class="code-copy-btn" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(code.trim())}'));this.textContent='Copied!'">Copy</button>
                </div>
                <pre class="code-block"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
            </div>`);
            return `__CODE_BLOCK_${index}__`;
        });

        // Collapse multiple newlines to max 2
        processed = processed.replace(/\n{3,}/g, '\n\n');

        // Process tables
        const tableRegex = /(\|.+\|[\r\n]+)+/g;
        processed = processed.replace(tableRegex, (match) => {
            const lines = match.trim().split('\n');
            if (lines.length < 2) return match;

            let html = '<table class="msg-table">';
            let isHeader = true;

            for (const line of lines) {
                if (line.trim().match(/^\|[-:\s|]+\|$/)) continue;
                const cells = line.split('|').filter(c => c.trim() !== '');
                if (cells.length === 0) continue;

                const tag = isHeader ? 'th' : 'td';
                const rowHtml = cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('');
                html += `<tr>${rowHtml}</tr>`;
                if (isHeader) isHeader = false;
            }
            return html + '</table>';
        });

        // Process headers, lists, etc. before converting newlines
        processed = processed
            .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
            .replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>')
            .replace(/^### (.*)$/gm, '<h3>$1</h3>')
            .replace(/^## (.*)$/gm, '<h2>$1</h2>')
            .replace(/^# (.*)$/gm, '<h1>$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^---$/gm, '<hr />')
            .replace(/^- (.*)$/gm, '<li>$1</li>')
            .replace(/^\d+\. (.*)$/gm, '<li class="numbered">$1</li>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

        // Convert double newlines to paragraph breaks, single newlines to br
        // But not after block elements
        processed = processed
            .replace(/\n\n+/g, '</p><p>')
            .replace(/(<\/h[123]>)<br>/g, '$1')
            .replace(/(<hr \/>)<br>/g, '$1')
            .replace(/(<\/table>)<br>/g, '$1')
            .replace(/(<\/ul>)<br>/g, '$1')
            .replace(/(<\/blockquote>)<br>/g, '$1')
            .replace(/\n/g, '<br>');

        // Wrap in paragraph if not starting with block element
        if (!processed.startsWith('<h') && !processed.startsWith('<table') && !processed.startsWith('<ul') && !processed.startsWith('<div')) {
            processed = '<p>' + processed + '</p>';
        }

        // Clean up empty paragraphs and excessive breaks
        processed = processed
            .replace(/<p><\/p>/g, '')
            .replace(/<p><br><\/p>/g, '')
            .replace(/<br><br>/g, '<br>')
            .replace(/<p><br>/g, '<p>')
            .replace(/<br><\/p>/g, '</p>');

        // Wrap lists
        processed = processed.replace(/(<li>.*?<\/li>(<br>)?)+/g, (match) => {
            return '<ul>' + match.replace(/<br>/g, '') + '</ul>';
        });

        // Restore code blocks
        codeBlocks.forEach((block, index) => {
            processed = processed.replace(`__CODE_BLOCK_${index}__`, block);
        });

        return processed;
    };

    // ==========================================================================
    // FILTERED DATA
    // ==========================================================================

    const filteredChats = chats.filter(chat =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const recentChats = filteredChats.slice(0, 10);

    // ==========================================================================
    // INIT EFFECT
    // ==========================================================================

    useEffect(() => {
        if (mounted && chats.length === 0) {
            newChat();
        }
    }, [mounted, chats.length, newChat]);

    // ==========================================================================
    // RENDER: LOADING
    // ==========================================================================

    if (!mounted) {
        return (
            <div className="app-container">
                <div className="loading-screen">
                    <img src="/logo.png" alt="NexusAI" className="loading-logo" />
                    <div className="loading-text">Loading...</div>
                </div>
            </div>
        );
    }

    // ==========================================================================
    // RENDER: SIDEBAR
    // ==========================================================================

    const renderSidebar = () => (
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            {/* Logo - Clickable */}
            <div className="sidebar-header">
                <button className="logo-btn" onClick={goHome} title="New Chat">
                    <img src="/logo.png" alt="NexusAI" className="logo-img" />
                    {!sidebarCollapsed && <span className="logo-text">NexusAI</span>}
                </button>
                <button
                    className="sidebar-toggle"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    title={sidebarCollapsed ? 'Expand' : 'Collapse'}
                >
                    {sidebarCollapsed ? '→' : '←'}
                </button>
            </div>

            {/* New Chat Button */}
            <button className="new-chat-btn" onClick={newChat} title="New Chat (Ctrl+K)">
                <span className="icon">+</span>
                {!sidebarCollapsed && <span>New chat</span>}
            </button>

            {/* Navigation */}
            {!sidebarCollapsed && (
                <nav className="sidebar-nav">
                    <button
                        className={`nav-item ${page === 'chats' ? 'active' : ''}`}
                        onClick={() => setPage('chats')}
                    >
                        <span className="icon">💬</span>
                        <span>Chats</span>
                        <span className="badge">{chats.length}</span>
                    </button>
                </nav>
            )}

            {/* Recent Chats */}
            {!sidebarCollapsed && (
                <div className="sidebar-section">
                    <div className="section-header">Recents</div>
                    <div className="chat-list">
                        {recentChats.map(chat => (
                            <div
                                key={chat.id}
                                className={`chat-item ${currentChatId === chat.id ? 'active' : ''}`}
                            >
                                <span
                                    className="chat-title"
                                    onClick={() => switchChat(chat.id)}
                                >
                                    {chat.starred && <span className="star-icon">⭐</span>}
                                    {chat.title}
                                </span>
                                <button
                                    className="chat-item-menu menu-trigger"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const menuKey = `sidebar_${chat.id}`;
                                        setOpenMenuId(openMenuId === menuKey ? null : menuKey);
                                    }}
                                >
                                    ⋯
                                </button>
                                {openMenuId === `sidebar_${chat.id}` && (
                                    <div className="dropdown-menu sidebar-dropdown">
                                        <button onClick={() => { starChat(chat.id); setOpenMenuId(null); }}>
                                            {chat.starred ? '⭐ Unstar' : '☆ Star'}
                                        </button>
                                        <button onClick={() => {
                                            setRenameValue(chat.title);
                                            setRenamingChatId(chat.id);
                                            setOpenMenuId(null);
                                        }}>
                                            ✏️ Rename
                                        </button>
                                        <button className="danger" onClick={() => { deleteChat(chat.id); setOpenMenuId(null); }}>
                                            🗑️ Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {recentChats.length === 0 && (
                            <div className="empty-hint">No chats yet</div>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="sidebar-footer">
                {!sidebarCollapsed && (
                    <>
                        <button className="nav-item" onClick={toggleTheme}>
                            <span className="icon">{theme === 'light' ? '🌙' : '☀️'}</span>
                            <span>{theme === 'light' ? 'Dark' : 'Light'} mode</span>
                        </button>
                        <button
                            className={`nav-item ${page === 'about' ? 'active' : ''}`}
                            onClick={() => setPage('about')}
                        >
                            <span className="icon">ℹ️</span>
                            <span>About</span>
                        </button>
                    </>
                )}
                {sidebarCollapsed && (
                    <>
                        <button className="nav-item-icon" onClick={toggleTheme} title="Toggle theme">
                            {theme === 'light' ? '🌙' : '☀️'}
                        </button>
                        <button className="nav-item-icon" onClick={() => setPage('about')} title="About">
                            ℹ️
                        </button>
                    </>
                )}
            </div>
        </aside>
    );

    // ==========================================================================
    // RENDER: INPUT AREA
    // ==========================================================================

    const renderInputArea = (centered: boolean = false) => (
        <div className={`input-area ${centered ? 'centered' : ''}`}>
            <div className="input-container">
                {imagePreview && (
                    <div className="image-preview">
                        <img src={imagePreview} alt="Upload preview" />
                        <button className="remove-image" onClick={removeImage}>×</button>
                    </div>
                )}
                <div className="input-row">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        hidden
                    />
                    <button
                        className="input-icon-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!currentModel.supports_vision}
                        title={currentModel.supports_vision ? 'Upload image' : 'Model does not support images'}
                    >
                        📎
                    </button>
                    <textarea
                        ref={textareaRef}
                        className="input-textarea"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything..."
                        rows={1}
                        disabled={isLoading}
                    />
                    <div className="input-actions">
                        <button
                            className="model-selector"
                            onClick={() => setShowModelDropdown(!showModelDropdown)}
                        >
                            {currentModel.name}
                            <span className="chevron">▾</span>
                        </button>
                        {showModelDropdown && (
                            <div className="model-dropdown">
                                {MODELS.map(model => (
                                    <button
                                        key={model.id}
                                        className={`model-option ${currentModel.id === model.id ? 'selected' : ''}`}
                                        onClick={() => {
                                            setCurrentModel(model);
                                            setShowModelDropdown(false);
                                        }}
                                    >
                                        <div className="model-name">{model.name}</div>
                                        <div className="model-desc">{model.description}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                        <button
                            className="send-btn"
                            onClick={() => sendMessage()}
                            disabled={isLoading || (!input.trim() && !imageFile)}
                        >
                            {isLoading ? '...' : '↑'}
                        </button>
                    </div>
                </div>
            </div>
            <p className="disclaimer">NexusAI can make mistakes. Verify important information.</p>
        </div>
    );

    // ==========================================================================
    // RENDER: CHAT PAGE
    // ==========================================================================

    const renderChatPage = () => (
        <main className="main-content">
            {messages.length === 0 ? (
                // Empty state - centered input like Perplexity
                <div className="welcome-container">
                    <img src="/logo.png" alt="NexusAI" className="welcome-logo" />
                    <h1 className="welcome-title">What do you want to know?</h1>
                    {renderInputArea(true)}
                </div>
            ) : (
                // Chat with messages
                <>
                    <div className="chat-messages">
                        {messages.map((msg, idx) => (
                            <div key={msg.id} className={`message ${msg.role}`}>
                                <div className="message-header">
                                    <div className={`message-avatar ${msg.role}`}>
                                        {msg.role === 'user' ? '👤' : <img src="/logo.png" alt="AI" />}
                                    </div>
                                    <span className="message-role">
                                        {msg.role === 'user' ? 'You' : 'NexusAI'}
                                    </span>
                                </div>

                                {msg.role === 'assistant' && toolStatus && idx === messages.length - 1 && msg.isStreaming && (
                                    <div className="tool-status">
                                        <span className="spinner">⟳</span>
                                        {toolStatus}
                                    </div>
                                )}

                                <div
                                    className="message-content"
                                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                                />

                                {msg.isStreaming && <span className="typing-cursor" />}

                                {msg.role === 'assistant' && !msg.isStreaming && (
                                    <div className="message-actions">
                                        <button onClick={() => copyMessage(msg.content)} title="Copy">
                                            📋 Copy
                                        </button>
                                        <button onClick={() => retryMessage(idx)} title="Retry">
                                            🔄 Retry
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    {renderInputArea(false)}
                </>
            )}
        </main>
    );

    // ==========================================================================
    // RENDER: CHATS PAGE (Claude-style with checkboxes)
    // ==========================================================================

    const renderChatsPage = () => (
        <main className="main-content">
            <div className="chats-page">
                <div className="chats-header">
                    <h1>Chats</h1>
                    <button className="primary-btn" onClick={newChat}>
                        + New chat
                    </button>
                </div>

                <div className="chats-toolbar">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search your chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Chat count and select link */}
                <div className="chats-info">
                    <span>{filteredChats.length} chats with NexusAI</span>
                    {!selectMode && filteredChats.length > 0 && (
                        <button className="select-link" onClick={() => setSelectMode(true)}>
                            Select
                        </button>
                    )}
                </div>

                {/* Selection toolbar */}
                {selectMode && (
                    <div className="selection-toolbar">
                        <span>{selectedChats.size} selected</span>
                        <button onClick={selectAllChats}>Select all</button>
                        <button onClick={deselectAllChats}>Deselect all</button>
                        <button className="delete-btn" onClick={deleteSelectedChats}>
                            🗑️ Delete selected
                        </button>
                        <button onClick={() => { setSelectMode(false); setSelectedChats(new Set()); }}>
                            ✕ Cancel
                        </button>
                    </div>
                )}

                <div className="chats-list">
                    {filteredChats.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">💬</div>
                            <p>No chats found</p>
                            <button className="primary-btn" onClick={newChat}>Start a conversation</button>
                        </div>
                    ) : (
                        filteredChats.map(chat => (
                            <div
                                key={chat.id}
                                className={`chat-card ${selectedChats.has(chat.id) ? 'selected' : ''}`}
                            >
                                {selectMode && (
                                    <input
                                        type="checkbox"
                                        className="chat-checkbox"
                                        checked={selectedChats.has(chat.id)}
                                        onChange={() => toggleChatSelection(chat.id)}
                                    />
                                )}
                                <div className="chat-card-content" onClick={() => !selectMode && switchChat(chat.id)}>
                                    <div className="chat-card-title">{chat.title}</div>
                                    <div className="chat-card-meta">
                                        <span className="chat-card-time">{getTimeAgo(chat.created)}</span>
                                        {chat.lastMessage && (
                                            <span className="chat-card-preview">{chat.lastMessage}</span>
                                        )}
                                    </div>
                                </div>
                                {!selectMode && (
                                    <div className="chat-card-actions">
                                        <button
                                            className="menu-trigger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const menuKey = `chats_${chat.id}`;
                                                setOpenMenuId(openMenuId === menuKey ? null : menuKey);
                                            }}
                                        >
                                            ⋮
                                        </button>
                                        {openMenuId === `chats_${chat.id}` && (
                                            <div className="dropdown-menu">
                                                <button onClick={() => { starChat(chat.id); setOpenMenuId(null); }}>
                                                    {chat.starred ? '⭐ Unstar' : '☆ Star'}
                                                </button>
                                                <button onClick={() => {
                                                    setRenameValue(chat.title);
                                                    setRenamingChatId(chat.id);
                                                    setOpenMenuId(null);
                                                }}>
                                                    ✏️ Rename
                                                </button>
                                                <button className="danger" onClick={() => { deleteChat(chat.id); setOpenMenuId(null); }}>
                                                    🗑️ Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Rename modal */}
            {renamingChatId && (
                <div className="modal-overlay" onClick={() => setRenamingChatId(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3>Rename chat</h3>
                        <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') renameChat(renamingChatId, renameValue);
                                if (e.key === 'Escape') setRenamingChatId(null);
                            }}
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button onClick={() => setRenamingChatId(null)}>Cancel</button>
                            <button className="primary" onClick={() => renameChat(renamingChatId, renameValue)}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );

    // ==========================================================================
    // RENDER: ABOUT PAGE
    // ==========================================================================

    const renderAboutPage = () => (
        <main className="main-content">
            <div className="about-page">
                {/* Hero Section */}
                <div className="about-hero">
                    <img src="/logo.png" alt="NexusAI" className="about-logo" />
                    <h1>NexusAI</h1>
                    <p className="about-tagline">
                        Your Intelligent AI Assistant with Real-Time Knowledge
                    </p>
                    <button className="hero-cta" onClick={() => setPage('chat')}>
                        ✨ Try NexusAI
                    </button>
                </div>

                {/* What is NexusAI */}
                <section className="about-section">
                    <div className="section-header">
                        <h2>What is NexusAI?</h2>
                    </div>
                    <div className="about-description">
                        <p>
                            NexusAI is an AI-powered assistant that can have natural conversations,
                            search the internet for current information, remember your past chats for better context,
                            and even understand images you share. Built with modern web technologies and
                            powered by advanced AI models.
                        </p>
                    </div>
                </section>

                {/* Capabilities */}
                <section className="about-section">
                    <div className="section-header">
                        <h2>Key Capabilities</h2>
                        <p>Everything NexusAI can do for you</p>
                    </div>
                    <div className="capabilities-grid">
                        <div className="capability-card">
                            <div className="capability-icon">💬</div>
                            <h3>Conversational AI</h3>
                            <p>Natural conversations powered by GPT models with intelligent responses</p>
                        </div>
                        <div className="capability-card">
                            <div className="capability-icon">🔍</div>
                            <h3>Web Search</h3>
                            <p>Get up-to-date information by searching the internet in real-time</p>
                        </div>
                        <div className="capability-card">
                            <div className="capability-icon">🧠</div>
                            <h3>Memory</h3>
                            <p>Remembers your conversation context for more relevant responses</p>
                        </div>
                        <div className="capability-card">
                            <div className="capability-icon">👁️</div>
                            <h3>Image Understanding</h3>
                            <p>Upload images and ask questions about what you see</p>
                        </div>
                        <div className="capability-card">
                            <div className="capability-icon">⚡</div>
                            <h3>Real-Time Streaming</h3>
                            <p>See responses appear word-by-word as they're generated</p>
                        </div>
                        <div className="capability-card">
                            <div className="capability-icon">🔄</div>
                            <h3>Model Selection</h3>
                            <p>Choose different AI models based on your needs</p>
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section className="about-section">
                    <div className="section-header">
                        <h2>How It Works</h2>
                        <p>The architecture behind NexusAI</p>
                    </div>
                    <div className="architecture-container">
                        <div className="mermaid-diagram">
                            {/* Row 1: User */}
                            <div className="mermaid-row">
                                <div className="mermaid-node user-node">
                                    <span className="node-icon">👤</span>
                                    <span>User</span>
                                </div>
                            </div>

                            {/* Connection */}
                            <div className="mermaid-connection">
                                <div className="connection-line"></div>
                                <span className="connection-label">sends message</span>
                            </div>

                            {/* Row 2: Frontend */}
                            <div className="mermaid-row">
                                <div className="mermaid-node frontend-node">
                                    <span className="node-icon">🖥️</span>
                                    <span>Frontend (Next.js + React)</span>
                                </div>
                            </div>

                            {/* Connection */}
                            <div className="mermaid-connection">
                                <div className="connection-line"></div>
                                <span className="connection-label">HTTP POST /api/chat/stream</span>
                            </div>

                            {/* Row 3: Backend */}
                            <div className="mermaid-row">
                                <div className="mermaid-node backend-node">
                                    <span className="node-icon">⚙️</span>
                                    <span>Backend API (FastAPI)</span>
                                </div>
                            </div>

                            {/* Connection */}
                            <div className="mermaid-connection">
                                <div className="connection-line"></div>
                                <span className="connection-label">creates NexusAgent</span>
                            </div>

                            {/* Row 4: Agent with Memory side connection */}
                            <div className="mermaid-row with-side">
                                <div className="mermaid-node agent-node">
                                    <span className="node-icon">🤖</span>
                                    <span>NexusAgent</span>
                                </div>
                                <div className="side-connection">
                                    <div className="side-line horizontal"></div>
                                    <div className="side-label">retrieves context</div>
                                    <div className="mermaid-node memory-node side">
                                        <span className="node-icon">💾</span>
                                        <span>Memory (Pinecone)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Connection */}
                            <div className="mermaid-connection">
                                <div className="connection-line"></div>
                                <span className="connection-label">enhanced query + history</span>
                            </div>

                            {/* Row 5: ReAct Agent */}
                            <div className="mermaid-row">
                                <div className="mermaid-node react-node">
                                    <span className="node-icon">🧠</span>
                                    <span>ReAct Agent (LangGraph)</span>
                                </div>
                            </div>

                            {/* Decision Branch */}
                            <div className="mermaid-decision">
                                <div className="decision-diamond">
                                    <span>Needs current info?</span>
                                </div>
                                <div className="decision-branches">
                                    <div className="decision-branch yes">
                                        <span className="branch-label">Yes</span>
                                        <div className="branch-line"></div>
                                        <div className="mermaid-node tool-node">
                                            <span className="node-icon">🔍</span>
                                            <span>Web Search (Tavily)</span>
                                        </div>
                                    </div>
                                    <div className="decision-branch no">
                                        <span className="branch-label">No</span>
                                        <div className="branch-line"></div>
                                        <div className="mermaid-node llm-node">
                                            <span className="node-icon">✨</span>
                                            <span>GPT Model (OpenAI)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Merge Connection */}
                            <div className="mermaid-connection merge">
                                <div className="merge-lines"></div>
                                <span className="connection-label">generates response</span>
                            </div>

                            {/* Row 6: Response */}
                            <div className="mermaid-row">
                                <div className="mermaid-node response-node">
                                    <span className="node-icon">📨</span>
                                    <span>Streaming Response (SSE)</span>
                                </div>
                            </div>

                            {/* Final Connection */}
                            <div className="mermaid-connection">
                                <div className="connection-line"></div>
                                <span className="connection-label">word-by-word</span>
                            </div>

                            {/* Row 7: Back to User */}
                            <div className="mermaid-row">
                                <div className="mermaid-node user-node">
                                    <span className="node-icon">👤</span>
                                    <span>User sees response</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Technology Stack */}
                <section className="about-section">
                    <div className="section-header">
                        <h2>Technology Stack</h2>
                        <p>Built with modern, production-ready technologies</p>
                    </div>
                    <div className="tech-grid">
                        <div className="tech-category">
                            <h4>Frontend</h4>
                            <div className="tech-list">
                                <div className="tech-item">Next.js</div>
                                <div className="tech-item">React</div>
                                <div className="tech-item">TypeScript</div>
                            </div>
                        </div>
                        <div className="tech-category">
                            <h4>Backend</h4>
                            <div className="tech-list">
                                <div className="tech-item">Python</div>
                                <div className="tech-item">FastAPI</div>
                                <div className="tech-item">Uvicorn</div>
                            </div>
                        </div>
                        <div className="tech-category">
                            <h4>AI / ML</h4>
                            <div className="tech-list">
                                <div className="tech-item">OpenAI GPT</div>
                                <div className="tech-item">LangChain</div>
                                <div className="tech-item">LangGraph</div>
                            </div>
                        </div>
                        <div className="tech-category">
                            <h4>Services</h4>
                            <div className="tech-list">
                                <div className="tech-item">Tavily (Search)</div>
                                <div className="tech-item">Pinecone (Memory)</div>
                                <div className="tech-item">SSE (Streaming)</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Creator */}
                <section className="about-section">
                    <div className="section-header">
                        <h2>Built By</h2>
                    </div>
                    <div className="creator-card">
                        <img
                            src="/profileImage.jpg"
                            alt={CREATOR.name}
                            className="creator-image"
                        />
                        <div className="creator-details">
                            <h3>{CREATOR.name}</h3>
                            <p className="creator-title">{CREATOR.title}</p>
                            <p className="creator-bio">
                                Passionate about building intelligent systems that solve real problems.
                                NexusAI demonstrates my expertise in AI integration, full-stack development,
                                and creating production-ready applications.
                            </p>
                            <div className="creator-links">
                                <a
                                    href={CREATOR.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="creator-link"
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                    </svg>
                                    GitHub
                                </a>
                                <a
                                    href={CREATOR.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="creator-link"
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                    </svg>
                                    LinkedIn
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Back to Chat */}
                <div className="back-to-chat">
                    <button className="back-btn" onClick={() => setPage('chat')}>
                        ← Back to Chat
                    </button>
                </div>
            </div>
        </main>
    );


    // ==========================================================================
    // RENDER: MAIN
    // ==========================================================================

    return (
        <div className="app-container" data-theme={theme}>
            {renderSidebar()}

            {page === 'chat' && renderChatPage()}
            {page === 'chats' && renderChatsPage()}
            {page === 'about' && renderAboutPage()}

            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}
