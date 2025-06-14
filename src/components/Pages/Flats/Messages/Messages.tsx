import React, { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useLoaderData, useActionData, Form, useSubmit, useOutletContext, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router-dom';
import Cookies from 'js-cookie';
import axios from './../../../../api/axiosConfig';
import { validateField } from '../../../../utils/validateField';
import type Message from '../../../../types/Message';
import { useTranslate } from '../../../../i18n/useTranslate';
import styles from './Messages.module.css';

// Type for the current logged-in user
interface CurrentUser {
  firstName: string;
  lastName: string;
  email: string;
}

// Data returned from the loader
interface LoaderData {
  messages: Message[];
  isOwner: boolean;
  userCanMessage: boolean;
}

// Data returned from the action after form submit
interface ActionData {
  success?: boolean;
  error?: string;
  message?: Partial<Message>;
}

// Context received from the parent route
interface ContextData {
  flatID: string;
  ownerID: string;
}

// Loader function to fetch messages and user access rights
export const messagesLoader = async ({ params }: LoaderFunctionArgs): Promise<LoaderData | Response> => {
  const token = Cookies.get('token');
  if (!token) return redirect('/login');
  const flatID = params.flatID;
  if (!flatID) return redirect('/');

  try {
    // Ensure user is authenticated
    await axios.get('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Fetch messages for this flat
    const { data: msgRes } = await axios.get(`/flats/${flatID}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const isOwner = msgRes.meta?.isOwner || false;
    const userCanMessage = msgRes.meta?.userCanMessage || false;

    // Map message data into consistent format
    const messages = msgRes.data
      .map((msg: any) => ({
        id: msg._id,
        flatID,
        senderId: msg.senderId,
        content: msg.content,
        creationTime: new Date(msg.createdAt).toLocaleString(),
        // fallback if backend doesn't return name/email
        senderName: msg.senderName,
        senderEmail: msg.senderEmail,
      }))
      .sort((a: Message, b: Message) => Date.parse(a.creationTime) - Date.parse(b.creationTime));

    return { messages, isOwner, userCanMessage };
  } catch (error: any) {
    console.error('Error loading messages:', error);

    const status = error?.response?.status;

    if (status === 401) {
      return redirect('/login');
    }

    if (status === 403) {
      return { messages: [], isOwner: false, userCanMessage: true };
    }

    throw new Response('Unexpected error loading messages', { status: 500 });
  }
};

// Action function to send a new message to the flat owner
export const messagesAction = async ({ request, params }: ActionFunctionArgs): Promise<ActionData> => {
  const token = Cookies.get('token');
  if (!token) return { error: 'Not authenticated' };

  const formData = await request.formData();
  const content = formData.get('messageContent') as string;
  const flatID = params.flatID;

  if (!flatID || !content?.trim()) return { error: 'Message content cannot be empty.' };

  try {
    const { data } = await axios.post(
      `/flats/${flatID}/messages`,
      { content },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return {
      success: true,
      message: {
        id: data.data._id,
        flatID,
        senderId: data.data.senderId,
        content: data.data.content,
        creationTime: new Date(data.data.createdAt || Date.now()).toLocaleString(),
      },
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return { error: 'Failed to send the message. Please try again.' };
  }
};

const Messages: React.FC = () => {
  const t = useTranslate();
  const { flatID } = useOutletContext<ContextData>();
  const { messages: initialMessages, isOwner, userCanMessage } = useLoaderData() as LoaderData;
  const actionData = useActionData<ActionData>();
  const submit = useSubmit();

  // State: messages list, current input, validation errors, and user info
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Fetch current user details for display in messages
  useEffect(() => {
    const fetchUser = async () => {
      const token = Cookies.get('token');
      if (!token) return;
      try {
        const { data } = await axios.get('/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(data.currentUser);
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    fetchUser();
  }, []);

  // Handle the result of sending a message
  useEffect(() => {
    if (actionData?.success && actionData.message) {
      const newMsg: Message = {
        id: actionData.message.id || '',
        flatID,
        senderId: actionData.message.senderId || '',
        content: actionData.message.content || '',
        creationTime: actionData.message.creationTime || new Date().toLocaleString(),
        senderName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'You',
        senderEmail: currentUser?.email || '—',
      };
      setMessages((prev) => [...prev, newMsg]);
      setNewMessage('');
      setError('');
    } else if (actionData?.error) {
      setError(actionData.error);
    }
  }, [actionData, currentUser, flatID]);

  // Update message input and validate live
  const handleInputChange = async (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    if (value.trim()) {
      const lang = (localStorage.getItem('language') as 'en' | 'ro') || 'en';
      const error = await validateField('messageContent', value, { lang });
      setError(error);
    } else {
      setError('');
    }
  };

  // Validate field on blur
  const handleBlur = async () => {
    const lang = (localStorage.getItem('language') as 'en' | 'ro') || 'en';
    const error = await validateField('messageContent', newMessage, { lang });
    setError(error);
  };

  return (
    <div className={styles.messages}>
      <h3>{t('messagesTitle')}</h3>

      {/* Display message list */}
      <div className={styles.messageList}>
        {messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg.id} className={styles.message}>
              <p>
                <strong>{t('from')}</strong> {msg.senderName} ({msg.senderEmail})
              </p>
              <p>
                <strong>{t('sent')}</strong> {msg.creationTime}
              </p>
              <p>
                <strong>{t('message')}</strong> {msg.content}
              </p>
            </div>
          ))
        ) : (
          <p>{t('noMessages')}</p>
        )}
      </div>

      {/* If user is not the flat owner and is allowed to message */}
      {!isOwner && userCanMessage && (
        <Form
          method="post"
          onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            if (!newMessage.trim()) {
              setError(t('messageEmpty'));
              return;
            }
            const formData = new FormData(e.currentTarget);
            submit(formData, { method: 'post' });
          }}
          className={styles.newMessage}
        >
          <textarea name="messageContent" placeholder={t('messagePlaceholder')} maxLength={1000} value={newMessage} onChange={handleInputChange} onBlur={handleBlur} className={error ? styles.errorInput : ''} />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" disabled={!newMessage.trim()}>
            {t('sendMessage')}
          </button>
        </Form>
      )}
    </div>
  );
};

export default Messages;
