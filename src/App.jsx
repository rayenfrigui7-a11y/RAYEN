import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Auth from './Auth.jsx';
import { supabase, supabaseReady } from './supabaseClient.js';

export default function App() {
    const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!supabaseReady) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);
  const [channels, setChannels] = useState([
    { id: 'general', name: 'general', isPrivate: false },
    { id: 'bac-economie', name: 'bac-economie', isPrivate: true, password: 'admin2027' },
    { id: 'entraide', name: 'entraide', isPrivate: false },
    { id: 'gaming', name: 'gaming', isPrivate: false }
  ]);
    useEffect(() => {
    if (!session) return;

    let cancelled = false;

    async function loadChannels() {
      const { error: setupError } = await supabase.rpc('ensure_default_channels');

      if (setupError) {
        console.error('Channel setup error:', setupError.message);
        return;
      }

      const { data, error } = await supabase
        .from('channels')
        .select('id, name, is_private');

      if (error) {
        console.error('Channel loading error:', error.message);
        return;
      }

      if (!cancelled) {
        setChannels(current => {
          const loaded = (data || []).map(ch => ({
            id: ch.id,
            name: ch.name,
            isPrivate: ch.is_private
          }));

          // نخليو قناة BAC ظاهرة حتى لو المستخدم ما انضمّش ليها بعد
          if (!loaded.some(ch => ch.id === 'bac-economie')) {
            const bac = current.find(ch => ch.id === 'bac-economie');
            if (bac) loaded.push(bac);
          }

          return loaded;
        });
      }
    }

    loadChannels();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const [activeChannel, setActiveChannel] = useState('general');
  const [activeTab, setActiveTab] = useState('chat');
  const [unlockedChannels, setUnlockedChannels] = useState(['general', 'entraide', 'gaming']);
  
  // Gate Unlock State
  const [showPassModal, setShowPassModal] = useState(false);
  const [selectedLockedChannel, setSelectedLockedChannel] = useState(null);
  const [passInput, setPassInput] = useState('');

  // Create Channel Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelPass, setNewChannelPass] = useState('');
  const [createdChannelInfo, setCreatedChannelInfo] = useState(null);

  const [messages, setMessages] = useState({
    general: [
      { id: 1, user: 'RAYEN BOT', text: 'Welcome to RAYEN. Be respectful, share ideas, and help each other.', image: null, time: '10:22 PM', avatar: 'R', role: 'System' }
    ],
    'bac-economie': [
      { id: 1, user: 'RAYEN BOT', text: 'مرحباً بكم في قناة مادة الاقتصاد والتصرف للباكالوريا.', image: null, time: '10:25 PM', avatar: 'R', role: 'System' }
    ],
    entraide: [],
    gaming: []
  });
    useEffect(() => {
    if (!session || !activeChannel) return;

    let cancelled = false;

    async function loadMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', activeChannel)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Messages loading error:', error.message);
        return;
      }

      if (!cancelled) {
        const loadedMessages = (data || []).map(msg => ({
          id: msg.id,
          user: msg.user_name,
          user_id: msg.user_id,
          text: msg.content || '',
          image: msg.image_url || null,
          time: new Date(msg.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }),
          avatar: (msg.user_name || 'U').charAt(0).toUpperCase(),
          role: 'Student'
        }));

        setMessages(prev => ({
          ...prev,
          [activeChannel]: loadedMessages
        }));
      }
    }

    loadMessages();

    const channel = supabase
      .channel(`messages-${activeChannel}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${activeChannel}`
        },
        payload => {
          const msg = payload.new;

          setMessages(prev => {
            const current = prev[activeChannel] || [];
            if (current.some(item => item.id === msg.id)) return prev;

            return {
              ...prev,
              [activeChannel]: [...current, {
                id: msg.id,
                user: msg.user_name,
                user_id: msg.user_id,
                text: msg.content || '',
                image: msg.image_url || null,
                time: new Date(msg.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                avatar: (msg.user_name || 'U').charAt(0).toUpperCase(),
                role: 'Student'
              }]
            };
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session, activeChannel]);
  const [inputMsg, setInputMsg] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMessages, setAiMessages] = useState([
    { id: 1, role: 'assistant', content: 'أهلاً بك! أنا الأستاذ الذكي لمراجعة دروس الباكالوريا ومساعدتك في مادة الاقتصاد والتصرف.' }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const [ollamaConnected, setOllamaConnected] = useState(false);

  const chatEndRef = useRef(null);
  const aiEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannel]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  useEffect(() => {
    fetch('http://localhost:11434/api/tags')
      .then(res => res.ok ? setOllamaConnected(true) : setOllamaConnected(false))
      .catch(() => setOllamaConnected(false));
  }, []);

  const handleChannelClick = (ch) => {
    if (ch.isPrivate && !unlockedChannels.includes(ch.id)) {
      setSelectedLockedChannel(ch);
      setShowPassModal(true);
    } else {
      setShowPassModal(false);
      setSelectedLockedChannel(null);
      setActiveChannel(ch.id);
    }
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    if (selectedLockedChannel && passInput === selectedLockedChannel.password) {
      setUnlockedChannels(prev => [...prev, selectedLockedChannel.id]);
      setActiveChannel(selectedLockedChannel.id);
      setShowPassModal(false);
      setSelectedLockedChannel(null);
      setPassInput('');
    } else {
      alert('رمز الدخول (Invitation Code) غير صحيح!');
    }
  };

  const generateRandomPass = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setNewChannelPass(code);
  };

  const handleCreateChannel = (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const formattedId = newChannelName.trim().toLowerCase().replace(/\s+/g, '-');
    if (channels.some(c => c.id === formattedId)) {
      alert('هذه القناة موجودة مسبقاً!');
      return;
    }

    const passcode = newChannelPass.trim() || Math.floor(100000 + Math.random() * 900000).toString();

    const newChan = {
      id: formattedId,
      name: newChannelName.trim(),
      isPrivate: true,
      password: passcode
    };

    setChannels(prev => [...prev, newChan]);
    setMessages(prev => ({
      ...prev,
      [formattedId]: [
        { id: Date.now(), user: 'RAYEN BOT', text: `مرحباً بكم في القناة الخاصة #${newChannelName.trim()}!`, image: null, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), avatar: 'R', role: 'System' }
      ]
    }));
    
    // منشئ القناة يتدخل ليها مباشرة
    setUnlockedChannels(prev => [...prev, formattedId]);
    setCreatedChannelInfo({ id: formattedId, name: newChannelName.trim(), password: passcode });
    setNewChannelName('');
    setNewChannelPass('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

    const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputMsg.trim() && !selectedImage) return;

    if (!session?.user) {
      alert('يجب تسجيل الدخول أولاً');
      return;
    }

    const user = session.user;
    const userName =
      user.user_metadata?.username ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Student';

    const { error } = await supabase
      .from('messages')
      .insert({
        channel_id: activeChannel,
        user_id: user.id,
        user_name: userName,
        content: inputMsg.trim(),
        image_url: null
      });

    if (error) {
      console.error('Send message error:', error);
      alert('لم يتم إرسال الرسالة: ' + error.message);
      return;
    }

    setInputMsg('');
    setSelectedImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


    const handleDeleteMessage = async (id) => {
    const message = (messages[activeChannel] || [])
      .find(msg => msg.id === id);

    if (!message || message.user_id !== session?.user?.id) {
      alert('تنجم تحذف رسائلك إنت فقط.');
      return;
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Delete message error:', error);
      alert('تعذّر حذف الرسالة: ' + error.message);
      return;
    }

    setMessages(prev => ({
      ...prev,
      [activeChannel]: (prev[activeChannel] || [])
        .filter(msg => msg.id !== id)
    }));
  };

  const handleDeleteAiMessage = (id) => {
    setAiMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim() || aiLoading) return;

    const userText = aiPrompt;
    setAiPrompt('');
    setAiMessages(prev => [...prev, { id: Date.now(), role: 'user', content: userText }]);
    setAiLoading(true);

    if (ollamaConnected) {
      try {
        const response = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3.2:1b',
            messages: [{ role: 'user', content: userText }],
            stream: false
          })
        });
        const data = await response.json();
        setAiMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: data.message?.content || 'حدث خطأ.' }]);
      } catch (err) {
        setAiMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: 'تعذر الاتصال بـ Ollama.' }]);
      }
    } else {
      setTimeout(() => {
        let reply = "راجع دروسك بتركيز. بالنسبة للاقتصاد، تأكد من فهم آليات السوق جيداً.";
        if (userText.includes('قانون') || userText.includes('عرض')) {
          reply = "قانون العرض والطلب يحدد التوازن في السوق.";
        }
        setAiMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: reply }]);
      }, 1000);
    }
    setAiLoading(false);
  };

  const channelIcons = {
    'general': '🌐',
    'bac-economie': '📚',
    'entraide': '🤝',
    'gaming': '🎮'
  };

  const isCurrentChannelPrivate = channels.find(c => c.id === activeChannel)?.isPrivate;

  if (authLoading) {
    return <div className="app-container">Loading RAYEN...</div>;
  }

  if (!supabaseReady) {
    return <div className="app-container">Supabase is not configured.</div>;
  }

  if (!session) {
    return <Auth onAuthSuccess={async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    }} />;
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand-header">
          <div className="logo-box">R.</div>
          <div className="brand-text">
            <h2>RAYEN</h2>
            <span>COMMUNITY HUB</span>
          </div>
        </div>

        <div className="section-title">WORKSPACES</div>
        <div className="nav-tabs">
          <button 
            className={`nav-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <span className="icon">💬</span> Community Chat
          </button>
          <button 
            className={`nav-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <span className="icon">🤖</span> AI Teacher
            <span className={`status-dot ${ollamaConnected ? 'online' : 'offline'}`}></span>
          </button>
        </div>

        {activeTab === 'chat' && (
          <>
            <div className="channels-header-flex">
              <span className="section-title">CHANNELS</span>
              <button 
                className="create-channel-btn" 
                onClick={() => { setCreatedChannelInfo(null); setShowCreateModal(true); }}
                title="إنشاء قناة خاصة"
              >
                + جديد
              </button>
            </div>
            <div className="channels-list">
              {channels.map(ch => {
                const isLocked = ch.isPrivate && !unlockedChannels.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    className={`channel-btn ${activeChannel === ch.id ? 'active' : ''}`}
                    onClick={() => handleChannelClick(ch)}
                  >
                    <span className="icon">{channelIcons[ch.id] || '🔒'}</span> {ch.name} {isLocked ? '🔒' : ''}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="user-footer">
          <div className="user-avatar">R</div>
          <div className="user-info">
            <span className="username">Rayen</span>
            <span className="status">BAC Student</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div className="header-title">
            <span className="icon">{activeTab === 'chat' ? (channelIcons[activeChannel] || '🔒') : '🤖'}</span>
            <h3>{activeTab === 'chat' ? activeChannel : 'AI Teacher'}</h3>
          </div>
          <div className="header-badges">
            <span className="badge">SYSTEM ONLINE</span>
          </div>
        </header>

        {activeTab === 'chat' && (
          <div className="chat-view">
            {showPassModal ? (
              <div className="password-gate">
                <div className="gate-box">
                  <h3>🔒 قناة خاصة ومحمية</h3>
                  <p>الرجاء إدخال كود الدعوة (Invitation Code) للوصول إلى قناة #{selectedLockedChannel?.name}:</p>
                  <form onSubmit={handleUnlock}>
                    <input 
                      type="password" 
                      placeholder="أدخل كود السري..." 
                      value={passInput}
                      onChange={e => setPassInput(e.target.value)}
                      autoFocus
                    />
                    <button type="submit">دخول</button>
                  </form>
                </div>
              </div>
            ) : (
              <>
                <div className="messages-container">
                  <div className="welcome-banner">
                    <h2>Welcome to #{activeChannel}! {channelIcons[activeChannel] || '🔒'}</h2>
                  </div>
                  {messages[activeChannel]?.map(msg => (
                    <div key={msg.id} className="message-bubble">
                      <div className="msg-avatar">{msg.avatar}</div>
                      <div className="msg-body">
                        <div className="msg-header">
                          <span className="msg-user">{msg.user}</span>
                          <span className="msg-time">{msg.time}</span>
                          {msg.user_id === session?.user?.id && (
  <button
    className="delete-btn"
    title="حذف الرسالة"
    onClick={() => handleDeleteMessage(msg.id)}
  >
    🗑️
  </button>
)}
                        </div>
                        {msg.text && <div className="msg-text">{msg.text}</div>}
                        {msg.image && (
                          <div className="msg-image-wrapper">
                            <img src={msg.image} alt="Attachment" className="msg-img" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <form className="composer-form" onSubmit={handleSendMessage}>
                  {isCurrentChannelPrivate && (
                    <>
                      <input 
                        type="file" 
                        accept="image/*" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        onChange={handleImageChange} 
                      />
                      <button 
                        type="button" 
                        className="upload-btn" 
                        onClick={() => fileInputRef.current?.click()}
                        title="رفع صورة"
                      >
                        📷
                      </button>
                    </>
                  )}
                  
                  <div className="input-wrapper">
                    {selectedImage && (
                      <div className="image-preview-badge">
                        <span>صورة محددة</span>
                        <button type="button" onClick={() => setSelectedImage(null)}>✕</button>
                      </div>
                    )}
                    <input
                      type="text"
                      placeholder={isCurrentChannelPrivate ? "اكتب رسالة أو ارفع صورة..." : `Message #${activeChannel}...`}
                      value={inputMsg}
                      onChange={e => setInputMsg(e.target.value)}
                    />
                  </div>

                  <button type="submit">إرسال</button>
                </form>
              </>
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="chat-view">
            <div className="messages-container">
              {aiMessages.map((msg) => (
                <div key={msg.id} className={`message-bubble ${msg.role === 'user' ? 'user-msg' : 'ai-msg'}`}>
                  <div className="msg-avatar">{msg.role === 'user' ? 'R' : '🤖'}</div>
                  <div className="msg-body">
                    <div className="msg-header">
                      <span className="msg-user">{msg.role === 'user' ? 'Rayen' : 'AI Teacher'}</span>
                      <button 
                        className="delete-btn" 
                        title="حذف الرسالة" 
                        onClick={() => handleDeleteAiMessage(msg.id)}
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="msg-text">{msg.content}</div>
                  </div>
                </div>
              ))}
              {aiLoading && <div className="loading-indicator">الأستاذ الذكي يكتب...</div>}
              <div ref={aiEndRef} />
            </div>
            <form className="composer-form" onSubmit={handleAiSubmit}>
              <input
                type="text"
                placeholder="اسأل الأستاذ الذكي..."
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
              />
              <button type="submit">إرسال</button>
            </form>
          </div>
        )}
      </main>

      {/* نافذة إنشاء قناة خاصة مع إظهار كود الدعوة */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>🔒 إنشاء قناة خاصة جديدة</h3>
            {createdChannelInfo ? (
              <div className="created-info">
                <p>تم إنشاء القناة <strong>#{createdChannelInfo.name}</strong> بنجاح!</p>
                <div className="code-display">
                  <span>كود الدعوة الخاص بأصحابك (Invitation Code):</span>
                  <code className="code-badge">{createdChannelInfo.password}</code>
                </div>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    setActiveChannel(createdChannelInfo.id);
                    setCreatedChannelInfo(null);
                    setShowCreateModal(false);
                  }}
                >
                  الانتقال للقناة
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateChannel}>
                <label>اسم القناة:</label>
                <input 
                  type="text" 
                  placeholder="مثال: projet-bac"
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  required
                  autoFocus
                />
                
                <label>كود سري للدخول (أو انقر توليد تلقائي):</label>
                <div className="pass-input-group">
                  <input 
                    type="text" 
                    placeholder="أدخل كود أو ولّده عشوائياً"
                    value={newChannelPass}
                    onChange={e => setNewChannelPass(e.target.value)}
                  />
                  <button type="button" className="btn-gen" onClick={generateRandomPass}>🎲 توليد</button>
                </div>

                <div className="modal-actions">
                  <button type="submit" className="btn-primary">إنشاء القناة</button>
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>إلغاء</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
  }
      