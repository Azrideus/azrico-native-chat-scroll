import React from 'react';
import ChatManager, { LoadDirection, LoadFunctionType } from '../classes/ChatManager';

/**
 * set up a `chatManager`
 * @param props
 * @returns `ChatManager`
 */
export function useChatManager<T>({
	managerRef,
	debug,
	loadFunction,
}: {
	loadFunction: LoadFunctionType<T>;
	debug?: boolean;
	managerRef?: React.MutableRefObject<ChatManager<T> | undefined>;
}) {
	const [chatManager, set_chatManager] = React.useState(new ChatManager<T>());


	React.useLayoutEffect(() => {
		let nextManager = chatManager;
		const oldLf = chatManager.get_loadFunction();
		const lfChanged = oldLf != null && oldLf != loadFunction;
		/* ---------- reset the chat manager when load function is changed ---------- */
		if (lfChanged) {
			nextManager = new ChatManager<T>();
		}
		nextManager.set_loadFunction(loadFunction);
		if (chatManager != nextManager) set_chatManager(nextManager);
	}, [loadFunction]);

	React.useEffect(() => {
		chatManager.show_logs = Boolean(debug);
	}, [debug, chatManager]);

	
	
	if (managerRef) managerRef.current = chatManager;
	return chatManager;
}
