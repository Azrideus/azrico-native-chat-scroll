export * from './views/VirtualScroller';

import VirtualScroller from './views/VirtualScroller';
import ExampleChatScroll from './example/example';
import React from 'react';
import ReactDOM from 'react-dom/client';

/* -------------------------------------------------------------------------- */
//
export default VirtualScroller;

const testroot = document.getElementById('testroot');
if (testroot) {
	const root = ReactDOM.createRoot(document.getElementById('testroot') as HTMLElement);
	root.render(<ExampleChatScroll />);
}
