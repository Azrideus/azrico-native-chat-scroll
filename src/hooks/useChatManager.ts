import React from 'react';
import ChatManager, { LoadFunctionType } from '../classes/ChatManager';

type Props = {
	loadFunction: LoadFunctionType;
	debug?: boolean;
	managerRef?: React.MutableRefObject<ChatManager | undefined>;
};

/**
 * set up a `chatManager`
 * @param props
 * @returns `ChatManager`
 */
export function useChatManager({ managerRef, debug, loadFunction }: Props) {
	const [chatManager, set_chatManager] = React.useState(new ChatManager());

	if (managerRef) managerRef.current = chatManager;

	React.useLayoutEffect(() => {
		chatManager.set_loadFunction(loadFunction);
		chatManager.show_logs = Boolean(debug);
	}, [debug, loadFunction]);
	return chatManager;
}
