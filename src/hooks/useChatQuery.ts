import React from 'react';

import { ChatItem } from '../classes/ChatItem';
import ChatManager, { LoadFunctionType } from '../classes/ChatManager';
 
import { LoadDirection } from '../classes/ChatManager';
import { Virtuoso, VirtuosoHandle } from '@azrico/react-virtuoso';

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
		if (chatManager.lastChangeDirection === LoadDirection.UP) {
			delta = chatManager.lastCountChange;
		} else if (chatManager.lastChangeDirection === LoadDirection.DOWN) {
			// if (chatManager.lastCountChange > 0) delta = -chatManager.lastCountChange;
		}

		// console.log(`lastChangeDirection`, chatManager.lastChangeDirection);
		// console.log(`delta`, delta);
		// console.log(firstItemIndex, delta);

		if (delta != 0) {
			set_firstItemIndex((s) => {
				// console.log('set_firstItemIndex:', s - delta);
				return s - delta;
			});
		}

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
		const result = await chatManager.fetch_items(LoadDirection.UP);
		if (Array.isArray(result) && result.length > 0) return result;
		return null;
	}
	async function endReached() {
		if (!isReady.current) return [];
		// console.log(`endReached`);
		const result = await chatManager.fetch_items(LoadDirection.DOWN);
		if (Array.isArray(result) && result.length > 0) return result;
		return null;
	}
	function onScroll(e) {
		listRef.current.getState((s) => {
			chatManager.distanceToTop = s.scrollTop;
			// console.log(`onScroll`, e, listRef);
		});
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
