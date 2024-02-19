export * from './views/VirtualChatList';
export * from './classes/ChatManager';
export * from './classes/ChatItem';
export * from './demo/TestChatLoader';
export * from './hooks';
export * from './demo/DemoChatScroll';
import VirtualChatList from './views/VirtualChatList';
export default VirtualChatList;
/* -------------------------------------------------------------------------- */
import DemoChatScroll from './demo/DemoChatScroll';
import React from 'react';
import ReactDOM from 'react-dom/client';

const elem = document.getElementById('demoroot') as HTMLElement;
if (elem) {
	const root = ReactDOM.createRoot(elem);
	root.render(<DemoChatScroll />);
}
