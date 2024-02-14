import React from 'react';

import { ChatItem } from '../classes/ChatItem';
import ChatManager, { LoadFunctionType } from '../classes/ChatManager';
import { useForceUpdate } from './useForceUpdate';
import { LoadDirection } from '../classes/ChatManager';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

type Props = {
	chatManager: ChatManager;
	listRef: React.MutableRefObject<VirtuosoHandle>;
};

const MID_MAX = Math.floor(Number.MAX_SAFE_INTEGER / 2);
/**
 * sets up the `loadFunction` for the `chatManager`
 * @param props
 * @returns currently active `ChatItem` array on the `chatManager`
 */
export function useChatQuery({ listRef, chatManager }: Props) {
	const isReady = React.useRef(false);
	const [currentItems, set_currentItems] = React.useState<ChatItem[]>([]);

	const [firstItemIndex, set_firstItemIndex] = React.useState(MID_MAX);
	const [initialTopMostItemIndex, set_initialTopMostItemIndex] = React.useState(MID_MAX);
	const [isAtVeryTop, set_isAtVeryTop] = React.useState(false);
	const [isAtVeryBottom, set_isAtVeryBottom] = React.useState(false);

	function setItems(items: ChatItem[]) {
		let delta = 0;
		if (chatManager.lastLoadDirection === LoadDirection.UP)
			delta = -chatManager.lastCountChange;
		// else if (chatManager.lastLoadDirection === LoadDirection.DOWN && chatManager.isSticky)
		// 	delta = -chatManager.lastCountChange;

		// console.log(`items.length`, items.length);
		// console.log(`delta`, delta);
		// console.log(firstItemIndex, delta);

		set_firstItemIndex((s) => {
			// console.log('set_firstItemIndex:', s + delta);
			return s + delta;
		});
		//
		set_currentItems(items);
		set_isAtVeryBottom(chatManager.isAtVeryBottom);
		set_isAtVeryTop(chatManager.isAtVeryTop);
	}
	React.useLayoutEffect(() => {
		chatManager.set_setItemsFunction(setItems);
		chatManager.fetch_items(LoadDirection.UP).then((s) => (isReady.current = true));
	}, [chatManager]);

	async function startReached() {
		if (!isReady.current) return [];
		// console.log(`startReached`);
		return await chatManager.fetch_items(LoadDirection.UP);
	}
	async function endReached() {
		if (!isReady.current) return [];
		// console.log(`endReached`);
		return await chatManager.fetch_items(LoadDirection.DOWN);
	}
	function onScroll(e) {
		listRef.current.getState((s) => {
			 
			chatManager.distanceToTop = s.scrollTop;
		});
		// console.log(`onScroll`, e, listRef);
	}
	return {
		currentItems,
		startReached,
		endReached,
		initialTopMostItemIndex,
		firstItemIndex,
		onScroll,
		isAtVeryTop,
		isAtVeryBottom,
	};
}
