import React from 'react';

import { ChatItem } from '../classes/ChatItem';
import ChatManager, { LoadFunctionType } from '../classes/ChatManager';
import { useForceUpdate } from './useForceUpdate';
import { LoadDirection } from '../classes/ChatManager';

type Props = {
	chatManager: ChatManager;
};

const MID_MAX = Math.floor(Number.MAX_SAFE_INTEGER / 2);
/**
 * sets up the `loadFunction` for the `chatManager`
 * @param props
 * @returns currently active `ChatItem` array on the `chatManager`
 */
export function useChatQuery({ chatManager }: Props) {
	const isReady = React.useRef(false);
	const [currentItems, set_currentItems] = React.useState<ChatItem[]>([]);

	const [firstItemIndex, set_firstItemIndex] = React.useState(MID_MAX);
	const [initialTopMostItemIndex, set_initialTopMostItemIndex] = React.useState(
		ChatManager.BATCH_SIZE
	);

	function setItems(items: ChatItem[]) {
		let delta = chatManager.lastCountChange;
		if (chatManager.lastLoadDirection === LoadDirection.DOWN) delta *= -1;

		const nextFirstItemIndex = MID_MAX - items.length;
		const nextFirstItemIndex2 = firstItemIndex + delta;
		console.log(`items.length`, items.length);
		console.log(`delta`, delta);
		console.log(nextFirstItemIndex, nextFirstItemIndex2, delta);

		set_firstItemIndex(nextFirstItemIndex);
		//
		set_currentItems(items);
	}
	React.useLayoutEffect(() => {
		chatManager.set_setItemsFunction(setItems);
		chatManager.fetch_items(LoadDirection.DOWN).then((s) => (isReady.current = true));
	}, [chatManager]);

	async function startReached() {
		if (!isReady.current) return [];
		console.log(`startReached`);
		//return await chatManager.fetch_items(LoadDirection.UP);
	}
	async function endReached() {
		if (!isReady.current) return [];
		console.log(`endReached`);

		//return await chatManager.fetch_items(LoadDirection.DOWN);
	}
	return {
		currentItems,
		startReached,
		endReached,
		initialTopMostItemIndex,
		firstItemIndex,
	};
}
