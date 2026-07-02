import { useState, useEffect } from 'react';
import { API_BASE } from '../api/apiBase';
import { Newspaper, Calendar, Plus, X, User, Megaphone } from 'lucide-react';

export default function NewsletterWidget({ role, userId }) {
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNews, setActiveNews] = useState(null);
  
  // Publication Modal State
  const [isPubModalOpen, setIsPubModalOpen] = useState(false);
  const [pubTitle, setPubTitle] = useState('');
  const [pubSummary, setPubSummary] = useState('');
  const [pubContent, setPubContent] = useState('');
  const [pubCategory, setPubCategory] = useState('General');
  const [pubAuthor, setPubAuthor] = useState('Campus Editorial Board');
  const [pubTargets, setPubTargets] = useState({
    ALL: true,
    student: false,
    faculty: false,
    finance: false,
    admin: false
  });
  
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetchNewsletters();
  }, [role]);

  const fetchNewsletters = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/newsletters?role=${encodeURIComponent(role)}`);
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          setNewsletters(result.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch newsletters:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!pubTitle || !pubSummary || !pubContent) {
      alert('Please fill out all fields');
      return;
    }
    
    setPublishing(true);
    
    let targetRoles = [];
    if (pubTargets.ALL) {
      targetRoles = ['ALL'];
    } else {
      targetRoles = Object.keys(pubTargets).filter(k => k !== 'ALL' && pubTargets[k]);
      if (targetRoles.length === 0) {
        targetRoles = ['ALL'];
      }
    }
    
    const payload = {
      title: pubTitle,
      summary: pubSummary,
      content: pubContent,
      category: pubCategory,
      author: pubAuthor,
      targetRoles: targetRoles
    };

    try {
      const res = await fetch(`${API_BASE}/newsletters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        // Clear form
        setPubTitle('');
        setPubSummary('');
        setPubContent('');
        setPubCategory('General');
        setPubAuthor('Campus Editorial Board');
        setPubTargets({
          ALL: true,
          student: false,
          faculty: false,
          finance: false,
          admin: false
        });
        setIsPubModalOpen(false);
        fetchNewsletters();
      } else {
        const errData = await res.json();
        alert(`Failed to publish: ${errData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error publishing newsletter:', err);
      alert('Network error publishing newsletter');
    } finally {
      setPublishing(false);
    }
  };

  const getCategoryStyles = (category) => {
    switch (category) {
      case 'Placement':
        return { bg: '#e8f5e9', text: '#2e7d32', border: '#c8e6c9' };
      case 'Event':
        return { bg: '#f3e5f5', text: '#7b1fa2', border: '#e1bee7' };
      case 'Academic':
        return { bg: '#e3f2fd', text: '#1565c0', border: '#bbdefb' };
      default:
        return { bg: '#f5f5f5', text: '#616161', border: '#e0e0e0' };
    }
  };

  const formatPublishDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const latestNews = newsletters[0];
  const olderNews = newsletters.slice(1);

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      border: '1px solid #f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, #00236f 0%, #00236f 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Newspaper size={18} color="white" />
          </div>
          <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#1f2937', margin: 0 }}>Campus Chronicle</h4>
        </div>

        {role === 'admin' && (
          <button
            onClick={() => setIsPubModalOpen(true)}
            style={{
              padding: '6px 12px',
              background: '#00236f',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#001a54'}
            onMouseLeave={e => e.currentTarget.style.background = '#00236f'}
          >
            <Plus size={12} />
            Publish
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ height: '100px', background: '#f9fafb', borderRadius: '12px', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: '40px', background: '#f9fafb', borderRadius: '12px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      ) : newsletters.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
          <Megaphone size={32} style={{ margin: '0 auto 8px', opacity: 0.3, display: 'block' }} />
          <p style={{ fontSize: '12px', margin: 0 }}>No news or events posted yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Featured Latest News */}
          {latestNews && (
            <div 
              onClick={() => setActiveNews(latestNews)}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.04)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '9px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: '100px',
                  textTransform: 'uppercase',
                  border: `1px solid ${getCategoryStyles(latestNews.category).border}`,
                  background: getCategoryStyles(latestNews.category).bg,
                  color: getCategoryStyles(latestNews.category).text
                }}>
                  {latestNews.category}
                </span>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={10} />
                  {formatPublishDate(latestNews.publishedAt)}
                </span>
              </div>
              <h5 style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', margin: '0 0 6px 0', lineHeight: '1.4' }}>
                {latestNews.title}
              </h5>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                {latestNews.summary}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#475569' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                  <User size={10} />
                  {latestNews.author}
                </span>
                <span style={{ color: '#00236f', fontWeight: '700' }}>Read Article &rarr;</span>
              </div>
            </div>
          )}

          {/* Older News List */}
          {olderNews.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Previous Updates
              </div>
              {olderNews.map((news) => (
                <div
                  key={news.id || news._id}
                  onClick={() => setActiveNews(news)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: '#ffffff',
                    border: '1px solid #f1f5f9',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, paddingRight: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '8px',
                        fontWeight: '700',
                        padding: '1px 6px',
                        borderRadius: '100px',
                        textTransform: 'uppercase',
                        background: getCategoryStyles(news.category).bg,
                        color: getCategoryStyles(news.category).text,
                        flexShrink: 0
                      }}>
                        {news.category}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {news.title}
                      </span>
                    </div>
                    <span style={{ fontSize: '9px', color: '#94a3b8' }}>By {news.author}</span>
                  </div>
                  <span style={{ fontSize: '9px', color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {formatPublishDate(news.publishedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reading Article Modal */}
      {activeNews && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '550px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '9px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: '100px',
                  textTransform: 'uppercase',
                  border: `1px solid ${getCategoryStyles(activeNews.category).border}`,
                  background: getCategoryStyles(activeNews.category).bg,
                  color: getCategoryStyles(activeNews.category).text
                }}>
                  {activeNews.category}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} />
                  {formatPublishDate(activeNews.publishedAt)}
                </span>
              </div>
              <button 
                onClick={() => setActiveNews(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: '1.3' }}>
                {activeNews.title}
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '8px 12px', borderRadius: '8px' }}>
                <User size={12} />
                <span>Published by: <b>{activeNews.author}</b></span>
              </div>

              <div style={{ 
                fontSize: '14px', 
                color: '#334155', 
                lineHeight: '1.6', 
                whiteSpace: 'pre-line',
                paddingTop: '8px'
              }}>
                {activeNews.content}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#f8fafc'
            }}>
              <button
                onClick={() => setActiveNews(null)}
                style={{
                  padding: '8px 20px',
                  background: '#00236f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Publish Modal */}
      {isPubModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <form 
            onSubmit={handlePublish}
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '550px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                Publish Campus Update
              </h4>
              <button 
                type="button"
                onClick={() => setIsPubModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Fields Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Headline / Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Placement Drive: TechCorp Recruitment 2026"
                  value={pubTitle}
                  onChange={e => setPubTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                    Category
                  </label>
                  <select
                    value={pubCategory}
                    onChange={e => setPubCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '13px',
                      outline: 'none',
                      background: 'white'
                    }}
                  >
                    <option value="General">General</option>
                    <option value="Placement">Placement</option>
                    <option value="Event">Event</option>
                    <option value="Academic">Academic</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                    Author Name
                  </label>
                  <input
                    type="text"
                    required
                    value={pubAuthor}
                    onChange={e => setPubAuthor(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Short Summary (shown in dashboard preview)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Provide a quick 1-sentence summary..."
                  value={pubSummary}
                  onChange={e => setPubSummary(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Full Announcement Content
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Write full details here. Supports multi-line paragraphs."
                  value={pubContent}
                  onChange={e => setPubContent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Target Audience (Who should see this?)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setPubTargets({ ALL: true, student: false, faculty: false, finance: false, admin: false })}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '700',
                      border: pubTargets.ALL ? '1px solid #00236f' : '1px solid #cbd5e1',
                      background: pubTargets.ALL ? '#f0fdf4' : 'white',
                      color: pubTargets.ALL ? '#00236f' : '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    Everyone (All Campus)
                  </button>
                  {['student', 'faculty', 'finance', 'admin'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setPubTargets(prev => {
                          const next = { ...prev, ALL: false, [r]: !prev[r] };
                          // If all roles are unchecked, set ALL back to true
                          const anyChecked = Object.keys(next).filter(k => k !== 'ALL' && next[k]).length > 0;
                          if (!anyChecked) next.ALL = true;
                          return next;
                        });
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '700',
                        border: pubTargets[r] ? '1px solid #00236f' : '1px solid #cbd5e1',
                        background: pubTargets[r] ? '#f0fdf4' : 'white',
                        color: pubTargets[r] ? '#00236f' : '#64748b',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              background: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => setIsPubModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  background: '#e2e8f0',
                  color: '#334155',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={publishing}
                style={{
                  padding: '8px 20px',
                  background: '#00236f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: publishing ? 'not-allowed' : 'pointer',
                  opacity: publishing ? 0.7 : 1
                }}
              >
                {publishing ? 'Publishing...' : 'Publish Update'}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
    </div>
  );
}
