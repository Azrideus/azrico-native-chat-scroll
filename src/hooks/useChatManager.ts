import React from 'react';
import ChatManager, { LoadFunctionType } from '../classes/ChatManager';

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
		chatManager.set_loadFunction(loadFunction);
		chatManager.show_logs = Boolean(debug);
	}, [debug, loadFunction]);
	return chatManager;
}
