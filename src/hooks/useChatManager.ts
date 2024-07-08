import React from 'react';
import ChatManager, { LoadDirection, LoadFunctionType } from '../classes/ChatManager';

type Props<T> = {
	loadFunction: LoadFunctionType<T>;
	debug?: boolean;
	managerRef?: React.MutableRefObject<ChatManager<T> | undefined>;
};

/**
 * set up a `chatManager`
 * @param props
 * @returns `ChatManager`
 */
export function useChatManager<T>({ managerRef, debug, loadFunction }: Props<T>) {
	const [chatManager, set_chatManager] = React.useState(new ChatManager<T>());

	if (managerRef) managerRef.current = chatManager;

	React.useLayoutEffect(() => {
		let nextManager = chatManager;
		const oldLf = chatManager.get_loadFunction();
		const lfChanged = oldLf != null && oldLf != loadFunction;
		/* ---------- reset the chat manager when load function is changed ---------- */
		if (lfChanged) {
			nextManager = new ChatManager<T>();
			set_chatManager(nextManager);
		}
		nextManager.set_loadFunction(loadFunction);
	}, [loadFunction]);

	React.useLayoutEffect(() => {
		chatManager.show_logs = Boolean(debug);
	}, [debug, chatManager]);

	return chatManager;
}
