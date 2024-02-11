import React from 'react';

import { ChatItem } from '../classes/ChatItem';
import ChatManager, { LoadFunctionType } from '../classes/ChatManager';
import { useForceUpdate } from './useForceUpdate';
import { useInfiniteQuery } from '@tanstack/react-query';
import { LoadDirection } from '../classes/ChatManager';

type Props = {
	chatManager: ChatManager;
};

/**
 * sets up the `loadFunction` for the `chatManager`
 * @param props
 * @returns currently active `ChatItem` array on the `chatManager`
 */
export function useChatQuery({ chatManager }: Props) {
	const [updateKey, forceUpdate] = useForceUpdate();
	const [currentItems, set_currentItems] = React.useState<ChatItem[]>([]);
	React.useLayoutEffect(() => {
		chatManager.set_setItemsFunction(set_currentItems);
		chatManager.maybeLoad();
	}, [chatManager]);

	return { currentItems: currentItems };
}
