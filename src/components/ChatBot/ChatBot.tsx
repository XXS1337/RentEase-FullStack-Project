import React, { useState, useRef, useEffect } from 'react';
import axios from '../../api/axiosConfig';
import Cookies from 'js-cookie';
import { FaTimes } from 'react-icons/fa';
import { BsChatDots } from 'react-icons/bs';
import { useTranslate } from '../../i18n/useTranslate';
import styles from './ChatBot.module.css';

// Chat message type
interface Message {
  sender: 'user' | 'bot';
  text: string;
  links?: string[];
}

const ChatBot: React.FC = () => {
  const t = useTranslate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Scrolls to bottom when a new message appears
  useEffect(() => {
    if (isOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Sends the message to the bot and appends both messages to UI
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const token = Cookies.get('token');

    try {
      const res = await axios.post(
        '/ai/chatbot',
        {
          prompt: userMessage.text,
          lang: localStorage.getItem('language') || 'en',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      const botLinks = res.data?.links || [];
      const botText = botLinks.length > 0 ? '' : res.data?.message || t('chatUnknown');

      const botMessage: Message = { sender: 'bot', text: botText, links: botLinks };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || t('chatError');
      setMessages((prev) => [...prev, { sender: 'bot', text: errorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  // Handles Enter key for sending message
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevents form submission or newline
      sendMessage();
    }
  };

  return (
    <>
      {isOpen && (
        <div className={styles.chatBotWrapper}>
          {/* Message list */}
          <div className={styles.chatWindow}>
            {messages.map((msg, index) => (
              <div key={index} className={msg.sender === 'user' ? styles.userMsg : styles.botMsg}>
                {msg.text?.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
                {msg.links && (
                  <ul>
                    {msg.links.map((link, i) => (
                      <li key={i}>
                        <a href={link} target="_blank" rel="noopener noreferrer">
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {loading && <div className={styles.botMsg}>{t('thinking')}</div>}
            <div ref={chatEndRef} />
          </div>

          {/* Input field and button */}
          <div className={styles.inputArea}>
            <input type="text" placeholder={t('chatPlaceholder')} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} autoComplete="off" />
            <button
              onClick={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              disabled={loading || !input.trim()}
            >
              {t('send')}
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button className={styles.toggleButton} onClick={() => setIsOpen((prev) => !prev)}>
        {isOpen ? <FaTimes size={24} /> : <BsChatDots size={24} />}
      </button>
    </>
  );
};

export default ChatBot;
