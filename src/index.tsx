export * from './views/ChatList';

import ChatList from './views/ChatList';
import ExampleChatScroll from './example/example';
import React from 'react';
import ReactDOM from 'react-dom/client';

/* -------------------------------------------------------------------------- */
//
export default ChatList;

const testroot = document.getElementById('testroot');
if (testroot) {
	const root = ReactDOM.createRoot(document.getElementById('testroot') as HTMLElement);
	root.render(<ExampleChatScroll />);
}
