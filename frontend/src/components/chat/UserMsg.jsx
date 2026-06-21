import React from 'react';
import { FileText } from '../Icons';

const UserMsg = ({ msg }) => (
  <div className="chat-msg chat-msg-user">
    <div className="chat-bubble">
      {msg.isPdf ? (
        <span className="chat-pdf-tag">
          <FileText size={13} /> {msg.content}
        </span>
      ) : (
        msg.content
      )}
    </div>
  </div>
);

export default UserMsg;
